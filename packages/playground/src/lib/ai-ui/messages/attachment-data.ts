import { appRoute } from '@/lib/app-routes';

/**
 * A file the ASSISTANT attached to its reply, as carried by a non-transient
 * `data-attachment` stream part.
 *
 * This is the mirror image of a composer attachment: the user picks files with
 * the paperclip and they become parts of a USER message, whereas these are
 * chosen by the agent — by workspace path — and become parts of the assistant
 * message. Non-transient matters: the part is persisted with the message, so
 * the download link is still there when the thread is reloaded, unlike the
 * transient `data-sandbox-stdout` parts that only exist during the run.
 *
 * The part carries no URL. The path is the address, and the embedding
 * application's download route resolves it against whoever is asking — so the
 * link cannot be turned into a way to read someone else's file by copying it
 * out of a shared transcript.
 */
/** Stream/persisted part type an agent emits to attach a file. */
export const ATTACHMENT_PART_TYPE = 'data-attachment';

/**
 * The same thing as assistant-ui sees it. `to-assistant-ui-message.ts` strips
 * the `data-` prefix, and `assistant-message.tsx` registers the renderer under
 * this key — a mismatch between the two renders nothing and reports nothing,
 * so both ends read it from here.
 */
export const ATTACHMENT_PART_NAME = ATTACHMENT_PART_TYPE.slice('data-'.length);

export type AttachmentData = {
  /** Filename shown in the chat. */
  name: string;
  /** Workspace path of the file, e.g. `/workspace/private/uploads/report.pdf`. */
  path: string;
  /** Size in bytes, as the agent's side measured it. */
  size?: number;
  mediaType?: string;
  /** Optional one-line description of what the file is. */
  label?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isAttachmentData = (value: unknown): value is AttachmentData => {
  if (!isRecord(value)) return false;
  return typeof value.name === 'string' && value.name.length > 0 && typeof value.path === 'string';
};

/**
 * Where the browser fetches the file. Relative to the app-route prefix rather
 * than the Mastra `/api` surface, because serving a user's own files is the
 * embedding application's job — Mastra's workspace API is scoped to a
 * workspace id, not to a person.
 */
export const attachmentDownloadUrl = (path: string): string =>
  `${appRoute('/workspace/download')}?path=${encodeURIComponent(path)}`;

/** Human size for a download row. Undefined size renders as nothing, not "0 B". */
export const formatAttachmentSize = (bytes: number | undefined): string | undefined => {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

/**
 * Turn a failed download response into a sentence worth showing.
 *
 * The download route answers a refusal as JSON with an `error` field, and that
 * text is written for the person reading it ("… is in group "analysts", which
 * this user is not a member of"). A bare status code in its place would leave
 * the user unable to tell a missing file from one they may not have.
 */
export const attachmentDownloadError = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { error?: string };
    if (typeof body.error === 'string' && body.error) return body.error;
  } catch {
    // Fall through to the status-based message.
  }
  if (response.status === 401) return 'Sign in again to download this file.';
  if (response.status === 403) return 'You do not have access to this file.';
  if (response.status === 404) return 'This file is no longer in the workspace.';
  if (response.status === 413) return 'This file is too large to download from chat.';
  return `The download failed (HTTP ${response.status}).`;
};
