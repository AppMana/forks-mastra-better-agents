import { useComposerRuntime } from '@assistant-ui/react';
import { toast } from '@mastra/playground-ui';
import { useMemo, useState } from 'react';
import {
  buildWorkspaceUploadNotice,
  buildWorkspaceUploadPath,
  completeWorkspaceUploadFile,
  selectWorkspaceForUpload,
  startWorkspaceUploadProgress,
  uploadFileToAppRoute,
  workspaceUploadNoticeRoot,
} from '../workspace-upload';
import type { WorkspaceUploadProgress } from '../workspace-upload';
import { useWorkspaces, useWriteWorkspaceFileFromFile } from '.';

/**
 * The one workspace-upload flow, shared by the composer button and the
 * drag-and-drop overlay: uploads to the durable workspace with byte-weighted
 * progress, then injects the sandbox-visible paths into the composer text.
 */
export function useWorkspaceUpload(agentId?: string) {
  const [uploadProgress, setUploadProgress] = useState<WorkspaceUploadProgress | null>(null);
  const composerRuntime = useComposerRuntime();
  const { data: workspacesData } = useWorkspaces();
  const writeWorkspaceFile = useWriteWorkspaceFileFromFile();

  const selectedWorkspace = useMemo(
    () => selectWorkspaceForUpload(workspacesData?.workspaces ?? [], agentId),
    [agentId, workspacesData?.workspaces],
  );

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
        const uploaded = await uploadFileToAppRoute(file);
        if (uploaded) {
          uploadedPaths.push(uploaded.workspacePath);
        } else {
          // No application upload route: the workspace file API is the only
          // transport, and the file can only land in that workspace's own
          // tree, at the mount that workspace is visible under.
          const path = buildWorkspaceUploadPath(file.name);
          await writeWorkspaceFile.mutateAsync({
            workspaceId: selectedWorkspace.id,
            path,
            file,
            recursive: true,
          });
          uploadedPaths.push(path);
          noticeRoot = workspaceUploadNoticeRoot(selectedWorkspace);
        }
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
