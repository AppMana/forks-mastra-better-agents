// @vitest-environment jsdom
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

// jsdom doesn't provide ResizeObserver — stub it for floating-ui/base-ui
globalThis.ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver;

// jsdom also lacks `Element.getAnimations`, which @base-ui components call.
if (typeof Element !== 'undefined' && typeof Element.prototype.getAnimations !== 'function') {
  Element.prototype.getAnimations = function getAnimations() {
    return [] as Animation[];
  };
}

import { appRoute } from '@/lib/app-routes';
import AgentWorkspace from '@/pages/agents/workspace';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';
const WS = 'user-files';
const THREAD_ID = 'thread-1234';
const CONVERSATION_PATH = 'workspaces/analysis-1234';

// The page and hooks fetch relative URLs, which Node's fetch cannot parse.
// Resolve relative URLs against a fixed origin so msw can intercept them.
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

const workspaceItem = {
  id: WS,
  // The user's one filesystem. Deliberately different from the agent's name:
  // the header must show this name alone, never "name (agent name)".
  name: 'My Files',
  status: 'ready',
  source: 'agent' as const,
  agentId: 'document-analyst',
  agentName: 'Document Analyst',
  capabilities: {
    hasFilesystem: true,
    hasSandbox: false,
    canBM25: false,
    canVector: false,
    canHybrid: false,
    hasSkills: false,
  },
  safety: { readOnly: false },
};

const workspaceInfo = {
  isWorkspaceConfigured: true,
  id: WS,
  name: 'My Files',
  status: 'ready',
  capabilities: workspaceItem.capabilities,
  safety: workspaceItem.safety,
};

const ROOT_ENTRIES = [
  { name: 'uploads', type: 'directory' as const },
  { name: 'workspaces', type: 'directory' as const },
];

const CONVERSATION_ENTRIES = [{ name: 'report.md', type: 'file' as const, size: 1024 }];

/**
 * Handlers for the whole surface. `listedPaths` records every `path` the file
 * listing was queried with, in order — the panel opening at the wrong
 * directory is exactly a wrong first element here.
 */
function baseHandlers(listedPaths: string[]) {
  return [
    http.get(`${BASE_URL}/api/workspaces`, () => HttpResponse.json({ workspaces: [workspaceItem] })),
    http.get(`${BASE_URL}/api/workspaces/${WS}`, () => HttpResponse.json(workspaceInfo)),
    http.get(`${BASE_URL}/api/workspaces/${WS}/fs/list`, ({ request }) => {
      const path = new URL(request.url).searchParams.get('path') ?? '';
      listedPaths.push(path);
      return HttpResponse.json({
        path,
        entries: path === CONVERSATION_PATH ? CONVERSATION_ENTRIES : ROOT_ENTRIES,
      });
    }),
    http.get(`${BASE_URL}/api/workspaces/${WS}/skills`, () =>
      HttpResponse.json({ skills: [], isSkillsConfigured: false }),
    ),
    http.get(`${BASE_URL}${appRoute('/workspace/sharing')}`, () => HttpResponse.json({}, { status: 404 })),
    http.get(`${BASE_URL}${appRoute('/workspace/sandbox-status')}`, () => HttpResponse.json({ status: null })),
    http.get(`${BASE_URL}${appRoute('/workspace/conversation')}`, ({ request }) => {
      const threadId = new URL(request.url).searchParams.get('threadId');
      if (threadId !== THREAD_ID) {
        return HttpResponse.json({ error: 'unknown thread' }, { status: 404 });
      }
      return HttpResponse.json({ slug: 'analysis-1234', path: CONVERSATION_PATH });
    }),
  ];
}

function renderAgentWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <MastraReactProvider baseUrl={BASE_URL}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/agents/document-analyst/workspace/${THREAD_ID}`]}>
          <Routes>
            <Route path="/agents/:agentId/workspace/:threadId" element={<AgentWorkspace />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MastraReactProvider>,
  );
}

describe('Agent workspace tab — conversation directory', () => {
  it('opens the panel navigated into the conversation directory, not the root', async () => {
    const listedPaths: string[] = [];
    server.use(...baseHandlers(listedPaths));
    renderAgentWorkspace();

    // The conversation's own file is on show, not the root of the tree.
    expect(await screen.findByText('report.md')).toBeTruthy();
    expect(screen.queryByText('uploads')).toBeNull();

    // The listing was queried at the conversation directory — never at '.'.
    expect(listedPaths).toContain(CONVERSATION_PATH);
    expect(listedPaths).not.toContain('.');
  });

  it('navigating up to the root stays at the root instead of bouncing back', async () => {
    const listedPaths: string[] = [];
    server.use(...baseHandlers(listedPaths));
    renderAgentWorkspace();

    expect(await screen.findByText('report.md')).toBeTruthy();

    // The breadcrumb's root button navigates to '.', which must win over the
    // conversation-directory default once the user chose it.
    fireEvent.click(screen.getByLabelText('Workspace root'));

    expect(await screen.findByText('uploads')).toBeTruthy();
    await waitFor(() => expect(listedPaths).toContain('.'));
    expect(screen.queryByText('report.md')).toBeNull();
  });

  it('falls back to the root when the conversation route serves the SPA shell', async () => {
    const listedPaths: string[] = [];
    server.use(...baseHandlers(listedPaths));
    // A backend that predates the conversation route serves the SPA index for
    // unknown paths: a 200 whose body is HTML, not JSON. The tab must fall
    // back to the root of the user's files rather than break.
    server.use(
      http.get(`${BASE_URL}${appRoute('/workspace/conversation')}`, () =>
        HttpResponse.html('<!doctype html><html><body>Mastra Studio</body></html>'),
      ),
    );
    renderAgentWorkspace();

    expect(await screen.findByText('uploads')).toBeTruthy();
    expect(listedPaths).toContain('.');
  });
});

describe('Agent workspace tab — header', () => {
  it("shows the workspace's own name without appending the agent name", async () => {
    const listedPaths: string[] = [];
    server.use(...baseHandlers(listedPaths));
    renderAgentWorkspace();

    expect(await screen.findByText('My Files')).toBeTruthy();
    // The filesystem belongs to the user, not to an agent — no parenthetical.
    expect(screen.queryByText('(Document Analyst)')).toBeNull();
  });
});
