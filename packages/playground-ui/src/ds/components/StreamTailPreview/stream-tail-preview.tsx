import { ArrowDownToLine } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

import type { TailLine } from './tail-buffer';
import { usePinnedScroll } from './use-pinned-scroll';
import type { TailSource, UseTailBufferOptions } from './use-tail-buffer';
import { useTailBuffer } from './use-tail-buffer';
import { cn } from '@/lib/utils';

export interface StreamTailPreviewProps extends UseTailBufferOptions {
  /**
   * The growing stream: the whole text so far, or an append-only array of
   * chunks. See {@link TailSource} for how growth is detected.
   */
  source: TailSource;
  /** Rendered above the output, inside the frame. Typically a command line. */
  header?: ReactNode;
  /** Shown in place of the output when nothing has arrived yet. */
  emptyLabel?: ReactNode;
  /**
   * Height of the scroll region. A preview is deliberately short: it exists to
   * show that something is happening, not to replace a terminal.
   */
  maxHeight?: string;
  /** Marks the stream as live; drives the trailing cursor and aria-busy. */
  isStreaming?: boolean;
  /** Override the rendering of a single line (e.g. to add ANSI colors). */
  renderLine?: (line: TailLine) => ReactNode;
  className?: string;
  'data-testid'?: string;
}

/** How a truncated line announces the characters it is not showing. */
const truncationLabel = (line: TailLine) => `line truncated, ${line.truncatedChars} more characters`;

const DefaultLine = ({ line }: { line: TailLine }) => (
  <>
    {line.text}
    {line.truncated && (
      <span
        className="ml-1 rounded-sm bg-surface5 px-1 text-ui-xs text-icon3 align-middle select-none"
        title={truncationLabel(line)}
        aria-label={truncationLabel(line)}
        data-truncated="true"
      >
        {`… +${line.truncatedChars}`}
      </span>
    )}
  </>
);

/**
 * A bounded, live-tailing preview of a growing text stream.
 *
 * Built for the case where a tool call is still running and the user is staring
 * at the UI: it shows the last N lines as they arrive, and nothing else. It is
 * explicitly NOT a terminal — there is no cursor addressing, no colors by
 * default, no scrollback beyond `maxLines`. Those omissions are what keep it
 * cheap enough to leave mounted for the entire life of a long build.
 *
 * Guarantees:
 * - Memory and DOM size are bounded by `maxLines`, whatever the stream emits.
 * - A single pathological line cannot blow up layout: it is truncated at
 *   `maxLineLength` and the omission is visible and announced, not silent.
 * - ANSI escapes and control characters are stripped by default.
 * - Auto-scroll follows the tail only while the user is at the bottom; scrolling
 *   up stops it and offers an explicit way back.
 *
 * Rendering at most `maxLines` rows means virtualization is usually
 * unnecessary. When it is wanted, drive a virtualizer from
 * {@link useTailBuffer} directly: `TailLine.id` is a stable key and lines are a
 * flat, index-addressable array.
 */
export const StreamTailPreview = ({
  source,
  header,
  emptyLabel = 'Waiting for output…',
  maxHeight = '16rem',
  isStreaming = false,
  renderLine,
  className,
  maxLines,
  maxLineLength,
  ansi,
  done,
  'data-testid': dataTestId = 'stream-tail-preview',
}: StreamTailPreviewProps) => {
  const { lines, pendingText, droppedLines, version } = useTailBuffer(source, {
    maxLines,
    maxLineLength,
    ansi,
    done,
  });

  const { ref, isPinned, scrollToBottom, onScroll } = usePinnedScroll<HTMLDivElement>(version);

  const isEmpty = lines.length === 0 && pendingText === '';

  const droppedLabel = useMemo(
    () => (droppedLines === 1 ? '1 earlier line hidden' : `${droppedLines.toLocaleString()} earlier lines hidden`),
    [droppedLines],
  );

  return (
    <div className={cn('relative overflow-hidden rounded-md border border-border1 bg-surface2', className)}>
      {header && (
        <div className="flex items-center justify-between gap-2 border-b border-border1 bg-surface3 px-3 py-2">
          {header}
        </div>
      )}

      <div className="relative">
        <div
          ref={ref}
          onScroll={onScroll}
          style={{ maxHeight }}
          // `tabIndex` so keyboard users can scroll the region; without it the
          // output is unreachable without a pointer.
          tabIndex={0}
          role="log"
          aria-live={isStreaming ? 'polite' : 'off'}
          aria-busy={isStreaming || undefined}
          aria-label="Command output"
          data-testid={dataTestId}
          data-pinned={isPinned ? 'true' : 'false'}
          className="overflow-y-auto overflow-x-auto p-3 font-mono text-ui-xs leading-5 text-icon6"
        >
          {droppedLines > 0 && (
            <div className="mb-1 select-none text-icon3 italic" data-testid="stream-tail-preview-dropped">
              {`… ${droppedLabel}`}
            </div>
          )}

          {isEmpty ? (
            <div className="select-none text-icon3 italic" data-testid="stream-tail-preview-empty">
              {emptyLabel}
            </div>
          ) : (
            <>
              {lines.map(line => (
                <div key={line.id} className="whitespace-pre" data-testid="stream-tail-preview-line">
                  {renderLine ? renderLine(line) : <DefaultLine line={line} />}
                </div>
              ))}
              {pendingText !== '' && (
                <div className="whitespace-pre" data-testid="stream-tail-preview-pending">
                  {pendingText}
                </div>
              )}
            </>
          )}
        </div>

        {!isPinned && (
          <button
            type="button"
            onClick={scrollToBottom}
            data-testid="stream-tail-preview-jump"
            className="absolute bottom-2 right-3 flex items-center gap-1 rounded-full border border-border2 bg-surface4 px-2 py-1 text-ui-xs text-icon6 shadow-sm hover:bg-surface5"
          >
            <ArrowDownToLine size={12} aria-hidden="true" />
            Jump to latest
          </button>
        )}
      </div>
    </div>
  );
};
