import { useEffect, useRef, useState } from 'react';

import type { TailBufferOptions, TailSnapshot } from './tail-buffer';
import { TailBuffer } from './tail-buffer';

/**
 * The two shapes a growing stream arrives in:
 *
 * - `string` — the whole text so far (a polled file, a completed tool result).
 *   Growth is detected by prefix: if the new value extends the old one, only
 *   the suffix is appended. Anything else is treated as a replacement and the
 *   buffer restarts, which is what makes "the file was rewritten" correct
 *   rather than silently duplicated.
 * - `readonly string[]` — append-only chunks (stream parts). Growth is detected
 *   by length, so re-renders that hand back the same array cost nothing.
 */
export type TailSource = string | readonly string[];

export interface UseTailBufferOptions extends TailBufferOptions {
  /**
   * Treat the stream as finished: the trailing partial line is flushed so a
   * final unterminated line is still shown. Set it when the command exits.
   */
  done?: boolean;
}

export interface UseTailBufferResult extends TailSnapshot {
  /** Plain text of the retained window, for copy-to-clipboard. */
  text: string;
  /** Total lines currently retained (excludes dropped and pending). */
  lineCount: number;
}

interface TailState extends TailSnapshot {
  text: string;
}

const EMPTY_STATE: TailState = { lines: [], pendingText: '', droppedLines: 0, version: 0, text: '' };

const readState = (buffer: TailBuffer): TailState => ({ ...buffer.snapshot(), text: buffer.toText() });

/**
 * Feed a growing stream into a bounded {@link TailBuffer} and re-render on
 * change. Cost per render is O(new bytes), not O(total output), so a build that
 * prints tens of megabytes stays responsive and bounded in memory.
 */
export const useTailBuffer = (source: TailSource, options: UseTailBufferOptions = {}): UseTailBufferResult => {
  const { maxLines, maxLineLength, ansi, done } = options;

  const bufferRef = useRef<TailBuffer | null>(null);
  // How much of `source` has already been appended: characters for a string
  // source, element count for a chunk-array source.
  const consumedRef = useRef(0);
  const previousStringRef = useRef('');
  // The buffer version already reflected in state. Callers routinely pass a
  // freshly-filtered array on every render (`parts.filter(...)`), which changes
  // identity without changing content; without this guard the effect would
  // setState every render and spin forever.
  const appliedVersionRef = useRef(-1);
  const [state, setState] = useState<TailState>(EMPTY_STATE);

  const publish = (buffer: TailBuffer) => {
    if (appliedVersionRef.current === buffer.version) return;
    appliedVersionRef.current = buffer.version;
    setState(readState(buffer));
  };

  // Recreate the buffer when its sizing/sanitization options change; the old
  // contents were shaped by the old options and cannot be reinterpreted.
  useEffect(() => {
    bufferRef.current = new TailBuffer({ maxLines, maxLineLength, ansi });
    consumedRef.current = 0;
    previousStringRef.current = '';
    appliedVersionRef.current = -1;
    publish(bufferRef.current);
  }, [maxLines, maxLineLength, ansi]);

  useEffect(() => {
    let buffer = bufferRef.current;
    if (!buffer) {
      buffer = new TailBuffer({ maxLines, maxLineLength, ansi });
      bufferRef.current = buffer;
    }

    if (typeof source === 'string') {
      const previous = previousStringRef.current;
      if (source.length < previous.length || !source.startsWith(previous)) {
        // Not an extension of what we have: the source was replaced.
        buffer.clear();
        consumedRef.current = 0;
        buffer.append(source);
      } else if (source.length > previous.length) {
        buffer.append(source.slice(previous.length));
      }
      previousStringRef.current = source;
      consumedRef.current = source.length;
    } else {
      if (source.length < consumedRef.current) {
        // The chunk array shrank, so it is not the same append-only stream.
        buffer.clear();
        consumedRef.current = 0;
      }
      for (let i = consumedRef.current; i < source.length; i++) {
        buffer.append(source[i] ?? '');
      }
      consumedRef.current = source.length;
    }

    if (done) buffer.flush();

    publish(buffer);
  }, [source, done, maxLines, maxLineLength, ansi]);

  return { ...state, lineCount: state.lines.length };
};
