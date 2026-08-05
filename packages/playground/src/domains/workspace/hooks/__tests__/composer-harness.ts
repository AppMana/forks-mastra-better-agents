import type { CompleteAttachment, PendingAttachment } from '@assistant-ui/react';
import { vi } from 'vitest';

import type { WorkspaceUploadAttachmentAdapter } from '@/lib/ai-ui/attachments/workspace-upload-adapter';

export interface ComposerHarness {
  /** The chips the composer would be showing, newest last. */
  attachments: PendingAttachment[];
  setText: ReturnType<typeof vi.fn>;
  runtime: {
    getState: () => { text: string };
    setText: (text: string) => void;
    addAttachment: (file: File) => Promise<void>;
  };
  /** What sending the message would produce: every chip, completed. */
  send: () => Promise<CompleteAttachment[]>;
}

/**
 * A stand-in for the composer runtime that drives the REAL attachment adapter.
 *
 * The runtime is @assistant-ui context rather than our own code, so it is a
 * seam in these tests — but `addAttachment` is the very thing under test: a
 * dropped file has to reach the adapter, become a chip, and hand over its path
 * only when the message is sent. Stubbing `addAttachment` out would make every
 * one of those assertions vacuous, so the harness does with the adapter exactly
 * what the runtime does: run `add` to completion, keep the chip it yields, and
 * reject when the adapter refuses the file.
 */
export function createComposerHarness(adapter: WorkspaceUploadAttachmentAdapter, initialText = ''): ComposerHarness {
  let text = initialText;
  const attachments: PendingAttachment[] = [];
  const setText = vi.fn((next: string) => {
    text = next;
  });

  return {
    attachments,
    setText,
    runtime: {
      getState: () => ({ text }),
      setText,
      addAttachment: async (file: File) => {
        for await (const pending of adapter.add({ file })) {
          // Upsert, as the runtime does: the first yield is the uploading chip
          // and the last replaces it in place, so a failed upload still leaves
          // the chip the user can see and remove.
          const existing = attachments.findIndex(attachment => attachment.id === pending.id);
          if (existing === -1) attachments.push(pending);
          else attachments[existing] = pending;
        }
      },
    },
    send: () => Promise.all(attachments.map(attachment => adapter.send(attachment))),
  };
}
