import type { Server } from 'node:http';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { BaseResource } from './base';

interface RetryTestConfig {
  statusCode: number;
  contentType: string;
  responseBody: string | object;
}

describe('BaseResource', () => {
  let server: Server;
  let resource: BaseResource;
  let serverUrl: string;
  let requestCount: number;

  beforeEach(async () => {
    requestCount = 0;
    server = createServer();

    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', () => {
        resolve();
      });
    });

    const address = server.address() as AddressInfo;
    serverUrl = `http://127.0.0.1:${address.port}`;
    resource = new BaseResource({
      baseUrl: serverUrl,
      retries: 2,
      backoffMs: 0,
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()));
    });
  });

  const runRetryTest = async (config: RetryTestConfig & { expectedRequestCount: number }) => {
    // Arrange: Configure server response
    server.on('request', (_req, res) => {
      requestCount++;
      res.writeHead(config.statusCode, { 'Content-Type': config.contentType });
      const body = typeof config.responseBody === 'string' ? config.responseBody : JSON.stringify(config.responseBody);
      res.end(body);
    });

    // Act: Make request and handle retries
    const requestPromise = resource.request('/test');

    // Assert: Check error and retry count
    await expect(requestPromise).rejects.toBeInstanceOf(Error);
    expect(requestCount).toBe(config.expectedRequestCount);
  };

  it('should NOT retry 4xx client errors (they will not resolve with retries)', async () => {
    await runRetryTest({
      statusCode: 400,
      contentType: 'application/json',
      responseBody: { error: 'Bad Request' },
      expectedRequestCount: 1, // No retries for 4xx
    });
  });

  it('should NOT retry 403 Forbidden errors', async () => {
    await runRetryTest({
      statusCode: 403,
      contentType: 'application/json',
      responseBody: { error: 'Forbidden' },
      expectedRequestCount: 1, // No retries for 4xx
    });
  });

  it('should retry 5xx server errors and eventually reject', async () => {
    await runRetryTest({
      statusCode: 500,
      contentType: 'text/plain',
      responseBody: 'Internal Server Error',
      expectedRequestCount: 3, // Initial request + 2 retries
    });
  });

  it('should use custom fetch function when provided', async () => {
    // Arrange: Create a custom fetch that adds a custom header
    const customFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const response = await fetch(url, {
        ...init,
        headers: {
          ...init?.headers,
          'X-Custom-Fetch': 'true',
        },
      });
      return response;
    };

    const customResource = new BaseResource({
      baseUrl: serverUrl,
      retries: 0,
      fetch: customFetch,
    });

    // Set up server to respond successfully
    server.on('request', (req, res) => {
      const customHeader = req.headers['x-custom-fetch'];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ customFetchUsed: customHeader === 'true' }));
    });

    // Act: Make request
    const result = await customResource.request('/test');

    // Assert: Verify custom fetch was used
    expect(result).toEqual({ customFetchUsed: true });
  });

  it('should fall back to global fetch when custom fetch is not provided', async () => {
    // Arrange: Set up server to respond successfully
    server.on('request', (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });

    // Act: Make request without custom fetch
    const result = await resource.request('/test');

    // Assert: Verify request succeeded using global fetch
    expect(result).toEqual({ success: true });
  });

  /**
   * A 2xx is not a promise of a JSON body. Middleware that fails to finalize a
   * response (Hono's `bodyLimit` with a mis-typed `onError` did exactly this on
   * over-limit uploads) answers 200 with zero bytes, and an unguarded
   * `response.json()` then surfaces "Unexpected end of JSON input" — a parser
   * complaint that names neither the endpoint nor the real problem. The
   * transport has to report what actually happened instead.
   */
  describe('non-JSON success responses', () => {
    it('reports an empty 2xx body as an empty response, not a JSON parse error', async () => {
      server.on('request', (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end();
      });

      await expect(resource.request('/test')).rejects.toThrow(/empty response/i);
    });

    it('names the status and the endpoint so the failure is attributable', async () => {
      server.on('request', (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end();
      });

      await expect(resource.request('/test')).rejects.toThrow(/\/api\/test/);
    });

    it('surfaces a non-JSON 2xx body rather than a parser message', async () => {
      server.on('request', (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html>proxy error</html>');
      });

      const error = await resource.request('/test').catch((e: Error) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('proxy error');
      expect((error as Error).message).not.toMatch(/Unexpected end of JSON input/);
    });

    it('still returns a parsed body for a normal 204 with no content', async () => {
      server.on('request', (_req, res) => {
        res.writeHead(204);
        res.end();
      });

      await expect(resource.request('/test')).resolves.toBeUndefined();
    });
  });
});
