/**
 * A thread the server has not named yet. The sidebar shows the creation
 * timestamp for these, which is what "still called Aug 4 at 8:06:56 PM" means:
 * either no title at all, or the `New Thread <iso>` placeholder a thread is
 * created with.
 */
export const isUntitledThreadName = (name?: string | null): boolean =>
  !name || /^New Thread \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(name);

/**
 * The agent fires title generation without awaiting it, so the title is
 * persisted some time after the stream closes. These bound the client-side
 * watch that waits for it: long enough to cover a title model round trip,
 * short enough that a thread which will never be titled stops polling.
 */
export const THREAD_TITLE_POLL_INTERVAL_MS = 1_500;
export const THREAD_TITLE_POLL_ATTEMPTS = 20;
