// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dragHasFiles } from '../components/drag-utils';
import { WorkspaceDropzone } from '../components/workspace-dropzone';

afterEach(cleanup);

const fileDrag = { dataTransfer: { types: ['Files'], files: [] } };
const textDrag = { dataTransfer: { types: ['text/plain'], files: [] } };

describe('dragHasFiles', () => {
  it('detects file drags and ignores text drags', () => {
    expect(dragHasFiles({ dataTransfer: { types: ['Files'] } as unknown as DataTransfer })).toBe(true);
    expect(dragHasFiles({ dataTransfer: { types: ['text/plain'] } as unknown as DataTransfer })).toBe(false);
    expect(dragHasFiles({ dataTransfer: null })).toBe(false);
  });
});

describe('WorkspaceDropzone', () => {
  it('toggles the overlay while dragging files over the window', () => {
    render(<WorkspaceDropzone onDropFiles={vi.fn()} />);
    expect(screen.queryByTestId('workspace-dropzone')).toBeNull();

    fireEvent.dragEnter(window, fileDrag);
    expect(screen.getByTestId('workspace-dropzone')).toBeTruthy();

    fireEvent.dragLeave(window, fileDrag);
    expect(screen.queryByTestId('workspace-dropzone')).toBeNull();
  });

  it('survives nested dragenter/dragleave pairs from child elements', () => {
    render(<WorkspaceDropzone onDropFiles={vi.fn()} />);
    fireEvent.dragEnter(window, fileDrag);
    fireEvent.dragEnter(window, fileDrag);
    fireEvent.dragLeave(window, fileDrag);
    expect(screen.getByTestId('workspace-dropzone')).toBeTruthy();
    fireEvent.dragLeave(window, fileDrag);
    expect(screen.queryByTestId('workspace-dropzone')).toBeNull();
  });

  it('ignores non-file drags entirely', () => {
    render(<WorkspaceDropzone onDropFiles={vi.fn()} />);
    fireEvent.dragEnter(window, textDrag);
    expect(screen.queryByTestId('workspace-dropzone')).toBeNull();
  });

  it('delivers dropped files and hides the overlay', () => {
    const onDropFiles = vi.fn();
    render(<WorkspaceDropzone onDropFiles={onDropFiles} />);
    const files = [new File(['x'], 'report.pdf')];

    fireEvent.dragEnter(window, fileDrag);
    fireEvent.drop(window, { dataTransfer: { types: ['Files'], files } });

    expect(onDropFiles).toHaveBeenCalledTimes(1);
    expect(onDropFiles.mock.calls[0][0]).toEqual(files);
    expect(screen.queryByTestId('workspace-dropzone')).toBeNull();
  });

  it('renders nothing when disabled', () => {
    render(<WorkspaceDropzone onDropFiles={vi.fn()} disabled />);
    fireEvent.dragEnter(window, fileDrag);
    expect(screen.queryByTestId('workspace-dropzone')).toBeNull();
  });
});
