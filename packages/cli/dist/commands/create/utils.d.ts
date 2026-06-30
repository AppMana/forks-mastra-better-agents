import type { LLMProvider } from '../init/utils.js';
export declare const createMastraProject: ({
  projectName: name,
  createVersionTag,
  timeout,
  llmProvider,
  llmApiKey,
  skills,
  mcpServer,
  observability,
  needsInteractive,
  onObservabilitySelected,
}: {
  projectName?: string;
  createVersionTag?: string;
  timeout?: number;
  llmProvider?: LLMProvider;
  llmApiKey?: string;
  skills?: string[];
  mcpServer?: string;
  observability?: boolean;
  needsInteractive?: boolean;
  onObservabilitySelected?: (event: {
    command?: 'create' | 'init';
    enabled: boolean;
    answer: 'yes' | 'no';
    selection_method: 'interactive';
  }) => void;
}) => Promise<{
  projectName: string;
  result:
    | {
        observability: boolean | undefined;
        observabilityToken: string | undefined;
        observabilityOrgId: string | undefined;
        observabilityOrgName: string | undefined;
        skills: string[] | undefined;
        mcpServer: import('../init/mcp-docs-server-install.js').Editor | undefined;
        directory: string;
        llmProvider: 'openai' | 'anthropic' | 'groq' | 'google' | 'cerebras' | 'mistral';
        llmApiKey: unknown;
        initGit: boolean;
      }
    | undefined;
}>;
//# sourceMappingURL=utils.d.ts.map
