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
  name?: string;
}

/**
 * Attached-file parts are emitted mid-run, wherever the attach tool happened to
 * execute — but a download link belongs at the END of the reply, after the
 * prose that explains it, the way a person attaches a file to a message.
 */
function isAttachmentPart(part: PartLike): boolean {
  return part.type === 'data' && part.name === 'attachment';
}

export function isRunPart(part: PartLike): boolean {
  return part.type === 'tool-call' || part.type === 'reasoning';
}

/** Data parts with a renderer in assistant-message.tsx. The rest draw nothing. */
const RENDERED_DATA_PARTS: ReadonlySet<string> = new Set(['signal', 'attachment']);

/** Part types that put something on screen in their own right. */
const VISIBLE_PART_TYPES: ReadonlySet<string> = new Set(['text', 'tool-call', 'reasoning', 'source', 'file', 'image']);

/**
 * Parts that render nothing get no icon in the row — an icon that expands to an
 * empty panel would be a dead control. They stay inside the run so they cannot
 * split one row into two.
 *
 * This is the whole of the staircase bug. A sandbox command emits a stream of
 * `data-sandbox-stdout` parts while it runs, and `assistant-message.tsx` maps
 * only `signal` and `attachment` to components — every other data part draws
 * nothing whatsoever, yet each one used to close the open run. One
 * uninterrupted sequence of tool calls came out as a column of two- and
 * four-icon rows. Whitespace-only text and step markers are the same story.
 *
 * So the rule is invisibility, not type: only a part the user can actually see
 * is allowed to end a run.
 */
export function isHiddenRunPart(part: PartLike): boolean {
  if (part.type === 'tool-call' && part.toolName === 'updateWorkingMemory') return true;
  if (part.type === 'text') return (part.text ?? '').trim() === '';
  if (part.type === 'data') return !RENDERED_DATA_PARTS.has(part.name ?? '');
  return !VISIBLE_PART_TYPES.has(part.type);
}

/**
 * Grouping function in the shape `MessagePrimitive.Unstable_PartsGrouped`
 * expects: every index appears exactly once, in order. Runs get a key derived
 * from their first index (stable while streaming appends parts); breakers stay
 * ungrouped (`groupKey: undefined`) and render exactly as before.
 */
export function groupPartsIntoRuns(parts: readonly PartLike[]): PartRun[] {
  const groups: PartRun[] = [];
  const attachments: PartRun[] = [];
  let run: PartRun | null = null;

  parts.forEach((part, index) => {
    if (isAttachmentPart(part)) {
      // Does not break the surrounding run either: the strip stays whole and
      // the link renders after everything else.
      attachments.push({ groupKey: undefined, indices: [index] });
      return;
    }
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

  return [...groups, ...attachments];
}
