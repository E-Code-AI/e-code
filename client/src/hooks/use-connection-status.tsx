import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { onlineManager } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface ConnectionState {
  isOnline: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
  wsConnected: boolean;
  backendHealthy: boolean;
}

interface ConnectionStatusContextValue extends ConnectionState {
  setWsConnected: (connected: boolean) => void;
  setBackendHealthy: (healthy: boolean) => void;
  forceReconnect: () => void;
}

const ConnectionStatusContext = createContext<ConnectionStatusContextValue | null>(null);

const RECONNECT_CHECK_INTERVAL = 5000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function ConnectionStatusProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [state, setState] = useState<ConnectionState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isReconnecting: false,
    reconnectAttempt: 0,
    lastOnlineAt: null,
    lastOfflineAt: null,
    wsConnected: true,
    backendHealthy: true,
  });
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasOfflineRef = useRef(false);

  const checkBackendHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/health/liveness', {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const handleOnline = useCallback(async () => {
    console.log('[ConnectionStatus] Network online detected');
    
    setState(prev => ({
      ...prev,
      isOnline: true,
      lastOnlineAt: new Date(),
      isReconnecting: true,
    }));

    const healthy = await checkBackendHealth();
    
    setState(prev => ({
      ...prev,
      isReconnecting: false,
      backendHealthy: healthy,
      reconnectAttempt: 0,
    }));

    if (wasOfflineRef.current) {
      toast({
        title: healthy ? 'Back online' : 'Limited connectivity',
        description: healthy 
          ? 'Your connection has been restored.' 
          : 'Network is available but some services may be unavailable.',
        variant: healthy ? 'default' : 'destructive',
      });
      wasOfflineRef.current = false;
    }

    onlineManager.setOnline(true);
  }, [checkBackendHealth, toast]);

  const handleOffline = useCallback(() => {
    console.log('[ConnectionStatus] Network offline detected');
    wasOfflineRef.current = true;
    
    setState(prev => ({
      ...prev,
      isOnline: false,
      lastOfflineAt: new Date(),
      backendHealthy: false,
    }));

    toast({
      title: 'You are offline',
      description: 'Some features may be unavailable. We\'ll reconnect automatically.',
      variant: 'destructive',
    });

    onlineManager.setOnline(false);
  }, [toast]);

  const setWsConnected = useCallback((connected: boolean) => {
    setState(prev => ({ ...prev, wsConnected: connected }));
  }, []);

  const setBackendHealthy = useCallback((healthy: boolean) => {
    setState(prev => ({ ...prev, backendHealthy: healthy }));
  }, []);

  const forceReconnect = useCallback(async () => {
    setState(prev => ({ ...prev, isReconnecting: true, reconnectAttempt: prev.reconnectAttempt + 1 }));
    
    const healthy = await checkBackendHealth();
    
    setState(prev => ({
      ...prev,
      isReconnecting: false,
      backendHealthy: healthy,
      isOnline: navigator.onLine,
    }));

    if (healthy) {
      toast({
        title: 'Reconnected',
        description: 'Connection restored successfully.',
      });
    }
  }, [checkBackendHealth, toast]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = onlineManager.subscribe((isOnline) => {
      if (isOnline && !state.isOnline) {
        handleOnline();
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [handleOnline, handleOffline, state.isOnline]);

  useEffect(() => {
    if (!state.isOnline && state.reconnectAttempt < MAX_RECONNECT_ATTEMPTS) {
      reconnectTimeoutRef.current = setTimeout(() => {
        if (navigator.onLine) {
          handleOnline();
        } else {
          setState(prev => ({ ...prev, reconnectAttempt: prev.reconnectAttempt + 1 }));
        }
      }, RECONNECT_CHECK_INTERVAL * Math.pow(1.5, state.reconnectAttempt));
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [state.isOnline, state.reconnectAttempt, handleOnline]);

  const value: ConnectionStatusContextValue = {
    ...state,
    setWsConnected,
    setBackendHealthy,
    forceReconnect,
  };

  return (
    <ConnectionStatusContext.Provider value={value}>
      {children}
    </ConnectionStatusContext.Provider>
  );
}

export function useConnectionStatus() {
  const context = useContext(ConnectionStatusContext);
  if (!context) {
    return {
      isOnline: true,
      isReconnecting: false,
      reconnectAttempt: 0,
      lastOnlineAt: null,
      lastOfflineAt: null,
      wsConnected: true,
      backendHealthy: true,
      setWsConnected: () => {},
      setBackendHealthy: () => {},
      forceReconnect: () => {},
    };
  }
  return context;
}
