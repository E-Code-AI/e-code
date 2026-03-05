/**
 * Hook to integrate autonomous workspace WebSocket events with chat messages
 * 
 * Converts autonomous workspace progress events into inline chat messages
 * for a Replit-style inline chat experience
 * 
 * Also updates the shared autonomousBuildStore for PreviewPanel splash screens
 */

import { useEffect, useLayoutEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useAgentConversationStore } from '@/stores/agentConversationStore';
import { useAutonomousBuildStore } from '@/stores/autonomousBuildStore';
import { useSchemaWarmingStore } from '@/stores/schemaWarmingStore';
import { AgentEventBus } from '@/lib/agentEvents';
import type { Message, AutonomousWorkspacePayload, AutonomousBuildTask } from '@/stores/agentConversationStore';
import type { AutonomousBuildPhase } from '@/stores/autonomousBuildStore';

interface AutonomousProgressEvent {
  type: 'planning' | 'plan_ready' | 'awaiting_approval' | 'executing' | 'step_update' | 'complete' | 'error' | 'connected' | 'status' | 'plan_chunk' | 'plan_generated' | 'task_start' | 'task_progress' | 'task_complete' | 'step' | 'summary' | 'file_created' | 'command_output' | 'agent_message' | 'step_start' | 'step_complete' | 'checkpoint_created' | 'autonomous_timeline_event' | 'autonomous_checkpoint' | 'autonomous_task_list' | 'autonomous_preview' | 'autonomous_file_operation' | 'post_validation_start' | 'install_dependencies_start' | 'install_dependencies_complete' | 'verify_build_start' | 'verify_build_complete' | 'responsive_qa_start' | 'responsive_qa_complete';
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
    stepTitle?: string;
    stepType?: string;
  };
  event?: {
    id: string;
    type: 'file_create' | 'file_edit' | 'file_delete' | 'command' | 'checkpoint' | 'info';
    title: string;
    description?: string;
    timestamp: string;
    filePath?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'error';
  };
  checkpoint?: {
    title: string;
    description?: string;
    number?: number;
    completedTasks?: number;
    totalTasks?: number;
    eta?: string;
  };
  taskList?: {
    title?: string;
    items: Array<{
      id: string;
      title: string;
      status: 'pending' | 'in_progress' | 'completed' | 'error';
      filePath?: string;
      duration?: number;
    }>;
    showProgress?: boolean;
    compact?: boolean;
  };
  preview?: {
    url?: string;
    title?: string;
    isLoading?: boolean;
    isLive?: boolean;
  };
  fileOperation?: {
    type: 'create' | 'update' | 'delete' | 'rename';
    filePath: string;
    language?: string;
    content?: string;
    linesAdded?: number;
    linesRemoved?: number;
  };
  timestamp?: string;
  success?: boolean;
  dependencies?: {
    installed: string[];
    failed: string[];
    total: number;
  };
  buildResult?: {
    success: boolean;
    errors?: string[];
    warnings?: string[];
  };
  qaResult?: {
    score: number;
    breakpoints: {
      name: string;
      width: number;
      passed: boolean;
      issues?: string[];
    }[];
    totalTests: number;
    passedTests: number;
  };
}

interface UseAutonomousChatIntegrationOptions {
  conversationId: number | null;
  projectId?: number;
  sessionId?: string | null;
  enabled?: boolean;
  bootstrapToken?: string | null;
  initialPrompt?: string | null;
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
  bootstrapToken,
  initialPrompt
}: UseAutonomousChatIntegrationOptions) {
  const { addMessage, updateMessage, setMessages } = useAgentConversationStore();
  const wsRef = useRef<WebSocket | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const planTextRef = useRef<string>('');
  const hasConnectedRef = useRef(false);
  // ✅ NEW (Jan 26, 2026): Track task list message ID for in-place updates (Fortune 500 UX)
  const taskListMessageIdRef = useRef<string | null>(null);
  const hasAddedUserPromptRef = useRef(false);
  const effectRanRef = useRef(false);
  const layoutEffectConnectedRef = useRef(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const connectFnRef = useRef<(() => void) | null>(null);
  
  // ✅ FIX (Jan 2026): Fortune 500-grade WebSocket stability for mobile bootstrap
  // Problem: On iOS WebView (Replit-Bonsai), inlineMode toggles cause transient `enabled` changes
  // that trigger React cleanup, disconnecting WebSocket at ~35% progress
  
  // Track if we're in an active bootstrap build
  const bootstrapActiveRef = useRef(false);
  
  // Track if build reached a terminal state (complete, error)
  const buildCompletedRef = useRef(false);
  
  // ✅ CRITICAL: Intentional teardown flag - set by unmount useLayoutEffect at end of hook
  // React cleanup runs in REVERSE order, so the last useLayoutEffect cleanup runs FIRST
  // This ensures intentionalTeardownRef is true before other cleanups check it
  const intentionalTeardownRef = useRef(false);
  
  // Previous enabled value to detect transitions
  const prevEnabledRef = useRef(enabled);
  
  const [connectionState, setConnectionState] = useState<{
    isConnected: boolean;
    error: string | null;
    reconnectAttempt: number;
    maxReconnectAttempts: number;
  }>({
    isConnected: false,
    error: null,
    reconnectAttempt: 0,
    maxReconnectAttempts: 10
  });
  
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

  // ✅ CRITICAL FIX (Dec 12, 2025): Resolve prompt from multiple sources
  // The prop might be null, but the prompt might be in sessionStorage
  // Priority: prop > URL param > sessionStorage
  const resolvedPrompt = useMemo(() => {
    if (initialPrompt) return initialPrompt;
    
    // Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const promptFromUrl = urlParams.get('prompt');
    if (promptFromUrl) return promptFromUrl;
    
    // Check sessionStorage (bootstrap flow stores prompt here)
    if (projectId) {
      const promptFromSession = window.sessionStorage.getItem(`agent-prompt-${projectId}`);
      if (promptFromSession) return promptFromSession;
    }
    
    return null;
  }, [initialPrompt, projectId]);

  // 🔍 MOUNT TRACKING (useLayoutEffect): Runs synchronously BEFORE paint for early detection
  // This helps diagnose if the issue is useEffect timing vs component not committing
  useLayoutEffect(() => {
    isMountedRef.current = true;
    
    // Write to sessionStorage for mobile WebView debugging (useLayoutEffect timing)
    try {
      sessionStorage.setItem('autonomousChatEffect_layoutEffectRan', String(Date.now()));
    } catch (e) { /* ignore */ }
    console.warn('[AutonomousChatIntegration] 🧪 DIAGNOSTIC: useLayoutEffect EXECUTED (synchronous, before paint)');
    
    return () => {
      isMountedRef.current = false;
      console.warn('[AutonomousChatIntegration] 🧪 DIAGNOSTIC: useLayoutEffect cleanup on unmount');
      
      // Note: intentionalTeardownRef is set by the LAST useLayoutEffect (at end of hook)
      // which runs FIRST during unmount due to React's reverse cleanup order
      
      // 🆘 CLEANUP: Cancel any pending fallback timer on unmount
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, []);

  // 🔍 DIAGNOSTIC (useEffect): Runs after paint - compare timing with useLayoutEffect
  useEffect(() => {
    try {
      sessionStorage.setItem('autonomousChatEffect_diagnosticRan', String(Date.now()));
    } catch (e) { /* ignore */ }
    console.warn('[AutonomousChatIntegration] 🧪 DIAGNOSTIC: useEffect with [] deps EXECUTED (async, after paint)');
  }, []);

  // Decode bootstrap token to extract session info (memoized for use in both effects)
  const decodeTokenFn = useCallback((token: string) => {
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

  // 🚀 AGGRESSIVE FALLBACK (useLayoutEffect): Attempt WebSocket connection synchronously
  // This runs BEFORE useEffect, ensuring connection happens even if useEffect is delayed
  // Critical for mobile WebView where useEffect may not run reliably
  useLayoutEffect(() => {
    // ✅ FIX (Jan 2026): Track enabled transitions for cleanup decisions
    const wasEnabled = prevEnabledRef.current;
    prevEnabledRef.current = enabled;
    
    // Note: We no longer use debounced cleanup - instead we skip cleanup entirely during active bootstrap
    // The socket is only closed by: genuine disable (below), component unmount, or build completion
    
    // ✅ FIX (Jan 2026): Handle genuine disable BEFORE early return
    // This runs AFTER the previous effect's cleanup (which skipped during active bootstrap)
    // If enabled=false but socket is still open, this is a genuine disable - close now
    if (!enabled && wsRef.current) {
      console.log('[AutonomousChatIntegration] ⚠️ Genuine disable detected - closing WebSocket immediately');
      // Close WebSocket synchronously
      wsRef.current.close(1000, 'genuine-disable');
      wsRef.current = null;
      layoutEffectConnectedRef.current = false;
      hasConnectedRef.current = false;
      bootstrapActiveRef.current = false;
      intentionalTeardownRef.current = false;
    }
    
    // Only attempt connection if all conditions are met
    if (!enabled || !conversationId || !projectId) {
      return; // No cleanup needed if we never connected in this effect run
    }
    
    // Skip if already connected or connecting - return no-op cleanup (connection persists)
    if (hasConnectedRef.current || layoutEffectConnectedRef.current) {
      return; // Keep existing connection, main cleanup handles it
    }
    
    // Skip if WebSocket is already open - return no-op cleanup
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return; // Keep existing connection
    }
    
    console.warn('[AutonomousChatIntegration] 🚀 useLayoutEffect: Attempting AGGRESSIVE WebSocket connection (before paint)');
    
    try {
      sessionStorage.setItem('autonomousChatEffect_layoutEffectConnect', String(Date.now()));
    } catch (e) { /* ignore */ }
    
    // Resolve projectId/sessionId from token if needed
    let wsProjectId = projectId;
    let wsSessionId = sessionId;
    
    if (bootstrapToken && (!wsProjectId || !wsSessionId)) {
      const tokenData = decodeTokenFn(bootstrapToken);
      if (tokenData) {
        wsProjectId = wsProjectId || tokenData.projectId;
        wsSessionId = wsSessionId || tokenData.sessionId;
      }
    }
    
    if (!wsProjectId) {
      console.warn('[AutonomousChatIntegration] 🚀 useLayoutEffect: No projectId, skipping');
      return;
    }
    
    // Mark as attempting connection
    layoutEffectConnectedRef.current = true;
    
    // Initialize build store
    useAutonomousBuildStore.getState().startBuild({ 
      projectId: wsProjectId, 
      sessionId: wsSessionId || undefined, 
      conversationId 
    });
    
    // Build WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const params = new URLSearchParams();
    params.set('projectId', String(wsProjectId));
    if (wsSessionId) params.set('sessionId', wsSessionId);
    if (bootstrapToken) params.set('bootstrap', bootstrapToken);
    
    const wsUrl = `${protocol}//${window.location.host}/ws/agent?${params.toString()}`;
    
    console.warn('[AutonomousChatIntegration] 🚀 useLayoutEffect: Connecting to:', wsUrl.substring(0, 80) + '...');
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.warn('[AutonomousChatIntegration] 🚀 useLayoutEffect: WebSocket CONNECTED successfully!');
      hasConnectedRef.current = true;
      reconnectAttemptRef.current = 0;
      // ✅ FIX (Jan 2026): Mark bootstrap as active
      // This protects the connection from transient enabled toggles until build completes
      if (bootstrapToken) {
        bootstrapActiveRef.current = true;
        buildCompletedRef.current = false;
        // ✅ NEW (Jan 26, 2026): Reset task list message ID for new builds
        taskListMessageIdRef.current = null;
        console.log('[AutonomousChatIntegration] 🔒 Bootstrap ACTIVE - protecting from transient enabled toggles');
      }
      setConnectionState({ isConnected: true, error: null, reconnectAttempt: 0, maxReconnectAttempts: 10 });
      try {
        sessionStorage.setItem('autonomousChatEffect_layoutEffectConnected', String(Date.now()));
      } catch (e) { /* ignore */ }
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleProgressEventRef.current?.(data);
      } catch (err) {
        console.warn('[AutonomousChatIntegration] 🚀 useLayoutEffect: Failed to parse message:', err);
      }
    };
    
    ws.onerror = (error) => {
      console.error('[AutonomousChatIntegration] 🚀 useLayoutEffect: WebSocket error:', error);
      setConnectionState(prev => ({ ...prev, error: 'Connection error occurred' }));
    };
    
    ws.onclose = (event) => {
      console.warn('[AutonomousChatIntegration] 🚀 useLayoutEffect: WebSocket closed:', event.code, event.reason);
      hasConnectedRef.current = false;
      wsRef.current = null;
      
      // Emit disconnected event
      AgentEventBus.emit('agent:disconnected', { code: event.code, reason: event.reason });
      
      // Attempt reconnection with backoff (same logic as main effect)
      if (event.code !== 1000 && isMountedRef.current && reconnectAttemptRef.current < maxReconnectAttempts) {
        reconnectAttemptRef.current++;
        const delay = Math.min(baseReconnectDelayMs * Math.pow(2, reconnectAttemptRef.current - 1), 30000);
        console.log(`[AutonomousChatIntegration] 🚀 Scheduling reconnect in ${delay}ms`);
        // Clear error state when attempting reconnect so banner shows progress
        setConnectionState(prev => ({ 
          ...prev, 
          isConnected: false, 
          error: null,
          reconnectAttempt: reconnectAttemptRef.current 
        }));
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && connectFnRef.current) {
            connectFnRef.current();
          }
        }, delay);
      } else if (reconnectAttemptRef.current >= maxReconnectAttempts) {
        setConnectionState(prev => ({ 
          ...prev, 
          isConnected: false, 
          error: 'Maximum reconnection attempts reached. Click retry to try again.',
          reconnectAttempt: maxReconnectAttempts
        }));
      } else {
        setConnectionState(prev => ({ ...prev, isConnected: false }));
      }
    };
    
    return () => {
      // ✅ FIX (Jan 2026): Fortune 500-grade cleanup - NO TIMEOUT during active bootstrap
      // Problem: Any fixed timeout can be exceeded by iOS WebView stalls
      // Solution: NEVER close socket in cleanup during active bootstrap
      // Socket is ONLY closed by:
      //   1. Genuine disable (detected at start of new effect)
      //   2. Component unmount (intentionalTeardownRef=true)
      //   3. Build completion (buildCompletedRef=true)
      
      const isBootstrapActive = bootstrapActiveRef.current && 
        !buildCompletedRef.current && 
        bootstrapToken &&
        wsRef.current?.readyState === WebSocket.OPEN;
      
      // Telemetry for debugging
      console.warn('[AutonomousChatIntegration] 🧪 TELEMETRY: Cleanup triggered', {
        isBootstrapActive,
        intentionalTeardown: intentionalTeardownRef.current,
        buildCompleted: buildCompletedRef.current,
        wsState: wsRef.current?.readyState
      });
      
      // Always cleanup reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      const doCleanup = (reason: string) => {
        console.log(`[AutonomousChatIntegration] 🔓 Executing cleanup (reason: ${reason})`);
        layoutEffectConnectedRef.current = false;
        if (wsRef.current) {
          wsRef.current.close(1000, `cleanup: ${reason}`);
          wsRef.current = null;
        }
        hasConnectedRef.current = false;
        bootstrapActiveRef.current = false;
        intentionalTeardownRef.current = false;
      };
      
      // ✅ CRITICAL: During active bootstrap, NEVER close socket from cleanup
      // The socket will be closed by the new effect if it detects a genuine disable
      // This approach survives any main thread stall duration
      if (isBootstrapActive && !intentionalTeardownRef.current) {
        // DO NOTHING - socket stays open
        // The new effect will close it if enabled=false (genuine disable)
        // Or build completion handlers will reset bootstrapActiveRef
        console.log('[AutonomousChatIntegration] 🔒 Cleanup skipped - active bootstrap protected (stall-resilient)');
        return;
      }
      
      if (intentionalTeardownRef.current) {
        // Component unmount - cleanup immediately
        doCleanup('component-unmount');
      } else {
        // Not in active bootstrap - cleanup immediately
        doCleanup('bootstrap-inactive');
      }
    };
  }, [enabled, conversationId, projectId, sessionId, bootstrapToken, decodeTokenFn, maxReconnectAttempts, baseReconnectDelayMs]);

  // ✅ CRITICAL FIX (Dec 13, 2025): Add user's prompt IMMEDIATELY on hook init
  // This ensures the prompt is visible BEFORE WebSocket connects, not after
  // Solves: "Je dois voir mon prompt pas le message de bienvenu"
  // Uses setMessages to REPLACE any existing messages (like welcome message) with the user prompt
  useEffect(() => {
    if (!conversationId || !resolvedPrompt || hasAddedUserPromptRef.current) return;
    
    hasAddedUserPromptRef.current = true;
    const userPromptMsg: Message = {
      id: `user-prompt-${Date.now()}`,
      role: 'user',
      content: resolvedPrompt,
      timestamp: new Date(),
      type: 'text'
    };
    // Use setMessages to REPLACE messages, ensuring user prompt is FIRST
    // This clears any welcome message that may have been rehydrated from localStorage
    setMessages(conversationId, [userPromptMsg]);
    console.log('[AutonomousChatIntegration] ✅ IMMEDIATE: Set user prompt as FIRST message:', resolvedPrompt.substring(0, 50));
  }, [conversationId, resolvedPrompt, setMessages]);

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
        
        // NOTE: User's initial prompt is now added IMMEDIATELY via useEffect (lines 204-220)
        // This ensures the prompt is visible before WebSocket connects
        
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
        
        // ✅ FIX (Jan 2026): Mark build as completed - allows normal cleanup
        buildCompletedRef.current = true;
        bootstrapActiveRef.current = false;
        
        // Unlock preview/deploy tabs — schema warming gate not needed after build completes
        useSchemaWarmingStore.getState().markReady();
        
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
        
        // ✅ FIX (Jan 2026): Mark build as completed (with error) - allows normal cleanup
        buildCompletedRef.current = true;
        bootstrapActiveRef.current = false;
        
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

      // Post-build validation events (Task 6: Build/Install/QA progress indicators)
      case 'post_validation_start': {
        store.setCurrentTask('Running post-build validation...');
        store.setPhase('finalizing');
        
        const msg = createAutonomousMessage(
          'autonomous_working',
          '🔍 Running post-build validation...',
          { phase: 'executing', progress: store.progress }
        );
        addMessage(conversationId, msg);
        lastMessageIdRef.current = msg.id;
        console.log('[AutonomousChatIntegration] ✅ Post-validation started');
        break;
      }

      case 'install_dependencies_start': {
        store.setCurrentTask('Installing dependencies...');
        
        const msg = createAutonomousMessage(
          'autonomous_working',
          '📦 Installing dependencies...',
          { phase: 'executing', progress: store.progress }
        );
        addMessage(conversationId, msg);
        lastMessageIdRef.current = msg.id;
        console.log('[AutonomousChatIntegration] ✅ Dependency installation started');
        break;
      }

      case 'install_dependencies_complete': {
        const deps = event.dependencies;
        const success = event.success !== false && (!deps || deps.failed.length === 0);
        const statusIcon = success ? '✅' : '⚠️';
        const statusText = success 
          ? `${statusIcon} Dependencies installed successfully${deps ? ` (${deps.installed.length}/${deps.total})` : ''}`
          : `${statusIcon} Some dependencies failed to install${deps ? ` (${deps.failed.length} failed)` : ''}`;
        
        store.setCurrentTask(statusText);
        
        if (lastMessageIdRef.current) {
          updateMessage(conversationId, lastMessageIdRef.current, {
            content: statusText,
            isStreaming: false
          });
        }
        console.log('[AutonomousChatIntegration] ✅ Dependency installation complete:', { success, deps });
        break;
      }

      case 'verify_build_start': {
        store.setCurrentTask('Verifying build...');
        
        const msg = createAutonomousMessage(
          'autonomous_working',
          '🔨 Verifying build...',
          { phase: 'executing', progress: store.progress }
        );
        addMessage(conversationId, msg);
        lastMessageIdRef.current = msg.id;
        console.log('[AutonomousChatIntegration] ✅ Build verification started');
        break;
      }

      case 'verify_build_complete': {
        const result = event.buildResult;
        const success = event.success !== false && (!result || result.success);
        const statusIcon = success ? '✅' : '❌';
        let statusText = success 
          ? `${statusIcon} Build verified successfully`
          : `${statusIcon} Build verification failed`;
        
        if (result?.errors?.length) {
          statusText += `\n\nErrors:\n${result.errors.slice(0, 3).map(e => `• ${e}`).join('\n')}`;
        }
        if (result?.warnings?.length) {
          statusText += `\n\nWarnings: ${result.warnings.length}`;
        }
        
        store.setCurrentTask(success ? 'Build verified' : 'Build failed');
        
        if (lastMessageIdRef.current) {
          updateMessage(conversationId, lastMessageIdRef.current, {
            content: statusText,
            isStreaming: false,
            status: success ? undefined : 'error'
          });
        }
        console.log('[AutonomousChatIntegration] ✅ Build verification complete:', { success, result });
        break;
      }

      case 'responsive_qa_start': {
        store.setCurrentTask('Running responsive QA...');
        
        const msg = createAutonomousMessage(
          'autonomous_working',
          '📱 Running responsive QA tests...',
          { phase: 'executing', progress: store.progress }
        );
        addMessage(conversationId, msg);
        lastMessageIdRef.current = msg.id;
        console.log('[AutonomousChatIntegration] ✅ Responsive QA started');
        break;
      }

      case 'responsive_qa_complete': {
        const qa = event.qaResult;
        const score = qa?.score ?? 0;
        const scorePercent = Math.round(score * 100);
        const scoreIcon = scorePercent >= 80 ? '🟢' : scorePercent >= 50 ? '🟡' : '🔴';
        
        let statusText = `${scoreIcon} Responsive QA Score: ${scorePercent}%`;
        if (qa?.passedTests !== undefined && qa?.totalTests !== undefined) {
          statusText += ` (${qa.passedTests}/${qa.totalTests} tests passed)`;
        }
        
        if (qa?.breakpoints?.length) {
          statusText += '\n\n**Breakpoint Results:**\n';
          statusText += qa.breakpoints.map(bp => {
            const icon = bp.passed ? '✅' : '❌';
            let line = `${icon} ${bp.name} (${bp.width}px)`;
            if (!bp.passed && bp.issues?.length) {
              line += `: ${bp.issues[0]}`;
            }
            return line;
          }).join('\n');
        }
        
        store.setCurrentTask(`QA Score: ${scorePercent}%`);
        
        if (lastMessageIdRef.current) {
          updateMessage(conversationId, lastMessageIdRef.current, {
            content: statusText,
            isStreaming: false
          });
        }
        console.log('[AutonomousChatIntegration] ✅ Responsive QA complete:', { score: scorePercent, qa });
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

      // Handle checkpoint creation notifications - create inline chat card
      case 'checkpoint_created': {
        const checkpointData = event.checkpoint || (event as any);
        // ✅ FIX: Server emits checkpoint ID as `stepId` (string), not `id` or `checkpointId`
        // Priority: event.stepId > checkpointData.stepId > checkpointData.id > checkpointData.checkpointId
        const rawCheckpointId = (event as any).stepId || checkpointData.stepId || checkpointData.id || checkpointData.checkpointId;
        const checkpointId = rawCheckpointId ? (typeof rawCheckpointId === 'string' ? parseInt(rawCheckpointId, 10) : rawCheckpointId) : undefined;
        const aiSummary = checkpointData.aiSummary || checkpointData.summary || checkpointData.title;
        const filesCount = checkpointData.filesCount || checkpointData.fileCount;
        const createdAt = checkpointData.createdAt || event.timestamp || new Date().toISOString();
        const checkpointType = checkpointData.type || 'auto';
        
        if (checkpointId) {
          const checkpointMsg: Message = {
            id: `checkpoint-${checkpointId}-${Date.now()}`,
            role: 'assistant',
            content: aiSummary || `Checkpoint #${checkpointId} created`,
            timestamp: new Date(createdAt),
            type: 'auto_checkpoint_created',
            autoCheckpoint: {
              id: checkpointId,
              aiSummary,
              filesCount,
              createdAt,
              type: checkpointType
            }
          };
          addMessage(conversationId, checkpointMsg);
          console.log('[AutonomousChatIntegration] ✅ Checkpoint created message added:', checkpointId);
        } else {
          console.log('[AutonomousChatIntegration] ⚠️ Checkpoint event without ID:', event);
        }
        break;
      }

      // ============================================================================
      // ✅ NEW: Replit Agent 2024 Inline Progress Messages (Dec 12, 2025)
      // These handlers convert WebSocket events into rich inline chat components
      // ============================================================================

      // Handle timeline event (file operations, commands, etc.)
      case 'autonomous_timeline_event': {
        const timelineEvent = event.event;
        if (timelineEvent) {
          // Create a new message with timeline payload
          const msg = createAutonomousMessage(
            'autonomous_timeline',
            `${timelineEvent.title}`,
            {
              phase: 'executing',
              progress: store.progress,
              timeline: {
                events: [timelineEvent],
                maxHeight: '200px'
              }
            }
          );
          addMessage(conversationId, msg);
          console.log('[AutonomousChatIntegration] ✅ Timeline event:', timelineEvent.type, timelineEvent.title);
        }
        break;
      }

      // Handle checkpoint milestone marker
      case 'autonomous_checkpoint': {
        const checkpointData = event.checkpoint;
        if (checkpointData) {
          const msg = createAutonomousMessage(
            'autonomous_checkpoint',
            `Checkpoint: ${checkpointData.title}`,
            {
              phase: 'executing',
              progress: store.progress,
              checkpoint: checkpointData
            }
          );
          addMessage(conversationId, msg);
          console.log('[AutonomousChatIntegration] ✅ Checkpoint:', checkpointData.title);
        }
        break;
      }

      // Handle task list with progress
      // ✅ NEW (Jan 26, 2026): Update existing task list message in-place for Fortune 500 UX
      case 'autonomous_task_list': {
        const taskListData = event.taskList;
        if (taskListData) {
          if (taskListMessageIdRef.current) {
            // Update existing task list message in-place (no chat flooding)
            updateMessage(conversationId, taskListMessageIdRef.current, {
              autonomousPayload: {
                phase: 'executing',
                progress: store.progress,
                taskList: taskListData
              }
            });
            console.log('[AutonomousChatIntegration] ✅ Task list updated:', taskListData.items?.length, 'items');
          } else {
            // First task list message - create and track ID
            const msg = createAutonomousMessage(
              'autonomous_task_list',
              taskListData.title || 'Task Progress',
              {
                phase: 'executing',
                progress: store.progress,
                taskList: taskListData
              }
            );
            taskListMessageIdRef.current = msg.id;
            addMessage(conversationId, msg);
            console.log('[AutonomousChatIntegration] ✅ Task list created:', taskListData.items?.length, 'items');
          }
        }
        break;
      }

      // Handle preview window update
      case 'autonomous_preview': {
        const previewData = event.preview;
        if (previewData) {
          const msg = createAutonomousMessage(
            'autonomous_preview',
            previewData.title || 'Preview',
            {
              phase: 'executing',
              progress: store.progress,
              preview: previewData
            }
          );
          addMessage(conversationId, msg);
          console.log('[AutonomousChatIntegration] ✅ Preview:', previewData.url);
        }
        break;
      }

      // Handle file operation notification
      case 'autonomous_file_operation': {
        const fileOp = event.fileOperation;
        if (fileOp) {
          // Emit file event for notifications
          if (fileOp.type === 'create') {
            AgentEventBus.emit('agent:file-created', { filename: fileOp.filePath, projectId });
          }
          
          const opIcon = fileOp.type === 'create' ? '📄' : 
                        fileOp.type === 'update' ? '✏️' : 
                        fileOp.type === 'delete' ? '🗑️' : '📝';
          
          const msg = createAutonomousMessage(
            'autonomous_file_operation',
            `${opIcon} ${fileOp.type}: ${fileOp.filePath}`,
            {
              phase: 'executing',
              progress: store.progress,
              fileOperation: {
                type: fileOp.type === 'update' ? 'edit' : fileOp.type === 'rename' ? 'move' : fileOp.type as 'create' | 'delete' | 'edit' | 'read' | 'move',
                path: fileOp.filePath,
                language: fileOp.language,
                linesChanged: (fileOp.linesAdded || 0) + (fileOp.linesRemoved || 0)
              }
            }
          );
          addMessage(conversationId, msg);
          console.log('[AutonomousChatIntegration] ✅ File operation:', fileOp.type, fileOp.filePath);
        }
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
    // Mark that the effect ran (for fallback detection)
    effectRanRef.current = true;
    
    // DEBUG: Write to sessionStorage for mobile WebView debugging (console.log may be deferred)
    const effectTimestamp = Date.now();
    try {
      sessionStorage.setItem('autonomousChatEffect_lastRun', String(effectTimestamp));
      sessionStorage.setItem('autonomousChatEffect_enabled', String(enabled));
      sessionStorage.setItem('autonomousChatEffect_conversationId', String(conversationId));
    } catch (e) { /* ignore storage errors */ }
    
    // DEBUG: Log activation conditions IMMEDIATELY
    // Use console.warn for higher priority in mobile WebView log capture
    console.warn('[AutonomousChatIntegration] ⚡ useEffect TRIGGERED:', {
      enabled,
      conversationId,
      projectId,
      hasBootstrapToken: !!bootstrapToken,
      layoutEffectAlreadyConnected: layoutEffectConnectedRef.current,
      timestamp: effectTimestamp
    });
    
    // 🚀 Skip if useLayoutEffect already established connection
    if (layoutEffectConnectedRef.current || hasConnectedRef.current) {
      console.warn('[AutonomousChatIntegration] ⚡ Skipping useEffect - useLayoutEffect already connected');
      return;
    }
    
    if (!enabled) {
      console.warn('[AutonomousChatIntegration] ❌ Skipping - not enabled');
      return;
    }
    
    if (!conversationId) {
      console.warn('[AutonomousChatIntegration] ❌ Skipping - no conversationId');
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
          setConnectionState({ isConnected: true, error: null, reconnectAttempt: 0, maxReconnectAttempts: 10 });
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
          setConnectionState(prev => ({ ...prev, error: 'Connection error occurred' }));
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
            // Clear error state when attempting reconnect so banner shows progress
            setConnectionState(prev => ({ 
              ...prev, 
              isConnected: false, 
              error: null,
              reconnectAttempt: reconnectAttemptRef.current 
            }));
            
            // Clear any existing timeout
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connectWebSocket();
            }, delay);
          } else if (reconnectAttemptRef.current >= maxReconnectAttempts) {
            console.error('[AutonomousChatIntegration] Max reconnection attempts reached, giving up');
            setConnectionState(prev => ({ 
              ...prev, 
              isConnected: false, 
              error: 'Maximum reconnection attempts reached. Click retry to try again.',
              reconnectAttempt: maxReconnectAttempts
            }));
            useAutonomousBuildStore.getState().setError('Connection lost. Please refresh the page.');
          } else {
            setConnectionState(prev => ({ ...prev, isConnected: false }));
          }
        };
      } catch (err) {
        console.error('[AutonomousChatIntegration] Failed to connect WebSocket:', err);
        hasConnectedRef.current = false;
      }
    };

    // Store connect function ref for manual retry and reconnection from other effects
    connectFnRef.current = connectWebSocket;
    
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
      connectFnRef.current = null;
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

  // Manual reconnect function for retry button
  const manualReconnect = useCallback(() => {
    console.log('[AutonomousChatIntegration] 🔄 Manual reconnect triggered');
    
    // Reset reconnect counter to allow fresh attempts
    reconnectAttemptRef.current = 0;
    setConnectionState(prev => ({ ...prev, error: null, reconnectAttempt: 0 }));
    
    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual reconnect');
      wsRef.current = null;
    }
    
    // Trigger reconnect using stored connect function
    if (connectFnRef.current) {
      connectFnRef.current();
    }
  }, []);

  // ✅ FIX (Jan 2026): FINAL UNMOUNT HANDLER - Guarantees socket closure on component unmount
  // This MUST be the LAST useLayoutEffect in the hook
  // React cleanup runs in REVERSE declaration order, so this cleanup runs FIRST
  // This cleanup does TWO things:
  // 1. Set intentionalTeardownRef so other cleanups know this is unmount
  // 2. DIRECTLY close the socket here as a guarantee (defense in depth)
  useLayoutEffect(() => {
    return () => {
      // This cleanup runs FIRST during unmount (reverse order)
      console.log('[AutonomousChatIntegration] 🚨 UNMOUNT HANDLER: Setting intentionalTeardownRef and closing socket');
      intentionalTeardownRef.current = true;
      
      // ✅ GUARANTEE: Close socket directly here, don't rely on other cleanups
      // This ensures socket is closed even if other cleanup logic has edge cases
      if (wsRef.current) {
        console.log('[AutonomousChatIntegration] 🚨 UNMOUNT HANDLER: Force-closing WebSocket');
        try {
          wsRef.current.close(1000, 'component-unmount-guarantee');
        } catch (e) {
          console.error('[AutonomousChatIntegration] Error closing WebSocket on unmount:', e);
        }
        wsRef.current = null;
      }
      
      // Reset connection flags
      layoutEffectConnectedRef.current = false;
      hasConnectedRef.current = false;
      bootstrapActiveRef.current = false;
    };
  }, []);

  return {
    sendBuildModeSelection,
    requestPlanChange,
    manualReconnect,
    isConnected: connectionState.isConnected,
    connectionError: connectionState.error,
    reconnectAttempt: connectionState.reconnectAttempt,
    maxReconnectAttempts: connectionState.maxReconnectAttempts,
    // Expose effective conversationId for parent components to use when displaying messages
    effectiveConversationId: conversationId,
    // Flag to indicate if we're using a temporary ID (for bootstrap flow)
    isUsingTempConversationId: conversationId !== null && conversationId < 0
  };
}

export default useAutonomousChatIntegration;
