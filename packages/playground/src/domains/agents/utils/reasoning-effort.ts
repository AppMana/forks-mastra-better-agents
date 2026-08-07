import type { ModelSettings } from '@/types';

/**
 * How hard the model thinks, as the composer offers it.
 *
 * The value travels as a provider option and reaches an OpenAI-compatible
 * backend as the top-level `reasoning_effort` field. `openai-compatible` is
 * the key the AI SDK's chat model always reads, whatever the provider is
 * named, so one spelling covers every backend.
 *
 * The user's choice is kept in its own `reasoningEffort` setting rather than
 * written straight into `providerOptions`, because an agent's code defaults
 * overwrite stored `providerOptions` on every mount — a choice written there
 * would not survive a reload. It is folded into the provider options when the
 * request is built, which is also what makes an agent's declared effort the
 * default the picker shows.
 */

export const REASONING_EFFORT_PROVIDER_KEY = 'openai-compatible';

export const REASONING_EFFORT_OPTIONS = [
  { value: 'none', label: 'Off' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'max', label: 'Max' },
] as const;

export type ReasoningEffort = (typeof REASONING_EFFORT_OPTIONS)[number]['value'];

export type ProviderOptions = NonNullable<ModelSettings['providerOptions']>;

export function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return REASONING_EFFORT_OPTIONS.some(option => option.value === value);
}

function declaredReasoningEffort(providerOptions: ProviderOptions | undefined): string | undefined {
  const value = providerOptions?.[REASONING_EFFORT_PROVIDER_KEY]?.reasoningEffort;
  return typeof value === 'string' ? value : undefined;
}

/** The effort the next run would use, chosen or inherited from the agent. */
export function effectiveReasoningEffort(modelSettings: ModelSettings | undefined): string | undefined {
  return modelSettings?.reasoningEffort ?? declaredReasoningEffort(modelSettings?.providerOptions);
}

/** The provider options a request carries once the selected effort is applied. */
export function withReasoningEffort(
  providerOptions: ProviderOptions | undefined,
  effort: string | undefined,
): ProviderOptions | undefined {
  if (!effort) return providerOptions;
  return {
    ...providerOptions,
    [REASONING_EFFORT_PROVIDER_KEY]: {
      ...providerOptions?.[REASONING_EFFORT_PROVIDER_KEY],
      reasoningEffort: effort,
    },
  };
}
