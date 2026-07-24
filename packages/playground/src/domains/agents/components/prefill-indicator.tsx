import { useEffect, useState } from 'react';
import {
  activePrefillSlot,
  fetchPrefillSlots,
  formatPrefillLabel,
  PREFILL_POLL_INTERVAL_MS,
  prefillPercent,
} from '../prefill-status';
import type { PrefillSlot } from '../prefill-status';

export interface PrefillIndicatorViewProps {
  slot: PrefillSlot | null;
}

/** Presentational half, rendered only while a prompt is being prefilled. */
export const PrefillIndicatorView = ({ slot }: PrefillIndicatorViewProps) => {
  if (!slot) return null;

  const percent = prefillPercent(slot);
  const label = formatPrefillLabel(slot);

  return (
    <div className="max-w-3xl w-full mx-auto px-4 pb-2" data-testid="prefill-progress">
      <div className="flex items-center justify-between gap-2 pb-1 text-ui-sm text-neutral3">
        <span className="truncate">{label}</span>
        {percent !== null && <span className="shrink-0 tabular-nums">{percent}%</span>}
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-surface3"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
      >
        <div
          className={
            percent === null
              ? 'h-full w-1/4 animate-pulse rounded-full bg-accent1'
              : 'h-full rounded-full bg-accent1 transition-[width]'
          }
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Polls the prefill status endpoint while mounted; mount it only while a run
 * is in progress (ThreadPrimitive.If running) so idle threads never poll.
 */
export const PrefillIndicator = () => {
  const [slot, setSlot] = useState<PrefillSlot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const slots = await fetchPrefillSlots();
      if (!cancelled) setSlot(activePrefillSlot(slots));
    };
    void poll();
    const timer = setInterval(() => void poll(), PREFILL_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return <PrefillIndicatorView slot={slot} />;
};
