import { useAuiState } from '@assistant-ui/react';
import { AgentIcon, Button, ToolCoinIcon, ToolsIcon, WorkflowIcon, cn } from '@mastra/playground-ui';
import { BrainIcon, FileDown, FilePen, FileText, FolderTree, TerminalSquare } from 'lucide-react';
import type { PropsWithChildren, ReactNode } from 'react';
import { Children, useEffect, useState } from 'react';

import { getCodeModeCall } from '../tools/badges/code-mode-badge';
import { isFileContentTool } from '../tools/badges/file-content';
import { isHiddenRunPart } from './part-runs';
import { WORKSPACE_TOOLS, WORKSPACE_TOOLS_PREFIX } from '@/domains/workspace/constants';

/**
 * Compact icon row for a run of tool calls and reasoning parts.
 *
 * Instead of stacking one collapsible box per part, a run renders as a single
 * row of small icons — one per part, reusing each badge's icon — with at most
 * one entry expanded below the row. Clicking an icon expands that entry;
 * clicking it again (or another icon) collapses or switches. While the message
 * is streaming, the newest entry of the tail run is expanded by default so live
 * output (terminal tails, file previews, reasoning) stays visible; once the
 * run is over everything collapses.
 *
 * The existing badge renderers are untouched: every part's panel is the exact
 * component that used to render inline (ToolFallback routing, Reasoning). The
 * panels stay mounted — only hidden — so badge side effects (browser tool
 * registration, skill activation, workflow streams) keep running while
 * collapsed.
 */

/** The slice of an assistant message part the icon row needs. */
export interface RunPartLike {
  type: string;
  toolName?: string;
  args?: Record<string, unknown> | string;
  result?: unknown;
  isError?: boolean;
  text?: string;
}

type RunPartIndicator = 'running' | 'succeeded' | 'failed';

const INDICATOR_CLASS: Record<RunPartIndicator, string> = {
  running: 'bg-amber-400 animate-pulse',
  succeeded: 'bg-green-500',
  failed: 'bg-red-500',
};

const SANDBOX_TOOLS: readonly string[] = [
  WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
  WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT,
  WORKSPACE_TOOLS.SANDBOX.KILL_PROCESS,
];

/** Reuses the icon each badge renders: same glyph collapsed as expanded. */
function runPartIcon(part: RunPartLike): ReactNode {
  if (part.type === 'reasoning') return <BrainIcon />;

  const toolName = part.toolName ?? '';
  if (toolName.startsWith('agent-')) return <AgentIcon className="text-accent1" />;
  if (toolName.startsWith('workflow-')) return <WorkflowIcon className="text-accent3" />;
  if (toolName === WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES) return <FolderTree />;
  if (toolName === WORKSPACE_TOOLS.FILESYSTEM.READ_FILE) return <FileDown />;
  if (toolName === WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE) return <FilePen />;
  if (isFileContentTool(toolName)) return <FileText />;
  if (SANDBOX_TOOLS.includes(toolName)) return <TerminalSquare className="text-accent6" />;
  if (part.args !== undefined && getCodeModeCall(part.args, part.result)) {
    return <ToolCoinIcon className="text-accent6" />;
  }
  return <ToolsIcon className="text-accent6" />;
}

const truncate = (value: string, max = 80): string => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

function runPartSummary(part: RunPartLike): string | undefined {
  if (part.type === 'reasoning') {
    const firstLine = part.text?.trim().split('\n')[0];
    return firstLine ? truncate(firstLine) : undefined;
  }

  const toolName = part.toolName ?? '';
  const args = typeof part.args === 'object' && part.args !== null ? part.args : {};

  if (SANDBOX_TOOLS.includes(toolName)) {
    const command = args.command;
    return typeof command === 'string' ? truncate(command) : undefined;
  }
  if (isFileContentTool(toolName) || toolName === WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES) {
    const path = args.path ?? args.file_path;
    return typeof path === 'string' ? truncate(path) : undefined;
  }
  return undefined;
}

/** Tooltip text: the tool (or "Reasoning") plus a short summary when there is one. */
function runPartLabel(part: RunPartLike): string {
  const name =
    part.type === 'reasoning'
      ? 'Reasoning'
      : (part.toolName ?? 'tool').replace(new RegExp(`^${WORKSPACE_TOOLS_PREFIX}_`), '');
  const summary = runPartSummary(part);
  return summary ? `${name} · ${summary}` : name;
}

function runPartIndicator(part: RunPartLike, index: number, parts: readonly RunPartLike[], isStreamingTail: boolean) {
  if (part.type === 'tool-call') {
    if (part.isError) return 'failed';
    if (part.result !== undefined) return 'succeeded';
    // No result: still executing while the run streams; if the run ended
    // without one, the call never completed.
    return isStreamingTail ? 'running' : 'failed';
  }
  // Reasoning has no result; it is live only as the streaming tail's last part.
  return isStreamingTail && index === parts.length - 1 ? 'running' : 'succeeded';
}

export interface ToolIconRowViewProps {
  /** Parts of this run, aligned index-for-index with `children`. */
  parts: readonly RunPartLike[];
  /** True while the message is still streaming and this run is its tail. */
  isStreamingTail: boolean;
  /** The rendered part components (the existing badges), one per part. */
  children?: ReactNode;
}

export const ToolIconRowView = ({ parts, isStreamingTail, children }: ToolIconRowViewProps) => {
  // `{ index: null }` means "user collapsed everything"; `null` means "no user
  // choice yet — follow the streaming default".
  const [choice, setChoice] = useState<{ index: number | null } | null>(null);

  // Once the run is over, collapse all: drop any manual selection along with
  // the streaming default.
  useEffect(() => {
    if (!isStreamingTail) setChoice(null);
  }, [isStreamingTail]);

  const defaultIndex = isStreamingTail && parts.length > 0 ? parts.length - 1 : null;
  const expanded = choice ? choice.index : defaultIndex;

  const panels = Children.toArray(children);

  if (parts.every(isHiddenRunPart)) return <>{children}</>;

  const toggle = (index: number) => setChoice({ index: expanded === index ? null : index });

  return (
    <div className="mb-4" data-testid="part-run">
      <div className="flex flex-wrap items-center gap-1">
        {parts.map((part, index) => {
          if (isHiddenRunPart(part)) return null;
          const indicator = runPartIndicator(part, index, parts, isStreamingTail);
          return (
            <Button
              key={index}
              size="icon-sm"
              variant={expanded === index ? 'default' : 'ghost'}
              tooltip={runPartLabel(part)}
              aria-expanded={expanded === index}
              data-testid={`part-run-icon-${index}`}
              data-status={indicator}
              className="relative"
              onClick={() => toggle(index)}
            >
              {runPartIcon(part)}
              <span
                className={cn('absolute bottom-0.5 right-0.5 size-1.5 rounded-full', INDICATOR_CLASS[indicator])}
                aria-hidden
              />
            </Button>
          );
        })}
      </div>
      {panels.map((panel, index) => (
        <div
          key={index}
          hidden={expanded !== index}
          className={cn(expanded === index && 'pt-2')}
          data-testid={`part-run-panel-${index}`}
        >
          {panel}
        </div>
      ))}
    </div>
  );
};

export type PartRunGroupProps = PropsWithChildren<{ groupKey: string | undefined; indices: number[] }>;

/**
 * `Group` component for `MessagePrimitive.Unstable_PartsGrouped`: runs (keyed
 * groups from groupPartsIntoRuns) render as the icon row; ungrouped parts —
 * text and data breakers — render exactly as before.
 */
export const PartRunGroup = ({ groupKey, indices, children }: PartRunGroupProps) => {
  if (!groupKey) return <>{children}</>;
  return <PartRunGroupImpl indices={indices}>{children}</PartRunGroupImpl>;
};

const PartRunGroupImpl = ({ indices, children }: PropsWithChildren<{ indices: number[] }>) => {
  const message = useAuiState(s => s.message);
  const parts = message.content as unknown as readonly RunPartLike[];
  const statusType = (message as { status?: { type?: string } }).status?.type;

  const runParts = indices.map(i => parts[i]).filter((p): p is RunPartLike => p !== undefined);
  // `requires-action` (pending tool approval) counts as live: the run is not
  // over and pending calls must not show as failed.
  const isMessageActive = statusType === 'running' || statusType === 'requires-action';
  const isStreamingTail = isMessageActive && indices[indices.length - 1] === parts.length - 1;

  return (
    <ToolIconRowView parts={runParts} isStreamingTail={isStreamingTail}>
      {children}
    </ToolIconRowView>
  );
};
