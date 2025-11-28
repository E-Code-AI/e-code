/**
 * Hook for real-time runtime logs via WebSocket
 * Connects to /api/runtime/logs/ws for live stdout/stderr streaming
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface RuntimeLogEntry {
  type: 'stdout' | 'stderr' | 'system' | 'exit';
  content: string;
  timestamp: number;
  executionId?: string;
  exitCode?: number;
  executionTime?: number;
}

export interface UseRuntimeLogsOptions {
  projectId: string | number;
  executionId?: string;
  enabled?: boolean;
  onLog?: (log: RuntimeLogEntry) => void;
  onExit?: (exitCode: number, executionTime: number) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface UseRuntimeLogsResult {
  logs: RuntimeLogEntry[];
  isConnected: boolean;
  isComplete: boolean;
  exitCode: number | null;
  executionTime: number | null;
  clearLogs: () => void;
  connect: (executionId?: string) => void;
  disconnect: () => void;
}

export function useRuntimeLogs(options: UseRuntimeLogsOptions): UseRuntimeLogsResult {
  const {
    projectId,
    executionId: initialExecutionId,
    enabled = true,
    onLog,
    onExit,
    onError,
    onConnect,
    onDisconnect,
  } = options;

  const [logs, setLogs] = useState<RuntimeLogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const executionIdRef = useRef<string | undefined>(initialExecutionId);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setIsComplete(false);
    setExitCode(null);
    setExecutionTime(null);
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback((newExecutionId?: string) => {
    if (newExecutionId) {
      executionIdRef.current = newExecutionId;
    }

    disconnect();
    clearLogs();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/runtime/logs/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      onConnect?.();

      ws.send(JSON.stringify({
        type: 'subscribe',
        projectId: String(projectId),
        executionId: executionIdRef.current,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'subscribed') {
          return;
        }
        
        if (data.type === 'log' || data.type === 'output') {
          const logEntry: RuntimeLogEntry = {
            type: data.logType || 'stdout',
            content: data.content || data.data || '',
            timestamp: data.timestamp || Date.now(),
            executionId: data.executionId,
          };
          
          setLogs(prev => [...prev, logEntry]);
          onLog?.(logEntry);
        }
        
        if (data.type === 'exit') {
          const exitEntry: RuntimeLogEntry = {
            type: 'exit',
            content: `Process exited with code ${data.exitCode} (${data.executionTime}ms)`,
            timestamp: data.timestamp || Date.now(),
            executionId: data.executionId,
            exitCode: data.exitCode,
            executionTime: data.executionTime,
          };
          
          setLogs(prev => [...prev, exitEntry]);
          setIsComplete(true);
          setExitCode(data.exitCode);
          setExecutionTime(data.executionTime);
          onExit?.(data.exitCode, data.executionTime);
        }

        if (data.type === 'error') {
          const errorEntry: RuntimeLogEntry = {
            type: 'stderr',
            content: data.message || 'Unknown error',
            timestamp: Date.now(),
          };
          setLogs(prev => [...prev, errorEntry]);
        }
      } catch (err) {
        console.error('[RuntimeLogs] Failed to parse message:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('[RuntimeLogs] WebSocket error:', event);
      onError?.(event);
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      onDisconnect?.();
    };
  }, [projectId, disconnect, clearLogs, onConnect, onLog, onExit, onError, onDisconnect]);

  useEffect(() => {
    executionIdRef.current = initialExecutionId;
  }, [initialExecutionId]);

  useEffect(() => {
    if (enabled && initialExecutionId) {
      connect(initialExecutionId);
    }

    return () => {
      disconnect();
    };
  }, [enabled, initialExecutionId, connect, disconnect]);

  return {
    logs,
    isConnected,
    isComplete,
    exitCode,
    executionTime,
    clearLogs,
    connect,
    disconnect,
  };
}
