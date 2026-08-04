import { useEffect, useRef, useState } from 'react';

import { advancePrefill, fetchPrefillSlots, IDLE_PREFILL_TRACKER, PREFILL_POLL_INTERVAL_MS } from '../prefill-status';
import type { PrefillProgress, PrefillTracker } from '../prefill-status';

export interface PrefillIndicatorViewProps {
  progress: PrefillProgress | null;
}

/**
 * Presentational half, shown from send until the first token. Once the run is
 * generating it renders nothing: the streamed message is its own progress.
 * Same bar, type scale and colours as the workspace sandbox startup progress,
 * so the two waits read as one idiom.
 */
export const PrefillIndicatorView = ({ progress }: PrefillIndicatorViewProps) => {
  if (!progress || progress.phase === 'generating') return null;

  const { label, hint, percent } = progress;

  return (
    <div className="max-w-3xl w-full mx-auto px-4 pb-2" data-testid="prefill-progress" data-phase={progress.phase}>
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
      {hint && <p className="pt-1 text-ui-sm text-neutral3">{hint}</p>}
    </div>
  );
};

/**
 * Polls the prefill status endpoint while mounted; mount it only while a run
 * is in progress (ThreadPrimitive.If running) so idle threads never poll.
 */
export const PrefillIndicator = () => {
  // Start in the queued phase rather than blank: the first poll is a round
  // trip away, and the point of this indicator is that send is never silent.
  const [progress, setProgress] = useState<PrefillProgress>(() => advancePrefill([], IDLE_PREFILL_TRACKER, 0).progress);
  const tracker = useRef<PrefillTracker>(IDLE_PREFILL_TRACKER);

  useEffect(() => {
    let cancelled = false;
    tracker.current = IDLE_PREFILL_TRACKER;
    const poll = async () => {
      const slots = await fetchPrefillSlots();
      if (cancelled) return;
      const next = advancePrefill(slots, tracker.current, Date.now());
      tracker.current = next.tracker;
      setProgress(next.progress);
    };
    void poll();
    const timer = setInterval(() => void poll(), PREFILL_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return <PrefillIndicatorView progress={progress} />;
};
