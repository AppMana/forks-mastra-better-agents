/**
 * Text a user message carries FOR THE AGENT, which the person must not be
 * shown as their own prose.
 *
 * Two kinds exist, and they arrive by the same route — a text part in a user
 * message — so they are stripped in one place:
 *
 *   the upload announcement  "Uploaded workspace file:\n- /uploads/report.pdf"
 *     The absolute path is the whole point: the agent has to be told where the
 *     file landed, and the user must not be able to edit it. But it is not
 *     something they wrote, and it is not something they can act on — they
 *     attached a file and they can see the chip that says so.
 *   a `<hidden>…</hidden>` block
 *     Server-side corrections addressed to the model, e.g. "the chat was
 *     renamed, so those paths moved" (mastra's conversation-rename-notice.ts).
 *
 * Stripping happens at RENDER time only. The stored message keeps every byte,
 * because it is what the model was actually sent — rewriting it to match what
 * the screen shows would make the transcript a lie and, for anything already
 * in the prompt, would re-prefill everything after it.
 */

/** `<hidden>…</hidden>`, including the newline that separates it from the message. */
const HIDDEN_BLOCK = /<hidden>[\s\S]*?<\/hidden>\n?/g;

/**
 * An upload announcement: the header line and the `- /path` bullets under it.
 * Anchored to the start of a line so a mention of the phrase inside a
 * sentence the person actually typed is left alone.
 */
const UPLOAD_ANNOUNCEMENT = /^Uploaded workspace files?:\n(?:[ \t]*-[ \t]*\/\S.*\n?)+/gm;

/**
 * What the person sees of one text part: their own words, with the
 * agent-addressed blocks removed. Empty when the part was nothing but those.
 */
export function visibleUserText(text: string): string {
  return text.replace(HIDDEN_BLOCK, '').replace(UPLOAD_ANNOUNCEMENT, '').replace(/^\s+/, '');
}

/**
 * A whole user message that exists only to tell the agent something.
 *
 * The composer sends the announcement as its OWN user message (the attachment
 * adapter's content, converted in services/attachment-messages.ts), so hiding
 * the text alone would leave an empty bubble on screen where the file went —
 * which is the announcement still being visible, just wordlessly. Such a
 * message is not rendered at all.
 *
 * Only ever true for a message made entirely of stripped text: anything with a
 * part this module does not recognise — an image, a file, prose — is the
 * person's message and renders normally.
 */
export function isAgentOnlyMessage(parts: ReadonlyArray<{ type: string; text?: string }>): boolean {
  return (
    parts.length > 0 &&
    parts.every(part => part.type === 'text' && typeof part.text === 'string' && visibleUserText(part.text) === '')
  );
}
