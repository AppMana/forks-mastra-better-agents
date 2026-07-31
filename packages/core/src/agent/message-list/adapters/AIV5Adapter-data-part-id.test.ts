import type { UIMessage } from '@internal/ai-sdk-v5';
import { describe, expect, it } from 'vitest';

import { AIV5Adapter } from './AIV5Adapter';

describe('AIV5Adapter data part ids', () => {
  it('preserves a custom data part id through UI to DB to UI conversion', () => {
    const dbMessage = AIV5Adapter.fromUIMessage({
      id: 'msg-1',
      role: 'assistant',
      parts: [
        {
          type: 'data-workspace-metadata',
          id: 'workspace-metadata:call-1',
          data: { toolCallId: 'call-1', status: 'running' },
        },
      ],
    } as UIMessage);

    expect(dbMessage.content.parts[0]).toMatchObject({
      type: 'data-workspace-metadata',
      id: 'workspace-metadata:call-1',
    });

    expect(AIV5Adapter.toUIMessage(dbMessage).parts[0]).toMatchObject({
      type: 'data-workspace-metadata',
      id: 'workspace-metadata:call-1',
    });
  });
});
