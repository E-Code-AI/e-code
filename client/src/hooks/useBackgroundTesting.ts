/**
 * Background Testing WebSocket Hook
 * Provides real-time test execution updates via WebSocket
 * with JWT authentication and project subscription
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { apiRequest } from '@/lib/queryClient';

export interface TestFailure {
  test: string;
  error: string;
  screenshot?: string;
}

export interface TestResults {
  passed: boolean;
  total: number;
  failures: TestFailure[];
  pageLoadPassed: boolean;
  noConsoleErrors: boolean;
  clickableElementsPassed: boolean;
  formsSubmitPassed: boolean;
}

export interface TestJob {
  projectId: number;
  changedFiles: string[];
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  results?: TestResults;
}

export type TestEventType = 
  | 'test:queued' 
  | 'test:started' 
  | 'test:completed' 
  | 'test:failed' 
  | 'test:agent-notification';

export interface TestEvent {
  type: TestEventType;
  projectId: number;
  job?: TestJob;
  results?: TestResults;
  error?: any;
  message?: string;
  failures?: TestFailure[];
  timestamp: string;
}

interface UseBackgroundTestingOptions {
  projectId: number;
  enabled?: boolean;
  onEvent?: (event: TestEvent) => void;
}

interface UseBackgroundTestingReturn {
  isConnected: boolean;
  isAuthenticated: boolean;
  isSubscribed: boolean;
  connectionError: string | null;
  testQueue: TestJob[];
  runningTests: TestJob[];
  completedTests: TestJob[];
  failedTests: TestJob[];
  currentStatus: TestJob | null;
  rerunTests: () => Promise<void>;
  clearResults: () => void;
  getTestStatus: () => Promise<void>;
}

export function useBackgroundTesting({
  projectId,
  enabled = true,
  onEvent
}: UseBackgroundTestingOptions): UseBackgroundTestingReturn {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);
  const maxReconnectAttempts = 5;
  
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const [testQueue, setTestQueue] = useState<TestJob[]>([]);
  const [runningTests, setRunningTests] = useState<TestJob[]>([]);
  const [completedTests, setCompletedTests] = useState<TestJob[]>([]);
  const [failedTests, setFailedTests] = useState<TestJob[]>([]);
  const [currentStatus, setCurrentStatus] = useState<TestJob | null>(null);

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const clearResults = useCallback(() => {
    setTestQueue([]);
    setRunningTests([]);
    setCompletedTests([]);
    setFailedTests([]);
    setCurrentStatus(null);
  }, []);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await apiRequest<{ token: string }>('GET', '/api/auth/ws-token');
      return response?.token || null;
    } catch (error) {
      console.error('[BackgroundTesting] Failed to get auth token:', error);
      return null;
    }
  }, []);

  const cleanupWebSocket = useCallback((ws: WebSocket | null) => {
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, 'Component unmounting');
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!isMountedRef.current) {
      console.log('[BackgroundTesting] Skipping connection - component unmounted');
      return;
    }

    if (!enabled || !user || !projectId) {
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/testing`;
      
      console.log('[BackgroundTesting] Connecting to', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        if (!isMountedRef.current) {
          cleanupWebSocket(ws);
          return;
        }

        console.log('[BackgroundTesting] WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;

        const token = await getAuthToken();
        if (!isMountedRef.current) {
          cleanupWebSocket(ws);
          return;
        }

        if (token) {
          ws.send(JSON.stringify({
            type: 'auth',
            token
          }));
        } else {
          console.error('[BackgroundTesting] No auth token available');
          setConnectionError('Authentication token not available');
        }
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const message = JSON.parse(event.data);
          console.log('[BackgroundTesting] Received:', message.type);

          switch (message.type) {
            case 'connected':
              console.log('[BackgroundTesting] Server confirmed connection');
              break;

            case 'auth-success':
              console.log('[BackgroundTesting] Authentication successful');
              setIsAuthenticated(true);
              ws.send(JSON.stringify({
                type: 'subscribe',
                projectId
              }));
              break;

            case 'auth-failed':
              console.error('[BackgroundTesting] Authentication failed:', message.message);
              setConnectionError(message.message || 'Authentication failed');
              setIsAuthenticated(false);
              break;

            case 'subscribed':
              console.log('[BackgroundTesting] Subscribed to project', message.projectId);
              setIsSubscribed(true);
              break;

            case 'status':
              if (message.status) {
                setCurrentStatus(message.status);
              }
              break;

            case 'test:queued': {
              const job = message.data as TestJob;
              setTestQueue(prev => [...prev.filter(j => j.projectId !== job.projectId), job]);
              onEventRef.current?.({ 
                type: 'test:queued', 
                projectId: job.projectId, 
                job, 
                timestamp: message.timestamp 
              });
              break;
            }

            case 'test:started': {
              const job = message.data as TestJob;
              setTestQueue(prev => prev.filter(j => j.projectId !== job.projectId));
              setRunningTests(prev => [...prev.filter(j => j.projectId !== job.projectId), job]);
              onEventRef.current?.({ 
                type: 'test:started', 
                projectId: job.projectId, 
                job, 
                timestamp: message.timestamp 
              });
              break;
            }

            case 'test:completed': {
              const { job, results } = message.data;
              setRunningTests(prev => prev.filter(j => j.projectId !== job.projectId));
              setCompletedTests(prev => [...prev, { ...job, results }]);
              setCurrentStatus({ ...job, results });
              onEventRef.current?.({ 
                type: 'test:completed', 
                projectId: job.projectId, 
                job, 
                results, 
                timestamp: message.timestamp 
              });
              break;
            }

            case 'test:failed': {
              const { job, error } = message.data;
              setRunningTests(prev => prev.filter(j => j.projectId !== job.projectId));
              setFailedTests(prev => [...prev, job]);
              setCurrentStatus(job);
              onEventRef.current?.({ 
                type: 'test:failed', 
                projectId: job.projectId, 
                job, 
                error, 
                timestamp: message.timestamp 
              });
              break;
            }

            case 'test:agent-notification': {
              const { projectId: pId, message: msg, failures } = message.data;
              onEventRef.current?.({ 
                type: 'test:agent-notification', 
                projectId: pId, 
                message: msg, 
                failures, 
                timestamp: message.timestamp 
              });
              break;
            }

            case 'error':
              console.error('[BackgroundTesting] Server error:', message.message);
              setConnectionError(message.message);
              break;

            default:
              console.log('[BackgroundTesting] Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('[BackgroundTesting] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        if (!isMountedRef.current) return;
        console.error('[BackgroundTesting] WebSocket error:', error);
        setConnectionError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('[BackgroundTesting] WebSocket closed:', event.code, event.reason);
        
        if (!isMountedRef.current) {
          console.log('[BackgroundTesting] Skipping reconnection - component unmounted');
          return;
        }

        setIsConnected(false);
        setIsAuthenticated(false);
        setIsSubscribed(false);
        wsRef.current = null;

        if (enabled && isMountedRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[BackgroundTesting] Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              reconnectAttemptsRef.current++;
              connect();
            }
          }, delay);
        }
      };
    } catch (error) {
      console.error('[BackgroundTesting] Connection error:', error);
      if (isMountedRef.current) {
        setConnectionError('Failed to establish WebSocket connection');
      }
    }
  }, [enabled, user, projectId, getAuthToken, cleanupWebSocket]);

  const getTestStatus = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && isSubscribed) {
      wsRef.current.send(JSON.stringify({
        type: 'get-status',
        projectId
      }));
    }
  }, [projectId, isSubscribed]);

  const rerunTests = useCallback(async () => {
    try {
      await apiRequest('POST', `/api/projects/${projectId}/test`, {
        changedFiles: ['*']
      });
    } catch (error) {
      console.error('[BackgroundTesting] Failed to trigger test run:', error);
      throw error;
    }
  }, [projectId]);

  useEffect(() => {
    isMountedRef.current = true;
    reconnectAttemptsRef.current = 0;
    connect();

    return () => {
      console.log('[BackgroundTesting] Cleanup: unmounting component');
      isMountedRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      cleanupWebSocket(wsRef.current);
      wsRef.current = null;
    };
  }, [connect, cleanupWebSocket]);

  useEffect(() => {
    if (!isMountedRef.current) return;
    
    if (isAuthenticated && !isSubscribed && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        projectId
      }));
    }
  }, [projectId, isAuthenticated, isSubscribed]);

  return {
    isConnected,
    isAuthenticated,
    isSubscribed,
    connectionError,
    testQueue,
    runningTests,
    completedTests,
    failedTests,
    currentStatus,
    rerunTests,
    clearResults,
    getTestStatus
  };
}
