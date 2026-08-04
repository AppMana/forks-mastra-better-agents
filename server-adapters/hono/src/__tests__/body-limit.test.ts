/**
 * Body-limit rejections have to be readable HTTP errors.
 *
 * `bodyLimit`'s `onError` is a Hono handler: whatever it returns becomes the
 * response. Returning a plain object instead of a `Response` does not throw —
 * Hono simply never finalizes a body, so an over-limit upload answers
 * `200 OK` with zero bytes. Every client then does the obvious thing, calls
 * `response.json()` on a 2xx, and reports "Unexpected end of JSON input"
 * instead of "your file is too big". That made a 47 MB spreadsheet upload
 * undiagnosable from the browser.
 *
 * So the contract pinned here is on the wire, not on the callback: an
 * over-limit request must come back with a 413 and a JSON body that names the
 * limit, and an under-limit request must be untouched.
 */
import type { AdapterTestContext } from '@internal/server-adapter-test-utils';
import { createDefaultTestContext } from '@internal/server-adapter-test-utils';
import { Hono } from 'hono';
import { describe, it, expect, beforeEach } from 'vitest';
import { MastraServer } from '../index';

const MAX_SIZE = 1024;

describe('request body size limits', () => {
  let context: AdapterTestContext;
  let app: Hono;

  beforeEach(async () => {
    context = await createDefaultTestContext();
    app = new Hono();

    const adapter = new MastraServer({
      app,
      mastra: context.mastra,
      tools: context.tools,
      taskStore: context.taskStore,
      bodyLimitOptions: {
        maxSize: MAX_SIZE,
        // The shape @mastra/deployer supplies. It must produce a real
        // response, and this suite fails if a plain object silently works.
        onError: () => Response.json({ error: 'Request body too large' }, { status: 413 }),
      },
    });

    await adapter.init();
  });

  const post = (body: string) =>
    app.request(
      new Request('http://localhost/api/workflows/test-workflow/create-run?runId=body-limit-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
    );

  it('answers an over-limit body with 413 and a JSON reason, never an empty 200', async () => {
    const response = await post(JSON.stringify({ padding: 'a'.repeat(MAX_SIZE * 4) }));

    expect(response.status).toBe(413);

    // The regression this guards: a 200 with no body. Read it as text first so
    // an empty body is reported as "" rather than as a JSON parse crash.
    const raw = await response.text();
    expect(raw).not.toBe('');
    expect(JSON.parse(raw).error).toMatch(/too large/i);
  });

  it('leaves an under-limit body alone', async () => {
    const response = await post(JSON.stringify({}));

    expect(response.status).toBe(200);
    expect((await response.json()).runId).toBe('body-limit-run');
  });

  /**
   * Defence in depth for the actual defect. A downstream `onError` that
   * returns a plain object (what the deployer used to do) must still be
   * turned into a real 413 by the adapter rather than an empty 200.
   */
  it('coerces an onError that does not return a Response into a 413', async () => {
    const looseApp = new Hono();
    const adapter = new MastraServer({
      app: looseApp,
      mastra: context.mastra,
      tools: context.tools,
      taskStore: context.taskStore,
      bodyLimitOptions: {
        maxSize: MAX_SIZE,
        onError: (() => ({ error: 'Request body too large' })) as never,
      },
    });
    await adapter.init();

    const response = await looseApp.request(
      new Request('http://localhost/api/workflows/test-workflow/create-run?runId=loose-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ padding: 'a'.repeat(MAX_SIZE * 4) }),
      }),
    );

    expect(response.status).toBe(413);
    expect(await response.text()).not.toBe('');
  });
});
