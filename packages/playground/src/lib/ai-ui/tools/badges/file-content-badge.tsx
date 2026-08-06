import { WORKSPACE_TOOLS } from '@mastra/core/workspace';
import { CodeBlock } from '@mastra/playground-ui';
import { FileText, FilePen, FileDown } from 'lucide-react';

import { canonicalToolName } from '../tool-names';
import { BadgeWrapper } from './badge-wrapper';
import {
  fileContentFor,
  fileDiffFor,
  fileDiffPreviewFor,
  fileLanguageFor,
  filePathFor,
  filePreviewFor,
  fileVerbFor,
  isFileDiffTool,
} from './file-content';
import type { DiffLine, DiffLineKind, FileToolArgs, FileToolResult } from './file-content';
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

/**
 * One line of the edit, in the same bounded, monospaced box a written file
 * gets. Colour AND a gutter sign, never colour alone: the sign is what carries
 * the meaning when the colours cannot be told apart.
 */
const DIFF_LINE_CLASS: Record<DiffLineKind, string> = {
  added: 'bg-green-500/10 text-green-400',
  removed: 'bg-red-500/10 text-red-400',
  context: 'text-neutral4',
};

const DIFF_SIGN: Record<DiffLineKind, string> = { added: '+', removed: '-', context: ' ' };

const FileDiffView = ({ lines }: { lines: DiffLine[] }) => (
  <pre className="rounded-2xl border border-border2/40 bg-surface2 px-4 py-3 font-mono text-ui-sm whitespace-pre-wrap break-all">
    {lines.map((line, index) => (
      <div key={index} className={DIFF_LINE_CLASS[line.kind]} data-diff-kind={line.kind}>
        <span aria-hidden className="select-none pr-2 opacity-60">
          {DIFF_SIGN[line.kind]}
        </span>
        {line.text}
      </div>
    ))}
  </pre>
);

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

  // An edit shows the CHANGE; everything else shows the file. Same wrapper,
  // same caps, same truncation notice — one family, two contents.
  const diff = isFileDiffTool(toolName) ? fileDiffPreviewFor(fileDiffFor(args)) : null;

  const preview = filePreviewFor(content);
  const language = fileLanguageFor(path);

  if (diff) {
    return (
      <BadgeWrapper
        icon={iconFor(toolName)}
        title={label}
        initialCollapsed={false}
        extraInfo={diff.lines.length > 0 ? `+${diff.added} −${diff.removed}` : undefined}
      >
        <div data-testid="file-diff-output">
          {diff.lines.length === 0 ? (
            <div
              className="rounded-md border border-border1 bg-surface2 p-3 font-mono text-ui-xs italic text-icon3"
              data-testid="file-content-empty"
            >
              {isRunning ? 'Waiting for the edit…' : 'No change'}
            </div>
          ) : (
            <div style={{ maxHeight: '20rem', overflowY: 'auto' }}>
              <FileDiffView lines={diff.lines} />
            </div>
          )}

          {diff.truncated && (
            <p className="mt-1 select-none text-ui-xs italic text-icon3" data-testid="file-content-truncated">
              {`Preview truncated — ${diff.omittedLines.toLocaleString()} more lines, ${diff.omittedChars.toLocaleString()} more characters not shown`}
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
  }

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
