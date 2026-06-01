import type { Agent, AgentExecutionOptionsBase, PublicStructuredOutputOptions, ToolsInput } from '../../agent';
import type { MessageListInput } from '../../agent/message-list/types';
import type { MastraModelConfig } from '../../llm/model/shared.types';
import type { MastraMemory } from '../../memory';
import type { FullOutput, MastraModelOutput } from '../../stream/base/output';
import type { DynamicArgument } from '../../types';
import type { EventEmitter } from './events';
import type { HarnessMode } from './mode';

export type CloneSessionOptions = {
  sessionId?: string;
  threadId?: string;
  resourceId?: string;
  parentSessionId?: string;
  origin?: 'top-level' | 'subagent-tool';
  modeId?: string;
  mode?: HarnessMode;
  modelId?: string;
  title?: string;
  metadata?: Record<string, unknown>;
  messageLimit?: number;
};

export type AgentResult<OUTPUT = undefined> = FullOutput<OUTPUT>;
export type AgentStream<OUTPUT = undefined> = MastraModelOutput<OUTPUT>;

type MessageExecutionOptions<OUTPUT = undefined> = Pick<
  AgentExecutionOptionsBase<OUTPUT>,
  'abortSignal' | 'maxSteps' | 'onFinish' | 'onStepFinish' | 'prepareStep' | 'stopWhen'
>;

export type MessageOptions<OUTPUT = undefined> = MessageExecutionOptions<OUTPUT> & {
  content: MessageListInput;
  stream?: boolean;
  model?: DynamicArgument<MastraModelConfig>;
  instructions?: AgentExecutionOptionsBase<OUTPUT>['instructions'];
  structuredOutput?: PublicStructuredOutputOptions<OUTPUT extends {} ? OUTPUT : never>;
  additionalTools?: ToolsInput;
};

export type QueueOptions<OUTPUT = undefined> = Omit<MessageOptions<OUTPUT>, 'stream'>;

export type AgentResolver = (mode: HarnessMode) => Agent;

export interface SessionConfig {
  memory: MastraMemory | DynamicArgument<MastraMemory>;
  events: EventEmitter;
  getAgent: AgentResolver;
  // storage: HarnessStorage;
  /** Identifier of the Harness instance that owns this session. */
  ownerId: string;
  /** Initial record loaded under the lease. The Session takes ownership. */
  // record: SessionRecord;
  /** Lease TTL the Harness acquired the lease for. */
  // leaseExpiresAt: number;
  /** Durable event replay cursor seed from the previous live owner, if any. */
  // eventReplaySeed?: { epoch: string; nextSequence: number };
  id: string;
  resourceId: string;
  threadId: string;
  model: string;
  mode: HarnessMode;
  createdAt: Date;
  lastActivityAt: Date;
}

export type { SessionRecord } from '../../storage/domains/harness';
