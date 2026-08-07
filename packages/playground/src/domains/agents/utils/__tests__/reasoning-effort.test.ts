import { describe, expect, it } from 'vitest';

import {
  REASONING_EFFORT_OPTIONS,
  REASONING_EFFORT_PROVIDER_KEY,
  effectiveReasoningEffort,
  withReasoningEffort,
} from '../reasoning-effort';

const effortOf = (providerOptions: ReturnType<typeof withReasoningEffort>) =>
  providerOptions?.[REASONING_EFFORT_PROVIDER_KEY]?.reasoningEffort;

describe('effectiveReasoningEffort', () => {
  it('is the agent default when the user has not chosen', () => {
    expect(
      effectiveReasoningEffort({
        providerOptions: { [REASONING_EFFORT_PROVIDER_KEY]: { reasoningEffort: 'max' } },
      }),
    ).toBe('max');
  });

  it('is the user choice once one is stored, whatever the agent declares', () => {
    expect(
      effectiveReasoningEffort({
        reasoningEffort: 'low',
        providerOptions: { [REASONING_EFFORT_PROVIDER_KEY]: { reasoningEffort: 'max' } },
      }),
    ).toBe('low');
  });

  it('is nothing at all when neither side names one', () => {
    expect(effectiveReasoningEffort({})).toBeUndefined();
    expect(effectiveReasoningEffort(undefined)).toBeUndefined();
  });
});

describe('withReasoningEffort', () => {
  it.each(REASONING_EFFORT_OPTIONS.map(option => [option.label, option.value]))('sends %s as %s', (_label, value) => {
    expect(effortOf(withReasoningEffort(undefined, value))).toBe(value);
  });

  it('leaves the request untouched when no effort is selected', () => {
    expect(withReasoningEffort(undefined, undefined)).toBeUndefined();
    expect(withReasoningEffort({ someProvider: { thinking: true } }, undefined)).toEqual({
      someProvider: { thinking: true },
    });
  });

  it('replaces the agent default rather than sending both', () => {
    expect(withReasoningEffort({ [REASONING_EFFORT_PROVIDER_KEY]: { reasoningEffort: 'max' } }, 'none')).toEqual({
      [REASONING_EFFORT_PROVIDER_KEY]: { reasoningEffort: 'none' },
    });
  });

  it('keeps every other provider option the request already carried', () => {
    expect(
      withReasoningEffort(
        {
          [REASONING_EFFORT_PROVIDER_KEY]: { user: 'someone' },
          anthropic: { thinking: { type: 'enabled' } },
        },
        'high',
      ),
    ).toEqual({
      [REASONING_EFFORT_PROVIDER_KEY]: { user: 'someone', reasoningEffort: 'high' },
      anthropic: { thinking: { type: 'enabled' } },
    });
  });
});

describe('the choices offered', () => {
  it('are the five the composer shows, weakest first', () => {
    expect(REASONING_EFFORT_OPTIONS.map(option => option.value)).toEqual(['none', 'low', 'medium', 'high', 'max']);
    expect(REASONING_EFFORT_OPTIONS.map(option => option.label)).toEqual(['Off', 'Low', 'Medium', 'High', 'Max']);
  });
});
