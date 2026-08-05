import { useAuiState } from '@assistant-ui/react';
import { Badge, Button, Icon, StreamTailPreview, cn } from '@mastra/playground-ui';
import { CheckIcon, ChevronUpIcon, CopyIcon, TerminalSquare } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCopyToClipboard } from '../../hooks/use-copy-to-clipboard';
import { isArgsTextIncomplete } from '../streaming-args';
import type { ToolApprovalButtonsProps } from './tool-approval-buttons';
import { ToolApprovalButtons } from './tool-approval-buttons';
import { WORKSPACE_TOOLS } from '@/domains/workspace/constants';
import type { MessageMetadata } from '@/lib/ai-ui/messages/message-metadata';
import { useLinkComponent } from '@/lib/framework';

// Matches the shape returned by workspace.getInfo() — flat, not nested under "workspace"
interface WorkspaceMetadata {
  toolName?: string;
  id?: string;
  name?: string;
  status?: string;
  sandbox?: {
    id?: string;
    name?: string;
    provider?: string;
    status?: string;
  };
  filesystem?: {
    id?: string;
    name?: string;
    provider?: string;
    status?: string;
  };
}

// Get status dot color based on sandbox status
const getStatusColor = (status?: string) => {
  switch (status) {
    case 'running':
      return 'bg-green-500';
    case 'starting':
    case 'initializing':
      return 'bg-yellow-500';
    case 'stopped':
    case 'paused':
      return 'bg-gray-500';
    case 'error':
    case 'failed':
      return 'bg-red-500';
    default:
      return 'bg-accent6';
  }
};

export interface SandboxExecutionBadgeProps extends Omit<ToolApprovalButtonsProps, 'toolCalled'> {
  toolName: string;
  args: Record<string, unknown> | string;
  /** Raw argument JSON as streamed; unparseable while the command is still being written. */
  argsText?: string;
  result: any;
  metadata?: MessageMetadata;
  toolCalled?: boolean;
}

// Hook for live elapsed time while running
const useElapsedTime = (isRunning: boolean, startTime?: number) => {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      setElapsed(0);
      startRef.current = startTime || Date.now();
      const interval = setInterval(() => {
        if (startRef.current) {
          setElapsed(Date.now() - startRef.current);
        }
      }, 100);
      return () => clearInterval(interval);
    } else {
      startRef.current = null;
    }
  }, [isRunning, startTime]);

  return elapsed;
};

/** Command line plus copy button, rendered inside the preview's frame. */
const TerminalHeader = ({
  command,
  onCopy,
  isCopied,
}: {
  command?: string;
  onCopy?: () => void;
  isCopied?: boolean;
}) => (
  <>
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-neutral6 text-xs shrink-0">$</span>
      <code className="text-xs text-neutral-300 font-mono truncate">{command}</code>
    </div>
    {onCopy && (
      <Button variant="default" size="icon-sm" tooltip="Copy output" onClick={onCopy} className="shrink-0">
        <span className="grid">
          <span style={{ gridArea: '1/1' }} className={cn('transition-transform', isCopied ? 'scale-100' : 'scale-0')}>
            <CheckIcon size={14} />
          </span>
          <span style={{ gridArea: '1/1' }} className={cn('transition-transform', isCopied ? 'scale-0' : 'scale-100')}>
            <CopyIcon size={14} />
          </span>
        </span>
      </Button>
    )}
  </>
);

export const SandboxExecutionBadge = ({
  toolName,
  args,
  argsText,
  result,
  metadata,
  toolCallId,
  toolApprovalMetadata,
  isNetwork,
  toolCalled: toolCalledProp,
}: SandboxExecutionBadgeProps) => {
  // Get sandbox streaming data parts from the message
  const message = useAuiState(s => s.message);
  const dataParts = useMemo(() => {
    const content = message.content as ReadonlyArray<{ type: string; name?: string; data?: any }>;
    return content.filter(part => part.type === 'data');
  }, [message.content]);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const { Link } = useLinkComponent();

  // Command info emitted by get_process_output (so we can show the original command)
  const commandChunk = dataParts.find(
    chunk => chunk.name === 'sandbox-command' && chunk.data?.toolCallId === toolCallId,
  );

  // Parse args to get command info
  let commandDisplay = '';
  try {
    const parsedArgs = typeof args === 'object' ? args : JSON.parse(args);
    if (toolName === WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND) {
      commandDisplay = parsedArgs.command || '';
    } else if (
      toolName === WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT ||
      toolName === WORKSPACE_TOOLS.SANDBOX.KILL_PROCESS
    ) {
      // Prefer the original command from streaming data, fall back to PID
      const cmd = commandChunk?.data?.command as string | undefined;
      commandDisplay = cmd || `PID ${parsedArgs.pid}`;
    }
  } catch {
    commandDisplay = toolName;
  }

  // Sandbox stdout/stderr chunks scoped to this tool call
  const sandboxChunks = dataParts.filter(
    chunk =>
      (chunk.name === 'sandbox-stdout' || chunk.name === 'sandbox-stderr') && chunk.data?.toolCallId === toolCallId,
  );

  // Workspace metadata — the server re-emits it whenever the sandbox status
  // changes (cold starts spend minutes provisioning), so read the LATEST chunk.
  const workspaceMetaParts = dataParts.filter(
    chunk => chunk.name === 'workspace-metadata' && chunk.data?.toolCallId === toolCallId,
  );
  const workspaceMetaPart = workspaceMetaParts[workspaceMetaParts.length - 1];
  const execMeta = workspaceMetaPart?.data as WorkspaceMetadata | undefined;

  // Exit chunk scoped to this tool call
  const exitChunk = dataParts.find(chunk => chunk.name === 'sandbox-exit' && chunk.data?.toolCallId === toolCallId) as
    | { name: string; data: { exitCode: number; success: boolean; executionTimeMs?: number; killed?: boolean } }
    | undefined;

  // Streaming is complete if we have exit chunk or a final result
  const isStreamingComplete = !!exitChunk || typeof result === 'string';

  const hasStarted = !!workspaceMetaPart; // metadata is emitted at tool start
  const isRunning = hasStarted && !isStreamingComplete;
  const toolCalled = toolCalledProp ?? (isStreamingComplete || hasStarted);

  // Get exit info from data chunks
  const exitCode = exitChunk?.data?.exitCode;
  const exitSuccess = exitChunk?.data?.success;
  const executionTime = exitChunk?.data?.executionTimeMs;
  const wasKilled = exitChunk?.data?.killed;

  // The append-only chunk list fed to the tail preview. Kept as chunks rather
  // than joined into one string: a long build emits thousands of stdout parts,
  // and re-joining the whole transcript on every render is what makes the UI
  // stall exactly when the user most wants to watch it. The preview appends
  // only what is new and retains a bounded window.
  const streamingSource = useMemo(
    () => sandboxChunks.map(chunk => (chunk.data?.output as string | undefined) ?? ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sandboxChunks.length],
  );

  // During a live session, prefer the full streaming output the user watched build up.
  // After hydration from storage (no streaming chunks available), fall back to the
  // truncated tool result. With transient stdout/stderr chunks, streaming data won't
  // survive a page refresh, so the result is the only option on reload.
  const hasStreamingContent = streamingSource.length > 0;
  const resultText = typeof result === 'string' ? result : '';
  const hasOutput = hasStreamingContent || resultText.length > 0;

  // A model writing a heredoc spends seconds emitting the `command` argument
  // before anything executes. That growing script is the only thing to watch,
  // and it does not fit the single-line header, so it goes through the same
  // bounded preview the output will use — the region simply changes what it is
  // tailing once the command starts producing output.
  const isCommandStreaming = isArgsTextIncomplete(argsText) && !hasOutput;

  const previewSource: string | string[] = hasStreamingContent
    ? streamingSource
    : isCommandStreaming
      ? commandDisplay
      : resultText;

  const displayName =
    toolName === WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND
      ? 'Execute Command'
      : toolName === WORKSPACE_TOOLS.SANDBOX.GET_PROCESS_OUTPUT
        ? 'Get Process Output'
        : toolName === WORKSPACE_TOOLS.SANDBOX.KILL_PROCESS
          ? 'Kill Process'
          : toolName;

  // Get start time from first streaming chunk for live timer
  const firstChunkTime = sandboxChunks[0]?.data?.timestamp as number | undefined;
  const elapsedTime = useElapsedTime(isRunning, firstChunkTime);

  // Joining the whole transcript is O(total output), so it happens on click and
  // never during render. Copy yields the complete output the user saw stream by,
  // not the bounded window the preview retains.
  const onCopy = () => {
    if (!hasOutput || isCopied) return;
    copyToClipboard(hasStreamingContent ? streamingSource.join('') : resultText);
  };

  return (
    <div className="mb-4" data-testid="sandbox-execution-badge">
      {/* Header row */}
      <div className="flex items-center gap-2 justify-between">
        <button onClick={() => setIsCollapsed(s => !s)} className="flex items-center gap-2 min-w-0" type="button">
          <Icon>
            <ChevronUpIcon className={cn('transition-all', isCollapsed ? 'rotate-90' : 'rotate-180')} />
          </Icon>
          <Badge icon={<TerminalSquare className="text-accent6" size={16} />}>{displayName}</Badge>
          {execMeta?.sandbox && (
            <Link
              href={execMeta.id ? `/workspaces/${execMeta.id}` : '/workspaces'}
              className="flex items-center gap-1.5 text-xs text-neutral6 px-1.5 py-0.5 rounded bg-surface3 border border-border1 hover:bg-surface4 hover:border-border2 transition-colors"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', getStatusColor(execMeta.sandbox.status))} />
              <span>{execMeta.sandbox.name || execMeta.sandbox.provider}</span>
            </Link>
          )}
        </button>

        {/* Status area */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <>
              <span className="flex items-center gap-1.5 text-xs text-accent6">
                <span className="w-1.5 h-1.5 bg-accent6 rounded-full animate-pulse" />
                {/* Before the sandbox reaches 'running', the wait is provisioning, not execution. */}
                <span className="animate-pulse">
                  {execMeta?.sandbox?.status && execMeta.sandbox.status !== 'running'
                    ? `sandbox ${execMeta.sandbox.status}…`
                    : 'running'}
                </span>
              </span>
              <span className="text-neutral6 text-xs tabular-nums">{elapsedTime}ms</span>
            </>
          ) : (
            <>
              {exitCode !== undefined &&
                (exitSuccess ? (
                  <CheckIcon className="text-green-400" size={14} />
                ) : wasKilled ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/20 text-orange-400">
                    killed
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400">
                    exit {exitCode}
                  </span>
                ))}
              {executionTime !== undefined && <span className="text-neutral6 text-xs">{executionTime}ms</span>}
            </>
          )}
        </div>
      </div>

      {/* Content area */}
      {!isCollapsed && (
        <div className="pt-2">
          {(hasOutput || commandDisplay || isCommandStreaming) && (
            <StreamTailPreview
              source={previewSource}
              header={
                commandDisplay && !isCommandStreaming ? (
                  <TerminalHeader
                    command={commandDisplay}
                    onCopy={hasOutput ? onCopy : undefined}
                    isCopied={isCopied}
                  />
                ) : undefined
              }
              isStreaming={isRunning || isCommandStreaming}
              done={isStreamingComplete}
              emptyLabel={isCommandStreaming ? 'Writing command…' : isRunning ? 'Waiting for output…' : 'No output'}
              maxHeight="20rem"
              data-testid="sandbox-execution-output"
            />
          )}

          <ToolApprovalButtons
            toolCalled={toolCalled}
            toolCallId={toolCallId}
            toolApprovalMetadata={toolApprovalMetadata}
            toolName={toolName}
            isNetwork={isNetwork}
            isGenerateMode={metadata?.mode === 'generate'}
          />
        </div>
      )}
    </div>
  );
};
