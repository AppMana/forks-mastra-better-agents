// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useRangeSelection } from '../use-range-selection';

const FILES = ['a.txt', 'b.txt', 'c.txt', 'd.txt', 'e.txt'];

describe('useRangeSelection', () => {
  it('selects one file on a plain click', () => {
    const { result } = renderHook(() => useRangeSelection(FILES));

    act(() => result.current.select('b.txt'));

    expect(result.current.selected).toEqual(['b.txt']);
  });

  it('replaces the selection on the next plain click', () => {
    const { result } = renderHook(() => useRangeSelection(FILES));

    act(() => result.current.select('b.txt'));
    act(() => result.current.select('d.txt'));

    expect(result.current.selected).toEqual(['d.txt']);
  });

  it('selects an inclusive range on shift-click', () => {
    const { result } = renderHook(() => useRangeSelection(FILES));

    act(() => result.current.select('b.txt'));
    act(() => result.current.select('d.txt', { shiftKey: true }));

    expect(result.current.selected).toEqual(['b.txt', 'c.txt', 'd.txt']);
  });

  it('selects a range dragged upwards just the same', () => {
    const { result } = renderHook(() => useRangeSelection(FILES));

    act(() => result.current.select('d.txt'));
    act(() => result.current.select('b.txt', { shiftKey: true }));

    expect(result.current.selected).toEqual(['b.txt', 'c.txt', 'd.txt']);
  });

  it('re-extends from the same anchor, not from the last range end', () => {
    const { result } = renderHook(() => useRangeSelection(FILES));

    act(() => result.current.select('b.txt'));
    act(() => result.current.select('d.txt', { shiftKey: true }));
    act(() => result.current.select('c.txt', { shiftKey: true }));

    // Still anchored on b: shrinking the range does not strand d out of it.
    expect(result.current.selected).toContain('b.txt');
    expect(result.current.selected).toContain('c.txt');
  });

  it('toggles a single file with ctrl or cmd, keeping the rest', () => {
    const { result } = renderHook(() => useRangeSelection(FILES));

    act(() => result.current.select('a.txt'));
    act(() => result.current.select('c.txt', { ctrlKey: true }));
    act(() => result.current.select('e.txt', { metaKey: true }));

    expect(result.current.selected).toEqual(['a.txt', 'c.txt', 'e.txt']);
  });

  it('un-toggles a file that was already selected', () => {
    const { result } = renderHook(() => useRangeSelection(FILES));

    act(() => result.current.select('a.txt'));
    act(() => result.current.select('c.txt', { ctrlKey: true }));
    act(() => result.current.select('c.txt', { ctrlKey: true }));

    expect(result.current.selected).toEqual(['a.txt']);
  });

  it('extends from a ctrl-clicked row, which is where the anchor moved', () => {
    const { result } = renderHook(() => useRangeSelection(FILES));

    act(() => result.current.select('a.txt'));
    act(() => result.current.select('c.txt', { ctrlKey: true }));
    act(() => result.current.select('e.txt', { shiftKey: true }));

    expect(result.current.selected).toEqual(['a.txt', 'c.txt', 'd.txt', 'e.txt']);
  });

  it('treats shift with no prior click as an ordinary click', () => {
    const { result } = renderHook(() => useRangeSelection(FILES));

    act(() => result.current.select('c.txt', { shiftKey: true }));

    expect(result.current.selected).toEqual(['c.txt']);
  });

  it('clears everything, including the anchor', () => {
    const { result } = renderHook(() => useRangeSelection(FILES));

    act(() => result.current.select('b.txt'));
    act(() => result.current.clear());
    act(() => result.current.select('d.txt', { shiftKey: true }));

    // No anchor survived the clear, so this is a plain selection.
    expect(result.current.selected).toEqual(['d.txt']);
  });

  it('reports membership', () => {
    const { result } = renderHook(() => useRangeSelection(FILES));

    act(() => result.current.select('b.txt'));

    expect(result.current.isSelected('b.txt')).toBe(true);
    expect(result.current.isSelected('a.txt')).toBe(false);
  });
});
