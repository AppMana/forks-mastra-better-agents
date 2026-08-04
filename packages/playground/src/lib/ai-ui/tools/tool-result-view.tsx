import { CodeEditor, StreamTailPreview } from '@mastra/playground-ui';

/**
 * Bounded presentation for tool arguments, results and payloads in the chat
 * transcript.
 *
 * A single `execute_command` can return megabytes of build output. Rendered
 * verbatim it becomes tens of thousands of DOM nodes and pushes the rest of the
 * conversation off screen, which is exactly when the user wants to scroll back
 * through it. So every tool payload is rendered inside a block that is bounded
 * twice over:
 *
 * - by LINES: at most {@link TOOL_RESULT_MAX_LINES} lines are kept. For command
 *   output the tail is what matters (the failure, the exit code), so the tail is
 *   what is kept, and the elision is stated rather than silent.
 * - by HEIGHT: the block scrolls inside itself at
 *   {@link TOOL_RESULT_MAX_HEIGHT}; the page never grows to fit it.
 *
 * A pathological single line (a minified bundle, a base64 blob) is truncated at
 * {@link TOOL_RESULT_MAX_LINE_LENGTH} and the remainder scrolls horizontally
 * within the block, so it cannot widen the transcript either.
 *
 * Text payloads reuse `StreamTailPreview`, which is the same component that
 * renders live sandbox output — a finished command result therefore looks like
 * the command did while it was running, instead of switching visual language at
 * the moment it exits.
 */

/** Retained lines, newest kept. Tune here; every tool payload follows it. */
export const TOOL_RESULT_MAX_LINES = 200;

/** Characters kept per line before the rest is elided. */
export const TOOL_RESULT_MAX_LINE_LENGTH = 2000;

/** Height of the scroll region, as a CSS length. */
export const TOOL_RESULT_MAX_HEIGHT = '20rem';

export interface ToolResultViewProps {
  /** The payload to render. Strings are tailed; anything else is shown as JSON. */
  value: unknown;
  /** Shown when a string payload is empty. */
  emptyLabel?: string;
  /** Overrides for the caps above, when a call site needs a different budget. */
  maxLines?: number;
  maxLineLength?: number;
  maxHeight?: string;
  className?: string;
  'data-testid'?: string;
}

/**
 * Renders one tool payload in a bounded, scrollable block.
 *
 * Strings go through the tail buffer; structured values are pretty-printed by
 * `CodeEditor` inside a height-capped scroll region. CodeMirror only mounts the
 * visible viewport, so a large JSON result costs a screenful of DOM regardless
 * of its size — no line cap is needed on that path, and truncating the middle of
 * a JSON document would make it unreadable anyway.
 */
export const ToolResultView = ({
  value,
  emptyLabel = 'No output',
  maxLines = TOOL_RESULT_MAX_LINES,
  maxLineLength = TOOL_RESULT_MAX_LINE_LENGTH,
  maxHeight = TOOL_RESULT_MAX_HEIGHT,
  className,
  'data-testid': dataTestId,
}: ToolResultViewProps) => {
  if (typeof value === 'string') {
    return (
      <StreamTailPreview
        source={value}
        done
        maxLines={maxLines}
        maxLineLength={maxLineLength}
        maxHeight={maxHeight}
        emptyLabel={emptyLabel}
        className={className}
        data-testid={dataTestId}
      />
    );
  }

  return (
    <div className={className} style={{ maxHeight, overflowY: 'auto' }} data-testid={dataTestId}>
      <CodeEditor data={value as Record<string, unknown>} />
    </div>
  );
};
