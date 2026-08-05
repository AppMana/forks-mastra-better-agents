// @vitest-environment jsdom
import type { StorageThreadType } from '@mastra/core/memory';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { forwardRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatThreads } from '../chat-threads';
import { LinkComponentProvider } from '@/lib/framework';

/**
 * Deleting a chat is a two-key gesture in practice: open the menu, hit Enter.
 * Which button Enter lands on is therefore the whole behaviour of the confirm
 * dialog, and Base UI's default (first tabbable child, i.e. Cancel) made the
 * gesture a no-op. Escape stays the way out.
 */

const thread = {
  id: 'thread-1',
  title: 'Analyze the Q3 dealflow',
  resourceId: 'alice',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
} as StorageThreadType;

const Link = forwardRef<HTMLAnchorElement, { to: string; children?: React.ReactNode }>(
  ({ to, children, ...props }, ref) => (
    <a ref={ref} href={to} {...props}>
      {children}
    </a>
  ),
);

function renderThreads(handlers: { onDelete?: () => void; onRename?: () => void } = {}) {
  return render(
    <LinkComponentProvider
      Link={Link as never}
      navigate={() => {}}
      paths={{ agentThreadLink: () => '/thread', agentNewThreadLink: () => '/new' } as never}
    >
      <ChatThreads
        resourceId="agent-1"
        resourceType="agent"
        threads={[thread]}
        isLoading={false}
        threadId={thread.id}
        onDelete={handlers.onDelete ?? (() => {})}
        onRename={handlers.onRename ?? (() => {})}
      />
    </LinkComponentProvider>,
  );
}

async function openDeleteDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Chat actions' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
  await screen.findByRole('heading', { name: /are you absolutely sure/i });
}

afterEach(() => {
  cleanup();
});

describe('delete chat confirmation', () => {
  it('focuses Delete, so Enter confirms rather than cancels', async () => {
    const onDelete = vi.fn();
    renderThreads({ onDelete });
    await openDeleteDialog();

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    await waitFor(() => expect(document.activeElement).toBe(deleteButton));

    // Enter on a focused button is a click, which is exactly the point: the
    // destructive action is the dialog's default, not an extra Tab away.
    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('leaves Escape as the way out', async () => {
    const onDelete = vi.fn();
    renderThreads({ onDelete });
    await openDeleteDialog();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape', code: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('heading', { name: /are you absolutely sure/i })).toBeNull());
    expect(onDelete).not.toHaveBeenCalled();
  });
});
