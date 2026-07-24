// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WorkspaceUploadProgressBar } from '../components/workspace-upload-progress';
import { completeWorkspaceUploadFile, startWorkspaceUploadProgress } from '../workspace-upload';

afterEach(cleanup);

const FILES = [
  { name: 'report.csv', size: 750 },
  { name: 'archive.zip', size: 250 },
];

describe('WorkspaceUploadProgressBar', () => {
  it('renders nothing when no upload is running', () => {
    render(<WorkspaceUploadProgressBar progress={null} />);
    expect(screen.queryByTestId('workspace-upload-progress')).toBeNull();
  });

  it('shows the current file, counter, and byte-weighted percentage', () => {
    render(<WorkspaceUploadProgressBar progress={startWorkspaceUploadProgress(FILES)} />);
    expect(screen.getByText('Uploading report.csv (1/2)')).toBeTruthy();
    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
  });

  it('advances the bar as files complete', () => {
    const progress = completeWorkspaceUploadFile(startWorkspaceUploadProgress(FILES), FILES[0]!, 'archive.zip');
    render(<WorkspaceUploadProgressBar progress={progress} />);
    expect(screen.getByText('Uploading archive.zip (2/2)')).toBeTruthy();
    expect(screen.getByText('75%')).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('75');
  });
});
