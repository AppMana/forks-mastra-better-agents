import { useComposerRuntime } from '@assistant-ui/react';
import { toast } from '@mastra/playground-ui';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  buildWorkspaceUploadNotice,
  completeWorkspaceUploadFile,
  selectWorkspaceForUpload,
  startWorkspaceUploadProgress,
  uploadWorkspaceFile,
} from '../workspace-upload';
import type { WorkspaceUploadProgress } from '../workspace-upload';
import { useWorkspaces, useWriteWorkspaceFileFromFile } from '.';

/**
 * One file, uploaded the one way.
 *
 * Split out of `useWorkspaceUpload` so the composer's "+" attachment adapter —
 * which uploads a single file at a time and has no composer text to inject
 * into — can reuse the transport, the workspace selection and the announced
 * path instead of growing a second copy of them.
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
 * upload button: uploads with byte-weighted progress, then injects the
 * sandbox-visible paths into the composer text.
 */
export function useWorkspaceUpload(agentId?: string) {
  const [uploadProgress, setUploadProgress] = useState<WorkspaceUploadProgress | null>(null);
  const composerRuntime = useComposerRuntime();
  const { uploadFile, workspace: selectedWorkspace } = useWorkspaceFileUploader(agentId);

  const uploadFiles = async (files: FileList | File[] | null) => {
    const fileArray = files ? Array.from(files) : [];
    if (!selectedWorkspace || fileArray.length === 0) return;

    const uploadedPaths: string[] = [];
    let progress = startWorkspaceUploadProgress(fileArray);
    setUploadProgress(progress);

    // Empty once the application's upload route answers: the paths it returns
    // are already absolute, so there is no root left to prepend.
    let noticeRoot = '';

    try {
      for (const [index, file] of fileArray.entries()) {
        const uploaded = await uploadFile(file);
        uploadedPaths.push(uploaded.path);
        noticeRoot = uploaded.noticeRoot;
        progress = completeWorkspaceUploadFile(progress, file, fileArray[index + 1]?.name ?? null);
        setUploadProgress(progress);
      }

      const currentText = (composerRuntime.getState() as { text?: string }).text ?? '';
      const notice = buildWorkspaceUploadNotice(uploadedPaths, noticeRoot);
      composerRuntime.setText([currentText.trim(), notice].filter(Boolean).join('\n\n'));
      toast.success(`Uploaded ${uploadedPaths.length} workspace file${uploadedPaths.length === 1 ? '' : 's'}`);
    } catch (error) {
      toast.error(`Failed to upload workspace file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadProgress(null);
    }
  };

  return { uploadFiles, uploadProgress, canUpload: !!selectedWorkspace };
}
