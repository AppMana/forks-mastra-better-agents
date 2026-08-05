import { AttachmentPrimitive, ComposerPrimitive, useAttachment } from '@assistant-ui/react';
import { Button, Tooltip, TooltipContent, TooltipTrigger, Icon } from '@mastra/playground-ui';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { X } from 'lucide-react';

import { useAttachmentSrc } from '../hooks/use-attachment-src';
import { useHasAttachments } from '../hooks/use-has-attachments';
import { ImageEntry } from './attachment-preview-dialog';
import { FileTypeIcon } from './file-type-icon';

export interface AttachmentTileProps {
  name: string;
  contentType?: string;
  /** A picture to show instead of an icon; only images ever have one. */
  src?: string;
}

/**
 * The chip body: a 64px square saying what kind of file this is, with the
 * file's name under it.
 *
 * Only images are drawn from their own bytes. Everything else gets its format
 * icon, because the thing that fits in 64px is the *kind* of file, not its
 * contents: a page of a PDF or the first few lines of a CSV rendered that small
 * is an illegible grey smudge, identical for every document the user attaches.
 * The full contents are a click away in the preview dialog either way.
 */
export const AttachmentTile = ({ name, contentType, src }: AttachmentTileProps) => (
  <div className="w-16">
    <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg bg-surface3 border border-border1">
      {src ? <ImageEntry src={src} /> : <FileTypeIcon name={name} contentType={contentType} className="size-6" />}
    </div>
    {/* Monospace: these are paths as much as labels, and a fixed advance width
        is what makes `report_v2.csv` and `report_v3.csv` distinguishable at
        10px. Truncated rather than wrapped so a long name cannot push the
        composer around; the full one is on the tooltip and the title. */}
    <p
      title={name}
      data-testid="attachment-name"
      className="mt-1 w-16 truncate text-center font-mono text-ui-xs leading-ui-xs text-neutral3"
    >
      {name}
    </p>
  </div>
);

const AttachmentThumbnail = () => {
  const name = useAttachment(a => a.name);
  const contentType = useAttachment(a => a.contentType);
  const isImage = useAttachment(a => a.type === 'image' || !!a.contentType?.startsWith('image/'));
  const canRemove = useAttachment(a => a.source !== 'message');
  const src = useAttachmentSrc();
  // A URL attachment carries its target as the name, and that URL is the only
  // thing that can be shown for it: there are no local bytes to make a blob
  // from. See `urlAttachmentTarget` in the upload adapter.
  const isUrl = name.startsWith('https://');
  const imageSrc = isUrl ? name : src;

  return (
    <div className="relative">
      <TooltipProvider>
        <Tooltip>
          <AttachmentPrimitive.Root>
            <TooltipTrigger asChild>
              <div>
                <AttachmentTile
                  name={name}
                  contentType={contentType}
                  src={isImage && imageSrc ? imageSrc : undefined}
                />
              </div>
            </TooltipTrigger>
          </AttachmentPrimitive.Root>
          <TooltipContent side="top">
            <AttachmentPrimitive.Name />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {canRemove && <AttachmentRemove />}
    </div>
  );
};

const AttachmentRemove = () => {
  return (
    <AttachmentPrimitive.Remove asChild>
      <Button
        variant="default"
        size="icon-sm"
        tooltip="Remove file"
        className="absolute -right-2 -top-2 text-neutral3 hover:text-neutral6 bg-surface1 hover:bg-surface2"
      >
        <Icon>
          <X />
        </Icon>
      </Button>
    </AttachmentPrimitive.Remove>
  );
};

export const ComposerAttachments = () => {
  const hasAttachments = useHasAttachments();

  if (!hasAttachments) return null;

  return (
    <div className="absolute bottom-full inset-x-0 px-2" data-attachments-row>
      <div className="max-w-3xl w-full mx-auto overflow-x-auto">
        <div className="flex flex-row items-start gap-4 px-3 pt-3 pb-1">
          <ComposerPrimitive.Attachments components={{ Attachment: AttachmentThumbnail }} />
        </div>
      </div>
    </div>
  );
};
