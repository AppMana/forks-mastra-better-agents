// @vitest-environment jsdom
// The generated thread title has to reach the sidebar on the path the Studio
// actually uses. That path is NOT `/stream`: with thread signals on (the
// default), `useChat` posts to `send-message` and reads the run back off a
// `threads/subscribe` SSE stream. Every existing test for the title watch mocks
// `sendMessage` and hands `onChunk` a `finish` chunk by hand, so none of them
// says anything about whether the watch arms in production.
import { ThreadPrimitive, useAssistantRuntime } from '@assistant-ui/react';
import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import { ErrorBoundary } from '@mastra/playground-ui';
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MastraRuntimeProvider } from '../mastra-runtime-provider';
import { THREAD_TITLE_POLL_INTERVAL_MS } from '../thread-title';
import { ChatThreads } from '@/domains/agents/components/chat-threads';
import { useThreads } from '@/domains/memory/hooks/use-memory';
import { LinkComponentProvider } from '@/lib/framework';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';
const THREAD_ID = 'thread-1';
const AGENT_ID = 'agent-1';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

const sse = (chunk: unknown) => `data: ${JSON.stringify(chunk)}\n\n`;

const openStream = () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  return {
    body,
    push: (chunk: unknown) => controller.enqueue(encoder.encode(sse(chunk))),
    close: () => controller.close(),
  };
};

const CREATED_AT = '2026-08-04T22:01:42.000Z';

/** What the sidebar falls back to while the thread has no name: `Aug 4 at 10:01:42 PM`. */
const TIMESTAMP_NAME = new Date(CREATED_AT)
  .toLocaleString('en-us', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
  })
  .replace(',', ' at');

/** The thread as storage has it right now; the run renames it. */
let threadTitle = '';
let subscription: ReturnType<typeof openStream>;
let sendMessageCalls = 0;
let threadReads = 0;

const StubLink = ({ children, ...props }: { children?: unknown; [key: string]: unknown }) => (
  <a {...(props as Record<string, never>)}>{children as never}</a>
);

const noopPaths = new Proxy({}, { get: () => () => '' }) as never;

const SendButton = () => {
  const runtime = useAssistantRuntime();
  return (
    <button
      type="button"
      data-testid="send"
      onClick={() =>
        runtime.thread.append({ role: 'user', content: [{ type: 'text', text: 'rename the deploy job' }] })
      }
    >
      send
    </button>
  );
};

/**
 * The page shape that matters, reduced to its wiring: one `useThreads` query
 * feeding the sidebar, and `refetch` handed to the runtime as
 * `refreshThreadList` — exactly what `pages/agents/agent/index.tsx` does.
 */
const Page = ({ onRefresh }: { onRefresh?: () => void }) => {
  const {
    data: threads,
    isLoading,
    refetch,
  } = useThreads({ agentId: AGENT_ID, resourceId: AGENT_ID, isMemoryEnabled: true });

  const sidebarThreads = (threads ?? []).map(thread => ({
    ...thread,
    createdAt: new Date(thread.createdAt),
    updatedAt: new Date(thread.updatedAt),
  }));

  const refreshThreadList = async () => {
    onRefresh?.();
    await refetch();
  };

  return (
    <>
      <div data-testid="sidebar">
        <ChatThreads
          threads={sidebarThreads}
          isLoading={isLoading}
          threadId={THREAD_ID}
          onDelete={() => {}}
          onRename={() => {}}
          resourceId={AGENT_ID}
          resourceType="agent"
        />
      </div>
      <MastraRuntimeProvider
        agentId={AGENT_ID}
        threadId={THREAD_ID}
        initialMessages={[] as MastraDBMessage[]}
        modelVersion="v2"
        refreshThreadList={refreshThreadList}
      >
        <ThreadPrimitive.Root>
          <SendButton />
        </ThreadPrimitive.Root>
      </MastraRuntimeProvider>
    </>
  );
};

const Harness = ({ onRefresh }: { onRefresh?: () => void }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MastraReactProvider baseUrl={BASE_URL}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <LinkComponentProvider Link={StubLink as never} navigate={() => {}} paths={noopPaths}>
            <Page onRefresh={onRefresh} />
          </LinkComponentProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </MastraReactProvider>
  );
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  threadTitle = '';
  sendMessageCalls = 0;
  threadReads = 0;
  subscription = openStream();
  server.use(
    http.get(`${BASE_URL}/api/memory/config`, () => HttpResponse.json({ config: {} })),
    http.get(`${BASE_URL}/api/agents/${AGENT_ID}/voice/speakers`, () => HttpResponse.json([])),
    http.get(`${BASE_URL}/api/workspaces`, () => HttpResponse.json({ workspaces: [] })),
    http.get(`${BASE_URL}/api/agents/${AGENT_ID}`, () => HttpResponse.json({ name: AGENT_ID, tools: {} })),
    http.post(`${BASE_URL}/api/memory/threads`, () => HttpResponse.json({ id: THREAD_ID, title: '' })),
    // The list the sidebar renders. Same storage, so it sees the rename too.
    http.get(`${BASE_URL}/api/memory/threads`, () =>
      HttpResponse.json({
        threads: [
          {
            id: THREAD_ID,
            resourceId: AGENT_ID,
            title: threadTitle,
            metadata: { agentId: AGENT_ID },
            createdAt: CREATED_AT,
            updatedAt: CREATED_AT,
          },
        ],
      }),
    ),
    http.get(`${BASE_URL}/api/memory/threads/${THREAD_ID}/messages`, () =>
      HttpResponse.json({ messages: [], uiMessages: [] }),
    ),
    // What the title watch polls.
    http.get(`${BASE_URL}/api/memory/threads/${THREAD_ID}`, () => {
      threadReads += 1;
      return HttpResponse.json({ id: THREAD_ID, title: threadTitle });
    }),
    http.post(
      `${BASE_URL}/api/agents/${AGENT_ID}/threads/subscribe`,
      () => new HttpResponse(subscription.body, { headers: { 'Content-Type': 'text/event-stream' } }),
    ),
    http.post(`${BASE_URL}/api/agents/${AGENT_ID}/send-message`, () => {
      sendMessageCalls += 1;
      return HttpResponse.json({ accepted: true, runId: 'run-1', signal: { id: 'signal-1' } });
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('generated thread title on the send-message path', () => {
  it('replaces the creation timestamp in the sidebar once the title lands', async () => {
    const refreshThreadList = vi.fn();

    render(<Harness onRefresh={refreshThreadList} />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      (await screen.findByTestId('send')).click();
      await Promise.resolve();
    });

    await waitFor(() => expect(sendMessageCalls).toBe(1));

    // The server names the thread during the turn, then the run finishes.
    threadTitle = 'Rename the deploy job';

    await act(async () => {
      subscription.push({ type: 'start', runId: 'run-1', from: 'AGENT', payload: { messageId: 'asst-1' } });
      subscription.push({ type: 'text-start', runId: 'run-1', from: 'AGENT', payload: { id: 'txt-0' } });
      subscription.push({ type: 'text-delta', runId: 'run-1', from: 'AGENT', payload: { id: 'txt-0', text: 'done' } });
      subscription.push({
        type: 'finish',
        runId: 'run-1',
        from: 'AGENT',
        payload: { stepResult: { reason: 'stop' } },
      });
      await Promise.resolve();
    });

    const refreshesBeforeWatch = refreshThreadList.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_TITLE_POLL_INTERVAL_MS * 3);
    });

    expect(threadReads, 'the title watch never polled the thread on the send-message path').toBeGreaterThan(0);
    expect(
      refreshThreadList.mock.calls.length,
      'the title watch never refreshed the sidebar on the send-message path',
    ).toBeGreaterThan(refreshesBeforeWatch);

    // What the owner is actually looking at.
    await waitFor(() => {
      expect(screen.getByTestId('sidebar').textContent).toContain('Rename the deploy job');
    });
    expect(screen.getByTestId('sidebar').textContent).not.toContain(TIMESTAMP_NAME);
  });

  it('names the thread while the first turn is still running', async () => {
    // The server names the conversation from the first message at request
    // entry, so the title exists seconds into a turn that then spends minutes
    // starting a sandbox and running commands — and may never finish at all if
    // the backend dies. Waiting for `finish` to start looking is what leaves
    // the sidebar showing the creation timestamp for the whole of that.
    render(<Harness />);

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      (await screen.findByTestId('send')).click();
      await Promise.resolve();
    });

    await waitFor(() => expect(sendMessageCalls).toBe(1));

    await act(async () => {
      subscription.push({ type: 'start', runId: 'run-1', from: 'AGENT', payload: { messageId: 'asst-1' } });
      await Promise.resolve();
    });

    // The title lands early in the turn. No `finish`: the run is still going.
    threadTitle = 'Rename the deploy job';

    await act(async () => {
      await vi.advanceTimersByTimeAsync(THREAD_TITLE_POLL_INTERVAL_MS * 4);
    });

    expect(
      screen.getByTestId('sidebar').textContent,
      'the sidebar still shows the creation timestamp while the first turn runs',
    ).toContain('Rename the deploy job');
  });
});
