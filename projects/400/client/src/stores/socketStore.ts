import { io, Socket } from "socket.io-client";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type SocketConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface SocketStoreState {
  socket: Socket | null;
  status: SocketConnectionStatus;
  lastError: string | null;
  isReconnecting: boolean;
  connect: (url?: string, options?: Partial<SocketOptions>) => void;
  disconnect: () => void;
  emit: <T = unknown>(event: string, payload?: T) => void;
  on: <T = unknown>(event: string, handler: (payload: T) => void) => void;
  off: (event: string, handler?: (...args: any[]) => void) => void;
}

export interface SocketOptions {
  auth?: Record<string, unknown>;
  query?: Record<string, string>;
  transports?: ("websocket" | "polling")[];
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  extraHeaders?: Record<string, string>;
}

let socketInstance: Socket | null = null;

const DEFAULT_SOCKET_URL =
  (typeof window !== "undefined" && (window as any).__SOCKET_IO_URL__) ||
  (typeof window !== "undefined" && window.location.origin) ||
  "";

const DEFAULT_OPTIONS: SocketOptions = {
  transports: ["websocket"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
};

const createSocket = (url: string, options?: Partial<SocketOptions>): Socket => {
  const mergedOptions: SocketOptions = {
    ...DEFAULT_OPTIONS,
    ...(options || {}),
  };

  const socket = io(url, {
    transports: mergedOptions.transports,
    auth: mergedOptions.auth,
    query: mergedOptions.query,
    autoConnect: mergedOptions.autoConnect,
    reconnection: mergedOptions.reconnection,
    reconnectionAttempts: mergedOptions.reconnectionAttempts,
    reconnectionDelay: mergedOptions.reconnectionDelay,
    reconnectionDelayMax: mergedOptions.reconnectionDelayMax,
    timeout: mergedOptions.timeout,
    extraHeaders: mergedOptions.extraHeaders,
  });

  return socket;
};

export const useSocketStore = create<SocketStoreState>()(
  devtools(
    (set, get) => ({
      socket: null,
      status: "disconnected",
      lastError: null,
      isReconnecting: false,

      connect: (url?: string, options?: Partial<SocketOptions>) => {
        const targetUrl = url || DEFAULT_SOCKET_URL;
        if (!targetUrl) {
          set({
            status: "error",
            lastError: "Socket URL is not defined",
          });
          return;
        }

        if (socketInstance) {
          socketInstance.disconnect();
          socketInstance = null;
        }

        set({
          status: "connecting",
          lastError: null,
          isReconnecting: false,
        });

        const socket = createSocket(targetUrl, options);
        socketInstance = socket;

        socket.on("connect", () => {
          if (socket !== socketInstance) return;
          set({
            socket,
            status: "connected",
            lastError: null,
            isReconnecting: false,
          });
        });

        socket.on("disconnect", (reason: string) => {
          if (socket !== socketInstance) return;
          const isReconnecting =
            reason === "io server disconnect" ||
            reason === "io client disconnect" ||
            reason === "transport close" ||
            reason === "transport error" ||
            reason === "ping timeout";

          set((state) => ({
            ...state,
            status: "disconnected",
            isReconnecting,
          }));
        });

        socket.on("connect_error", (error: Error) => {
          if (socket !== socketInstance) return;
          set({
            status: "error",
            lastError: error.message || "Connection error",
            isReconnecting: true,
          });
        });

        socket.on("error", (error: any) => {
          if (socket !== socketInstance) return;
          const message =
            typeof error === "string"
              ? error
              : error?.message || "Unknown socket error";
          set({
            status: "error",
            lastError: message,
          });
        });
      },

      disconnect: () => {
        const currentSocket = get().socket || socketInstance;
        if (currentSocket) {
          currentSocket.disconnect();
        }
        socketInstance = null;
        set({
          socket: null,
          status: "disconnected",
          isReconnecting: false,
        });
      },

      emit: <T = unknown>(event: string, payload?: T) => {
        const currentSocket = get().socket || socketInstance;
        if (!currentSocket || currentSocket.disconnected) {
          return;
        }
        if (payload !== undefined) {
          currentSocket.emit(event, payload);
        } else {
          currentSocket.emit(event);
        }
      },

      on: <T = unknown>(event: string, handler: (payload: T) => void) => {
        const currentSocket = get().socket || socketInstance;
        if (!currentSocket) {
          return;
        }
        currentSocket.on(event, handler as (...args: any[]) => void);
      },

      off: (event: string, handler?: (...args: any[]) => void) => {
        const currentSocket = get().socket || socketInstance;
        if (!currentSocket) {
          return;
        }
        if (handler) {
          currentSocket.off(event, handler);
        } else {
          currentSocket.removeAllListeners(event);
        }
      },
    }),
    {
      name: "socket-store",
    }
  )
);

export const getSocket = (): Socket | null => {
  const state = useSocketStore.getState();
  return state.socket || socketInstance;
};

export const getSocketStatus = (): SocketConnectionStatus => {
  return useSocketStore.getState().status;
};

export const initializeSocket = (url?: string, options?: Partial<SocketOptions>): void => {
  const state = useSocketStore.getState();
  if (state.status === "connected" || state.status === "connecting") {
    return;
  }
  state.connect(url, options);
};

export const teardownSocket = (): void => {
  const state = useSocketStore.getState();
  state.disconnect();
};