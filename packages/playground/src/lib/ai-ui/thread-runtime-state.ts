import { createContext, useContext } from 'react';

export type PendingSignalMessage = {
  id: string;
  preview: string;
};

export type ThreadRuntimeState = {
  /**
   * The conversation on screen. Server-side state that belongs to a run — the
   * workspace pod above all — is addressed by it, and the components that show
   * that state are nowhere near the route params.
   */
  threadId?: string;
  isStreaming: boolean;
  canSendWhileStreaming: boolean;
  cancelStream: () => void | Promise<void>;
  pendingSignals: PendingSignalMessage[];
  hasPendingMessages: boolean;
};

const ThreadRuntimeStateContext = createContext<ThreadRuntimeState>({
  isStreaming: false,
  canSendWhileStreaming: false,
  cancelStream: () => {},
  pendingSignals: [],
  hasPendingMessages: false,
});

export const ThreadRuntimeStateProvider = ThreadRuntimeStateContext.Provider;

export const useThreadRuntimeState = () => useContext(ThreadRuntimeStateContext);
