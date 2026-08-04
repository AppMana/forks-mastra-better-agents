import { ToolsIcon } from '@mastra/playground-ui';
import { ToolResultView } from '../tool-result-view';
import { BackgroundTaskMetadataDialogTrigger } from './background-task-metadata-dialog';
import { BadgeWrapper } from './badge-wrapper';
import { NetworkChoiceMetadataDialogTrigger } from './network-choice-metadata-dialog';
import type { ToolApprovalButtonsProps } from './tool-approval-buttons';
import { ToolApprovalButtons } from './tool-approval-buttons';
import type { MessageMetadata } from '@/lib/ai-ui/messages/message-metadata';

export interface ToolBadgeProps extends Omit<ToolApprovalButtonsProps, 'toolCalled'> {
  toolName: string;
  args: Record<string, unknown> | string;
  result: any;
  metadata?: MessageMetadata;
  toolOutput: Array<{ toolId: string }>;
  suspendPayload?: any;
  toolCalled?: boolean;
  withoutArgs?: boolean;
}

export const ToolBadge = ({
  toolName,
  args,
  result,
  metadata,
  toolOutput,
  toolCallId,
  toolApprovalMetadata,
  suspendPayload,
  isNetwork,
  toolCalled: toolCalledProp,
  withoutArgs,
}: ToolBadgeProps) => {
  // Every payload below is rendered through ToolResultView, which caps both the
  // number of lines and the height of the block. Tool output is attacker-shaped
  // in practice — a command that prints a megabyte is ordinary — so the
  // transcript must stay the size of the conversation, not the size of the
  // output.
  let argSlot = null;

  try {
    const { __mastraMetadata: _, _background, ...formattedArgs } = typeof args === 'object' ? args : JSON.parse(args);
    argSlot = <ToolResultView value={formattedArgs} data-testid="tool-args" />;
  } catch {
    argSlot = <ToolResultView value={args as string} data-testid="tool-args" />;
  }

  const resultSlot = <ToolResultView value={result} data-testid="tool-result" />;

  const suspendPayloadSlot = <ToolResultView value={suspendPayload} data-testid="tool-suspend-payload" />;

  const routingDecision = metadata?.mode === 'network' ? metadata.routingDecision : undefined;
  const selectionReason =
    metadata?.mode === 'network' ? (routingDecision?.selectionReason ?? metadata.selectionReason) : undefined;
  const agentNetworkInput = metadata?.mode === 'network' ? (routingDecision ?? metadata.agentInput) : undefined;

  const toolCalled = toolCalledProp ?? (result || toolOutput.length > 0);

  const bgEntry =
    (metadata?.mode === 'stream' || metadata?.mode === 'generate') && metadata?.backgroundTasks
      ? metadata.backgroundTasks[toolCallId]
      : undefined;

  return (
    <BadgeWrapper
      data-testid="tool-badge"
      icon={<ToolsIcon className="text-accent6" />}
      title={toolName}
      extraInfo={
        metadata?.mode === 'network' ? (
          <NetworkChoiceMetadataDialogTrigger
            selectionReason={selectionReason || ''}
            input={agentNetworkInput as string | Record<string, unknown> | undefined}
          />
        ) : bgEntry?.taskId && bgEntry?.startedAt ? (
          <BackgroundTaskMetadataDialogTrigger backgroundTask={bgEntry} />
        ) : null
      }
      initialCollapsed={!!!(toolApprovalMetadata ?? suspendPayload)}
    >
      <div className="space-y-4">
        {withoutArgs ? null : (
          <div>
            <p className="font-medium pb-2">Tool arguments</p>
            {argSlot}
          </div>
        )}

        {suspendPayload && (
          <div>
            <p className="font-medium pb-2">Tool suspend payload</p>
            {suspendPayloadSlot}
          </div>
        )}

        {result && (
          <div>
            <p className="font-medium pb-2">Tool result</p>
            {resultSlot}
          </div>
        )}

        {toolOutput.length > 0 && (
          <div>
            <p className="font-medium pb-2">Tool output</p>

            <ToolResultView value={toolOutput} maxHeight="10rem" data-testid="tool-output" />
          </div>
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
    </BadgeWrapper>
  );
};
