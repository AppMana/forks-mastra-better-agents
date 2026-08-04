import type { AppendMessage } from '@assistant-ui/react';
import type { CoreUserMessage } from '@mastra/core/llm';
import { fileToBase64 } from '@mastra/playground-ui';

type ComposerAttachment = NonNullable<AppendMessage['attachments']>[number];

/** The text parts an attachment carries — in practice, its workspace path notice. */
const attachmentText = (attachment: ComposerAttachment): string =>
  (attachment.content ?? [])
    .map(part => (part.type === 'text' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();

/**
 * Turn the composer's attachments into the user messages that precede the
 * prompt.
 *
 * Split out of the runtime provider so it can be asserted directly against what
 * the attachment adapter produces: this is the last point at which a file's
 * bytes could still reach the model, so "the message names a path and carries
 * no file content" is a claim that has to be checked here rather than one step
 * earlier.
 *
 * Exactly one kind of attachment still carries bytes, and only because a path
 * is useless for it: an image small enough to inline (see `image-inlining`)
 * arrives as an image part. It arrives *alongside* its path, in the same
 * message, never instead of it — which is also how this copes with not knowing
 * whether the selected model can see images at all. The Studio's model list is
 * whatever the deployment configured, so any capability table here would be a
 * guess that fails in both directions; a model that ignores the image part
 * still has the path, and its file tools.
 */
export const convertToAIAttachments = async (
  attachments: AppendMessage['attachments'],
): Promise<Array<CoreUserMessage>> => {
  const promises = (attachments ?? [])
    .filter(attachment => attachment.type === 'image' || attachment.type === 'document')
    .map(async (attachment): Promise<CoreUserMessage> => {
      // The "add attachment" dialog smuggles a URL through the file-only API as
      // an empty File whose name is the URL. Its bytes are on the far end of
      // that URL and are never fetched into the prompt.
      const isFileFromURL = attachment.name.startsWith('https://');
      const text = attachmentText(attachment);

      if (attachment.type === 'document') {
        // A referenced PDF stays a file part, so providers that fetch it can.
        // There is no base64 branch beside this one any more: an uploaded
        // document is a path, and the bytes are in the workspace.
        if (isFileFromURL && attachment.contentType === 'application/pdf') {
          return {
            role: 'user',
            content: [
              { type: 'file', data: attachment.name, mimeType: attachment.contentType, filename: attachment.name },
            ],
          };
        }

        return { role: 'user', content: text };
      }

      if (isFileFromURL) {
        return {
          role: 'user',
          content: [{ type: 'image', image: attachment.name, mimeType: attachment.contentType }],
        };
      }

      // Only the adapter's inlineable images keep a `file`; without one there
      // is nothing to show and the path is the whole message.
      const file = attachment.file;
      if (!file) return { role: 'user', content: text };

      return {
        role: 'user',
        content: [
          // Path first, so the model can open the file itself whether or not it
          // can see the part that follows.
          ...(text ? [{ type: 'text' as const, text }] : []),
          { type: 'image', image: await fileToBase64(file), mimeType: file.type },
        ],
      };
    });

  return Promise.all(promises);
};
