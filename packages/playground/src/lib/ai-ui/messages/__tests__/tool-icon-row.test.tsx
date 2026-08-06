// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { groupPartsIntoRuns } from '../part-runs';
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

  it('leaves a call with no result yet pending, never red, off the streaming tail', () => {
    // A tool executes with the message reading as complete: no text part is
    // streaming while a command runs, so the run is not the streaming tail.
    // That is why every in-flight command showed a failure dot.
    const p: RunPartLike[] = [{ type: 'tool-call', toolName: 't1', args: {}, result: undefined }];
    renderRow({ parts: p, isStreamingTail: false });

    expect(icon(0).getAttribute('data-status')).toBe('pending');
  });

  it('reads the sandbox exit record for command status, on a reloaded turn', () => {
    // Persisted shape from thread 1a299b82-6043-48b9-a298-df2898185450: the
    // failed commands carry a result string like any other, and the exit part
    // is what says they failed.
    const p: RunPartLike[] = [
      {
        type: 'tool-call',
        toolCallId: 'c1',
        toolName: 'mastra_workspace_execute_command',
        args: { command: 'uv pip install pandas openpyxl' },
        result: 'error: No virtual environment found\n\nExit code: 2',
      },
      { type: 'data', name: 'sandbox-exit', data: { exitCode: 2, success: false, toolCallId: 'c1' } } as RunPartLike,
      {
        type: 'tool-call',
        toolCallId: 'c2',
        toolName: 'mastra_workspace_execute_command',
        args: { command: 'uv venv .venv' },
        result: 'Installed 6 packages in 24.11s\n',
      },
      { type: 'data', name: 'sandbox-exit', data: { exitCode: 0, success: true, toolCallId: 'c2' } } as RunPartLike,
    ];
    renderRow({ parts: p, isStreamingTail: false });

    expect(icon(0).getAttribute('data-status')).toBe('failed');
    expect(icon(2).getAttribute('data-status')).toBe('succeeded');
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

  it('lets the icons flow and wrap like letters rather than scrolling sideways', () => {
    const p: RunPartLike[] = Array.from({ length: 12 }, (_, i) => ({
      type: 'tool-call',
      toolName: `tool_${i}`,
      args: {},
      result: { ok: true },
    }));
    renderRow({ parts: p });

    // Wrapping is wanted: the same icons redistribute across more or fewer
    // lines as the pane resizes. What must not happen is a sideways scroller.
    const strip = icon(0).parentElement!;
    expect(strip.className).toContain('flex-wrap');
    expect(strip.className).not.toContain('overflow-x-auto');
  });
});

/**
 * The staircase the product owner reported: "2, then 4, then 4, then 4, then 1
 * icon". Grouping is what decides how many row containers a message gets, so
 * this drives the real grouping function and renders a row per group exactly
 * as `MessagePrimitive.Unstable_PartsGrouped` does.
 */
describe('a turn of consecutive tool and reasoning parts', () => {
  const renderGroups = (parts: RunPartLike[]) =>
    render(
      <>
        {groupPartsIntoRuns(parts).map((group, g) =>
          group.groupKey === undefined ? (
            <div key={g} data-testid="ungrouped-part" />
          ) : (
            <ToolIconRowView key={g} parts={group.indices.map(i => parts[i]!)} isStreamingTail={false}>
              {group.indices.map(i => (
                <div key={i}>panel-{i}</div>
              ))}
            </ToolIconRowView>
          ),
        )}
      </>,
    );

  it('renders as ONE flow container, not a clump per burst', () => {
    // Shaped the way streaming delivers a sandbox command: the tool call, then
    // the data parts it emits while running — none of which render anything.
    const parts: RunPartLike[] = [
      { type: 'tool-call', toolName: 'execute_command', args: { command: 'ls' }, result: { ok: true } },
      { type: 'data', name: 'sandbox-stdout' } as RunPartLike,
      { type: 'data', name: 'sandbox-stdout' } as RunPartLike,
      { type: 'data', name: 'sandbox-exit' } as RunPartLike,
      { type: 'reasoning', text: 'now read it' },
      { type: 'tool-call', toolName: 'read_file', args: { path: '/a' }, result: { ok: true } },
      { type: 'data', name: 'sandbox-stdout' } as RunPartLike,
      { type: 'tool-call', toolName: 'edit_file', args: { path: '/a' }, result: { ok: true } },
    ];

    renderGroups(parts);

    expect(screen.getAllByTestId('part-run')).toHaveLength(1);
    // Four visible parts; the invisible data parts contribute no icons but do
    // not end the sequence either.
    expect(screen.getAllByTestId(/part-run-icon-/)).toHaveLength(4);
  });

  it('starts a second flow container only where real assistant text intervenes', () => {
    const parts: RunPartLike[] = [
      { type: 'tool-call', toolName: 'a', args: {}, result: { ok: true } },
      { type: 'data', name: 'sandbox-stdout' } as RunPartLike,
      { type: 'tool-call', toolName: 'b', args: {}, result: { ok: true } },
      { type: 'text', text: 'Here is what I found.' },
      { type: 'tool-call', toolName: 'c', args: {}, result: { ok: true } },
      { type: 'reasoning', text: 'wrapping up' },
    ];

    renderGroups(parts);

    expect(screen.getAllByTestId('part-run')).toHaveLength(2);
    expect(screen.getAllByTestId('ungrouped-part')).toHaveLength(1);
  });
});
