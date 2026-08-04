import { WORKSPACE_TOOLS } from '@mastra/core/workspace';
import { StreamTailPreview } from '@mastra/playground-ui';
import { FileText, FilePen, FileDown } from 'lucide-react';

import { BadgeWrapper } from './badge-wrapper';
import { fileContentFor, filePathFor, fileVerbFor } from './file-content';
import type { FileToolArgs, FileToolResult } from './file-content';
import { ToolApprovalButtons } from './tool-approval-buttons';

/**
 * File tools, showing the file instead of a JSON tool call.
 *
 * A write used to render as a pulsing dot and then a blob of JSON, which tells
 * the user nothing while it happens and nothing useful afterwards. The content
 * is the interesting part, so stream it into the same bounded, scrolling
 * preview the terminal output uses — one reading experience for "a lot of text
 * is arriving", whether it came from a command or a file.
 */

function iconFor(toolName: string) {
  if (toolName === WORKSPACE_TOOLS.FILESYSTEM.READ_FILE) return <FileDown />;
  if (toolName === WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE) return <FilePen />;
  return <FileText />;
}

export interface FileContentBadgeProps {
  toolName: string;
  args?: FileToolArgs;
  result?: FileToolResult;
  metadata?: { mode?: string };
  toolCallId: string;
  toolApprovalMetadata?: {
    toolCallId: string;
    toolName: string;
    args: Record<string, any>;
    runId?: string;
  };
  isNetwork?: boolean;
  toolCalled?: boolean;
}

export const FileContentBadge = ({
  toolName,
  args,
  result,
  metadata,
  toolCallId,
  toolApprovalMetadata,
  isNetwork,
  toolCalled,
}: FileContentBadgeProps) => {
  const isRunning = result === undefined;
  const content = fileContentFor(args, result);
  const path = filePathFor(args, result);
  const label = `${fileVerbFor(toolName, isRunning)}${path ? ` ${path}` : ''}`;

  return (
    <BadgeWrapper
      icon={iconFor(toolName)}
      title={label}
      initialCollapsed={false}
      extraInfo={content ? `${content.split('\n').length} lines` : undefined}
    >
      <StreamTailPreview
        source={content}
        isStreaming={isRunning}
        done={!isRunning}
        // A file with no content yet is the normal opening state of a write,
        // not an error — say what is happening rather than "No output".
        emptyLabel={isRunning ? 'Waiting for content…' : 'Empty file'}
        maxHeight="20rem"
        data-testid="file-content-output"
      />

      <ToolApprovalButtons
        toolCalled={toolCalled ?? false}
        toolCallId={toolCallId}
        toolApprovalMetadata={toolApprovalMetadata}
        toolName={toolName}
        isNetwork={isNetwork ?? false}
        isGenerateMode={metadata?.mode === 'generate'}
      />
    </BadgeWrapper>
  );
};
