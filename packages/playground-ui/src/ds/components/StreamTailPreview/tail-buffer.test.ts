import { describe, expect, it } from 'vitest';

import { TailBuffer, sanitizeLine, tailText } from './tail-buffer';

const ESC = '\x1b';

describe('sanitizeLine', () => {
  it('strips SGR color sequences', () => {
    expect(sanitizeLine(`${ESC}[31merror${ESC}[0m: boom`)).toBe('error: boom');
  });

  it('strips erase-line and cursor-move sequences', () => {
    expect(sanitizeLine(`${ESC}[2K${ESC}[1Gbuilding`)).toBe('building');
  });

  it('strips OSC sequences terminated by BEL', () => {
    expect(sanitizeLine(`${ESC}]0;my title\x07done`)).toBe('done');
  });

  it('strips OSC sequences terminated by ST', () => {
    expect(sanitizeLine(`${ESC}]8;;https://example.com${ESC}\\link`)).toBe('link');
  });

  it('removes stray control characters but keeps tabs', () => {
    expect(sanitizeLine('a\x01b\x07c\td')).toBe('abc\td');
  });

  it('applies carriage-return rewrites like a terminal', () => {
    expect(sanitizeLine('10%\r50%\r100%')).toBe('100%');
  });

  it('ignores a trailing carriage return rather than emitting a blank', () => {
    expect(sanitizeLine('progress\r')).toBe('progress');
  });

  it('leaves plain text untouched', () => {
    expect(sanitizeLine('plain output')).toBe('plain output');
  });
});

describe('TailBuffer line assembly', () => {
  it('splits completed lines and carries the partial one', () => {
    const buffer = new TailBuffer();
    buffer.append('one\ntw');

    expect(buffer.lines().map(l => l.text)).toEqual(['one']);
    expect(buffer.pendingText).toBe('tw');
  });

  it('joins a line split across chunk boundaries', () => {
    const buffer = new TailBuffer();
    buffer.append('hel');
    buffer.append('lo wor');
    buffer.append('ld\n');

    expect(buffer.lines().map(l => l.text)).toEqual(['hello world']);
    expect(buffer.pendingText).toBe('');
  });

  it('sanitizes an escape sequence split across chunks, because sanitization happens at line close', () => {
    const buffer = new TailBuffer();
    buffer.append(`${ESC}[3`);
    buffer.append('1mred\n');

    expect(buffer.lines().map(l => l.text)).toEqual(['red']);
  });

  it('flush turns the trailing partial line into a real line', () => {
    const buffer = new TailBuffer();
    buffer.append('no trailing newline');
    expect(buffer.lines()).toHaveLength(0);

    buffer.flush();
    expect(buffer.lines().map(l => l.text)).toEqual(['no trailing newline']);
    expect(buffer.pendingText).toBe('');
  });

  it('flush is a no-op when there is no partial line', () => {
    const buffer = new TailBuffer();
    buffer.append('done\n');
    const before = buffer.version;
    buffer.flush();

    expect(buffer.version).toBe(before);
    expect(buffer.lines()).toHaveLength(1);
  });

  it('ignores empty appends', () => {
    const buffer = new TailBuffer();
    buffer.append('');
    expect(buffer.version).toBe(0);
  });

  it('preserves blank lines in the output', () => {
    const buffer = new TailBuffer();
    buffer.append('a\n\nb\n');
    expect(buffer.lines().map(l => l.text)).toEqual(['a', '', 'b']);
  });
});

describe('TailBuffer ring buffer', () => {
  it('retains only the last maxLines lines', () => {
    const buffer = new TailBuffer({ maxLines: 3 });
    buffer.append('1\n2\n3\n4\n5\n');

    expect(buffer.lines().map(l => l.text)).toEqual(['3', '4', '5']);
  });

  it('counts the lines it dropped', () => {
    const buffer = new TailBuffer({ maxLines: 3 });
    buffer.append('1\n2\n3\n4\n5\n');

    expect(buffer.droppedLines).toBe(2);
  });

  it('keeps memory bounded across a very large stream', () => {
    const buffer = new TailBuffer({ maxLines: 50 });
    for (let i = 0; i < 20_000; i++) buffer.append(`line ${i}\n`);

    expect(buffer.lines()).toHaveLength(50);
    expect(buffer.droppedLines).toBe(19_950);
    expect(buffer.lines()[49]!.text).toBe('line 19999');
  });

  it('hands out ids that keep increasing after eviction, so React keys stay unique', () => {
    const buffer = new TailBuffer({ maxLines: 2 });
    buffer.append('a\nb\nc\nd\n');

    expect(buffer.lines().map(l => l.id)).toEqual([2, 3]);
  });

  it('produces a new array identity on every mutation so React sees the change', () => {
    const buffer = new TailBuffer();
    const before = buffer.lines();
    buffer.append('x\n');

    expect(buffer.lines()).not.toBe(before);
  });

  it('clamps maxLines to at least one', () => {
    const buffer = new TailBuffer({ maxLines: 0 });
    buffer.append('a\nb\n');

    expect(buffer.lines().map(l => l.text)).toEqual(['b']);
  });
});

describe('TailBuffer long-line truncation', () => {
  it('truncates a line past maxLineLength and records how much was dropped', () => {
    const buffer = new TailBuffer({ maxLineLength: 10 });
    buffer.append(`${'x'.repeat(50_000)}\n`);

    const [line] = buffer.lines();
    expect(line!.text).toBe('x'.repeat(10));
    expect(line!.truncated).toBe(true);
    expect(line!.truncatedChars).toBe(49_990);
  });

  it('leaves a line at exactly the limit whole', () => {
    const buffer = new TailBuffer({ maxLineLength: 5 });
    buffer.append('12345\n');

    expect(buffer.lines()[0]).toMatchObject({ text: '12345', truncated: false, truncatedChars: 0 });
  });

  it('measures the limit after sanitization, so escapes do not consume the budget', () => {
    const buffer = new TailBuffer({ maxLineLength: 5 });
    buffer.append(`${ESC}[31mabcde${ESC}[0m\n`);

    expect(buffer.lines()[0]).toMatchObject({ text: 'abcde', truncated: false });
  });
});

describe('TailBuffer ansi: preserve', () => {
  it('keeps escape sequences when asked to', () => {
    const buffer = new TailBuffer({ ansi: 'preserve' });
    buffer.append(`${ESC}[31mred\n`);

    expect(buffer.lines()[0]!.text).toBe(`${ESC}[31mred`);
  });

  it('still applies carriage-return rewrites', () => {
    const buffer = new TailBuffer({ ansi: 'preserve' });
    buffer.append('10%\r99%\n');

    expect(buffer.lines()[0]!.text).toBe('99%');
  });
});

describe('TailBuffer text and reset', () => {
  it('renders the retained window plus the partial line as text', () => {
    const buffer = new TailBuffer();
    buffer.append('a\nb\npartial');

    expect(buffer.toText()).toBe('a\nb\npartial');
  });

  it('omits the partial line when there is none', () => {
    const buffer = new TailBuffer();
    buffer.append('a\nb\n');

    expect(buffer.toText()).toBe('a\nb');
  });

  it('renders only the partial line when no line has completed', () => {
    const buffer = new TailBuffer();
    buffer.append('partial');

    expect(buffer.toText()).toBe('partial');
  });

  it('clear drops content and the dropped-line count', () => {
    const buffer = new TailBuffer({ maxLines: 1 });
    buffer.append('a\nb\nc');
    buffer.clear();

    expect(buffer.lines()).toHaveLength(0);
    expect(buffer.droppedLines).toBe(0);
    expect(buffer.pendingText).toBe('');
  });

  it('bumps version on every mutation', () => {
    const buffer = new TailBuffer();
    expect(buffer.version).toBe(0);
    buffer.append('a\n');
    expect(buffer.version).toBe(1);
    buffer.append('b');
    expect(buffer.version).toBe(2);
    buffer.flush();
    expect(buffer.version).toBe(3);
  });
});

describe('tailText', () => {
  it('returns the tail of a whole string in one call', () => {
    const snapshot = tailText('1\n2\n3\n4', { maxLines: 2 });

    expect(snapshot.lines.map(l => l.text)).toEqual(['3', '4']);
    expect(snapshot.droppedLines).toBe(2);
    expect(snapshot.pendingText).toBe('');
  });
});
