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
import { useSearchParams, useNavigate } from 'react-router';

import { isWorkspaceNotSupportedError } from '../compatibility';
import { useInstallSkill, useUpdateSkills, useRemoveSkill } from '../hooks';
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
} from '../hooks/use-workspace';
import { useWorkspaceSkills, useSearchWorkspaceSkills } from '../hooks/use-workspace-skills';
import type { WorkspaceItem, FileEntry, WorkspaceSharingInfo, WorkspaceSharingPlatform } from '../types';
import { buildWorkspaceUploadPath } from '../workspace-upload';
import { AddSkillDialog } from './add-skill-dialog';
import { FileBrowser } from './file-browser';
import { NoWorkspacesInfo } from './no-workspaces-info';
import { SandboxStartupProgress } from './sandbox-startup-progress';
import { SearchWorkspacePanel, SearchSkillsPanel } from './search-panel';
import { SkillsTable } from './skills-table';
import { WorkspaceFilePreview } from './workspace-file-preview';
import { WorkspaceNotConfigured } from './workspace-not-configured';
import { WorkspaceNotSupported } from './workspace-not-supported';

type TabType = 'files' | 'skills';

export interface WorkspacePanelProps {
  /**
   * Workspace to display. `undefined` means "no workspace resolved yet" and
   * renders {@link WorkspacePanelProps.emptyState} — a workspace directory is
   * created lazily, so a conversation that has never run simply has none.
   */
  workspaceId?: string;
  /**
   * Whether to offer the Skills tab. Skill detail lives on its own route
   * outside this panel, so a surface embedded inside another page turns it off
   * rather than sending the user somewhere the surrounding page cannot follow.
   */
  showSkills?: boolean;
  /** Shown when no workspace resolved. Defaults to the generic no-workspaces state. */
  emptyState?: React.ReactNode;
}

/**
 * The whole workspace surface for one workspace: the name header, the file
 * browser and preview, sharing, search, optional skills, and every waiting and
 * failure state around them.
 *
 * Extracted from the Workspaces page so the agent's Workspace tab renders the
 * exact same surface rather than a second implementation that drifts.
 */
export function WorkspacePanel({ workspaceId, showSkills = true, emptyState }: WorkspacePanelProps) {
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

  const fileFromUrl = searchParams.get('file');
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const pathFromUrl = searchParams.get('path') || '.';

  // The list supplies the display metadata (name, read-only flag) that the
  // per-workspace info request does not carry.
  const { data: workspacesData, error: workspacesError, isLoading: isLoadingWorkspaces } = useWorkspaces();
  const workspaces = workspacesData?.workspaces ?? [];

  const { data: workspaceInfo, isLoading: isLoadingInfo, error: workspaceInfoError } = useWorkspaceInfo(workspaceId);

  const isSessionExpired = is401UnauthorizedError(workspacesError) || is401UnauthorizedError(workspaceInfoError);
  const isPermissionDenied = is403ForbiddenError(workspacesError) || is403ForbiddenError(workspaceInfoError);
  const isWorkspaceNotSupported =
    isWorkspaceNotSupportedError(workspacesError) || isWorkspaceNotSupportedError(workspaceInfoError);

  const selectedWorkspace: WorkspaceItem | undefined = workspaceId
    ? workspaces.find(w => w.id === workspaceId)
    : undefined;

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

  const currentPath = pathFromUrl;
  const selectedFile = fileFromUrl;

  const {
    data: filesData,
    isLoading: isLoadingFiles,
    error: filesError,
    refetch: refetchFiles,
  } = useWorkspaceFiles(currentPath, {
    enabled: workspaceInfo?.isWorkspaceConfigured && workspaceInfo?.capabilities?.hasFilesystem,
    workspaceId,
  });
  const deleteFile = useDeleteWorkspaceFile();
  const createDirectory = useCreateWorkspaceDirectory();
  const writeFileFromFile = useWriteWorkspaceFileFromFile();
  const fileOperation = useWorkspaceFileOperation();

  const { data: skillsData, isLoading: isLoadingSkills, refetch: refetchSkills } = useWorkspaceSkills({ workspaceId });

  const installSkill = useInstallSkill();
  const updateSkills = useUpdateSkills();
  const removeSkill = useRemoveSkill();

  const isWorkspaceConfigured = workspaceInfo?.isWorkspaceConfigured ?? false;
  const hasFilesystem = workspaceInfo?.capabilities?.hasFilesystem ?? false;
  const hasSkills = showSkills && (workspaceInfo?.capabilities?.hasSkills ?? false);
  const canBM25 = workspaceInfo?.capabilities?.canBM25 ?? false;
  const canVector = workspaceInfo?.capabilities?.canVector ?? false;
  const isReadOnly = selectedWorkspace?.safety?.readOnly ?? false;

  // Can manage skills (install/remove/check/update) if we have filesystem and not read-only
  // None of these operations require sandbox - all are done via GitHub API + filesystem
  const canManageSkills = hasFilesystem && !isReadOnly;
  const workspaceSharing = useWorkspaceSharing({ enabled: hasFilesystem });

  const handleUploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!workspaceId || !files || files.length === 0) return;

      const uploadDirectory = currentPath === '.' ? '' : currentPath;

      try {
        await Promise.all(
          Array.from(files).map(file =>
            writeFileFromFile.mutateAsync({
              workspaceId,
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
    [currentPath, workspaceId, refetchFiles, writeFileFromFile],
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
      if (!workspaceId) return;
      const duplicatePath = buildPath(currentPath, buildDuplicateName(entry.name));
      try {
        await fileOperation.mutateAsync({
          workspaceId,
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
    [buildDuplicateName, buildPath, currentPath, workspaceId, fileOperation, refetchFiles],
  );

  const handleRename = useCallback(
    async (sourcePath: string, entry: FileEntry, nextName: string) => {
      if (!workspaceId) return;
      const destinationPath = buildSiblingPath(sourcePath, nextName);
      try {
        await fileOperation.mutateAsync({
          workspaceId,
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
    [buildSiblingPath, workspaceId, fileOperation, refetchFiles, selectedFile, setSelectedFile],
  );

  const handlePaste = useCallback(
    async (destinationDirectory: string) => {
      if (!workspaceId || !clipboardItem) return;
      const destinationPath = buildPath(destinationDirectory, clipboardItem.entry.name);
      try {
        await fileOperation.mutateAsync({
          workspaceId,
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
    [buildPath, clipboardItem, workspaceId, fileOperation, refetchFiles],
  );

  // Derive writable mounts for CompositeFilesystem
  const mounts = workspaceInfo?.mounts;
  const writableMounts = mounts
    ?.filter(m => !m.readOnly)
    .map(m => ({ path: m.path, displayName: m.displayName, icon: m.icon, provider: m.provider, name: m.name }));

  const handleInstallSkill = useCallback(
    (params: { repository: string; skillName: string; mount?: string }) => {
      if (!workspaceId) return;

      installSkill.mutate(
        { ...params, workspaceId },
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
    [workspaceId, installSkill, refetchSkills],
  );

  const handleUpdateSkill = useCallback(
    (skillName: string) => {
      if (!workspaceId) return;

      setUpdatingSkillName(skillName);
      updateSkills.mutate(
        { workspaceId, skillName },
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
    [workspaceId, updateSkills, refetchSkills],
  );

  const handleRemoveSkill = useCallback(
    (skillName: string) => {
      if (!workspaceId) return;

      setRemovingSkillName(skillName);
      removeSkill.mutate(
        { workspaceId, skillName },
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
    [workspaceId, removeSkill, refetchSkills],
  );

  // Compute active tab based on URL and workspace capabilities
  // If URL specifies a tab, use it only if the workspace supports it
  // Otherwise, fall back to the first available capability
  const getEffectiveTab = (): TabType => {
    if (tabFromUrl === 'files' && hasFilesystem) return 'files';
    if (tabFromUrl === 'skills' && hasSkills) return 'skills';
    if (hasFilesystem) return 'files';
    if (hasSkills) return 'skills';
    return 'files';
  };
  const activeTab = getEffectiveTab();

  const skills = skillsData?.skills ?? [];
  const isSkillsConfigured = skillsData?.isSkillsConfigured ?? false;
  const files = filesData?.entries ?? [];

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
        <SandboxStartupProgress workspaceId={workspaceId} />
      </NoDataPageLayout>
    );
  }

  if (isSessionExpired) {
    return (
      <NoDataPageLayout>
        <SessionExpired />
      </NoDataPageLayout>
    );
  }

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

  // Nothing to show. A workspace directory is created lazily, so this is the
  // ordinary state of something that has not run yet — calm, not an error.
  if (!workspaceId) {
    return <NoDataPageLayout>{emptyState ?? <NoWorkspacesInfo />}</NoDataPageLayout>;
  }

  // The workspace list is served from local metadata, but its info request is
  // what waits on the sandbox actually being up — so this is the wait the user
  // sees on a cold workspace, and it gets the same progress surface.
  if (isLoadingInfo) {
    return (
      <NoDataPageLayout>
        <SandboxStartupProgress workspaceId={workspaceId} />
      </NoDataPageLayout>
    );
  }

  if (!isWorkspaceConfigured) {
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
        {selectedWorkspace && <WorkspaceHeader workspace={selectedWorkspace} isReadOnly={isReadOnly} />}

        {/* Search Panel - keyed on workspace so hooks reset on switch */}
        {showSearch && hasSearchCapability && (
          <WorkspaceSearchPanel
            key={workspaceId}
            workspaceId={workspaceId}
            canSearchFiles={canSearchFiles}
            canSearchSkills={canSearchSkills}
            canBM25={canBM25}
            canVector={canVector}
            showInitWarning={!isLoadingInfo && workspaceInfo?.status !== 'ready'}
            onViewFileResult={id => {
              updateSearchParams({ file: id, tab: 'files' });
            }}
            onViewSkillResult={(skillName, skillPath) => {
              void navigate(
                `/workspaces/${workspaceId}/skills/${encodeURIComponent(skillName)}?path=${encodeURIComponent(skillPath)}`,
              );
            }}
          />
        )}

        {(hasFilesystem || hasSkills) && (
          <Tabs value={activeTab} onValueChange={setActiveTab} defaultTab={activeTab} className="w-full min-w-0">
            {hasSkills && (
              <TabList>
                {hasFilesystem && (
                  <Tab value="files">
                    <FileText className="h-4 w-4" />
                    Files
                  </Tab>
                )}
                <Tab value="skills">
                  <Wand2 className="h-4 w-4" />
                  Skills
                  {isSkillsConfigured && skills.length > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-surface4 text-neutral4">{skills.length}</span>
                  )}
                </Tab>
              </TabList>
            )}

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
                    onCreateDirectory={isReadOnly ? undefined : path => createDirectory.mutate({ path, workspaceId })}
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
                        : path => deleteFile.mutate({ path, recursive: true, force: true, workspaceId })
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
                      workspaceId={workspaceId}
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
                  basePath={`/workspaces/${workspaceId}/skills`}
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

        {!hasFilesystem && !hasSkills && (
          <div className="py-12 text-center text-neutral4">
            <p>No workspace capabilities are configured.</p>
          </div>
        )}
      </PageLayout.MainArea>

      {canManageSkills && showSkills && (
        <AddSkillDialog
          open={showAddSkillDialog}
          onOpenChange={setShowAddSkillDialog}
          workspaceId={workspaceId}
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

/**
 * Name of the workspace on show.
 *
 * A workspace is named after what it belongs to, so its own name and the
 * agent name are routinely the same string. Repeating it as `Foo (Foo)` reads
 * as a rendering bug, so the parenthetical is only added when it says
 * something the name does not.
 */
function WorkspaceHeader({ workspace, isReadOnly }: { workspace: WorkspaceItem; isReadOnly: boolean }) {
  const showAgentName =
    workspace.source === 'agent' && Boolean(workspace.agentName) && workspace.agentName !== workspace.name;

  return (
    <div className="flex items-center gap-2 text-sm text-neutral4">
      {workspace.source === 'agent' ? <Bot className="h-4 w-4 text-accent1" /> : <Server className="h-4 w-4" />}
      <span>{workspace.name}</span>
      {showAgentName && <span className="text-neutral3">({workspace.agentName})</span>}
      {isReadOnly && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Read-only</span>
      )}
    </div>
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
          {/* One address per user, mounting the whole tree — uploads, every
              conversation directory and every group share — so the copy names
              the files, not one directory the user happens to be looking at. */}
          <AlertDialog.Description>
            Mount all of your files over WebDAV in the operating system file browser. The connection opens at the top of
            your files, so everything below it is available.
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
