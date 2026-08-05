// @vitest-environment jsdom
/**
 * Where an upload lands, and what path the message then announces.
 *
 * These two have to be the same string. When they drifted apart, the agent was
 * told to open a path nothing had been written to; it spent its first several
 * turns hunting the filesystem, then read the whole workbook through a shell
 * command to make progress at all. That is how a one-line question became a
 * twenty-thousand-token prompt: not because the file was pasted into the
 * message, but because a wrong path made the agent brute-force the file into
 * the transcript.
 *
 * The announced path is therefore the server's answer, never a path the client
 * assembled from a directory constant and an assumed mount root: only the
 * server knows which volume subPath a sandbox mounts where. It is asserted on
 * the attachment the composer would send, which is where the path lives now —
 * the composer's text carries the user's question and nothing else.
 */
import { MastraReactProvider } from '@mastra/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WorkspacesListResponse } from '../../types';
import { useWorkspaceFileUploader, useWorkspaceUpload } from '../use-workspace-upload';
import type { ComposerHarness } from './composer-harness';
import { createComposerHarness } from './composer-harness';
import { WorkspaceUploadAttachmentAdapter } from '@/lib/ai-ui/attachments/workspace-upload-adapter';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';
const WORKSPACE_ID = 'ws-1';

const TYPED = 'give me a summary of the contents of this file';

const composer = vi.hoisted(() => ({ current: undefined as ComposerHarness | undefined }));

const toastError = vi.fn<(message: string) => void>();
const toastSuccess = vi.fn<(message: string) => void>();

vi.mock('@mastra/playground-ui', () => ({
  toast: {
    error: (message: string) => toastError(message),
    success: (message: string) => toastSuccess(message),
    info: (message: string) => message,
  },
}));

vi.mock('@assistant-ui/react', () => ({
  useComposer: () => false,
  useComposerRuntime: () => composer.current!.runtime,
}));

const workspaces: WorkspacesListResponse = {
  workspaces: [
    {
      id: WORKSPACE_ID,
      name: 'Shared Workspace',
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

const spreadsheet = () => {
  const bytes = new Uint8Array(64);
  const file = new File([bytes], 'tables_workbook.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  // jsdom's Blob predates `arrayBuffer()`, which the base64 encoder uses.
  if (typeof file.arrayBuffer !== 'function') {
    Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer });
  }
  return file;
};

/** The drop path with the real transport and the real attachment adapter. */
const renderUpload = async () => {
  const { result } = renderHook(
    () => {
      const { uploadFile, workspace } = useWorkspaceFileUploader('document-analyst');
      const adapter = useMemo(
        () => new WorkspaceUploadAttachmentAdapter(uploadFile, message => toastError(message)),
        [uploadFile],
      );
      composer.current = useMemo(() => createComposerHarness(adapter, TYPED), [adapter]);
      return { ...useWorkspaceUpload(), workspace };
    },
    { wrapper: wrapper() },
  );
  // The adapter's fallback transport writes into this workspace, so the list
  // has to have been answered before anything is dropped.
  await waitFor(() => expect(result.current.workspace).toBeDefined());
  return result;
};

/** The text the message would carry: every sent attachment's own content. */
const announced = async () => {
  const sent = await composer.current!.send();
  return sent
    .flatMap(attachment => attachment.content)
    .map(part => (part.type === 'text' ? part.text : ''))
    .join('\n');
};

afterEach(() => {
  toastError.mockReset();
  toastSuccess.mockReset();
  composer.current = undefined;
});

describe('useWorkspaceUpload announced path', () => {
  it('announces the path the upload route reports, not one derived on the client', async () => {
    server.use(
      listWorkspaces(),
      http.post(`/app/workspace/upload`, () =>
        HttpResponse.json({
          uploaded: [
            {
              name: 'tables_workbook.xlsx',
              size: 64,
              path: 'uploads/tables_workbook.xlsx',
              workspacePath: '/workspace/private/uploads/tables_workbook.xlsx',
            },
          ],
        }),
      ),
    );

    const result = await renderUpload();
    await result.current.uploadFiles([spreadsheet()]);

    expect(await announced()).toContain('/workspace/private/uploads/tables_workbook.xlsx');
    // The question the user already typed survives, untouched.
    expect(composer.current!.runtime.getState().text).toBe(TYPED);
  });

  it('sends the file as multipart rather than base64 in a JSON body', async () => {
    const seen = vi.fn<(contentType: string | null) => void>();
    server.use(
      listWorkspaces(),
      http.post(`/app/workspace/upload`, ({ request }) => {
        seen(request.headers.get('content-type'));
        return HttpResponse.json({
          uploaded: [
            {
              name: 'tables_workbook.xlsx',
              size: 64,
              path: 'uploads/tables_workbook.xlsx',
              workspacePath: '/workspace/private/uploads/tables_workbook.xlsx',
            },
          ],
        });
      }),
    );

    const result = await renderUpload();
    await result.current.uploadFiles([spreadsheet()]);

    await waitFor(() => expect(seen).toHaveBeenCalled());
    expect(seen.mock.calls[0]![0]).toMatch(/multipart\/form-data/);
  });

  /**
   * Upstream Studio installs serve no application routes. There the workspace
   * file API is the only transport, and the announced root must be the mount
   * that workspace is actually visible at — for a config-owned ('mastra')
   * workspace that is /workspace/shared, not /workspace.
   */
  it('falls back to the workspace file API and its real mount root when no upload route exists', async () => {
    server.use(
      listWorkspaces(),
      http.post(`/app/workspace/upload`, () => new HttpResponse(null, { status: 404 })),
      http.post(`${BASE_URL}/api/workspaces/${WORKSPACE_ID}/fs/write`, () =>
        HttpResponse.json({ success: true, path: 'uploads/tables_workbook.xlsx' }),
      ),
    );

    const result = await renderUpload();
    await result.current.uploadFiles([spreadsheet()]);

    expect(await announced()).toContain('/workspace/shared/uploads/tables_workbook.xlsx');
  });

  /** Whatever the transport, the file's bytes never enter the message. */
  it('never puts file contents in the composed message', async () => {
    server.use(
      listWorkspaces(),
      http.post(`/app/workspace/upload`, () =>
        HttpResponse.json({
          uploaded: [
            {
              name: 'tables_workbook.xlsx',
              size: 64,
              path: 'uploads/tables_workbook.xlsx',
              workspacePath: '/workspace/private/uploads/tables_workbook.xlsx',
            },
          ],
        }),
      ),
    );

    const result = await renderUpload();
    await result.current.uploadFiles([spreadsheet()]);

    const composed = [composer.current!.runtime.getState().text, await announced()].join('\n');
    // A path notice is short by construction; file contents are not.
    expect(composed.length).toBeLessThan(400);
    expect(composed).not.toMatch(/PK/);
    expect(composed).not.toMatch(/base64/i);
  });
});
