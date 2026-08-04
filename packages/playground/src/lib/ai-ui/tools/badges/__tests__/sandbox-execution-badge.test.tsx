// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { SandboxExecutionBadge } from '../sandbox-execution-badge';
import { WORKSPACE_TOOLS } from '@/domains/workspace/constants';
import { ToolCallProvider } from '@/services/tool-call-provider';

/**
 * The badge reads the in-flight assistant message out of assistant-ui's store.
 * That store is third-party context with no public test harness, so it is the
 * one seam replaced here — everything below it (the chunk→line reduction, the
 * ring buffer, the tail preview) runs for real, which is the whole point: these
 * tests assert that live `data-sandbox-stdout` parts actually reach the screen.
 *
 * `vi.mock` is hoisted above the imports by vitest, so the badge module below
 * still resolves the stub rather than the real store.
 */
const auiMocks = vi.hoisted(() => ({
  message: { content: [] as Array<{ type: string; name?: string; data?: unknown }> },
}));

vi.mock('@assistant-ui/react', () => ({
  useAuiState: (selector: (state: { message: unknown }) => unknown) => selector({ message: auiMocks.message }),
}));

const TOOL_CALL_ID = 'call-1';

type DataPart = { type: 'data'; name: string; data: Record<string, unknown> };

const workspaceMetadata = (): DataPart => ({
  type: 'data',
  name: 'workspace-metadata',
  data: { toolCallId: TOOL_CALL_ID, sandbox: { name: 'sandbox', status: 'running' } },
});

const stdout = (output: string): DataPart => ({
  type: 'data',
  name: 'sandbox-stdout',
  data: { output, timestamp: 1_700_000_000_000, toolCallId: TOOL_CALL_ID },
});

const stderr = (output: string): DataPart => ({
  type: 'data',
  name: 'sandbox-stderr',
  data: { output, timestamp: 1_700_000_000_000, toolCallId: TOOL_CALL_ID },
});

const exit = (exitCode: number): DataPart => ({
  type: 'data',
  name: 'sandbox-exit',
  data: { exitCode, success: exitCode === 0, executionTimeMs: 1234, toolCallId: TOOL_CALL_ID },
});

const setStream = (parts: DataPart[]) => {
  auiMocks.message = { content: parts };
};

const renderBadge = (props: { result?: unknown; command?: string } = {}) =>
  render(
    <ToolCallProvider
      approveToolcall={vi.fn()}
      declineToolcall={vi.fn()}
      approveToolcallGenerate={vi.fn()}
      declineToolcallGenerate={vi.fn()}
      approveNetworkToolcall={vi.fn()}
      declineNetworkToolcall={vi.fn()}
      isRunning={false}
      toolCallApprovals={{}}
      networkToolCallApprovals={{}}
    >
      <SandboxExecutionBadge
        toolName={WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND}
        args={{ command: props.command ?? 'pnpm build' }}
        result={props.result}
        toolCallId={TOOL_CALL_ID}
        toolApprovalMetadata={undefined}
        isNetwork={false}
      />
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

const lines = () => screen.queryAllByTestId('stream-tail-preview-line').map(node => node.textContent);

describe('SandboxExecutionBadge live output', () => {
  it('renders partial stdout while the command is still running', () => {
    setStream([workspaceMetadata(), stdout('installing deps\n'), stdout('resolving\n')]);

    renderBadge();

    expect(lines()).toEqual(['installing deps', 'resolving']);
  });

  it('marks the output region live while the command is running', () => {
    setStream([workspaceMetadata(), stdout('working\n')]);

    renderBadge();

    expect(screen.getByTestId('sandbox-execution-output').getAttribute('aria-busy')).toBe('true');
  });

  it('stops marking the region live once the exit part arrives', () => {
    setStream([workspaceMetadata(), stdout('working\n'), exit(0)]);

    renderBadge();

    expect(screen.getByTestId('sandbox-execution-output').getAttribute('aria-busy')).toBeNull();
  });

  it('joins a line split across two stdout parts', () => {
    setStream([workspaceMetadata(), stdout('hello wo'), stdout('rld\n')]);

    renderBadge();

    expect(lines()).toEqual(['hello world']);
  });

  it('interleaves stderr with stdout in arrival order', () => {
    setStream([workspaceMetadata(), stdout('step one\n'), stderr('warning: slow\n'), stdout('step two\n')]);

    renderBadge();

    expect(lines()).toEqual(['step one', 'warning: slow', 'step two']);
  });

  it('flushes a final unterminated line when the command exits', () => {
    setStream([workspaceMetadata(), stdout('no trailing newline'), exit(0)]);

    renderBadge();

    expect(lines()).toEqual(['no trailing newline']);
  });

  it('strips ANSI colors emitted by build tools', () => {
    setStream([workspaceMetadata(), stdout('\x1b[32m✓\x1b[0m built\n')]);

    renderBadge();

    expect(lines()).toEqual(['✓ built']);
  });

  it('bounds the rendered rows for a command that prints tens of thousands of lines', () => {
    const parts = [workspaceMetadata()];
    for (let i = 0; i < 3_000; i++) parts.push(stdout(`line ${i}\n`));
    setStream(parts);

    renderBadge();

    // The default window is 200 lines; the DOM must not grow past it.
    expect(lines()).toHaveLength(200);
    expect(lines()[199]).toBe('line 2999');
    expect(screen.getByTestId('stream-tail-preview-dropped').textContent).toContain('2,800 earlier lines hidden');
  });

  it('ignores parts belonging to a different tool call', () => {
    setStream([
      workspaceMetadata(),
      stdout('mine\n'),
      { type: 'data', name: 'sandbox-stdout', data: { output: 'someone else\n', toolCallId: 'call-2' } },
    ]);

    renderBadge();

    expect(lines()).toEqual(['mine']);
  });

  it('falls back to the persisted tool result after a reload, when transient parts are gone', () => {
    setStream([]);

    renderBadge({ result: 'restored output\nsecond line' });

    expect(lines()).toEqual(['restored output', 'second line']);
  });

  it('prefers the live stream over the truncated result while both are present', () => {
    setStream([workspaceMetadata(), stdout('live line\n')]);

    renderBadge({ result: 'truncated result' });

    expect(lines()).toEqual(['live line']);
  });

  it('shows a waiting placeholder before any output arrives', () => {
    setStream([workspaceMetadata()]);

    renderBadge();

    expect(screen.getByTestId('stream-tail-preview-empty').textContent).toBe('Waiting for output…');
  });

  it('shows the command in the preview header', () => {
    setStream([workspaceMetadata(), stdout('x\n')]);

    renderBadge({ command: 'pnpm -r build' });

    expect(screen.getByText('pnpm -r build')).not.toBeNull();
  });

  it('surfaces a non-zero exit code', () => {
    setStream([workspaceMetadata(), stdout('boom\n'), exit(2)]);

    renderBadge();

    expect(screen.getByText('exit 2')).not.toBeNull();
  });

  const nodeText = (node: Element | null) => node?.textContent ?? '';

  it('truncates a pathological single line rather than rendering it whole', () => {
    setStream([workspaceMetadata(), stdout(`${'x'.repeat(50_000)}\n`), exit(0)]);

    renderBadge();

    const [line] = screen.getAllByTestId('stream-tail-preview-line');
    // 2000-character default window plus the "+N" affordance, not 50,000 chars.
    expect(nodeText(line!).length).toBeLessThan(2_100);
    expect(nodeText(line!)).toContain('+48000');
  });
});
