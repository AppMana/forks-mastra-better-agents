/**
 * Startup progress for a remote workspace sandbox: the first request against a
 * suspended sandbox can spend minutes being allocated, scheduled, given
 * storage and given its image before it answers, which behind a bare spinner
 * is indistinguishable from a hang. The server publishes the phase at
 * `<app route prefix>/workspace/sandbox-status`, the same transport and
 * polling shape as the chat thread's prefill indicator.
 *
 * The endpoint is optional: a deployment without a remote sandbox answers
 * `{ status: null }` and the UI falls back to its plain spinner.
 */

import { appRoute } from '@/lib/app-routes';

export interface SandboxStatus {
  /** Server-defined phase name; used only as a React key and a test hook. */
  phase: string;
  /** Ready-to-render sentence describing the current phase. */
  message: string;
  /** Position in the startup sequence; negative when the sandbox errored. */
  step: number;
  /** Position of the final phase, so `step / totalSteps` is the fraction done. */
  totalSteps: number;
  ready: boolean;
}

export const sandboxStatusUrl = (workspaceId?: string) =>
  workspaceId
    ? `${appRoute('/workspace/sandbox-status')}?workspaceId=${encodeURIComponent(workspaceId)}`
    : appRoute('/workspace/sandbox-status');

export const SANDBOX_STATUS_POLL_INTERVAL_MS = 2000;

/** Percent complete, or null when the phase is outside the sequence (an error). */
export function sandboxPercent(status: SandboxStatus): number | null {
  if (status.step < 0 || status.totalSteps <= 0) return null;
  return Math.min(100, Math.round((status.step / status.totalSteps) * 100));
}

export async function fetchSandboxStatus(
  workspaceId?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SandboxStatus | null> {
  try {
    const response = await fetchImpl(sandboxStatusUrl(workspaceId), { credentials: 'include' });
    if (!response.ok) return null;
    const body = (await response.json()) as { status?: SandboxStatus | null };
    const status = body.status;
    if (!status || typeof status.message !== 'string') return null;
    return status;
  } catch {
    return null;
  }
}
