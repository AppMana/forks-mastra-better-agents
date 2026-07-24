import { useComposerRuntime } from '@assistant-ui/react';
import { toast } from '@mastra/playground-ui';
import { useMemo, useState } from 'react';
import {
  buildWorkspaceUploadNotice,
  buildWorkspaceUploadPath,
  completeWorkspaceUploadFile,
  selectWorkspaceForUpload,
  startWorkspaceUploadProgress,
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

    try {
      for (const [index, file] of fileArray.entries()) {
        const path = buildWorkspaceUploadPath(file.name);
        await writeWorkspaceFile.mutateAsync({
          workspaceId: selectedWorkspace.id,
          path,
          file,
          recursive: true,
        });
        uploadedPaths.push(path);
        progress = completeWorkspaceUploadFile(progress, file, fileArray[index + 1]?.name ?? null);
        setUploadProgress(progress);
      }

      const currentText = (composerRuntime.getState() as { text?: string }).text ?? '';
      const notice = buildWorkspaceUploadNotice(uploadedPaths, workspaceUploadNoticeRoot(selectedWorkspace));
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
