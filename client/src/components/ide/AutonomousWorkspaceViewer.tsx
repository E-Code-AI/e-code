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

import { useState, useEffect, useRef, useCallback } from 'react';
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
  type: 'task_start' | 'task_progress' | 'task_complete' | 'file_created' | 'build_log' | 'error' | 'complete' | 'status' | 'plan_chunk' | 'plan_generated' | 'connected';
  data?: any;
  message?: string;
  taskId?: string;
  taskName?: string;
  progress?: number;
  filePath?: string;
  content?: string;
  level?: 'info' | 'warn' | 'error';
  timestamp?: string;
  status?: string;
  plan?: any;
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
  const [planText, setPlanText] = useState<string>('');
  const [phase, setPhase] = useState<'planning' | 'executing' | 'complete'>('planning');
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  // ✅ FIX (Dec 1, 2025): Track reconnect timer to clear on successful connection
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // ✅ FIX (Dec 1, 2025): Use refs for callbacks to prevent WebSocket reconnection on re-renders
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  
  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);
  
  // ✅ FIX (Dec 10, 2025): Sync isOpen with bootstrapToken changes
  // This ensures the dialog opens when bootstrapToken becomes available after initial render
  useEffect(() => {
    if (bootstrapToken && !isOpen && !isComplete) {
      console.log('[AutonomousWorkspaceViewer] Opening dialog - bootstrapToken received');
      setIsOpen(true);
    }
  }, [bootstrapToken, isOpen, isComplete]);

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
    console.log('[AutonomousWorkspaceViewer] useEffect triggered', { bootstrapToken: !!bootstrapToken, isOpen });
    
    if (!bootstrapToken || !isOpen) {
      console.log('[AutonomousWorkspaceViewer] Skipping WebSocket connection - missing token or not open');
      return;
    }

    const tokenData = decodeToken(bootstrapToken);
    if (!tokenData) {
      setErrorMessage('Invalid bootstrap token');
      setConnectionStatus('error');
      onErrorRef.current?.('Invalid bootstrap token');
      return;
    }
    
    console.log('[AutonomousWorkspaceViewer] Token decoded:', { projectId: tokenData.projectId, sessionId: tokenData.sessionId });

    const connectWebSocket = () => {
      // Determine WebSocket protocol based on current protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // ✅ FIX (Dec 5, 2025): DO NOT include bootstrap token in WebSocket URL
      // PROBLEM: Long JWT tokens cause "Invalid frame header" errors on mobile
      // SOLUTION: Use only projectId and sessionId - the session is already authenticated
      const wsUrl = `${protocol}//${window.location.host}/ws/agent?projectId=${tokenData.projectId}&sessionId=${tokenData.sessionId}`;
      
      console.log('[AutonomousWorkspaceViewer] Connecting to WebSocket:', wsUrl);
      
      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl);
        console.log('[AutonomousWorkspaceViewer] WebSocket object created');
      } catch (error) {
        console.error('[AutonomousWorkspaceViewer] WebSocket creation failed:', error);
        setConnectionStatus('error');
        addLog(`❌ Failed to create WebSocket: ${(error as Error).message}`);
        setErrorMessage(`WebSocket construction failed: ${(error as Error).message}`);
        return;
      }
      
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[AutonomousWorkspaceViewer] WebSocket CONNECTED');
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        // ✅ FIX (Dec 1, 2025): Clear reconnect timer on successful connection to prevent duplicate sockets
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
        addLog('✅ Connected to AI Agent workspace builder');
      };

      ws.onmessage = (event) => {
        try {
          const message: AgentMessage = JSON.parse(event.data);
          handleAgentMessage(message);
        } catch (e) {
          addLog(`❌ Parse error: ${e}`);
        }
      };

      ws.onerror = (event) => {
        setConnectionStatus('error');
        // ✅ FIX (Dec 1, 2025): Log more details about WebSocket errors
        // Browser WebSocket error events don't expose much detail, but we can log state
        const wsState = ws.readyState;
        const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
        addLog(`❌ Connection error (state: ${stateNames[wsState] || wsState})`);
      };

      ws.onclose = (event) => {
        setConnectionStatus('closed');
        
        // Attempt reconnection if not graceful close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts && !isComplete) {
          reconnectAttempts.current++;
          addLog(`🔄 Reconnecting... (Attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          // ✅ FIX (Dec 1, 2025): Store timer reference for cleanup
          reconnectTimerRef.current = setTimeout(connectWebSocket, 2000 * reconnectAttempts.current);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          addLog('❌ Max reconnection attempts reached');
          setErrorMessage('Connection lost. Please refresh the page.');
          onErrorRef.current?.('Connection lost');
        }
      };
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      // ✅ FIX (Dec 1, 2025): Clear reconnect timer on cleanup
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
    // ✅ FIX (Dec 1, 2025): Removed onError from dependencies - using ref instead
  }, [bootstrapToken, isOpen]);

  // Handle agent messages
  const handleAgentMessage = (message: AgentMessage) => {
    switch (message.type) {
      // ✅ FIX (Dec 1, 2025): Handle 'connected' message from server
      case 'connected':
        addLog('🔌 Connected to AI agent');
        break;

      case 'status':
        // ✅ FIX (Dec 1, 2025): Handle 'waiting_for_plan' status gracefully
        // This happens when WebSocket connects before plan generation starts (race condition fix)
        if (message.status === 'waiting_for_plan') {
          setPhase('planning');
          setCurrentTask('Connecting to AI...');
          addLog('⏳ Waiting for AI to begin planning...');
        } else if (message.status === 'planning') {
          setPhase('planning');
          setCurrentTask('Generating execution plan...');
          addLog('🧠 AI is analyzing your request...');
        } else if (message.status === 'executing') {
          setPhase('executing');
          setCurrentTask('Executing plan...');
        }
        if (message.message && message.status !== 'waiting_for_plan') {
          addLog(`📌 ${message.message}`);
        }
        break;

      case 'plan_chunk':
        if (message.data?.content) {
          setPlanText(prev => prev + message.data.content);
        }
        break;

      case 'plan_generated':
        if (message.plan) {
          setGeneratedPlan(message.plan);
          const taskCount = message.plan.tasks?.length || 0;
          addLog(`📋 Plan generated with ${taskCount} tasks`);
          if (message.plan.summary) {
            addLog(`📝 ${message.plan.summary}`);
          }
          if (message.plan.technologies?.length) {
            addLog(`🔧 Technologies: ${message.plan.technologies.join(', ')}`);
          }
          // ✅ FIX (Dec 1, 2025): Don't reset planText - preserve streaming plan history through phase transitions
          setPhase('executing');
        }
        break;

      case 'task_start':
        if (message.taskId && message.taskName) {
          setTasks(prev => [...prev, {
            id: message.taskId!,
            name: message.taskName!,
            status: 'in_progress'
          }]);
          setCurrentTask(message.taskName);
          addLog(`🚀 Starting: ${message.taskName}`);
        } else if (message.message) {
          addLog(`🚀 ${message.message}`);
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
            if (total > 0) {
              setOverallProgress((completed / total) * 100);
            }
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
        onErrorRef.current?.(errorMsg);
        break;

      case 'complete':
        setIsComplete(true);
        setPhase('complete');
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
    onCompleteRef.current?.();
  };

  if (!bootstrapToken) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Allow user to close at any time
      setIsOpen(open);
      if (!open) handleClose();
    }}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[98vw] sm:max-w-2xl lg:max-w-3xl max-h-[95vh] sm:max-h-[85vh] flex flex-col p-3 sm:p-6 overflow-y-auto" data-testid="autonomous-workspace-viewer">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            {isComplete ? (
              <>
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                <span className="truncate">Workspace Ready!</span>
              </>
            ) : errorMessage ? (
              <>
                <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
                <span className="truncate">Workspace Creation Failed</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-pulse flex-shrink-0" />
                <span className="truncate">Building Your Workspace with AI...</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isComplete 
              ? 'Your AI-powered workspace has been created successfully!'
              : errorMessage
              ? 'An error occurred during workspace creation'
              : 'The AI agent is autonomously creating your project, files, and starting the preview'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Connection Status */}
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <div className={cn(
            "h-2 w-2 rounded-full flex-shrink-0",
            connectionStatus === 'connected' && "bg-green-500 animate-pulse",
            connectionStatus === 'connecting' && "bg-yellow-500 animate-pulse",
            connectionStatus === 'error' && "bg-red-500",
            connectionStatus === 'closed' && "bg-gray-400"
          )} />
          <span className="text-muted-foreground truncate">
            {connectionStatus === 'connected' && 'Connected'}
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'error' && 'Connection Error'}
            {connectionStatus === 'closed' && 'Disconnected'}
          </span>
        </div>

        {/* Phase Indicator */}
        <div className="flex items-center gap-2">
          <Badge variant={phase === 'planning' ? 'default' : phase === 'executing' ? 'secondary' : 'outline'}>
            {phase === 'planning' ? '🧠 Planning' : phase === 'executing' ? '⚡ Executing' : '✅ Complete'}
          </Badge>
          {generatedPlan && (
            <span className="text-xs text-muted-foreground">
              {generatedPlan.tasks?.length || 0} tasks • {generatedPlan.estimatedTime || 'Calculating...'}
            </span>
          )}
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
            <span className="font-medium truncate flex-1 min-w-0">{currentTask}</span>
            <span className="text-muted-foreground flex-shrink-0">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" data-testid="overall-progress" />
        </div>

        {/* Streaming Plan Text (during planning phase) - ALWAYS VISIBLE ON MOBILE */}
        {phase === 'planning' && (
          <div className="space-y-2 min-h-0">
            <h4 className="text-xs sm:text-sm font-medium flex items-center gap-2 bg-background py-1">
              <Code2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Generating Plan...</span>
              {!planText && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </h4>
            <ScrollArea className="h-32 sm:h-40 md:h-48 border rounded-md bg-card font-mono text-[10px] sm:text-xs">
              <div className="p-2 sm:p-3 text-foreground whitespace-pre-wrap break-words">
                {planText || 'Analyzing your request and generating an execution plan...'}
                <span className="inline-block w-2 h-3 sm:h-4 bg-primary animate-pulse ml-0.5" />
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Generated Plan Summary */}
        {generatedPlan && phase !== 'planning' && (
          <div className="space-y-2 min-h-0">
            <h4 className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <FileCode className="h-3 w-3 sm:h-4 sm:w-4" />
              Execution Plan
            </h4>
            <div className="text-xs text-muted-foreground border rounded-md p-2 bg-muted/30">
              <p className="font-medium text-foreground">{generatedPlan.summary}</p>
              {generatedPlan.technologies?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {generatedPlan.technologies.slice(0, 6).map((tech: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{tech}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tasks List - Responsive height for mobile */}
        {tasks.length > 0 && (
          <div className="space-y-2 min-h-0">
            <h4 className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              Tasks ({tasks.filter(t => t.status === 'completed').length}/{tasks.length})
            </h4>
            <ScrollArea className="h-20 sm:h-28 md:h-32 border rounded-md">
              <div className="p-2 space-y-1">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 py-0.5 text-[11px] sm:text-sm" data-testid={`task-${task.id}`}>
                    {task.status === 'completed' ? (
                      <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                    ) : task.status === 'error' ? (
                      <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
                    ) : task.status === 'in_progress' ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary animate-spin flex-shrink-0" />
                    ) : (
                      <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 border-muted flex-shrink-0" />
                    )}
                    <span className="flex-1 truncate min-w-0">{task.name}</span>
                    {task.progress !== undefined && task.status === 'in_progress' && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">{task.progress}%</span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Logs - Compact on mobile, limited to last 30 entries */}
        <div className="space-y-2 min-h-0">
          <h4 className="text-xs sm:text-sm font-medium flex items-center gap-2 bg-background py-1 sticky top-0 z-10">
            <Terminal className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            Activity Log ({Math.min(logs.length, 30)}{logs.length > 30 ? '+' : ''})
          </h4>
          <ScrollArea className="h-20 sm:h-24 md:h-28 border rounded-md bg-muted font-mono text-[9px] sm:text-xs" data-testid="activity-logs">
            <div className="p-2 space-y-0.5">
              {logs.slice(-30).map((log, index) => (
                <div key={index} className="text-muted-foreground whitespace-pre-wrap break-words leading-tight">
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="rounded-md bg-destructive/10 border border-destructive p-2 sm:p-3 text-xs sm:text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          {isComplete ? (
            <Button onClick={handleClose} className="text-xs sm:text-sm" data-testid="button-close">
              <Rocket className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Open Workspace</span>
              <span className="sm:hidden">Open</span>
            </Button>
          ) : errorMessage ? (
            <Button variant="outline" onClick={handleClose} className="text-xs sm:text-sm" data-testid="button-close-error">
              Close
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose} className="text-xs sm:text-sm" data-testid="button-hide">
                <span>Hide Progress</span>
              </Button>
              <Button variant="outline" disabled className="text-xs sm:text-sm" data-testid="button-cancel">
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                Building...
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
