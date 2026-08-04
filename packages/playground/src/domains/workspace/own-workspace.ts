import type { WorkspaceItem } from './types';

/**
 * The one workspace a signed-in person has: their own filesystem.
 *
 * That tree holds `workspaces/<conversation>` (one directory per chat), the
 * single `uploads/` every conversation and agent shares, and `shared/<group>`.
 * It is not something to pick from a menu.
 *
 * The API still returns a LIST, because Mastra registers a `Workspace` object
 * per agent plus a global one — the word is overloaded. The global entry is the
 * org-wide sandbox image's home directory (`.cache`, `.venv`, `test_data`), and
 * showing it to someone who asked for their files is the bug this exists to
 * prevent. Prefer an agent-sourced entry, which is resolved per user.
 *
 * Deliberately NOT matched on id prefixes: `home-…` and `coding-…` are server
 * implementation details, and a second copy of that rule in the UI is exactly
 * the kind of duplicate that drifts.
 */
export function ownWorkspace(workspaces: WorkspaceItem[]): WorkspaceItem | undefined {
  return workspaces.find(workspace => workspace.source === 'agent') ?? workspaces[0];
}
