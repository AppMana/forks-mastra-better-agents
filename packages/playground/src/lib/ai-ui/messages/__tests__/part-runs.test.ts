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
});
