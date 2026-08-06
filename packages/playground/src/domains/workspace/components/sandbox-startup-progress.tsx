import { Spinner } from '@mastra/playground-ui';
import { useEffect, useState } from 'react';

import { SANDBOX_STATUS_POLL_INTERVAL_MS, fetchSandboxStatus, sandboxPercent } from '../sandbox-status';
import type { SandboxStatus } from '../sandbox-status';

export interface SandboxStartupProgressViewProps {
  status: SandboxStatus | null;
}

/**
 * Presentational half: the spinner the workspace page used to show on its own,
 * plus the current startup phase when the server can report one. With no
 * status it is exactly the old spinner, so a deployment without a remote
 * sandbox loses nothing.
 */
export const SandboxStartupProgressView = ({ status }: SandboxStartupProgressViewProps) => {
  if (!status) {
    return <Spinner />;
  }

  const percent = sandboxPercent(status);

  return (
    <div
      className="max-w-md w-full mx-auto px-4 grid justify-items-center gap-3"
      data-testid="sandbox-startup-progress"
    >
      <Spinner />
      <div className="flex w-full items-center justify-between gap-2 text-ui-sm text-neutral3">
        <span className="truncate" data-phase={status.phase}>
          {status.message}
        </span>
        {percent !== null && <span className="shrink-0 tabular-nums">{percent}%</span>}
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-surface3"
        role="progressbar"
        aria-label={status.message}
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
      <p className="text-ui-sm text-neutral3 text-center">
        The workspace is still starting. This can take a few minutes the first time it runs on a new machine.
      </p>
    </div>
  );
};

/**
 * Polls the sandbox startup endpoint while mounted; mount it only in place of
 * a loading spinner, so a ready workspace never polls.
 */
export const SandboxStartupProgress = ({ workspaceId }: { workspaceId?: string }) => {
  const [status, setStatus] = useState<SandboxStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const next = await fetchSandboxStatus({ workspaceId });
      if (!cancelled) setStatus(next);
    };
    void poll();
    const timer = setInterval(() => void poll(), SANDBOX_STATUS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [workspaceId]);

  return <SandboxStartupProgressView status={status} />;
};
