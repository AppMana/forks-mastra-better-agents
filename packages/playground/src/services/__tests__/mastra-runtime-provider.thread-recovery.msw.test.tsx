// @vitest-environment jsdom
// A transient render error inside the thread view (message parts racing a
// streamed update) must stay scoped to the thread view: the runtime and its
// stream handling above it survive, and the view retries as the conversation
// updates. Without that scoping the page-level error boundary latches and the
// live run never renders again without a reload.
import { MessagePrimitive, ThreadPrimitive, useMessagePartText } from '@assistant-ui/react';
import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import { ErrorBoundary } from '@mastra/playground-ui';
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MastraRuntimeProvider } from '../mastra-runtime-provider';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Throws while the marked message state is present, simulating a transient
// render race in the thread view during a streamed run. The next conversation
// update replaces the message state and the view renders normally again.
const TextLeaf = () => {
  const part = useMessagePartText();
  if (part.text.includes('[transient]')) {
    throw new Error('transient thread render race');
  }
  return <p data-testid="message-text">{part.text}</p>;
};

const Message = () => (
  <MessagePrimitive.Root>
    <MessagePrimitive.Parts components={{ Text: TextLeaf }} />
  </MessagePrimitive.Root>
);

const ThreadView = () => (
  <ThreadPrimitive.Root>
    <ThreadPrimitive.Viewport autoScroll={false}>
      <ThreadPrimitive.Messages components={{ Message }} />
    </ThreadPrimitive.Viewport>
  </ThreadPrimitive.Root>
);

const dbMessage = (id: string, role: 'user' | 'assistant', text: string): MastraDBMessage =>
  ({
    id,
    role,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    content: {
      format: 2,
      parts: [{ type: 'text', text }],
    },
  }) as MastraDBMessage;

const renderChat = (initialMessages: MastraDBMessage[]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = (messages: MastraDBMessage[]) => (
    <MastraReactProvider baseUrl={BASE_URL}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <MastraRuntimeProvider agentId="agent-1" threadId="thread-1" initialMessages={messages} modelVersion="v2">
            <ThreadView />
          </MastraRuntimeProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </MastraReactProvider>
  );
  const view = render(ui(initialMessages));
  return { view, ui };
};

beforeEach(() => {
  (window as { MASTRA_AGENT_SIGNALS?: string }).MASTRA_AGENT_SIGNALS = 'false';
  server.use(
    http.get(`${BASE_URL}/api/memory/config`, () => HttpResponse.json({ config: {} })),
    http.get(`${BASE_URL}/api/agents/agent-1/voice/speakers`, () => HttpResponse.json([])),
  );
});

afterEach(() => {
  cleanup();
  delete (window as { MASTRA_AGENT_SIGNALS?: string }).MASTRA_AGENT_SIGNALS;
});

describe('MastraRuntimeProvider thread view recovery', () => {
  it('scopes a transient thread render error and retries when the conversation updates', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const first = [dbMessage('u1', 'user', 'run the commands'), dbMessage('a1', 'assistant', '[transient] step 1')];
      const { view, ui } = renderChat(first);

      // The transient error is contained: the scoped fallback shows instead of
      // the page-level "Something went wrong" boundary.
      expect(await screen.findByText('Chat display error')).not.toBeNull();
      expect(screen.queryByText('Something went wrong')).toBeNull();

      // The run progresses: subsequent updates replace the inconsistent
      // message state and the boundary retries the view. A live run streams
      // updates continuously, so the retry converges within a few chunks.
      const second = [dbMessage('u1', 'user', 'run the commands'), dbMessage('a1', 'assistant', 'step 1 running')];
      view.rerender(ui(second));
      const third = [...second, dbMessage('a2', 'assistant', 'step 1 finished')];
      view.rerender(ui(third));

      await waitFor(() => {
        expect(screen.queryByText('Chat display error')).toBeNull();
        const texts = screen.getAllByTestId('message-text').map(el => el.textContent);
        expect(texts).toContain('step 1 running');
        expect(texts).toContain('step 1 finished');
      });
    } finally {
      consoleError.mockRestore();
    }
  });
});
