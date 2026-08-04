/**
 * Which parts of a code-defined agent Studio is allowed to own.
 *
 * Three places have to agree on this: the Studio form that builds a save
 * payload, the HTTP handler that persists it, and `applyStoredOverrides`
 * which reads it back at request time. When they disagree the disagreement
 * is silent and destructive — a client that believes it does not own
 * `instructions` sends an empty placeholder, and a server that believes the
 * client does own them persists that placeholder as the agent's whole system
 * prompt. So the rule lives here, once, and all three import it.
 *
 * This module is deliberately dependency-free (one type-only import) so the
 * browser bundle can use it without pulling in the Agent runtime.
 */

import type { AgentInstructionBlock } from '../storage/types';
import type { AgentEditorConfig } from './types';

export interface AgentEditorOwnership {
  /** Studio may replace the agent's instructions. */
  ownsInstructions: boolean;
  /** Studio may change which tools the agent has. */
  ownsTools: boolean;
  /** Studio may change tool descriptions but not tool membership. */
  ownsToolDescriptionsOnly: boolean;
}

const NOTHING: AgentEditorOwnership = {
  ownsInstructions: false,
  ownsTools: false,
  ownsToolDescriptionsOnly: false,
};

/**
 * Derive Studio's ownership of a code-defined agent from its `editor` config.
 *
 * `undefined` means "fully editable" for backward compatibility: agents
 * predate the `editor` field, and defaulting them to locked would silently
 * disable editing for every existing deployment.
 */
export function codeAgentEditorOwnership(editorConfig: unknown): AgentEditorOwnership {
  if (editorConfig === false) {
    return NOTHING;
  }
  if (editorConfig === undefined || editorConfig === null) {
    return { ownsInstructions: true, ownsTools: true, ownsToolDescriptionsOnly: false };
  }
  if (typeof editorConfig !== 'object') {
    return NOTHING;
  }
  const config = editorConfig as Exclude<AgentEditorConfig, false>;
  const tools = config.tools;
  return {
    ownsInstructions: config.instructions === true,
    ownsTools: tools === true,
    ownsToolDescriptionsOnly:
      typeof tools === 'object' && tools !== null && (tools as { description?: unknown }).description === true,
  };
}

/**
 * True when an `instructions` value carries no prompt at all, so writing it
 * would leave an agent with an empty system prompt.
 *
 * Only what is decidable without I/O: an empty/blank string, an empty block
 * array, or a block array whose every inline block is blank. A block array
 * holding a `prompt_block_ref` may still resolve to nothing at request time
 * (unpublished block, rules excluding everything) — that case cannot be
 * decided here and is caught by the runtime floor in `applyStoredOverrides`.
 */
export function storedInstructionsAreEmpty(instructions: unknown): boolean {
  if (instructions === undefined || instructions === null) return false;
  if (typeof instructions === 'string') return instructions.trim().length === 0;
  if (!Array.isArray(instructions)) return false;
  return (instructions as AgentInstructionBlock[]).every(block => {
    if (!block || typeof block !== 'object') return true;
    if (block.type === 'prompt_block_ref') return false;
    const content = (block as { content?: unknown }).content;
    return typeof content !== 'string' || content.trim().length === 0;
  });
}
