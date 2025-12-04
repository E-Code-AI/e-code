import { useContext, useEffect, useRef, useCallback } from "react";
import type { MutableRefObject } from "react";
import type { Socket } from "socket.io-client";
import { SocketContext } from "../context/SocketContext";

type EventHandler<T = any> = (payload: T) => void;

interface UseSocketOptions {
  /**
   * Automatically connect the socket if it's currently disconnected.
   * Defaults to true.
   */
  autoConnect?: boolean;
  /**
   * Automatically disconnect the socket when the component using this hook unmounts.
   * Defaults to false.
   */
  disconnectOnUnmount?: boolean;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  on: <T = any>(event: string, handler: EventHandler<T>) => void;
  off: <T = any>(event: string, handler?: EventHandler<T>) => void;
  emit: <T = any>(event: string, payload?: T, callback?: (response: any) => void) => void;
  once: <T = any>(event: string, handler: EventHandler<T>) => void;
  removeAllListeners: (event?: string) => void;
}

/**
 * Custom hook to access the shared Socket.IO instance and manage event listeners.
 */
export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { autoConnect = true, disconnectOnUnmount = false } = options;
  const socket = useContext(SocketContext);
  const isConnected = !!socket && socket.connected;

  const handlersRef: MutableRefObject<Map<string, Set<EventHandler>>> = useRef(
    new Map()
  );

  const safeSocket = socket ?? null;

  const on = useCallback(
    <T = any>(event: string, handler: EventHandler<T>): void => {
      if (!safeSocket) return;

      let eventHandlers = handlersRef.current.get(event);
      if (!eventHandlers) {
        eventHandlers = new Set();
        handlersRef.current.set(event, eventHandlers);
      }

      if (!eventHandlers.has(handler)) {
        eventHandlers.add(handler);
        safeSocket.on(event, handler as EventHandler);
      }
    },
    [safeSocket]
  );

  const off = useCallback(
    <T = any>(event: string, handler?: EventHandler<T>): void => {
      if (!safeSocket) return;

      const eventHandlers = handlersRef.current.get(event);
      if (!eventHandlers || eventHandlers.size === 0) {
        if (!handler) {
          safeSocket.removeAllListeners(event);
        } else {
          safeSocket.off(event, handler as EventHandler);
        }
        return;
      }

      if (handler) {
        if (eventHandlers.has(handler)) {
          eventHandlers.delete(handler);
          safeSocket.off(event, handler as EventHandler);
        }
      } else {
        eventHandlers.forEach((storedHandler) => {
          safeSocket.off(event, storedHandler);
        });
        eventHandlers.clear();
      }
    },
    [safeSocket]
  );

  const once = useCallback(
    <T = any>(event: string, handler: EventHandler<T>): void => {
      if (!safeSocket) return;
      safeSocket.once(event, handler as EventHandler);
    },
    [safeSocket]
  );

  const emit = useCallback(
    <T = any>(
      event: string,
      payload?: T,
      callback?: (response: any) => void
    ): void => {
      if (!safeSocket) return;
      if (callback) {
        safeSocket.emit(event, payload, callback);
      } else if (typeof payload !== "undefined") {
        safeSocket.emit(event, payload);
      } else {
        safeSocket.emit(event);
      }
    },
    [safeSocket]
  );

  const removeAllListeners = useCallback(
    (event?: string): void => {
      if (!safeSocket) return;

      if (typeof event === "string") {
        const eventHandlers = handlersRef.current.get(event);
        if (eventHandlers) {
          eventHandlers.forEach((handler) => {
            safeSocket.off(event, handler);
          });
          handlersRef.current.delete(event);
        }
        safeSocket.removeAllListeners(event);
      } else {
        handlersRef.current.forEach((eventHandlers, evt) => {
          eventHandlers.forEach((handler) => {
            safeSocket.off(evt, handler);
          });
        });
        handlersRef.current.clear();
        safeSocket.removeAllListeners();
      }
    },
    [safeSocket]
  );

  useEffect(() => {
    if (!safeSocket) return;

    if (autoConnect && !safeSocket.connected) {
      safeSocket.connect();
    }

    return () => {
      // Clean up all tracked listeners for this hook instance
      handlersRef.current.forEach((eventHandlers, event) => {
        eventHandlers.forEach((handler) => {
          safeSocket.off(event, handler);
        });
      });
      handlersRef.current.clear();

      if (disconnectOnUnmount) {
        safeSocket.disconnect();
      }
    };
  }, [safeSocket, autoConnect, disconnectOnUnmount]);

  return {
    socket: safeSocket,
    isConnected,
    on,
    off,
    emit,
    once,
    removeAllListeners,
  };
}

export default useSocket;