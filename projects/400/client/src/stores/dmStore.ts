import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DMParticipant {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
}

export interface DMMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isRead: boolean;
  isEdited?: boolean;
  attachments?: Array<{
    id: string;
    url: string;
    type: "image" | "file" | "video" | "audio" | "other";
    name?: string;
    size?: number;
  }>;
}

export interface DMConversation {
  id: string;
  participants: DMParticipant[];
  lastMessage?: DMMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  isMuted?: boolean;
  isArchived?: boolean;
}

interface DMStoreState {
  conversations: DMConversation[];
  selectedConversationId: string | null;
  isLoading: boolean;
  error: string | null;

  setConversations: (conversations: DMConversation[]) => void;
  upsertConversation: (conversation: DMConversation) => void;
  removeConversation: (conversationId: string) => void;

  setSelectedConversationId: (conversationId: string | null) => void;
  selectConversationByParticipantId: (participantId: string) => void;

  updateConversationLastMessage: (conversationId: string, message: DMMessage) => void;
  incrementUnreadCount: (conversationId: string) => void;
  resetUnreadCount: (conversationId: string) => void;

  setConversationMuted: (conversationId: string, isMuted: boolean) => void;
  setConversationArchived: (conversationId: string, isArchived: boolean) => void;

  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useDMStore = create<DMStoreState>()(
  persist(
    (set, get) => ({
      conversations: [],
      selectedConversationId: null,
      isLoading: false,
      error: null,

      setConversations: (conversations: DMConversation[]) => {
        set({ conversations });
      },

      upsertConversation: (conversation: DMConversation) => {
        set((state) => {
          const index = state.conversations.findIndex((c) => c.id === conversation.id);
          if (index === -1) {
            return { conversations: [conversation, ...state.conversations] };
          }
          const updated = [...state.conversations];
          updated[index] = {
            ...updated[index],
            ...conversation,
            participants: conversation.participants ?? updated[index].participants,
          };
          return { conversations: updated };
        });
      },

      removeConversation: (conversationId: string) => {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== conversationId);
          const selectedConversationId =
            state.selectedConversationId === conversationId ? null : state.selectedConversationId;
          return { conversations: filtered, selectedConversationId };
        });
      },

      setSelectedConversationId: (conversationId: string | null) => {
        set({ selectedConversationId: conversationId });
        if (conversationId) {
          get().resetUnreadCount(conversationId);
        }
      },

      selectConversationByParticipantId: (participantId: string) => {
        const { conversations } = get();
        const conversation = conversations.find((c) =>
          c.participants.some((p) => p.id === participantId)
        );
        if (conversation) {
          get().setSelectedConversationId(conversation.id);
        }
      },

      updateConversationLastMessage: (conversationId: string, message: DMMessage) => {
        set((state) => {
          const index = state.conversations.findIndex((c) => c.id === conversationId);
          if (index === -1) return state;

          const updatedConversation: DMConversation = {
            ...state.conversations[index],
            lastMessage: message,
            updatedAt: message.createdAt,
          };

          const remaining = state.conversations.filter((c) => c.id !== conversationId);
          return {
            conversations: [updatedConversation, ...remaining],
          };
        });
      },

      incrementUnreadCount: (conversationId: string) => {
        const { selectedConversationId } = get();
        if (selectedConversationId === conversationId) {
          return;
        }
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
          ),
        }));
      },

      resetUnreadCount: (conversationId: string) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c
          ),
        }));
      },

      setConversationMuted: (conversationId: string, isMuted: boolean) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, isMuted } : c
          ),
        }));
      },

      setConversationArchived: (conversationId: string, isArchived: boolean) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, isArchived } : c
          ),
        }));
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clear: () => {
        set({
          conversations: [],
          selectedConversationId: null,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: "dm-store",
      partialize: (state) => ({
        conversations: state.conversations,
        selectedConversationId: state.selectedConversationId,
      }),
    }
  )
);