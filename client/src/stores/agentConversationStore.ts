import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ToolExecution {
  id: string;
  tool: string;
  parameters: any;
  result?: any;
  success?: boolean;
  status: 'pending' | 'running' | 'complete' | 'error';
  metadata?: {
    executionTime?: number;
    filesChanged?: string[];
    commandOutput?: string;
  };
  error?: string;
}

interface ThinkingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  timestamp: Date;
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface Action {
  id: string;
  type: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed';
}

interface FileDiff {
  path: string;
  changes: string;
}

type WorkflowPhase = 
  | 'generating_features'
  | 'selecting_build_option'
  | 'building_design'
  | 'design_preview'
  | 'building_full'
  | 'mvp_complete'
  | 'extended_build'
  | 'complete';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  thinking?: ThinkingStep[];
  toolExecutions?: ToolExecution[];
  isStreaming?: boolean;
  type?: 'text' | 'workflow_features' | 'workflow_build_choice' | 'workflow_design' | 'workflow_mvp';
  workflowPhase?: WorkflowPhase;
  workflowPayload?: {
    featureList?: string[];
    taskList?: string[];
    designPreviewUrl?: string;
    buildChoice?: 'full' | 'design';
  };
  tasks?: Task[];
  actions?: Action[];
  checkpoint?: {
    id: string;
    name: string;
    diff: FileDiff[];
    rollbackAvailable: boolean;
  };
  metadata?: {
    model?: string;
    provider?: string;
    tokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    cost?: string;
    latency?: number;
    webSearchUsed?: boolean;
    extendedThinking?: boolean;
    cacheHit?: boolean;
    streamingDuration?: number;
    finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
    error?: boolean;
  };
}

interface ConversationState {
  messages: Record<number, Message[]>;
  lastSyncedAt: Record<number, number>;
}

interface AgentConversationStore extends ConversationState {
  addMessage: (conversationId: number, message: Message) => void;
  setMessages: (conversationId: number, messages: Message[]) => void;
  updateMessage: (conversationId: number, messageId: string, updates: Partial<Message>) => void;
  clearMessages: (conversationId: number) => void;
  getMessages: (conversationId: number) => Message[];
  setLastSyncedAt: (conversationId: number, timestamp: number) => void;
  getLastSyncedAt: (conversationId: number) => number | undefined;
  hasConversation: (conversationId: number) => boolean;
}

const DEFAULT_ASSISTANT_MESSAGE: Message = {
  id: '1',
  role: 'assistant',
  content: "Hi! I'm your AI assistant with extended thinking capabilities. I can help you build, debug, and improve your code with transparent reasoning. What would you like to create today?",
  timestamp: new Date()
};

export const useAgentConversationStore = create<AgentConversationStore>()(
  persist(
    (set, get) => ({
      messages: {},
      lastSyncedAt: {},

      addMessage: (conversationId: number, message: Message) => {
        set((state) => {
          const existingMessages = state.messages[conversationId] || [DEFAULT_ASSISTANT_MESSAGE];
          const messageWithDate = {
            ...message,
            timestamp: message.timestamp instanceof Date 
              ? message.timestamp 
              : new Date(message.timestamp)
          };
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...existingMessages, messageWithDate]
            }
          };
        });
      },

      setMessages: (conversationId: number, messages: Message[]) => {
        set((state) => {
          const normalizedMessages = messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp instanceof Date 
              ? msg.timestamp 
              : new Date(msg.timestamp)
          }));
          return {
            messages: {
              ...state.messages,
              [conversationId]: normalizedMessages.length > 0 ? normalizedMessages : [DEFAULT_ASSISTANT_MESSAGE]
            }
          };
        });
      },

      updateMessage: (conversationId: number, messageId: string, updates: Partial<Message>) => {
        set((state) => {
          const existingMessages = state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: existingMessages.map(msg => 
                msg.id === messageId 
                  ? { ...msg, ...updates }
                  : msg
              )
            }
          };
        });
      },

      clearMessages: (conversationId: number) => {
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: [DEFAULT_ASSISTANT_MESSAGE]
          },
          lastSyncedAt: {
            ...state.lastSyncedAt,
            [conversationId]: Date.now()
          }
        }));
      },

      getMessages: (conversationId: number) => {
        const state = get();
        return state.messages[conversationId] || [DEFAULT_ASSISTANT_MESSAGE];
      },

      setLastSyncedAt: (conversationId: number, timestamp: number) => {
        set((state) => ({
          lastSyncedAt: {
            ...state.lastSyncedAt,
            [conversationId]: timestamp
          }
        }));
      },

      getLastSyncedAt: (conversationId: number) => {
        return get().lastSyncedAt[conversationId];
      },

      hasConversation: (conversationId: number) => {
        return !!get().messages[conversationId];
      }
    }),
    {
      name: 'agent-conversation-storage',
      partialize: (state) => ({ 
        messages: state.messages,
        lastSyncedAt: state.lastSyncedAt
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          Object.keys(state.messages).forEach(key => {
            const conversationId = parseInt(key, 10);
            const messages = state.messages[conversationId];
            if (messages) {
              state.messages[conversationId] = messages.map(msg => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
              }));
            }
          });
          console.log('[AgentConversationStore] Rehydrated from localStorage');
        }
      }
    }
  )
);

export default useAgentConversationStore;
