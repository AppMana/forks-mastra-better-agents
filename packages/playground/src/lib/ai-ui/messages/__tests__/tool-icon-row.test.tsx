// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { RunPartLike } from '../tool-icon-row';
import { ToolIconRowView } from '../tool-icon-row';

afterEach(() => cleanup());

const parts: RunPartLike[] = [
  {
    type: 'tool-call',
    toolName: 'mastra_workspace_read_file',
    args: { path: '/src/a.ts' },
    result: { content: 'x' },
  },
  { type: 'reasoning', text: 'thinking about it' },
  {
    type: 'tool-call',
    toolName: 'mastra_workspace_execute_command',
    args: { command: 'ls -la' },
    result: undefined,
  },
];

const renderRow = (overrides?: { parts?: RunPartLike[]; isStreamingTail?: boolean }) => {
  const p = overrides?.parts ?? parts;
  return render(
    <ToolIconRowView parts={p} isStreamingTail={overrides?.isStreamingTail ?? false}>
      {p.map((_, i) => (
        <div key={i}>panel-content-{i}</div>
      ))}
    </ToolIconRowView>,
  );
};

const icon = (i: number) => screen.getByTestId(`part-run-icon-${i}`);
const panel = (i: number) => screen.getByTestId(`part-run-panel-${i}`);
const isHidden = (i: number) => panel(i).hasAttribute('hidden');

describe('ToolIconRowView', () => {
  it('renders one icon and one panel per part, all collapsed when not streaming', () => {
    renderRow();

    expect(screen.getAllByTestId(/part-run-icon-/)).toHaveLength(3);
    expect(screen.getAllByTestId(/part-run-panel-/)).toHaveLength(3);
    expect([0, 1, 2].map(isHidden)).toEqual([true, true, true]);
  });

  it('expands exactly one entry on click and switches on another click', () => {
    renderRow();

    fireEvent.click(icon(0));
    expect([0, 1, 2].map(isHidden)).toEqual([false, true, true]);

    fireEvent.click(icon(2));
    expect([0, 1, 2].map(isHidden)).toEqual([true, true, false]);
  });

  it('collapses an expanded entry when its icon is clicked again', () => {
    renderRow();

    fireEvent.click(icon(1));
    expect(isHidden(1)).toBe(false);

    fireEvent.click(icon(1));
    expect([0, 1, 2].map(isHidden)).toEqual([true, true, true]);
  });

  it('keeps panels mounted while collapsed', () => {
    renderRow();

    expect(screen.getByText('panel-content-0')).toBeDefined();
    expect(screen.getByText('panel-content-2')).toBeDefined();
  });

  it('expands the newest entry by default while streaming and follows new parts', () => {
    const { rerender } = renderRow({ isStreamingTail: true });

    expect([0, 1, 2].map(isHidden)).toEqual([true, true, false]);

    const grown = [...parts, { type: 'reasoning', text: 'more' } as RunPartLike];
    rerender(
      <ToolIconRowView parts={grown} isStreamingTail={true}>
        {grown.map((_, i) => (
          <div key={i}>panel-content-{i}</div>
        ))}
      </ToolIconRowView>,
    );

    expect([0, 1, 2, 3].map(isHidden)).toEqual([true, true, true, false]);
  });

  it('respects a manual selection during streaming', () => {
    renderRow({ isStreamingTail: true });

    fireEvent.click(icon(0));
    expect([0, 1, 2].map(isHidden)).toEqual([false, true, true]);
  });

  it('collapses everything once the run is over', () => {
    const { rerender } = renderRow({ isStreamingTail: true });

    expect(isHidden(2)).toBe(false);

    rerender(
      <ToolIconRowView parts={parts} isStreamingTail={false}>
        {parts.map((_, i) => (
          <div key={i}>panel-content-{i}</div>
        ))}
      </ToolIconRowView>,
    );

    expect([0, 1, 2].map(isHidden)).toEqual([true, true, true]);
  });

  it('labels each icon with the tool and a short summary', () => {
    renderRow();

    expect(icon(0).getAttribute('aria-label')).toContain('read_file');
    expect(icon(0).getAttribute('aria-label')).toContain('/src/a.ts');
    expect(icon(1).getAttribute('aria-label')).toContain('Reasoning');
    expect(icon(2).getAttribute('aria-label')).toContain('execute_command');
    expect(icon(2).getAttribute('aria-label')).toContain('ls -la');
  });

  it('carries a status dot: succeeded, running while streaming, failed on error', () => {
    const p: RunPartLike[] = [
      { type: 'tool-call', toolName: 't1', args: {}, result: { ok: true } },
      { type: 'tool-call', toolName: 't2', args: {}, result: { ok: false }, isError: true },
      { type: 'tool-call', toolName: 't3', args: {}, result: undefined },
    ];
    renderRow({ parts: p, isStreamingTail: true });

    expect(icon(0).getAttribute('data-status')).toBe('succeeded');
    expect(icon(1).getAttribute('data-status')).toBe('failed');
    expect(icon(2).getAttribute('data-status')).toBe('running');
  });

  it('marks a tool call that never produced a result as failed once the run ended', () => {
    const p: RunPartLike[] = [{ type: 'tool-call', toolName: 't1', args: {}, result: undefined }];
    renderRow({ parts: p, isStreamingTail: false });

    expect(icon(0).getAttribute('data-status')).toBe('failed');
  });

  it('renders no icon for hidden parts like updateWorkingMemory', () => {
    const p: RunPartLike[] = [
      { type: 'tool-call', toolName: 'updateWorkingMemory', args: {}, result: {} },
      { type: 'tool-call', toolName: 'visible_tool', args: {}, result: {} },
    ];
    renderRow({ parts: p });

    expect(screen.queryByTestId('part-run-icon-0')).toBeNull();
    expect(screen.getByTestId('part-run-icon-1')).toBeDefined();
  });
});
