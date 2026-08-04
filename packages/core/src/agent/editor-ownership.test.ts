import { describe, expect, it } from 'vitest';

import { codeAgentEditorOwnership, storedInstructionsAreEmpty } from './editor-ownership';

describe('codeAgentEditorOwnership', () => {
  // The regression this whole module exists for: a code agent with no `editor`
  // field is fully editable. A caller that reads `undefined` as "not owned"
  // sends an empty placeholder that a server reading it as "owned" persists.
  it('treats a missing editor config as fully owned', () => {
    expect(codeAgentEditorOwnership(undefined)).toEqual({
      ownsInstructions: true,
      ownsTools: true,
      ownsToolDescriptionsOnly: false,
    });
    expect(codeAgentEditorOwnership(null)).toEqual({
      ownsInstructions: true,
      ownsTools: true,
      ownsToolDescriptionsOnly: false,
    });
  });

  it('owns nothing when the agent opts out with editor: false', () => {
    expect(codeAgentEditorOwnership(false)).toEqual({
      ownsInstructions: false,
      ownsTools: false,
      ownsToolDescriptionsOnly: false,
    });
  });

  it('requires an explicit true once an editor config is present', () => {
    expect(codeAgentEditorOwnership({})).toEqual({
      ownsInstructions: false,
      ownsTools: false,
      ownsToolDescriptionsOnly: false,
    });
    expect(codeAgentEditorOwnership({ instructions: true })).toMatchObject({
      ownsInstructions: true,
      ownsTools: false,
    });
    expect(codeAgentEditorOwnership({ tools: true })).toMatchObject({
      ownsTools: true,
      ownsToolDescriptionsOnly: false,
    });
    expect(codeAgentEditorOwnership({ tools: { description: true } })).toMatchObject({
      ownsTools: false,
      ownsToolDescriptionsOnly: true,
    });
  });
});

describe('storedInstructionsAreEmpty', () => {
  it('does not flag an absent value — absent means "no change", not "blank"', () => {
    expect(storedInstructionsAreEmpty(undefined)).toBe(false);
    expect(storedInstructionsAreEmpty(null)).toBe(false);
  });

  it('flags blank strings and empty block arrays', () => {
    expect(storedInstructionsAreEmpty('')).toBe(true);
    expect(storedInstructionsAreEmpty('  \n ')).toBe(true);
    expect(storedInstructionsAreEmpty([])).toBe(true);
  });

  it('flags block arrays whose every inline block is blank', () => {
    expect(storedInstructionsAreEmpty([{ type: 'prompt_block', content: '' }])).toBe(true);
    expect(storedInstructionsAreEmpty([{ type: 'prompt_block', content: '   ' }])).toBe(true);
  });

  it('does not flag content that carries a prompt', () => {
    expect(storedInstructionsAreEmpty('You are helpful.')).toBe(false);
    expect(storedInstructionsAreEmpty([{ type: 'prompt_block', content: 'You are helpful.' }])).toBe(false);
  });

  // A reference may resolve to nothing later, but that is not decidable here;
  // the runtime floor in applyStoredOverrides covers it.
  it('does not flag a prompt block reference', () => {
    expect(storedInstructionsAreEmpty([{ type: 'prompt_block_ref', id: 'some-block' }])).toBe(false);
  });
});
