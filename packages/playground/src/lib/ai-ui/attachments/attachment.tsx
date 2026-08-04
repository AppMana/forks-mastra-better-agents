import type { AttachmentState } from '@assistant-ui/react';
import { AttachmentPrimitive, ComposerPrimitive, useAttachment } from '@assistant-ui/react';
import { Button, Spinner, Tooltip, TooltipContent, TooltipTrigger, Icon, fileToBase64 } from '@mastra/playground-ui';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { File as FileIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAttachmentSrc } from '../hooks/use-attachment-src';
import { useHasAttachments } from '../hooks/use-has-attachments';
import { useLoadBrowserFile } from '../hooks/use-load-browser-file';
import { ImageEntry, TxtEntry, PdfEntry } from './attachment-preview-dialog';

/**
 * How much of an attachment the composer will read into memory for a preview.
 *
 * Every attached file is a `document` now, whatever its type, because every one
 * of them is uploaded rather than inlined. The thumbnail is the only thing left
 * that still touches the bytes, so it needs the size guard the old per-type
 * adapters used to provide: `file.text()` on a video, or base64 on a
 * hundred-megabyte PDF, freezes the tab for a picture the size of a postage
 * stamp.
 */
const PREVIEW_BYTE_LIMIT = 2 * 1024 * 1024;

/** Types whose bytes are worth reading for a preview, and cheap to render. */
const TEXT_PREVIEW_TYPE = /^text\/|json|xml|csv|yaml|javascript|typescript|markdown|x-sh$/i;

const isSmallEnoughToPreview = (file?: File) => !!file && file.size <= PREVIEW_BYTE_LIMIT;

const canPreviewAsText = (file?: File) => isSmallEnoughToPreview(file) && TEXT_PREVIEW_TYPE.test(file!.type);

/** A file the composer will name but not open. */
const ComposerFileAttachment = () => (
  <div className="flex items-center justify-center h-full w-full">
    <FileIcon className="text-neutral3" />
  </div>
);

const ComposerTxtAttachment = ({ document }: { document: AttachmentState }) => {
  const { isLoading, text } = useLoadBrowserFile(document.file);

  return (
    <div className="flex items-center justify-center h-full w-full">
      {isLoading ? <Spinner /> : <TxtEntry data={text} />}
    </div>
  );
};

const ComposerPdfAttachment = ({ document }: { document: AttachmentState }) => {
  const [state, setState] = useState({ isLoading: false, text: '' });
  useEffect(() => {
    let isCanceled = false;

    const run = async () => {
      if (!document.file) return;
      setState(s => ({ ...s, isLoading: true }));
      const text = await fileToBase64(document.file);
      if (isCanceled) {
        return;
      }
      setState(s => ({ ...s, isLoading: false, text }));
    };
    void run();

    return () => {
      isCanceled = true;
    };
  }, [document]);

  const isUrl = document.file?.name.startsWith('https://');

  return (
    <div className="flex items-center justify-center h-full w-full">
      {state.isLoading ? <Spinner /> : <PdfEntry data={state.text} url={isUrl ? document.file?.name : undefined} />}
    </div>
  );
};

const AttachmentThumbnail = () => {
  const isImage = useAttachment(a => a.type === 'image');
  const document = useAttachment(a => (a.type === 'document' ? a : undefined));
  const src = useAttachmentSrc();
  const canRemove = useAttachment(a => a.source !== 'message');
  const isUrl = document?.file?.name.startsWith('https://');
  const actualSrc = isUrl ? document?.file?.name : src;

  return (
    <>
      <div className="relative">
        <TooltipProvider>
          <Tooltip>
            <AttachmentPrimitive.Root>
              <TooltipTrigger asChild>
                <div className="overflow-hidden size-16 rounded-lg bg-surface3 border border-border1 ">
                  {/* An image that is too large, or the wrong format, to show
                      the model is still an image to the user: the thumbnail
                      comes from an object URL, which costs nothing to make at
                      any file size. */}
                  {isImage || document?.contentType?.startsWith('image/') ? (
                    <ImageEntry src={actualSrc ?? ''} />
                  ) : document?.contentType === 'application/pdf' ? (
                    isSmallEnoughToPreview(document.file) ? (
                      <ComposerPdfAttachment document={document} />
                    ) : (
                      <ComposerFileAttachment />
                    )
                  ) : document ? (
                    canPreviewAsText(document.file) ? (
                      <ComposerTxtAttachment document={document} />
                    ) : (
                      <ComposerFileAttachment />
                    )
                  ) : null}
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
    </>
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
        <div className="flex flex-row items-center gap-4 px-3 pt-3 pb-1">
          <ComposerPrimitive.Attachments components={{ Attachment: AttachmentThumbnail }} />
        </div>
      </div>
    </div>
  );
};
