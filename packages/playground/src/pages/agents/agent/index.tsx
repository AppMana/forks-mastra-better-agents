import { v4 as uuid } from '@lukeed/uuid';
import { PermissionDenied, SessionExpired, is401UnauthorizedError, is403ForbiddenError } from '@mastra/playground-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { AgentSidebar } from '@/domains/agents/agent-sidebar';
import { AgentChat } from '@/domains/agents/components/agent-chat';
import { AgentInformation } from '@/domains/agents/components/agent-information/agent-information';
import { AgentLayout } from '@/domains/agents/components/agent-layout';
import { BrowserViewPanel } from '@/domains/agents/components/browser-view';
import { ActivatedSkillsProvider } from '@/domains/agents/context/activated-skills-context';
import { AgentSettingsProvider } from '@/domains/agents/context/agent-context';
import { ObservationalMemoryProvider } from '@/domains/agents/context/agent-observational-memory-context';
import { WorkingMemoryProvider } from '@/domains/agents/context/agent-working-memory-context';
import { BrowserSessionProvider } from '@/domains/agents/context/browser-session-provider';
import { BrowserToolCallsProvider } from '@/domains/agents/context/browser-tool-calls-context';
import { useAgent } from '@/domains/agents/hooks/use-agent';
import { ThreadInputProvider } from '@/domains/conversation/context/ThreadInputContext';
import { useMemory, useThreads } from '@/domains/memory/hooks/use-memory';
import { TracingSettingsProvider } from '@/domains/observability/context/tracing-settings-context';
import { SchemaRequestContextProvider } from '@/domains/request-context/context/schema-request-context';

import type { AgentSettingsType } from '@/types';

const unreadStorageKey = (agentId: string) => `mastra:agent:${agentId}:unreadThreads`;

function readUnreadThreadIds(agentId: string): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(unreadStorageKey(agentId)) || '[]'));
  } catch {
    return new Set();
  }
}

function writeUnreadThreadIds(agentId: string, ids: Set<string>) {
  window.localStorage.setItem(unreadStorageKey(agentId), JSON.stringify([...ids]));
  window.dispatchEvent(new CustomEvent('mastra:unread-threads-changed', { detail: { agentId } }));
}

function Agent() {
  const { agentId, threadId } = useParams();
  const [searchParams] = useSearchParams();
  const { data: agent, isLoading: isAgentLoading, error } = useAgent(agentId!);
  const { data: memory } = useMemory(agentId!);
  const navigate = useNavigate();
  const isNewThread = threadId === 'new';
  const [unreadThreadIds, setUnreadThreadIds] = useState<Set<string>>(() =>
    agentId ? readUnreadThreadIds(agentId) : new Set(),
  );

  // Generate a stable thread ID for new threads. Regenerate when threadId
  // changes (e.g., clicking "New Chat" navigates back to /chat/new).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- threadId is intentional: we need a new UUID per thread
  const newThreadId = useMemo(() => uuid(), [threadId]);

  const hasMemory = Boolean(memory?.result);

  const {
    data: threads,
    isLoading: isThreadsLoading,
    refetch: refreshThreads,
  } = useThreads({ agentId: agentId!, isMemoryEnabled: hasMemory, resourceId: agentId! });

  const sidebarThreads = useMemo(
    () =>
      (threads || []).map(thread => ({
        ...thread,
        createdAt: new Date(thread.createdAt),
        updatedAt: new Date(thread.updatedAt),
      })),
    [threads],
  );

  useEffect(() => {
    if (!agentId) return;

    const syncUnreadThreads = () => setUnreadThreadIds(readUnreadThreadIds(agentId));
    window.addEventListener('storage', syncUnreadThreads);
    window.addEventListener('mastra:unread-threads-changed', syncUnreadThreads);
    syncUnreadThreads();

    return () => {
      window.removeEventListener('storage', syncUnreadThreads);
      window.removeEventListener('mastra:unread-threads-changed', syncUnreadThreads);
    };
  }, [agentId]);

  useEffect(() => {
    if (!agentId || !threadId || threadId === 'new') return;

    const ids = readUnreadThreadIds(agentId);
    if (!ids.delete(threadId)) return;

    writeUnreadThreadIds(agentId, ids);
    setUnreadThreadIds(ids);
  }, [agentId, threadId]);

  useEffect(() => {
    if (threadId) return;

    // Normalize /agents/:agentId to /agents/:agentId/chat/new
    void navigate(`/agents/${agentId}/chat/new`);
  }, [threadId, agentId, navigate]);

  const messageId = searchParams.get('messageId') ?? undefined;

  const defaultSettings = useMemo((): AgentSettingsType => {
    if (!agent) {
      return { modelSettings: {} };
    }

    const agentDefaultOptions = agent.defaultOptions as
      | {
          maxSteps?: number;
          modelSettings?: Record<string, unknown>;
          providerOptions?: AgentSettingsType['modelSettings']['providerOptions'];
        }
      | undefined;

    // Map AI SDK v5 names back to UI names (maxOutputTokens -> maxTokens)
    const { maxOutputTokens, ...restModelSettings } = (agentDefaultOptions?.modelSettings ?? {}) as {
      maxOutputTokens?: number;
      [key: string]: unknown;
    };

    return {
      modelSettings: {
        ...(restModelSettings as AgentSettingsType['modelSettings']),
        // Only include properties if they have actual values (to not override fallback defaults)
        ...(maxOutputTokens !== undefined && { maxTokens: maxOutputTokens }),
        ...(agentDefaultOptions?.maxSteps !== undefined && { maxSteps: agentDefaultOptions.maxSteps }),
        ...(agentDefaultOptions?.providerOptions !== undefined && {
          providerOptions: agentDefaultOptions.providerOptions,
        }),
      },
    };
  }, [agent]);

  const actualThreadId = isNewThread ? newThreadId : threadId;

  const handleRefreshThreadList = useCallback(async () => {
    if (!actualThreadId) return;

    await refreshThreads();

    const activePath = window.location.pathname;
    const currentThreadPath = `/agents/${agentId}/chat/${actualThreadId}`;

    if (isNewThread) {
      if (activePath === `/agents/${agentId}/chat/new`) {
        void navigate(currentThreadPath);
      } else if (agentId) {
        const ids = readUnreadThreadIds(agentId);
        ids.add(actualThreadId);
        writeUnreadThreadIds(agentId, ids);
      }
      return;
    }

    if (agentId && activePath !== currentThreadPath) {
      const ids = readUnreadThreadIds(agentId);
      ids.add(actualThreadId);
      writeUnreadThreadIds(agentId, ids);
    }
  }, [actualThreadId, agentId, isNewThread, navigate, refreshThreads]);

  // 401 check - session expired, needs re-authentication
  if (error && is401UnauthorizedError(error)) {
    return (
      <div className="flex h-full items-center justify-center">
        <SessionExpired />
      </div>
    );
  }

  // 403 check - permission denied for agents
  if (error && is403ForbiddenError(error)) {
    return (
      <div className="flex h-full items-center justify-center">
        <PermissionDenied resource="agents" />
      </div>
    );
  }

  if (isAgentLoading) {
    return null;
  }

  if (!agent) {
    return <div className="text-center py-4">Agent not found</div>;
  }

  if (!threadId) {
    return null;
  }

  return (
    <TracingSettingsProvider entityId={agentId!} entityType="agent">
      <AgentSettingsProvider agentId={agentId!} defaultSettings={defaultSettings}>
        <SchemaRequestContextProvider>
          <WorkingMemoryProvider agentId={agentId!} threadId={actualThreadId!} resourceId={agentId!}>
            <BrowserToolCallsProvider key={`browser-${agentId}-${actualThreadId}`}>
              <BrowserSessionProvider
                key={`session-${agentId}-${actualThreadId}`}
                agentId={agentId!}
                threadId={actualThreadId!}
                enabled={Boolean(agent?.browserTools?.length)}
              >
                <ThreadInputProvider>
                  <ObservationalMemoryProvider>
                    <ActivatedSkillsProvider key={`${agentId}-${actualThreadId}`}>
                      <AgentLayout
                        agentId={agentId!}
                        leftSlot={
                          hasMemory && (
                            <AgentSidebar
                              agentId={agentId!}
                              threadId={actualThreadId!}
                              threads={sidebarThreads}
                              isLoading={isThreadsLoading}
                              unreadThreadIds={unreadThreadIds}
                            />
                          )
                        }
                        browserOverlay={<BrowserViewPanel />}
                        rightSlot={<AgentInformation agentId={agentId!} threadId={actualThreadId!} />}
                      >
                        <AgentChat
                          key={actualThreadId!}
                          agentId={agentId!}
                          agentName={agent?.name}
                          modelVersion={agent?.modelVersion}
                          threadId={actualThreadId!}
                          memory={hasMemory}
                          refreshThreadList={handleRefreshThreadList}
                          modelList={agent?.modelList}
                          messageId={messageId}
                          isNewThread={isNewThread}
                        />
                      </AgentLayout>
                    </ActivatedSkillsProvider>
                  </ObservationalMemoryProvider>
                </ThreadInputProvider>
              </BrowserSessionProvider>
            </BrowserToolCallsProvider>
          </WorkingMemoryProvider>
        </SchemaRequestContextProvider>
      </AgentSettingsProvider>
    </TracingSettingsProvider>
  );
}

export default Agent;
