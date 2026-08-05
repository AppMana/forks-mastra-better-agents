import { MessagePrimitive, useMessage } from '@assistant-ui/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@mastra/playground-ui';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { ImageEntry, PdfEntry, TxtEntry } from '../attachments/attachment-preview-dialog';
import { isAgentOnlyMessage, visibleUserText } from './agent-only-text';
import { DatasetSaveAction } from './dataset-save-action';
import { SystemReminderBadge } from './system-reminder-badge';
export interface InMessageAttachmentProps {
  type: string;
  contentType?: string;
  nameSlot: React.ReactNode;
  src?: string;
  data?: string;
}

const InMessageAttachment = ({ type, contentType, nameSlot, src, data }: InMessageAttachmentProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="h-full w-full overflow-hidden rounded-lg">
            {type === 'image' ? (
              <ImageEntry src={src ?? ''} />
            ) : type === 'document' && contentType === 'application/pdf' ? (
              <PdfEntry data={data ?? ''} url={src} />
            ) : (
              <TxtEntry data={data ?? ''} />
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent side="top">{nameSlot}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * One text part of a user message, as the person sees it.
 *
 * Exported so what is and is not rendered can be asserted without standing up
 * a whole assistant-ui runtime: which of these branches a given string takes
 * is the behaviour, not the surrounding message chrome.
 */
export const UserTextPart = ({ text }: { text: string }) => {
  if (text.trimStart().startsWith('<system-reminder')) {
    return <SystemReminderBadge text={text} />;
  }

  if (text.includes('<attachment name=')) {
    return (
      <InMessageAttachment
        type="document"
        contentType="text/plain"
        nameSlot="Unknown filename"
        src={undefined}
        data={text}
      />
    );
  }

  // The path announcement and any <hidden> correction are for the agent; the
  // person sees the attachment and their own words. A part that was nothing
  // but those renders as nothing at all rather than as an empty bubble line.
  const visible = visibleUserText(text);
  return visible === '' ? null : visible;
};

export const UserMessage = () => {
  const message = useMessage();
  const messageId = message?.id;

  // The uploaded-path announcement arrives as a user message of its own, so
  // there is no bubble to put beside the person's words — an empty one is the
  // announcement still showing, wordlessly.
  if (isAgentOnlyMessage((message?.content ?? []) as ReadonlyArray<{ type: string; text?: string }>)) {
    return null;
  }

  return (
    <MessagePrimitive.Root
      className="w-full flex items-end pb-4 pt-2 flex-col"
      data-message-id={messageId}
      data-message-index={message?.index}
    >
      <DatasetSaveAction />
      <div className="max-w-[max(366px,70%)] break-words px-4 py-2 text-neutral6 text-ui-lg leading-ui-lg rounded-xl bg-surface3">
        <MessagePrimitive.Parts
          components={{
            File: p => {
              const data = p.data;
              const isUrl = data?.startsWith('https://');

              return (
                <InMessageAttachment
                  type="document"
                  contentType={p.mimeType}
                  nameSlot="Unknown filename"
                  src={isUrl ? data : undefined}
                  data={p.data}
                />
              );
            },
            Image: p => {
              return <InMessageAttachment type="image" nameSlot="Unknown filename" src={p.image} />;
            },
            Text: p => <UserTextPart text={p.text} />,
          }}
        />
      </div>

      {/* <BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" /> */}
    </MessagePrimitive.Root>
  );
};
