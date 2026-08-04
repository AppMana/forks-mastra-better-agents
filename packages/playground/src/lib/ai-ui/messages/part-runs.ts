/**
 * Grouping of assistant-message parts into contiguous "runs".
 *
 * A run is an unbroken sequence of tool calls and reasoning parts. Runs render
 * as one compact row of icons (see tool-icon-row.tsx) instead of a stack of
 * collapsible boxes. Any other part — text above all — breaks the run: parts
 * after it start a new run.
 *
 * Kept as pure functions, apart from the components, so the grouping is
 * testable without React.
 */

export interface PartRun {
  groupKey: string | undefined;
  indices: number[];
}

interface PartLike {
  type: string;
  toolName?: string;
  text?: string;
}

export function isRunPart(part: PartLike): boolean {
  return part.type === 'tool-call' || part.type === 'reasoning';
}

/**
 * Parts that render nothing (ToolFallback returns null for them) get no icon
 * in the row — an icon that expands to an empty panel would be a dead control.
 * They still stay inside the run so they don't split one row into two.
 *
 * Whitespace-only text is here too: models routinely emit an empty text part
 * between tool calls, and treating those as breakers shredded one logical run
 * into a stack of one- and two-icon rows — which read as broken columns, the
 * opposite of the single flowing strip this exists to provide.
 */
export function isHiddenRunPart(part: PartLike): boolean {
  if (part.type === 'tool-call' && part.toolName === 'updateWorkingMemory') return true;
  if (part.type === 'text' && (part.text ?? '').trim() === '') return true;
  return false;
}

/**
 * Grouping function in the shape `MessagePrimitive.Unstable_PartsGrouped`
 * expects: every index appears exactly once, in order. Runs get a key derived
 * from their first index (stable while streaming appends parts); breakers stay
 * ungrouped (`groupKey: undefined`) and render exactly as before.
 */
export function groupPartsIntoRuns(parts: readonly PartLike[]): PartRun[] {
  const groups: PartRun[] = [];
  let run: PartRun | null = null;

  parts.forEach((part, index) => {
    if (isRunPart(part) || (run && isHiddenRunPart(part))) {
      if (!run) {
        run = { groupKey: `run-${index}`, indices: [] };
        groups.push(run);
      }
      run.indices.push(index);
    } else if (isHiddenRunPart(part)) {
      // Hidden part with no run open yet: keep it ungrouped rather than
      // opening a run that might contain nothing visible.
      groups.push({ groupKey: undefined, indices: [index] });
    } else {
      run = null;
      groups.push({ groupKey: undefined, indices: [index] });
    }
  });

  return groups;
}
