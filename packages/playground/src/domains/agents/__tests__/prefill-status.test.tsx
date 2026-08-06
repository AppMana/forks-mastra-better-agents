// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

const auiMessages = vi.hoisted(() => ({ current: [] as unknown[] }));

vi.mock('@assistant-ui/react', () => ({
  useAuiState: (selector: (state: { thread: { messages: unknown[] } }) => unknown) =>
    selector({ thread: { messages: auiMessages.current } }),
}));

import { PrefillIndicator, PrefillIndicatorView, RunProgressIndicator } from '../components/prefill-indicator';
import {
  activePrefillSlot,
  advancePrefill,
  fetchPrefillSlots,
  IDLE_PREFILL_TRACKER,
  PREFILL_STALL_AFTER_MS,
  contextFillPercent,
  prefillStatusUrl,
} from '../prefill-status';
import type { PrefillSlot } from '../prefill-status';
import { sandboxStatusUrl } from '@/domains/workspace/sandbox-status';
import { ThreadRuntimeStateProvider } from '@/lib/ai-ui/thread-runtime-state';
import type { ThreadRuntimeState } from '@/lib/ai-ui/thread-runtime-state';
import { server } from '@/test/msw-server';

afterEach(cleanup);

/**
 * Shaped after a live llama-server slot mid-prefill: 22,488 prompt tokens into
 * a 147,456-token context window, with `generated` still carrying the
 * *previous* request's count because llama-server does not reset it when a
 * slot takes its next request. That stale count is what used to hide this
 * indicator on every request after a server's first.
 */
const slot = (overrides: Partial<PrefillSlot> = {}): PrefillSlot => ({
  id: 0,
  taskId: 16644,
  processing: true,
  decoding: false,
  promptProcessed: 22488,
  promptCached: 0,
  contextUsed: 22488,
  contextSize: 147456,
  generated: 257,
  ...overrides,
});

const progressOf = (slots: PrefillSlot[]) => advancePrefill(slots, IDLE_PREFILL_TRACKER, 0).progress;

describe('activePrefillSlot', () => {
  it('picks the busy slot despite a stale generated count', () => {
    expect(activePrefillSlot([slot()])?.id).toBe(0);
  });

  it('ignores idle slots', () => {
    expect(activePrefillSlot([slot({ processing: false })])).toBeNull();
    expect(activePrefillSlot([])).toBeNull();
  });
});

describe('contextFillPercent', () => {
  it('measures how full the context window is, which is capacity and not progress', () => {
    expect(contextFillPercent(22488, 147456)).toBe(15);
  });

  it('is unknown without a context window or without tokens', () => {
    expect(contextFillPercent(22488, 0)).toBeNull();
    expect(contextFillPercent(0, 147456)).toBeNull();
  });
});

describe('advancePrefill', () => {
  it('reports queued while no slot has picked the request up', () => {
    const progress = progressOf([]);
    expect(progress.phase).toBe('queued');
    expect(progress.label).toBe('Waiting for the model…');
    expect(progress.percent).toBeNull();
  });

  it('reports how many prompt tokens have been read, with no invented total', () => {
    const progress = progressOf([slot()]);
    expect(progress.phase).toBe('prefilling');
    expect(progress.label).toBe('Reading your prompt… 22,488 tokens read');
    // The context window is capacity, not a target. Naming it as the
    // denominator read as "this prompt is 147,456 tokens", which it never was.
    expect(progress.label).not.toContain('147,456');
    expect(progress.percent).toBeNull();
  });

  it('counts the cached prefix as already read', () => {
    expect(progressOf([slot({ promptCached: 82268, promptProcessed: 1592, contextUsed: 83860 })]).tokens).toBe(83860);
  });

  it('reads the same whether or not the backend reports a context window', () => {
    const progress = progressOf([slot({ contextSize: 0 })]);
    expect(progress.label).toBe('Reading your prompt… 22,488 tokens read');
    expect(progress.percent).toBeNull();
  });

  it('reports generating once the slot has a next token', () => {
    expect(progressOf([slot({ decoding: true })]).phase).toBe('generating');
  });

  it('reports stalled only after the counters sit still', () => {
    const first = advancePrefill([slot()], IDLE_PREFILL_TRACKER, 1000);
    expect(first.progress.phase).toBe('prefilling');

    const soon = advancePrefill([slot()], first.tracker, 1000 + PREFILL_STALL_AFTER_MS - 1);
    expect(soon.progress.phase).toBe('prefilling');

    const late = advancePrefill([slot()], first.tracker, 1000 + PREFILL_STALL_AFTER_MS);
    expect(late.progress.phase).toBe('stalled');
    expect(late.progress.label).toBe('Still reading your prompt…');
  });

  it('does not call slow progress a stall', () => {
    const first = advancePrefill([slot()], IDLE_PREFILL_TRACKER, 1000);
    const later = advancePrefill(
      [slot({ promptProcessed: 24536, contextUsed: 24536 })],
      first.tracker,
      1000 + PREFILL_STALL_AFTER_MS * 2,
    );
    expect(later.progress.phase).toBe('prefilling');
  });
});

describe('advancePrefill ticks', () => {
  it('ticks once per poll where the token count actually moved', () => {
    const first = advancePrefill([slot()], IDLE_PREFILL_TRACKER, 1000);
    expect(first.progress.ticks).toBe(1);

    const same = advancePrefill([slot()], first.tracker, 2000);
    expect(same.progress.ticks).toBe(1);

    const moved = advancePrefill([slot({ promptProcessed: 24536, contextUsed: 24536 })], same.tracker, 3000);
    expect(moved.progress.ticks).toBe(2);
  });

  it('does not rewind the count when the slot goes quiet between steps', () => {
    const first = advancePrefill([slot()], IDLE_PREFILL_TRACKER, 1000);
    const quiet = advancePrefill([], first.tracker, 2000);

    expect(quiet.progress.phase).toBe('queued');
    expect(quiet.progress.ticks).toBe(first.progress.ticks);
  });
});

describe('fetchPrefillSlots', () => {
  it('unwraps the slots array and swallows failures', async () => {
    const good = vi.fn(async () => ({ ok: true, json: async () => ({ slots: [slot()] }) }) as unknown as Response);
    expect(await fetchPrefillSlots(good as unknown as typeof fetch)).toHaveLength(1);

    // A backend that omits a counter must read as 0, never NaN through the sums.
    const sparse = vi.fn(
      async () => ({ ok: true, json: async () => ({ slots: [{ id: 0, processing: true }] }) }) as unknown as Response,
    );
    const [only] = await fetchPrefillSlots(sparse as unknown as typeof fetch);
    expect(only.promptCached).toBe(0);
    expect(advancePrefill([only], IDLE_PREFILL_TRACKER, 0).progress.label).toBe('Reading your prompt…');

    const bad = vi.fn(async () => {
      throw new Error('down');
    });
    expect(await fetchPrefillSlots(bad as unknown as typeof fetch)).toEqual([]);
  });
});

describe('PrefillIndicatorView', () => {
  it('renders nothing without progress, or while generating', () => {
    const { rerender } = render(<PrefillIndicatorView progress={null} />);
    expect(screen.queryByTestId('prefill-progress')).toBeNull();

    rerender(<PrefillIndicatorView progress={progressOf([slot({ decoding: true })])} />);
    expect(screen.queryByTestId('prefill-progress')).toBeNull();
  });

  it('shows the running token count and an indeterminate bar', () => {
    render(<PrefillIndicatorView progress={progressOf([slot()])} />);
    expect(screen.getByText('Reading your prompt… 22,488 tokens read')).toBeTruthy();
    // No percentage: the total is unknown, so a filling bar would be a guess.
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull();
  });

  it('renders an indeterminate bar when the context window is unknown', () => {
    render(<PrefillIndicatorView progress={progressOf([slot({ contextSize: 0 })])} />);
    expect(screen.getByTestId('prefill-progress')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull();
  });

  it('says it once: no second line restating the label under the bar', () => {
    // The queued phase is where the doubling was loudest — "Waiting for the
    // model…" sat directly above "The request is waiting for the model
    // server.", which is the same sentence twice.
    render(<PrefillIndicatorView progress={progressOf([])} />);

    expect(screen.getByText('Waiting for the model…')).toBeTruthy();
    expect(screen.queryByText('The request is waiting for the model server.')).toBeNull();
  });

  it('shows only the live line while prefilling, not the standing explanation', () => {
    render(<PrefillIndicatorView progress={progressOf([slot()])} />);

    expect(screen.getByText('Reading your prompt… 22,488 tokens read')).toBeTruthy();
    expect(
      screen.queryByText('The whole prompt is read before the first word appears. A large document can take minutes.'),
    ).toBeNull();
  });

  it('does not render the phase hint anywhere, hover included', () => {
    // Not visible text, and not a title or aria description either: the hint
    // is simply not part of this view in any phase that has one.
    const stalled = advancePrefill([slot()], { taskId: 16644, tokens: 22488, changedAt: 0 }, PREFILL_STALL_AFTER_MS);

    for (const progress of [progressOf([]), progressOf([slot()]), stalled.progress]) {
      const { hint } = progress;
      expect(hint).toBeTruthy();

      const { container, unmount } = render(<PrefillIndicatorView progress={progress} />);
      expect(container.innerHTML).not.toContain(hint!);
      expect(container.querySelector(`[title], [aria-description]`)).toBeNull();
      unmount();
    }
  });
});

describe('PrefillIndicatorView, while a tool runs', () => {
  it('says what is being executed instead of waiting on the model', () => {
    // The model is idle while a command runs, so no slot is busy and the poll
    // reports "queued". The run is not waiting for the model at all.
    render(<PrefillIndicatorView progress={progressOf([])} activity="Executing a command… uv pip install pandas" />);

    expect(screen.getByText('Executing a command… uv pip install pandas')).toBeTruthy();
    expect(screen.queryByText('Waiting for the model…')).toBeNull();
    expect(screen.getByTestId('prefill-progress').getAttribute('data-phase')).toBe('executing');
  });

  it('stays one line: the activity replaces the label, it does not join it', () => {
    const { container } = render(
      <PrefillIndicatorView progress={progressOf([slot()])} activity="Executing a command… ls -la" />,
    );

    expect(container.querySelectorAll('[data-testid="prefill-status-line"]')).toHaveLength(1);
    expect(container.innerHTML).not.toContain('Reading your prompt');
  });
});

describe('the progress bar', () => {
  const fill = () => screen.getByTestId('prefill-bar-fill');

  it('advances as the token count advances, without inventing a percentage', () => {
    const first = advancePrefill([slot()], IDLE_PREFILL_TRACKER, 1000);
    const { rerender } = render(<PrefillIndicatorView progress={first.progress} />);
    const startedAt = fill().style.left;

    const moved = advancePrefill([slot({ promptProcessed: 40000, contextUsed: 40000 })], first.tracker, 2000);
    rerender(<PrefillIndicatorView progress={moved.progress} />);

    expect(fill().style.left).not.toBe(startedAt);
    // Still indeterminate: the bar reports that progress happened, never how
    // much of an unknown total is left.
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull();
  });

  it('stands still when nothing moved, rather than animating regardless', () => {
    const first = advancePrefill([slot()], IDLE_PREFILL_TRACKER, 1000);
    const { rerender } = render(<PrefillIndicatorView progress={first.progress} />);
    const startedAt = fill().style.left;

    const same = advancePrefill([slot()], first.tracker, 2000);
    rerender(<PrefillIndicatorView progress={same.progress} />);

    expect(fill().style.left).toBe(startedAt);
    expect(fill().className).not.toContain('animate-pulse');
  });
});

describe('PrefillIndicator', () => {
  it('shows queued before the first poll answers, then the prefill counts', async () => {
    server.use(http.get(prefillStatusUrl(), () => HttpResponse.json({ slots: [slot()] })));

    render(<PrefillIndicator />);
    expect(screen.getByTestId('prefill-progress').getAttribute('data-phase')).toBe('queued');

    await waitFor(() => expect(screen.getByTestId('prefill-progress').getAttribute('data-phase')).toBe('prefilling'));
    expect(screen.getByText('Reading your prompt… 22,488 tokens read')).toBeTruthy();
  });

  it('stays queued when the backend reports no busy slot', async () => {
    server.use(http.get(prefillStatusUrl(), () => HttpResponse.json({ slots: [] })));

    render(<PrefillIndicator />);
    expect(await screen.findByText('Waiting for the model…')).toBeTruthy();
    expect(screen.getByTestId('prefill-progress').getAttribute('data-phase')).toBe('queued');
  });
});

/**
 * The run progress line while the sandbox is coming up.
 *
 * A cold sandbox is 16 to 17 seconds from pod creation to Ready plus a
 * dependency install, and sandboxes are per conversation, so nearly every
 * document chat pays it. The line has to say that, and it has to say it ONLY
 * for the three tools that need a pod.
 */
describe('RunProgressIndicator while the sandbox starts', () => {
  const startingStatus = {
    phase: 'pulling-image',
    message: 'Downloading the workspace image…',
    step: 5,
    totalSteps: 8,
    ready: false,
  };

  const runningToolMessage = (toolName: string, args: Record<string, unknown>) => ({
    role: 'assistant',
    content: [{ type: 'tool-call', toolCallId: 'live', toolName, args }],
  });

  const statusLine = () => screen.getByTestId('prefill-status-line').textContent;

  it('names the startup step while a command waits for the pod', async () => {
    auiMessages.current = [
      runningToolMessage('mastra_workspace_execute_command', { command: 'uv pip install pandas' }),
    ];
    server.use(
      http.get(prefillStatusUrl(), () => HttpResponse.json({ slots: [] })),
      http.get(sandboxStatusUrl(), () => HttpResponse.json({ status: startingStatus })),
    );

    render(<RunProgressIndicator />);

    await waitFor(() => expect(statusLine()).toBe('Downloading the workspace image… step 5 of 8'));
  });

  it('asks about the CONVERSATION whose pod the run is waiting on', async () => {
    // A poll with no thread is answered about the user's thread-less
    // workspace, whose `ws-<sub>` object no chat creates since workspaces
    // became per conversation -- observed live on 2026-08-06 answering
    // `requested`, step 0, for the whole of a turn whose pod was Running.
    auiMessages.current = [runningToolMessage('mastra_workspace_execute_command', { command: 'uv run analyze.py' })];
    const asked: string[] = [];
    server.use(
      http.get(prefillStatusUrl(), () => HttpResponse.json({ slots: [] })),
      http.get(sandboxStatusUrl(), ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('threadId') ?? '');
        return HttpResponse.json({ status: startingStatus });
      }),
    );

    render(
      <ThreadRuntimeStateProvider
        value={
          {
            threadId: 'thread-42',
            isStreaming: true,
            canSendWhileStreaming: false,
            cancelStream: () => {},
            pendingSignals: [],
            hasPendingMessages: false,
          } as ThreadRuntimeState
        }
      >
        <RunProgressIndicator />
      </ThreadRuntimeStateProvider>,
    );

    await waitFor(() => expect(asked.length).toBeGreaterThan(0));
    expect(asked.every(threadId => threadId === 'thread-42')).toBe(true);
  });

  it('never blames the sandbox for a write, which goes over WebDAV', async () => {
    auiMessages.current = [runningToolMessage('mastra_workspace_write_file', { path: '/workspace/analyze.py' })];
    let sandboxPolls = 0;
    server.use(
      http.get(prefillStatusUrl(), () => HttpResponse.json({ slots: [] })),
      http.get(sandboxStatusUrl(), () => {
        sandboxPolls += 1;
        return HttpResponse.json({ status: startingStatus });
      }),
    );

    render(<RunProgressIndicator />);

    await waitFor(() => expect(statusLine()).toBe('Writing a file… /workspace/analyze.py'));
    expect(sandboxPolls, 'a WebDAV tool must not even ask about the sandbox').toBe(0);
  });
});
