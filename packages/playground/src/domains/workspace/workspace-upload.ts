import type { WorkspaceItem } from './types';
import { appRoute } from '@/lib/app-routes';

/**
 * Where uploads land, relative to the workspace root.
 *
 * Workspace-root-relative, and nothing more: a path written through the
 * workspace file API can only ever address that workspace's own tree. A
 * sandbox additionally mounts trees the file API cannot reach — a per-user
 * home, group shares — so naming one of those here writes the file into a
 * same-named subdirectory of the wrong tree while the composer announces the
 * mount, and the agent is sent somewhere the file was never written. Uploads
 * that must land in one of those trees go through the application's own
 * upload route, which knows the mounts.
 */
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
 * A per-agent workspace IS the sandbox's own filesystem, so its root is the
 * working directory. A config-owned ('mastra') workspace is a separate volume
 * the sandbox mounts alongside that working directory, at
 * `WORKSPACE_SHARED_MOUNT`. Collapsing the two announces a path the agent
 * cannot open.
 */
export function workspaceUploadNoticeRoot(workspace: Pick<WorkspaceItem, 'source'>): string {
  return workspace.source === 'mastra' ? WORKSPACE_SHARED_MOUNT : WORKSPACE_SANDBOX_ROOT;
}

/** Where a sandbox mounts a config-owned workspace's volume. */
export const WORKSPACE_SHARED_MOUNT = `${WORKSPACE_SANDBOX_ROOT}/shared`;

/**
 * One file uploaded through the embedding application's upload route.
 *
 * `workspacePath` is the whole point of preferring that route: the server
 * resolves it from the mounts it configured, so the composer can state where
 * the file is instead of reconstructing a guess from a directory constant and
 * an assumed root.
 */
export interface UploadedWorkspaceFile {
  name: string;
  size: number;
  path: string;
  workspacePath: string;
}

/**
 * Upload one file through the application's upload route, or `null` when the
 * deployment serves no such route.
 *
 * Multipart, not the base64-in-JSON body the workspace file API takes: the
 * encoding costs a third of the file again in the request and forces the whole
 * file through a string on both sides.
 */
export async function uploadFileToAppRoute(file: File): Promise<UploadedWorkspaceFile | null> {
  const body = new FormData();
  body.append('path', WORKSPACE_UPLOAD_DIRECTORY);
  body.append('files', file, file.name);

  const response = await fetch(appRoute('/workspace/upload'), {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
    body,
  });

  // Only "this deployment has no upload route" falls back. Every other
  // failure is this route's failure to report, not a reason to write the file
  // somewhere else under a path the caller then mis-announces.
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(await uploadRouteErrorMessage(response));
  }

  const uploaded = ((await response.json()) as { uploaded?: UploadedWorkspaceFile[] }).uploaded?.[0];
  if (!uploaded?.workspacePath) {
    throw new Error('Upload route returned no path for the uploaded file');
  }
  return uploaded;
}

/** Writes a file into one workspace's own tree — the workspace file API. */
export type WorkspaceFileWriter = (params: {
  workspaceId: string;
  path: string;
  file: File;
  recursive: boolean;
}) => Promise<unknown>;

/** A landed upload: the path to announce, and the root that path hangs off. */
export interface WorkspaceUploadResult {
  /** Workspace-root-relative, or already absolute when `noticeRoot` is empty. */
  path: string;
  /** Prefix the announced path needs, or '' when `path` is already absolute. */
  noticeRoot: string;
}

/**
 * Upload one file and report where it landed.
 *
 * The single decision point for where a file goes: the drag-and-drop overlay
 * and the composer's "+" attachment adapter both come through here, so a file
 * lands in the same tree and is announced under the same path no matter which
 * gesture the user reached for.
 */
export async function uploadWorkspaceFile(
  file: File,
  {
    workspace,
    writeWorkspaceFile,
  }: {
    workspace?: WorkspaceItem;
    writeWorkspaceFile: WorkspaceFileWriter;
  },
): Promise<WorkspaceUploadResult> {
  const uploaded = await uploadFileToAppRoute(file);
  // The route's paths are already absolute: it resolved them from the mounts
  // it configured, so there is no root left for the client to prepend.
  if (uploaded) return { path: uploaded.workspacePath, noticeRoot: '' };

  // No application upload route: the workspace file API is the only transport,
  // and it can only write into a workspace this client already knows about.
  if (!workspace) {
    throw new Error(`No writable workspace is available to upload ${file.name} into`);
  }

  const path = buildWorkspaceUploadPath(file.name);
  await writeWorkspaceFile({ workspaceId: workspace.id, path, file, recursive: true });
  return { path, noticeRoot: workspaceUploadNoticeRoot(workspace) };
}

async function uploadRouteErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `HTTP ${response.status}`;
  try {
    const body = JSON.parse(text) as { error?: string; message?: string };
    return `HTTP ${response.status}: ${body.error ?? body.message ?? text}`;
  } catch {
    return `HTTP ${response.status}: ${text}`;
  }
}
