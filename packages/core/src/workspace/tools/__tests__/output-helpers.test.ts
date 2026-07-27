import { describe, expect, it } from 'vitest';
import { applyTail, stripNulBytes, truncateOutput } from '../output-helpers';

/**
 * Command output is persisted verbatim into the tool-result part of the
 * assistant message. A NUL byte in that output — PyPDF2's text extraction
 * emits them for unmapped ligature glyphs, and any command that cats a binary
 * can produce them — survives JSON.stringify as "\u0000" and lands in storage.
 * Postgres text columns store it, but every `content::jsonb` cast on that row
 * then fails ("\u0000 cannot be converted to text"), which breaks any SQL-side
 * migration or query over message content. Seen live 2026-07-27: a PyPDF2 page
 * dump put "merge-shi\u0000 protocol" into a persisted message.
 *
 * read_file already refuses to inline NUL-bearing content; truncateOutput is
 * the equivalent choke point for sandbox command output (execute_command and
 * get_process_output both return through it), so sanitizing here keeps NUL out
 * of every persisted command result without touching the streamed raw output.
 */
describe('stripNulBytes', () => {
  it('removes NUL bytes and leaves other whitespace and controls alone', () => {
    expect(stripNulBytes('merge-shi\u0000 protocol')).toBe('merge-shi protocol');
    expect(stripNulBytes('\u0000\u0000')).toBe('');
    expect(stripNulBytes('tabs\t newlines\n cr\r kept')).toBe('tabs\t newlines\n cr\r kept');
    expect(stripNulBytes('')).toBe('');
  });
});

describe('truncateOutput NUL sanitization', () => {
  it('never returns NUL bytes when output fits the limits', async () => {
    const short = await truncateOutput('a\u0000b', 0);
    expect(short).toBe('ab');
  });

  it('never returns NUL bytes when output is tail-truncated', async () => {
    const lines = Array.from({ length: 500 }, (_, i) => `line ${i}\u0000`).join('\n');
    const truncated = await truncateOutput(lines, 200);
    expect(truncated).not.toContain('\u0000');
    expect(truncated).toContain('[showing last 200 of 500 lines]');
  });

  it('leaves applyTail semantics unchanged', () => {
    expect(applyTail('a\nb\nc', 2)).toBe('[showing last 2 of 3 lines]\nb\nc');
  });
});
