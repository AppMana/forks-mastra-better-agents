import type { WorkspaceItem } from './types';

export const WORKSPACE_UPLOAD_DIRECTORY = 'uploads';

export function sanitizeWorkspaceUploadFileName(fileName: string): string {
  const cleaned = fileName.replace(/[\\/]/g, '_').trim();
  return cleaned || 'upload';
}

export function buildWorkspaceUploadPath(fileName: string, directory = WORKSPACE_UPLOAD_DIRECTORY): string {
  const safeFileName = sanitizeWorkspaceUploadFileName(fileName);
  const safeDirectory = directory.replace(/^\/+|\/+$/g, '');

  return safeDirectory ? `${safeDirectory}/${safeFileName}` : safeFileName;
}

export function buildWorkspaceUploadNotice(paths: string[]): string {
  if (paths.length === 0) return '';

  const label = paths.length === 1 ? 'workspace file' : 'workspace files';
  return `Uploaded ${label}:\n${paths.map(path => `- /${path.replace(/^\/+/, '')}`).join('\n')}`;
}

export interface WorkspaceUploadProgress {
  totalFiles: number;
  completedFiles: number;
  totalBytes: number;
  completedBytes: number;
  currentFileName: string | null;
}

export function startWorkspaceUploadProgress(
  files: ReadonlyArray<{ name: string; size: number }>,
): WorkspaceUploadProgress {
  return {
    totalFiles: files.length,
    completedFiles: 0,
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
    completedBytes: 0,
    currentFileName: files[0]?.name ?? null,
  };
}

export function completeWorkspaceUploadFile(
  progress: WorkspaceUploadProgress,
  file: { name: string; size: number },
  nextFileName: string | null,
): WorkspaceUploadProgress {
  return {
    ...progress,
    completedFiles: progress.completedFiles + 1,
    completedBytes: progress.completedBytes + file.size,
    currentFileName: nextFileName,
  };
}

/** Byte-weighted completion percentage, 0-100. Empty uploads count as done. */
export function workspaceUploadPercent(progress: WorkspaceUploadProgress): number {
  if (progress.totalBytes <= 0) {
    return progress.completedFiles >= progress.totalFiles ? 100 : 0;
  }
  return Math.min(100, Math.round((progress.completedBytes / progress.totalBytes) * 100));
}

export function formatWorkspaceUploadLabel(progress: WorkspaceUploadProgress): string {
  const position = Math.min(progress.completedFiles + 1, progress.totalFiles);
  const counter = progress.totalFiles > 1 ? ` (${position}/${progress.totalFiles})` : '';
  return progress.currentFileName ? `Uploading ${progress.currentFileName}${counter}` : 'Uploading';
}

/**
 * Encode a File as base64 without building a per-byte string: the naive
 * `btoa(bytes.reduce(concat))` is quadratic and freezes the tab on
 * multi-megabyte uploads.
 */
export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunks: string[] = [];
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
  }
  return btoa(chunks.join(''));
}

export function selectWorkspaceForUpload(workspaces: WorkspaceItem[], agentId?: string): WorkspaceItem | undefined {
  const writableWorkspaces = workspaces.filter(
    workspace => workspace.capabilities.hasFilesystem && !workspace.safety.readOnly,
  );

  return writableWorkspaces.find(workspace => workspace.agentId === agentId) ?? writableWorkspaces[0];
}
