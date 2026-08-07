import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mastra/playground-ui';

import { useAgentSettings } from '../context/agent-context';
import { REASONING_EFFORT_OPTIONS, effectiveReasoningEffort, isReasoningEffort } from '../utils/reasoning-effort';

/**
 * How hard the model thinks, per conversation.
 *
 * Shown only where an effort is already in play — an agent that declares one
 * in its defaults, or a user who has picked one. An agent that names no effort
 * keeps sending requests without the field, which is not the same as sending
 * the weakest one, and offering a picker there would quietly change that.
 */
export const ComposerReasoningEffort = () => {
  const { settings, setSettings } = useAgentSettings();
  const effort = effectiveReasoningEffort(settings?.modelSettings);

  if (!isReasoningEffort(effort)) {
    return null;
  }

  return (
    <Select
      value={effort}
      onValueChange={value =>
        setSettings({ ...settings, modelSettings: { ...settings?.modelSettings, reasoningEffort: value } })
      }
    >
      <SelectTrigger
        data-testid="composer-reasoning-effort"
        aria-label="Reasoning effort"
        className="h-8 w-auto rounded-full"
      >
        <span className="text-neutral3">Reasoning</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {REASONING_EFFORT_OPTIONS.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
