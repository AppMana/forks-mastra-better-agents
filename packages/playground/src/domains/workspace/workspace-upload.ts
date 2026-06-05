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

export function selectWorkspaceForUpload(workspaces: WorkspaceItem[], agentId?: string): WorkspaceItem | undefined {
  const writableWorkspaces = workspaces.filter(
    workspace => workspace.capabilities.hasFilesystem && !workspace.safety.readOnly,
  );

  return writableWorkspaces.find(workspace => workspace.agentId === agentId) ?? writableWorkspaces[0];
}
