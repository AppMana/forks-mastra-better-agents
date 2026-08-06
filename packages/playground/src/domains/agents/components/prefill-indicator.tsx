import { useAuiState } from '@assistant-ui/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { advancePrefill, fetchPrefillSlots, IDLE_PREFILL_TRACKER, PREFILL_POLL_INTERVAL_MS } from '../prefill-status';
import type { PrefillProgress, PrefillTracker } from '../prefill-status';
import { SANDBOX_STATUS_POLL_INTERVAL_MS, fetchSandboxStatus } from '@/domains/workspace/sandbox-status';
import type { SandboxStatus } from '@/domains/workspace/sandbox-status';
import { activeToolLabel, isWaitingOnSandbox } from '@/lib/ai-ui/messages/run-part-status';
import type { RunPartLike } from '@/lib/ai-ui/messages/run-part-status';
import { useThreadRuntimeState } from '@/lib/ai-ui/thread-runtime-state';

export interface PrefillIndicatorViewProps {
  progress: PrefillProgress | null;
  /**
   * What the run is doing right now when it is not the model's turn — a
   * command executing, a file being read. It replaces the label rather than
   * joining it: this area is one line.
   */
  activity?: string | null;
}

/** How far the bar steps per observed advance, in percent of the track. */
const BAR_STEP_PERCENT = 6;
/** Width of the moving segment, so its travel stays inside the track. */
const BAR_SEGMENT_PERCENT = 25;

/**
 * Presentational half, shown from send until the first token. Once the run is
 * generating it renders nothing: the streamed message is its own progress.
 * Same bar, type scale and colours as the workspace sandbox startup progress,
 * so the two waits read as one idiom.
 *
 * One line of status, above the bar, and nothing else. The phase hint used to
 * be a second line below it, and in the queued phase the two said the same
 * thing twice — "Waiting for the model…" over "The request is waiting for the
 * model server." The label is the line worth keeping because it is the only
 * one carrying live numbers; the hint is static prose that never changes
 * within a phase. It is not rendered here at all, hover included.
 *
 * The bar is indeterminate on purpose. Neither the prompt's length nor the
 * reply's is known while it is being read or written, so any percentage would
 * be invented. What is real is that the counter moved, so the segment steps
 * along the track once per observed advance and holds still when nothing
 * advanced. It is a ticker, not a completion bar, which is why it carries no
 * `aria-valuenow` and no pulse.
 */
export const PrefillIndicatorView = ({ progress, activity }: PrefillIndicatorViewProps) => {
  if (!progress || progress.phase === 'generating') return null;

  const { percent, ticks } = progress;
  const label = activity ?? progress.label;
  const phase = activity ? 'executing' : progress.phase;
  const offset = (ticks * BAR_STEP_PERCENT) % (100 - BAR_SEGMENT_PERCENT);

  return (
    <div className="max-w-3xl w-full mx-auto px-4 pb-2" data-testid="prefill-progress" data-phase={phase}>
      <div
        className="flex items-center justify-between gap-2 pb-1 text-ui-sm text-neutral3"
        data-testid="prefill-status-line"
      >
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
          data-testid="prefill-bar-fill"
          className={
            percent === null
              ? 'relative h-full rounded-full bg-accent1 transition-[left] duration-500'
              : 'h-full rounded-full bg-accent1 transition-[width]'
          }
          style={percent === null ? { width: `${BAR_SEGMENT_PERCENT}%`, left: `${offset}%` } : { width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Polls the prefill status endpoint while mounted; mount it only while a run
 * is in progress (ThreadPrimitive.If running) so idle threads never poll.
 */
export const PrefillIndicator = ({ activity }: { activity?: string | null } = {}) => {
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

  return <PrefillIndicatorView progress={progress} activity={activity} />;
};

const EMPTY_PARTS: readonly RunPartLike[] = [];

/**
 * The sandbox's startup phase while a tool is waiting on the pod, or null.
 *
 * `enabled` gates the whole thing: a run that is not waiting on a sandbox must
 * not ask, both because the answer would be about some other sandbox and
 * because an idle thread has no business polling.
 */
const useSandboxStartupStatus = (enabled: boolean, threadId: string | undefined): SandboxStatus | null => {
  const [status, setStatus] = useState<SandboxStatus | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus(null);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      // Asked by CONVERSATION: the pod this run is waiting on is the
      // conversation's own, and a poll that does not name it is answered about
      // the user's thread-less workspace — an object no chat creates, which
      // reads as a workspace stuck at the first step of allocation.
      const next = await fetchSandboxStatus({ threadId });
      if (!cancelled) setStatus(next);
    };
    void poll();
    const timer = setInterval(() => void poll(), SANDBOX_STATUS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, threadId]);

  return status;
};

/**
 * The run progress area, mounted inside the thread.
 *
 * The poll alone cannot tell why no slot is busy: a request queued behind
 * another user and a request whose tool is halfway through `uv pip install`
 * both read as "no slot is processing". The live message says which, so the
 * line is taken from the run's own parts whenever a tool is in flight.
 */
export const RunProgressIndicator = () => {
  const messages = useAuiState(state => state.thread.messages);
  const parts = useMemo(() => {
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return EMPTY_PARTS;
    return last.content as unknown as readonly RunPartLike[];
  }, [messages]);

  // Only the three sandbox tools can be waiting on a pod, so only they poll.
  // A `write_file` is WebDAV: it never starts a sandbox, and reporting one
  // would point at the wrong thing entirely.
  const { threadId } = useThreadRuntimeState();
  const sandbox = useSandboxStartupStatus(isWaitingOnSandbox(parts), threadId);
  const activity = activeToolLabel(parts, sandbox);

  return <PrefillIndicator activity={activity} />;
};
