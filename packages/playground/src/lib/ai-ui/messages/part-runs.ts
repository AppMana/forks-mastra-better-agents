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
}

export function isRunPart(part: PartLike): boolean {
  return part.type === 'tool-call' || part.type === 'reasoning';
}

/**
 * Parts that render nothing (ToolFallback returns null for them) get no icon
 * in the row — an icon that expands to an empty panel would be a dead control.
 * They still stay inside the run so they don't split one row into two.
 */
export function isHiddenRunPart(part: PartLike): boolean {
  return part.type === 'tool-call' && part.toolName === 'updateWorkingMemory';
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
    if (isRunPart(part)) {
      if (!run) {
        run = { groupKey: `run-${index}`, indices: [] };
        groups.push(run);
      }
      run.indices.push(index);
    } else {
      run = null;
      groups.push({ groupKey: undefined, indices: [index] });
    }
  });

  return groups;
}
