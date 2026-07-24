// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrefillIndicatorView } from '../components/prefill-indicator';
import { activePrefillSlot, fetchPrefillSlots, formatPrefillLabel, prefillPercent } from '../prefill-status';
import type { PrefillSlot } from '../prefill-status';

afterEach(cleanup);

const slot = (overrides: Partial<PrefillSlot>): PrefillSlot => ({
  id: 0,
  processing: true,
  promptProcessed: 12288,
  promptTotal: 44207,
  generated: 0,
  ...overrides,
});

describe('activePrefillSlot', () => {
  it('picks the slot still prefilling', () => {
    expect(activePrefillSlot([slot({})])?.id).toBe(0);
  });

  it('ignores idle slots, decoding slots, and empty progress', () => {
    expect(activePrefillSlot([slot({ processing: false })])).toBeNull();
    expect(activePrefillSlot([slot({ generated: 5 })])).toBeNull();
    expect(activePrefillSlot([slot({ promptProcessed: 0 })])).toBeNull();
    expect(activePrefillSlot([])).toBeNull();
  });
});

describe('prefillPercent / formatPrefillLabel', () => {
  it('computes percent and a token-count label', () => {
    expect(prefillPercent(slot({}))).toBe(28);
    expect(formatPrefillLabel(slot({}))).toBe('Processing prompt… 12,288 / 44,207 tokens');
  });

  it('degrades to a count-only label when the total is unknown', () => {
    const unknownTotal = slot({ promptTotal: 0 });
    expect(prefillPercent(unknownTotal)).toBeNull();
    expect(formatPrefillLabel(unknownTotal)).toBe('Processing prompt… 12,288 tokens');
  });
});

describe('fetchPrefillSlots', () => {
  it('unwraps the slots array and swallows failures', async () => {
    const good = vi.fn(async () => ({ ok: true, json: async () => ({ slots: [slot({})] }) }) as unknown as Response);
    expect(await fetchPrefillSlots(good as unknown as typeof fetch)).toHaveLength(1);

    const bad = vi.fn(async () => {
      throw new Error('down');
    });
    expect(await fetchPrefillSlots(bad as unknown as typeof fetch)).toEqual([]);
  });
});

describe('PrefillIndicatorView', () => {
  it('renders nothing without an active prefill', () => {
    render(<PrefillIndicatorView slot={null} />);
    expect(screen.queryByTestId('prefill-progress')).toBeNull();
  });

  it('shows the label and byte-weighted progress bar', () => {
    render(<PrefillIndicatorView slot={slot({})} />);
    expect(screen.getByText('Processing prompt… 12,288 / 44,207 tokens')).toBeTruthy();
    expect(screen.getByText('28%')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('28');
  });

  it('renders an indeterminate bar when the total is unknown', () => {
    render(<PrefillIndicatorView slot={slot({ promptTotal: 0 })} />);
    expect(screen.getByTestId('prefill-progress')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull();
  });
});
