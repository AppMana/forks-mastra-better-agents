// @vitest-environment jsdom
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

// jsdom doesn't provide ResizeObserver — stub it for floating-ui/base-ui
globalThis.ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver;

// jsdom also lacks `Element.getAnimations`, which @base-ui components call.
if (typeof Element !== 'undefined' && typeof Element.prototype.getAnimations !== 'function') {
  Element.prototype.getAnimations = function getAnimations() {
    return [] as Animation[];
  };
}

import type { WorkspaceSharingInfo } from '../types';
import { appRoute } from '@/lib/app-routes';
import Workspace from '@/pages/workspace';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';
const WS = 'test-ws';

// The sharing hook fetches a relative URL (`appRoute('/workspace/sharing')`), which
// Node's fetch cannot parse. Resolve relative URLs against a fixed origin so
// msw can intercept them; delegate everything else untouched.
let unwrapFetch: (() => void) | undefined;
beforeAll(() => {
  const wrapped = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      input = new URL(input, BASE_URL).toString();
    }
    return wrapped(input as RequestInfo, init);
  }) as typeof fetch;
  unwrapFetch = () => {
    globalThis.fetch = wrapped;
  };
});
afterAll(() => unwrapFetch?.());

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

const workspaceItem = {
  id: WS,
  name: 'Test Workspace',
  status: 'ready',
  source: 'mastra' as const,
  capabilities: {
    hasFilesystem: true,
    hasSandbox: false,
    canBM25: false,
    canVector: false,
    canHybrid: false,
    hasSkills: false,
  },
  safety: { readOnly: false },
};

const workspaceInfo = {
  isWorkspaceConfigured: true,
  id: WS,
  name: 'Test Workspace',
  status: 'ready',
  capabilities: workspaceItem.capabilities,
  safety: workspaceItem.safety,
};

const SHARING_INFO: WorkspaceSharingInfo = {
  username: 'webdav-user',
  password: 'app-password-123',
  webdavUrl: 'https://files.example.com/dav/',
  httpsUrlWithCredentials: 'https://webdav-user:app-password-123@files.example.com/dav/',
  nautilusUrl: 'davs://webdav-user@files.example.com/dav/',
  windows: {
    url: 'https://files.example.com/dav/',
    username: 'webdav-user',
    password: 'app-password-123',
    instructions: 'Map a network drive in Windows File Explorer.',
  },
  macos: {
    url: 'https://files.example.com/dav/',
    username: 'webdav-user',
    password: 'app-password-123',
    instructions: 'Use Finder Go > Connect to Server.',
  },
  linux: {
    url: 'davs://files.example.com/dav/',
    username: 'webdav-user',
    password: 'app-password-123',
    instructions: 'Open GNOME Files and connect to the server.',
  },
};

function baseHandlers(
  entries: Array<{ name: string; type: 'file' | 'directory'; size?: number }> = [
    { name: 'report.csv', type: 'file', size: 2048 },
    { name: 'docs', type: 'directory' },
  ],
) {
  return [
    http.get(`${BASE_URL}/api/workspaces`, () => HttpResponse.json({ workspaces: [workspaceItem] })),
    http.get(`${BASE_URL}/api/workspaces/${WS}`, () => HttpResponse.json(workspaceInfo)),
    http.get(`${BASE_URL}/api/workspaces/${WS}/fs/list`, () => HttpResponse.json({ path: '.', entries })),
    http.get(`${BASE_URL}/api/workspaces/${WS}/skills`, () =>
      HttpResponse.json({ skills: [], isSkillsConfigured: false }),
    ),
    http.get(`${BASE_URL}${appRoute('/workspace/sharing')}`, () => HttpResponse.json(SHARING_INFO)),
  ];
}

function renderWorkspacePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <MastraReactProvider baseUrl={BASE_URL}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/workspaces/${WS}`]}>
          <Routes>
            <Route path="/workspaces/:workspaceId" element={<Workspace />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MastraReactProvider>,
  );
}

async function openEntryMenu(entryName: string) {
  const trigger = await screen.findByLabelText(`Actions for ${entryName}`);
  fireEvent.click(trigger, { button: 0 });
  await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
}

describe('Workspace page — file listing', () => {
  it('renders the directory listing from the API', async () => {
    server.use(...baseHandlers());
    renderWorkspacePage();

    expect(await screen.findByText('report.csv')).toBeTruthy();
    expect(screen.getByText('docs')).toBeTruthy();
    expect(screen.getByText('2 KB')).toBeTruthy();
  });
});

describe('Workspace page — file operations', () => {
  it('duplicates a file via POST /fs/operation', async () => {
    server.use(...baseHandlers());
    let operationBody: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/api/workspaces/${WS}/fs/operation`, async ({ request }) => {
        operationBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          success: true,
          operation: 'duplicate',
          sourcePath: 'report.csv',
          destinationPath: 'report copy.csv',
        });
      }),
    );
    renderWorkspacePage();

    await openEntryMenu('report.csv');
    fireEvent.click(screen.getByRole('menuitem', { name: /duplicate/i }));

    await waitFor(() =>
      expect(operationBody).toEqual({
        operation: 'duplicate',
        sourcePath: 'report.csv',
        destinationPath: 'report copy.csv',
        overwrite: false,
        recursive: false,
      }),
    );
  });

  it('duplicates a directory recursively', async () => {
    server.use(...baseHandlers());
    let operationBody: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/api/workspaces/${WS}/fs/operation`, async ({ request }) => {
        operationBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          success: true,
          operation: 'duplicate',
          sourcePath: 'docs',
          destinationPath: 'docs copy',
        });
      }),
    );
    renderWorkspacePage();

    await openEntryMenu('docs');
    fireEvent.click(screen.getByRole('menuitem', { name: /duplicate/i }));

    await waitFor(() =>
      expect(operationBody).toEqual({
        operation: 'duplicate',
        sourcePath: 'docs',
        destinationPath: 'docs copy',
        overwrite: false,
        recursive: true,
      }),
    );
  });

  it('renames a file via the rename dialog and POST /fs/operation', async () => {
    server.use(...baseHandlers());
    let operationBody: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/api/workspaces/${WS}/fs/operation`, async ({ request }) => {
        operationBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          success: true,
          operation: 'rename',
          sourcePath: 'report.csv',
          destinationPath: 'renamed.csv',
        });
      }),
    );
    renderWorkspacePage();

    await openEntryMenu('report.csv');
    fireEvent.click(screen.getByRole('menuitem', { name: /rename/i }));

    const input = await screen.findByPlaceholderText('New name');
    fireEvent.change(input, { target: { value: 'renamed.csv' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));

    await waitFor(() =>
      expect(operationBody).toEqual({
        operation: 'rename',
        sourcePath: 'report.csv',
        destinationPath: 'renamed.csv',
        overwrite: false,
        recursive: false,
      }),
    );
  });

  it('cut and paste issues a move operation', async () => {
    server.use(...baseHandlers());
    let operationBody: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/api/workspaces/${WS}/fs/operation`, async ({ request }) => {
        operationBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          success: true,
          operation: 'move',
          sourcePath: 'report.csv',
          destinationPath: 'report.csv',
        });
      }),
    );
    renderWorkspacePage();

    await openEntryMenu('report.csv');
    fireEvent.click(screen.getByRole('menuitem', { name: /cut/i }));

    const pasteButton = await screen.findByLabelText('Paste into current directory');
    fireEvent.click(pasteButton);

    await waitFor(() =>
      expect(operationBody).toEqual({
        operation: 'move',
        sourcePath: 'report.csv',
        destinationPath: 'report.csv',
        overwrite: false,
        recursive: false,
      }),
    );

    // Cut clears the clipboard after a successful paste
    await waitFor(() => expect(screen.queryByLabelText('Paste into current directory')).toBeNull());
  });

  it('copy and paste issues a copy operation and keeps the clipboard', async () => {
    server.use(...baseHandlers());
    let operationBody: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE_URL}/api/workspaces/${WS}/fs/operation`, async ({ request }) => {
        operationBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          success: true,
          operation: 'copy',
          sourcePath: 'report.csv',
          destinationPath: 'report.csv',
        });
      }),
    );
    renderWorkspacePage();

    await openEntryMenu('report.csv');
    fireEvent.click(screen.getByRole('menuitem', { name: /copy/i }));

    const pasteButton = await screen.findByLabelText('Paste into current directory');
    fireEvent.click(pasteButton);

    await waitFor(() =>
      expect(operationBody).toEqual({
        operation: 'copy',
        sourcePath: 'report.csv',
        destinationPath: 'report.csv',
        overwrite: false,
        recursive: false,
      }),
    );

    // Copy keeps the clipboard so the item can be pasted again
    expect(screen.getByLabelText('Paste into current directory')).toBeTruthy();
  });

  it('deletes a file via DELETE /fs/delete with recursive and force', async () => {
    server.use(...baseHandlers());
    let deleteUrl: URL | undefined;
    server.use(
      http.delete(`${BASE_URL}/api/workspaces/${WS}/fs/delete`, ({ request }) => {
        deleteUrl = new URL(request.url);
        return HttpResponse.json({ success: true, path: 'report.csv' });
      }),
    );
    renderWorkspacePage();

    await openEntryMenu('report.csv');
    fireEvent.click(screen.getByRole('menuitem', { name: /delete/i }));

    await screen.findByText('Delete Item');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleteUrl).toBeTruthy());
    expect(deleteUrl!.searchParams.get('path')).toBe('report.csv');
    expect(deleteUrl!.searchParams.get('recursive')).toBe('true');
    expect(deleteUrl!.searchParams.get('force')).toBe('true');
  });
});

describe('Workspace page — sharing UI', () => {
  it('shows Windows sharing details without a credential URL', async () => {
    server.use(...baseHandlers());
    renderWorkspacePage();

    const trigger = await screen.findByLabelText('Sharing options');
    fireEvent.click(trigger, { button: 0 });
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
    fireEvent.click(screen.getByRole('menuitem', { name: /access in windows/i }));

    expect(await screen.findByText('Access in Windows')).toBeTruthy();
    expect(await screen.findByText('Map a network drive in Windows File Explorer.')).toBeTruthy();
    expect(screen.getByText('https://files.example.com/dav/')).toBeTruthy();
    expect(screen.getByText('webdav-user')).toBeTruthy();
    expect(screen.getByText('app-password-123')).toBeTruthy();
    expect(screen.getByText('WebDAV URL')).toBeTruthy();
    expect(screen.queryByText('Credential URL')).toBeNull();
  });

  it('shows Ubuntu sharing details with the GNOME Files URL and credential URL', async () => {
    server.use(...baseHandlers());
    renderWorkspacePage();

    const trigger = await screen.findByLabelText('Sharing options');
    fireEvent.click(trigger, { button: 0 });
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
    fireEvent.click(screen.getByRole('menuitem', { name: /access in ubuntu/i }));

    expect(await screen.findByText('Access in Ubuntu')).toBeTruthy();
    expect(await screen.findByText('Open GNOME Files and connect to the server.')).toBeTruthy();
    expect(screen.getByText('GNOME Files URL')).toBeTruthy();
    expect(screen.getByText('Credential URL')).toBeTruthy();
    expect(screen.getAllByText('davs://webdav-user@files.example.com/dav/').length).toBeGreaterThan(0);
  });

  it('shows macOS sharing details with the https credential URL', async () => {
    server.use(...baseHandlers());
    renderWorkspacePage();

    const trigger = await screen.findByLabelText('Sharing options');
    fireEvent.click(trigger, { button: 0 });
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
    fireEvent.click(screen.getByRole('menuitem', { name: /access in macos/i }));

    expect(await screen.findByText('Access in macOS')).toBeTruthy();
    expect(await screen.findByText('Use Finder Go > Connect to Server.')).toBeTruthy();
    expect(screen.getByText('Credential URL')).toBeTruthy();
    expect(screen.getByText('https://webdav-user:app-password-123@files.example.com/dav/')).toBeTruthy();
  });

  it('shows the sharing endpoint error inside the dialog', async () => {
    server.use(...baseHandlers());
    server.use(
      http.get(`${BASE_URL}${appRoute('/workspace/sharing')}`, () =>
        HttpResponse.json({ error: 'Sharing is not configured' }, { status: 503 }),
      ),
    );
    renderWorkspacePage();

    const trigger = await screen.findByLabelText('Sharing options');
    fireEvent.click(trigger, { button: 0 });
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
    fireEvent.click(screen.getByRole('menuitem', { name: /access in windows/i }));

    expect(await screen.findByText('Access in Windows')).toBeTruthy();
    expect(await screen.findByText('Sharing is not configured')).toBeTruthy();
  });
});
