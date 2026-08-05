// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AttachmentTile } from '../attachment';
import { fileTypeKind } from '../file-type';
import type { FileTypeKind } from '../file-type';
import { FileTypeIcon } from '../file-type-icon';

afterEach(cleanup);

/** What the chip shows for a file, read the way a user would see it. */
const renderedKind = (name: string, contentType?: string) => {
  render(<FileTypeIcon name={name} contentType={contentType} />);
  return document.querySelector('[data-file-kind]')?.getAttribute('data-file-kind');
};

describe('fileTypeKind', () => {
  const byExtension: Array<[string, FileTypeKind]> = [
    ['quarterly.csv', 'spreadsheet'],
    ['budget.xlsx', 'spreadsheet'],
    ['sheet.ods', 'spreadsheet'],
    ['contract.docx', 'document'],
    ['deck.pptx', 'document'],
    ['notes.rtf', 'document'],
    ['manual.pdf', 'pdf'],
    ['diagram.PNG', 'image'],
    ['photo.jpeg', 'image'],
    ['logo.svg', 'image'],
    ['bundle.zip', 'archive'],
    ['backup.tar', 'archive'],
    ['dump.7z', 'archive'],
    ['train.py', 'code'],
    ['config.yaml', 'code'],
    ['index.tsx', 'code'],
    ['query.sql', 'code'],
    ['readme.md', 'text'],
    ['server.log', 'text'],
    ['notes.txt', 'text'],
  ];

  it.each(byExtension)('maps %s to the %s icon', (name, kind) => {
    expect(fileTypeKind(name)).toBe(kind);
  });

  const byMimetype: Array<[string, FileTypeKind]> = [
    ['application/pdf', 'pdf'],
    ['text/csv', 'spreadsheet'],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'spreadsheet'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document'],
    ['application/msword', 'document'],
    ['application/zip', 'archive'],
    ['application/json', 'code'],
    ['image/heif', 'image'],
    ['image/png', 'image'],
    ['text/plain', 'text'],
    ['text/markdown', 'text'],
    ['image/svg+xml', 'image'],
  ];

  it.each(byMimetype)('falls back to the mimetype %s for an unrecognised name', (contentType, kind) => {
    expect(fileTypeKind('attachment', contentType)).toBe(kind);
  });

  it('reads a mimetype that carries parameters', () => {
    expect(fileTypeKind('attachment', 'text/csv; charset=utf-8')).toBe('spreadsheet');
  });

  it('trusts the extension over a mimetype the OS guessed wrong', () => {
    // Browsers hand back text/plain for most scripts and octet-stream for
    // anything they do not know, so the name is the more specific signal.
    expect(fileTypeKind('train.py', 'text/plain')).toBe('code');
    expect(fileTypeKind('budget.xlsx', 'application/octet-stream')).toBe('spreadsheet');
  });

  const fallbacks = ['README', 'archive.unknownext', '.env', 'trailing.', ''];

  it.each(fallbacks)('falls back to the generic file icon for %j', name => {
    expect(fileTypeKind(name)).toBe('file');
    expect(fileTypeKind(name, 'application/octet-stream')).toBe('file');
  });
});

describe('FileTypeIcon', () => {
  it('renders the icon for the kind the file resolves to', () => {
    expect(renderedKind('quarterly.csv')).toBe('spreadsheet');
  });

  it('renders the generic icon when nothing identifies the file', () => {
    expect(renderedKind('mystery', 'application/octet-stream')).toBe('file');
  });

  it('is decorative: the name beside it is what is announced', () => {
    render(<FileTypeIcon name="manual.pdf" />);
    expect(document.querySelector('[data-file-kind]')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('AttachmentTile', () => {
  it('shows the file name in a tiny monospace font, truncated with an ellipsis', () => {
    render(<AttachmentTile name="quarterly-revenue-by-region-2026.csv" contentType="text/csv" />);

    const label = screen.getByTestId('attachment-name');
    expect(label.textContent).toBe('quarterly-revenue-by-region-2026.csv');
    expect(label.className).toContain('font-mono');
    expect(label.className).toContain('text-ui-xs');
    // `truncate` is Tailwind's overflow-hidden + text-ellipsis + nowrap; the
    // fixed width is what gives it something to truncate against.
    expect(label.className).toContain('truncate');
    expect(label.className).toContain('w-16');
  });

  it('keeps the full name discoverable as a title', () => {
    render(<AttachmentTile name="quarterly-revenue-by-region-2026.csv" contentType="text/csv" />);
    expect(screen.getByTestId('attachment-name').getAttribute('title')).toBe('quarterly-revenue-by-region-2026.csv');
  });

  it('shows the format icon rather than a preview for a non-image file', () => {
    render(<AttachmentTile name="manual.pdf" contentType="application/pdf" />);

    expect(document.querySelector('[data-file-kind]')?.getAttribute('data-file-kind')).toBe('pdf');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows the picture itself for an image, which is its own icon', () => {
    render(<AttachmentTile name="diagram.png" contentType="image/png" src="blob:preview" />);

    expect(screen.getByAltText('Preview').getAttribute('src')).toBe('blob:preview');
    expect(document.querySelector('[data-file-kind]')).toBeNull();
  });
});
