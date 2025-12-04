import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export type ChannelId = string;

export interface Channel {
  id: ChannelId;
  name: string;
  description?: string;
  isPrivate?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: unknown;
}

export interface ChannelState {
  channels: Channel[];
  selectedChannelId: ChannelId | null;
  isLoading: boolean;
  error: string | null;

  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: ChannelId, updates: Partial<Channel>) => void;
  removeChannel: (channelId: ChannelId) => void;

  selectChannel: (channelId: ChannelId | null) => void;
  clearSelection: () => void;

  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: Pick<
  ChannelState,
  "channels" | "selectedChannelId" | "isLoading" | "error"
> = {
  channels: [],
  selectedChannelId: null,
  isLoading: false,
  error: null,
};

export const useChannelStore = create<ChannelState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setChannels: (channels: Channel[]) => {
          set(
            () => ({
              channels,
              // Keep selectedChannelId only if it still exists in the new list
              selectedChannelId: channels.some(
                (c) => c.id === get().selectedChannelId
              )
                ? get().selectedChannelId
                : channels[0]?.id ?? null,
              error: null,
            }),
            false,
            "channel/setChannels"
          );
        },

        addChannel: (channel: Channel) => {
          set(
            (state) => {
              const exists = state.channels.some((c) => c.id === channel.id);
              const channels = exists
                ? state.channels.map((c) => (c.id === channel.id ? channel : c))
                : [...state.channels, channel];

              return {
                channels,
                selectedChannelId:
                  state.selectedChannelId ?? channel.id ?? null,
                error: null,
              };
            },
            false,
            "channel/addChannel"
          );
        },

        updateChannel: (channelId: ChannelId, updates: Partial<Channel>) => {
          set(
            (state) => ({
              channels: state.channels.map((channel) =>
                channel.id === channelId ? { ...channel, ...updates } : channel
              ),
            }),
            false,
            "channel/updateChannel"
          );
        },

        removeChannel: (channelId: ChannelId) => {
          set(
            (state) => {
              const filtered = state.channels.filter(
                (channel) => channel.id !== channelId
              );
              const isRemovingSelected = state.selectedChannelId === channelId;

              return {
                channels: filtered,
                selectedChannelId: isRemovingSelected
                  ? filtered[0]?.id ?? null
                  : state.selectedChannelId,
              };
            },
            false,
            "channel/removeChannel"
          );
        },

        selectChannel: (channelId: ChannelId | null) => {
          set(
            (state) => {
              if (channelId === null) {
                return { selectedChannelId: null };
              }

              const exists = state.channels.some(
                (channel) => channel.id === channelId
              );
              return {
                selectedChannelId: exists ? channelId : state.selectedChannelId,
              };
            },
            false,
            "channel/selectChannel"
          );
        },

        clearSelection: () => {
          set(
            () => ({ selectedChannelId: null }),
            false,
            "channel/clearSelection"
          );
        },

        setLoading: (isLoading: boolean) => {
          set(
            () => ({ isLoading }),
            false,
            "channel/setLoading"
          );
        },

        setError: (error: string | null) => {
          set(
            () => ({ error }),
            false,
            "channel/setError"
          );
        },

        reset: () => {
          set(
            () => ({ ...initialState }),
            false,
            "channel/reset"
          );
        },
      }),
      {
        name: "channel-store",
        partialize: (state) => ({
          channels: state.channels,
          selectedChannelId: state.selectedChannelId,
        }),
        version: 1,
        migrate: (persistedState: unknown, version: number) => {
          if (!persistedState || typeof persistedState !== "object") {
            return initialState;
          }

          if (version === 0) {
            return {
              ...initialState,
              ...(persistedState as Partial<ChannelState>),
            };
          }

          return {
            ...initialState,
            ...(persistedState as Partial<ChannelState>),
          };
        },
      }
    ),
    {
      name: "ChannelStore",
      enabled: process.env.NODE_ENV !== "production",
    }
  )
);

export const selectChannels = (state: ChannelState): Channel[] =>
  state.channels;

export const selectSelectedChannelId = (
  state: ChannelState
): ChannelId | null => state.selectedChannelId;

export const selectSelectedChannel = (
  state: ChannelState
): Channel | undefined =>
  state.channels.find((channel) => channel.id === state.selectedChannelId);

export const selectIsChannelLoading = (state: ChannelState): boolean =>
  state.isLoading;

export const selectChannelError = (state: ChannelState): string | null =>
  state.error;