import { create } from "zustand";

export type UserPresenceStatus = "online" | "offline";

export interface UserPresence {
  userId: string;
  status: UserPresenceStatus;
  lastUpdated: number;
}

interface UserPresenceState {
  users: Record<string, UserPresence>;
  isConnected: boolean;
  lastSync: number | null;
  setUserStatus: (userId: string, status: UserPresenceStatus) => void;
  setBulkStatuses: (users: Array<{ userId: string; status: UserPresenceStatus }>) => void;
  setConnectionStatus: (connected: boolean) => void;
  reset: () => void;
}

const createUserPresence = (userId: string, status: UserPresenceStatus): UserPresence => ({
  userId,
  status,
  lastUpdated: Date.now(),
});

export const useUserStore = create<UserPresenceState>((set) => ({
  users: {},
  isConnected: false,
  lastSync: null,

  setUserStatus: (userId: string, status: UserPresenceStatus) =>
    set((state) => {
      const existing = state.users[userId];
      const nextPresence: UserPresence = existing
        ? { ...existing, status, lastUpdated: Date.now() }
        : createUserPresence(userId, status);

      return {
        ...state,
        users: {
          ...state.users,
          [userId]: nextPresence,
        },
      };
    }),

  setBulkStatuses: (users) =>
    set((state) => {
      const updatedUsers: Record<string, UserPresence> = { ...state.users };
      const now = Date.now();

      for (const { userId, status } of users) {
        const existing = updatedUsers[userId];
        updatedUsers[userId] = existing
          ? { ...existing, status, lastUpdated: now }
          : { userId, status, lastUpdated: now };
      }

      return {
        ...state,
        users: updatedUsers,
        lastSync: now,
      };
    }),

  setConnectionStatus: (connected: boolean) =>
    set((state) => ({
      ...state,
      isConnected: connected,
    })),

  reset: () =>
    set({
      users: {},
      isConnected: false,
      lastSync: null,
    }),
}));

export const getUserStatus = (userId: string): UserPresenceStatus | null => {
  const state = useUserStore.getState();
  const presence = state.users[userId];
  return presence ? presence.status : null;
};

export const getUserPresence = (userId: string): UserPresence | null => {
  const state = useUserStore.getState();
  return state.users[userId] ?? null;
};

export const getOnlineUsers = (): UserPresence[] => {
  const state = useUserStore.getState();
  return Object.values(state.users).filter((user) => user.status === "online");
};

export const getOfflineUsers = (): UserPresence[] => {
  const state = useUserStore.getState();
  return Object.values(state.users).filter((user) => user.status === "offline");
};

export const handlePresenceWebSocketEvent = (event: {
  type: string;
  payload?: any;
}): void => {
  const { type, payload } = event;

  if (!payload) return;

  switch (type) {
    case "presence:status":
    case "user:presence:update": {
      const { userId, status } = payload as {
        userId: string;
        status: UserPresenceStatus;
      };
      if (!userId || (status !== "online" && status !== "offline")) return;
      useUserStore.getState().setUserStatus(userId, status);
      break;
    }

    case "presence:bulk":
    case "user:presence:bulk": {
      const { users } = payload as {
        users: Array<{ userId: string; status: UserPresenceStatus }>;
      };
      if (!Array.isArray(users)) return;
      const validUsers = users.filter(
        (u) => u.userId && (u.status === "online" || u.status === "offline")
      );
      if (validUsers.length === 0) return;
      useUserStore.getState().setBulkStatuses(validUsers);
      break;
    }

    case "connection:open":
    case "ws:connected": {
      useUserStore.getState().setConnectionStatus(true);
      break;
    }

    case "connection:close":
    case "ws:disconnected": {
      useUserStore.getState().setConnectionStatus(false);
      break;
    }

    default:
      break;
  }
};