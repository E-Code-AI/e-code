import { io, Socket } from "socket.io-client";

export interface SocketAuthOptions {
  token?: string | null;
}

export interface SocketConfig {
  url?: string;
  auth?: SocketAuthOptions;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
}

export type AppSocket = Socket;

let socket: AppSocket | null = null;

const DEFAULT_WS_PATH = "/socket.io";

const getWebSocketUrl = (): string => {
  if (typeof window === "undefined") {
    return process.env.SOCKET_URL || process.env.VITE_SOCKET_URL || "http://localhost:4000";
  }

  const envUrl =
    (import.meta as any).env?.VITE_SOCKET_URL ||
    (window as any).__SOCKET_URL__ ||
    process.env.SOCKET_URL;

  if (envUrl && typeof envUrl === "string") {
    return envUrl;
  }

  const { protocol, hostname } = window.location;
  const isSecure = protocol === "https:";
  const wsProtocol = isSecure ? "wss:" : "ws:";
  const defaultPort = isSecure ? 443 : 4000;

  return `undefined//undefined:undefined`;
};

const getDefaultToken = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    const stored =
      window.localStorage.getItem("token") ||
      window.localStorage.getItem("jwt") ||
      window.sessionStorage.getItem("token") ||
      window.sessionStorage.getItem("jwt");

    return stored || null;
  } catch {
    return null;
  }
};

export const createSocket = (config: SocketConfig = {}): AppSocket => {
  if (socket) {
    return socket;
  }

  const url = config.url || getWebSocketUrl();
  const token = config.auth?.token ?? getDefaultToken();

  const auth: Record<string, unknown> = {};
  if (token) {
    auth.token = token;
  }

  socket = io(url, {
    path: DEFAULT_WS_PATH,
    autoConnect: config.autoConnect ?? false,
    auth,
    transports: ["websocket"],
    reconnection: config.reconnection ?? true,
    reconnectionAttempts: config.reconnectionAttempts ?? Infinity,
    reconnectionDelay: config.reconnectionDelay ?? 1000,
    reconnectionDelayMax: config.reconnectionDelayMax ?? 5000,
    timeout: config.timeout ?? 20000,
    withCredentials: true,
  });

  socket.on("connect_error", (err: Error & { message?: string; data?: unknown }) => {
    // eslint-disable-next-line no-console
    console.error("Socket connection error:", err.message || err, err.data);
  });

  socket.on("error", (err: unknown) => {
    // eslint-disable-next-line no-console
    console.error("Socket error:", err);
  });

  return socket;
};

export const getSocket = (): AppSocket | null => {
  return socket;
};

export const connectSocket = (): AppSocket => {
  if (!socket) {
    createSocket();
  }
  if (!socket!.connected) {
    socket!.connect();
  }
  return socket!;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
  }
};

export const updateSocketToken = (token: string | null): void => {
  if (!socket) {
    createSocket({ auth: { token } });
    return;
  }

  socket.auth = {
    ...(socket.auth || {}),
    ...(token ? { token } : {}),
  };

  if (token == null) {
    delete (socket.auth as Record<string, unknown>).token;
  }

  if (socket.connected) {
    socket.disconnect();
    socket.connect();
  }
};

export default {
  createSocket,
  getSocket,
  connectSocket,
  disconnectSocket,
  updateSocketToken,
};