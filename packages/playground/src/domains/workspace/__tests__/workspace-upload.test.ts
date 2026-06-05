import { describe, expect, it } from 'vitest';
import type { WorkspaceItem } from '../types';
import {
  buildWorkspaceUploadNotice,
  buildWorkspaceUploadPath,
  sanitizeWorkspaceUploadFileName,
  selectWorkspaceForUpload,
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

  it('builds a composer notice with normalized absolute paths', () => {
    expect(buildWorkspaceUploadNotice(['uploads/a.csv', '/uploads/b.csv'])).toBe(
      'Uploaded workspace files:\n- /uploads/a.csv\n- /uploads/b.csv',
    );
  });

  it('prefers the writable workspace attached to the current agent', () => {
    const selected = selectWorkspaceForUpload(
      [
        workspace({ id: 'global' }),
        workspace({ id: 'read-only-agent', agentId: 'agent-1', safety: { readOnly: true } }),
        workspace({ id: 'agent', agentId: 'agent-1' }),
      ],
      'agent-1',
    );

    expect(selected?.id).toBe('agent');
  });
});
