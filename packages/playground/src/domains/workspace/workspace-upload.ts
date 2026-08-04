import type { WorkspaceItem } from './types';

/**
 * Where uploads land, relative to the workspace root.
 *
 * `private/` is the signed-in user's own durable home, mounted into every one
 * of their sandboxes; the workspace root itself is scratch that is deleted
 * when the sandbox lease expires. Uploading to the root would silently lose
 * the file, so uploads always go to the private home.
 */
export const WORKSPACE_UPLOAD_DIRECTORY = 'private/uploads';

export function sanitizeWorkspaceUploadFileName(fileName: string): string {
  const cleaned = fileName.replace(/[\\/]/g, '_').trim();
  return cleaned || 'upload';
}

export function buildWorkspaceUploadPath(fileName: string, directory = WORKSPACE_UPLOAD_DIRECTORY): string {
  const safeFileName = sanitizeWorkspaceUploadFileName(fileName);
  const safeDirectory = directory.replace(/^\/+|\/+$/g, '');

  return safeDirectory ? `${safeDirectory}/${safeFileName}` : safeFileName;
}

/** Where the sandbox mounts the workspace volume — the provider's workingDir default. */
export const WORKSPACE_SANDBOX_ROOT = '/workspace';

export function buildWorkspaceUploadNotice(paths: string[], root: string = WORKSPACE_SANDBOX_ROOT): string {
  if (paths.length === 0) return '';

  const prefix = root.replace(/\/+$/, '');
  const label = paths.length === 1 ? 'workspace file' : 'workspace files';
  return `Uploaded ${label}:\n${paths.map(path => `- ${prefix}/${path.replace(/^\/+/, '')}`).join('\n')}`;
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

/**
 * Upload into the workspace the answering agent actually reads through.
 *
 * An agent resolves exactly one workspace per request, so a file written to
 * any other one is invisible to it no matter how durable that storage is —
 * the agent simply has no tool that can reach it. Durability is handled
 * instead by writing under `WORKSPACE_UPLOAD_DIRECTORY`, the user's own home
 * inside that workspace. A config-owned workspace is only a fallback, for
 * deployments where the agent has no writable workspace of its own.
 */
export function selectWorkspaceForUpload(workspaces: WorkspaceItem[], agentId?: string): WorkspaceItem | undefined {
  const writableWorkspaces = workspaces.filter(
    workspace => workspace.capabilities.hasFilesystem && !workspace.safety.readOnly,
  );

  return (
    writableWorkspaces.find(workspace => workspace.agentId === agentId) ??
    writableWorkspaces.find(workspace => workspace.source === 'mastra') ??
    writableWorkspaces[0]
  );
}

/**
 * Where a sandbox sees the chosen workspace's files.
 *
 * Every workspace's filesystem paths are relative to its own root, and a
 * sandbox mounts that root at `WORKSPACE_SANDBOX_ROOT`, so the announced path
 * is the upload path under that root — the same string for every workspace.
 * Announcing a separate org wide root here used to name a tree that no longer
 * exists, sending the agent to look for the file somewhere it was never
 * written.
 */
export function workspaceUploadNoticeRoot(_workspace: Pick<WorkspaceItem, 'source'>): string {
  return WORKSPACE_SANDBOX_ROOT;
}
