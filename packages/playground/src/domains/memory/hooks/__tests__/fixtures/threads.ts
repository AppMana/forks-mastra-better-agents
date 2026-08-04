import type { ListMemoryThreadsResponse } from '@mastra/client-js';

/**
 * Two chats owned by the same resource, one per agent — the shape a server that
 * resolves `resourceId` from the signed-in user returns for either agent when
 * nothing narrows the list to one of them.
 */
export const codingThread: ListMemoryThreadsResponse['threads'][number] = {
  id: 'thread-coding',
  resourceId: 'user-1',
  title: 'a coding chat',
  metadata: { agentId: 'coding' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const docsThread: ListMemoryThreadsResponse['threads'][number] = {
  id: 'thread-docs',
  resourceId: 'user-1',
  title: 'a document chat',
  metadata: { agentId: 'document-analyst' },
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

export function threadsResponse(threads: ListMemoryThreadsResponse['threads']): ListMemoryThreadsResponse {
  return {
    threads,
    total: threads.length,
    page: 0,
    perPage: 100,
    hasMore: false,
  };
}
