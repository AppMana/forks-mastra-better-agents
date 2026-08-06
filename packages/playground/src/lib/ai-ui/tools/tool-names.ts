/**
 * Tool names as the transcript sees them, and as a person should read them.
 *
 * Two separate problems, one table.
 *
 * 1. A deployment may expose a workspace tool under its own name
 *    (`tools: { [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: { name: 'execute_command' } }`),
 *    and core then registers the tool — and streams the call — under that name.
 *    Every renderer that recognised a tool by comparing against
 *    `mastra_workspace_*` therefore stopped recognising it. `canonicalToolName`
 *    maps whatever arrived back onto the constant so the routing holds.
 *
 * 2. `execute_command` is an operation id, not a title. The transcript is read
 *    by people watching the agent work, so the badge says what is happening.
 */

import { WORKSPACE_TOOLS, WORKSPACE_TOOLS_PREFIX } from '@/domains/workspace/constants';

const CANONICAL_TOOLS: readonly string[] = [
  ...Object.values(WORKSPACE_TOOLS.FILESYSTEM),
  ...Object.values(WORKSPACE_TOOLS.SANDBOX),
  ...Object.values(WORKSPACE_TOOLS.SEARCH),
  ...Object.values(WORKSPACE_TOOLS.LSP),
];

const CANONICAL_SET = new Set<string>(CANONICAL_TOOLS);

const BARE_TO_CANONICAL = new Map<string, string>(
  CANONICAL_TOOLS.map(name => [name.slice(WORKSPACE_TOOLS_PREFIX.length + 1), name]),
);

/** Exposed names that are not simply the constant with its prefix dropped. */
const RENAMED_TO_CANONICAL: Record<string, string> = {
  grep_files: WORKSPACE_TOOLS.FILESYSTEM.GREP,
};

/**
 * The `mastra_workspace_*` constant a streamed tool name refers to, or the name
 * unchanged when it is not a workspace tool.
 */
export function canonicalToolName(toolName: string | undefined): string {
  if (!toolName) return '';
  if (CANONICAL_SET.has(toolName)) return toolName;
  return BARE_TO_CANONICAL.get(toolName) ?? RENAMED_TO_CANONICAL[toolName] ?? toolName;
}

const FRIENDLY_TITLES: Record<string, string> = {
  [WORKSPACE_TOOLS.FILESYSTEM.READ_FILE]: 'Reading a file',
  [WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE]: 'Writing a file',
  [WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE]: 'Editing a file',
  [WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES]: 'Listing files',
  [WORKSPACE_TOOLS.FILESYSTEM.DELETE]: 'Deleting a file',
  [WORKSPACE_TOOLS.FILESYSTEM.FILE_STAT]: 'Checking a file',
  [WORKSPACE_TOOLS.FILESYSTEM.MKDIR]: 'Creating a folder',
  [WORKSPACE_TOOLS.FILESYSTEM.GREP]: 'Searching files',
  [WORKSPACE_TOOLS.FILESYSTEM.AST_EDIT]: 'Editing code',
  [WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND]: 'Running a command',
  [WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT]: 'Checking command output',
  [WORKSPACE_TOOLS.SANDBOX.KILL_PROCESS]: 'Stopping a command',
  [WORKSPACE_TOOLS.SEARCH.SEARCH]: 'Searching the workspace',
  [WORKSPACE_TOOLS.SEARCH.INDEX]: 'Indexing the workspace',
  [WORKSPACE_TOOLS.LSP.LSP_INSPECT]: 'Inspecting code',
};

/**
 * The title for a tool call in the transcript.
 *
 * Workspace tools get a written title. Anything else keeps its own id, except
 * that a snake_case id reads as a sentence rather than a symbol — the id is
 * still recoverable from it, so nothing is hidden.
 */
export function friendlyToolName(toolName: string | undefined): string {
  if (!toolName) return 'tool';
  const canonical = canonicalToolName(toolName);
  const title = FRIENDLY_TITLES[canonical];
  if (title) return title;
  if (!toolName.includes('_')) return toolName;
  const words = toolName.split('_').filter(Boolean).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
