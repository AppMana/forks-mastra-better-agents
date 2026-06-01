import { randomUUID } from 'node:crypto';

import { RequestContext } from '@internal/core/request-context';
import type { Agent, AgentExecutionOptionsBase, ToolsInput } from '../../agent';
import type { MastraDBMessage } from '../../agent/message-list';
import type { MastraMemory, StorageThreadType } from '../../memory';
import type { DynamicArgument } from '../../types';
import type { EventEmitter } from './events';
import type { HarnessMode } from './mode';
import type {
  AgentResult,
  AgentStream,
  CloneSessionOptions,
  MessageOptions,
  QueueOptions,
  SessionConfig,
} from './session.types';

export class Session {
  /** Stable identity. Frozen at construction. */
  readonly #id: string;
  readonly #ownerId: string;
  readonly #resourceId: string;
  readonly #threadId: string;
  readonly #createdAt: Date;
  readonly #lastActivityAt: Date;
  readonly #memory: MastraMemory | DynamicArgument<MastraMemory>;
  readonly #events: EventEmitter;
  readonly #getAgent: (mode: HarnessMode) => Agent;
  #pendingQueue: Array<{
    options: QueueOptions;
    resolve: (result: AgentResult) => void;
    reject: (error: unknown) => void;
  }> = [];
  #draining = false;
  // readonly parentSessionId?: string;
  // readonly subagentDepth: number;

  #modelId: string;
  #mode: HarnessMode;

  constructor(config: SessionConfig) {
    this.#id = config.id;
    this.#ownerId = config.ownerId;
    this.#resourceId = config.resourceId;
    this.#threadId = config.threadId;
    this.#mode = config.mode;
    this.#modelId = config.model;
    this.#createdAt = config.createdAt;
    this.#lastActivityAt = config.lastActivityAt;
    this.#memory = config.memory;
    this.#events = config.events;
    this.#getAgent = config.getAgent;
  }

  get id(): string {
    return this.#id;
  }

  get ownerId(): string {
    return this.#ownerId;
  }

  get resourceId(): string {
    return this.#resourceId;
  }

  get threadId(): string {
    return this.#threadId;
  }

  get createdAt(): Date {
    return this.#createdAt;
  }

  async clone(opts: CloneSessionOptions = {}): Promise<Session> {
    const result = await (
      await this.#resolveMemory()
    ).cloneThread({
      sourceThreadId: this.#threadId,
      newThreadId: opts.threadId,
      resourceId: opts.resourceId ?? this.#resourceId,
      title: opts.title,
      metadata: opts.metadata,
      options: opts.messageLimit !== undefined ? { messageLimit: opts.messageLimit } : undefined,
    });

    const cloneId = opts.sessionId ?? randomUUID();
    const clone = new Session({
      id: cloneId,
      ownerId: this.#ownerId,
      threadId: result.thread.id,
      resourceId: result.thread.resourceId,
      mode: opts.mode ?? this.#mode,
      model: opts.modelId ?? this.#modelId,
      createdAt: result.thread.createdAt,
      lastActivityAt: result.thread.updatedAt,
      memory: this.#memory,
      events: this.#events.scoped({ sessionId: cloneId }),
      getAgent: this.#getAgent,
    });

    this.#events.emit({
      type: 'thread_cloned',
      threadId: clone.threadId,
      resourceId: clone.resourceId,
      sourceThreadId: this.#threadId,
      title: opts.title,
    });

    return clone;
  }

  async getThread(): Promise<StorageThreadType | null> {
    return (await this.#resolveMemory()).getThreadById({ threadId: this.#threadId });
  }

  async getMessages(): Promise<MastraDBMessage[]> {
    const result = await (
      await this.#resolveMemory()
    ).recall({ threadId: this.#threadId, resourceId: this.#resourceId });
    return result.messages;
  }

  async saveMessages(
    messages: MastraDBMessage[],
  ): Promise<{ messages: MastraDBMessage[]; usage?: { tokens: number } }> {
    return (await this.#resolveMemory()).saveMessages({ messages });
  }

  async sendMessage<OUTPUT = undefined>(
    options: MessageOptions<OUTPUT> & { stream: true },
  ): Promise<AgentStream<OUTPUT>>;
  async sendMessage<OUTPUT = undefined>(options: MessageOptions<OUTPUT>): Promise<AgentResult<OUTPUT>>;
  async sendMessage<OUTPUT = undefined>(
    options: MessageOptions<OUTPUT>,
  ): Promise<AgentResult<OUTPUT> | AgentStream<OUTPUT>> {
    const agent = this.#getAgent(this.#mode);
    const executionOptions = await this.#buildAgentExecutionOptions(options);

    this.#events.emit({ type: 'agent_start' });
    try {
      const result = options.stream
        ? await this.#streamAgent(agent, options.content, executionOptions)
        : await this.#generateAgent(agent, options.content, executionOptions);
      this.#events.emit({ type: 'agent_end', reason: 'complete' });
      return result;
    } catch (error) {
      this.#events.emit({
        type: 'agent_end',
        reason: options.abortSignal?.aborted ? 'aborted' : 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  queueMessage<OUTPUT = undefined>(options: QueueOptions<OUTPUT>): Promise<AgentResult<OUTPUT>> {
    return new Promise((resolve, reject) => {
      this.#pendingQueue.push({
        options: options as unknown as QueueOptions,
        resolve: resolve as (result: AgentResult) => void,
        reject,
      });
      void this.#drainQueue();
    });
  }

  getModelId(): string {
    return this.#modelId;
  }

  setModelId(modelId: string) {
    const previousModelId = this.#modelId;
    this.#modelId = modelId;
    if (modelId !== previousModelId) {
      this.#events.emit({ type: 'model_changed', modelId, previousModelId });
    }
  }

  getMode(): HarnessMode {
    return this.#mode;
  }

  setMode(mode: HarnessMode) {
    const previousModeId = this.#mode.id;
    this.#mode = mode;
    if (mode.id !== previousModeId) {
      this.#events.emit({ type: 'mode_changed', modeId: mode.id, previousModeId });
    }
  }

  async #streamAgent<OUTPUT>(
    agent: Agent,
    content: MessageOptions<OUTPUT>['content'],
    executionOptions: AgentExecutionOptionsBase<OUTPUT> & { model?: MessageOptions<OUTPUT>['model'] },
  ): Promise<AgentStream<OUTPUT>> {
    const stream = agent.stream.bind(agent) as unknown as (
      messages: MessageOptions<OUTPUT>['content'],
      options: AgentExecutionOptionsBase<OUTPUT> & {
        structuredOutput?: MessageOptions<OUTPUT>['structuredOutput'];
        model?: MessageOptions<OUTPUT>['model'];
      },
    ) => Promise<AgentStream<OUTPUT>>;
    return stream(content, executionOptions);
  }

  async #generateAgent<OUTPUT>(
    agent: Agent,
    content: MessageOptions<OUTPUT>['content'],
    executionOptions: AgentExecutionOptionsBase<OUTPUT> & { model?: MessageOptions<OUTPUT>['model'] },
  ): Promise<AgentResult<OUTPUT>> {
    const generate = agent.generate.bind(agent) as unknown as (
      messages: MessageOptions<OUTPUT>['content'],
      options: AgentExecutionOptionsBase<OUTPUT> & {
        structuredOutput?: MessageOptions<OUTPUT>['structuredOutput'];
        model?: MessageOptions<OUTPUT>['model'];
      },
    ) => Promise<AgentResult<OUTPUT>>;
    return generate(content, executionOptions);
  }

  async #buildAgentExecutionOptions<OUTPUT>(
    options: MessageOptions<OUTPUT>,
  ): Promise<AgentExecutionOptionsBase<OUTPUT> & { model?: MessageOptions<OUTPUT>['model'] }> {
    const toolsets = this.#buildToolsets(this.#mode, options.additionalTools);
    return {
      memory: { thread: this.#threadId, resource: this.#resourceId },
      requestContext: await this.#buildRequestContext(),
      instructions: options.instructions ?? this.#mode.instructions,
      model: options.model ?? this.#modelId,
      ...(toolsets ? { toolsets } : {}),
      ...(options.structuredOutput ? { structuredOutput: options.structuredOutput } : {}),
      ...(options.maxSteps !== undefined ? { maxSteps: options.maxSteps } : {}),
      ...(options.stopWhen !== undefined ? { stopWhen: options.stopWhen } : {}),
      ...(options.onStepFinish ? { onStepFinish: options.onStepFinish } : {}),
      ...(options.onFinish ? { onFinish: options.onFinish } : {}),
      ...(options.prepareStep ? { prepareStep: options.prepareStep } : {}),
      ...(options.abortSignal ? { abortSignal: options.abortSignal } : {}),
    };
  }

  #buildToolsets(mode: HarnessMode, callAdditional?: ToolsInput): Record<string, ToolsInput> | undefined {
    const toolsets: Record<string, ToolsInput> = {};
    if (mode.tools) toolsets[`mode:${mode.id}`] = mode.tools;
    if (mode.additionalTools) toolsets[`mode:${mode.id}:add`] = mode.additionalTools;
    if (callAdditional) toolsets['call:additional'] = callAdditional;
    return Object.keys(toolsets).length === 0 ? undefined : toolsets;
  }

  async #drainQueue(): Promise<void> {
    if (this.#draining) return;
    this.#draining = true;
    try {
      while (this.#pendingQueue.length > 0) {
        const item = this.#pendingQueue.shift();
        if (!item) continue;
        try {
          const result = await this.sendMessage(item.options);
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }
      }
    } finally {
      this.#draining = false;
      if (this.#pendingQueue.length > 0) void this.#drainQueue();
    }
  }

  async #buildRequestContext(requestContext?: RequestContext): Promise<RequestContext> {
    requestContext ??= new RequestContext();
    const harnessContext = {
      threadId: this.#threadId,
      resourceId: this.#resourceId,
      modeId: this.#mode.id,

      // harnessId: this.id,
      // state: this.getState(),
      // getState: () => this.getState(),
      // setState: updates => this.setState(updates),
      // updateState: updater => this.updateState(updater),
      // threadId: this.currentThreadId,
      // resourceId: this.resourceId,
      // modeId: this.currentModeId,
      // abortSignal: this.abortController?.signal,
      // workspace: this.workspace,
      // emitEvent: event => this.emit(event),
      // registerQuestion: params => this.registerQuestion(params),
      // registerPlanApproval: params => this.registerPlanApproval(params),
      // getSubagentModelId: params => this.getSubagentModelId(params),
    };

    requestContext.set('harness', harnessContext);

    // if (this.workspaceFn) {
    //   const resolved = await Promise.resolve(this.workspaceFn({ requestContext }));
    //   harnessContext.workspace = resolved;
    //   // Cache for getWorkspace() so callers outside request flow (e.g. /skills) can access it
    //   this.workspace = resolved;
    // }

    return requestContext;
  }

  async #resolveMemory(): Promise<MastraMemory> {
    const mem = this.#memory;
    if (!mem) {
      throw new Error('Memory is not configured on this Harness');
    }
    if (typeof mem !== 'function') {
      return mem;
    }
    const requestContext = await this.#buildRequestContext();
    const resolved = await mem({ requestContext });
    if (!resolved) {
      throw new Error('Dynamic memory factory returned empty value');
    }
    return resolved;
  }
}
