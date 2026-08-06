import { WORKSPACE_TOOLS } from '@mastra/core/workspace';

import { canonicalToolName } from '../tool-names';

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
  return FILE_TOOLS.has(canonicalToolName(toolName));
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
  const canonical = canonicalToolName(toolName);
  if (canonical === WORKSPACE_TOOLS.FILESYSTEM.READ_FILE) return isRunning ? 'Reading' : 'Read';
  if (canonical === WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE) return isRunning ? 'Editing' : 'Edited';
  return isRunning ? 'Writing' : 'Wrote';
}

/**
 * How much of a file the transcript is willing to render.
 *
 * A write is unbounded by nature — a generated dataset, a vendored bundle — and
 * the preview exists to show what is being written, not to be the file. Past
 * these caps the excess is dropped rather than accumulated: the highlighter
 * stops being handed a growing string, the DOM stops growing, and the
 * transcript stays the size of the conversation.
 */
export const FILE_PREVIEW_MAX_CHARS = 2000;
export const FILE_PREVIEW_MAX_LINES = 500;

export interface FilePreview {
  /** The text to render: the head of the file, within both caps. */
  text: string;
  truncated: boolean;
  /** Characters of the file that the preview is not showing. */
  omittedChars: number;
  /** Lines of the file that the preview is not showing. */
  omittedLines: number;
  /** Lines in the whole file, for the badge's line count. */
  totalLines: number;
}

const countLines = (text: string): number => (text === '' ? 0 : text.split('\n').length);

/**
 * The head of a file, capped by characters and by lines, with what was left out.
 *
 * The head, not the tail: a file is read from the top, and the top is what says
 * what the file is. (Command output is the opposite case and keeps its tail.)
 */
export function filePreviewFor(content: string): FilePreview {
  const totalLines = countLines(content);

  let text = content;
  if (text.length > FILE_PREVIEW_MAX_CHARS) text = text.slice(0, FILE_PREVIEW_MAX_CHARS);

  const lines = text.split('\n');
  if (lines.length > FILE_PREVIEW_MAX_LINES) text = lines.slice(0, FILE_PREVIEW_MAX_LINES).join('\n');

  return {
    text,
    truncated: text.length < content.length,
    omittedChars: content.length - text.length,
    omittedLines: totalLines - countLines(text),
    totalLines,
  };
}

/**
 * `edit_file` is the one file tool whose interesting content is a CHANGE, not a
 * file: it carries `old_string` and `new_string` and nothing else about the
 * file. Rendering only the replacement (what the write badge does) shows what
 * the file will say and hides what it said, which is the half the reader needs
 * to judge the edit.
 */
export function isFileDiffTool(toolName: string): boolean {
  return canonicalToolName(toolName) === WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE;
}

export type DiffLineKind = 'context' | 'removed' | 'added';

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
}

/** Lines the two sides share, at the head and the tail, shown as context. */
const DIFF_CONTEXT_LINES = 3;

/**
 * The edit as a unified diff.
 *
 * `old_string` and `new_string` usually share their first and last lines — the
 * model is told to include surrounding context so the match is unique — so
 * those shared lines are shown ONCE, as context, instead of as a removal
 * immediately followed by an identical addition. What is left is the change.
 *
 * Only the ends are matched, not the middle: a real line-by-line diff of two
 * snippets buys very little here (the snippets are small and the change is
 * usually contiguous) and it is a lot of machinery to have wrong.
 */
export function fileDiffFor(args: FileToolArgs | undefined): DiffLine[] {
  const removedText = typeof args?.old_string === 'string' ? args.old_string : '';
  const addedText = typeof args?.new_string === 'string' ? args.new_string : '';
  if (removedText === '' && addedText === '') return [];

  const removed = removedText === '' ? [] : removedText.split('\n');
  const added = addedText === '' ? [] : addedText.split('\n');

  let head = 0;
  while (head < removed.length && head < added.length && removed[head] === added[head]) head += 1;

  let tail = 0;
  while (
    tail < removed.length - head &&
    tail < added.length - head &&
    removed[removed.length - 1 - tail] === added[added.length - 1 - tail]
  ) {
    tail += 1;
  }

  const lines: DiffLine[] = [];
  for (const text of removed.slice(Math.max(0, head - DIFF_CONTEXT_LINES), head)) {
    lines.push({ kind: 'context', text });
  }
  for (const text of removed.slice(head, removed.length - tail)) lines.push({ kind: 'removed', text });
  for (const text of added.slice(head, added.length - tail)) lines.push({ kind: 'added', text });
  for (const text of removed.slice(removed.length - tail, removed.length - tail + DIFF_CONTEXT_LINES)) {
    lines.push({ kind: 'context', text });
  }
  return lines;
}

export interface DiffPreview {
  lines: DiffLine[];
  truncated: boolean;
  omittedChars: number;
  omittedLines: number;
  added: number;
  removed: number;
}

/**
 * The head of a diff, under the SAME caps a written file's preview uses: an
 * edit can be as unbounded as a write (a whole vendored file replaced in one
 * call), and the two must not disagree about how much of a change the
 * transcript is willing to hold.
 */
export function fileDiffPreviewFor(lines: DiffLine[]): DiffPreview {
  const kept: DiffLine[] = [];
  let chars = 0;
  for (const line of lines) {
    if (kept.length >= FILE_PREVIEW_MAX_LINES || chars + line.text.length > FILE_PREVIEW_MAX_CHARS) break;
    kept.push(line);
    chars += line.text.length + 1;
  }

  const total = lines.reduce((sum, line) => sum + line.text.length + 1, 0);
  return {
    lines: kept,
    truncated: kept.length < lines.length,
    omittedLines: lines.length - kept.length,
    omittedChars: total - chars,
    added: lines.filter(line => line.kind === 'added').length,
    removed: lines.filter(line => line.kind === 'removed').length,
  };
}

/**
 * The Shiki language for a path, or undefined when the highlighter has no
 * grammar for it — in which case the block renders as plain text rather than
 * pulling in a grammar the bundle does not carry.
 */
const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  json: 'json',
  jsonc: 'json',
  md: 'markdown',
  markdown: 'markdown',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  py: 'python',
  pyi: 'python',
  yml: 'yaml',
  yaml: 'yaml',
};

export function fileLanguageFor(path: string): string | undefined {
  const base = path.split('/').pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return undefined;
  return LANGUAGE_BY_EXTENSION[base.slice(dot + 1).toLowerCase()];
}
