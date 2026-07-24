/**
 * Prefill progress for the chat thread: long prompts (100k+ tokens) can spend
 * minutes in prompt processing before the first streamed token, which
 * otherwise looks like a hang. The server proxies llama-server's /slots
 * counters at /dragon/inference/prefill-status.
 */

export interface PrefillSlot {
  id: number;
  processing: boolean;
  promptProcessed: number;
  promptTotal: number;
  generated: number;
}

export const PREFILL_STATUS_URL = '/dragon/inference/prefill-status';
export const PREFILL_POLL_INTERVAL_MS = 1500;

/** The slot still prefilling the prompt, or null once decode has started. */
export function activePrefillSlot(slots: PrefillSlot[]): PrefillSlot | null {
  return slots.find(slot => slot.processing && slot.generated === 0 && slot.promptProcessed > 0) ?? null;
}

/** Percent complete, or null when the total is unknown. */
export function prefillPercent(slot: PrefillSlot): number | null {
  if (slot.promptTotal <= 0 || slot.promptProcessed > slot.promptTotal) return null;
  return Math.min(100, Math.round((slot.promptProcessed / slot.promptTotal) * 100));
}

export function formatPrefillLabel(slot: PrefillSlot): string {
  const processed = slot.promptProcessed.toLocaleString('en-US');
  if (prefillPercent(slot) === null) return `Processing prompt… ${processed} tokens`;
  return `Processing prompt… ${processed} / ${slot.promptTotal.toLocaleString('en-US')} tokens`;
}

export async function fetchPrefillSlots(fetchImpl: typeof fetch = fetch): Promise<PrefillSlot[]> {
  try {
    const response = await fetchImpl(PREFILL_STATUS_URL, { credentials: 'include' });
    if (!response.ok) return [];
    const body = (await response.json()) as { slots?: PrefillSlot[] };
    return Array.isArray(body.slots) ? body.slots : [];
  } catch {
    return [];
  }
}
