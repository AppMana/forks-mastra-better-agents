import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Shared plumbing for the live suite (see playwright.live.config.ts for the
 * environment contract). Everything here reads deployment identity from the
 * environment; nothing deployment-specific is committed.
 */

/**
 * Sign the page's browser context in by installing the `mastra_session`
 * cookie minted out-of-band. The cookie carries real tokens, so the app takes
 * its ordinary session path — no test-only bypass exists on this suite.
 */
export async function authenticate(page: Page): Promise<void> {
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
  const value = process.env.E2E_SESSION_COOKIE;
  if (!value) throw new Error('E2E_SESSION_COOKIE is required');

  const url = new URL(baseURL);
  await page.context().addCookies([
    {
      name: 'mastra_session',
      value,
      domain: url.hostname,
      path: '/',
      httpOnly: true,
      // A Secure cookie is never sent over plain http, so a dev-server run
      // (http://localhost) needs it off; the served app only reads the value.
      secure: url.protocol === 'https:',
      sameSite: 'Lax',
    },
  ]);
}

/**
 * The agent the suite chats as: E2E_AGENT_ID, or the first agent the API
 * lists, so the suite runs unmodified against any deployment that has at
 * least one agent.
 */
export async function resolveAgentId(page: Page): Promise<string> {
  const configured = process.env.E2E_AGENT_ID;
  if (configured) return configured;

  const response = await page.request.get('/api/agents');
  expect(response.ok(), `GET /api/agents answered ${response.status()}`).toBe(true);
  const body = (await response.json()) as Record<string, unknown> | unknown[];
  const first = Array.isArray(body)
    ? ((body[0] as { id?: string } | undefined)?.id ?? '')
    : (Object.keys(body)[0] ?? '');
  expect(first, `no agents listed by /api/agents: ${JSON.stringify(body).slice(0, 200)}`).not.toBe('');
  return first;
}

/** Open a brand-new chat for `agentId` and wait for a usable composer. */
export async function openNewChat(page: Page, agentId: string): Promise<void> {
  await page.goto(`/agents/${agentId}/chat/new`);
  const composer = page.getByPlaceholder('Enter your message...');
  await expect(composer, 'the composer never rendered — is the session cookie valid?').toBeVisible({
    timeout: 60_000,
  });
}

export const composerInput = (page: Page) => page.getByPlaceholder('Enter your message...');

export interface CapturedUpload {
  status: number;
  uploaded: Array<{ name: string; size: number; path: string; workspacePath: string }>;
}

/**
 * Await the next POST to the application upload route and hand back its parsed
 * response — the server's own statement of where the file landed. Register
 * BEFORE triggering the upload.
 */
export function nextUploadResponse(page: Page): Promise<CapturedUpload> {
  return page
    .waitForResponse(
      response => response.url().includes('/workspace/upload') && response.request().method() === 'POST',
      { timeout: 60_000 },
    )
    .then(async response => ({
      status: response.status(),
      uploaded: response.ok()
        ? (((await response.json()) as { uploaded?: CapturedUpload['uploaded'] }).uploaded ?? [])
        : [],
    }));
}

/**
 * Capture (and swallow) every outgoing agent-execution POST whose body names
 * `marker`. The captured body is the assertion target: what the user message
 * actually carries is only observable at this boundary. Aborting the request
 * keeps the suite from burning a real model run on the deployment under test;
 * the thread it would have written to is a throwaway.
 */
export async function captureAgentSend(page: Page, agentId: string, marker: string): Promise<() => string[]> {
  const captured: string[] = [];
  await page.route(`**/api/agents/${agentId}/**`, async route => {
    const request = route.request();
    const body = request.method() === 'POST' ? (request.postData() ?? '') : '';
    if (body.includes(marker)) {
      captured.push(body);
      await route.abort('failed');
      return;
    }
    await route.continue();
  });
  return () => captured;
}

/** Drop `files` onto the window, the way a user drags files from their desktop. */
export async function dropFilesOnWindow(
  page: Page,
  files: Array<{ name: string; mimeType: string; buffer: Buffer }>,
): Promise<void> {
  const payload = files.map(file => ({
    name: file.name,
    mimeType: file.mimeType,
    base64: file.buffer.toString('base64'),
  }));

  await page.evaluate(async filesToDrop => {
    const dataTransfer = new DataTransfer();
    for (const file of filesToDrop) {
      const bytes = Uint8Array.from(atob(file.base64), character => character.charCodeAt(0));
      dataTransfer.items.add(new File([bytes], file.name, { type: file.mimeType }));
    }
    // The dropzone listens on window and keys off `types` including 'Files',
    // which DataTransfer sets once a real File is added. dragenter first, as a
    // browser would, so the overlay's depth accounting stays consistent.
    window.dispatchEvent(new DragEvent('dragenter', { bubbles: true, dataTransfer }));
    window.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer }));
    window.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));
  }, payload);
}
