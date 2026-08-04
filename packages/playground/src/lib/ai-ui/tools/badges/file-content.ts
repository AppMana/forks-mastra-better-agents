import { WORKSPACE_TOOLS } from '@mastra/core/workspace';

/**
 * Which tools are "here is a file" rather than "here is a JSON result", and how
 * to pull the file out of a call. Kept apart from the component so the badge
 * file only exports a component and stays fast-refreshable.
 */

const FILE_TOOLS = new Set<string>([
  WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE,
  WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE,
  WORKSPACE_TOOLS.FILESYSTEM.READ_FILE,
]);

export function isFileContentTool(toolName: string): boolean {
  return FILE_TOOLS.has(toolName);
}

export type FileToolArgs = {
  path?: string;
  file_path?: string;
  content?: string;
  old_string?: string;
  new_string?: string;
};
export type FileToolResult = { content?: string; text?: string; bytesWritten?: number; path?: string };

/**
 * What to show, in order of preference: the content the model is writing, which
 * exists as soon as the arguments start arriving — so the preview fills while
 * the call is still in flight — then whatever the result carried back.
 */
export function fileContentFor(args: FileToolArgs | undefined, result: FileToolResult | undefined): string {
  if (typeof args?.content === 'string' && args.content.length > 0) return args.content;
  if (typeof args?.new_string === 'string' && args.new_string.length > 0) return args.new_string;
  if (typeof result?.content === 'string') return result.content;
  if (typeof result?.text === 'string') return result.text;
  return '';
}

export function filePathFor(args: FileToolArgs | undefined, result: FileToolResult | undefined): string {
  return args?.path ?? args?.file_path ?? result?.path ?? '';
}

/** Past tense once it has landed, present while it is happening. */
export function fileVerbFor(toolName: string, isRunning: boolean): string {
  if (toolName === WORKSPACE_TOOLS.FILESYSTEM.READ_FILE) return isRunning ? 'Reading' : 'Read';
  if (toolName === WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE) return isRunning ? 'Editing' : 'Edited';
  return isRunning ? 'Writing' : 'Wrote';
}
