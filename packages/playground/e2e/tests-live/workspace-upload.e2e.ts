import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import {
  authenticate,
  captureAgentSend,
  composerInput,
  dropFilesOnWindow,
  nextUploadResponse,
  openNewChat,
  resolveAgentId,
} from './support';

/**
 * FEATURE: Attaching files to a chat message uploads them into the workspace.
 * USER STORY: As a user, I attach a file — through the "+" dialog or by
 * dropping it on the composer — so that the agent can open it from a path the
 * message names.
 *
 * BEHAVIOR UNDER TEST, whichever gesture is used:
 *  - the file goes to POST <app-prefix>/workspace/upload (multipart, never
 *    base64-in-JSON, never inlined into the prompt);
 *  - the server answers with the one uploads/ top every upload lands in, and
 *    the announced `workspacePath` is absolute;
 *  - the outgoing user message names that absolute path as text;
 *  - a small raster image ALSO travels as an inline image part — alongside its
 *    path, never instead of it — so a vision model can actually look at it.
 *
 * Runs only against a live authenticated deployment: see
 * playwright.live.config.ts for E2E_BASE_URL / E2E_SESSION_COOKIE /
 * E2E_AGENT_ID / E2E_UPLOADS_DIR.
 */

/** The single uploads top. Mirrors WORKSPACE_UPLOAD_DIRECTORY (workspace-upload.ts). */
const UPLOADS_DIRECTORY = 'uploads';
/** Where a sandbox mounts the workspace. Mirrors WORKSPACE_SANDBOX_ROOT (workspace-upload.ts). */
const WORKSPACE_ROOT = '/workspace';

/** A 1x1 red pixel — a real, decodable PNG, small enough to inline. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Space and parentheses on purpose: the filename shape that breaks quoting. */
const uniqueName = (label: string, extension: string) =>
  `upload e2e ${label} (${Date.now().toString(36)}).${extension}`;

const announcedPathFor = (fileName: string) => `${WORKSPACE_ROOT}/${UPLOADS_DIRECTORY}/${fileName}`;

/** Attach a file through the composer's "+" dialog, as a user would. */
async function attachThroughPlusButton(
  page: import('@playwright/test').Page,
  file: { name: string; mimeType: string; buffer: Buffer },
): Promise<void> {
  await page.getByRole('button', { name: 'Add attachment' }).click();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add a local file' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(file);
}

/**
 * When E2E_UPLOADS_DIR names the signed-in user's uploads directory on local
 * disk, assert the uploaded bytes are really there. Skipped silently when the
 * deployment's storage is not reachable from the test host.
 */
async function expectOnDiskIfConfigured(fileName: string, expected: Buffer): Promise<void> {
  const uploadsDirectory = process.env.E2E_UPLOADS_DIR;
  if (!uploadsDirectory) return;
  const onDisk = await readFile(join(uploadsDirectory, fileName));
  expect(onDisk.equals(expected), `bytes on disk at ${join(uploadsDirectory, fileName)} differ from the upload`).toBe(
    true,
  );
}

test.describe('workspace uploads from the composer', () => {
  test('the "+" dialog uploads a text file into uploads/ and the message announces its absolute path', async ({
    page,
  }) => {
    const fileName = uniqueName('plus', 'txt');
    const marker = `PLUS-${Date.now().toString(36).toUpperCase()}`;
    const content = Buffer.from(`attached through the plus dialog: ${marker}\n`);

    await authenticate(page);
    const agentId = await resolveAgentId(page);
    await openNewChat(page, agentId);

    const uploadPromise = nextUploadResponse(page);
    await attachThroughPlusButton(page, { name: fileName, mimeType: 'text/plain', buffer: content });

    // The server's own statement of where the file landed.
    const upload = await uploadPromise;
    expect(upload.status, `the upload route refused the file: ${JSON.stringify(upload)}`).toBe(200);
    expect(upload.uploaded[0]?.path, 'every upload lands in the single uploads/ top').toBe(
      `${UPLOADS_DIRECTORY}/${fileName}`,
    );
    expect(upload.uploaded[0]?.workspacePath, 'the announced path is absolute, under the workspace root').toBe(
      announcedPathFor(fileName),
    );
    await expectOnDiskIfConfigured(fileName, content);

    // The attachment chip renders (its name only appears in a hover tooltip,
    // so the row itself is the wait target). The adapter records the notice
    // before it yields the chip's settled state, so once the row is here the
    // send below cannot race the upload.
    await expect(page.locator('[data-attachments-row]')).toBeVisible({ timeout: 30_000 });

    const captured = await captureAgentSend(page, agentId, announcedPathFor(fileName));
    await composerInput(page).fill('Attached for the record.');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect
      .poll(() => captured().length, {
        timeout: 30_000,
        message: 'no outgoing agent request ever named the uploaded path',
      })
      .toBeGreaterThan(0);

    const body = captured()[0]!;
    expect(body, 'the user message must carry the announced absolute path as text').toContain(
      announcedPathFor(fileName),
    );
    // The path travels; the bytes never do. A document inlined into the prompt
    // is the exact regression this flow replaced.
    expect(body, 'document bytes must never be inlined into the outgoing message').not.toContain(marker);
  });

  test('drag-and-drop onto the composer behaves identically: same route, same uploads/ top, path announced in the message', async ({
    page,
  }) => {
    const fileName = uniqueName('drop', 'txt');
    const marker = `DROP-${Date.now().toString(36).toUpperCase()}`;
    const content = Buffer.from(`dropped onto the composer: ${marker}\n`);

    await authenticate(page);
    const agentId = await resolveAgentId(page);
    await openNewChat(page, agentId);

    const uploadPromise = nextUploadResponse(page);
    await dropFilesOnWindow(page, [{ name: fileName, mimeType: 'text/plain', buffer: content }]);

    // Identical contract to the "+" dialog: same endpoint (nextUploadResponse
    // only matches the application upload route), same uploads/ top, same
    // absolute announcement.
    const upload = await uploadPromise;
    expect(upload.status, `the upload route refused the dropped file: ${JSON.stringify(upload)}`).toBe(200);
    expect(upload.uploaded[0]?.path, 'a dropped file lands in the same single uploads/ top').toBe(
      `${UPLOADS_DIRECTORY}/${fileName}`,
    );
    expect(upload.uploaded[0]?.workspacePath).toBe(announcedPathFor(fileName));
    await expectOnDiskIfConfigured(fileName, content);

    // The drop flow announces in the composer text itself.
    await expect
      .poll(async () => composerInput(page).inputValue(), {
        timeout: 30_000,
        message: 'the composer never announced the dropped file',
      })
      .toContain(announcedPathFor(fileName));

    const captured = await captureAgentSend(page, agentId, announcedPathFor(fileName));
    await page.getByRole('button', { name: 'Send' }).click();

    await expect
      .poll(() => captured().length, {
        timeout: 30_000,
        message: 'no outgoing agent request ever named the dropped file path',
      })
      .toBeGreaterThan(0);

    const body = captured()[0]!;
    expect(body).toContain(announcedPathFor(fileName));
    expect(body, 'dropped document bytes must never be inlined into the outgoing message').not.toContain(marker);
  });

  test('a small png is uploaded AND travels as an inline image part alongside its path', async ({ page }) => {
    const fileName = uniqueName('image', 'png');

    await authenticate(page);
    const agentId = await resolveAgentId(page);
    await openNewChat(page, agentId);

    const uploadPromise = nextUploadResponse(page);
    await attachThroughPlusButton(page, { name: fileName, mimeType: 'image/png', buffer: TINY_PNG });

    const upload = await uploadPromise;
    expect(upload.status, `the upload route refused the image: ${JSON.stringify(upload)}`).toBe(200);
    expect(upload.uploaded[0]?.workspacePath, 'an image uploads exactly like everything else').toBe(
      announcedPathFor(fileName),
    );
    await expectOnDiskIfConfigured(fileName, TINY_PNG);

    await expect(page.locator('[data-attachments-row]')).toBeVisible({ timeout: 30_000 });

    const captured = await captureAgentSend(page, agentId, announcedPathFor(fileName));
    await composerInput(page).fill('What is in this image?');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect
      .poll(() => captured().length, {
        timeout: 30_000,
        message: 'no outgoing agent request ever named the uploaded image path',
      })
      .toBeGreaterThan(0);

    const body = captured()[0]!;
    // BOTH halves, in one message: the path (so the model can open the file
    // with its tools) ...
    expect(body, 'the message must name the absolute uploaded path').toContain(announcedPathFor(fileName));
    // ... and the pixels (so a vision model can look at it). The exact bytes,
    // base64-encoded, with their type — a placeholder or a re-encode would not
    // match.
    expect(body, 'the message must carry the image bytes as an inline part').toContain(TINY_PNG.toString('base64'));
    expect(body, 'the inline part must declare the image type').toContain('image/png');
  });
});
