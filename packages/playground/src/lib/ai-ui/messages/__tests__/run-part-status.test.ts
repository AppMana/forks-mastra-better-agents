import { describe, expect, it } from 'vitest';

import { activeToolLabel, isWaitingOnSandbox, runPartStatus } from '../run-part-status';
import type { RunPartLike } from '../run-part-status';

/**
 * The fixture is a transcription of a real turn, thread
 * 1a299b82-6043-48b9-a298-df2898185450, read straight out of
 * `mastra_messages.content.parts`. Every persisted tool part in that thread —
 * in the whole table, in fact — is `type: 'tool-invocation'` with
 * `toolInvocation: { state: 'result', result, args, toolCallId, toolName }`,
 * which the playground adapter maps to a `tool-call` content part carrying
 * `result`. Nothing is stored under `output`, and `state` is always present.
 *
 * What actually distinguishes a failed command from a successful one is the
 * `data-sandbox-exit` part the execute_command tool emits next to it, keyed by
 * `toolCallId`: `{ exitCode, success }`. That part is persisted (only the
 * stdout/stderr chunks are transient), so it survives a reload and is the one
 * authoritative statement of how the command ended.
 *
 * Two of these genuinely failed (`uv pip install` with no venv, exit 2; the
 * pandas import, exit 1) and two plainly succeeded (creating the venv, and the
 * pandas read that printed six sheet names).
 */
const persistedRun: RunPartLike[] = [
  {
    type: 'tool-call',
    toolCallId: 'oFXkzOxxlyM22zTxngjFqvRMjdJsdpDO',
    toolName: 'mastra_workspace_execute_command',
    args: { command: 'uv pip install pandas openpyxl 2>&1 | tail -5' },
    result:
      'error: No virtual environment found; run `uv venv` to create an environment, or pass `--system` to install into a non-virtual environment\n\nExit code: 2',
  },
  {
    type: 'tool-call',
    toolCallId: 'NVQwbmdlV5TyxBPj1viE0mlLM41qhLSW',
    toolName: 'mastra_workspace_execute_command',
    args: { command: 'uv run python -c "\nimport pandas as pd\nxls = pd.ExcelFile(\'/uploads/whoopsie.xlsx\')"' },
    result:
      'Traceback (most recent call last):\n  File "<string>", line 2, in <module>\nModuleNotFoundError: No module named \'pandas\'\n\nExit code: 1',
  },
  {
    type: 'data',
    name: 'sandbox-exit',
    data: { exitCode: 2, success: false, executionTimeMs: 199, toolCallId: 'oFXkzOxxlyM22zTxngjFqvRMjdJsdpDO' },
  },
  {
    type: 'data',
    name: 'sandbox-exit',
    data: { exitCode: 1, success: false, executionTimeMs: 370, toolCallId: 'NVQwbmdlV5TyxBPj1viE0mlLM41qhLSW' },
  },
  {
    type: 'tool-call',
    toolCallId: 'dNea6t7P2N5ThUcNBSkwDXzrX4tnmwpL',
    toolName: 'mastra_workspace_execute_command',
    args: { command: 'cd /workspaces && uv venv .venv && . .venv/bin/activate && uv pip install pandas openpyxl' },
    result: 'Installed 6 packages in 24.11s\n',
  },
  {
    type: 'data',
    name: 'sandbox-exit',
    data: { exitCode: 0, success: true, executionTimeMs: 26094, toolCallId: 'dNea6t7P2N5ThUcNBSkwDXzrX4tnmwpL' },
  },
  {
    type: 'tool-call',
    toolCallId: 'qkgpp326yiSubBtaEfvwjtjXLK9Bgyee',
    toolName: 'mastra_workspace_execute_command',
    args: { command: 'cd /workspaces && . .venv/bin/activate && python -c "import pandas as pd"' },
    result:
      "Sheet names: ['Statement of Assets', 'Statement of Operations', 'Changes in Net Assets', 'Schedule of Investments', 'Financial Highlights', 'Notes']\n",
  },
  {
    type: 'data',
    name: 'sandbox-exit',
    data: { exitCode: 0, success: true, executionTimeMs: 17911, toolCallId: 'qkgpp326yiSubBtaEfvwjtjXLK9Bgyee' },
  },
];

const statuses = (parts: readonly RunPartLike[], isStreamingTail = false) =>
  parts.filter(part => part.type === 'tool-call').map(part => runPartStatus(part, parts, isStreamingTail));

describe('runPartStatus', () => {
  it('marks only the commands that actually failed, on a reloaded turn', () => {
    expect(statuses(persistedRun)).toEqual(['failed', 'failed', 'succeeded', 'succeeded']);
  });

  it('does not call a command failed just because the model is no longer streaming', () => {
    // Mid-execution the persisted shape is `state: 'call'` with no result, and
    // the message reads as complete because no text part is streaming. That is
    // "no result yet", which is not the same thing as "the run ended without
    // one" and must never share the red dot.
    const pending: RunPartLike[] = [
      {
        type: 'tool-call',
        toolCallId: 'live',
        toolName: 'mastra_workspace_execute_command',
        args: { command: 'uv pip install pandas openpyxl' },
      },
    ];

    expect(statuses(pending, false)).toEqual(['pending']);
    expect(statuses(pending, true)).toEqual(['running']);
  });

  it('believes the exit record over the presence of a result', () => {
    // A failed command still returns a string, so a result is no evidence of
    // success. The exit record is.
    const parts: RunPartLike[] = [
      {
        type: 'tool-call',
        toolCallId: 'c1',
        toolName: 'mastra_workspace_execute_command',
        args: { command: 'false' },
        result: 'Exit code: 1',
      },
      { type: 'data', name: 'sandbox-exit', data: { exitCode: 1, success: false, toolCallId: 'c1' } },
    ];

    expect(statuses(parts)).toEqual(['failed']);
  });

  it('keeps an explicit tool error red', () => {
    const parts: RunPartLike[] = [{ type: 'tool-call', toolCallId: 'e', toolName: 't', isError: true, result: 'boom' }];
    expect(statuses(parts)).toEqual(['failed']);
  });

  it('treats a tool with no exit record and a result as succeeded', () => {
    const parts: RunPartLike[] = [
      {
        type: 'tool-call',
        toolCallId: 'r',
        toolName: 'mastra_workspace_read_file',
        args: { path: '/a' },
        result: 'ok',
      },
    ];
    expect(statuses(parts)).toEqual(['succeeded']);
  });
});

describe('activeToolLabel', () => {
  it('names the command being executed instead of blaming the model', () => {
    const parts: RunPartLike[] = [
      {
        type: 'tool-call',
        toolCallId: 'done',
        toolName: 'mastra_workspace_execute_command',
        args: { command: 'ls -la' },
        result: 'a\nb\n',
      },
      { type: 'data', name: 'sandbox-exit', data: { exitCode: 0, success: true, toolCallId: 'done' } },
      {
        type: 'tool-call',
        toolCallId: 'live',
        toolName: 'mastra_workspace_execute_command',
        args: { command: 'uv pip install pandas openpyxl 2>&1 | tail -5' },
      },
    ];

    expect(activeToolLabel(parts)).toBe('Running a command… uv pip install pandas openpyxl 2>&1 | tail -5');
  });

  it('names other tools by what they are doing and to what', () => {
    const parts: RunPartLike[] = [
      {
        type: 'tool-call',
        toolCallId: 'live',
        toolName: 'mastra_workspace_read_file',
        args: { path: '/uploads/a.csv' },
      },
    ];

    expect(activeToolLabel(parts)).toBe('Reading a file… /uploads/a.csv');
  });

  it('is null when every call has settled', () => {
    expect(activeToolLabel(persistedRun)).toBeNull();
  });
});

/**
 * A cold sandbox is 16 to 17 seconds from pod creation to Ready plus a
 * dependency install, and sandboxes are per conversation, so nearly every
 * document chat pays it. During that window "Running a command…" names
 * something that has not started.
 *
 * The danger is the opposite mistake. Only `execute_command`,
 * `get_process_output` and `kill_process` need a pod; every file tool goes over
 * WebDAV and never touches one. A slow `write_file` labelled as a pod start
 * sends the reader looking at the sandbox when the backend has died.
 */
describe('activeToolLabel while a sandbox is starting', () => {
  const starting = { message: 'Downloading the workspace image…', step: 5, totalSteps: 8, ready: false };
  const ready = { message: 'Workspace ready.', step: 8, totalSteps: 8, ready: true };

  const executing: RunPartLike[] = [
    {
      type: 'tool-call',
      toolCallId: 'live',
      toolName: 'mastra_workspace_execute_command',
      args: { command: 'uv pip install pandas' },
    },
  ];

  const writing: RunPartLike[] = [
    {
      type: 'tool-call',
      toolCallId: 'live',
      toolName: 'mastra_workspace_write_file',
      args: { path: '/workspace/analyze.py' },
    },
  ];

  it('says which startup step the sandbox is on', () => {
    expect(activeToolLabel(executing, starting)).toBe('Downloading the workspace image… step 5 of 8');
  });

  it('names the command again once the sandbox is ready', () => {
    expect(activeToolLabel(executing, ready)).toBe('Running a command… uv pip install pandas');
  });

  it('never blames the sandbox for a tool that does not use one', () => {
    expect(activeToolLabel(writing, starting)).toBe('Writing a file… /workspace/analyze.py');
  });

  it('falls back to the tool when no sandbox status is available', () => {
    expect(activeToolLabel(executing, null)).toBe('Running a command… uv pip install pandas');
  });
});

describe('isWaitingOnSandbox', () => {
  it('is true only for the tools that need a pod', () => {
    expect(
      isWaitingOnSandbox([
        { type: 'tool-call', toolCallId: 'live', toolName: 'mastra_workspace_execute_command', args: {} },
      ]),
    ).toBe(true);
    expect(
      isWaitingOnSandbox([
        { type: 'tool-call', toolCallId: 'live', toolName: 'mastra_workspace_write_file', args: {} },
      ]),
    ).toBe(false);
    expect(isWaitingOnSandbox(persistedRun)).toBe(false);
  });
});
