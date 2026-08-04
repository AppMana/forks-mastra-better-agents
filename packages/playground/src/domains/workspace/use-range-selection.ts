import { useCallback, useRef, useState } from 'react';

/**
 * List selection with the conventions every file manager already uses:
 * click to select one, shift-click to select a range, ctrl/cmd-click to toggle
 * one without losing the rest.
 *
 * Written as a hook rather than pulled from a table library because the file
 * browser is a plain list with its own row rendering, drag handling and context
 * menus — adopting a grid component to get range selection would mean
 * rewriting all of that around someone else's row model. The selection rule is
 * about thirty lines; the integration would not be.
 *
 * The anchor is the last row selected WITHOUT shift, which is what makes a
 * second shift-click re-extend from the same origin rather than from wherever
 * the previous range happened to end.
 */
export interface RangeSelectionModifiers {
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

export function useRangeSelection(items: string[]) {
  const [selected, setSelected] = useState<string[]>([]);
  const anchorRef = useRef<string | null>(null);

  const select = useCallback(
    (item: string, modifiers: RangeSelectionModifiers = {}) => {
      const toggle = Boolean(modifiers.ctrlKey || modifiers.metaKey);

      if (modifiers.shiftKey && anchorRef.current !== null) {
        const from = items.indexOf(anchorRef.current);
        const to = items.indexOf(item);
        if (from !== -1 && to !== -1) {
          const [start, end] = from <= to ? [from, to] : [to, from];
          const range = items.slice(start, end + 1);
          // Shift EXTENDS: an existing ctrl-built selection is kept, so
          // ctrl-click a few, then shift-click, behaves as people expect.
          // Returned in LIST order regardless of click order, so anything
          // iterating the selection (bulk delete, move) sees the rows in the
          // order the user sees them.
          setSelected(previous => {
            const union = new Set([...previous, ...range]);
            return items.filter(entry => union.has(entry));
          });
          return;
        }
      }

      // Anchor moves on any non-shift click, including a ctrl-click, so the
      // next shift-click extends from the row just touched.
      anchorRef.current = item;

      if (toggle) {
        setSelected(previous =>
          previous.includes(item) ? previous.filter(entry => entry !== item) : [...previous, item],
        );
        return;
      }

      setSelected([item]);
    },
    [items],
  );

  const clear = useCallback(() => {
    setSelected([]);
    anchorRef.current = null;
  }, []);

  const isSelected = useCallback((item: string) => selected.includes(item), [selected]);

  return { selected, select, clear, isSelected };
}
