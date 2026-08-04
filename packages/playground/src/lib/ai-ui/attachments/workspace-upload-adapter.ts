import type { Attachment, AttachmentAdapter, CompleteAttachment, PendingAttachment } from '@assistant-ui/react';
import { canInlineImage, describeSkippedImageInlining, skippedImageNoticeSuffix } from './image-inlining';
import { buildWorkspaceUploadNotice } from '@/domains/workspace/workspace-upload';
import type { WorkspaceUploadResult } from '@/domains/workspace/workspace-upload';

export type WorkspaceAttachmentUploader = (file: File) => Promise<WorkspaceUploadResult>;

/**
 * A file the composer will send as a URL rather than as bytes.
 *
 * The "add attachment" dialog smuggles a public URL through assistant-ui's
 * file-only attachment API as an empty `File` whose *name* is the URL. Such a
 * file has nothing to upload — its bytes are on the far end of that URL — so it
 * is passed through untouched instead of being written into the workspace as a
 * zero-byte file named `https://…`.
 */
function urlAttachmentTarget(file: File): string | undefined {
  return file.size === 0 && /^https?:\/\//.test(file.name) ? file.name : undefined;
}

/**
 * The composer's only file-attachment adapter: every attached file is uploaded
 * to the workspace and the message carries the resulting PATH.
 *
 * It replaces assistant-ui's `SimpleTextAttachmentAdapter`, which read the
 * whole file with `FileReader.readAsText()` and inlined it into the prompt as
 * `<attachment name=…>…</attachment>` under no size cap whatsoever. A
 * spreadsheet-sized CSV went into the context verbatim, and every byte of it —
 * including any "ignore your instructions" paragraph parked at the end of the
 * document — arrived as prompt text. Bytes are never inlined here, at any size:
 * the model gets a path and decides for itself whether to open it, with its
 * file tools, under the tool-output handling that applies to everything else it
 * reads.
 *
 * The upload happens in `add`, not in `send`, so a rejected or oversize file is
 * reported while the user is still composing and the attachment is left marked
 * incomplete. `send` then refuses it outright, which is what keeps a message
 * from going out naming a path nothing was ever written to.
 *
 * Images are the one exception, and only additively: a small raster image is
 * uploaded exactly like everything else AND kept on the attachment so it also
 * travels as an image part. Without that a vision model is handed a path to a
 * picture, which is not something it can look at. See `image-inlining` for what
 * "small" and "raster" mean and why.
 */
export class WorkspaceUploadAttachmentAdapter implements AttachmentAdapter {
  /**
   * Everything. Narrowing this would silently hand the declined types back to
   * whatever adapter runs next, and inlining is exactly what that fallback
   * would do.
   */
  public accept = '*';

  /** Announcement text per attachment id, from `add` until `send` or `remove`. */
  private readonly notices = new Map<string, string>();

  /** Attachment ids that are URL references and so have nothing to upload. */
  private readonly urls = new Map<string, string>();

  constructor(
    private readonly upload: WorkspaceAttachmentUploader,
    private readonly onError?: (message: string) => void,
    /** Not a failure: an image that was uploaded but will not be shown to the model. */
    private readonly onNotice?: (message: string) => void,
  ) {}

  async *add({ file }: { file: File }): AsyncGenerator<PendingAttachment, void> {
    const id = crypto.randomUUID();
    const url = urlAttachmentTarget(file);

    if (url) {
      this.urls.set(id, url);
      yield {
        id,
        // A URL attachment keeps its natural kind: an image URL is still sent
        // to the model as an image, it is just never fetched into the prompt.
        type: file.type.startsWith('image/') ? 'image' : 'document',
        name: file.name,
        file,
        contentType: file.type,
        status: { type: 'requires-action', reason: 'composer-send' },
      };
      return;
    }

    // 'image' is what makes the file's bytes travel to the model alongside the
    // path, so it is claimed only for the images that are meant to. Everything
    // else — documents, SVG, an image past the cap — stays a 'document', whose
    // `file` is dropped in `send` so nothing downstream can encode it.
    const inlinesAsImage = canInlineImage(file);

    const pending = {
      id,
      type: inlinesAsImage ? ('image' as const) : ('document' as const),
      name: file.name,
      file,
      contentType: file.type || 'application/octet-stream',
    };

    // Show the chip immediately, so the user sees the file is being taken and
    // can watch it settle rather than staring at an unchanged composer.
    yield { ...pending, status: { type: 'running', reason: 'uploading', progress: 0 } };

    try {
      const { path, noticeRoot } = await this.upload(file);
      const skipped = describeSkippedImageInlining(file);
      this.notices.set(
        id,
        buildWorkspaceUploadNotice([path], noticeRoot) + (skipped ? skippedImageNoticeSuffix(file) : ''),
      );
      // Said out loud, while the user is still composing: an image chip that
      // the model will not see is indistinguishable from one it will.
      if (skipped) this.onNotice?.(skipped);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const message = `Failed to upload ${file.name} to the workspace: ${reason}`;
      this.onError?.(message);
      // Rethrowing marks the attachment incomplete and raises
      // `attachmentAddError` on the composer runtime; swallowing it here would
      // leave a chip that looks attached and sends nothing.
      throw new Error(message);
    }

    yield { ...pending, status: { type: 'requires-action', reason: 'composer-send' } };
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    const url = this.urls.get(attachment.id);
    if (url) {
      this.urls.delete(attachment.id);
      return {
        id: attachment.id,
        type: attachment.type,
        name: attachment.name,
        contentType: attachment.contentType,
        file: attachment.file,
        // The URL itself, so the kinds the runtime does not special-case by
        // name — anything that is neither an image nor a PDF — still carry the
        // reference instead of arriving as an empty user message.
        content: [{ type: 'text', text: url }],
        status: { type: 'complete' },
      };
    }

    const notice = this.notices.get(attachment.id);
    if (!notice) {
      const message = `${attachment.name} was not uploaded to the workspace. Remove it and attach it again.`;
      this.onError?.(message);
      // Throwing aborts the whole send and restores the composer, rather than
      // letting a message go out that points the agent at a missing file.
      throw new Error(message);
    }
    this.notices.delete(attachment.id);

    if (canInlineImage(attachment.file)) {
      return {
        id: attachment.id,
        type: 'image',
        name: attachment.name,
        contentType: attachment.file.type,
        // Kept, unlike every other kind: this is the copy that becomes the
        // image part. The workspace already has its own, so the two do not
        // compete — the model gets the picture and the path to it.
        file: attachment.file,
        content: [{ type: 'text', text: notice }],
        status: { type: 'complete' },
      };
    }

    return {
      id: attachment.id,
      type: 'document',
      name: attachment.name,
      // The content below is the path notice, which is plain text whatever the
      // uploaded file was. Carrying the file's own type here would send a PDF
      // attachment down the base64-document path and hand the model a data URL
      // built out of the notice.
      contentType: 'text/plain',
      // The path, never the bytes — and no `file`, so nothing downstream can
      // reach for them either.
      content: [{ type: 'text', text: notice }],
      status: { type: 'complete' },
    };
  }

  async remove(attachment: Attachment): Promise<void> {
    this.notices.delete(attachment.id);
    this.urls.delete(attachment.id);
  }
}
