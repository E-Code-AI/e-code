/**
 * AutonomousWorkspaceViewer - Real-time WebSocket progress viewer
 * 
 * Displays autonomous workspace creation progress with streaming updates
 * Connected to backend via /ws/agent WebSocket endpoint
 * 
 * Architecture:
 * - Decodes bootstrap token (JWT)
 * - Connects to WebSocket /ws/agent?projectId=X&sessionId=Y
 * - Displays task progress, file creation, build logs in real-time
 * - Auto-closes on completion
 */

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  FileCode, 
  Rocket, 
  Sparkles,
  Terminal,
  Package,
  Code2,
  PlayCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutonomousWorkspaceViewerProps {
  bootstrapToken: string | null;
  projectId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

interface AgentMessage {
  type: 'task_start' | 'task_progress' | 'task_complete' | 'file_created' | 'build_log' | 'error' | 'complete';
  data?: any;
  message?: string;
  taskId?: string;
  taskName?: string;
  progress?: number;
  filePath?: string;
  content?: string;
  level?: 'info' | 'warn' | 'error';
  timestamp?: string;
}

interface Task {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
}

export function AutonomousWorkspaceViewer({
  bootstrapToken,
  projectId,
  onComplete,
  onError
}: AutonomousWorkspaceViewerProps) {
  const [isOpen, setIsOpen] = useState(!!bootstrapToken);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState<string>('Initializing workspace...');
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Decode bootstrap token to extract session info (base64url-safe)
  const decodeToken = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      // Base64url decode: replace URL-safe chars and add padding
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      if (pad) {
        if (pad === 1) {
          throw new Error('Invalid base64url string');
        }
        base64 += new Array(5 - pad).join('=');
      }
      
      const payload = JSON.parse(atob(base64));
      return {
        projectId: payload.projectId,
        sessionId: payload.sessionId,
        userId: payload.userId
      };
    } catch (e) {
      console.error('Failed to decode bootstrap token:', e, 'Token preview:', token.substring(0, 20) + '...');
      return null;
    }
  };

  // Connect to WebSocket
  useEffect(() => {
    if (!bootstrapToken || !isOpen) return;

    const tokenData = decodeToken(bootstrapToken);
    if (!tokenData) {
      setErrorMessage('Invalid bootstrap token');
      setConnectionStatus('error');
      onError?.('Invalid bootstrap token');
      return;
    }

    const connectWebSocket = () => {
      // Determine WebSocket protocol based on current protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/agent?projectId=${tokenData.projectId}&sessionId=${tokenData.sessionId}`;
      
      console.log('[AutonomousWorkspace] Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[AutonomousWorkspace] WebSocket connected');
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        addLog('✅ Connected to AI Agent workspace builder');
      };

      ws.onmessage = (event) => {
        try {
          const message: AgentMessage = JSON.parse(event.data);
          handleAgentMessage(message);
        } catch (e) {
          console.error('[AutonomousWorkspace] Failed to parse message:', e);
          addLog(`❌ Parse error: ${e}`);
        }
      };

      ws.onerror = (error) => {
        console.error('[AutonomousWorkspace] WebSocket error:', error);
        setConnectionStatus('error');
        addLog('❌ Connection error');
      };

      ws.onclose = (event) => {
        console.log('[AutonomousWorkspace] WebSocket closed:', event.code, event.reason);
        setConnectionStatus('closed');
        
        // Attempt reconnection if not graceful close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts && !isComplete) {
          reconnectAttempts.current++;
          addLog(`🔄 Reconnecting... (Attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          setTimeout(connectWebSocket, 2000 * reconnectAttempts.current); // Exponential backoff
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          addLog('❌ Max reconnection attempts reached');
          setErrorMessage('Connection lost. Please refresh the page.');
          onError?.('Connection lost');
        }
      };
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
  }, [bootstrapToken, isOpen, onError]);

  // Handle agent messages
  const handleAgentMessage = (message: AgentMessage) => {
    console.log('[AutonomousWorkspace] Message:', message);

    switch (message.type) {
      case 'task_start':
        if (message.taskId && message.taskName) {
          setTasks(prev => [...prev, {
            id: message.taskId!,
            name: message.taskName!,
            status: 'in_progress'
          }]);
          setCurrentTask(message.taskName);
          addLog(`🚀 Starting: ${message.taskName}`);
        }
        break;

      case 'task_progress':
        if (message.taskId) {
          setTasks(prev => prev.map(task => 
            task.id === message.taskId 
              ? { ...task, progress: message.progress }
              : task
          ));
          if (message.message) {
            addLog(`⏳ ${message.message}`);
          }
        }
        break;

      case 'task_complete':
        if (message.taskId) {
          setTasks(prev => prev.map(task => 
            task.id === message.taskId 
              ? { ...task, status: 'completed', progress: 100 }
              : task
          ));
          addLog(`✅ Completed: ${message.taskName || message.taskId}`);
          
          // Update overall progress
          setTasks(currentTasks => {
            const completed = currentTasks.filter(t => t.status === 'completed').length;
            const total = currentTasks.length;
            setOverallProgress((completed / total) * 100);
            return currentTasks;
          });
        }
        break;

      case 'file_created':
        if (message.filePath) {
          addLog(`📄 Created: ${message.filePath}`);
        }
        break;

      case 'build_log':
        if (message.content) {
          const icon = message.level === 'error' ? '❌' : message.level === 'warn' ? '⚠️' : '📋';
          addLog(`${icon} ${message.content}`);
        }
        break;

      case 'error':
        const errorMsg = message.message || 'Unknown error occurred';
        setErrorMessage(errorMsg);
        addLog(`❌ Error: ${errorMsg}`);
        onError?.(errorMsg);
        break;

      case 'complete':
        setIsComplete(true);
        setOverallProgress(100);
        setCurrentTask('Workspace ready! 🎉');
        addLog('🎉 Workspace creation complete!');
        addLog('✨ Your application is ready to use');
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          handleClose();
        }, 2000);
        break;
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (wsRef.current) {
      wsRef.current.close(1000, 'User closed dialog');
    }
    onComplete?.();
  };

  if (!bootstrapToken) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isComplete) {
        // Prevent closing while in progress
        return;
      }
      setIsOpen(open);
      if (!open) handleClose();
    }}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col" data-testid="autonomous-workspace-viewer">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Workspace Ready!</span>
              </>
            ) : errorMessage ? (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                <span>Workspace Creation Failed</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <span>Building Your Workspace with AI...</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isComplete 
              ? 'Your AI-powered workspace has been created successfully!'
              : errorMessage
              ? 'An error occurred during workspace creation'
              : 'The AI agent is autonomously creating your project, files, and starting the preview'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          <div className={cn(
            "h-2 w-2 rounded-full",
            connectionStatus === 'connected' && "bg-green-500 animate-pulse",
            connectionStatus === 'connecting' && "bg-yellow-500 animate-pulse",
            connectionStatus === 'error' && "bg-red-500",
            connectionStatus === 'closed' && "bg-gray-400"
          )} />
          <span className="text-muted-foreground">
            {connectionStatus === 'connected' && 'Connected'}
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'error' && 'Connection Error'}
            {connectionStatus === 'closed' && 'Disconnected'}
          </span>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{currentTask}</span>
            <span className="text-muted-foreground">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" data-testid="overall-progress" />
        </div>

        {/* Tasks List */}
        {tasks.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Tasks</h4>
            <ScrollArea className="h-32 border rounded-md p-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 py-1 text-sm" data-testid={`task-${task.id}`}>
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : task.status === 'error' ? (
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  ) : task.status === 'in_progress' ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted flex-shrink-0" />
                  )}
                  <span className="flex-1 truncate">{task.name}</span>
                  {task.progress !== undefined && task.status === 'in_progress' && (
                    <span className="text-xs text-muted-foreground">{task.progress}%</span>
                  )}
                </div>
              ))}
            </ScrollArea>
          </div>
        )}

        {/* Logs */}
        <div className="flex-1 space-y-2">
          <h4 className="text-sm font-medium">Activity Log</h4>
          <ScrollArea className="h-48 border rounded-md bg-muted/30 font-mono text-xs" data-testid="activity-logs">
            <div className="p-3 space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="text-muted-foreground whitespace-pre-wrap break-all">
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="rounded-md bg-destructive/10 border border-destructive p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          {isComplete ? (
            <Button onClick={handleClose} data-testid="button-close">
              <Rocket className="h-4 w-4 mr-2" />
              Open Workspace
            </Button>
          ) : errorMessage ? (
            <Button variant="outline" onClick={handleClose} data-testid="button-close-error">
              Close
            </Button>
          ) : (
            <Button variant="outline" disabled data-testid="button-cancel">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Building...
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
