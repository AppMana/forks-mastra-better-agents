// @vitest-environment jsdom
import type { ReasoningMessagePartProps } from '@assistant-ui/react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Reasoning } from '../reasoning';
import { toAssistantUIMessage } from '@/services/to-assistant-ui-message';
import type { MastraDBMessage } from '@/types';

afterEach(() => cleanup());

const props = (status: 'running' | 'complete', text = 'chain of thought'): ReasoningMessagePartProps =>
  ({ type: 'reasoning', text, status: { type: status } }) as unknown as ReasoningMessagePartProps;

describe('Reasoning', () => {
  it('is collapsed by default once complete', () => {
    render(<Reasoning {...props('complete')} />);

    expect(screen.queryByText('chain of thought')).toBeNull();
  });

  it('shows the text live while the part is streaming', () => {
    render(<Reasoning {...props('running')} />);

    expect(screen.getByText('chain of thought')).toBeDefined();
  });

  it('collapses when streaming finishes', () => {
    const { rerender } = render(<Reasoning {...props('running')} />);
    expect(screen.getByText('chain of thought')).toBeDefined();

    rerender(<Reasoning {...props('complete')} />);
    expect(screen.queryByText('chain of thought')).toBeNull();
  });

  it('is a named control, so "is the thinking folded away?" has an answer', () => {
    render(<Reasoning {...props('complete')} />);

    expect(screen.getByRole('button', { name: 'Show reasoning' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Show reasoning' }));
    expect(screen.getByRole('button', { name: 'Hide reasoning' })).toBeDefined();
  });

  it('still toggles manually after completion', () => {
    render(<Reasoning {...props('complete')} />);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('chain of thought')).toBeDefined();

    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByText('chain of thought')).toBeNull();
  });
});

/**
 * A backend's reasoning must reach that chip WHATEVER shape it arrives in.
 *
 * Two shapes are real, and a turn can carry either. The live accumulator fills
 * the flat `reasoning` string; storage (and DeepSeek V4's parts, read from a
 * live turn on 2026-08-06) leaves it EMPTY and puts the thinking in
 * `details: [{ type: 'text', text }]`, which grows as the turn runs. A renderer
 * that reads only the flat field gets an empty string for the second shape, and
 * an empty reasoning part is dropped outright — the thinking then has nowhere
 * to go but the visible reply.
 */
describe('reasoning parts reach the chip in either shape', () => {
  const message = (part: Record<string, unknown>): MastraDBMessage =>
    ({
      id: 'assistant-1',
      role: 'assistant',
      createdAt: new Date('2026-08-06T00:00:00.000Z'),
      threadId: 'thread-1',
      resourceId: 'resource-1',
      content: { format: 2, parts: [part, { type: 'text', text: 'The answer is 4.' }] },
    }) as unknown as MastraDBMessage;

  const reasoningPartOf = (part: Record<string, unknown>) => {
    const { content } = toAssistantUIMessage(message(part));
    if (typeof content === 'string') throw new Error('expected structured content parts');
    const reasoning = content.find(candidate => candidate.type === 'reasoning');
    if (!reasoning || reasoning.type !== 'reasoning') throw new Error('no reasoning part survived conversion');
    return reasoning;
  };

  const thinking = 'The user wants me to create a Python file. Let me write it first.';

  it.each([
    ['the flat reasoning field', { type: 'reasoning', reasoning: thinking }],
    [
      'details only, the flat field empty',
      { type: 'reasoning', reasoning: '', details: [{ type: 'text', text: thinking }] },
    ],
    [
      'details still growing mid-turn',
      {
        type: 'reasoning',
        reasoning: '',
        state: 'streaming',
        details: [
          { type: 'text', text: 'The user wants me to create a Python file. ' },
          { type: 'text', text: 'Let me write it first.' },
        ],
      },
    ],
  ])('renders a collapsed chip from %s', (_shape, part) => {
    const reasoning = reasoningPartOf(part as Record<string, unknown>);
    expect(reasoning.text.replace(/\s+/g, ' ').trim()).toBe(thinking);

    render(<Reasoning {...({ ...reasoning, status: { type: 'complete' } } as unknown as ReasoningMessagePartProps)} />);

    // The chip exists...
    expect(screen.getByRole('button', { name: 'Show reasoning' })).toBeDefined();
    // ...and the thinking is folded inside it, not sitting in the reply.
    expect(screen.queryByText(thinking)).toBeNull();
  });

  it('keeps the reasoning out of the assistant text parts', () => {
    const { content } = toAssistantUIMessage(
      message({ type: 'reasoning', reasoning: '', details: [{ type: 'text', text: thinking }] }),
    );
    if (typeof content === 'string') throw new Error('expected structured content parts');

    const text = content
      .filter(part => part.type === 'text')
      .map(part => (part.type === 'text' ? part.text : ''))
      .join('\n');
    expect(text).toBe('The answer is 4.');
    expect(text).not.toContain('Let me write it');
  });
});
