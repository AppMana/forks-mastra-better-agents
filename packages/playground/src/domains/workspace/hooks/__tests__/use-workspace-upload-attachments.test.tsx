// @vitest-environment jsdom
/**
 * What a dropped file turns into.
 *
 * Dropping a file on the composer used to upload it and then paste
 * "Uploaded workspace file:\n- /uploads/…" into the composer's text, in front
 * of the user, where they could edit or delete the one string the agent needs
 * to find the file. The "+" button never did that — it attaches through the
 * composer's adapter, which holds the path until the message is sent — so the
 * two gestures produced two different results from the same upload.
 *
 * These cases pin the intended split: the chip is for the human, the announced
 * path is for the agent, and neither gesture may put the announcement into the
 * text being composed.
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
import { convertToAIAttachments } from '@/services/attachment-messages';
import { server } from '@/test/msw-server';

const BASE_URL = 'http://localhost:4111';
const WORKSPACE_ID = 'ws-1';

/** What the user had already typed when the file landed on the composer. */
const TYPED = 'what are the totals in this sheet?';

/** The path the application's upload route reports, absolute and agent-visible. */
const UPLOADED_PATH = '/uploads/CANARY_FILE_4.xls';

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
      name: 'Workspace',
      status: 'active',
      source: 'agent',
      agentId: 'document-analyst',
      capabilities: {
        hasFilesystem: true,
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

const wrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <MastraReactProvider baseUrl={BASE_URL}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MastraReactProvider>
  );
};

const listWorkspaces = () => http.get(`${BASE_URL}/api/workspaces`, () => HttpResponse.json(workspaces));

const uploadRoute = (seen?: (directory: string) => void) =>
  http.post('/app/workspace/upload', async ({ request }) => {
    const form = await request.formData();
    const file = form.get('files') as File;
    seen?.(form.get('path')!.toString());
    return HttpResponse.json({
      uploaded: [{ name: file.name, size: file.size, path: 'uploads/CANARY_FILE_4.xls', workspacePath: UPLOADED_PATH }],
    });
  });

const spreadsheet = (name = 'CANARY_FILE_4.xls') => {
  const bytes = new Uint8Array(64);
  const file = new File([bytes], name, { type: 'application/vnd.ms-excel' });
  // jsdom's Blob predates `arrayBuffer()`, which the base64 encoder uses.
  if (typeof file.arrayBuffer !== 'function') {
    Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer });
  }
  return file;
};

/**
 * The drop path, wired the way the app wires it: the real upload transport, the
 * real attachment adapter, and `useWorkspaceUpload` reaching both through the
 * composer runtime.
 */
const renderDrop = async () => {
  const { result } = renderHook(
    () => {
      const { uploadFile } = useWorkspaceFileUploader('document-analyst');
      const adapter = useMemo(
        () => new WorkspaceUploadAttachmentAdapter(uploadFile, message => toastError(message)),
        [uploadFile],
      );
      composer.current = useMemo(() => createComposerHarness(adapter, TYPED), [adapter]);
      return { upload: useWorkspaceUpload('document-analyst'), adapter };
    },
    { wrapper: wrapper() },
  );
  await waitFor(() => expect(result.current.upload.canUpload).toBe(true));
  return result;
};

afterEach(() => {
  toastError.mockReset();
  toastSuccess.mockReset();
  composer.current = undefined;
});

describe('dropping a file on the composer', () => {
  it('shows the file as an attachment chip instead of writing a notice into the composer', async () => {
    server.use(listWorkspaces(), uploadRoute());

    const result = await renderDrop();
    await result.current.upload.uploadFiles([spreadsheet()]);

    const harness = composer.current!;
    expect(harness.attachments).toHaveLength(1);
    expect(harness.attachments[0]!.name).toBe('CANARY_FILE_4.xls');
    expect(harness.attachments[0]!.status).toEqual({ type: 'requires-action', reason: 'composer-send' });

    // The text stays exactly what the user typed: the announcement is not prose
    // for them to read, edit or delete.
    expect(harness.setText).not.toHaveBeenCalled();
    expect(harness.runtime.getState().text).toBe(TYPED);
    expect(harness.runtime.getState().text).not.toContain('Uploaded workspace file');
    expect(harness.runtime.getState().text).not.toContain(UPLOADED_PATH);
  });

  it('still sends the absolute uploaded path to the agent', async () => {
    server.use(listWorkspaces(), uploadRoute());

    const result = await renderDrop();
    await result.current.upload.uploadFiles([spreadsheet()]);

    const sent = await composer.current!.send();
    const messages = await convertToAIAttachments(sent);

    expect(JSON.stringify(messages)).toContain(UPLOADED_PATH);
    expect(JSON.stringify(messages)).toContain('Uploaded workspace file');
  });

  it('drops the announcement but keeps the file uploaded when the chip is removed', async () => {
    const uploads: string[] = [];
    server.use(
      listWorkspaces(),
      uploadRoute(directory => uploads.push(directory)),
    );

    const result = await renderDrop();
    await result.current.upload.uploadFiles([spreadsheet()]);

    const { adapter } = result.current;
    const chip = composer.current!.attachments[0]!;
    await adapter.remove(chip);

    // Nothing is deleted from the workspace — the upload already happened and
    // the file stays there — but the message no longer names it.
    expect(uploads).toEqual(['uploads']);
    await expect(adapter.send(chip)).rejects.toThrow(/was not uploaded to the workspace/);
  });

  it('attaches every file of a multi-file drop', async () => {
    server.use(listWorkspaces(), uploadRoute());

    const result = await renderDrop();
    await result.current.upload.uploadFiles([spreadsheet('a.xls'), spreadsheet('b.xls')]);

    expect(composer.current!.attachments.map(attachment => attachment.name)).toEqual(['a.xls', 'b.xls']);
    expect(composer.current!.setText).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith('Uploaded 2 workspace files');
  });
});
