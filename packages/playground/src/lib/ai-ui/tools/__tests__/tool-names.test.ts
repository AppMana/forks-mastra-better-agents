import { describe, expect, it } from 'vitest';

import { isFileContentTool } from '../badges/file-content';
import { canonicalToolName, friendlyToolName } from '../tool-names';
import { WORKSPACE_TOOLS } from '@/domains/workspace/constants';

/**
 * A deployment renames workspace tools when it registers them
 * (`{ name: 'execute_command' }`), and core streams the call under that name.
 * Every renderer that recognised a tool by its `mastra_workspace_*` constant
 * therefore stopped recognising the real traffic: a write rendered as generic
 * JSON arguments, a command rendered without its terminal.
 */
describe('canonicalToolName', () => {
  it('leaves a prefixed workspace tool alone', () => {
    expect(canonicalToolName(WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND)).toBe(WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND);
  });

  it('maps a tool exposed without the prefix back onto its constant', () => {
    expect(canonicalToolName('execute_command')).toBe(WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND);
    expect(canonicalToolName('write_file')).toBe(WORKSPACE_TOOLS.FILESYSTEM.WRITE_FILE);
    expect(canonicalToolName('list_files')).toBe(WORKSPACE_TOOLS.FILESYSTEM.LIST_FILES);
  });

  it('maps a renamed tool that is not just the prefix dropped', () => {
    expect(canonicalToolName('grep_files')).toBe(WORKSPACE_TOOLS.FILESYSTEM.GREP);
  });

  it('leaves tools that are not workspace tools untouched', () => {
    expect(canonicalToolName('execute_typescript')).toBe('execute_typescript');
    expect(canonicalToolName(undefined)).toBe('');
  });

  it('routes a renamed file tool to the file preview', () => {
    expect(isFileContentTool('write_file')).toBe(true);
    expect(isFileContentTool('edit_file')).toBe(true);
    expect(isFileContentTool('list_files')).toBe(false);
  });
});

describe('friendlyToolName', () => {
  it('titles workspace tools, prefixed or renamed', () => {
    expect(friendlyToolName(WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND)).toBe('Running a command');
    expect(friendlyToolName('execute_command')).toBe('Running a command');
    expect(friendlyToolName('write_file')).toBe('Writing a file');
    expect(friendlyToolName('get_process_output')).toBe('Checking command output');
    expect(friendlyToolName('kill_process')).toBe('Stopping a command');
  });

  it('gives every workspace tool a title rather than an operation id', () => {
    const everyTool = [
      ...Object.values(WORKSPACE_TOOLS.FILESYSTEM),
      ...Object.values(WORKSPACE_TOOLS.SANDBOX),
      ...Object.values(WORKSPACE_TOOLS.SEARCH),
      ...Object.values(WORKSPACE_TOOLS.LSP),
    ];
    for (const tool of everyTool) {
      const title = friendlyToolName(tool);
      expect(title, tool).not.toContain('_');
      expect(title[0], tool).toBe(title[0].toUpperCase());
    }
  });

  it('reads an unknown snake_case tool as a sentence', () => {
    expect(friendlyToolName('execute_typescript')).toBe('Execute typescript');
  });

  it('leaves a single-word tool id alone', () => {
    expect(friendlyToolName('skill')).toBe('skill');
  });
});
