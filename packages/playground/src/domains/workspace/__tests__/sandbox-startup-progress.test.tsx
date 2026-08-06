// @vitest-environment jsdom
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { SandboxStartupProgressView } from '../components/sandbox-startup-progress';
import { fetchSandboxStatus, sandboxPercent, sandboxStatusUrl } from '../sandbox-status';
import type { SandboxStatus } from '../sandbox-status';
import { appRoute } from '@/lib/app-routes';
import Workspace from '@/pages/workspace';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';
const WS = 'coding-user-1';

// The status hook fetches a relative URL; resolve it against a fixed origin so
// msw can intercept it, the same way workspace-page.test.tsx does.
let unwrapFetch: (() => void) | undefined;
beforeAll(() => {
  const wrapped = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      input = new URL(input, BASE_URL).toString();
    }
    return wrapped(input as RequestInfo, init);
  }) as typeof fetch;
  unwrapFetch = () => {
    globalThis.fetch = wrapped;
  };
});
afterAll(() => unwrapFetch?.());

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

const status = (overrides: Partial<SandboxStatus> = {}): SandboxStatus => ({
  phase: 'pulling-image',
  message: 'Downloading the workspace image…',
  step: 5,
  totalSteps: 8,
  ready: false,
  ...overrides,
});

describe('sandboxStatusUrl / sandboxPercent', () => {
  it('addresses the app route and carries the workspace id', () => {
    expect(sandboxStatusUrl()).toBe(appRoute('/workspace/sandbox-status'));
    expect(sandboxStatusUrl({ workspaceId: 'coding-a b' })).toBe(
      `${appRoute('/workspace/sandbox-status')}?workspaceId=coding-a+b`,
    );
  });

  it('asks by CONVERSATION when there is one, because the pod belongs to it', () => {
    // A chat that does not name its thread is answered about the user's
    // thread-less workspace -- an object no conversation creates -- which is
    // the whole of "allocating your workspace, step 1 of 8" against a pod that
    // was already Running.
    expect(sandboxStatusUrl({ threadId: 'abc-123' })).toBe(`${appRoute('/workspace/sandbox-status')}?threadId=abc-123`);
    expect(sandboxStatusUrl({ threadId: 'abc-123', workspaceId: 'coding-x' })).toBe(
      `${appRoute('/workspace/sandbox-status')}?threadId=abc-123`,
    );
  });

  it('turns the step into a percentage and refuses to for an error phase', () => {
    expect(sandboxPercent(status())).toBe(63);
    expect(sandboxPercent(status({ phase: 'error', step: -1 }))).toBeNull();
    expect(sandboxPercent(status({ step: 8 }))).toBe(100);
  });
});

describe('fetchSandboxStatus', () => {
  it('unwraps the status and degrades to null on every failure mode', async () => {
    const respond = (body: unknown, ok = true) =>
      vi.fn(async () => ({ ok, json: async () => body }) as unknown as Response) as unknown as typeof fetch;

    expect(await fetchSandboxStatus({}, respond({ status: status() }))).toEqual(status());
    expect(await fetchSandboxStatus({}, respond({ status: null }))).toBeNull();
    expect(await fetchSandboxStatus({}, respond({}))).toBeNull();
    expect(await fetchSandboxStatus({}, respond({ status: { phase: 'x' } }))).toBeNull();
    expect(await fetchSandboxStatus({}, respond({ status: status() }, false))).toBeNull();

    const thrown = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await fetchSandboxStatus({}, thrown)).toBeNull();
  });
});

describe('SandboxStartupProgressView', () => {
  it('renders a bare spinner when there is no status to show', () => {
    render(<SandboxStartupProgressView status={null} />);
    expect(screen.queryByTestId('sandbox-startup-progress')).toBeNull();
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('shows the phase message and a determinate bar', () => {
    render(<SandboxStartupProgressView status={status()} />);
    expect(screen.getByText('Downloading the workspace image…')).toBeTruthy();
    expect(screen.getByText('63%')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('63');
  });

  it('renders an indeterminate bar for an error phase', () => {
    render(<SandboxStartupProgressView status={status({ phase: 'error', message: 'Out of disk', step: -1 })} />);
    expect(screen.getByText('Out of disk')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull();
  });
});

function renderWorkspacePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <MastraReactProvider baseUrl={BASE_URL}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/workspaces/${WS}`]}>
          <Routes>
            <Route path="/workspaces/:workspaceId" element={<Workspace />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MastraReactProvider>,
  );
}

describe('Workspace page — sandbox startup', () => {
  it('reports the startup phase while the workspace info request is still in flight', async () => {
    const gate = (() => {
      let resolve: () => void = () => {};
      const promise = new Promise<void>(r => {
        resolve = r;
      });
      return { promise, resolve };
    })();

    let requestedWorkspaceId: string | null = null;
    server.use(
      http.get(`${BASE_URL}/api/workspaces`, () =>
        HttpResponse.json({
          workspaces: [
            {
              id: WS,
              name: 'Test Workspace',
              status: 'ready',
              source: 'mastra',
              capabilities: {
                hasFilesystem: true,
                hasSandbox: true,
                canBM25: false,
                canVector: false,
                canHybrid: false,
                hasSkills: false,
              },
              safety: { readOnly: false },
            },
          ],
        }),
      ),
      http.get(`${BASE_URL}/api/workspaces/${WS}`, async () => {
        await gate.promise;
        return HttpResponse.json({
          isWorkspaceConfigured: true,
          id: WS,
          name: 'Test Workspace',
          status: 'ready',
          capabilities: {
            hasFilesystem: true,
            hasSandbox: true,
            canBM25: false,
            canVector: false,
            canHybrid: false,
            hasSkills: false,
          },
          safety: { readOnly: false },
        });
      }),
      http.get(`${BASE_URL}/api/workspaces/${WS}/fs/list`, () => HttpResponse.json({ path: '.', entries: [] })),
      http.get(`${BASE_URL}/api/workspaces/${WS}/skills`, () =>
        HttpResponse.json({ skills: [], isSkillsConfigured: false }),
      ),
      http.get(`${BASE_URL}${appRoute('/workspace/sharing')}`, () => HttpResponse.json({})),
      http.get(`${BASE_URL}${appRoute('/workspace/sandbox-status')}`, ({ request }) => {
        requestedWorkspaceId = new URL(request.url).searchParams.get('workspaceId');
        return HttpResponse.json({
          status: status({ phase: 'waiting-for-storage', message: 'Waiting for storage…', step: 3 }),
        });
      }),
    );

    renderWorkspacePage();

    expect(await screen.findByText('Waiting for storage…')).toBeTruthy();
    expect(requestedWorkspaceId).toBe(WS);

    gate.resolve();
    await waitFor(() => expect(screen.queryByTestId('sandbox-startup-progress')).toBeNull());
  });

  it('keeps a plain spinner when the status endpoint reports nothing', async () => {
    server.use(
      http.get(`${BASE_URL}/api/workspaces`, async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return HttpResponse.json({ workspaces: [] });
      }),
      http.get(`${BASE_URL}${appRoute('/workspace/sandbox-status')}`, () => HttpResponse.json({ status: null })),
    );

    renderWorkspacePage();

    expect(screen.getAllByLabelText('Loading').length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByTestId('sandbox-startup-progress')).toBeNull());
  });
});
