// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  TOOL_RESULT_MAX_HEIGHT,
  TOOL_RESULT_MAX_LINE_LENGTH,
  TOOL_RESULT_MAX_LINES,
  ToolResultView,
} from '../tool-result-view';

afterEach(() => cleanup());

const lines = (count: number, prefix = 'line') =>
  Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}`).join('\n');

describe('ToolResultView', () => {
  it('caps the rendered lines of a long command result and keeps the tail', () => {
    const total = TOOL_RESULT_MAX_LINES * 3;
    render(<ToolResultView value={lines(total)} data-testid="tool-result" />);

    const rendered = screen.getAllByTestId('stream-tail-preview-line');
    expect(rendered).toHaveLength(TOOL_RESULT_MAX_LINES);

    // The tail is what matters for command output: the last line survives and
    // the first one does not.
    expect(rendered[rendered.length - 1]?.textContent).toBe(`line-${total}`);
    expect(screen.queryByText('line-1')).toBeNull();
  });

  it('states how many earlier lines were elided instead of dropping them silently', () => {
    const total = TOOL_RESULT_MAX_LINES + 25;
    render(<ToolResultView value={lines(total)} data-testid="tool-result" />);

    expect(screen.getByTestId('stream-tail-preview-dropped').textContent).toContain('25 earlier lines hidden');
  });

  it('bounds the block height and scrolls inside itself', () => {
    render(<ToolResultView value={lines(TOOL_RESULT_MAX_LINES * 2)} data-testid="tool-result" />);

    const region = screen.getByTestId('tool-result');
    expect(region.style.maxHeight).toBe(TOOL_RESULT_MAX_HEIGHT);
    expect(region.className).toContain('overflow-y-auto');
  });

  it('honours a call-site height override', () => {
    render(<ToolResultView value="one line" maxHeight="10rem" data-testid="tool-result" />);

    expect(screen.getByTestId('tool-result').style.maxHeight).toBe('10rem');
  });

  it('truncates a pathological single line so it cannot widen the transcript', () => {
    render(<ToolResultView value={'x'.repeat(TOOL_RESULT_MAX_LINE_LENGTH + 500)} data-testid="tool-result" />);

    const [line] = screen.getAllByTestId('stream-tail-preview-line');
    expect(line?.textContent).toContain('+500');
    // The visible text is the cap plus the "… +500" affordance, never the whole line.
    expect(line?.textContent?.length).toBeLessThan(TOOL_RESULT_MAX_LINE_LENGTH + 20);
    // Overflow scrolls within the block rather than expanding the page.
    expect(screen.getByTestId('tool-result').className).toContain('overflow-x-auto');
  });

  it('renders a structured result as JSON inside a height-bounded scroll region', () => {
    render(<ToolResultView value={{ rows: [1, 2, 3] }} data-testid="tool-result" />);

    const region = screen.getByTestId('tool-result');
    expect(region.style.maxHeight).toBe(TOOL_RESULT_MAX_HEIGHT);
    expect(region.style.overflowY).toBe('auto');
    expect(region.querySelector('.cm-editor')).toBeTruthy();
  });

  it('shows an empty-state label rather than a blank frame', () => {
    render(<ToolResultView value="" data-testid="tool-result" />);

    expect(screen.getByTestId('stream-tail-preview-empty').textContent).toBe('No output');
  });
});
