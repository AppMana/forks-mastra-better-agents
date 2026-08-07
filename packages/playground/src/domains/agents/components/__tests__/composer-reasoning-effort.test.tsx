// @vitest-environment jsdom
import { TooltipProvider } from '@mastra/playground-ui';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AgentSettingsProvider } from '../../context/agent-context';
import { effectiveReasoningEffort } from '../../utils/reasoning-effort';
import { ComposerReasoningEffort } from '../composer-reasoning-effort';
import type { AgentSettingsType } from '@/types';

const AGENT_ID = 'agent-1';

/** What session.tsx derives from an agent whose defaultOptions declare an effort. */
const agentDeclaring = (effort: string): AgentSettingsType => ({
  modelSettings: { providerOptions: { 'openai-compatible': { reasoningEffort: effort } } },
});

// Base UI's Select synthesizes PointerEvents, which jsdom does not implement.
beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    window.PointerEvent = window.MouseEvent as unknown as typeof PointerEvent;
  }
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const renderPicker = (defaultSettings?: AgentSettingsType) =>
  render(
    <TooltipProvider>
      <AgentSettingsProvider agentId={AGENT_ID} defaultSettings={defaultSettings}>
        <ComposerReasoningEffort />
      </AgentSettingsProvider>
    </TooltipProvider>,
  );

const trigger = () => screen.getByTestId('composer-reasoning-effort');

const choose = async (label: string) => {
  fireEvent.click(trigger());
  const option = await screen.findByRole('option', { name: label });
  // Base UI's Select item only commits a "real mouse" click that was preceded
  // by a pointerdown on the item itself.
  fireEvent.pointerDown(option, { pointerType: 'mouse' });
  fireEvent.click(option, { detail: 1 });
};

describe('ComposerReasoningEffort', () => {
  it('shows the effort the agent declares when the user has chosen nothing', async () => {
    renderPicker(agentDeclaring('max'));

    await waitFor(() => {
      expect(trigger().textContent).toContain('Max');
    });
  });

  it('offers Off through Max', async () => {
    renderPicker(agentDeclaring('max'));

    fireEvent.click(trigger());

    for (const label of ['Off', 'Low', 'Medium', 'High', 'Max']) {
      expect(await screen.findByRole('option', { name: label })).toBeTruthy();
    }
  });

  it('records the chosen effort as the one the next request carries', async () => {
    renderPicker(agentDeclaring('max'));
    await waitFor(() => expect(trigger().textContent).toContain('Max'));

    await choose('Low');

    await waitFor(() => {
      expect(trigger().textContent).toContain('Low');
    });
    const stored = JSON.parse(window.localStorage.getItem(`mastra-agent-store-${AGENT_ID}`) ?? '{}');
    expect(effectiveReasoningEffort(stored.modelSettings)).toBe('low');
  });

  it('keeps the choice across a remount, where the agent still declares its own default', async () => {
    renderPicker(agentDeclaring('max'));
    await waitFor(() => expect(trigger().textContent).toContain('Max'));
    await choose('Off');
    await waitFor(() => expect(trigger().textContent).toContain('Off'));

    cleanup();
    renderPicker(agentDeclaring('max'));

    await waitFor(() => {
      expect(trigger().textContent).toContain('Off');
    });
  });

  it('stays out of the way when nothing declares an effort', () => {
    renderPicker();

    expect(screen.queryByTestId('composer-reasoning-effort')).toBeNull();
  });

  it('stays out of the way when the declared effort is not one it offers', async () => {
    renderPicker(agentDeclaring('xhigh'));

    await waitFor(() => {
      expect(screen.queryByTestId('composer-reasoning-effort')).toBeNull();
    });
  });
});
