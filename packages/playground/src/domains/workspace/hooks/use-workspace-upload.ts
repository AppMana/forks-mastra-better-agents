import { useComposerRuntime } from '@assistant-ui/react';
import { toast } from '@mastra/playground-ui';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  completeWorkspaceUploadFile,
  selectWorkspaceForUpload,
  startWorkspaceUploadProgress,
  uploadWorkspaceFile,
} from '../workspace-upload';
import type { WorkspaceUploadProgress } from '../workspace-upload';
import { useWorkspaces, useWriteWorkspaceFileFromFile } from '.';
import { reportAttachmentFailure } from '@/lib/ai-ui/hooks/use-composer-add-attachment';

/**
 * One file, uploaded the one way.
 *
 * Split out of `useWorkspaceUpload` so the composer's attachment adapter —
 * which uploads one file at a time, whichever gesture offered it — can reuse
 * the transport, the workspace selection and the announced path instead of
 * growing a second copy of them.
 */
export function useWorkspaceFileUploader(agentId?: string) {
  const { data: workspacesData } = useWorkspaces();
  const writeWorkspaceFile = useWriteWorkspaceFileFromFile();

  const workspace = useMemo(
    () => selectWorkspaceForUpload(workspacesData?.workspaces ?? [], agentId),
    [agentId, workspacesData?.workspaces],
  );

  // React Query returns a fresh mutation object every render; reaching it
  // through a ref keeps `uploadFile` referentially stable, which is what lets
  // the attachment adapter be memoised on it rather than rebuilt mid-upload.
  const writeRef = useRef(writeWorkspaceFile);
  writeRef.current = writeWorkspaceFile;

  const uploadFile = useCallback(
    (file: File) =>
      uploadWorkspaceFile(file, {
        workspace,
        writeWorkspaceFile: params => writeRef.current.mutateAsync(params),
      }),
    [workspace],
  );

  return { uploadFile, workspace };
}

/**
 * The batch workspace-upload flow behind the drag-and-drop overlay and the
 * upload button: every dropped file becomes a composer attachment, with
 * byte-weighted progress across the batch.
 *
 * The files go through `composerRuntime.addAttachment`, which is the composer's
 * own attachment adapter — the same one the "+" button uses. That adapter
 * uploads the file and keeps the announced path to itself until the message is
 * sent, so the user sees a chip they can remove and the agent still receives
 * the absolute path in the request text.
 *
 * Uploading here instead, and writing the notice into the composer with
 * `setText`, is what put "Uploaded workspace file: - /uploads/…" in front of
 * the user as editable prose: the announcement is for the agent, the chip is
 * for the human, and one gesture must not produce a different result from the
 * other.
 *
 * Nothing here is gated on the client having found a writable workspace in the
 * list. The transport is the application's own upload route, which the client
 * cannot enumerate and which needs no workspace at all — a listed workspace is
 * only the fallback for deployments that serve no such route. Gating on it
 * meant a list that under-reported its workspaces (a per-request filesystem
 * resolver reads as "no filesystem") silently removed the drag-and-drop
 * overlay and the upload button while the "+" button, on the same transport,
 * kept working. A file with nowhere to go is refused loudly by the adapter
 * instead, which is the same report every other upload failure gets.
 */
export function useWorkspaceUpload() {
  const [uploadProgress, setUploadProgress] = useState<WorkspaceUploadProgress | null>(null);
  const composerRuntime = useComposerRuntime();

  const uploadFiles = async (files: FileList | File[] | null) => {
    const fileArray = files ? Array.from(files) : [];
    if (fileArray.length === 0) return;

    let progress = startWorkspaceUploadProgress(fileArray);
    setUploadProgress(progress);

    try {
      for (const [index, file] of fileArray.entries()) {
        try {
          // Resolves once the adapter has uploaded the file and settled its
          // chip; rejects when the upload was refused, and the chip is left
          // incomplete so the message cannot go out naming a missing path.
          await composerRuntime.addAttachment(file);
        } catch (error) {
          // The same reporting the "+" button uses, so a refused drop reads
          // identically however the file was offered.
          reportAttachmentFailure(file, error);
          return;
        }
        progress = completeWorkspaceUploadFile(progress, file, fileArray[index + 1]?.name ?? null);
        setUploadProgress(progress);
      }

      toast.success(`Uploaded ${fileArray.length} workspace file${fileArray.length === 1 ? '' : 's'}`);
    } finally {
      setUploadProgress(null);
    }
  };

  return { uploadFiles, uploadProgress };
}
