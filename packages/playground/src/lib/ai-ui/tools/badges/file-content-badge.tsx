import { WORKSPACE_TOOLS } from '@mastra/core/workspace';
import { CodeBlock } from '@mastra/playground-ui';
import { FileText, FilePen, FileDown } from 'lucide-react';

import { canonicalToolName } from '../tool-names';
import { BadgeWrapper } from './badge-wrapper';
import { fileContentFor, fileLanguageFor, filePathFor, filePreviewFor, fileVerbFor } from './file-content';
import type { FileToolArgs, FileToolResult } from './file-content';
import { ToolApprovalButtons } from './tool-approval-buttons';

/**
 * File tools, showing the file instead of a JSON tool call.
 *
 * A write used to render as a pulsing dot and then a blob of JSON, which tells
 * the user nothing while it happens and nothing useful afterwards. The content
 * is the interesting part, so it streams into a syntax-highlighted block — the
 * same `CodeBlock` the transcript already uses for Code Mode programs — capped
 * at a preview's worth of file.
 */

function iconFor(toolName: string) {
  const canonical = canonicalToolName(toolName);
  if (canonical === WORKSPACE_TOOLS.FILESYSTEM.READ_FILE) return <FileDown />;
  if (canonical === WORKSPACE_TOOLS.FILESYSTEM.EDIT_FILE) return <FilePen />;
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

  const preview = filePreviewFor(content);
  const language = fileLanguageFor(path);

  return (
    <BadgeWrapper
      icon={iconFor(toolName)}
      title={label}
      initialCollapsed={false}
      extraInfo={content ? `${preview.totalLines} lines` : undefined}
    >
      <div data-testid="file-content-output">
        {content === '' ? (
          <div
            className="rounded-md border border-border1 bg-surface2 p-3 font-mono text-ui-xs italic text-icon3"
            data-testid="file-content-empty"
          >
            {/* A file with no content yet is the normal opening state of a
                write, not an error — say what is happening. */}
            {isRunning ? 'Waiting for content…' : 'Empty file'}
          </div>
        ) : (
          <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>
            <CodeBlock code={preview.text} lang={language} copyTooltip="Copy preview" />
          </div>
        )}

        {preview.truncated && (
          <p className="mt-1 select-none text-ui-xs italic text-icon3" data-testid="file-content-truncated">
            {`Preview truncated — ${preview.omittedLines.toLocaleString()} more lines, ${preview.omittedChars.toLocaleString()} more characters not shown`}
          </p>
        )}
      </div>

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
