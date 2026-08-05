/**
 * The kinds of file the composer distinguishes at a glance. Deliberately coarse:
 * the chip is 64px, so the icon has to answer "what sort of thing is this" and
 * nothing finer.
 */
export type FileTypeKind = 'spreadsheet' | 'document' | 'pdf' | 'image' | 'archive' | 'code' | 'text' | 'file';

const EXTENSION_KINDS: Record<string, FileTypeKind> = {
  csv: 'spreadsheet',
  tsv: 'spreadsheet',
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  xlsm: 'spreadsheet',
  ods: 'spreadsheet',
  numbers: 'spreadsheet',

  doc: 'document',
  docx: 'document',
  odt: 'document',
  rtf: 'document',
  ppt: 'document',
  pptx: 'document',
  odp: 'document',
  pages: 'document',
  key: 'document',
  epub: 'document',

  pdf: 'pdf',

  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  bmp: 'image',
  tif: 'image',
  tiff: 'image',
  avif: 'image',
  heic: 'image',
  ico: 'image',

  zip: 'archive',
  tar: 'archive',
  gz: 'archive',
  tgz: 'archive',
  bz2: 'archive',
  xz: 'archive',
  zst: 'archive',
  '7z': 'archive',
  rar: 'archive',

  js: 'code',
  jsx: 'code',
  mjs: 'code',
  cjs: 'code',
  ts: 'code',
  tsx: 'code',
  py: 'code',
  ipynb: 'code',
  rb: 'code',
  go: 'code',
  rs: 'code',
  java: 'code',
  kt: 'code',
  swift: 'code',
  c: 'code',
  h: 'code',
  cpp: 'code',
  hpp: 'code',
  cs: 'code',
  php: 'code',
  sh: 'code',
  bash: 'code',
  zsh: 'code',
  sql: 'code',
  lua: 'code',
  json: 'code',
  jsonl: 'code',
  yaml: 'code',
  yml: 'code',
  toml: 'code',
  xml: 'code',
  html: 'code',
  htm: 'code',
  css: 'code',
  scss: 'code',

  txt: 'text',
  text: 'text',
  log: 'text',
  md: 'text',
  mdx: 'text',
  rst: 'text',
};

/** Exact mimetypes that name a kind their extension might not. */
const MIME_KINDS: Record<string, FileTypeKind> = {
  'application/pdf': 'pdf',
  'text/csv': 'spreadsheet',
  'text/tab-separated-values': 'spreadsheet',
  'application/vnd.ms-excel': 'spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'document',
  'application/rtf': 'document',
  'application/epub+zip': 'document',
  'application/zip': 'archive',
  'application/x-tar': 'archive',
  'application/gzip': 'archive',
  'application/x-bzip2': 'archive',
  'application/x-7z-compressed': 'archive',
  'application/vnd.rar': 'archive',
  'application/json': 'code',
  'application/xml': 'code',
  'application/x-sh': 'code',
  'application/javascript': 'code',
};

/** Mimetype prefixes and suffixes, for the families that are open-ended. */
function kindFromMimeFamily(mime: string): FileTypeKind | undefined {
  if (mime.startsWith('image/')) return 'image';
  if (mime.endsWith('+xml') || mime.endsWith('+json')) return 'code';
  if (mime.includes('spreadsheet')) return 'spreadsheet';
  if (mime.includes('presentation') || mime.includes('opendocument.text')) return 'document';
  if (mime.startsWith('text/')) return 'text';
  return undefined;
}

function extensionOf(name: string): string {
  // Only the final segment, and only when the name actually has one: a dotfile
  // like `.env` is all extension by this rule, which would read as `env`.
  const trimmed = name.trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot <= 0 || dot === trimmed.length - 1) return '';
  return trimmed.slice(dot + 1).toLowerCase();
}

/**
 * Which icon a file gets, from its name and its declared mimetype.
 *
 * The extension is consulted first on purpose. The mimetype on a browser `File`
 * is guessed by the OS from that same extension, and when the guess fails it is
 * not absent but wrong in a specific way: an empty string, which the upload
 * adapter turns into `application/octet-stream`, or a flat `text/plain` for
 * every script and config file. Reading the name first means `query.sql` is
 * code rather than "some binary", and the mimetype is left to answer the cases
 * the extension genuinely cannot — an unfamiliar image format, or a file that
 * arrived with no extension at all.
 */
export function fileTypeKind(name: string, contentType?: string): FileTypeKind {
  const extension = extensionOf(name);
  const byExtension = EXTENSION_KINDS[extension];
  if (byExtension) return byExtension;

  const mime = (contentType ?? '').toLowerCase().split(';')[0]!.trim();
  return MIME_KINDS[mime] ?? kindFromMimeFamily(mime) ?? 'file';
}
