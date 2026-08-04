import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Agent } from '../agent';
import { InMemoryStore } from '../storage/mock';
import { Harness } from './harness';
import type { HarnessEvent } from './types';

function createHarness() {
  const agent = new Agent({
    name: 'test-agent',
    instructions: 'You are a test agent.',
    model: { provider: 'openai', name: 'gpt-4o', toolChoice: 'auto' },
  });

  return new Harness({
    id: 'test-harness',
    storage: new InMemoryStore(),
    modes: [{ id: 'default', name: 'Default', default: true, agent }],
  });
}

/**
 * Observational memory compacts context; it never produces the user-visible
 * answer. A failed observation/buffering pass therefore degrades the turn to
 * un-compacted context and must not abort the in-flight run.
 */
describe('Harness OM failure degradation', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('keeps streaming when OM buffering fails', async () => {
    const harness = createHarness();
    const events: HarnessEvent[] = [];
    harness.subscribe(event => events.push(event));

    (harness as any).abortController = new AbortController();

    await (harness as any).processStream({
      fullStream: (async function* () {
        yield {
          type: 'data-om-buffering-failed',
          data: {
            cycleId: 'c1',
            operationType: 'observation',
            error: 'Bad Request',
          },
        };
        yield { type: 'text-start', payload: { id: 't1' } };
        yield { type: 'text-delta', payload: { id: 't1', text: 'hello' } };
      })(),
    });

    // The failure is still reported so consumers can render a warning badge.
    expect(events.some(e => e.type === 'om_buffering_failed')).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Observational memory observation buffering failed'));

    // ...but the run is not killed.
    expect(events.some(e => e.type === 'error')).toBe(false);
    expect(events.some(e => e.type === 'agent_end' && e.reason === 'aborted')).toBe(false);
    expect(events.some(e => e.type === 'message_start')).toBe(true);
  });

  it('keeps streaming when an OM observation run fails', async () => {
    const harness = createHarness();
    const events: HarnessEvent[] = [];
    harness.subscribe(event => events.push(event));

    (harness as any).abortController = new AbortController();

    await (harness as any).processStream({
      fullStream: (async function* () {
        yield {
          type: 'data-om-observation-failed',
          data: {
            cycleId: 'c2',
            operationType: 'reflection',
            error: 'Model unavailable',
            durationMs: 50,
          },
        };
        yield { type: 'text-start', payload: { id: 't2' } };
        yield { type: 'text-delta', payload: { id: 't2', text: 'hello' } };
      })(),
    });

    expect(events.some(e => e.type === 'om_reflection_failed')).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Observational memory reflection run failed'));

    expect(events.some(e => e.type === 'error')).toBe(false);
    expect(events.some(e => e.type === 'agent_end' && e.reason === 'aborted')).toBe(false);
    expect(events.some(e => e.type === 'message_start')).toBe(true);
  });
});
