import type { RequestOptions, ClientOptions } from '../types';
import { MastraClientError } from '../types';
import { normalizeRoutePath } from '../utils';

export class BaseResource {
  readonly options: ClientOptions;
  protected readonly apiPrefix: string;

  constructor(options: ClientOptions) {
    this.options = options;
    this.apiPrefix = normalizeRoutePath(options.apiPrefix ?? '/api');
  }

  /**
   * Makes an HTTP request to the API with retries and exponential backoff
   * @param path - The API endpoint path (without prefix, e.g., '/agents')
   * @param options - Optional request configuration
   * @returns Promise containing the response data
   */
  public async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    let lastError: Error | null = null;
    const {
      baseUrl,
      retries = 3,
      backoffMs = 100,
      maxBackoffMs = 1000,
      headers = {},
      credentials,
      fetch: customFetch,
    } = this.options;
    const fetchFn = customFetch || fetch;

    let delay = backoffMs;

    const fullPath = `${this.apiPrefix}${path}`;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetchFn(`${baseUrl.replace(/\/$/, '')}${fullPath}`, {
          ...options,
          headers: {
            ...(options.body &&
            !(options.body instanceof FormData) &&
            (options.method === 'POST' ||
              options.method === 'PUT' ||
              options.method === 'PATCH' ||
              options.method === 'DELETE')
              ? { 'content-type': 'application/json' }
              : {}),
            ...headers,
            ...options.headers,
            // TODO: Bring this back once we figure out what we/users need to do to make this work with cross-origin requests
            // 'x-mastra-client-type': 'js',
          },
          signal: this.options.abortSignal,
          credentials: options.credentials ?? credentials,
          body:
            options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          let parsedBody: unknown;
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            parsedBody = JSON.parse(errorBody);
            errorMessage += ` - ${JSON.stringify(parsedBody)}`;
          } catch {
            if (errorBody) {
              errorMessage += ` - ${errorBody}`;
            }
          }
          throw new MastraClientError(response.status, response.statusText, errorMessage, parsedBody);
        }

        if (options.stream) {
          return response as unknown as T;
        }

        return await this.parseJsonResponse<T>(response, fullPath);
      } catch (error) {
        lastError = error as Error;

        // Don't retry 4xx client errors - they won't resolve with retries
        const status = (error as Error & { status?: number }).status;
        if (status !== undefined && status >= 400 && status < 500) {
          throw error;
        }

        // A 2xx that could not be read as JSON is a settled answer, not a
        // transient fault; replaying it just re-uploads the whole body.
        if ((error as { [UNREADABLE_BODY]?: true })[UNREADABLE_BODY]) {
          throw error;
        }

        if (attempt === retries) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, maxBackoffMs);
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * Read a successful response as JSON without letting the parser speak for
   * the server.
   *
   * A 2xx does not promise a JSON body. A 204 has none by contract, and
   * middleware that fails to finalize a response answers 200 with zero bytes —
   * Hono's `bodyLimit` did this on every over-limit upload, so rejecting a
   * 47 MB file reported "Unexpected end of JSON input". That message names
   * neither the endpoint, nor the status, nor the size limit that actually
   * caused it, which is what made the failure undiagnosable. Report the
   * response instead of the parser's opinion of it.
   */
  private async parseJsonResponse<T>(response: Response, path: string): Promise<T> {
    // No-content statuses are legitimately bodiless.
    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    const body = await response.text();

    if (body === '') {
      throw this.unreadableBody(
        response,
        `Empty response from ${path} (HTTP ${response.status} ${response.statusText}). ` +
          `The server returned no body — a request size limit or an intermediate proxy is the usual cause.`,
      );
    }

    try {
      return JSON.parse(body) as T;
    } catch {
      throw this.unreadableBody(
        response,
        `Invalid JSON response from ${path} (HTTP ${response.status} ${response.statusText}): ${truncate(body)}`,
      );
    }
  }

  private unreadableBody(response: Response, message: string): MastraClientError {
    const error = new MastraClientError(response.status, response.statusText, message);
    Object.defineProperty(error, UNREADABLE_BODY, { value: true });
    return error;
  }
}

/** Marks a 2xx whose body could not be read, so `request` does not retry it. */
const UNREADABLE_BODY = Symbol.for('mastra.client.unreadableBody');

/** Keep an HTML error page or a stack trace from becoming the whole message. */
function truncate(body: string, limit = 500): string {
  const collapsed = body.trim();
  return collapsed.length > limit ? `${collapsed.slice(0, limit)}…` : collapsed;
}
