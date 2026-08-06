import { useMastraClient } from '@mastra/react';
import { useEffect, useRef } from 'react';

import { isUntitledThreadName, THREAD_TITLE_POLL_ATTEMPTS, THREAD_TITLE_POLL_INTERVAL_MS } from './thread-title';

/**
 * Waits for the title the agent generates in the background.
 *
 * The agent fires title generation and does not await it, so the title is
 * persisted some time AFTER the stream closes. Refreshing the thread list on
 * the `finish` chunk is therefore always too early, and the sidebar keeps
 * showing the creation timestamp until some later turn happens to refresh it.
 *
 * So watch for it instead, and stop the moment it lands. The watch is bounded:
 * a run that was interrupted never reaches title generation at all, and that
 * thread must stop polling rather than poll for the life of the page. It is
 * also cancelled on unmount, so nothing here reaches a view that has gone away.
 *
 * `token` arms the watch. Bump it whenever a turn has been submitted for this
 * thread, whether the turn finished or the user interrupted it; both surface
 * the title through this one path.
 */
export const useThreadTitlePoll = ({
  agentId,
  threadId,
  token,
  refreshThreadList,
}: {
  agentId: string;
  threadId?: string;
  token: number;
  refreshThreadList?: () => void | Promise<void>;
}) => {
  const client = useMastraClient();

  // The page owns this callback and is free to hand over a new identity on
  // every render; reading it through a ref keeps that from restarting the
  // watch and resetting the attempt budget.
  const refreshRef = useRef(refreshThreadList);
  refreshRef.current = refreshThreadList;

  useEffect(() => {
    if (!token || !threadId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attemptsLeft = THREAD_TITLE_POLL_ATTEMPTS;

    const poll = async () => {
      const thread = await client.getMemoryThread({ threadId, agentId }).get();
      if (cancelled) return;

      if (!isUntitledThreadName(thread?.title)) {
        await refreshRef.current?.();
        return;
      }

      attemptsLeft -= 1;
      if (attemptsLeft <= 0) return;
      schedule();
    };

    // A poll that fails ends the watch: the title is a nicety, and retrying a
    // dead endpoint for half a minute is not.
    const schedule = () => {
      timer = setTimeout(() => void poll().catch(() => {}), THREAD_TITLE_POLL_INTERVAL_MS);
    };

    schedule();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [agentId, client, threadId, token]);
};
