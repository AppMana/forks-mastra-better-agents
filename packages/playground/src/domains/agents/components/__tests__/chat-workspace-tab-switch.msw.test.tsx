// @vitest-environment jsdom
/**
 * Switching between the Chat tab and the Workspace tab and back.
 *
 * The owner hits "Tried to unmount a fiber that is already unmounted" doing
 * exactly this, with a conversation that has tool calls and an uploaded
 * spreadsheet in it. The throw is `@assistant-ui/tap`'s `unmountResourceFiber`,
 * reached from `AssistantRuntimeProviderImpl` under `MastraRuntimeProvider`, so
 * the real chat page and the real `Thread` have to be in the tree: a stubbed
 * message leaf renders none of the resources that get stranded.
 *
 * StrictMode is deliberate — the app mounts under it (src/main.tsx).
 */
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

globalThis.ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver;

if (typeof Element !== 'undefined' && typeof Element.prototype.getAnimations !== 'function') {
  Element.prototype.getAnimations = function getAnimations() {
    return [] as Animation[];
  };
}

import { appRoute } from '@/lib/app-routes';
import { LinkComponentProvider } from '@/lib/framework';
import Agent from '@/pages/agents/agent';
import AgentWorkspace from '@/pages/agents/workspace';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';
const AGENT_ID = 'document-analyst';
const THREAD_ID = 'thread-1234';
const WS = 'user-files';

// The page fetches relative URLs; give Node's fetch an origin msw can match.
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
  cleanup();
});

const StubLink = ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a {...props}>{children}</a>
);

const noopPaths = new Proxy({}, { get: () => () => '' }) as never;

/**
 * The conversation the crash happened in: an uploaded spreadsheet, a command
 * that ran in the sandbox with its streamed output, and a reply. Every one of
 * these renders a different message part component.
 */
const uiMessages = [
  {
    id: 'user-1',
    role: 'user',
    createdAt: '2026-08-04T22:00:00.000Z',
    content: {
      format: 2,
      parts: [{ type: 'text', text: 'Summarise contracts.xlsx' }],
      experimental_attachments: [
        { name: 'contracts.xlsx', contentType: 'application/vnd.ms-excel', url: '/uploads/contracts.xlsx' },
      ],
    },
  },
  {
    id: 'asst-1',
    role: 'assistant',
    createdAt: '2026-08-04T22:00:05.000Z',
    content: {
      format: 2,
      parts: [
        { type: 'text', text: 'Reading the spreadsheet.' },
        {
          type: 'tool-invocation',
          toolInvocation: {
            state: 'result',
            toolCallId: 'call-1',
            toolName: 'mastra_workspace_execute_command',
            args: { command: 'python3 -c "import pandas"' },
            result: 'ok\n',
          },
        },
        { type: 'data-workspace-metadata', data: { toolCallId: 'call-1', sandbox: { status: 'running' } } },
        { type: 'data-sandbox-stdout', data: { toolCallId: 'call-1', output: 'rows: 42\n' } },
        { type: 'data-sandbox-exit', data: { toolCallId: 'call-1', exitCode: 0, success: true } },
        {
          type: 'tool-invocation',
          toolInvocation: {
            state: 'result',
            toolCallId: 'call-2',
            toolName: 'mastra_workspace_write_file',
            args: { path: '/workspace/summary.md', content: '# Summary\n\n- 42 rows\n' },
            result: 'written',
          },
        },
        {
          type: 'text',
          text: 'Here is the summary.\n\n![chart](/uploads/chart.png)\n\n| a | b |\n| - | - |\n| 1 | 2 |',
        },
      ],
    },
  },
];

const workspaceItem = {
  id: WS,
  name: 'My Files',
  status: 'ready',
  source: 'agent' as const,
  agentId: AGENT_ID,
  agentName: 'Document Analyst',
  capabilities: {
    hasFilesystem: true,
    hasSandbox: true,
    canBM25: false,
    canVector: false,
    canHybrid: false,
    hasSkills: false,
  },
  safety: { readOnly: false },
};

const handlers = () => [
  http.get(`${BASE_URL}/api/agents/${AGENT_ID}`, () =>
    HttpResponse.json({ name: 'Document Analyst', modelVersion: 'v2', tools: {}, browserTools: [] }),
  ),
  http.get(`${BASE_URL}/api/agents/${AGENT_ID}/voice/speakers`, () => HttpResponse.json([])),
  http.get(`${BASE_URL}/api/agents/${AGENT_ID}/browser/session`, () =>
    HttpResponse.json({ hasSession: false, screencastAvailable: false }),
  ),
  http.get(`${BASE_URL}/api/memory/status`, () => HttpResponse.json({ result: true })),
  http.get(`${BASE_URL}/api/memory/config`, () => HttpResponse.json({ config: {} })),
  http.get(`${BASE_URL}/api/memory/threads`, () =>
    HttpResponse.json({
      threads: [
        {
          id: THREAD_ID,
          resourceId: AGENT_ID,
          title: 'Contracts',
          metadata: { agentId: AGENT_ID },
          createdAt: '2026-08-04T22:00:00.000Z',
          updatedAt: '2026-08-04T22:00:00.000Z',
        },
      ],
    }),
  ),
  http.get(`${BASE_URL}/api/memory/threads/${THREAD_ID}`, () =>
    HttpResponse.json({ id: THREAD_ID, title: 'Contracts' }),
  ),
  http.get(`${BASE_URL}/api/memory/threads/${THREAD_ID}/messages`, () =>
    HttpResponse.json({ messages: uiMessages, uiMessages }),
  ),
  http.get(`${BASE_URL}/api/workspaces`, () => HttpResponse.json({ workspaces: [workspaceItem] })),
  http.get(`${BASE_URL}/api/workspaces/${WS}`, () =>
    HttpResponse.json({ isWorkspaceConfigured: true, ...workspaceItem }),
  ),
  http.get(`${BASE_URL}/api/workspaces/${WS}/fs/list`, () => HttpResponse.json({ path: '', entries: [] })),
  http.get(`${BASE_URL}/api/workspaces/${WS}/skills`, () =>
    HttpResponse.json({ skills: [], isSkillsConfigured: false }),
  ),
  http.get(`${BASE_URL}${appRoute('/workspace/sharing')}`, () => HttpResponse.json({}, { status: 404 })),
  http.get(`${BASE_URL}${appRoute('/workspace/sandbox-status')}`, () => HttpResponse.json({ status: null })),
  http.get(`${BASE_URL}${appRoute('/workspace/conversation')}`, () =>
    HttpResponse.json({ slug: 'analysis-1234', path: 'workspaces/analysis-1234' }),
  ),
  http.get(`${BASE_URL}${appRoute('/inference/prefill-status')}`, () => HttpResponse.json({ slots: [] })),
];

/** The two tabs, as buttons, so the switch is a plain user click. */
const Tabs = () => {
  const navigate = useNavigate();
  return (
    <div>
      <button type="button" data-testid="tab-chat" onClick={() => navigate(`/agents/${AGENT_ID}/chat/${THREAD_ID}`)}>
        chat
      </button>
      <button
        type="button"
        data-testid="tab-workspace"
        onClick={() => navigate(`/agents/${AGENT_ID}/workspace/${THREAD_ID}`)}
      >
        workspace
      </button>
    </div>
  );
};

const renderApp = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

  return render(
    <StrictMode>
      <MastraReactProvider baseUrl={BASE_URL}>
        <QueryClientProvider client={queryClient}>
          <LinkComponentProvider Link={StubLink as never} navigate={() => {}} paths={noopPaths}>
            <MemoryRouter initialEntries={[`/agents/${AGENT_ID}/chat/${THREAD_ID}`]}>
              <Tabs />
              <Routes>
                <Route path="/agents/:agentId/chat/:threadId" element={<Agent />} />
                <Route path="/agents/:agentId/workspace/:threadId" element={<AgentWorkspace />} />
              </Routes>
            </MemoryRouter>
          </LinkComponentProvider>
        </QueryClientProvider>
      </MastraReactProvider>
    </StrictMode>,
  );
};

describe('switching between the chat tab and the workspace tab', () => {
  it('does not strand an unmounted assistant-ui fiber', async () => {
    server.use(...handlers());

    const errors: string[] = [];
    const consoleError = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    });
    const onWindowError = (event: ErrorEvent) => errors.push(String(event.error ?? event.message));
    window.addEventListener('error', onWindowError);

    try {
      renderApp();

      // The conversation is really there: the crash needs a populated tree.
      expect(await screen.findByTestId('tab-workspace')).toBeTruthy();
      await waitFor(() => expect(document.body.textContent).toContain('Here is the summary.'), { timeout: 8000 });

      for (let round = 0; round < 4; round++) {
        await act(async () => {
          screen.getByTestId('tab-workspace').click();
          await Promise.resolve();
        });
        await act(async () => {
          screen.getByTestId('tab-chat').click();
          await Promise.resolve();
        });
      }

      process.stdout.write('COLLECTED:\n' + errors.map(e => e.slice(0, 300)).join('\n---\n') + '\n');
      const stranded = errors.filter(entry => entry.includes('already unmounted'));
      expect(stranded, `stranded fiber on tab switch: ${JSON.stringify(stranded.slice(0, 2))}`).toHaveLength(0);
    } finally {
      window.removeEventListener('error', onWindowError);
      consoleError.mockRestore();
    }
  });
});
