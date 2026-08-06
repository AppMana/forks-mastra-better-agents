// @vitest-environment jsdom
import { fromThreadMessageLike } from '@assistant-ui/react';
import type * as AssistantUiReact from '@assistant-ui/react';
import type { MastraDBMessage } from '@mastra/core/agent/message-list';
import type { ChunkType } from '@mastra/core/stream';
import { accumulateChunk } from '@mastra/react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { SandboxExecutionBadge } from '../badges/sandbox-execution-badge';
import { ToolBadge } from '../badges/tool-badge';
import { WORKSPACE_TOOLS } from '@/domains/workspace/constants';
import { toAssistantUIMessages } from '@/services/to-assistant-ui-message';
import { ToolCallProvider } from '@/services/tool-call-provider';

/**
 * A model writing a long `execute_command` argument (a heredoc, a script) emits
 * its JSON as a stream of fragments that are invalid JSON until the very last
 * one. These tests drive the real state machine — the `@mastra/react`
 * accumulator, then the playground's assistant-ui converter, then assistant-ui's
 * own part construction — and stop MID-STREAM, which is the state the user sits
 * in for many seconds and where the UI used to show `{}`.
 *
 * Nothing here hand-sets a "streaming" prop: if the fragments do not survive the
 * pipeline, these fail.
 */

const RUN_ID = 'run-1';
const TOOL_CALL_ID = 'call-heredoc-1';

/** A long, multi-line command: the shape that takes seconds to stream. */
const SCRIPT = [
  '#!/usr/bin/env bash',
  'set -euo pipefail',
  "cat <<'PY' > /workspace/analyze.py",
  'import pandas as pd',
  '',
  'frame = pd.read_excel("/workspace/shared/contracts.xlsx")',
  'print(frame.describe())',
  'PY',
  'python3 /workspace/analyze.py',
].join('\n');

/** The argument JSON as the model emits it: many small, individually invalid pieces. */
const fragmentsOf = (json: string, size = 8): string[] => {
  const fragments: string[] = [];
  for (let index = 0; index < json.length; index += size) {
    fragments.push(json.slice(index, index + size));
  }
  return fragments;
};

const ARGS_JSON = JSON.stringify({ command: SCRIPT });
const ARGS_FRAGMENTS = fragmentsOf(ARGS_JSON);
/** Cut short of the closing quote and brace: the model is still writing. */
const STREAMED_FRAGMENTS = ARGS_FRAGMENTS.slice(0, ARGS_FRAGMENTS.length - 2);
const STREAMED_SO_FAR = STREAMED_FRAGMENTS.join('');

const chunk = (type: string, payload: Record<string, unknown>): ChunkType =>
  ({ type, runId: RUN_ID, from: 'AGENT', payload }) as unknown as ChunkType;

/** Replay chunks through the accumulator exactly as `useChat` does. */
const replay = (chunks: ChunkType[]): MastraDBMessage[] =>
  chunks.reduce<MastraDBMessage[]>(
    (conversation, next) => accumulateChunk({ chunk: next, conversation, metadata: { mode: 'stream' } }),
    [],
  );

const streamingChunks = (fragments: string[]): ChunkType[] => [
  chunk('start', { messageId: 'asst-1' }),
  chunk('tool-call-input-streaming-start', {
    toolCallId: TOOL_CALL_ID,
    toolName: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
  }),
  ...fragments.map(argsTextDelta => chunk('tool-call-delta', { toolCallId: TOOL_CALL_ID, argsTextDelta })),
];

const completedChunks = (): ChunkType[] => [
  ...streamingChunks(ARGS_FRAGMENTS),
  chunk('tool-call-input-streaming-end', { toolCallId: TOOL_CALL_ID }),
  chunk('tool-call', {
    toolCallId: TOOL_CALL_ID,
    toolName: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
    args: { command: SCRIPT },
  }),
];

/**
 * The tool-call part a renderer actually receives, produced the way the app
 * produces it: accumulator → playground converter → assistant-ui.
 */
const renderedToolCallPart = (chunks: ChunkType[]) => {
  const [message] = toAssistantUIMessages(replay(chunks));
  if (!message) throw new Error('expected a converted assistant message');
  const { content } = fromThreadMessageLike(message, 'fallback-id', { type: 'running' });
  const part = content.find(candidate => candidate.type === 'tool-call');
  if (!part || part.type !== 'tool-call') throw new Error('expected a tool-call part');
  return part;
};

const auiMocks = vi.hoisted(() => ({
  message: { content: [] as Array<{ type: string; name?: string; data?: unknown }> },
}));

/**
 * Only the assistant-ui *store* is stubbed (the sandbox badge reads the live
 * message out of it for stdout parts). Everything else in the module — notably
 * `fromThreadMessageLike`, which builds the part under test — stays real.
 */
vi.mock('@assistant-ui/react', async importOriginal => ({
  ...(await importOriginal<typeof AssistantUiReact>()),
  useAuiState: (selector: (state: { message: unknown }) => unknown) => selector({ message: auiMocks.message }),
}));

const withToolCallProvider = (children: ReactNode) =>
  render(
    <ToolCallProvider
      approveToolcall={vi.fn()}
      declineToolcall={vi.fn()}
      approveToolcallGenerate={vi.fn()}
      declineToolcallGenerate={vi.fn()}
      approveNetworkToolcall={vi.fn()}
      declineNetworkToolcall={vi.fn()}
      isRunning={true}
      toolCallApprovals={{}}
      networkToolCallApprovals={{}}
    >
      {children}
    </ToolCallProvider>,
  );

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

afterEach(() => {
  cleanup();
  auiMocks.message = { content: [] };
});

const previewText = () =>
  screen
    .queryAllByTestId('stream-tail-preview-line')
    .map(node => node.textContent ?? '')
    .join('\n');

describe('streaming tool-call arguments reach the renderer', () => {
  it('keeps the raw fragments accumulated so far as argsText', () => {
    const part = renderedToolCallPart(streamingChunks(STREAMED_FRAGMENTS));

    expect(part.argsText).toBe(STREAMED_SO_FAR);
  });

  it('exposes the partially written command, not an empty object', () => {
    const part = renderedToolCallPart(streamingChunks(STREAMED_FRAGMENTS));
    const args = part.args as { command?: string };

    expect(args.command).toContain('set -euo pipefail');
    expect(args.command).toContain('import pandas as pd');
  });

  it('marks the message as still running while the arguments stream', () => {
    const [message] = toAssistantUIMessages(replay(streamingChunks(STREAMED_FRAGMENTS)));

    expect(message?.status).toEqual({ type: 'running' });
  });

  it('yields the complete parsed arguments once the final fragment lands', () => {
    const part = renderedToolCallPart(completedChunks());

    expect(part.args).toEqual({ command: SCRIPT });
    expect(part.argsText).toBe(ARGS_JSON);
  });
});

describe('SandboxExecutionBadge while the command is still being written', () => {
  const renderBadge = (part: { args: unknown; argsText: string }) =>
    withToolCallProvider(
      <SandboxExecutionBadge
        toolName={WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND}
        args={part.args as Record<string, unknown>}
        argsText={part.argsText}
        result={undefined}
        toolCallId={TOOL_CALL_ID}
        toolApprovalMetadata={undefined}
        isNetwork={false}
      />,
    );

  it('streams the partial command into the bounded preview', () => {
    renderBadge(renderedToolCallPart(streamingChunks(STREAMED_FRAGMENTS)));

    expect(previewText()).toContain('set -euo pipefail');
    expect(previewText()).toContain('import pandas as pd');
  });

  it('shows command output, not the script, once the command runs', () => {
    auiMocks.message = {
      content: [
        { type: 'data', name: 'workspace-metadata', data: { toolCallId: TOOL_CALL_ID } },
        { type: 'data', name: 'sandbox-stdout', data: { toolCallId: TOOL_CALL_ID, output: 'count    42\n' } },
      ],
    };

    renderBadge(renderedToolCallPart(completedChunks()));

    expect(previewText()).toContain('count    42');
    expect(previewText()).not.toContain('set -euo pipefail');
  });
});

describe('ToolBadge while arguments are still being written', () => {
  const renderExpanded = (part: { args: unknown; argsText: string }) => {
    withToolCallProvider(
      <ToolBadge
        toolName="some_tool"
        args={part.args as Record<string, unknown>}
        argsText={part.argsText}
        result={undefined}
        toolOutput={[]}
        toolCallId={TOOL_CALL_ID}
        toolApprovalMetadata={undefined}
        isNetwork={false}
      />,
    );
    // The badge opens collapsed; the arguments are behind its toggle.
    fireEvent.click(screen.getByRole('button'));
  };

  it('renders the raw argument text as it arrives instead of an empty object', () => {
    renderExpanded(renderedToolCallPart(streamingChunks(STREAMED_FRAGMENTS)));

    const argsBlock = within(screen.getByTestId('tool-args'));
    // The buffer is still growing, so what is on screen is the unterminated
    // trailing line, not a finished one. Ending it at every render is what put
    // each fragment on its own line.
    const text = [
      ...argsBlock.queryAllByTestId('stream-tail-preview-line'),
      ...argsBlock.queryAllByTestId('stream-tail-preview-pending'),
    ]
      .map(node => node.textContent ?? '')
      .join('\n');

    expect(text).toContain('set -euo pipefail');
    expect(text).toContain('import pandas as pd');
  });

  it('switches to the formatted arguments once the call lands', () => {
    renderExpanded(renderedToolCallPart(completedChunks()));

    expect(within(screen.getByTestId('tool-args')).queryAllByTestId('stream-tail-preview-line')).toHaveLength(0);
    expect(within(screen.getByTestId('tool-args')).queryAllByTestId('stream-tail-preview-pending')).toHaveLength(0);
  });
});
