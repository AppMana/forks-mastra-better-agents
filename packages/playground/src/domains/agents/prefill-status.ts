/**
 * Run progress for the chat thread, from send until the first streamed token.
 *
 * A large attachment plus a question can put tens of thousands of tokens in
 * front of the model, and the whole prompt is read before a single word comes
 * back. On a single consumer GPU that is minutes of silence, which is
 * indistinguishable from a crash. The server proxies llama-server's `/slots`
 * counters at `<app route prefix>/inference/prefill-status`; this turns a poll
 * of them into a phase the thread can render.
 *
 * Why a phase and not just a token count: llama-server keeps `n_decoded` from
 * the *previous* request on a slot for the whole of the next request's
 * prefill, so "has this run started generating?" cannot be read off the token
 * counters. `decoding` (from `has_next_token`) is the only reliable signal,
 * and `taskId` identifies which request the counters describe — which is also
 * what makes a genuine stall detectable.
 */

import { appRoute } from '@/lib/app-routes';

export interface PrefillSlot {
  id: number;
  taskId: number;
  processing: boolean;
  decoding: boolean;
  promptProcessed: number;
  promptCached: number;
  contextUsed: number;
  contextSize: number;
  generated: number;
}

export type PrefillPhase =
  /** Accepted by the app, not yet picked up by the model server. */
  | 'queued'
  /** The model is reading the prompt; no output can exist yet. */
  | 'prefilling'
  /** Tokens are streaming — the message itself is the feedback. */
  | 'generating'
  /** Still prefilling, but the counters have not moved for a long time. */
  | 'stalled';

export interface PrefillProgress {
  phase: PrefillPhase;
  /** One line naming what is happening, with counts when they exist. */
  label: string;
  /** One line explaining why it takes this long, or null. */
  hint: string | null;
  /** Prompt size against the context window, or null when unknown. */
  percent: number | null;
  tokens: number;
  contextSize: number;
}

/** Progress between polls, so a stall can be told from slow progress. */
export interface PrefillTracker {
  taskId: number | null;
  tokens: number;
  changedAt: number;
}

export const PREFILL_POLL_INTERVAL_MS = 1500;
/** How long the counters may sit still before the run is called stalled. */
export const PREFILL_STALL_AFTER_MS = 45_000;

export const IDLE_PREFILL_TRACKER: PrefillTracker = { taskId: null, tokens: -1, changedAt: 0 };

const QUEUED_HINT = 'The request is waiting for the model server.';
const PREFILL_HINT = 'The whole prompt is read before the first word appears. A large document can take minutes.';
const STALL_HINT = 'No progress has been reported for a while. The request is still open.';

export const prefillStatusUrl = () => appRoute('/inference/prefill-status');

/** The slot running a request, or null when every slot is idle. */
export function activePrefillSlot(slots: PrefillSlot[]): PrefillSlot | null {
  return slots.find(slot => slot.processing) ?? null;
}

/** Prompt tokens sitting in the slot, cached prefix included. */
export function prefillTokens(slot: PrefillSlot): number {
  const counted = slot.promptCached + slot.promptProcessed;
  return counted > 0 ? counted : slot.contextUsed;
}

/** How full the context window is, or null when the backend omits `n_ctx`. */
export function prefillPercent(tokens: number, contextSize: number): number | null {
  if (contextSize <= 0 || tokens <= 0) return null;
  return Math.min(100, Math.round((tokens / contextSize) * 100));
}

function prefillLabel(tokens: number, contextSize: number): string {
  if (tokens <= 0) return 'Reading your prompt…';
  const read = tokens.toLocaleString('en-US');
  if (contextSize <= 0) return `Reading your prompt… ${read} tokens`;
  return `Reading your prompt… ${read} of ${contextSize.toLocaleString('en-US')} context tokens`;
}

/**
 * Fold one poll into the running progress state. Pure so the phase machine —
 * especially the stall timer — is testable without a clock or a network.
 */
export function advancePrefill(
  slots: PrefillSlot[],
  tracker: PrefillTracker,
  now: number,
): { tracker: PrefillTracker; progress: PrefillProgress } {
  const slot = activePrefillSlot(slots);

  if (!slot) {
    return {
      tracker: IDLE_PREFILL_TRACKER,
      progress: {
        phase: 'queued',
        label: 'Waiting for the model…',
        hint: QUEUED_HINT,
        percent: null,
        tokens: 0,
        contextSize: 0,
      },
    };
  }

  const tokens = prefillTokens(slot);
  const moved = tracker.taskId !== slot.taskId || tracker.tokens !== tokens;
  const next: PrefillTracker = moved ? { taskId: slot.taskId, tokens, changedAt: now } : tracker;

  if (slot.decoding) {
    return {
      tracker: next,
      progress: {
        phase: 'generating',
        label: 'Generating…',
        hint: null,
        percent: null,
        tokens,
        contextSize: slot.contextSize,
      },
    };
  }

  const stalled = !moved && now - next.changedAt >= PREFILL_STALL_AFTER_MS;
  return {
    tracker: next,
    progress: {
      phase: stalled ? 'stalled' : 'prefilling',
      label: stalled ? 'Still reading your prompt…' : prefillLabel(tokens, slot.contextSize),
      hint: stalled ? STALL_HINT : PREFILL_HINT,
      percent: stalled ? null : prefillPercent(tokens, slot.contextSize),
      tokens,
      contextSize: slot.contextSize,
    },
  };
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Coerce one slot off the wire. Counters are arithmetic inputs, so a field the
 * backend does not report has to read as 0 rather than poison the sums.
 */
export function readPrefillSlot(raw: Partial<PrefillSlot>): PrefillSlot {
  return {
    id: count(raw.id),
    taskId: count(raw.taskId),
    processing: Boolean(raw.processing),
    decoding: Boolean(raw.decoding),
    promptProcessed: count(raw.promptProcessed),
    promptCached: count(raw.promptCached),
    contextUsed: count(raw.contextUsed),
    contextSize: count(raw.contextSize),
    generated: count(raw.generated),
  };
}

export async function fetchPrefillSlots(fetchImpl: typeof fetch = fetch): Promise<PrefillSlot[]> {
  try {
    const response = await fetchImpl(prefillStatusUrl(), { credentials: 'include' });
    if (!response.ok) return [];
    const body = (await response.json()) as { slots?: Partial<PrefillSlot>[] };
    return Array.isArray(body.slots) ? body.slots.map(readPrefillSlot) : [];
  } catch {
    return [];
  }
}
