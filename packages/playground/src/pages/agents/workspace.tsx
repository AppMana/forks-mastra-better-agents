import { Txt } from '@mastra/playground-ui';

import { WorkspacePanel } from '@/domains/workspace/components/workspace-panel';
import { useWorkspaces } from '@/domains/workspace/hooks/use-workspace';

/**
 * The Workspace view of an agent conversation.
 *
 * Chat and Workspace are two windows onto one conversation: the messages, and
 * the files those messages produced. The panel is the same file browser the
 * Workspaces page uses, so there is one implementation of reading, writing and
 * sharing files rather than a second one that drifts.
 */
export default function AgentWorkspace() {
  // The panel shows nothing until it is told WHICH workspace to open, and this
  // route has no dropdown to pick one — that was the point. A signed-in user
  // has their own workspace, so open it rather than rendering an empty state
  // that reads as "you have no files" when the files are right there.
  const { data, isLoading } = useWorkspaces();
  const workspaces = data?.workspaces ?? [];
  // The user's OWN workspace, not simply the first in the list — the first is
  // the org-wide shared tree, which is full of caches and virtualenvs and is
  // nobody's idea of "my files". Per-user workspaces are id'd home-<sub> (local)
  // or coding-<sub> (sandboxed); fall back only if neither is present.
  const ownWorkspace = workspaces.find(w => w.id?.startsWith('home-') || w.id?.startsWith('coding-')) ?? workspaces[0];
  const workspaceId = ownWorkspace?.id;

  if (isLoading) {
    return null;
  }

  return (
    <div className="h-full overflow-hidden">
      <WorkspacePanel
        workspaceId={workspaceId}
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
