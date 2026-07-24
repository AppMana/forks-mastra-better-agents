/**
 * Mimetype-aware preview classification for the workspace file sidebar.
 * Rendering leans on solved problems: the browser's built-in PDF engine and
 * media elements via blob URLs, SheetJS for spreadsheets, the existing code
 * viewer for text. Files above AUTO_LOAD_LIMIT_BYTES are never auto-fetched —
 * the user gets a download button instead.
 */

export const AUTO_LOAD_LIMIT_BYTES = 5 * 1024 * 1024;

export type PreviewKind = 'pdf' | 'image' | 'video' | 'audio' | 'spreadsheet' | 'text' | 'download-only';

const SPREADSHEET_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.oasis.opendocument.spreadsheet',
]);
const SPREADSHEET_EXTENSIONS = new Set(['xlsx', 'xls', 'ods']);

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'json',
  'yaml',
  'yml',
  'toml',
  'xml',
  'html',
  'css',
  'js',
  'jsx',
  'ts',
  'tsx',
  'py',
  'go',
  'rs',
  'java',
  'c',
  'h',
  'cpp',
  'hpp',
  'sh',
  'sql',
  'csv',
  'tsv',
  'log',
  'env',
  'ini',
  'cfg',
]);

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

export function classifyPreview(mimeType: string | undefined, fileName: string): PreviewKind {
  const ext = fileExtension(fileName);

  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mimeType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext))
    return 'image';
  if (mimeType?.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return 'audio';
  if ((mimeType && SPREADSHEET_MIMES.has(mimeType)) || SPREADSHEET_EXTENSIONS.has(ext)) return 'spreadsheet';
  if (mimeType?.startsWith('text/') || mimeType === 'application/json' || TEXT_EXTENSIONS.has(ext)) return 'text';

  return 'download-only';
}

export function shouldAutoLoad(sizeBytes: number | undefined): boolean {
  // Unknown sizes load (stat should always provide one; failing open keeps
  // small files usable), known sizes obey the limit.
  return sizeBytes === undefined || sizeBytes <= AUTO_LOAD_LIMIT_BYTES;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Decode a base64 payload into a typed Blob without a quadratic string pass. */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}
