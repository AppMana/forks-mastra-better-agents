import type { Command as CommanderCommand } from 'commander';
import type { ApiGlobalOptions } from './target.js';
import type { ApiCommandDescriptor } from './types.js';
export declare const API_COMMANDS: Record<string, ApiCommandDescriptor>;
export declare function registerApiCommand(program: CommanderCommand): void;
/**
 * Executes a descriptor-backed API command and writes a machine-readable JSON result.
 *
 * @param descriptor - Command metadata built from the Commander tree and generated route metadata.
 * @param positionalValues - Identity argument values captured from Commander, in descriptor order.
 * @param inputText - Optional inline JSON argument provided by the user.
 * @param options - Global `mastra api` flags such as target URL, headers, timeout, schema, and pretty output.
 */
export declare function executeDescriptor(
  descriptor: ApiCommandDescriptor,
  positionalValues: string[],
  inputText: string | undefined,
  options: ApiGlobalOptions & {
    verbose?: boolean;
  },
): Promise<void>;
//# sourceMappingURL=index.d.ts.map
