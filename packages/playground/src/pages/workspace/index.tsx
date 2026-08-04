import { Spinner } from '@mastra/playground-ui';
import { useParams } from 'react-router';

import { WorkspacePanel } from '@/domains/workspace/components/workspace-panel';
import { useWorkspaces } from '@/domains/workspace/hooks/use-workspace';
import { ownWorkspace } from '@/domains/workspace/own-workspace';

/**
 * The Workspaces page: the signed-in person's own filesystem.
 *
 * Deliberately a THIN wrapper around `WorkspacePanel`. The panel was extracted
 * from this page precisely so the agent conversation's Workspace tab would
 * render the same surface — but the page kept its own copy, ~800 lines of the
 * same hooks, handlers and dialogs, so every fix had to be made twice and the
 * two surfaces drifted in between. Resolving WHICH workspace to show is the
 * only thing this page adds.
 *
 * The `:workspaceId` route param still wins when present (deep links and the
 * skill detail page rely on it); otherwise there is exactly one workspace to
 * show, and `ownWorkspace` owns that rule rather than a second copy of it.
 */
export default function Workspace() {
  const { workspaceId: workspaceIdFromPath } = useParams<{ workspaceId?: string }>();
  const { data, isLoading } = useWorkspaces();

  // The panel handles every state of the workspace it is given; what it cannot
  // do is guess which one. Wait for the list rather than flashing an empty
  // state at someone whose files are about to appear — and wait VISIBLY: the
  // page is the whole surface here, so rendering nothing reads as a broken
  // page rather than as loading.
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const workspaceId = workspaceIdFromPath ?? ownWorkspace(data?.workspaces ?? [])?.id;

  return <WorkspacePanel workspaceId={workspaceId} showSkills />;
}
