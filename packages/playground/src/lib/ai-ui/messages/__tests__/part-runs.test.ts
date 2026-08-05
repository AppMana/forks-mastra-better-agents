import { describe, expect, it } from 'vitest';

import { groupPartsIntoRuns, isHiddenRunPart, isRunPart } from '../part-runs';

const tool = (toolName = 'some_tool') => ({ type: 'tool-call', toolName });
const reasoning = () => ({ type: 'reasoning', text: 'thinking' });
const text = () => ({ type: 'text', text: 'hello' });
const data = () => ({ type: 'data', name: 'signal' });

describe('isRunPart', () => {
  it('accepts tool calls and reasoning, rejects everything else', () => {
    expect(isRunPart(tool())).toBe(true);
    expect(isRunPart(reasoning())).toBe(true);
    expect(isRunPart(text())).toBe(false);
    expect(isRunPart(data())).toBe(false);
  });
});

describe('groupPartsIntoRuns', () => {
  it('groups a contiguous interleaving of reasoning and tool calls into one run', () => {
    const groups = groupPartsIntoRuns([reasoning(), tool('read_file'), tool('write_file')]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.groupKey).toBeTruthy();
    expect(groups[0]?.indices).toEqual([0, 1, 2]);
  });

  it('breaks the run at a text part and starts a new run after it', () => {
    const groups = groupPartsIntoRuns([tool(), text(), tool(), reasoning()]);

    expect(groups.map(g => g.indices)).toEqual([[0], [1], [2, 3]]);
    expect(groups[0]?.groupKey).toBeTruthy();
    expect(groups[1]?.groupKey).toBeUndefined();
    expect(groups[2]?.groupKey).toBeTruthy();
    expect(groups[2]?.groupKey).not.toBe(groups[0]?.groupKey);
  });

  it('treats data parts as run breakers too', () => {
    const groups = groupPartsIntoRuns([tool(), data(), tool()]);

    expect(groups.map(g => g.indices)).toEqual([[0], [1], [2]]);
    expect(groups[1]?.groupKey).toBeUndefined();
  });

  /**
   * The staircase the product owner saw: "2, then 4, then 4, then 4, then 1
   * icon". A sandbox command emits `data-sandbox-stdout` parts while it runs,
   * and those parts render nothing at all — only `signal` and `attachment`
   * have renderers in assistant-message.tsx. Letting them close a run split
   * one uninterrupted sequence of tool calls into a column of short rows.
   */
  it('keeps one run across the non-rendering data parts a sandbox command emits', () => {
    const stdout = () => ({ type: 'data', name: 'sandbox-stdout' });
    const exit = () => ({ type: 'data', name: 'sandbox-exit' });
    const parts = [
      tool('execute_command'),
      stdout(),
      stdout(),
      exit(),
      tool('read_file'),
      reasoning(),
      stdout(),
      tool('edit_file'),
    ];

    const runs = groupPartsIntoRuns(parts).filter(g => g.groupKey !== undefined);

    expect(runs).toHaveLength(1);
    expect(runs[0]?.indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('still starts a new run after visible assistant text', () => {
    const stdout = () => ({ type: 'data', name: 'sandbox-stdout' });
    const parts = [tool('a'), stdout(), tool('b'), text(), tool('c'), stdout(), reasoning()];

    const runs = groupPartsIntoRuns(parts).filter(g => g.groupKey !== undefined);

    // Two runs, split only by the text — never by the invisible data parts.
    expect(runs.map(r => r.indices)).toEqual([
      [0, 1, 2],
      [4, 5, 6],
    ]);
  });

  it('leaves text-only messages entirely ungrouped', () => {
    const groups = groupPartsIntoRuns([text(), text()]);

    expect(groups.map(g => g.indices)).toEqual([[0], [1]]);
    expect(groups.every(g => g.groupKey === undefined)).toBe(true);
  });

  it('returns no groups for an empty message', () => {
    expect(groupPartsIntoRuns([])).toEqual([]);
  });

  it('covers every part index exactly once, in order', () => {
    const parts = [reasoning(), tool(), text(), tool(), data(), reasoning(), tool()];
    const groups = groupPartsIntoRuns(parts);

    const flat = groups.flatMap(g => g.indices);
    expect(flat).toEqual(parts.map((_, i) => i));
  });

  it('makes a singleton run out of a lone tool call so rendering stays uniform', () => {
    const groups = groupPartsIntoRuns([text(), tool(), text()]);

    expect(groups.map(g => g.indices)).toEqual([[0], [1], [2]]);
    expect(groups[1]?.groupKey).toBeTruthy();
  });
});

describe('isHiddenRunPart', () => {
  it('hides updateWorkingMemory, which renders nothing', () => {
    expect(isHiddenRunPart(tool('updateWorkingMemory'))).toBe(true);
  });

  it('keeps ordinary tool calls and reasoning visible', () => {
    expect(isHiddenRunPart(tool('read_file'))).toBe(false);
    expect(isHiddenRunPart(reasoning())).toBe(false);
  });

  it('hides the data parts nothing renders, and only those', () => {
    // assistant-message.tsx maps `signal` and `attachment` to components; a
    // data part with no entry there renders nothing at all.
    expect(isHiddenRunPart({ type: 'data', name: 'sandbox-stdout' })).toBe(true);
    expect(isHiddenRunPart({ type: 'data', name: 'sandbox-stderr' })).toBe(true);
    expect(isHiddenRunPart({ type: 'data', name: 'sandbox-exit' })).toBe(true);
    expect(isHiddenRunPart({ type: 'data', name: 'signal' })).toBe(false);
    expect(isHiddenRunPart({ type: 'data', name: 'attachment' })).toBe(false);
  });

  it('hides step markers, which are stream bookkeeping rather than content', () => {
    expect(isHiddenRunPart({ type: 'step-start' })).toBe(true);
  });
});

describe('attachment parts', () => {
  it('render at the end of the reply, wherever the tool emitted them', () => {
    const parts = [
      { type: 'reasoning' },
      { type: 'tool-call', toolName: 'attach_file' },
      { type: 'data', name: 'attachment' },
      { type: 'text', text: 'Here is the report.' },
    ];

    const groups = groupPartsIntoRuns(parts);
    const flat = groups.flatMap(group => group.indices);

    // Every index exactly once, attachment (index 2) LAST.
    expect([...flat].sort()).toEqual([0, 1, 2, 3]);
    expect(flat[flat.length - 1]).toBe(2);
  });

  it('do not break the icon strip around them', () => {
    const parts = [
      { type: 'tool-call', toolName: 'a' },
      { type: 'data', name: 'attachment' },
      { type: 'tool-call', toolName: 'b' },
    ];

    const groups = groupPartsIntoRuns(parts);
    const runs = groups.filter(group => group.groupKey !== undefined);

    expect(runs).toHaveLength(1);
    expect(runs[0]!.indices).toEqual([0, 2]);
  });
});
