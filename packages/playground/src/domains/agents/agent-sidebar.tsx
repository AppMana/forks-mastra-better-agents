import type { StorageThreadType } from '@mastra/core/memory';
import { ChatThreads } from '@/domains/agents/components/chat-threads';
import { useDeleteThread, useUpdateThread } from '@/domains/memory/hooks/use-memory';
import { useLinkComponent } from '@/lib/framework';

export function AgentSidebar({
  agentId,
  threadId,
  threads,
  isLoading,
  unreadThreadIds,
}: {
  agentId: string;
  threadId: string;
  threads?: StorageThreadType[];
  isLoading: boolean;
  unreadThreadIds?: Set<string>;
}) {
  const { mutateAsync: deleteThread } = useDeleteThread();
  const { mutateAsync: updateThread } = useUpdateThread();
  const { paths, navigate } = useLinkComponent();

  const handleDelete = async (deleteId: string) => {
    await deleteThread({ threadId: deleteId!, agentId });
    if (deleteId === threadId) {
      navigate(paths.agentNewThreadLink(agentId));
    }
  };

  const handleRename = async (renameId: string, title: string) => {
    await updateThread({ threadId: renameId, agentId, title });
  };

  return (
    <ChatThreads
      resourceId={agentId}
      resourceType={'agent'}
      threads={threads || []}
      isLoading={isLoading}
      threadId={threadId}
      onDelete={handleDelete}
      onRename={handleRename}
      unreadThreadIds={unreadThreadIds}
    />
  );
}
