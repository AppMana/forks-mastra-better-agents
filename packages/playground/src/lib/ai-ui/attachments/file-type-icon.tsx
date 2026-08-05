import { cn } from '@mastra/playground-ui';
import { File, FileArchive, FileCode, FileImage, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { fileTypeKind } from './file-type';
import type { FileTypeKind } from './file-type';

/**
 * Icon and colour per kind. The palette is the one the workspace file browser
 * already uses for file types, so a spreadsheet looks the same in the composer
 * as it does in the tree. Neutral kinds use design tokens rather than fixed
 * greys so they follow the light/dark theme.
 */
const KIND_ICONS: Record<FileTypeKind, { Icon: LucideIcon; className: string }> = {
  spreadsheet: { Icon: FileSpreadsheet, className: 'text-emerald-400' },
  document: { Icon: FileType, className: 'text-sky-400' },
  pdf: { Icon: FileText, className: 'text-red-400' },
  image: { Icon: FileImage, className: 'text-purple-400' },
  archive: { Icon: FileArchive, className: 'text-amber-400' },
  code: { Icon: FileCode, className: 'text-blue-400' },
  text: { Icon: FileText, className: 'text-neutral4' },
  file: { Icon: File, className: 'text-neutral3' },
};

export interface FileTypeIconProps {
  name: string;
  contentType?: string;
  className?: string;
}

export const FileTypeIcon = ({ name, contentType, className }: FileTypeIconProps) => {
  const kind = fileTypeKind(name, contentType);
  const { Icon, className: kindClassName } = KIND_ICONS[kind];

  // The kind is on the element so the format is assertable without reading SVG
  // path data, and inspectable in the DOM when a file gets the wrong icon.
  return <Icon aria-hidden className={cn(kindClassName, className)} data-file-kind={kind} />;
};
