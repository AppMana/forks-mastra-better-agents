// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FILE_PREVIEW_MAX_CHARS, FILE_PREVIEW_MAX_LINES, fileLanguageFor, filePreviewFor } from '../file-content';
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

const renderBadge = (props: { content: string; path?: string; result?: unknown }) =>
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
        args={{ path: props.path ?? '/workspace/analyze.py', content: props.content }}
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
