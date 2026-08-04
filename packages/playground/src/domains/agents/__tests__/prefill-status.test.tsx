// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrefillIndicator, PrefillIndicatorView } from '../components/prefill-indicator';
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
