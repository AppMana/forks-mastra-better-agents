// @vitest-environment jsdom
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useThreads } from '../use-memory';
import { codingThread, docsThread, threadsResponse } from './fixtures/threads';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';

const makeWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <MastraReactProvider baseUrl={BASE_URL}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MastraReactProvider>
  );
};

/**
 * A thread row is `{ id, resourceId, title, metadata }` — there is no agent
 * column. `resourceId` is whatever the server decides identifies the *owner*,
 * and a deployment that resolves it from the signed-in user (rather than
 * echoing back the agent id this hook sends) leaves nothing distinguishing one
 * agent's chats from another's. The sidebar then shows the same history under
 * every agent.
 *
 * `metadata.agentId` — stamped by the create route — is the only thing that can
 * narrow the list, so the request has to carry it.
 */
describe('useThreads', () => {
  afterEach(() => {
    cleanup();
  });

  it("asks for the agent's own threads, not every thread the resource owns", async () => {
    const onList = vi.fn<(url: URL) => void>();
    server.use(
      http.get(`${BASE_URL}/api/memory/threads`, ({ request }) => {
        const url = new URL(request.url);
        onList(url);
        const metadata = JSON.parse(url.searchParams.get('metadata') ?? '{}') as {
          agentId?: string;
        };
        // Stand-in for `metadata::jsonb @> $1` in the store.
        return HttpResponse.json(
          threadsResponse(
            [codingThread, docsThread].filter(
              thread => !metadata.agentId || thread.metadata?.agentId === metadata.agentId,
            ),
          ),
        );
      }),
    );

    const { result } = renderHook(
      () => useThreads({ agentId: 'coding', resourceId: 'coding', isMemoryEnabled: true }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toBeTruthy();
    });

    expect(result.current.data?.map(thread => thread.id)).toEqual(['thread-coding']);

    const url = onList.mock.calls[0]![0];
    expect(url.searchParams.get('agentId')).toBe('coding');
    expect(JSON.parse(url.searchParams.get('metadata')!)).toEqual({ agentId: 'coding' });
  });

  it('scopes each agent to its own chats', async () => {
    server.use(
      http.get(`${BASE_URL}/api/memory/threads`, ({ request }) => {
        const metadata = JSON.parse(new URL(request.url).searchParams.get('metadata') ?? '{}') as { agentId?: string };
        return HttpResponse.json(
          threadsResponse(
            [codingThread, docsThread].filter(
              thread => !metadata.agentId || thread.metadata?.agentId === metadata.agentId,
            ),
          ),
        );
      }),
    );

    const { result } = renderHook(
      () =>
        useThreads({
          agentId: 'document-analyst',
          resourceId: 'document-analyst',
          isMemoryEnabled: true,
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(result.current.data).toBeTruthy();
    });

    expect(result.current.data?.map(thread => thread.id)).toEqual(['thread-docs']);
  });
});
