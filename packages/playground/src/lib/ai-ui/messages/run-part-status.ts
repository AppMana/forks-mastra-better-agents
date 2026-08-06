/**
 * How a run's parts are doing: the status behind each icon's dot, and the one
 * line of text describing what the run is doing right now.
 *
 * Kept apart from the components so both readers of it — the icon row and the
 * run progress line above the composer — answer from the same evidence.
 *
 * The evidence, from `mastra_messages.content.parts` in thread
 * 1a299b82-6043-48b9-a298-df2898185450: a completed tool part persists as
 * `tool-invocation` with `toolInvocation.state = 'result'` and the tool's
 * return value under `result`, which the adapter maps onto `result` here. A
 * command that failed returns a string like any other, so a result present is
 * no statement about success. What does state how a command ended is the
 * `data-sandbox-exit` part `execute_command` emits beside it, keyed by
 * `toolCallId` and carrying `{ exitCode, success }`. Only the stdout/stderr
 * chunks are transient, so the exit part survives a reload and is the one
 * authoritative record.
 */

import { isFileContentTool } from '../tools/badges/file-content';
import { canonicalToolName, friendlyToolName } from '../tools/tool-names';
import { WORKSPACE_TOOLS, WORKSPACE_TOOLS_PREFIX } from '@/domains/workspace/constants';

/** The slice of an assistant message part this module and the icon row need. */
export interface RunPartLike {
  type: string;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown> | string;
  result?: unknown;
  isError?: boolean;
  text?: string;
  /** Data parts: the name after `data-`, and the payload. */
  name?: string;
  data?: unknown;
}

/**
 * `running` and `pending` are both "no result yet"; they differ only in whether
 * the stream is still attached to watch it finish. Neither is a failure.
 */
export type RunPartStatus = 'running' | 'pending' | 'succeeded' | 'failed';

export const SANDBOX_TOOLS: readonly string[] = [
  WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
  WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT,
  WORKSPACE_TOOLS.SANDBOX.KILL_PROCESS,
];

/** Whether a streamed tool name is one of the three that need a sandbox pod. */
export const isSandboxTool = (toolName: string | undefined): boolean =>
  SANDBOX_TOOLS.includes(canonicalToolName(toolName));

interface SandboxExit {
  exitCode?: number;
  success?: boolean;
  toolCallId?: string;
}

const sandboxExitFor = (parts: readonly RunPartLike[], toolCallId: string | undefined): SandboxExit | undefined => {
  if (!toolCallId) return undefined;
  const part = parts.find(
    candidate =>
      candidate.type === 'data' &&
      candidate.name === 'sandbox-exit' &&
      (candidate.data as SandboxExit | undefined)?.toolCallId === toolCallId,
  );
  return part?.data as SandboxExit | undefined;
};

/**
 * The dot behind one part.
 *
 * `parts` is the message's parts, not just the run's, so the exit record can be
 * found wherever it landed relative to its call. `isLastInRun` is about the
 * row, so it is passed rather than derived from `parts`.
 */
export function runPartStatus(
  part: RunPartLike,
  parts: readonly RunPartLike[],
  isStreamingTail: boolean,
  isLastInRun = false,
): RunPartStatus {
  if (part.type === 'tool-call') {
    if (part.isError) return 'failed';

    const exit = sandboxExitFor(parts, part.toolCallId);
    if (exit?.success !== undefined) return exit.success ? 'succeeded' : 'failed';
    if (typeof exit?.exitCode === 'number') return exit.exitCode === 0 ? 'succeeded' : 'failed';

    if (part.result !== undefined) return 'succeeded';
    // No result. While a command runs the message reads as complete — no text
    // part is streaming — so "not the streaming tail" says nothing about
    // whether the call failed. It is pending until something says otherwise.
    return isStreamingTail ? 'running' : 'pending';
  }
  // Reasoning has no result; it is live only as the streaming tail's last part.
  return isStreamingTail && isLastInRun ? 'running' : 'succeeded';
}

const truncate = (value: string, max = 80): string => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

/** The short form of a tool name, without the workspace prefix. */
export const shortToolName = (toolName: string | undefined): string =>
  (toolName ?? 'tool').replace(new RegExp(`^${WORKSPACE_TOOLS_PREFIX}_`), '');

/** A one-line summary of what a part is working on: the command, the path. */
export function runPartSummary(part: RunPartLike): string | undefined {
  if (part.type === 'reasoning') {
    const firstLine = part.text?.trim().split('\n')[0];
    return firstLine ? truncate(firstLine) : undefined;
  }

  const toolName = part.toolName ?? '';
  const args = typeof part.args === 'object' && part.args !== null ? part.args : {};

  if (isSandboxTool(toolName)) {
    const command = args.command;
    return typeof command === 'string' ? truncate(command) : undefined;
  }

  if (isFileContentTool(toolName) || canonicalToolName(toolName) === WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES) {
    const path = args.path ?? args.file_path;
    return typeof path === 'string' ? truncate(path) : undefined;
  }
  return undefined;
}

/** The tool call the run is waiting on right now, or undefined. */
function activeToolPart(parts: readonly RunPartLike[]): RunPartLike | undefined {
  const pending = parts.filter(part => part.type === 'tool-call' && runPartStatus(part, parts, true) === 'running');
  return pending[pending.length - 1];
}

/**
 * Whether the tool in flight needs a sandbox pod.
 *
 * Only these three do. `read_file`, `write_file`, `edit_file`, `list_files`,
 * `delete`, `file_stat`, `mkdir`, `grep`, `ast_edit` and `attach_file` all go
 * over WebDAV and never touch one, so a slow write is not a pod problem and
 * must never be reported as one — that sends the reader to look at the sandbox
 * when what actually happened is that the backend died.
 */
export function isWaitingOnSandbox(parts: readonly RunPartLike[]): boolean {
  const part = activeToolPart(parts);
  return Boolean(part && isSandboxTool(part.toolName));
}

/** The slice of the sandbox startup status this line needs. */
export interface SandboxStartupLike {
  /** Ready-to-render sentence for the current phase. */
  message: string;
  /** Position in the startup sequence; negative when the sandbox errored. */
  step: number;
  totalSteps: number;
  ready: boolean;
}

/**
 * The line for the run progress area while a tool is in flight, or null when
 * every call has settled.
 *
 * A run executing a command is not waiting for the model: the model has already
 * spoken and the sandbox is working. Saying "Waiting for the model" there names
 * the wrong actor, so name the tool and what it was given.
 *
 * And before the sandbox exists there is no command running either. A cold pod
 * is 16 to 17 seconds to Ready plus a dependency install, and sandboxes are per
 * conversation, so nearly every document chat sits in that window; naming the
 * startup step is the difference between a legitimate wait and an apparent
 * hang. `sandbox` is consulted ONLY for the tools that need a pod.
 */
export function activeToolLabel(parts: readonly RunPartLike[], sandbox?: SandboxStartupLike | null): string | null {
  const part = activeToolPart(parts);
  if (!part) return null;

  if (sandbox && !sandbox.ready && isSandboxTool(part.toolName)) {
    return sandbox.step >= 0 ? `${sandbox.message} step ${sandbox.step} of ${sandbox.totalSteps}` : sandbox.message;
  }

  const summary = runPartSummary(part);
  const verb = `${friendlyToolName(part.toolName)}…`;

  return summary ? `${verb} ${summary}` : verb;
}
