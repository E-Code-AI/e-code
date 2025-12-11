/**
 * Hook to integrate autonomous workspace WebSocket events with chat messages
 * 
 * Converts autonomous workspace progress events into inline chat messages
 * for a Replit-style inline chat experience
 * 
 * Also updates the shared autonomousBuildStore for PreviewPanel splash screens
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAgentConversationStore } from '@/stores/agentConversationStore';
import { useAutonomousBuildStore } from '@/stores/autonomousBuildStore';
import type { Message, AutonomousWorkspacePayload, AutonomousBuildTask } from '@/stores/agentConversationStore';
import type { AutonomousBuildPhase } from '@/stores/autonomousBuildStore';

interface AutonomousProgressEvent {
  type: 'planning' | 'plan_ready' | 'awaiting_approval' | 'executing' | 'step_update' | 'complete' | 'error' | 'connected' | 'status' | 'plan_chunk' | 'plan_generated' | 'task_start' | 'task_progress' | 'task_complete';
  projectId?: number;
  sessionId?: string;
  status?: string;
  phaseName?: string;
  progress?: number;
  message?: string;
  taskId?: string;
  taskName?: string;
  plan?: any;
  data?: {
    phase?: string;
    planTitle?: string;
    appType?: string;
    features?: string[];
    searchQuery?: string;
    currentTask?: string;
    progress?: number;
    tasks?: Array<{
      id: string;
      name: string;
      status: 'pending' | 'in_progress' | 'completed' | 'error';
      progress?: number;
    }>;
    planText?: string;
    buildMode?: 'design-first' | 'full-app';
    errorMessage?: string;
    content?: string;
    step?: {
      id: string;
      type: string;
      title: string;
      details?: string[];
    };
  };
}

interface UseAutonomousChatIntegrationOptions {
  conversationId: number | null;
  projectId?: number;
  sessionId?: string | null;
  enabled?: boolean;
  bootstrapToken?: string | null;
}

function mapPhaseToSplashPhase(phase: string | undefined): AutonomousBuildPhase {
  switch (phase) {
    case 'planning':
    case 'waiting_for_plan':
      return 'planning';
    case 'scaffolding':
      return 'scaffolding';
    case 'building':
    case 'executing':
    case 'in_progress':
      return 'building';
    case 'styling':
      return 'styling';
    case 'finalizing':
      return 'finalizing';
    case 'complete':
      return 'complete';
    case 'error':
      return 'error';
    default:
      return 'planning';
  }
}

export function useAutonomousChatIntegration({
  conversationId,
  projectId,
  sessionId,
  enabled = true,
  bootstrapToken
}: UseAutonomousChatIntegrationOptions) {
  const { addMessage, updateMessage } = useAgentConversationStore();
  const buildStore = useAutonomousBuildStore();
  const wsRef = useRef<WebSocket | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const planTextRef = useRef<string>('');

  const createAutonomousMessage = useCallback((
    type: Message['type'],
    content: string,
    payload: AutonomousWorkspacePayload
  ): Message => ({
    id: `autonomous-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role: 'assistant',
    content,
    timestamp: new Date(),
    type,
    autonomousPayload: payload,
    isStreaming: payload.phase === 'planning' || payload.phase === 'executing'
  }), []);

  const handleProgressEvent = useCallback((event: AutonomousProgressEvent) => {
    if (!conversationId) return;

    const { type, data, status, phaseName, progress: eventProgress, message: eventMessage, taskId, taskName, plan } = event;
    
    switch (type) {
      case 'connected': {
        buildStore.setPhase('planning');
        buildStore.setCurrentTask('Connected to AI agent');
        buildStore.setProgress(5);
        break;
      }

      case 'status': {
        const splashPhase = mapPhaseToSplashPhase(status);
        buildStore.setPhase(splashPhase);
        buildStore.setCurrentTask(phaseName || eventMessage || 'Processing...');
        if (eventProgress !== undefined) {
          buildStore.setProgress(eventProgress);
        }
        break;
      }

      case 'planning': {
        buildStore.setPhase('planning');
        buildStore.setCurrentTask(data?.searchQuery ? `Searching for "${data.searchQuery}"...` : 'Analyzing your request...');
        
        const msg = createAutonomousMessage(
          'autonomous_working',
          data?.searchQuery ? `Searching for "${data.searchQuery}"...` : 'Analyzing your request...',
          {
            phase: 'planning',
            searchQuery: data?.searchQuery,
            appType: data?.appType
          }
        );
        addMessage(conversationId, msg);
        lastMessageIdRef.current = msg.id;
        break;
      }

      case 'plan_chunk': {
        if (data?.content) {
          planTextRef.current += data.content;
          buildStore.setPlan({ planText: planTextRef.current });
          buildStore.setProgress(Math.min(30, buildStore.progress + 0.5));
        }
        break;
      }

      case 'plan_generated': {
        if (plan) {
          const features = plan.tasks?.map((t: any) => t.description || t.name) || [];
          buildStore.setPlan({
            planTitle: plan.summary || 'Generated Plan',
            featureList: features,
            planText: planTextRef.current
          });
          buildStore.setPhase('scaffolding');
          buildStore.setProgress(35);
        }
        break;
      }

      case 'plan_ready': {
        buildStore.setPhase('scaffolding');
        buildStore.setPlan({
          planTitle: data?.planTitle || "I'll include the following features:",
          featureList: data?.features || []
        });
        
        const msg = createAutonomousMessage(
          'autonomous_plan',
          "I've created a plan for your app:",
          {
            phase: 'awaiting_approval',
            planTitle: data?.planTitle || "I'll include the following features:",
            appType: data?.appType,
            featureList: data?.features || [],
            planText: data?.planText
          }
        );
        addMessage(conversationId, msg);
        lastMessageIdRef.current = msg.id;
        break;
      }

      case 'awaiting_approval': {
        const msg = createAutonomousMessage(
          'autonomous_build_options',
          'How would you like me to build this?',
          {
            phase: 'awaiting_approval',
            featureList: data?.features || []
          }
        );
        addMessage(conversationId, msg);
        lastMessageIdRef.current = msg.id;
        break;
      }

      case 'task_start': {
        if (taskId && taskName) {
          const newTask = {
            id: taskId,
            name: taskName,
            status: 'in_progress' as const
          };
          buildStore.setTasks([...buildStore.tasks, newTask]);
          buildStore.setCurrentTask(taskName);
          buildStore.setPhase('building');
        }
        break;
      }

      case 'task_progress': {
        if (taskId && eventProgress !== undefined) {
          buildStore.updateTask(taskId, { progress: eventProgress });
        }
        break;
      }

      case 'task_complete': {
        if (taskId) {
          buildStore.updateTask(taskId, { status: 'completed', progress: 100 });
          const completedCount = buildStore.tasks.filter(t => t.status === 'completed').length + 1;
          const totalTasks = buildStore.tasks.length;
          if (totalTasks > 0) {
            const progressFromTasks = 35 + (completedCount / totalTasks) * 60;
            buildStore.setProgress(Math.min(95, progressFromTasks));
          }
        }
        break;
      }

      case 'executing':
      case 'step_update': {
        const tasks: AutonomousBuildTask[] = (data?.tasks || []).map(t => ({
          id: t.id,
          name: t.name,
          status: t.status,
          progress: t.progress
        }));

        buildStore.setPhase('building');
        buildStore.setTasks(tasks);
        buildStore.setCurrentTask(data?.currentTask || 'Building...');
        if (data?.progress !== undefined) {
          buildStore.setProgress(data.progress);
        }
        if (data?.buildMode) {
          buildStore.setBuildMode(data.buildMode);
        }

        if (lastMessageIdRef.current && type === 'step_update') {
          updateMessage(conversationId, lastMessageIdRef.current, {
            content: data?.currentTask || 'Building...',
            isStreaming: true,
            autonomousPayload: {
              phase: 'executing',
              progress: data?.progress || 0,
              currentTask: data?.currentTask,
              tasks,
              buildMode: data?.buildMode
            }
          });
        } else {
          const msg = createAutonomousMessage(
            'autonomous_progress',
            data?.currentTask || 'Starting build...',
            {
              phase: 'executing',
              progress: data?.progress || 0,
              currentTask: data?.currentTask,
              tasks,
              buildMode: data?.buildMode
            }
          );
          addMessage(conversationId, msg);
          lastMessageIdRef.current = msg.id;
        }
        break;
      }

      case 'complete': {
        buildStore.setComplete();
        
        if (lastMessageIdRef.current) {
          updateMessage(conversationId, lastMessageIdRef.current, {
            content: 'Build complete! Your app is ready.',
            isStreaming: false,
            autonomousPayload: {
              phase: 'complete',
              progress: 100
            }
          });
        } else {
          const msg = createAutonomousMessage(
            'autonomous_complete',
            'Build complete! Your app is ready.',
            { phase: 'complete', progress: 100 }
          );
          addMessage(conversationId, msg);
        }
        lastMessageIdRef.current = null;
        break;
      }

      case 'error': {
        const errorMsg = data?.errorMessage || eventMessage || 'An error occurred';
        buildStore.setError(errorMsg);

        if (lastMessageIdRef.current) {
          updateMessage(conversationId, lastMessageIdRef.current, {
            content: errorMsg,
            isStreaming: false,
            status: 'error',
            autonomousPayload: {
              phase: 'error',
              errorMessage: errorMsg
            }
          });
        } else {
          const msg = createAutonomousMessage(
            'autonomous_error',
            errorMsg,
            { phase: 'error', errorMessage: errorMsg }
          );
          msg.status = 'error';
          addMessage(conversationId, msg);
        }
        lastMessageIdRef.current = null;
        break;
      }
    }
  }, [conversationId, addMessage, updateMessage, createAutonomousMessage, buildStore]);

  // Decode bootstrap token to extract session info
  const decodeToken = useCallback((token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      if (pad) {
        if (pad === 1) return null;
        base64 += new Array(5 - pad).join('=');
      }
      
      const payload = JSON.parse(atob(base64));
      return {
        projectId: payload.projectId,
        sessionId: payload.sessionId,
        userId: payload.userId
      };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !conversationId) return;
    
    let wsProjectId = projectId;
    let wsSessionId = sessionId;
    
    // Try to extract from bootstrap token if not provided directly
    if (bootstrapToken && (!wsProjectId || !wsSessionId)) {
      const tokenData = decodeToken(bootstrapToken);
      if (tokenData) {
        wsProjectId = wsProjectId || tokenData.projectId;
        wsSessionId = wsSessionId || tokenData.sessionId;
      }
    }
    
    if (!wsProjectId) return;

    // Initialize build store
    buildStore.startBuild({ 
      projectId: wsProjectId, 
      sessionId: wsSessionId || undefined, 
      conversationId 
    });

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = wsSessionId 
      ? `${protocol}//${window.location.host}/ws/agent?projectId=${wsProjectId}&sessionId=${wsSessionId}`
      : `${protocol}//${window.location.host}/ws/agent?projectId=${wsProjectId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[AutonomousChatIntegration] WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleProgressEvent(data as AutonomousProgressEvent);
        } catch (err) {
          console.warn('[AutonomousChatIntegration] Failed to parse message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[AutonomousChatIntegration] WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('[AutonomousChatIntegration] WebSocket closed');
      };
    } catch (err) {
      console.error('[AutonomousChatIntegration] Failed to connect WebSocket:', err);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [enabled, conversationId, projectId, sessionId, bootstrapToken, handleProgressEvent, decodeToken, buildStore]);

  const sendBuildModeSelection = useCallback((mode: 'design-first' | 'full-app') => {
    buildStore.setBuildMode(mode);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'build_mode_selected',
        mode,
        projectId
      }));
    }
  }, [projectId, buildStore]);

  const requestPlanChange = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'change_plan_request',
        projectId
      }));
    }
  }, [projectId]);

  return {
    sendBuildModeSelection,
    requestPlanChange,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
}

export default useAutonomousChatIntegration;
