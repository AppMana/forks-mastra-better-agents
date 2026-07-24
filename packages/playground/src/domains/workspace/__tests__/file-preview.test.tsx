// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { AUTO_LOAD_LIMIT_BYTES, base64ToBlob, classifyPreview, formatBytes, shouldAutoLoad } from '../file-preview';
import { parseSpreadsheet } from '../spreadsheet';

describe('classifyPreview', () => {
  it('routes by mimetype first', () => {
    expect(classifyPreview('application/pdf', 'x.bin')).toBe('pdf');
    expect(classifyPreview('image/png', 'x')).toBe('image');
    expect(classifyPreview('video/mp4', 'x')).toBe('video');
    expect(classifyPreview('audio/mpeg', 'x')).toBe('audio');
    expect(classifyPreview('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'x')).toBe(
      'spreadsheet',
    );
    expect(classifyPreview('text/plain', 'x')).toBe('text');
  });

  it('falls back to the file extension', () => {
    expect(classifyPreview(undefined, 'report.pdf')).toBe('pdf');
    expect(classifyPreview(undefined, 'chart.xlsx')).toBe('spreadsheet');
    expect(classifyPreview(undefined, 'notes.md')).toBe('text');
    expect(classifyPreview(undefined, 'photo.webp')).toBe('image');
  });

  it('marks unknown types download-only', () => {
    expect(classifyPreview('application/octet-stream', 'blob.bin')).toBe('download-only');
    expect(classifyPreview(undefined, 'archive.tar.zst')).toBe('download-only');
  });
});

describe('shouldAutoLoad', () => {
  it('gates strictly above 5MB and fails open on unknown size', () => {
    expect(shouldAutoLoad(AUTO_LOAD_LIMIT_BYTES)).toBe(true);
    expect(shouldAutoLoad(AUTO_LOAD_LIMIT_BYTES + 1)).toBe(false);
    expect(shouldAutoLoad(undefined)).toBe(true);
  });
});

describe('formatBytes', () => {
  it('humanizes sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('base64ToBlob', () => {
  it('round-trips binary content with the right mimetype', async () => {
    const bytes = new Uint8Array([1, 2, 3, 250]);
    const blob = base64ToBlob(btoa(String.fromCharCode(...bytes)), 'application/pdf');
    expect(blob.type).toBe('application/pdf');
    // jsdom Blobs lack arrayBuffer() and its Response stringifies them;
    // FileReader is the API jsdom implements faithfully.
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    expect(new Uint8Array(buffer)).toEqual(bytes);
  });
});

describe('parseSpreadsheet', () => {
  it('parses a real workbook into a row grid', () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ['name', 'amount'],
      ['alpha', 1],
      ['beta', 2],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Data');
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const grid = parseSpreadsheet(buffer);
    expect(grid.sheetName).toBe('Data');
    expect(grid.rows).toEqual([
      ['name', 'amount'],
      ['alpha', 1],
      ['beta', 2],
    ]);
    expect(grid.truncated).toBe(false);
  });
});
