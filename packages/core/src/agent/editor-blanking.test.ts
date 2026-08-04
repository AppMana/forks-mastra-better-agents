import { describe, expect, it } from 'vitest';

import { codeAgentEditorOwnership, storedInstructionsAreEmpty } from './editor-ownership';

/**
 * The Coding Agent was destroyed on 2026-08-04 by editing its system prompt in
 * Studio and pressing save: instead of being edited, the instructions were
 * blanked and every request to the agent failed with "Instructions are
 * required to use an Agent."
 *
 * The cause was not a bad payload. It was two implementations of one rule
 * disagreeing about a code-defined agent that ships no `editor` config:
 *
 *   - Studio read `undefined` as "the user owns nothing here", so it
 *     deliberately sent `instructions: []`, expecting the server to drop the
 *     field for anything the user does not own.
 *   - The server read the same `undefined` as "fully editable — legacy
 *     default", so it did not drop it. It stored the empty array, published it
 *     immediately, and that override then shadowed the ConfigMap prompt.
 *
 * These tests model the disagreement itself rather than either half of it, so
 * the two sides cannot silently diverge again.
 */
describe('a code agent with no editor config', () => {
  it('is owned by the user, which is what the server always assumed', () => {
    const ownership = codeAgentEditorOwnership(undefined);

    expect(ownership.ownsInstructions).toBe(true);
  });

  it('gives Studio and the server the SAME answer — the bug was that it did not', () => {
    // Studio's old rule, inlined verbatim from use-agent-cms-form.ts as it was:
    //   !isCodeAgentOverride || (editorConfig !== false && editorConfig?.instructions === true)
    // For a code agent (isCodeAgentOverride true) with no config, that is false.
    const studioUsedToThink = false;
    const serverThinks = codeAgentEditorOwnership(undefined).ownsInstructions;

    expect(serverThinks).not.toBe(studioUsedToThink);
    // Both sides now call the function above, so there is only one answer.
    expect(codeAgentEditorOwnership(undefined).ownsInstructions).toBe(serverThinks);
  });

  it('recognises the empty payload Studio used to send', () => {
    expect(storedInstructionsAreEmpty([])).toBe(true);
    expect(storedInstructionsAreEmpty('')).toBe(true);
    expect(storedInstructionsAreEmpty('   ')).toBe(true);
  });

  it('does not mistake a real edited prompt for an empty one', () => {
    expect(storedInstructionsAreEmpty('You are a careful engineer.')).toBe(false);
  });

  it('locks everything when the agent opts out entirely', () => {
    const ownership = codeAgentEditorOwnership(false);

    expect(ownership.ownsInstructions).toBe(false);
    expect(ownership.ownsTools).toBe(false);
  });

  it('grants only what an explicit config grants', () => {
    expect(codeAgentEditorOwnership({ instructions: true }).ownsInstructions).toBe(true);
    expect(codeAgentEditorOwnership({ tools: true }).ownsInstructions).toBe(false);
  });
});
