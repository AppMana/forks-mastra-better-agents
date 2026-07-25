import { useMastraClient } from '@mastra/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isWorkspaceV1Supported, shouldRetryWorkspaceQuery, isWorkspaceNotSupportedError } from '../compatibility';
import type {
  WorkspaceInfo,
  WorkspacesListResponse,
  FileListResponse,
  FileReadResponse,
  FileStatResponse,
  WriteFileParams,
  WriteFileFromFileParams,
  SearchWorkspaceParams,
  SearchResponse,
  WorkspaceSharingInfo,
} from '../types';
import { fileToBase64 } from '../workspace-upload';
import { appRoute } from '@/lib/app-routes';

function getParentPath(path: string): string {
  return path.split('/').slice(0, -1).join('/') || (path.startsWith('/') ? '/' : '.');
}

// Re-export for other hooks to use
export { isWorkspaceV1Supported, isWorkspaceNotSupportedError };

// =============================================================================
// Workspace Info Hook
// =============================================================================

export const useWorkspaceInfo = (workspaceId?: string) => {
  const client = useMastraClient();

  return useQuery({
    queryKey: ['workspace', 'info', workspaceId],
    queryFn: async (): Promise<WorkspaceInfo> => {
      if (!isWorkspaceV1Supported(client)) {
        throw new Error('Workspace v1 not supported by core or client');
      }
      if (!workspaceId) {
        throw new Error('workspaceId is required');
      }
      const workspace = (client as any).getWorkspace(workspaceId);
      return workspace.info();
    },
    enabled: !!workspaceId && isWorkspaceV1Supported(client),
    retry: shouldRetryWorkspaceQuery,
  });
};

// =============================================================================
// List All Workspaces Hook
// =============================================================================

export const useWorkspaces = () => {
  const client = useMastraClient();

  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async (): Promise<WorkspacesListResponse> => {
      if (!isWorkspaceV1Supported(client)) {
        throw new Error('Workspace v1 not supported by core or client');
      }
      return (client as any).listWorkspaces();
    },
    retry: shouldRetryWorkspaceQuery,
  });
};

// =============================================================================
// Filesystem Hooks
// =============================================================================

export const useWorkspaceFiles = (
  path: string,
  options?: { enabled?: boolean; recursive?: boolean; workspaceId?: string },
) => {
  const client = useMastraClient();

  return useQuery({
    queryKey: ['workspace', 'files', path, options?.recursive, options?.workspaceId],
    queryFn: async (): Promise<FileListResponse> => {
      if (!isWorkspaceV1Supported(client)) {
        throw new Error('Workspace v1 not supported by core or client');
      }
      if (!options?.workspaceId) {
        throw new Error('workspaceId is required');
      }
      const workspace = (client as any).getWorkspace(options.workspaceId);
      return workspace.listFiles(path, options?.recursive);
    },
    enabled: options?.enabled !== false && !!path && !!options?.workspaceId && isWorkspaceV1Supported(client),
    retry: shouldRetryWorkspaceQuery,
  });
};

export const useWorkspaceFile = (
  path: string,
  options?: { enabled?: boolean; encoding?: string; workspaceId?: string },
) => {
  const client = useMastraClient();

  return useQuery({
    queryKey: ['workspace', 'file', path, options?.workspaceId],
    queryFn: async (): Promise<FileReadResponse> => {
      if (!isWorkspaceV1Supported(client)) {
        throw new Error('Workspace v1 not supported by core or client');
      }
      if (!options?.workspaceId) {
        throw new Error('workspaceId is required');
      }
      const workspace = (client as any).getWorkspace(options.workspaceId);
      return workspace.readFile(path, options?.encoding);
    },
    enabled: options?.enabled !== false && !!path && !!options?.workspaceId && isWorkspaceV1Supported(client),
    retry: shouldRetryWorkspaceQuery,
  });
};

export const useWorkspaceFileStat = (path: string, options?: { enabled?: boolean; workspaceId?: string }) => {
  const client = useMastraClient();

  return useQuery({
    queryKey: ['workspace', 'stat', path, options?.workspaceId],
    queryFn: async (): Promise<FileStatResponse> => {
      if (!isWorkspaceV1Supported(client)) {
        throw new Error('Workspace v1 not supported by core or client');
      }
      if (!options?.workspaceId) {
        throw new Error('workspaceId is required');
      }
      const workspace = (client as any).getWorkspace(options.workspaceId);
      return workspace.stat(path);
    },
    enabled: options?.enabled !== false && !!path && !!options?.workspaceId && isWorkspaceV1Supported(client),
    retry: shouldRetryWorkspaceQuery,
  });
};

export const useWriteWorkspaceFile = () => {
  const client = useMastraClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: WriteFileParams) => {
      if (!isWorkspaceV1Supported(client)) {
        throw new Error('Workspace v1 not supported by core or client');
      }
      const workspace = (client as any).getWorkspace(params.workspaceId);
      return workspace.writeFile(params.path, params.content, {
        encoding: params.encoding,
        recursive: params.recursive ?? true,
      });
    },
    onSuccess: (_, variables) => {
      const parentPath = getParentPath(variables.path);
      void queryClient.invalidateQueries({ queryKey: ['workspace', 'files', parentPath] });
      void queryClient.invalidateQueries({ queryKey: ['workspace', 'file', variables.path] });
    },
  });
};

export const useWriteWorkspaceFileFromFile = () => {
  const client = useMastraClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: WriteFileFromFileParams) => {
      if (!isWorkspaceV1Supported(client)) {
        throw new Error('Workspace v1 not supported by core or client');
      }
      const base64 = await fileToBase64(params.file);

      const workspace = (client as any).getWorkspace(params.workspaceId);
      return workspace.writeFile(params.path, base64, {
        encoding: 'base64',
        recursive: params.recursive ?? true,
      });
    },
    onSuccess: (_, variables) => {
      const parentPath = getParentPath(variables.path);
      void queryClient.invalidateQueries({ queryKey: ['workspace', 'files', parentPath] });
      void queryClient.invalidateQueries({ queryKey: ['workspace', 'file', variables.path] });
    },
  });
};

export const useDeleteWorkspaceFile = () => {
  const client = useMastraClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { path: string; recursive?: boolean; force?: boolean; workspaceId?: string }) => {
      if (!isWorkspaceV1Supported(client)) {
        throw new Error('Workspace v1 not supported by core or client');
      }
      const workspace = (client as any).getWorkspace(params.workspaceId);
      return workspace.delete(params.path, {
        recursive: params.recursive,
        force: params.force,
      });
    },
    onSuccess: (_, variables) => {
      const parentPath = getParentPath(variables.path);
      void queryClient.invalidateQueries({ queryKey: ['workspace', 'files', parentPath] });
      void queryClient.invalidateQueries({ queryKey: ['workspace', 'file', variables.path] });
    },
  });
};

export const useCreateWorkspaceDirectory = () => {
  const client = useMastraClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { path: string; recursive?: boolean; workspaceId?: string }) => {
      if (!isWorkspaceV1Supported(client)) {
        throw new Error('Workspace v1 not supported by core or client');
      }
      const workspace = (client as any).getWorkspace(params.workspaceId);
      return workspace.mkdir(params.path, params.recursive);
    },
    onSuccess: (_, variables) => {
      const parentPath = getParentPath(variables.path);
      void queryClient.invalidateQueries({ queryKey: ['workspace', 'files', parentPath] });
    },
  });
};

export const useWorkspaceFileOperation = () => {
  const client = useMastraClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      workspaceId: string;
      operation: 'copy' | 'cut' | 'duplicate' | 'rename';
      sourcePath: string;
      destinationPath: string;
      overwrite?: boolean;
      recursive?: boolean;
    }) => {
      if (!isWorkspaceV1Supported(client)) {
        throw new Error('Workspace v1 not supported by core or client');
      }
      const workspace = (client as any).getWorkspace(params.workspaceId);
      return workspace.operation({
        operation: params.operation === 'cut' ? 'move' : params.operation,
        sourcePath: params.sourcePath,
        destinationPath: params.destinationPath,
        overwrite: params.overwrite ?? false,
        recursive: params.recursive ?? true,
      });
    },
    onSuccess: (_, variables) => {
      const sourceParentPath = getParentPath(variables.sourcePath);
      const destinationParentPath = getParentPath(variables.destinationPath);
      void queryClient.invalidateQueries({ queryKey: ['workspace', 'files', sourceParentPath] });
      void queryClient.invalidateQueries({ queryKey: ['workspace', 'files', destinationParentPath] });
      void queryClient.invalidateQueries({ queryKey: ['workspace', 'file', variables.sourcePath] });
      void queryClient.invalidateQueries({ queryKey: ['workspace', 'file', variables.destinationPath] });
    },
  });
};

export const useWorkspaceSharing = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['workspace', 'sharing'],
    queryFn: async (): Promise<WorkspaceSharingInfo> => {
      const response = await fetch(appRoute('/workspace/sharing'), {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const body = (await response.json()) as { error?: string; message?: string };
          message = body.error ?? body.message ?? message;
        } catch {
          // Keep the status fallback.
        }
        throw new Error(message);
      }
      return (await response.json()) as WorkspaceSharingInfo;
    },
    enabled: options?.enabled !== false,
    retry: false,
  });
};

// =============================================================================
// Search Hooks
// =============================================================================

export const useSearchWorkspace = () => {
  const client = useMastraClient();

  return useMutation({
    mutationFn: async (params: SearchWorkspaceParams): Promise<SearchResponse> => {
      if (!isWorkspaceV1Supported(client)) {
        throw new Error('Workspace v1 not supported by core or client');
      }
      const workspace = (client as any).getWorkspace(params.workspaceId);
      return workspace.search({
        query: params.query,
        topK: params.topK,
        mode: params.mode,
        minScore: params.minScore,
      });
    },
  });
};

export const useIndexWorkspaceContent = () => {
  const client = useMastraClient();

  return useMutation({
    mutationFn: async (params: {
      workspaceId: string;
      path: string;
      content: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!isWorkspaceV1Supported(client)) {
        throw new Error('Workspace v1 not supported by core or client');
      }
      const workspace = (client as any).getWorkspace(params.workspaceId);
      return workspace.index({
        path: params.path,
        content: params.content,
        metadata: params.metadata,
      });
    },
  });
};
