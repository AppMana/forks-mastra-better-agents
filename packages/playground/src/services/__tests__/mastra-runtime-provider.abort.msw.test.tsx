// @vitest-environment jsdom
// Hitting Stop mid-stream must not crash the thread view. The runtime keeps
// live state in assistant-ui resource fibers; anything that touches the
// conversation after the view has gone away tears those down twice and React
// reports "Tried to unmount a fiber that is already unmounted".
import { ThreadPrimitive, MessagePrimitive, useAssistantRuntime, useMessagePartText } from '@assistant-ui/react';
import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import { ErrorBoundary } from '@mastra/playground-ui';
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MastraRuntimeProvider } from '../mastra-runtime-provider';
import { useThreadRuntimeState } from '@/lib/ai-ui/thread-runtime-state';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

const sse = (chunk: unknown) => `data: ${JSON.stringify(chunk)}\n\n`;

/** A stream the test holds open, exactly like a run that is still generating. */
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

const TextLeaf = () => {
  const part = useMessagePartText();
  return <p data-testid="message-text">{part.text}</p>;
};

const Message = () => (
  <MessagePrimitive.Root>
    <MessagePrimitive.Parts components={{ Text: TextLeaf }} />
  </MessagePrimitive.Root>
);

/** Stands in for the composer's Stop button, which is the only way to end a run. */
const StopButton = () => {
  const { isStreaming, cancelStream } = useThreadRuntimeState();
  return (
    <button type="button" data-testid="stop" data-streaming={isStreaming} onClick={() => void cancelStream()}>
      stop
    </button>
  );
};

const SendButton = () => {
  const runtime = useAssistantRuntime();
  return (
    <button
      type="button"
      data-testid="send"
      onClick={() => runtime.thread.append({ role: 'user', content: [{ type: 'text', text: 'run it' }] })}
    >
      send
    </button>
  );
};

// Production mounts subtrees on the running flag (the prefill indicator, the
// save-conversation action), so Stop unmounts them in the same batch as the
// conversation mutation it performs.
const ThreadView = () => (
  <ThreadPrimitive.Root>
    <ThreadPrimitive.Viewport autoScroll={false}>
      <ThreadPrimitive.Messages components={{ Message }} />
      <ThreadPrimitive.If running>
        <span data-testid="running-only">running</span>
      </ThreadPrimitive.If>
      <ThreadPrimitive.If running={false}>
        <span data-testid="idle-only">idle</span>
      </ThreadPrimitive.If>
    </ThreadPrimitive.Viewport>
    <SendButton />
    <StopButton />
  </ThreadPrimitive.Root>
);

const dbMessage = (id: string, role: 'user' | 'assistant', text: string): MastraDBMessage =>
  ({
    id,
    role,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    content: { format: 2, parts: [{ type: 'text', text }] },
  }) as MastraDBMessage;

const renderChat = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // The app mounts under StrictMode (src/main.tsx), which is where the
  // assistant-ui resource fibers get their mount/cleanup/mount treatment.
  const ui = (initialMessages: MastraDBMessage[]) => (
    <StrictMode>
      <MastraReactProvider baseUrl={BASE_URL}>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <MastraRuntimeProvider
              agentId="agent-1"
              threadId="thread-1"
              initialMessages={initialMessages}
              modelVersion="v2"
            >
              <ThreadView />
            </MastraRuntimeProvider>
          </ErrorBoundary>
        </QueryClientProvider>
      </MastraReactProvider>
    </StrictMode>
  );
  const view = render(ui([]));
  return { view, ui };
};

let stream: ReturnType<typeof openStream>;

beforeEach(() => {
  (window as { MASTRA_AGENT_SIGNALS?: string }).MASTRA_AGENT_SIGNALS = 'false';
  stream = openStream();
  server.use(
    http.get(`${BASE_URL}/api/memory/config`, () => HttpResponse.json({ config: {} })),
    http.get(`${BASE_URL}/api/agents/agent-1/voice/speakers`, () => HttpResponse.json([])),
    http.post(`${BASE_URL}/api/memory/threads`, () => HttpResponse.json({ id: 'thread-1', title: '' })),
    http.get(`${BASE_URL}/api/memory/threads/thread-1/messages`, () =>
      HttpResponse.json({ messages: [], uiMessages: [] }),
    ),
    http.post(
      `${BASE_URL}/api/agents/agent-1/stream`,
      () => new HttpResponse(stream.body, { headers: { 'Content-Type': 'text/event-stream' } }),
    ),
  );
});

afterEach(() => {
  cleanup();
  delete (window as { MASTRA_AGENT_SIGNALS?: string }).MASTRA_AGENT_SIGNALS;
});

describe('MastraRuntimeProvider stop control', () => {
  it('interrupting a streaming run leaves no unmounted-fiber crash behind', async () => {
    const errors: unknown[] = [];
    const consoleError = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    });
    const onWindowError = (event: ErrorEvent) => errors.push(String(event.error ?? event.message));
    window.addEventListener('error', onWindowError);

    try {
      const { view, ui } = renderChat();

      await act(async () => {
        await Promise.resolve();
      });

      // Start the run and let a first delta land so the thread view is holding
      // live message state when Stop arrives.
      const stop = await screen.findByTestId('stop');
      await act(async () => {
        (await screen.findByTestId('send')).click();
        await Promise.resolve();
      });

      await waitFor(() => expect(stop.getAttribute('data-streaming')).toBe('true'));

      await act(async () => {
        stream.push({ type: 'start', runId: 'run-1', from: 'AGENT', payload: { messageId: 'asst-1' } });
        stream.push({ type: 'text-start', runId: 'run-1', from: 'AGENT', payload: { id: 'txt-0' } });
        stream.push({ type: 'text-delta', runId: 'run-1', from: 'AGENT', payload: { id: 'txt-0', text: 'working' } });
      });

      // The run is genuinely live: the delta reached the view.
      await waitFor(() => {
        expect(screen.getAllByTestId('message-text').map(el => el.textContent)).toContain('working');
      });

      // Stop lands in the middle of the chunk flow, which is what "interrupt
      // the response" means: the reader is still delivering when the abort
      // tears the run down.
      await act(async () => {
        stream.push({ type: 'text-delta', runId: 'run-1', from: 'AGENT', payload: { id: 'txt-0', text: ' more' } });
        stop.click();
        stream.push({ type: 'text-delta', runId: 'run-1', from: 'AGENT', payload: { id: 'txt-0', text: ' later' } });
        stream.push({ type: 'abort', runId: 'run-1', from: 'AGENT', payload: {} });
        stream.close();
        await Promise.resolve();
      });

      // The abort releases the initial-messages guard, so the page refetches
      // and the server snapshot lands: the aborted reply was never persisted,
      // so the live assistant message is replaced by server-side ids.
      await act(async () => {
        view.rerender(ui([dbMessage('server-u1', 'user', 'run it')]));
        await Promise.resolve();
      });

      // The view is then torn down while the aborted request is still
      // settling; this is the sequence the crash report describes.
      await act(async () => {
        view.unmount();
        await Promise.resolve();
      });

      await waitFor(() => {
        const unmountCrashes = errors.filter(entry => String(entry).includes('already unmounted'));
        expect(unmountCrashes, `unmounted-fiber crash on stop: ${JSON.stringify(unmountCrashes)}`).toHaveLength(0);
      });
    } finally {
      window.removeEventListener('error', onWindowError);
      consoleError.mockRestore();
    }
  });
});
