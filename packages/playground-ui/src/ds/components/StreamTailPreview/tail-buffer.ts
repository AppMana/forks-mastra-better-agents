/**
 * Incremental, bounded tail buffer for a growing text stream.
 *
 * The point of this module is that a preview of a long-running command must
 * cost O(bytes appended) and O(maxLines) memory — never O(total output). A
 * naive `chunks.map(c => c.output).join('')` re-walks the whole transcript on
 * every React render, which is what makes a UI die halfway through a build.
 *
 * Semantics:
 * - Input arrives as arbitrary chunks; line boundaries do not align to chunks,
 *   so a trailing partial line is carried over to the next append.
 * - `\r` performs an in-line rewrite (progress bars, spinners): only the text
 *   after the last carriage return of a line survives, which is what a terminal
 *   would show.
 * - ANSI escape sequences and other C0 control characters are removed by
 *   default; a preview is not a terminal emulator and half-parsed escapes are
 *   worse than none.
 * - Each line is truncated to `maxLineLength`; the dropped character count is
 *   retained so the UI can say so instead of silently lying.
 * - At most `maxLines` lines are retained; older lines are dropped and counted.
 *
 * No React, no DOM: this file is pure so it can be unit-tested directly and
 * reused by any renderer (including a virtualized one).
 */

/** A single retained line of the tail. */
export interface TailLine {
  /**
   * Monotonically increasing id, stable across ring-buffer eviction. Use it as
   * the React key and as the index key for a virtualizer.
   */
  id: number;
  /** Sanitized, truncated text. Never contains ANSI escapes or newlines. */
  text: string;
  /** Number of characters removed from the end by `maxLineLength`. 0 when whole. */
  truncatedChars: number;
  /** Convenience flag: `truncatedChars > 0`. */
  truncated: boolean;
}

export interface TailBufferOptions {
  /** Maximum retained lines (ring buffer capacity). Default 200. */
  maxLines?: number;
  /** Maximum characters kept per line. Default 2000. */
  maxLineLength?: number;
  /**
   * `'strip'` (default) removes ANSI escapes and C0 controls.
   * `'preserve'` keeps the raw text; only newline splitting is applied. Use it
   * when the consumer renders with a real ANSI-aware renderer downstream.
   */
  ansi?: 'strip' | 'preserve';
}

export const DEFAULT_MAX_LINES = 200;
export const DEFAULT_MAX_LINE_LENGTH = 2000;

/**
 * ANSI escape sequences.
 *
 * - CSI:  ESC [ ... final-byte      (colors, cursor moves, erase-line)
 * - OSC:  ESC ] ... BEL | ESC \     (window titles, hyperlinks)
 * - other two-byte escapes:  ESC <byte>
 *
 * Written as three alternatives rather than one clever pattern because a
 * partially-matched escape must not swallow the rest of the line.
 */

const ANSI_PATTERN = /\x1b\[[0-9;?]*[ -\/]*[@-~]|\x1b\][\s\S]*?(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g;

/** C0 controls except tab; newline and carriage return are handled before this. */

const CONTROL_PATTERN = /[\x00-\x08\x0b-\x1f\x7f]/g;

/**
 * Apply carriage-return rewrites the way a terminal would: everything before
 * the last `\r` on a line has been overwritten and is not part of the output.
 * A trailing `\r` (the common "redraw next tick" case) leaves an empty line,
 * so it is dropped rather than producing a blank row.
 */
const applyCarriageReturns = (line: string): string => {
  if (!line.includes('\r')) return line;
  const segments = line.split('\r');
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i] !== '') return segments[i]!;
  }
  return '';
};

/** Strip ANSI escapes and stray control characters from one line. */
export const sanitizeLine = (line: string): string =>
  applyCarriageReturns(line).replace(ANSI_PATTERN, '').replace(CONTROL_PATTERN, '');

/**
 * A bounded, append-only view of a growing stream.
 *
 * Instances are mutable and intentionally cheap to construct: React consumers
 * keep one in a ref and call `append` as chunks arrive, then read `snapshot()`
 * to render.
 */
export class TailBuffer {
  readonly maxLines: number;
  readonly maxLineLength: number;
  readonly ansi: 'strip' | 'preserve';

  /** Ring storage. Length never exceeds `maxLines`. */
  private _lines: TailLine[] = [];
  /** Unterminated trailing text carried into the next append. */
  private _pending = '';
  /** Lines evicted by the ring buffer since construction. */
  private _droppedLines = 0;
  /** Next line id to hand out. */
  private _nextId = 0;
  /** Bumped on every mutation so consumers can skip work when nothing changed. */
  private _version = 0;

  constructor(options: TailBufferOptions = {}) {
    this.maxLines = Math.max(1, options.maxLines ?? DEFAULT_MAX_LINES);
    this.maxLineLength = Math.max(1, options.maxLineLength ?? DEFAULT_MAX_LINE_LENGTH);
    this.ansi = options.ansi ?? 'strip';
  }

  /** Lines evicted because the buffer is full. */
  get droppedLines(): number {
    return this._droppedLines;
  }

  /** Increments on every append that changed something. */
  get version(): number {
    return this._version;
  }

  /** The partial trailing line, sanitized. Empty when the stream ends on `\n`. */
  get pendingText(): string {
    return this.ansi === 'strip' ? sanitizeLine(this._pending) : applyCarriageReturns(this._pending);
  }

  /**
   * Append a chunk. Chunks may split lines anywhere, including mid-escape at a
   * chunk boundary — such an escape is only sanitized once the line completes,
   * which is why sanitization happens at line close and not per chunk.
   */
  append(chunk: string): void {
    if (!chunk) return;
    this._version++;

    const combined = this._pending + chunk;
    const parts = combined.split('\n');
    // The last element is the new pending partial line (empty if chunk ended
    // with a newline), so every element before it is a completed line.
    this._pending = parts.pop() ?? '';

    for (const raw of parts) {
      this._push(raw);
    }
  }

  /**
   * Flush the trailing partial line as a completed line. Call when the stream
   * has ended so a final unterminated line is not lost.
   */
  flush(): void {
    if (this._pending === '') return;
    this._version++;
    this._push(this._pending);
    this._pending = '';
  }

  /** Discard everything and start over (same options, ids continue). */
  clear(): void {
    this._version++;
    this._lines = [];
    this._pending = '';
    this._droppedLines = 0;
  }

  /**
   * The retained lines, oldest first. Returns the internal array — treat it as
   * read-only. A new array identity is produced on every mutation so React's
   * referential comparison sees the change.
   */
  lines(): readonly TailLine[] {
    return this._lines;
  }

  /** Everything a renderer needs, in one referentially-stable-per-version object. */
  snapshot(): TailSnapshot {
    return {
      lines: this._lines,
      pendingText: this.pendingText,
      droppedLines: this._droppedLines,
      version: this._version,
    };
  }

  /** Plain text of the retained window, for copy-to-clipboard. */
  toText(): string {
    const body = this._lines.map(line => line.text).join('\n');
    const pending = this.pendingText;
    if (!pending) return body;
    return body ? `${body}\n${pending}` : pending;
  }

  private _push(raw: string): void {
    const sanitized = this.ansi === 'strip' ? sanitizeLine(raw) : applyCarriageReturns(raw);
    const overflow = sanitized.length - this.maxLineLength;
    const line: TailLine = {
      id: this._nextId++,
      text: overflow > 0 ? sanitized.slice(0, this.maxLineLength) : sanitized,
      truncatedChars: overflow > 0 ? overflow : 0,
      truncated: overflow > 0,
    };

    // Copy-on-write so React sees a new array identity, while staying O(maxLines).
    const next = this._lines.length >= this.maxLines ? this._lines.slice(1) : this._lines.slice();
    if (this._lines.length >= this.maxLines) this._droppedLines++;
    next.push(line);
    this._lines = next;
  }
}

/** Immutable view produced by {@link TailBuffer.snapshot}. */
export interface TailSnapshot {
  lines: readonly TailLine[];
  pendingText: string;
  droppedLines: number;
  version: number;
}

/**
 * One-shot convenience for callers that already hold the whole text (e.g. a
 * completed tool result, or a Storybook fixture) and just want the tail.
 */
export const tailText = (text: string, options?: TailBufferOptions): TailSnapshot => {
  const buffer = new TailBuffer(options);
  buffer.append(text);
  buffer.flush();
  return buffer.snapshot();
};
