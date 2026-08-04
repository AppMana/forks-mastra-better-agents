import { Txt } from '@mastra/playground-ui';

import { WorkspacePanel } from '@/domains/workspace/components/workspace-panel';

/**
 * The Workspace view of an agent conversation.
 *
 * Chat and Workspace are two windows onto one conversation: the messages, and
 * the files those messages produced. The panel is the same file browser the
 * Workspaces page uses, so there is one implementation of reading, writing and
 * sharing files rather than a second one that drifts.
 */
export default function AgentWorkspace() {
  return (
    <div className="h-full overflow-hidden">
      <WorkspacePanel
        showSkills={false}
        emptyState={
          <Txt variant="ui-sm" className="text-icon3">
            This conversation has no files yet. Files the agent writes, and files you upload, appear here.
          </Txt>
        }
      />
    </div>
  );
}
