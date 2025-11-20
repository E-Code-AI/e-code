/**
 * Real-time Agent WebSocket Hook
 * Subscribes to agent progress updates via WebSocket for live UI sync
 * Supports cross-platform synchronization across web, mobile, and desktop
 */

import { useEffect, useState, useCallback } from 'react';

interface AgentProgressUpdate {
  type: 'step' | 'summary' | 'error' | 'complete' | 'progress' | 'device_connected' | 'device_disconnected' | 'connected';
  projectId: number;
  sessionId: string;
  data?: any;
  deviceId?: string;
  deviceType?: 'web' | 'mobile' | 'desktop';
  totalDevices?: number;
  roster?: ConnectedDevice[];
  connectedAt?: string;
}

interface ConnectedDevice {
  deviceId: string;
  deviceType: 'web' | 'mobile' | 'desktop';
  connectedAt: string;
}

interface UseAgentWebSocketOptions {
  projectId: number;
  sessionId?: string;
  onUpdate?: (update: AgentProgressUpdate) => void;
  enabled?: boolean;
}

// Detect device type based on user agent and screen size
function detectDeviceType(): 'web' | 'mobile' | 'desktop' {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isTablet = isMobile && window.innerWidth >= 768;
  
  if (isMobile && !isTablet) return 'mobile';
  if (isTablet) return 'mobile'; // Tablets count as mobile for now
  return 'web';
}

// Generate stable device ID (persists across page reloads)
function getDeviceId(): string {
  const storageKey = 'agent-device-id';
  let deviceId = localStorage.getItem(storageKey);
  
  if (!deviceId) {
    deviceId = `${detectDeviceType()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, deviceId);
  }
  
  return deviceId;
}

export function useAgentWebSocket({
  projectId,
  sessionId,
  onUpdate,
  enabled = true
}: UseAgentWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<AgentProgressUpdate | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [currentDeviceId] = useState(getDeviceId());
  const [currentDeviceType] = useState(detectDeviceType());
  const [serverTotalDevices, setServerTotalDevices] = useState<number | null>(null);
  
  const connect = useCallback(() => {
    if (!enabled || !sessionId) {
      return null;
    }
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/agent?projectId=${projectId}&sessionId=${sessionId}&deviceId=${currentDeviceId}&deviceType=${currentDeviceType}`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const update: AgentProgressUpdate = JSON.parse(event.data);
          
          // Handle presence updates separately
          if (update.type === 'connected') {
            console.log('[WebSocket] Connected to agent session', {
              deviceId: update.deviceId,
              deviceType: update.deviceType,
              sessionId: update.sessionId,
              totalDevices: update.totalDevices
            });
            
            // Store server's authoritative total
            if (typeof update.totalDevices === 'number') {
              setServerTotalDevices(update.totalDevices);
            }
            
            // Hydrate roster from server, then ADD current device
            const roster = update.roster && Array.isArray(update.roster) ? update.roster : [];
            const currentDevice: ConnectedDevice = {
              deviceId: currentDeviceId,
              deviceType: currentDeviceType,
              connectedAt: new Date().toISOString()
            };
            
            setConnectedDevices([...roster, currentDevice]);
            console.log('[WebSocket] Hydrated device roster (including self):', [...roster, currentDevice]);
          } else if (update.type === 'device_connected') {
            console.log('[WebSocket] New device connected', update);
            
            // Update server's authoritative total
            if (typeof update.totalDevices === 'number') {
              setServerTotalDevices(update.totalDevices);
            }
            
            // Add new device to roster
            setConnectedDevices((prev) => {
              // Prevent duplicates
              if (prev.some((d) => d.deviceId === update.deviceId)) {
                return prev;
              }
              return [
                ...prev,
                {
                  deviceId: update.deviceId!,
                  deviceType: update.deviceType!,
                  connectedAt: update.connectedAt || new Date().toISOString()
                }
              ];
            });
          } else if (update.type === 'device_disconnected') {
            console.log('[WebSocket] Device disconnected', update);
            
            // Update server's authoritative total
            if (typeof update.totalDevices === 'number') {
              setServerTotalDevices(update.totalDevices);
            }
            
            setConnectedDevices((prev) => 
              prev.filter((d) => d.deviceId !== update.deviceId)
            );
          }
          
          setLastUpdate(update);
          onUpdate?.(update);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
      
      ws.onerror = (event) => {
        setError(new Error('WebSocket connection error'));
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
      };
      
      return ws;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, [enabled, projectId, sessionId, currentDeviceId, currentDeviceType, onUpdate]);
  
  useEffect(() => {
    const ws = connect();
    
    return () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [connect]);
  
  // Prefer server's authoritative total, fall back to local count
  const totalDevices = serverTotalDevices ?? connectedDevices.length;
  
  return {
    isConnected,
    lastUpdate,
    error,
    connectedDevices,
    currentDeviceId,
    currentDeviceType,
    totalDevices
  };
}
