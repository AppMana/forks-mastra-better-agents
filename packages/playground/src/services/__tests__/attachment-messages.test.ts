import type { AppendMessage } from '@assistant-ui/react';
import { describe, expect, it } from 'vitest';

import { convertToAIAttachments } from '../attachment-messages';

/**
 * Where the uploaded-path announcement sits in what the model is sent.
 *
 * It is a user message OF ITS OWN — never appended to, or prefixed onto, the
 * text the person typed. That is what keeps the two from running together in
 * the prompt however the backend's chat template renders a turn, and it is
 * also why the announcement can be hidden from the rendered transcript without
 * touching a byte of the person's message (see lib/ai-ui/messages/agent-only-text).
 */

const NOTICE = 'Uploaded workspace file:\n- /uploads/CANARY_FILE_4.xls';

const documentAttachment = {
  id: 'a1',
  type: 'document',
  name: 'CANARY_FILE_4.xls',
  contentType: 'text/plain',
  content: [{ type: 'text', text: NOTICE }],
  status: { type: 'complete' },
} as unknown as NonNullable<AppendMessage['attachments']>[number];

describe('convertToAIAttachments', () => {
  it('sends the announcement as a message of its own, whole and unglued', async () => {
    const messages = await convertToAIAttachments([documentAttachment]);

    expect(messages).toEqual([{ role: 'user', content: NOTICE }]);
  });
});
