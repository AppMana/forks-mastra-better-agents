// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// jsdom doesn't provide ResizeObserver — stub it for floating-ui/base-ui
globalThis.ResizeObserver ??= class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof globalThis.ResizeObserver;

// jsdom also lacks `Element.getAnimations`, which @base-ui components call.
// Stub it to an empty list to avoid unhandled errors.
if (typeof Element !== 'undefined' && typeof Element.prototype.getAnimations !== 'function') {
  Element.prototype.getAnimations = function getAnimations() {
    return [] as Animation[];
  };
}

import { FileBrowser } from '../components/file-browser';
import type { FileBrowserProps } from '../components/file-browser';
import type { FileEntry } from '../types';

afterEach(cleanup);

const FILE_ENTRY: FileEntry = { name: 'report.csv', type: 'file', size: 2048 };
const DIR_ENTRY: FileEntry = { name: 'docs', type: 'directory' };
const MOUNT_ENTRY: FileEntry = {
  name: 's3-bucket',
  type: 'directory',
  mount: { provider: 's3', displayName: 'S3 Bucket' },
};

function renderBrowser(props: Partial<FileBrowserProps> = {}) {
  const defaults: FileBrowserProps = {
    entries: [FILE_ENTRY, DIR_ENTRY],
    currentPath: '.',
    isLoading: false,
    onNavigate: vi.fn(),
  };
  return render(<FileBrowser {...defaults} {...props} />);
}

/** Opens the per-entry actions dropdown menu and returns the menu item by name. */
async function openEntryMenu(entryName: string) {
  const trigger = screen.getByLabelText(`Actions for ${entryName}`);
  fireEvent.click(trigger, { button: 0 });
  expect(await screen.findByRole('menu')).toBeTruthy();
}

describe('FileBrowser — directory listing', () => {
  it('renders directories before files with formatted sizes', () => {
    renderBrowser({
      entries: [
        { name: 'zebra.txt', type: 'file', size: 1024 },
        { name: 'alpha', type: 'directory' },
        { name: 'beta.md', type: 'file', size: 512 },
      ],
    });

    const items = screen.getAllByRole('listitem').map(li => li.textContent ?? '');
    expect(items[0]).toContain('alpha');
    expect(items[1]).toContain('beta.md');
    expect(items[2]).toContain('zebra.txt');
    expect(items[1]).toContain('512 B');
    expect(items[2]).toContain('1 KB');
  });

  it('shows the empty state for the workspace root', () => {
    renderBrowser({ entries: [] });
    expect(screen.getByText('Workspace is empty')).toBeTruthy();
  });

  it('shows the empty state for a subdirectory', () => {
    renderBrowser({ entries: [], currentPath: 'docs' });
    expect(screen.getByText('Directory is empty')).toBeTruthy();
  });

  it('shows the error state with the error message', () => {
    renderBrowser({ entries: [], error: new Error('Directory not found') });
    expect(screen.getByText('Failed to load directory')).toBeTruthy();
    expect(screen.getByText('Directory not found')).toBeTruthy();
  });

  it('renders mount entries with their label and no actions menu', () => {
    renderBrowser({ entries: [MOUNT_ENTRY, FILE_ENTRY], onDelete: vi.fn() });
    expect(screen.getByText('S3 Bucket')).toBeTruthy();
    expect(screen.queryByLabelText('Actions for s3-bucket')).toBeNull();
    expect(screen.getByLabelText('Actions for report.csv')).toBeTruthy();
  });
});

describe('FileBrowser — navigation', () => {
  it('navigates into a directory on click', () => {
    const onNavigate = vi.fn();
    renderBrowser({ onNavigate });

    fireEvent.click(screen.getByText('docs'));
    expect(onNavigate).toHaveBeenCalledWith('docs');
  });

  it('builds the full path when navigating from a subdirectory', () => {
    const onNavigate = vi.fn();
    renderBrowser({ currentPath: 'docs', entries: [{ name: 'images', type: 'directory' }], onNavigate });

    fireEvent.click(screen.getByText('images'));
    expect(onNavigate).toHaveBeenCalledWith('docs/images');
  });

  it('selects a file on click', () => {
    const onFileSelect = vi.fn();
    renderBrowser({ onFileSelect });

    fireEvent.click(screen.getByText('report.csv'));
    expect(onFileSelect).toHaveBeenCalledWith('report.csv');
  });

  it('navigates to the parent directory via the ".." entry', () => {
    const onNavigate = vi.fn();
    renderBrowser({ currentPath: 'docs/images', entries: [FILE_ENTRY], onNavigate });

    fireEvent.click(screen.getByText('..'));
    expect(onNavigate).toHaveBeenCalledWith('docs');
  });

  it('navigates to the root via the breadcrumb root button', () => {
    const onNavigate = vi.fn();
    renderBrowser({ currentPath: 'docs/images', entries: [], onNavigate });

    fireEvent.click(screen.getByLabelText('Workspace root'));
    expect(onNavigate).toHaveBeenCalledWith('.');
  });

  it('navigates to an intermediate breadcrumb segment', () => {
    const onNavigate = vi.fn();
    renderBrowser({ currentPath: 'docs/images', entries: [], onNavigate });

    fireEvent.click(screen.getByRole('button', { name: 'docs' }));
    expect(onNavigate).toHaveBeenCalledWith('docs');
  });
});

describe('FileBrowser — file operations', () => {
  it('duplicates an entry from the actions menu', async () => {
    const onDuplicate = vi.fn();
    renderBrowser({ onDuplicate });

    await openEntryMenu('report.csv');
    fireEvent.click(screen.getByRole('menuitem', { name: /duplicate/i }));

    expect(onDuplicate).toHaveBeenCalledWith('report.csv', FILE_ENTRY);
  });

  it('passes subdirectory-qualified paths to cut and copy', async () => {
    const onCut = vi.fn();
    const onCopy = vi.fn();
    renderBrowser({ currentPath: 'docs', entries: [FILE_ENTRY], onCut, onCopy });

    await openEntryMenu('report.csv');
    fireEvent.click(screen.getByRole('menuitem', { name: /cut/i }));
    expect(onCut).toHaveBeenCalledWith('docs/report.csv', FILE_ENTRY);

    await openEntryMenu('report.csv');
    fireEvent.click(screen.getByRole('menuitem', { name: /copy/i }));
    expect(onCopy).toHaveBeenCalledWith('docs/report.csv', FILE_ENTRY);
  });

  it('shows the paste button only when a clipboard item exists and pastes into the current directory', () => {
    const onPaste = vi.fn();
    const { rerender } = renderBrowser({ currentPath: 'docs', entries: [], onPaste, canPaste: false });
    expect(screen.queryByLabelText('Paste into current directory')).toBeNull();

    rerender(
      <FileBrowser entries={[]} currentPath="docs" isLoading={false} onNavigate={vi.fn()} onPaste={onPaste} canPaste />,
    );
    fireEvent.click(screen.getByLabelText('Paste into current directory'));
    expect(onPaste).toHaveBeenCalledWith('docs');
  });

  it('renames an entry through the rename dialog', async () => {
    const onRename = vi.fn();
    renderBrowser({ onRename });

    await openEntryMenu('report.csv');
    fireEvent.click(screen.getByRole('menuitem', { name: /rename/i }));

    const input = await screen.findByPlaceholderText('New name');
    expect((input as HTMLInputElement).value).toBe('report.csv');

    const renameButton = screen.getByRole('button', { name: 'Rename' });
    // Unchanged name keeps the confirm button disabled
    expect((renameButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(input, { target: { value: 'renamed.csv' } });
    expect((renameButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(renameButton);
    expect(onRename).toHaveBeenCalledWith('report.csv', FILE_ENTRY, 'renamed.csv');
  });

  it('submits a rename with the Enter key', async () => {
    const onRename = vi.fn();
    renderBrowser({ onRename });

    await openEntryMenu('report.csv');
    fireEvent.click(screen.getByRole('menuitem', { name: /rename/i }));

    const input = await screen.findByPlaceholderText('New name');
    fireEvent.change(input, { target: { value: 'other.csv' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRename).toHaveBeenCalledWith('report.csv', FILE_ENTRY, 'other.csv');
  });

  it('deletes an entry after confirming the delete dialog', async () => {
    const onDelete = vi.fn();
    renderBrowser({ onDelete });

    await openEntryMenu('report.csv');
    fireEvent.click(screen.getByRole('menuitem', { name: /delete/i }));

    await screen.findByText('Delete Item');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('report.csv'));
  });

  it('does not delete when the confirmation is cancelled', async () => {
    const onDelete = vi.fn();
    renderBrowser({ onDelete });

    await openEntryMenu('report.csv');
    fireEvent.click(screen.getByRole('menuitem', { name: /delete/i }));

    await screen.findByText('Delete Item');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('offers rename and cut for directories too', async () => {
    const onRename = vi.fn();
    const onCut = vi.fn();
    renderBrowser({ entries: [DIR_ENTRY], onRename, onCut });

    await openEntryMenu('docs');
    fireEvent.click(screen.getByRole('menuitem', { name: /cut/i }));
    expect(onCut).toHaveBeenCalledWith('docs', DIR_ENTRY);
  });

  it('creates a directory through the new folder dialog', async () => {
    const onCreateDirectory = vi.fn();
    renderBrowser({ currentPath: 'docs', entries: [], onCreateDirectory });

    fireEvent.click(screen.getByLabelText('Create directory'));
    const input = await screen.findByPlaceholderText('Folder name');
    fireEvent.change(input, { target: { value: 'assets' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(onCreateDirectory).toHaveBeenCalledWith('docs/assets'));
  });
});

describe('FileBrowser — sharing affordances', () => {
  it('does not render the sharing menu when onOpenSharing is absent', () => {
    renderBrowser();
    expect(screen.queryByLabelText('Open in Desktop')).toBeNull();
  });

  it('opens the sharing menu and reports the selected platform', async () => {
    const onOpenSharing = vi.fn();
    renderBrowser({ onOpenSharing });

    const trigger = screen.getByLabelText('Open in Desktop');
    fireEvent.click(trigger, { button: 0 });
    expect(await screen.findByRole('menu')).toBeTruthy();

    expect(screen.getByRole('menuitem', { name: /access in windows/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /access in macos/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /access in ubuntu/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('menuitem', { name: /access in macos/i }));
    expect(onOpenSharing).toHaveBeenCalledWith('macos');
  });

  it('reports windows and linux platform selections', async () => {
    const onOpenSharing = vi.fn();
    renderBrowser({ onOpenSharing });

    const trigger = screen.getByLabelText('Open in Desktop');

    fireEvent.click(trigger, { button: 0 });
    expect(await screen.findByRole('menu')).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: /access in windows/i }));
    expect(onOpenSharing).toHaveBeenCalledWith('windows');

    fireEvent.click(trigger, { button: 0 });
    expect(await screen.findByRole('menu')).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: /access in ubuntu/i }));
    expect(onOpenSharing).toHaveBeenCalledWith('linux');
  });
});
