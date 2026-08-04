import {
  Button,
  AlertDialog,
  CopyButton,
  ErrorState,
  NoDataPageLayout,
  PageLayout,
  PermissionDenied,
  SessionExpired,
  Spinner,
  Tab,
  TabContent,
  TabList,
  Tabs,
  is401UnauthorizedError,
  is403ForbiddenError,
  toast,
} from '@mastra/playground-ui';
import { FileText, Wand2, Search, Bot, Server } from 'lucide-react';
import { useState, useCallback, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router';
import { isWorkspaceNotSupportedError } from '@/domains/workspace/compatibility';
import { AddSkillDialog, FileBrowser, SandboxStartupProgress, SkillsTable } from '@/domains/workspace/components';
import { NoWorkspacesInfo } from '@/domains/workspace/components/no-workspaces-info';
import { SearchWorkspacePanel, SearchSkillsPanel } from '@/domains/workspace/components/search-panel';
import { WorkspaceFilePreview } from '@/domains/workspace/components/workspace-file-preview';
import { WorkspaceNotConfigured } from '@/domains/workspace/components/workspace-not-configured';
import { WorkspaceNotSupported } from '@/domains/workspace/components/workspace-not-supported';
import { useInstallSkill, useUpdateSkills, useRemoveSkill } from '@/domains/workspace/hooks';
import {
  useWorkspaceInfo,
  useWorkspaces,
  useWorkspaceFiles,
  useSearchWorkspace,
  useDeleteWorkspaceFile,
  useCreateWorkspaceDirectory,
  useWriteWorkspaceFileFromFile,
  useWorkspaceFileOperation,
  useWorkspaceSharing,
} from '@/domains/workspace/hooks/use-workspace';
import { useWorkspaceSkills, useSearchWorkspaceSkills } from '@/domains/workspace/hooks/use-workspace-skills';
import type {
  WorkspaceItem,
  FileEntry,
  WorkspaceSharingInfo,
  WorkspaceSharingPlatform,
} from '@/domains/workspace/types';
import { buildWorkspaceUploadPath } from '@/domains/workspace/workspace-upload';

type TabType = 'files' | 'skills';

export default function Workspace() {
  const { workspaceId: workspaceIdFromPath } = useParams<{ workspaceId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [showAddSkillDialog, setShowAddSkillDialog] = useState(false);
  const [sharingPlatform, setSharingPlatform] = useState<WorkspaceSharingPlatform | null>(null);
  const [removingSkillName, setRemovingSkillName] = useState<string | null>(null);
  const [updatingSkillName, setUpdatingSkillName] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [clipboardItem, setClipboardItem] = useState<{
    operation: 'copy' | 'cut';
    path: string;
    entry: FileEntry;
  } | null>(null);
  // Track if we installed a skill that wasn't discovered (client-side only, resets on refresh)
  const [hasUndiscoveredInstall, setHasUndiscoveredInstall] = useState(false);

  // Get state from URL query params (path, file, tab are still query params)
  const fileFromUrl = searchParams.get('file');
  const tabFromUrl = searchParams.get('tab') as TabType | null;

  // There is ONE workspace: this person's own tree. The list is still fetched
  // for its display metadata (name, read-only flag, capabilities), but it is
  // not a menu — nothing here picks between entries, and "the first one" was
  // how the org-wide sandbox image's home directory ended up on screen instead
  // of the user's files.
  const { data: workspacesData, error: workspacesError, isLoading: isLoadingWorkspaces } = useWorkspaces();
  const workspaces = workspacesData?.workspaces ?? [];

  const ownWorkspaceId = workspaces.find(w => w.source === 'agent')?.id ?? workspaces[0]?.id;
  const effectiveWorkspaceId = workspaceIdFromPath ?? ownWorkspaceId;

  // Workspace info - calls /api/workspaces/:workspaceId directly
  const {
    data: workspaceInfo,
    isLoading: isLoadingInfo,
    error: workspaceInfoError,
  } = useWorkspaceInfo(effectiveWorkspaceId);

  // Check if 401 unauthorized (session expired)
  const isSessionExpired = is401UnauthorizedError(workspacesError) || is401UnauthorizedError(workspaceInfoError);

  // Check if 403 forbidden (permission denied)
  const isPermissionDenied = is403ForbiddenError(workspacesError) || is403ForbiddenError(workspaceInfoError);

  const pathFromUrl = searchParams.get('path') || '.';

  // Check if workspaces are not supported (501 error from server)
  const isWorkspaceNotSupported =
    isWorkspaceNotSupportedError(workspacesError) || isWorkspaceNotSupportedError(workspaceInfoError);

  // Get the selected workspace metadata from the list (for displaying name, capabilities badge, etc.)
  const selectedWorkspace: WorkspaceItem | undefined = effectiveWorkspaceId
    ? workspaces.find(w => w.id === effectiveWorkspaceId)
    : undefined;

  // Helper to update URL query params while preserving others
  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams],
  );

  const setCurrentPath = (path: string) => {
    updateSearchParams({ path: path === '.' || path === '' ? null : path, file: null });
  };

  const setSelectedFile = useCallback(
    (file: string | null) => {
      updateSearchParams({ file });
    },
    [updateSearchParams],
  );

  const setActiveTab = (tab: TabType) => {
    updateSearchParams({ tab });
  };

  // Use URL-derived values
  const currentPath = pathFromUrl;
  const selectedFile = fileFromUrl;

  // Files - pass workspaceId to get files from the selected workspace
  const {
    data: filesData,
    isLoading: isLoadingFiles,
    error: filesError,
    refetch: refetchFiles,
  } = useWorkspaceFiles(currentPath, {
    enabled: workspaceInfo?.isWorkspaceConfigured && workspaceInfo?.capabilities?.hasFilesystem,
    workspaceId: effectiveWorkspaceId,
  });
  const deleteFile = useDeleteWorkspaceFile();
  const createDirectory = useCreateWorkspaceDirectory();
  const writeFileFromFile = useWriteWorkspaceFileFromFile();
  const fileOperation = useWorkspaceFileOperation();

  // Selected file content - pass workspaceId

  // Skills - pass workspaceId to get skills from the selected workspace
  const {
    data: skillsData,
    isLoading: isLoadingSkills,
    refetch: refetchSkills,
  } = useWorkspaceSkills({ workspaceId: effectiveWorkspaceId });

  // Skills.sh hooks
  const installSkill = useInstallSkill();
  const updateSkills = useUpdateSkills();
  const removeSkill = useRemoveSkill();

  const isWorkspaceConfigured = workspaceInfo?.isWorkspaceConfigured ?? false;
  const hasFilesystem = workspaceInfo?.capabilities?.hasFilesystem ?? false;
  const hasSkills = workspaceInfo?.capabilities?.hasSkills ?? false;
  const canBM25 = workspaceInfo?.capabilities?.canBM25 ?? false;
  const canVector = workspaceInfo?.capabilities?.canVector ?? false;
  // Check if the selected workspace is read-only
  const isReadOnly = selectedWorkspace?.safety?.readOnly ?? false;

  // Can manage skills (install/remove/check/update) if we have filesystem and not read-only
  // None of these operations require sandbox - all are done via GitHub API + filesystem
  const canManageSkills = hasFilesystem && !isReadOnly;
  const workspaceSharing = useWorkspaceSharing({ enabled: hasFilesystem });

  const handleUploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!effectiveWorkspaceId || !files || files.length === 0) return;

      const uploadDirectory = currentPath === '.' ? '' : currentPath;

      try {
        await Promise.all(
          Array.from(files).map(file =>
            writeFileFromFile.mutateAsync({
              workspaceId: effectiveWorkspaceId,
              path: buildWorkspaceUploadPath(file.name, uploadDirectory),
              file,
              recursive: true,
            }),
          ),
        );
        toast.success(`Uploaded ${files.length} file${files.length === 1 ? '' : 's'}`);
        void refetchFiles();
      } catch (error) {
        toast.error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [currentPath, effectiveWorkspaceId, refetchFiles, writeFileFromFile],
  );

  const buildPath = useCallback((directory: string, name: string) => {
    return directory === '.' || directory === '' ? name : `${directory}/${name}`;
  }, []);

  const buildDuplicateName = useCallback((name: string) => {
    const dotIndex = name.lastIndexOf('.');
    if (dotIndex <= 0) return `${name} copy`;
    return `${name.slice(0, dotIndex)} copy${name.slice(dotIndex)}`;
  }, []);

  const buildSiblingPath = useCallback((sourcePath: string, nextName: string) => {
    const parent = sourcePath.split('/').slice(0, -1).join('/');
    return parent ? `${parent}/${nextName}` : nextName;
  }, []);

  const handleDuplicate = useCallback(
    async (sourcePath: string, entry: FileEntry) => {
      if (!effectiveWorkspaceId) return;
      const duplicatePath = buildPath(currentPath, buildDuplicateName(entry.name));
      try {
        await fileOperation.mutateAsync({
          workspaceId: effectiveWorkspaceId,
          operation: 'duplicate',
          sourcePath,
          destinationPath: duplicatePath,
          recursive: entry.type === 'directory',
        });
        toast.success(`Duplicated ${entry.name}`);
        void refetchFiles();
      } catch (error) {
        toast.error(`Failed to duplicate file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [buildDuplicateName, buildPath, currentPath, effectiveWorkspaceId, fileOperation, refetchFiles],
  );

  const handleRename = useCallback(
    async (sourcePath: string, entry: FileEntry, nextName: string) => {
      if (!effectiveWorkspaceId) return;
      const destinationPath = buildSiblingPath(sourcePath, nextName);
      try {
        await fileOperation.mutateAsync({
          workspaceId: effectiveWorkspaceId,
          operation: 'rename',
          sourcePath,
          destinationPath,
          recursive: entry.type === 'directory',
        });
        toast.success(`Renamed ${entry.name}`);
        if (selectedFile === sourcePath) {
          setSelectedFile(destinationPath);
        }
        void refetchFiles();
      } catch (error) {
        toast.error(`Failed to rename item: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [buildSiblingPath, effectiveWorkspaceId, fileOperation, refetchFiles, selectedFile, setSelectedFile],
  );

  const handlePaste = useCallback(
    async (destinationDirectory: string) => {
      if (!effectiveWorkspaceId || !clipboardItem) return;
      const destinationPath = buildPath(destinationDirectory, clipboardItem.entry.name);
      try {
        await fileOperation.mutateAsync({
          workspaceId: effectiveWorkspaceId,
          operation: clipboardItem.operation,
          sourcePath: clipboardItem.path,
          destinationPath,
          recursive: clipboardItem.entry.type === 'directory',
        });
        toast.success(`${clipboardItem.operation === 'cut' ? 'Moved' : 'Copied'} ${clipboardItem.entry.name}`);
        if (clipboardItem.operation === 'cut') {
          setClipboardItem(null);
        }
        void refetchFiles();
      } catch (error) {
        toast.error(`Failed to paste file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [buildPath, clipboardItem, effectiveWorkspaceId, fileOperation, refetchFiles],
  );

  // Derive writable mounts for CompositeFilesystem
  const mounts = workspaceInfo?.mounts;
  const writableMounts = mounts
    ?.filter(m => !m.readOnly)
    .map(m => ({ path: m.path, displayName: m.displayName, icon: m.icon, provider: m.provider, name: m.name }));

  // Skills.sh handlers
  const handleInstallSkill = useCallback(
    (params: { repository: string; skillName: string; mount?: string }) => {
      if (!effectiveWorkspaceId) return;

      installSkill.mutate(
        { ...params, workspaceId: effectiveWorkspaceId },
        {
          onSuccess: async result => {
            if (result.success) {
              setShowAddSkillDialog(false);

              // Refetch skills and check if the installed skill appears in the list
              const { data: refreshedData, error } = await refetchSkills();

              // If refetch failed, just show success (can't verify discovery)
              if (error || !refreshedData) {
                toast.success(`Skill "${result.skillName}" installed successfully (${result.filesWritten} files)`);
                return;
              }

              const installedSkillFound = refreshedData.skills.some(s => s.name === result.skillName);

              if (installedSkillFound) {
                toast.success(`Skill "${result.skillName}" installed successfully (${result.filesWritten} files)`);
              } else {
                // Skill was installed but not discovered - likely missing path config
                setHasUndiscoveredInstall(true);
                toast.warning(
                  `Skill "${result.skillName}" installed to .agents/skills but not discovered. Add .agents/skills to your workspace skills paths.`,
                );
              }
            } else {
              toast.error('Failed to install skill');
            }
          },
          onError: error => {
            toast.error(`Failed to install skill: ${error instanceof Error ? error.message : 'Unknown error'}`);
          },
        },
      );
    },
    [effectiveWorkspaceId, installSkill, refetchSkills],
  );

  const handleUpdateSkill = useCallback(
    (skillName: string) => {
      if (!effectiveWorkspaceId) return;

      setUpdatingSkillName(skillName);
      updateSkills.mutate(
        { workspaceId: effectiveWorkspaceId, skillName },
        {
          onSuccess: result => {
            setUpdatingSkillName(null);
            if (result.updated.length > 0) {
              const updated = result.updated[0];
              if (updated.success) {
                toast.success(`Skill "${skillName}" updated successfully (${updated.filesWritten} files)`);
                void refetchSkills();
              } else {
                toast.error(`Failed to update skill: ${updated.error ?? 'Unknown error'}`);
              }
            } else {
              toast.error(`Failed to update skill: No update result returned`);
            }
          },
          onError: error => {
            setUpdatingSkillName(null);
            toast.error(`Failed to update skill: ${error instanceof Error ? error.message : 'Unknown error'}`);
          },
        },
      );
    },
    [effectiveWorkspaceId, updateSkills, refetchSkills],
  );

  const handleRemoveSkill = useCallback(
    (skillName: string) => {
      if (!effectiveWorkspaceId) return;

      setRemovingSkillName(skillName);
      removeSkill.mutate(
        { workspaceId: effectiveWorkspaceId, skillName },
        {
          onSuccess: result => {
            setRemovingSkillName(null);
            if (result.success) {
              toast.success(`Skill "${result.skillName}" removed successfully`);
              void refetchSkills();
            } else {
              toast.error(`Failed to remove skill "${result.skillName}"`);
            }
          },
          onError: error => {
            setRemovingSkillName(null);
            toast.error(`Failed to remove skill: ${error instanceof Error ? error.message : 'Unknown error'}`);
          },
        },
      );
    },
    [effectiveWorkspaceId, removeSkill, refetchSkills],
  );

  // Compute active tab based on URL and workspace capabilities
  // If URL specifies a tab, use it only if the workspace supports it
  // Otherwise, fall back to the first available capability
  const getEffectiveTab = (): TabType => {
    if (tabFromUrl === 'files' && hasFilesystem) return 'files';
    if (tabFromUrl === 'skills' && hasSkills) return 'skills';
    // No valid tab from URL, pick the first available
    if (hasFilesystem) return 'files';
    if (hasSkills) return 'skills';
    return 'files'; // fallback
  };
  const activeTab = getEffectiveTab();

  const skills = skillsData?.skills ?? [];
  const isSkillsConfigured = skillsData?.isSkillsConfigured ?? false;
  const files = filesData?.entries ?? [];

  // Whether any search functionality is actually available
  const canSearchFiles = hasFilesystem && (canBM25 || canVector);
  const canSearchSkills = hasSkills && isSkillsConfigured && skills.length > 0;
  const hasSearchCapability = canSearchFiles || canSearchSkills;

  // Show loading while fetching workspace list. A remote workspace can take
  // minutes to start (allocation, scheduling, storage, image), so the wait
  // reports the startup phase instead of an indefinite spinner; the component
  // degrades to a plain spinner when no status is available.
  if (isLoadingWorkspaces) {
    return (
      <NoDataPageLayout>
        <SandboxStartupProgress workspaceId={workspaceIdFromPath} />
      </NoDataPageLayout>
    );
  }

  // If session expired (401 error)
  if (isSessionExpired) {
    return (
      <NoDataPageLayout>
        <SessionExpired />
      </NoDataPageLayout>
    );
  }

  // If permission denied (403 error)
  if (isPermissionDenied) {
    return (
      <NoDataPageLayout>
        <PermissionDenied resource="workspaces" />
      </NoDataPageLayout>
    );
  }

  // If workspace v1 is not supported by the server's @mastra/core version
  if (isWorkspaceNotSupported) {
    return (
      <NoDataPageLayout>
        <WorkspaceNotSupported />
      </NoDataPageLayout>
    );
  }

  // Surface any other backend/runtime errors from workspace or workspace info requests
  const genericError = workspacesError || workspaceInfoError;
  if (genericError) {
    return (
      <NoDataPageLayout>
        <ErrorState title="Failed to load workspace" message={(genericError as Error).message} />
      </NoDataPageLayout>
    );
  }

  // If the workspace feature is configured but no workspaces exist yet, show empty state
  if (!isLoadingWorkspaces && workspaces.length === 0) {
    return (
      <NoDataPageLayout>
        <NoWorkspacesInfo />
      </NoDataPageLayout>
    );
  }

  // The workspace list is served from local metadata, but its info request is
  // what waits on the sandbox actually being up — so this is the wait the user
  // sees on a cold workspace, and it gets the same progress surface.
  if (isLoadingInfo) {
    return (
      <NoDataPageLayout>
        <SandboxStartupProgress workspaceId={effectiveWorkspaceId} />
      </NoDataPageLayout>
    );
  }

  // If the selected workspace is not configured, show the not configured message
  // Also wait for workspaces list to load to avoid showing this before 403 is detected
  if (!isLoadingInfo && !isLoadingWorkspaces && !isWorkspaceConfigured) {
    return (
      <NoDataPageLayout>
        <WorkspaceNotConfigured />
      </NoDataPageLayout>
    );
  }

  return (
    <PageLayout>
      {hasSearchCapability && (
        <PageLayout.TopArea>
          <PageLayout.Row className="justify-end">
            <Button onClick={() => setShowSearch(!showSearch)} tooltip="Search workspace" aria-label="Search workspace">
              <Search />
            </Button>
          </PageLayout.Row>
        </PageLayout.TopArea>
      )}

      <PageLayout.MainArea className="grid content-start gap-6">
        {/* No workspace selector. A signed-in person has ONE tree — their own
            files, the same thing their WebDAV share serves — so there is
            nothing to choose between, and a picker offering the org-wide
            sandbox image's home directory was actively misleading. */}

        {selectedWorkspace && (
          <div className="flex items-center gap-2 text-sm text-neutral4">
            {selectedWorkspace.source === 'agent' ? (
              <Bot className="h-4 w-4 text-accent1" />
            ) : (
              <Server className="h-4 w-4" />
            )}
            <span>{selectedWorkspace.name}</span>
            {selectedWorkspace.source === 'agent' && selectedWorkspace.agentName && (
              <span className="text-neutral3">({selectedWorkspace.agentName})</span>
            )}
            {isReadOnly && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Read-only</span>
            )}
          </div>
        )}

        {/* Search Panel - keyed on workspace so hooks reset on switch */}
        {showSearch && hasSearchCapability && effectiveWorkspaceId && (
          <WorkspaceSearchPanel
            key={effectiveWorkspaceId}
            workspaceId={effectiveWorkspaceId}
            canSearchFiles={canSearchFiles}
            canSearchSkills={canSearchSkills}
            canBM25={canBM25}
            canVector={canVector}
            showInitWarning={!isLoadingInfo && workspaceInfo?.status !== 'ready'}
            onViewFileResult={id => {
              updateSearchParams({ file: id, tab: 'files' });
            }}
            onViewSkillResult={(skillName, skillPath) => {
              if (effectiveWorkspaceId) {
                void navigate(
                  `/workspaces/${effectiveWorkspaceId}/skills/${encodeURIComponent(skillName)}?path=${encodeURIComponent(skillPath)}`,
                );
              }
            }}
          />
        )}

        {(hasFilesystem || hasSkills) && (
          <Tabs value={activeTab} onValueChange={setActiveTab} defaultTab={activeTab} className="w-full min-w-0">
            <TabList>
              {hasFilesystem && (
                <Tab value="files">
                  <FileText className="h-4 w-4" />
                  Files
                </Tab>
              )}
              {hasSkills && (
                <Tab value="skills">
                  <Wand2 className="h-4 w-4" />
                  Skills
                  {isSkillsConfigured && skills.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface4 text-neutral4">{skills.length}</span>
                  )}
                </Tab>
              )}
            </TabList>

            {hasFilesystem && (
              <TabContent value="files" className="pb-8 w-full min-w-0">
                <div
                  className={`grid grid-cols-1 gap-4 w-full ${
                    selectedFile ? 'xl:grid-cols-[minmax(0,1fr)_minmax(360px,40%)]' : ''
                  }`}
                >
                  <FileBrowser
                    entries={files}
                    currentPath={currentPath}
                    isLoading={isLoadingFiles}
                    error={filesError instanceof Error ? filesError : null}
                    onNavigate={setCurrentPath}
                    onFileSelect={setSelectedFile}
                    onRefresh={() => refetchFiles()}
                    onUpload={isReadOnly ? undefined : () => uploadInputRef.current?.click()}
                    onCreateDirectory={
                      isReadOnly
                        ? undefined
                        : path => createDirectory.mutate({ path, workspaceId: effectiveWorkspaceId })
                    }
                    onDuplicate={isReadOnly ? undefined : handleDuplicate}
                    onRename={isReadOnly ? undefined : handleRename}
                    onCut={
                      isReadOnly
                        ? undefined
                        : (path, entry) => {
                            setClipboardItem({ operation: 'cut', path, entry });
                            toast.success(`Ready to move ${entry.name}`);
                          }
                    }
                    onCopy={
                      isReadOnly
                        ? undefined
                        : (path, entry) => {
                            setClipboardItem({ operation: 'copy', path, entry });
                            toast.success(`Ready to copy ${entry.name}`);
                          }
                    }
                    onPaste={isReadOnly ? undefined : handlePaste}
                    canPaste={!!clipboardItem}
                    onOpenSharing={platform => setSharingPlatform(platform)}
                    onDelete={
                      isReadOnly
                        ? undefined
                        : path =>
                            deleteFile.mutate({ path, recursive: true, force: true, workspaceId: effectiveWorkspaceId })
                    }
                    isCreatingDirectory={createDirectory.isPending}
                    isDeleting={deleteFile.isPending}
                    isFileOperationPending={fileOperation.isPending}
                  />
                  <input
                    ref={uploadInputRef}
                    type="file"
                    multiple
                    hidden
                    onChange={event => {
                      void handleUploadFiles(event.currentTarget.files);
                      event.currentTarget.value = '';
                    }}
                  />
                  {selectedFile && (
                    <WorkspaceFilePreview
                      path={selectedFile}
                      workspaceId={effectiveWorkspaceId}
                      onClose={() => setSelectedFile(null)}
                    />
                  )}
                </div>
              </TabContent>
            )}

            {hasSkills && (
              <TabContent value="skills" className="pb-8 w-full min-w-0">
                <SkillsTable
                  skills={skills}
                  isLoading={isLoadingSkills}
                  isSkillsConfigured={isSkillsConfigured}
                  hasUndiscoveredAgentSkills={hasUndiscoveredInstall}
                  basePath={effectiveWorkspaceId ? `/workspaces/${effectiveWorkspaceId}/skills` : '/workspaces'}
                  onAddSkill={canManageSkills ? () => setShowAddSkillDialog(true) : undefined}
                  onUpdateSkill={canManageSkills ? handleUpdateSkill : undefined}
                  onRemoveSkill={canManageSkills ? handleRemoveSkill : undefined}
                  updatingSkillName={updatingSkillName ?? undefined}
                  removingSkillName={removingSkillName ?? undefined}
                />
              </TabContent>
            )}
          </Tabs>
        )}

        {!hasFilesystem && !hasSkills && !isLoadingInfo && (
          <div className="py-12 text-center text-neutral4">
            <p>No workspace capabilities are configured.</p>
          </div>
        )}
      </PageLayout.MainArea>

      {/* Add Skill Dialog */}
      {effectiveWorkspaceId && canManageSkills && (
        <AddSkillDialog
          open={showAddSkillDialog}
          onOpenChange={setShowAddSkillDialog}
          workspaceId={effectiveWorkspaceId}
          onInstall={handleInstallSkill}
          isInstalling={installSkill.isPending}
          // Pass precise IDs for skills with source info (format: owner/repo/name)
          installedSkillIds={skills
            .filter(s => s.skillsShSource)
            .map(s => `${s.skillsShSource!.owner}/${s.skillsShSource!.repo}/${s.name}`)}
          // Fallback to names for skills without source info
          installedSkillNames={skills.filter(s => !s.skillsShSource).map(s => s.name)}
          writableMounts={writableMounts}
          installedSkillPaths={Object.fromEntries(skills.filter(s => s.path).map(s => [s.name, s.path]))}
        />
      )}
      <NativeDriveDialog
        open={!!sharingPlatform}
        onOpenChange={open => !open && setSharingPlatform(null)}
        platform={sharingPlatform ?? 'windows'}
        sharingInfo={workspaceSharing.data}
        isLoading={workspaceSharing.isLoading}
        error={workspaceSharing.error instanceof Error ? workspaceSharing.error : null}
      />
    </PageLayout>
  );
}

function NativeDriveDialog({
  open,
  onOpenChange,
  platform,
  sharingInfo,
  isLoading,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: WorkspaceSharingPlatform;
  sharingInfo?: WorkspaceSharingInfo;
  isLoading: boolean;
  error: Error | null;
}) {
  const platformInfo = sharingInfo?.[platform];
  const title =
    platform === 'windows' ? 'Access in Windows' : platform === 'macos' ? 'Access in macOS' : 'Access in Ubuntu';
  const primaryUrl =
    platform === 'linux'
      ? (sharingInfo?.nautilusUrl ?? platformInfo?.url)
      : platform === 'windows'
        ? (sharingInfo?.webdavUrl ?? platformInfo?.url)
        : (sharingInfo?.webdavUrl ?? platformInfo?.url);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Content>
        <AlertDialog.Header>
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>
            Mount your workspace over WebDAV in the operating system file browser.
          </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Body>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : error ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error.message}
            </div>
          ) : sharingInfo && platformInfo && primaryUrl ? (
            <div className="space-y-4 text-sm text-neutral5">
              <p>{platformInfo.instructions}</p>
              <div className="rounded-md border border-border1 bg-surface3 p-3">
                <div className="mb-2 text-xs uppercase text-neutral3">
                  {platform === 'linux' ? 'GNOME Files URL' : 'WebDAV URL'}
                </div>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate text-neutral6">{primaryUrl}</code>
                  <CopyButton content={primaryUrl} copyMessage="Copied connection URL" />
                </div>
              </div>
              <div className="rounded-md border border-border1 bg-surface3 p-3">
                <div className="mb-2 text-xs uppercase text-neutral3">Username</div>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate text-neutral6">{sharingInfo.username}</code>
                  <CopyButton content={sharingInfo.username} copyMessage="Copied username" />
                </div>
              </div>
              <div className="rounded-md border border-border1 bg-surface3 p-3">
                <div className="mb-2 text-xs uppercase text-neutral3">Password</div>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate text-neutral6">{sharingInfo.password}</code>
                  <CopyButton content={sharingInfo.password} copyMessage="Copied password" />
                </div>
              </div>
              {platform !== 'windows' && (
                <div className="rounded-md border border-border1 bg-surface3 p-3">
                  <div className="mb-2 text-xs uppercase text-neutral3">Credential URL</div>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate text-neutral6">
                      {platform === 'linux' ? sharingInfo.nautilusUrl : sharingInfo.httpsUrlWithCredentials}
                    </code>
                    <CopyButton
                      content={platform === 'linux' ? sharingInfo.nautilusUrl : sharingInfo.httpsUrlWithCredentials}
                      copyMessage="Copied credential URL"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-border1 bg-surface3 p-3 text-sm text-neutral4">
              Sharing details are unavailable.
            </div>
          )}
        </AlertDialog.Body>
        <AlertDialog.Footer>
          <AlertDialog.Action onClick={() => onOpenChange(false)}>Done</AlertDialog.Action>
        </AlertDialog.Footer>
      </AlertDialog.Content>
    </AlertDialog>
  );
}

function WorkspaceSearchPanel({
  workspaceId,
  canSearchFiles,
  canSearchSkills,
  canBM25,
  canVector,
  showInitWarning,
  onViewFileResult,
  onViewSkillResult,
}: {
  workspaceId: string;
  canSearchFiles: boolean;
  canSearchSkills: boolean;
  canBM25: boolean;
  canVector: boolean;
  showInitWarning: boolean;
  onViewFileResult: (id: string) => void;
  onViewSkillResult: (skillName: string, skillPath: string) => void;
}) {
  const searchWorkspace = useSearchWorkspace();
  const searchSkills = useSearchWorkspaceSkills();

  return (
    <div className="border border-border1 rounded-lg p-4 bg-surface2 space-y-4">
      {canSearchFiles && (
        <div>
          <h3 className="text-sm font-medium text-neutral5 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Search Indexed Files
          </h3>
          {showInitWarning && (
            <p className="text-xs text-amber-400 mb-3">
              File search requires <code className="text-amber-300">workspace.init()</code> to index files from your
              configured <code className="text-amber-300">autoIndexPaths</code>.
            </p>
          )}
          <SearchWorkspacePanel
            onSearch={params => searchWorkspace.mutate({ ...params, workspaceId })}
            isSearching={searchWorkspace.isPending}
            searchResults={
              searchWorkspace.data
                ? {
                    ...searchWorkspace.data,
                    results: searchWorkspace.data.results.filter(r => !r.id.startsWith('skill:')),
                  }
                : undefined
            }
            canBM25={canBM25}
            canVector={canVector}
            onViewResult={onViewFileResult}
          />
        </div>
      )}

      {canSearchSkills && (
        <div>
          <h3 className="text-sm font-medium text-neutral5 mb-3 flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Search Skills
          </h3>
          <SearchSkillsPanel
            onSearch={params => searchSkills.mutate({ ...params, workspaceId })}
            results={searchSkills.data?.results ?? []}
            isSearching={searchSkills.isPending}
            onResultClick={result => onViewSkillResult(result.skillName, result.skillPath)}
          />
        </div>
      )}
    </div>
  );
}
