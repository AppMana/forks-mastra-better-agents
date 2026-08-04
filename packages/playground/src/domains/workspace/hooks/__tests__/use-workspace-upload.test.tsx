// @vitest-environment jsdom
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WorkspacesListResponse } from '../../types';
import { useWorkspaceUpload } from '../use-workspace-upload';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';
const WORKSPACE_ID = 'ws-1';

const toastError = vi.fn<(message: string) => void>();
const toastSuccess = vi.fn<(message: string) => void>();

// Thin seams only: the toast sink we assert on, and the composer runtime,
// which is @assistant-ui context rather than our own code. Everything below
// them — the upload hook, React Query, and the real @mastra/client-js
// transport — runs for real against MSW, which is the point: the defect being
// pinned lives in how the transport reads the response.
vi.mock('@mastra/playground-ui', () => ({
  toast: {
    error: (message: string) => toastError(message),
    success: (message: string) => toastSuccess(message),
  },
}));

vi.mock('@assistant-ui/react', () => ({
  useComposerRuntime: () => ({
    getState: () => ({ text: '' }),
    setText: () => {},
  }),
}));

const workspaces: WorkspacesListResponse = {
  workspaces: [
    {
      id: WORKSPACE_ID,
      name: 'Workspace',
      status: 'active',
      source: 'mastra',
      capabilities: {
        hasFilesystem: true,
        hasSandbox: false,
        canBM25: false,
        canVector: false,
        canHybrid: false,
        hasSkills: false,
      },
      safety: { readOnly: false },
    },
  ],
};

const wrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <MastraReactProvider baseUrl={BASE_URL}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MastraReactProvider>
  );
};

const listWorkspaces = () => http.get(`${BASE_URL}/api/workspaces`, () => HttpResponse.json(workspaces));

const renderUpload = async () => {
  const { result } = renderHook(() => useWorkspaceUpload(), { wrapper: wrapper() });
  await waitFor(() => expect(result.current.canUpload).toBe(true));
  return result;
};

const spreadsheet = () => {
  const bytes = new Uint8Array(64);
  const file = new File([bytes], 'quarterly_report.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  // jsdom's Blob predates `arrayBuffer()`, which the base64 encoder uses.
  if (typeof file.arrayBuffer !== 'function') {
    Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer });
  }
  return file;
};

afterEach(() => {
  toastError.mockReset();
  toastSuccess.mockReset();
});

describe('useWorkspaceUpload error reporting', () => {
  /**
   * The regression that started this. Hono's `bodyLimit` rejected an
   * over-limit upload by returning a plain object from `onError`, so the
   * response was `200 OK` with no body at all. The transport called
   * `response.json()` on the 2xx and the user was told "Unexpected end of
   * JSON input" — a parser message that names neither the upload, the status,
   * nor the size limit that actually caused it.
   */
  it('does not report a JSON parse error when the server returns an empty 200', async () => {
    server.use(
      listWorkspaces(),
      http.post(`${BASE_URL}/api/workspaces/${WORKSPACE_ID}/fs/write`, () => new HttpResponse(null, { status: 200 })),
    );

    const result = await renderUpload();
    await result.current.uploadFiles([spreadsheet()]);

    await waitFor(() => expect(toastError).toHaveBeenCalled());

    const message = toastError.mock.calls[0]![0];
    expect(message).not.toMatch(/Unexpected end of JSON input/);
    expect(message).toMatch(/empty response/i);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  /**
   * With the limit reported properly, the reason has to survive all the way to
   * the toast — the status alone is not actionable.
   */
  it('surfaces the server reason and status for a 413', async () => {
    server.use(
      listWorkspaces(),
      http.post(`${BASE_URL}/api/workspaces/${WORKSPACE_ID}/fs/write`, () =>
        HttpResponse.json(
          { error: 'Request body too large. The maximum accepted request body is 90177537 bytes' },
          { status: 413 },
        ),
      ),
    );

    const result = await renderUpload();
    await result.current.uploadFiles([spreadsheet()]);

    await waitFor(() => expect(toastError).toHaveBeenCalled());

    const message = toastError.mock.calls[0]![0];
    expect(message).toContain('413');
    expect(message).toMatch(/too large/i);
  });

  /** A proxy or dev server can answer HTML; that text is the useful clue. */
  it('surfaces a non-JSON body rather than the parser complaint', async () => {
    server.use(
      listWorkspaces(),
      http.post(
        `${BASE_URL}/api/workspaces/${WORKSPACE_ID}/fs/write`,
        () => new HttpResponse('<html>413 Request Entity Too Large</html>', { status: 200 }),
      ),
    );

    const result = await renderUpload();
    await result.current.uploadFiles([spreadsheet()]);

    await waitFor(() => expect(toastError).toHaveBeenCalled());

    const message = toastError.mock.calls[0]![0];
    expect(message).toContain('Request Entity Too Large');
    expect(message).not.toMatch(/Unexpected token/);
  });

  it('still reports success when the write succeeds', async () => {
    server.use(
      listWorkspaces(),
      http.post(`${BASE_URL}/api/workspaces/${WORKSPACE_ID}/fs/write`, () =>
        HttpResponse.json({ success: true, path: 'private/uploads/quarterly_report.xlsx' }),
      ),
    );

    const result = await renderUpload();
    await result.current.uploadFiles([spreadsheet()]);

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(toastError).not.toHaveBeenCalled();
  });
});
