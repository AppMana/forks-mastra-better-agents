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

  it('builds upload paths below the upload directory', () => {
    expect(buildWorkspaceUploadPath('report.csv')).toBe('uploads/report.csv');
    expect(buildWorkspaceUploadPath('report.csv', '/incoming/')).toBe('incoming/report.csv');
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

  it('prefers the durable mastra workspace over ephemeral agent sandboxes', () => {
    const selected = selectWorkspaceForUpload(
      [workspace({ id: 'agent', agentId: 'agent-1', source: 'agent' }), workspace({ id: 'global', source: 'mastra' })],
      'agent-1',
    );

    expect(selected?.id).toBe('global');
  });

  it('falls back to the agent workspace when no durable workspace is writable', () => {
    const selected = selectWorkspaceForUpload(
      [
        workspace({ id: 'global', source: 'mastra', safety: { readOnly: true } }),
        workspace({ id: 'read-only-agent', agentId: 'agent-1', source: 'agent', safety: { readOnly: true } }),
        workspace({ id: 'agent', agentId: 'agent-1', source: 'agent' }),
      ],
      'agent-1',
    );

    expect(selected?.id).toBe('agent');
  });

  it('roots the notice at the sandbox mount point of the chosen workspace', () => {
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
