import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright against a LIVE, authenticated deployment of the studio — a dev
 * server or a deployed instance — rather than the kitchen-sink fixture server
 * that `playwright.config.ts` boots.
 *
 * No `webServer`: the servers under test are the deployment's own, already
 * running. Point the suite at them with environment variables:
 *
 *   E2E_BASE_URL        Studio origin (default http://localhost:5173, the
 *                       playground dev server, which proxies /api and /app to
 *                       the backend).
 *   E2E_SESSION_COOKIE  Value of the `mastra_session` cookie for a signed-in
 *                       user. Mint one out-of-band with deployment-private
 *                       tooling; it is never read from or written to this repo.
 *   E2E_AGENT_ID        Optional agent to chat as; defaults to the first agent
 *                       the API lists.
 *   E2E_UPLOADS_DIR     Optional absolute path of the signed-in user's uploads
 *                       directory on local disk; when set, specs additionally
 *                       assert uploaded bytes landed there.
 *
 * `testMatch` is `*.e2e.ts`, not `*.spec.ts`, so the fixture-server suite and
 * unit-test globs never pick these up.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

if (!process.env.E2E_SESSION_COOKIE) {
  throw new Error('E2E_SESSION_COOKIE is required: a live session cookie for the deployment under test.');
}

export default defineConfig({
  testDir: './tests-live',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: {
    timeout: 30_000,
  },
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
