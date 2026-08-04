import { describe, expect, it } from 'vitest';
import type { WorkspaceItem } from '../types';
import {
  buildWorkspaceUploadNotice,
  buildWorkspaceUploadPath,
  completeWorkspaceUploadFile,
  fileToBase64,
  formatWorkspaceUploadLabel,
  sanitizeWorkspaceUploadFileName,
  selectWorkspaceForUpload,
  workspaceUploadNoticeRoot,
  startWorkspaceUploadProgress,
  workspaceUploadPercent,
} from '../workspace-upload';

function workspace(overrides: Partial<WorkspaceItem>): WorkspaceItem {
  return {
    id: 'workspace',
    name: 'Workspace',
    status: 'ready',
    source: 'mastra',
    capabilities: {
      hasFilesystem: true,
      hasSandbox: false,
      canBM25: false,
      canVector: false,
      canHybrid: false,
      hasSkills: false,
    },
    safety: { readOnly: false },
    ...overrides,
  };
}

describe('workspace upload helpers', () => {
  it('sanitizes file names for workspace paths', () => {
    expect(sanitizeWorkspaceUploadFileName('report.csv')).toBe('report.csv');
    expect(sanitizeWorkspaceUploadFileName('../report.csv')).toBe('.._report.csv');
    expect(sanitizeWorkspaceUploadFileName('')).toBe('upload');
  });

  /**
   * Workspace-root-relative. Naming a tree the sandbox mounts separately (a
   * per-user home, a group share) would write the file into a same-named
   * subdirectory of this workspace instead, which is not the path the composer
   * would then announce.
   */
  it('builds upload paths below the workspace own uploads directory', () => {
    expect(buildWorkspaceUploadPath('report.csv')).toBe('uploads/report.csv');
    expect(buildWorkspaceUploadPath('report.csv', '/incoming/')).toBe('incoming/report.csv');
  });

  it('keeps spaces and parentheses in the announced path verbatim', () => {
    const path = buildWorkspaceUploadPath('investor clubs (2).xlsx');
    expect(path).toBe('uploads/investor clubs (2).xlsx');
    expect(buildWorkspaceUploadNotice([path])).toBe(
      'Uploaded workspace file:\n- /workspace/uploads/investor clubs (2).xlsx',
    );
  });

  /** An absolute path the server already resolved is announced verbatim. */
  it('announces an already absolute path without prepending a root', () => {
    expect(buildWorkspaceUploadNotice(['/workspace/private/uploads/report.csv'], '')).toBe(
      'Uploaded workspace file:\n- /workspace/private/uploads/report.csv',
    );
  });

  it('builds a composer notice with absolute sandbox paths under the workspace root', () => {
    expect(buildWorkspaceUploadNotice(['uploads/a.csv', '/uploads/b.csv'])).toBe(
      'Uploaded workspace files:\n- /workspace/uploads/a.csv\n- /workspace/uploads/b.csv',
    );
  });

  it('builds a composer notice against a custom workspace root', () => {
    expect(buildWorkspaceUploadNotice(['uploads/a.csv'], '/mnt/data/')).toBe(
      'Uploaded workspace file:\n- /mnt/data/uploads/a.csv',
    );
  });

  it('uploads into the answering agent own workspace, the only one it can read', () => {
    const selected = selectWorkspaceForUpload(
      [workspace({ id: 'global', source: 'mastra' }), workspace({ id: 'agent', agentId: 'agent-1', source: 'agent' })],
      'agent-1',
    );

    expect(selected?.id).toBe('agent');
  });

  it('falls back to a config owned workspace when the agent has none writable', () => {
    const selected = selectWorkspaceForUpload(
      [
        workspace({ id: 'global', source: 'mastra' }),
        workspace({ id: 'read-only-agent', agentId: 'agent-1', source: 'agent', safety: { readOnly: true } }),
      ],
      'agent-1',
    );

    expect(selected?.id).toBe('global');
  });

  /**
   * A per-agent workspace IS the sandbox's working directory; a config-owned
   * one is a separate volume mounted beside it. Announcing both at /workspace
   * sent the agent to a path the file was never written to, and it fell back
   * to searching the filesystem and dumping the file through the shell.
   */
  it('roots a config owned workspace at its own mount, not the working directory', () => {
    expect(workspaceUploadNoticeRoot(workspace({ source: 'mastra' }))).toBe('/workspace/shared');
    expect(workspaceUploadNoticeRoot(workspace({ source: 'agent' }))).toBe('/workspace');
  });
});

describe('workspace upload progress', () => {
  const files = [
    { name: 'a.bin', size: 600 },
    { name: 'b.bin', size: 300 },
    { name: 'c.bin', size: 100 },
  ];

  it('starts at zero with the first file current', () => {
    const progress = startWorkspaceUploadProgress(files);
    expect(progress).toEqual({
      totalFiles: 3,
      completedFiles: 0,
      totalBytes: 1000,
      completedBytes: 0,
      currentFileName: 'a.bin',
    });
    expect(workspaceUploadPercent(progress)).toBe(0);
    expect(formatWorkspaceUploadLabel(progress)).toBe('Uploading a.bin (1/3)');
  });

  it('advances byte-weighted through each completed file', () => {
    let progress = startWorkspaceUploadProgress(files);
    progress = completeWorkspaceUploadFile(progress, files[0]!, 'b.bin');
    expect(workspaceUploadPercent(progress)).toBe(60);
    expect(formatWorkspaceUploadLabel(progress)).toBe('Uploading b.bin (2/3)');
    progress = completeWorkspaceUploadFile(progress, files[1]!, 'c.bin');
    expect(workspaceUploadPercent(progress)).toBe(90);
    progress = completeWorkspaceUploadFile(progress, files[2]!, null);
    expect(workspaceUploadPercent(progress)).toBe(100);
  });

  it('omits the counter for a single file and survives empty files', () => {
    const single = startWorkspaceUploadProgress([{ name: 'only.txt', size: 10 }]);
    expect(formatWorkspaceUploadLabel(single)).toBe('Uploading only.txt');

    const empty = startWorkspaceUploadProgress([{ name: 'empty.txt', size: 0 }]);
    expect(workspaceUploadPercent(empty)).toBe(0);
    expect(workspaceUploadPercent(completeWorkspaceUploadFile(empty, { name: 'empty.txt', size: 0 }, null))).toBe(100);
  });
});

describe('fileToBase64', () => {
  it('round-trips binary content and spans chunk boundaries', async () => {
    const bytes = new Uint8Array(0x8000 + 17);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
    const file = new File([bytes], 'data.bin');

    const base64 = await fileToBase64(file);

    const decoded = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    expect(decoded).toEqual(bytes);
  });
});
