// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { parsePartialJsonObject } from 'assistant-stream/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FILE_PREVIEW_MAX_CHARS,
  FILE_PREVIEW_MAX_LINES,
  fileDiffFor,
  fileDiffPreviewFor,
  fileLanguageFor,
  filePreviewFor,
} from '../file-content';
import { FileContentBadge } from '../file-content-badge';
import { ToolCallProvider } from '@/services/tool-call-provider';

/**
 * A write is unbounded: a generated dataset or a vendored bundle arrives token
 * by token into the transcript. The preview shows the file being written, and
 * stops accumulating once it has shown enough — the DOM, the highlighter's
 * input and the transcript all stay bounded no matter how big the file is.
 */
describe('filePreviewFor', () => {
  it('keeps a small file whole', () => {
    const preview = filePreviewFor('print("hi")\n');
    expect(preview.text).toBe('print("hi")\n');
    expect(preview.truncated).toBe(false);
    expect(preview.omittedChars).toBe(0);
  });

  it('caps by characters and reports what is missing', () => {
    const content = 'x'.repeat(FILE_PREVIEW_MAX_CHARS + 500);
    const preview = filePreviewFor(content);
    expect(preview.text.length).toBe(FILE_PREVIEW_MAX_CHARS);
    expect(preview.truncated).toBe(true);
    expect(preview.omittedChars).toBe(500);
  });

  it('caps by lines when the lines are short', () => {
    const content = Array.from({ length: FILE_PREVIEW_MAX_LINES + 100 }, () => 'a').join('\n');
    const preview = filePreviewFor(content);
    expect(preview.text.split('\n').length).toBeLessThanOrEqual(FILE_PREVIEW_MAX_LINES);
    expect(preview.truncated).toBe(true);
  });

  it('counts the whole file, not the preview', () => {
    const content = Array.from({ length: 4000 }, (_, i) => `line ${i}`).join('\n');
    expect(filePreviewFor(content).totalLines).toBe(4000);
  });
});

describe('fileLanguageFor', () => {
  it('picks the grammar from the extension', () => {
    expect(fileLanguageFor('/workspace/analyze.py')).toBe('python');
    expect(fileLanguageFor('/workspace/a.ts')).toBe('typescript');
    expect(fileLanguageFor('deploy.yaml')).toBe('yaml');
  });

  it('is undefined when there is no grammar, so the block renders as plain text', () => {
    expect(fileLanguageFor('/workspace/data.parquet')).toBeUndefined();
    expect(fileLanguageFor('/workspace/LICENSE')).toBeUndefined();
  });
});

const renderBadge = (props: {
  content: string;
  path?: string;
  result?: unknown;
  /** The half-parsed arguments of a call in flight, in place of a settled pair. */
  argsOverride?: Record<string, unknown>;
}) =>
  render(
    <ToolCallProvider
      approveToolcall={vi.fn()}
      declineToolcall={vi.fn()}
      approveToolcallGenerate={vi.fn()}
      declineToolcallGenerate={vi.fn()}
      approveNetworkToolcall={vi.fn()}
      declineNetworkToolcall={vi.fn()}
      isRunning={false}
      toolCallApprovals={{}}
      networkToolCallApprovals={{}}
    >
      <FileContentBadge
        toolName="write_file"
        args={props.argsOverride ?? { path: props.path ?? '/workspace/analyze.py', content: props.content }}
        result={props.result as undefined}
        toolCallId="call-1"
        isNetwork={false}
      />
    </ToolCallProvider>,
  );

afterEach(cleanup);

describe('FileContentBadge', () => {
  it('renders the streamed content as a code block, under a friendly title', () => {
    renderBadge({ content: 'import pandas as pd\n' });

    expect(screen.getByTestId('file-content-output').textContent).toContain('import pandas as pd');
    expect(screen.getByText('Writing /workspace/analyze.py')).toBeTruthy();
    expect(screen.queryByTestId('file-content-truncated')).toBeNull();
  });

  it('truncates a huge file and says so, instead of putting it in the transcript', () => {
    const content = Array.from({ length: 5000 }, (_, i) => `row_${i} = ${i}`).join('\n');

    renderBadge({ content });

    const rendered = screen.getByTestId('file-content-output').textContent ?? '';
    expect(rendered.length).toBeLessThan(content.length / 10);
    expect(screen.getByTestId('file-content-truncated').textContent).toContain('Preview truncated');
  });

  it('says a write has not produced content yet rather than calling it empty output', () => {
    renderBadge({ content: '' });

    expect(screen.getByTestId('file-content-empty').textContent).toBe('Waiting for content…');
  });
});

/**
 * The arguments of a call in flight are a HALF-WRITTEN JSON buffer, not an
 * object: `to-assistant-ui-message` forwards `argsText` and assistant-ui
 * partial-parses it (`parsePartialJsonObject`) into whatever is complete so
 * far. This drives the badge through that exact path, from the buffer, so
 * "waiting for content" for the whole of a long write — the file appearing only
 * once the call settles — is a failing test rather than something only a person
 * watching a live turn would notice.
 */
describe('FileContentBadge while the arguments are still arriving', () => {
  const renderFromBuffer = (argsText: string) =>
    renderBadge({ content: '', argsOverride: parsePartialJsonObject(argsText) as Record<string, unknown> });

  const body = Array.from({ length: 400 }, (_, i) => `print(${i} ** 2)`).join('\n');
  const full = JSON.stringify({ path: '/workspace/squares.py', content: body });

  it('shows the file growing as the buffer grows', () => {
    // A quarter of the way through the JSON, the string value is unterminated:
    // the buffer is not valid JSON at all, and there is still a file on screen.
    const quarter = renderFromBuffer(full.slice(0, Math.floor(full.length / 4)));
    const early = screen.getByTestId('file-content-output').textContent ?? '';
    expect(early).toContain('print(0 ** 2)');
    quarter.unmount();

    const half = renderFromBuffer(full.slice(0, Math.floor(full.length / 2)));
    const later = screen.getByTestId('file-content-output').textContent ?? '';
    expect(later.length).toBeGreaterThan(early.length);
    half.unmount();

    renderFromBuffer(full);
    const settled = screen.getByTestId('file-content-output').textContent ?? '';
    expect(settled.length).toBeGreaterThanOrEqual(later.length);
    expect(screen.queryByTestId('file-content-empty')).toBeNull();
  });

  it('caps the preview mid-stream and says what it is not showing', () => {
    renderFromBuffer(full);

    const rendered = screen.getByTestId('file-content-output').textContent ?? '';
    expect(rendered.length).toBeLessThan(body.length);
    expect(screen.getByTestId('file-content-truncated').textContent).toContain('Preview truncated');
  });

  it('shows the path from a buffer that has not reached the content yet', () => {
    renderFromBuffer('{"path":"/workspace/squares.py","content":"');
    expect(screen.getByText('Writing /workspace/squares.py')).toBeTruthy();
    expect(screen.getByTestId('file-content-empty').textContent).toBe('Waiting for content…');
  });
});

/**
 * `edit_file` is the same family as `write_file` — same wrapper, same caps,
 * same truncation notice — showing the CHANGE rather than the file, because
 * the change is all the call carries.
 */
describe('fileDiffFor', () => {
  it('shows the replaced lines as removals and the replacement as additions', () => {
    const lines = fileDiffFor({ old_string: 'value = 1\n', new_string: 'value = 2\n' });
    expect(lines.filter(line => line.kind === 'removed').map(line => line.text)).toEqual(['value = 1']);
    expect(lines.filter(line => line.kind === 'added').map(line => line.text)).toEqual(['value = 2']);
  });

  it('shows the surrounding lines the model included for uniqueness once, as context', () => {
    const lines = fileDiffFor({
      old_string: 'def main():\n    total = 0\n    return total\n',
      new_string: 'def main():\n    total = 1\n    return total\n',
    });

    expect(lines.filter(line => line.kind === 'context').map(line => line.text)).toEqual([
      'def main():',
      '    return total',
      '',
    ]);
    expect(lines.filter(line => line.kind === 'removed').map(line => line.text)).toEqual(['    total = 0']);
    expect(lines.filter(line => line.kind === 'added').map(line => line.text)).toEqual(['    total = 1']);
  });

  it('reads an insertion and a deletion, not only a replacement', () => {
    expect(fileDiffFor({ old_string: '', new_string: 'added\n' }).some(line => line.kind === 'added')).toBe(true);
    expect(fileDiffFor({ old_string: 'gone\n', new_string: '' }).some(line => line.kind === 'removed')).toBe(true);
    expect(fileDiffFor({})).toEqual([]);
  });

  it('caps a huge edit exactly the way a huge write is capped', () => {
    const lines = fileDiffFor({
      old_string: '',
      new_string: Array.from({ length: FILE_PREVIEW_MAX_LINES + 200 }, (_, i) => `line ${i}`).join('\n'),
    });
    const preview = fileDiffPreviewFor(lines);

    expect(preview.lines.length).toBeLessThanOrEqual(FILE_PREVIEW_MAX_LINES);
    expect(preview.truncated).toBe(true);
    expect(preview.omittedLines).toBeGreaterThan(0);
  });
});

describe('FileContentBadge for an edit', () => {
  const renderEdit = (args: Record<string, unknown>, result?: unknown) =>
    render(
      <ToolCallProvider
        approveToolcall={vi.fn()}
        declineToolcall={vi.fn()}
        approveToolcallGenerate={vi.fn()}
        declineToolcallGenerate={vi.fn()}
        approveNetworkToolcall={vi.fn()}
        declineNetworkToolcall={vi.fn()}
        isRunning={false}
        toolCallApprovals={{}}
        networkToolCallApprovals={{}}
      >
        <FileContentBadge
          toolName="edit_file"
          args={args}
          result={result as undefined}
          toolCallId="call-2"
          isNetwork={false}
        />
      </ToolCallProvider>,
    );

  it('renders the change as a diff, signed as well as coloured', () => {
    renderEdit({
      path: '/workspace/analyze.py',
      old_string: 'rows = 10\n',
      new_string: 'rows = 20\n',
    });

    const diff = screen.getByTestId('file-diff-output');
    expect(diff.querySelector('[data-diff-kind="removed"]')?.textContent).toContain('rows = 10');
    expect(diff.querySelector('[data-diff-kind="added"]')?.textContent).toContain('rows = 20');
    expect(diff.querySelector('[data-diff-kind="removed"]')?.textContent).toContain('-');
    expect(diff.querySelector('[data-diff-kind="added"]')?.textContent).toContain('+');
    // The title reads as a sentence, the same as every other file tool.
    expect(screen.getByText('Editing /workspace/analyze.py')).toBeTruthy();
    // ...and never as the write badge's "here is the new file".
    expect(screen.queryByTestId('file-content-output')).toBeNull();
  });

  it('truncates a huge edit and says so, exactly as a huge write does', () => {
    renderEdit({
      path: '/workspace/vendored.js',
      old_string: '',
      new_string: Array.from({ length: 4000 }, (_, i) => `row_${i} = ${i}`).join('\n'),
    });

    expect(screen.getByTestId('file-content-truncated').textContent).toContain('Preview truncated');
  });

  it('waits for the edit rather than claiming the file is empty', () => {
    renderEdit({ path: '/workspace/analyze.py' });
    expect(screen.getByTestId('file-content-empty').textContent).toBe('Waiting for the edit…');
  });
});
