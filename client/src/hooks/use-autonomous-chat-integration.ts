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
import { AgentEventBus } from '@/lib/agentEvents';
import type { Message, AutonomousWorkspacePayload, AutonomousBuildTask } from '@/stores/agentConversationStore';
import type { AutonomousBuildPhase } from '@/stores/autonomousBuildStore';

interface AutonomousProgressEvent {
  type: 'planning' | 'plan_ready' | 'awaiting_approval' | 'executing' | 'step_update' | 'complete' | 'error' | 'connected' | 'status' | 'plan_chunk' | 'plan_generated' | 'task_start' | 'task_progress' | 'task_complete' | 'step' | 'summary' | 'file_created' | 'command_output' | 'agent_message' | 'step_start' | 'step_complete' | 'checkpoint_created';
  projectId?: number;
  sessionId?: string;
  status?: string;
  phaseName?: string;
  progress?: number;
  message?: string;
  taskId?: string;
  taskName?: string;
  plan?: any;
  // Direct step/summary payloads from server
  step?: {
    id: string;
    type: string;
    title: string;
    status?: string;
    details?: string[];
    output?: string;
  };
  summary?: {
    title?: string;
    content: string;
    filesCreated?: string[];
    filesModified?: string[];
  };
  filePath?: string;
  fileName?: string;
  content?: string;
  command?: string;
  output?: string;
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
  conversationId: externalConversationId,
  projectId,
  sessionId,
  enabled = true,
  bootstrapToken
}: UseAutonomousChatIntegrationOptions) {
  const { addMessage, updateMessage } = useAgentConversationStore();
  const wsRef = useRef<WebSocket | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const planTextRef = useRef<string>('');
  const hasConnectedRef = useRef(false);
  
  // Reconnection logic with exponential backoff
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 10;
  const baseReconnectDelayMs = 1000; // 1 second initial delay, doubles each attempt
  
  // Generate a STABLE temporary conversation ID for autonomous bootstrap flow
  // This allows messages to be added to the store even before the backend provides a real ID
  // CRITICAL: Use projectId-based ID so messages persist across page refreshes
  const tempConversationIdRef = useRef<number | null>(null);
  if (!tempConversationIdRef.current && bootstrapToken && projectId) {
    // Use a negative projectId to avoid collision with real IDs but ensure stability
    // Same projectId will always get the same tempConversationId
    tempConversationIdRef.current = -projectId;
    console.log('[AutonomousChatIntegration] 🆔 Generated STABLE temp conversationId:', tempConversationIdRef.current, 'for projectId:', projectId);
  }
  
  // Use external conversationId if available, otherwise use temp ID for bootstrap flow
  const conversationId = externalConversationId ?? tempConversationIdRef.current;

  // DEBUG: Log on every render with COMPLETE state
  console.log('[AutonomousChatIntegration] 🔄 Hook render:', {
    externalConversationId,
    tempConversationId: tempConversationIdRef.current,
    finalConversationId: conversationId,
    projectId,
    enabled,
    hasBootstrapToken: !!bootstrapToken,
    willConnectWebSocket: enabled && conversationId && projectId
  });

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

  // Use ref to store handleProgressEvent to avoid dependency changes triggering re-connections
  const handleProgressEventRef = useRef<((event: AutonomousProgressEvent) => void) | null>(null);
  
  handleProgressEventRef.current = (event: AutonomousProgressEvent) => {
    if (!conversationId) return;

    // Get store state directly to avoid dependency on buildStore object
    const store = useAutonomousBuildStore.getState();
    const { type, data, status, phaseName, progress: eventProgress, message: eventMessage, taskId, taskName, plan } = event;
    
    switch (type) {
      case 'connected': {
        store.setPhase('planning');
        store.setCurrentTask('Connected to AI agent');
        store.setProgress(5);
        
        // Emit connected event for favicon/audio/notifications
        AgentEventBus.emit('agent:connected', { projectId, sessionId });
        AgentEventBus.emit('agent:status', { status: 'working', phase: 'planning' });
        
        // Add welcome message to chat
        const connectedMsg = createAutonomousMessage(
          'autonomous_working',
          '🔗 Connected to AI agent. Starting workspace creation...',
          {
            phase: 'planning',
            progress: 5
          }
        );
        addMessage(conversationId, connectedMsg);
        lastMessageIdRef.current = connectedMsg.id;
        console.log('[AutonomousChatIntegration] ✅ Added connected message to chat:', connectedMsg.id);
        break;
      }

      case 'status': {
        const splashPhase = mapPhaseToSplashPhase(status);
        store.setPhase(splashPhase);
        store.setCurrentTask(phaseName || eventMessage || 'Processing...');
        if (eventProgress !== undefined) {
          store.setProgress(eventProgress);
        }
        
        // Emit status event for favicon/audio/notifications
        AgentEventBus.emit('agent:status', { status: splashPhase, phase: status, progress: eventProgress });
        
        // Map splash phase to payload phase (AutonomousWorkspacePayload only accepts specific phases)
        const payloadPhase: 'planning' | 'awaiting_approval' | 'executing' | 'complete' | 'error' = 
          splashPhase === 'planning' ? 'planning' :
          splashPhase === 'complete' ? 'complete' :
          splashPhase === 'error' ? 'error' : 'executing';
        
        // Add status update message to chat (update existing if same phase, or add new)
        const statusContent = phaseName || eventMessage || `${splashPhase}...`;
        const statusMsg = createAutonomousMessage(
          'autonomous_working',
          statusContent,
          {
            phase: payloadPhase,
            progress: eventProgress || store.progress
          }
        );
        
        // Update existing message or add new one based on phase changes
        if (lastMessageIdRef.current && splashPhase === store.phase) {
          updateMessage(conversationId, lastMessageIdRef.current, {
            content: statusContent,
            autonomousPayload: { phase: payloadPhase, progress: eventProgress || store.progress }
          });
        } else {
          addMessage(conversationId, statusMsg);
          lastMessageIdRef.current = statusMsg.id;
        }
        console.log('[AutonomousChatIntegration] ✅ Status update:', { status, phaseName, progress: eventProgress });
        break;
      }

      case 'planning': {
        store.setPhase('planning');
        store.setCurrentTask(data?.searchQuery ? `Searching for "${data.searchQuery}"...` : 'Analyzing your request...');
        
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
          store.setPlan({ planText: planTextRef.current });
          store.setProgress(Math.min(30, store.progress + 0.5));
        }
        break;
      }

      case 'plan_generated': {
        if (plan) {
          const features = plan.tasks?.map((t: any) => t.description || t.name) || [];
          const planTitle = plan.summary || 'Generated Plan';
          store.setPlan({
            planTitle,
            featureList: features,
            planText: planTextRef.current
          });
          store.setPhase('scaffolding');
          store.setProgress(35);
          
          // Create rich inline plan card message
          const planMsg = createAutonomousMessage(
            'autonomous_plan',
            "I've created a plan for your app:",
            {
              phase: 'awaiting_approval',
              planTitle,
              featureList: features,
              planText: planTextRef.current,
              appType: plan.appType || 'web-app'
            }
          );
          addMessage(conversationId, planMsg);
          lastMessageIdRef.current = planMsg.id;
          console.log('[AutonomousChatIntegration] ✅ Added plan_generated message with features:', features.length);
        }
        break;
      }

      case 'plan_ready': {
        store.setPhase('scaffolding');
        store.setPlan({
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
          const newTask: AutonomousBuildTask = {
            id: taskId,
            name: taskName,
            status: 'in_progress'
          };
          const updatedTasks = [...store.tasks, newTask];
          store.setTasks(updatedTasks);
          store.setCurrentTask(taskName);
          store.setPhase('building');
          
          // Create or update progress message
          if (lastMessageIdRef.current) {
            updateMessage(conversationId, lastMessageIdRef.current, {
              content: `Working on: ${taskName}`,
              isStreaming: true,
              autonomousPayload: {
                phase: 'executing',
                currentTask: taskName,
                progress: store.progress,
                tasks: updatedTasks
              }
            });
          } else {
            const msg = createAutonomousMessage(
              'autonomous_progress',
              `Working on: ${taskName}`,
              {
                phase: 'executing',
                currentTask: taskName,
                progress: store.progress,
                tasks: updatedTasks
              }
            );
            addMessage(conversationId, msg);
            lastMessageIdRef.current = msg.id;
          }
          console.log('[AutonomousChatIntegration] ✅ Task started:', taskName);
        }
        break;
      }

      case 'task_progress': {
        if (taskId && eventProgress !== undefined) {
          store.updateTask(taskId, { progress: eventProgress });
          
          // Update existing progress message
          if (lastMessageIdRef.current) {
            updateMessage(conversationId, lastMessageIdRef.current, {
              autonomousPayload: {
                phase: 'executing',
                currentTask: store.currentTask || undefined,
                progress: store.progress,
                tasks: store.tasks
              }
            });
          }
        }
        break;
      }

      case 'task_complete': {
        if (taskId) {
          store.updateTask(taskId, { status: 'completed', progress: 100 });
          const completedCount = store.tasks.filter(t => t.status === 'completed').length + 1;
          const totalTasks = store.tasks.length;
          let newProgress = store.progress;
          if (totalTasks > 0) {
            newProgress = Math.min(95, 35 + (completedCount / totalTasks) * 60);
            store.setProgress(newProgress);
          }
          
          // Update progress message with completed task
          if (lastMessageIdRef.current) {
            updateMessage(conversationId, lastMessageIdRef.current, {
              content: `Completed: ${taskName || taskId}`,
              autonomousPayload: {
                phase: 'executing',
                currentTask: `Completed: ${taskName || taskId}`,
                progress: newProgress,
                tasks: store.tasks
              }
            });
          }
          console.log('[AutonomousChatIntegration] ✅ Task completed:', taskId);
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

        store.setPhase('building');
        store.setTasks(tasks);
        store.setCurrentTask(data?.currentTask || 'Building...');
        if (data?.progress !== undefined) {
          store.setProgress(data.progress);
        }
        if (data?.buildMode) {
          store.setBuildMode(data.buildMode);
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
        store.setComplete();
        
        // Emit complete event for favicon/audio/notifications
        AgentEventBus.emit('agent:complete', { projectId, sessionId });
        AgentEventBus.emit('agent:status', { status: 'complete' });
        
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
        store.setError(errorMsg);
        
        // Emit error event for favicon/audio/notifications
        AgentEventBus.emit('agent:error', { projectId, sessionId, message: errorMsg });
        AgentEventBus.emit('agent:status', { status: 'error' });

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

      // Handle step updates from workflow execution
      case 'step': {
        const stepData = event.step;
        if (stepData) {
          store.setCurrentTask(stepData.title || 'Processing step...');
          store.setPhase('building');
          
          // Update or create progress message
          if (lastMessageIdRef.current) {
            updateMessage(conversationId, lastMessageIdRef.current, {
              content: `📝 ${stepData.title}`,
              isStreaming: true,
              autonomousPayload: {
                phase: 'executing',
                currentTask: stepData.title,
                progress: store.progress
              }
            });
          } else {
            const msg = createAutonomousMessage(
              'autonomous_progress',
              `📝 ${stepData.title}`,
              {
                phase: 'executing',
                currentTask: stepData.title,
                progress: store.progress
              }
            );
            addMessage(conversationId, msg);
            lastMessageIdRef.current = msg.id;
          }
          console.log('[AutonomousChatIntegration] ✅ Step update:', stepData.title);
        }
        break;
      }

      // Handle summary updates (usually at end of phases)
      case 'summary': {
        const summaryData = event.summary;
        if (summaryData) {
          const content = summaryData.content || summaryData.title || 'Summary';
          
          // Create a new summary message
          const msg = createAutonomousMessage(
            'autonomous_progress',
            `📊 ${content}`,
            {
              phase: 'executing',
              currentTask: content,
              progress: store.progress
            }
          );
          addMessage(conversationId, msg);
          lastMessageIdRef.current = msg.id;
          console.log('[AutonomousChatIntegration] ✅ Summary:', content);
        }
        break;
      }

      // Handle file creation notifications
      case 'file_created': {
        const fileName = event.fileName || event.filePath;
        if (fileName) {
          // Emit file created event for notifications
          AgentEventBus.emit('agent:file-created', { filename: fileName, projectId });
          
          // Compute new progress BEFORE setting to store (avoid stale snapshot)
          const newProgress = Math.min(store.progress + 2, 95);
          store.setProgress(newProgress);
          
          // Update existing progress message with file creation info
          if (lastMessageIdRef.current) {
            updateMessage(conversationId, lastMessageIdRef.current, {
              content: `📄 Created: ${fileName}`,
              isStreaming: true,
              autonomousPayload: {
                phase: 'executing',
                currentTask: `Created: ${fileName}`,
                progress: newProgress
              }
            });
          } else {
            const msg = createAutonomousMessage(
              'autonomous_progress',
              `📄 Created: ${fileName}`,
              {
                phase: 'executing',
                currentTask: `Created: ${fileName}`,
                progress: newProgress
              }
            );
            addMessage(conversationId, msg);
            lastMessageIdRef.current = msg.id;
          }
          console.log('[AutonomousChatIntegration] ✅ File created:', fileName);
        }
        break;
      }

      // Handle command output (terminal commands)
      case 'command_output': {
        const cmd = event.command;
        if (cmd) {
          if (lastMessageIdRef.current) {
            updateMessage(conversationId, lastMessageIdRef.current, {
              content: `💻 Running: ${cmd}`,
              isStreaming: true,
              autonomousPayload: {
                phase: 'executing',
                currentTask: `Running: ${cmd}`,
                progress: store.progress
              }
            });
          }
        }
        break;
      }

      // Handle agent messages (thinking/reasoning)
      case 'agent_message': {
        const msgContent = event.content || eventMessage;
        if (msgContent) {
          const msg = createAutonomousMessage(
            'autonomous_working',
            `💭 ${msgContent}`,
            {
              phase: 'executing',
              currentTask: msgContent,
              progress: store.progress
            }
          );
          addMessage(conversationId, msg);
          console.log('[AutonomousChatIntegration] ✅ Agent message:', msgContent.substring(0, 50));
        }
        break;
      }

      // Handle step_start from workflow engine
      case 'step_start': {
        const stepTitle = data?.stepTitle || data?.stepType || 'Working on step...';
        store.setPhase('building');
        store.setCurrentTask(stepTitle);
        
        // Update or create progress message
        if (lastMessageIdRef.current) {
          updateMessage(conversationId, lastMessageIdRef.current, {
            content: `🔧 ${stepTitle}`,
            isStreaming: true,
            autonomousPayload: {
              phase: 'executing',
              currentTask: stepTitle,
              progress: store.progress
            }
          });
        } else {
          const msg = createAutonomousMessage(
            'autonomous_progress',
            `🔧 ${stepTitle}`,
            {
              phase: 'executing',
              currentTask: stepTitle,
              progress: store.progress
            }
          );
          addMessage(conversationId, msg);
          lastMessageIdRef.current = msg.id;
        }
        console.log('[AutonomousChatIntegration] ✅ Step started:', stepTitle);
        break;
      }

      // Handle step_complete from workflow engine
      case 'step_complete': {
        const completedStep = data?.stepTitle || data?.stepType || 'Step';
        // Compute new progress BEFORE setting to store (avoid stale snapshot)
        const newProgress = Math.min(store.progress + 5, 95);
        store.setProgress(newProgress);
        
        // Update progress message with completed step using computed newProgress
        if (lastMessageIdRef.current) {
          updateMessage(conversationId, lastMessageIdRef.current, {
            content: `✅ Completed: ${completedStep}`,
            isStreaming: true,
            autonomousPayload: {
              phase: 'executing',
              currentTask: `Completed: ${completedStep}`,
              progress: newProgress
            }
          });
        }
        console.log('[AutonomousChatIntegration] ✅ Step completed:', completedStep, 'Progress:', newProgress);
        break;
      }

      // Handle checkpoint creation notifications
      case 'checkpoint_created': {
        console.log('[AutonomousChatIntegration] ✅ Checkpoint created');
        // Silent - don't create message for checkpoint (internal state)
        break;
      }
    }
  };

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
    // DEBUG: Log activation conditions IMMEDIATELY
    console.log('[AutonomousChatIntegration] ⚡ useEffect TRIGGERED:', {
      enabled,
      conversationId,
      projectId,
      hasBootstrapToken: !!bootstrapToken
    });
    
    if (!enabled) {
      console.log('[AutonomousChatIntegration] ❌ Skipping - not enabled');
      return;
    }
    
    if (!conversationId) {
      console.log('[AutonomousChatIntegration] ❌ Skipping - no conversationId');
      return;
    }
    
    let wsProjectId = projectId;
    let wsSessionId = sessionId;
    
    // Try to extract from bootstrap token if not provided directly
    if (bootstrapToken && (!wsProjectId || !wsSessionId)) {
      const tokenData = decodeToken(bootstrapToken);
      console.log('[AutonomousChatIntegration] 🔑 Decoded token:', tokenData);
      if (tokenData) {
        wsProjectId = wsProjectId || tokenData.projectId;
        wsSessionId = wsSessionId || tokenData.sessionId;
      }
    }
    
    if (!wsProjectId) {
      console.log('[AutonomousChatIntegration] ❌ Skipping - no projectId');
      return;
    }
    
    console.log('[AutonomousChatIntegration] ✅ All conditions met, proceeding with WebSocket connection');

    // Initialize build store directly via getState to avoid dependency issues (only once)
    if (!hasConnectedRef.current) {
      useAutonomousBuildStore.getState().startBuild({ 
        projectId: wsProjectId, 
        sessionId: wsSessionId || undefined, 
        conversationId 
      });
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Build WebSocket URL with all necessary parameters
    // FIXED (Dec 11, 2025): Use /ws/agent path, NOT /?channel=agent
    // Reason: Replit's edge proxy routes /ws/* paths correctly, but root path with query params fails
    // Evidence: Server logs show /ws/agent connections succeed, but /?channel=agent returns channel:null
    const params = new URLSearchParams();
    params.set('projectId', String(wsProjectId));
    if (wsSessionId) params.set('sessionId', wsSessionId);
    // Include bootstrap token for server-side authentication
    if (bootstrapToken) params.set('bootstrap', bootstrapToken);
    
    const wsUrl = `${protocol}//${window.location.host}/ws/agent?${params.toString()}`;

    // Connection function for initial connect and reconnects
    const connectWebSocket = () => {
      // Prevent duplicate connections
      if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
        console.log('[AutonomousChatIntegration] WebSocket already open or connecting, skipping');
        return;
      }

      console.log('[AutonomousChatIntegration] 🚀 Connecting to WebSocket:', wsUrl.substring(0, 100) + '...', 
        `(attempt ${reconnectAttemptRef.current + 1}/${maxReconnectAttempts})`);

      try {
        console.log('[AutonomousChatIntegration] 📡 Creating WebSocket instance...');
        const ws = new WebSocket(wsUrl);
        console.log('[AutonomousChatIntegration] 📡 WebSocket created, initial readyState:', ws.readyState);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[AutonomousChatIntegration] ✅ WebSocket connected successfully, readyState:', ws.readyState);
          hasConnectedRef.current = true;
          reconnectAttemptRef.current = 0; // Reset reconnect counter on success
        };

        ws.onmessage = (event) => {
          console.log('[AutonomousChatIntegration] 📥 Message received:', event.data.substring(0, 100) + '...');
          try {
            const data = JSON.parse(event.data);
            console.log('[AutonomousChatIntegration] 📥 Parsed message type:', data.type);
            // Use ref to call handler to avoid stale closure issues
            handleProgressEventRef.current?.(data as AutonomousProgressEvent);
          } catch (err) {
            console.warn('[AutonomousChatIntegration] Failed to parse message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('[AutonomousChatIntegration] ❌ WebSocket error:', error, 'readyState:', ws.readyState);
          // Note: onclose will be called after onerror, which will trigger reconnect
        };

        ws.onclose = (event) => {
          console.log('[AutonomousChatIntegration] WebSocket closed:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          hasConnectedRef.current = false;
          wsRef.current = null;
          
          // Emit disconnected event for favicon reset
          AgentEventBus.emit('agent:disconnected', { code: event.code, reason: event.reason });
          
          // Attempt reconnection if not intentionally closed (code 1000) and under max attempts
          if (event.code !== 1000 && reconnectAttemptRef.current < maxReconnectAttempts) {
            reconnectAttemptRef.current++;
            const delay = Math.min(baseReconnectDelayMs * Math.pow(2, reconnectAttemptRef.current - 1), 30000);
            console.log(`[AutonomousChatIntegration] Scheduling reconnect in ${delay}ms (attempt ${reconnectAttemptRef.current}/${maxReconnectAttempts})`);
            
            // Clear any existing timeout
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connectWebSocket();
            }, delay);
          } else if (reconnectAttemptRef.current >= maxReconnectAttempts) {
            console.error('[AutonomousChatIntegration] Max reconnection attempts reached, giving up');
            useAutonomousBuildStore.getState().setError('Connection lost. Please refresh the page.');
          }
        };
      } catch (err) {
        console.error('[AutonomousChatIntegration] Failed to connect WebSocket:', err);
        hasConnectedRef.current = false;
      }
    };

    // Initial connection
    connectWebSocket();

    return () => {
      // Clear reconnection timeout on cleanup
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted'); // Clean close
        wsRef.current = null;
      }
      hasConnectedRef.current = false;
      reconnectAttemptRef.current = 0;
    };
  // Only depend on stable values - not on callbacks or store objects
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, conversationId, projectId, sessionId, bootstrapToken]);

  const sendBuildModeSelection = useCallback((mode: 'design-first' | 'full-app') => {
    useAutonomousBuildStore.getState().setBuildMode(mode);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'build_mode_selected',
        mode,
        projectId
      }));
    }
  }, [projectId]);

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
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    // Expose effective conversationId for parent components to use when displaying messages
    effectiveConversationId: conversationId,
    // Flag to indicate if we're using a temporary ID (for bootstrap flow)
    isUsingTempConversationId: conversationId !== null && conversationId < 0
  };
}

export default useAutonomousChatIntegration;
