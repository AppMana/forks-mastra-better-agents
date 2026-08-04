// @vitest-environment jsdom
import type { ReasoningMessagePartProps } from '@assistant-ui/react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Reasoning } from '../reasoning';

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

  it('still toggles manually after completion', () => {
    render(<Reasoning {...props('complete')} />);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('chain of thought')).toBeDefined();

    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByText('chain of thought')).toBeNull();
  });
});
