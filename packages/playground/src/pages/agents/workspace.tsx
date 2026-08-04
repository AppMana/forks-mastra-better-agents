import { Txt } from '@mastra/playground-ui';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { WorkspacePanel } from '@/domains/workspace/components/workspace-panel';
import { useWorkspaces } from '@/domains/workspace/hooks/use-workspace';
import { ownWorkspace } from '@/domains/workspace/own-workspace';

/**
 * The Workspace view of an agent conversation: the user's ONE filesystem,
 * opened at this conversation's own directory.
 *
 * The roots of that filesystem are fixed — `workspaces/<conversation>`,
 * the single `uploads/` every conversation shares, and `shared/<group>` — so
 * standing in the conversation, `./uploads` and `./shared` are right there as
 * links back to the tops. The server resolves which directory belongs to this
 * thread (its name carries a discriminator derived from the thread id, so it
 * survives retitles); the client never derives directory names from a rule.
 */
export default function AgentWorkspace() {
  const { threadId } = useParams<{ threadId?: string }>();
  const { data, isLoading } = useWorkspaces();
  const workspace = ownWorkspace(data?.workspaces ?? []);

  const [conversationPath, setConversationPath] = useState<string | undefined>(undefined);
  const [resolving, setResolving] = useState(Boolean(threadId));

  useEffect(() => {
    if (!threadId) {
      setResolving(false);
      return;
    }
    let cancelled = false;
    setResolving(true);
    fetch(`/app/workspace/conversation?threadId=${encodeURIComponent(threadId)}`, { credentials: 'include' })
      .then(response => (response.ok ? response.json() : undefined))
      .then((body: { path?: string } | undefined) => {
        if (!cancelled) setConversationPath(body?.path);
      })
      .catch(() => {
        // Fall back to the root of the user's files rather than an error: the
        // tab is still useful, just not pre-navigated.
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  if (isLoading || resolving) {
    return null;
  }

  return (
    <div className="h-full overflow-hidden">
      <WorkspacePanel
        workspaceId={workspace?.id}
        initialPath={conversationPath}
        showSkills={false}
        emptyState={
          <Txt variant="ui-sm" className="text-icon3">
            No files yet. Files you upload, and files the agent writes, appear here.
          </Txt>
        }
      />
    </div>
  );
}
