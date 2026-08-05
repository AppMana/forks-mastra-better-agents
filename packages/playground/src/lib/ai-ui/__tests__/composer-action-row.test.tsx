// @vitest-environment jsdom
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ComposerActionRow } from '../thread';
import type { WorkspacesListResponse } from '@/domains/workspace/types';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';

const composer = vi.hoisted(() => ({
  addAttachment: vi.fn<(file: File) => Promise<void>>(async () => {}),
}));

// The composer runtime and the primitives are @assistant-ui context, not our
// code. Everything below them — the upload hook, React Query and the real
// transport — runs for real against MSW, because the question this file asks
// is which controls the composer puts on screen for a given deployment.
vi.mock('@assistant-ui/react', () => ({
  useComposer: () => false,
  useComposerRuntime: () => composer,
  ComposerPrimitive: {
    Root: ({ children }: { children: ReactNode }) => children,
    Send: ({ children }: { children: ReactNode }) => children,
  },
  ThreadPrimitive: { If: ({ children }: { children: ReactNode }) => children },
}));

const fileDrag = { dataTransfer: { types: ['Files'], files: [] } };

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <MastraReactProvider baseUrl={BASE_URL}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MastraReactProvider>
  );
};

/**
 * What the deployment the owner is running answers: its workspace resolves a
 * filesystem per request, so the list route reports no filesystem for it and
 * nothing in the list is writable. Files still upload — the application's own
 * upload route takes them, which is why the "+" button attaches successfully
 * in exactly this state.
 */
const noWritableWorkspace: WorkspacesListResponse = {
  workspaces: [
    {
      id: 'ws-1',
      name: 'My Files',
      status: 'active',
      source: 'mastra',
      capabilities: {
        hasFilesystem: false,
        hasSandbox: true,
        canBM25: false,
        canVector: false,
        canHybrid: false,
        hasSkills: false,
      },
      safety: { readOnly: false },
    },
  ],
};

const listWorkspaces = (response: WorkspacesListResponse) =>
  http.get(`${BASE_URL}/api/workspaces`, () => HttpResponse.json(response));

const renderRow = async () => {
  render(<ComposerActionRow />, { wrapper });
  // The workspace list is what the row used to gate itself on, so nothing is
  // asserted until it has been answered.
  expect(await screen.findByRole('button', { name: 'Add attachment' })).toBeTruthy();
};

afterEach(() => {
  cleanup();
  composer.addAttachment.mockClear();
});

describe('the composer action row', () => {
  it('shows the drop overlay while files are dragged over the page', async () => {
    server.use(listWorkspaces(noWritableWorkspace));
    await renderRow();

    expect(screen.queryByTestId('workspace-dropzone')).toBeNull();

    fireEvent.dragEnter(window, fileDrag);
    expect(screen.getByTestId('workspace-dropzone')).toBeTruthy();

    fireEvent.dragLeave(window, fileDrag);
    expect(screen.queryByTestId('workspace-dropzone')).toBeNull();
  });

  it('sends a dropped file to the composer as an attachment', async () => {
    server.use(listWorkspaces(noWritableWorkspace));
    await renderRow();

    const file = new File(['x'], 'report.pdf');
    fireEvent.dragEnter(window, fileDrag);
    fireEvent.drop(window, { dataTransfer: { types: ['Files'], files: [file] } });

    await waitFor(() => expect(composer.addAttachment).toHaveBeenCalledWith(file));
    expect(screen.queryByTestId('workspace-dropzone')).toBeNull();
  });

  it('offers attaching and uploading, and nothing else', async () => {
    server.use(listWorkspaces(noWritableWorkspace));
    await renderRow();

    expect(screen.getByRole('button', { name: 'Upload to Workspace' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /dictation/i })).toBeNull();
  });
});
