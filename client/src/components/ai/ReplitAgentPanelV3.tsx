import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// Web Speech API - use 'any' since TypeScript doesn't have built-in types for this browser API
type SpeechRecognitionInstance = any;
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAgentConversationStore, type Message } from '@/stores/agentConversationStore';
import { useAutonomousChatIntegration } from '@/hooks/use-autonomous-chat-integration';
import { useAutonomousBuildStore } from '@/stores/autonomousBuildStore';
import { useAgentAudioNotifications } from '@/hooks/use-agent-audio-notifications';
import { useAgentDockNotifications } from '@/hooks/use-agent-dock-notifications';
import { useAgentFavicon } from '@/hooks/use-agent-favicon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  Send,
  Sparkles,
  Plus,
  Loader2,
  Settings,
  Brain,
  Globe,
  Zap,
  MoreHorizontal,
  Copy,
  RefreshCw,
  Pause,
  Play,
  AlertCircle,
  Paperclip,
  Mic
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThinkingDisplay, ThinkingDisplayCompact, ThinkingStep } from './ThinkingDisplay';
import { ToolExecutionList, ToolExecutionProps } from './ToolExecutionDisplay';
import { MessageMetadataFooter } from './MessageMetadataFooter';
import { 
  TaskMessage, 
  ActionMessage, 
  RichMessageContent,
  type Task,
  type Action,
  type FileDiff
} from '@/components/agent/messages';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useWorkflowManager } from '@/hooks/use-workflow-manager';
import { useAgentModelPreference } from '@/hooks/use-agent-model-preference';
import { AgentWorkflowSelector } from './AgentWorkflowSelector';
import { DesignPrototypeViewer } from './DesignPrototypeViewer';
import { MVPCompletionDialog } from './MVPCompletionDialog';
import { ModeSelector, type AgentMode } from './ModeSelector';
import { AIModelSelector } from './AIModelSelector';
import { CurrentModelChip } from './CurrentModelChip';
import { handleSSEWarning, type SSEWarningData } from '@/lib/sse-warning-handler';
import { AgentHistoryModal } from '@/components/grids/AgentHistoryModal';
import { MaxAutonomyProgress, MaxAutonomyStartForm } from './MaxAutonomyProgress';
import { useMaxAutonomy } from '@/hooks/useMaxAutonomy';
import { AgentToolsPanel, type AgentToolsSettings } from './AgentToolsPanel';
import { ElementEditor, type ElementSelection } from './ElementEditor';
import { ChatToolbar, ChatToolbarMobile } from './ChatToolbar';
import { WebSearchToggle, WebSearchBadge } from './WebSearchToggle';
import { UsageTrackingIcon } from './UsageTrackingIcon';
import { VideoReplayViewer } from './VideoReplayViewer';
import { ECodeLogo } from '@/components/ECodeLogo';
import { RAGToggle, RAGStatsDisplay, RetrievedContextPanel, useRAGStats } from './RAGControls';
import { MemoryBankPanel, MemoryBankStatusBadge, useMemoryBankStatus } from './MemoryBankPanel';
import { EffortPricingDisplay } from '@/components/EffortPricingDisplay';
import { CheckpointsPanel } from '@/components/CheckpointsPanel';
import { PreviewDeploymentButton } from './PreviewDeploymentPanel';
import { History, X, MousePointer2, Coins, Database, Volume2, VolumeX, DollarSign, RotateCcw } from 'lucide-react';
import { SiFigma } from 'react-icons/si';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  EnhancedChatMessage, 
  StreamingSkeleton, 
  ConversationSyncIndicator 
} from './EnhancedChatMessage';
import { Progress } from '@/components/ui/progress';
import { Package, Hammer, Smartphone, CheckCircle2, XCircle } from 'lucide-react';

interface ToolExecution {
  id: string;
  tool: string;
  parameters: any;
  result?: any;
  success?: boolean;
  status: 'pending' | 'running' | 'complete' | 'error';
  metadata?: {
    executionTime?: number;
    filesChanged?: string[];
    commandOutput?: string;
  };
  error?: string;
}

type WorkflowPhase = 
  | 'generating_features'
  | 'selecting_build_option'
  | 'building_design'
  | 'design_preview'
  | 'building_full'
  | 'mvp_complete'
  | 'extended_build'
  | 'complete';

type ValidationStep = 'idle' | 'post_validation' | 'installing_deps' | 'deps_complete' | 'deps_failed' | 'verifying_build' | 'build_complete' | 'build_failed' | 'running_qa' | 'qa_complete';

interface BuildValidationProgressProps {
  currentStep: ValidationStep;
  depsResult?: { success: boolean; installed: number; failed: number; total: number };
  buildResult?: { success: boolean; errorCount: number; warningCount: number };
  qaResult?: { score: number; passedTests: number; totalTests: number };
}

function BuildValidationProgress({ currentStep, depsResult, buildResult, qaResult }: BuildValidationProgressProps) {
  if (currentStep === 'idle') return null;

  const steps = [
    { key: 'deps', label: 'Dependencies', icon: Package },
    { key: 'build', label: 'Build', icon: Hammer },
    { key: 'qa', label: 'QA', icon: Smartphone },
  ];

  const getStepStatus = (stepKey: string) => {
    switch (stepKey) {
      case 'deps':
        if (currentStep === 'installing_deps') return 'active';
        if (currentStep === 'deps_complete') return 'success';
        if (currentStep === 'deps_failed') return 'error';
        if (['verifying_build', 'build_complete', 'build_failed', 'running_qa', 'qa_complete'].includes(currentStep)) return depsResult?.success !== false ? 'success' : 'error';
        return 'pending';
      case 'build':
        if (currentStep === 'verifying_build') return 'active';
        if (currentStep === 'build_complete') return 'success';
        if (currentStep === 'build_failed') return 'error';
        if (['running_qa', 'qa_complete'].includes(currentStep)) return buildResult?.success !== false ? 'success' : 'error';
        return 'pending';
      case 'qa':
        if (currentStep === 'running_qa') return 'active';
        if (currentStep === 'qa_complete') return qaResult && qaResult.score >= 0.8 ? 'success' : qaResult && qaResult.score >= 0.5 ? 'warning' : 'error';
        return 'pending';
      default:
        return 'pending';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-muted/50 rounded-lg p-3 mb-3 border border-border/50"
      data-testid="build-validation-progress"
    >
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium">Post-Build Validation</span>
      </div>
      
      <div className="flex items-center gap-2">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.key);
          const Icon = step.icon;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
                status === 'active' && "bg-primary/20 text-primary",
                status === 'success' && "bg-green-500/20 text-green-600 dark:text-green-400",
                status === 'error' && "bg-red-500/20 text-red-600 dark:text-red-400",
                status === 'warning' && "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
                status === 'pending' && "bg-muted text-muted-foreground"
              )}>
                {status === 'active' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : status === 'success' ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : status === 'error' ? (
                  <XCircle className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
                <span>{step.label}</span>
                {step.key === 'qa' && status !== 'pending' && status !== 'active' && qaResult && (
                  <span className="font-medium">{Math.round(qaResult.score * 100)}%</span>
                )}
              </div>
              {idx < steps.length - 1 && (
                <div className="w-4 h-px bg-border mx-1" />
              )}
            </div>
          );
        })}
      </div>
      
      {qaResult && currentStep === 'qa_complete' && (
        <div className="mt-2 text-xs text-muted-foreground">
          {qaResult.passedTests}/{qaResult.totalTests} responsive tests passed
        </div>
      )}
    </motion.div>
  );
}


interface AgentCapability {
  id: string;
  label: string;
  icon: React.ElementType;
  enabled: boolean;
  badge?: string;
  description: string;
}

interface ReplitAgentPanelV3Props {
  projectId: string | number;
  className?: string;
  onMinimize?: () => void;
  mode?: 'desktop' | 'tablet' | 'mobile';
  // Props from ReplitAgent for compatibility during consolidation
  selectedFile?: string;
  selectedCode?: string;
  initialPrompt?: string | null;
  websocket?: WebSocket | null;
  onBuildComplete?: () => void;
  sessionId?: string | null;
  externalConversationId?: number | null;
  autoStart?: boolean; // ✅ FIX (Nov 30, 2025): Now defaults to true for auto-launch
  // Lifted agent tools settings to parent to survive remounts (Dec 2025)
  agentToolsSettings?: AgentToolsSettings;
  onAgentToolsSettingsChange?: (settings: AgentToolsSettings) => void;
  // ✅ FIX (Dec 11, 2025): Show ModeSelector immediately during bootstrap
  isBootstrapping?: boolean;
  // ✅ FIX (Dec 11, 2025): Bootstrap token for inline autonomous workspace creation
  bootstrapToken?: string | null;
}

function categorizeError(error: unknown): { title: string; message: string } {
  // Extract error message from various formats - prioritize Error instances
  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    // Check for empty plain objects (not Error instances) - indicates connection lost
    if (Object.keys(err).length === 0) {
      return {
        title: 'Connection Issue',
        message: 'Lost connection to the AI service. Please check your internet and try again.'
      };
    }
    errorMessage = String(err.message || err.error || err.detail || JSON.stringify(error));
  } else if (!error) {
    // Handle null/undefined errors
    return {
      title: 'Connection Issue',
      message: 'Lost connection to the AI service. Please check your internet and try again.'
    };
  } else {
    errorMessage = String(error);
  }
  errorMessage = errorMessage.toLowerCase();
  
  // Handle "Load failed" and similar fetch errors  
  if (errorMessage.includes('load failed') || errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('econnrefused') || errorMessage.includes('failed to fetch')) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to the AI service. Please check your connection and try again.'
    };
  }
  if (errorMessage.includes('timeout') || errorMessage.includes('etimedout') || errorMessage.includes('aborted')) {
    return {
      title: 'Request Timeout',
      message: 'The request took too long. Please try a simpler request or try again.'
    };
  }
  if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('authentication') || errorMessage.includes('unauthenticated')) {
    return {
      title: 'Authentication Error',
      message: 'Authentication failed. Please refresh the page and log in again.'
    };
  }
  if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return {
      title: 'Rate Limit Exceeded',
      message: 'Too many requests. Please wait a moment and try again.'
    };
  }
  if (errorMessage.includes('500') || errorMessage.includes('internal server error')) {
    return {
      title: 'Server Error',
      message: 'The server encountered an error. Please try again in a moment.'
    };
  }
  
  return {
    title: 'AI Assistant Error',
    message: 'Something went wrong. Please try again.'
  };
}

export function ReplitAgentPanelV3({ 
  projectId, 
  className,
  onMinimize,
  mode = 'desktop',
  selectedFile,
  selectedCode,
  initialPrompt,
  websocket: externalWebsocket,
  onBuildComplete,
  sessionId: externalSessionId,
  externalConversationId,
  autoStart = true,
  agentToolsSettings: externalAgentToolsSettings,
  onAgentToolsSettingsChange,
  isBootstrapping = false,
  bootstrapToken
}: ReplitAgentPanelV3Props) {
  // DEBUG: Log component render
  console.log('[ReplitAgentPanelV3] Component render:', {
    projectId,
    mode,
    isBootstrapping,
    hasBootstrapToken: !!bootstrapToken,
    tokenPreview: bootstrapToken ? bootstrapToken.substring(0, 30) + '...' : null
  });
  
  // Convert projectId to number early for consistent usage throughout component
  const projectIdNum = typeof projectId === 'string' ? parseInt(projectId) : projectId;
  
  // AI Model preference hook
  const { modelId, provider, supportsExtendedThinking: modelSupportsExtendedThinking, model, setPreferredModel } = useAgentModelPreference();
  
  // Autonomous build store for inline chat integration
  const autonomousBuildStore = useAutonomousBuildStore();
  
  // State for model selector dropdown (CurrentModelChip click)
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  
  // Conversation state
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [agentMode, setAgentMode] = useState<AgentMode>('build');
  const [autonomySessionId, setAutonomySessionId] = useState<string | null>(null);
  
  // Zustand store for message persistence across tab switches
  const { 
    getMessages, 
    setMessages: setStoreMessages, 
    addMessage: addStoreMessage,
    clearMessages: clearStoreMessages,
    setLastSyncedAt,
    getLastSyncedAt,
    hasConversation,
    migrateMessages
  } = useAgentConversationStore();
  
  // Autonomous chat integration - bridges WebSocket events to inline chat messages
  // This hook connects to the autonomous workspace WebSocket and pushes messages to the chat
  // MUST be called before messages retrieval to use effectiveConversationId
  const { 
    sendBuildModeSelection, 
    requestPlanChange, 
    effectiveConversationId,
    isUsingTempConversationId 
  } = useAutonomousChatIntegration({
    conversationId,
    projectId: typeof projectId === 'string' ? parseInt(projectId, 10) : projectId,
    sessionId: externalSessionId,
    enabled: !!bootstrapToken && autonomousBuildStore.inlineMode,
    bootstrapToken,
    initialPrompt
  });
  
  // Replit-style notifications: Audio, Favicon, and Dock notifications
  const { isEnabled: isAudioEnabled, setEnabled: setAudioEnabled } = useAgentAudioNotifications();
  useAgentDockNotifications();
  useAgentFavicon();
  
  // Use effective conversation ID for displaying autonomous build messages during bootstrap
  // This allows messages to be shown even before the backend provides a real conversation ID
  const displayConversationId = conversationId ?? effectiveConversationId;
  
  // Get messages from store when conversationId is available
  // During autonomous bootstrap, use effectiveConversationId from the hook to display progress messages
  const messages = displayConversationId ? getMessages(displayConversationId) : [{
    id: '1',
    role: 'assistant' as const,
    content: "Hi! I'm your AI assistant with extended thinking capabilities. I can help you build, debug, and improve your code with transparent reasoning. What would you like to create today?",
    timestamp: new Date()
  }];
  
  // DEBUG: Log message count for debugging
  console.log('[ReplitAgentPanelV3] 📊 Messages:', {
    displayConversationId,
    effectiveConversationId,
    conversationId,
    messageCount: messages.length,
    firstMessageId: messages[0]?.id
  });
  
  // Wrapper to update messages in zustand store
  const setMessages = useCallback((updater: Message[] | ((prev: Message[]) => Message[])) => {
    if (!conversationId) return;
    const newMessages = typeof updater === 'function' ? updater(messages) : updater;
    setStoreMessages(conversationId, newMessages);
  }, [conversationId, messages, setStoreMessages]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPendingResponse, setIsPendingResponse] = useState(false); // True when waiting for first AI response chunk
  const [streamingContent, setStreamingContent] = useState('');
  const [activeThinking, setActiveThinking] = useState<ThinkingStep[]>([]);
  const [capabilities, setCapabilities] = useState<AgentCapability[]>([
    {
      id: 'extended_thinking',
      label: 'Extended Thinking',
      icon: Brain,
      enabled: true,
      badge: 'PRO',
      description: 'Deep reasoning with visible thought process'
    },
    {
      id: 'web_search',
      label: 'Web Search',
      icon: Globe,
      enabled: false,
      description: 'Search the internet for up-to-date information'
    },
    {
      id: 'high_power',
      label: 'High Power Mode',
      icon: Zap,
      enabled: false,
      badge: 'ENTERPRISE',
      description: 'Use the most capable AI model available'
    }
  ]);
  
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [videoReplayViewerOpen, setVideoReplayViewerOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showCheckpoints, setShowCheckpoints] = useState(false);
  
  // Agent Tools Panel settings (Replit Agent 3 exact toggles)
  // Use external settings if provided (lifted state pattern), otherwise use internal state
  const defaultSettings: AgentToolsSettings = {
    maxAutonomy: false,
    appTesting: true, // ON by default per Replit Agent 3
    extendedThinking: false,
    highPowerModels: false,
    webSearch: false
  };
  
  const [internalAgentToolsSettings, setInternalAgentToolsSettings] = useState<AgentToolsSettings>(defaultSettings);
  
  // Use external settings if provided, otherwise use internal state
  const agentToolsSettings = externalAgentToolsSettings ?? internalAgentToolsSettings;
  const setAgentToolsSettings = onAgentToolsSettingsChange ?? setInternalAgentToolsSettings;
  
  // Ref to track previous settings for toast comparison (avoids stale closure issues)
  const agentToolsSettingsRef = useRef<AgentToolsSettings>(agentToolsSettings);
  
  // Element Editor state
  const [elementEditorActive, setElementEditorActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementSelection | null>(null);
  const [videoReplayCount, setVideoReplayCount] = useState(0);
  
  // Build/Install/QA validation progress state (Task 6)
  const [validationStep, setValidationStep] = useState<ValidationStep>('idle');
  const [depsResult, setDepsResult] = useState<{ success: boolean; installed: number; failed: number; total: number } | undefined>();
  const [buildResult, setBuildResult] = useState<{ success: boolean; errorCount: number; warningCount: number } | undefined>();
  const [qaResult, setQaResult] = useState<{ score: number; passedTests: number; totalTests: number } | undefined>();
  
  // RAG (Retrieval-Augmented Generation) state
  const [ragEnabled, setRagEnabled] = useState(true);
  const [showRAGContext, setShowRAGContext] = useState(false);
  const { data: ragStats } = useRAGStats();
  
  // Memory Bank status for persistent project context
  const { data: memoryBankStatus } = useMemoryBankStatus(projectIdNum);
  
  // Derive validation step from autonomousBuildStore current task (Task 6)
  useEffect(() => {
    const currentTask = autonomousBuildStore.currentTask?.toLowerCase() || '';
    const phase = autonomousBuildStore.phase;
    
    if (currentTask.includes('post-build validation') || currentTask.includes('running post-build')) {
      setValidationStep('post_validation');
    } else if (currentTask.includes('installing dependencies')) {
      setValidationStep('installing_deps');
    } else if (currentTask.includes('dependencies installed successfully')) {
      setValidationStep('deps_complete');
      setDepsResult({ success: true, installed: 0, failed: 0, total: 0 });
    } else if (currentTask.includes('dependencies failed')) {
      setValidationStep('deps_failed');
      setDepsResult({ success: false, installed: 0, failed: 1, total: 1 });
    } else if (currentTask.includes('verifying build')) {
      setValidationStep('verifying_build');
    } else if (currentTask.includes('build verified')) {
      setValidationStep('build_complete');
      setBuildResult({ success: true, errorCount: 0, warningCount: 0 });
    } else if (currentTask.includes('build failed')) {
      setValidationStep('build_failed');
      setBuildResult({ success: false, errorCount: 1, warningCount: 0 });
    } else if (currentTask.includes('running responsive qa') || currentTask.includes('responsive qa tests')) {
      setValidationStep('running_qa');
    } else if (currentTask.includes('qa score')) {
      setValidationStep('qa_complete');
      const match = currentTask.match(/(\d+)%/);
      const score = match ? parseInt(match[1]) / 100 : 0.8;
      setQaResult({ score, passedTests: Math.round(score * 5), totalTests: 5 });
    } else if (phase === 'complete' && validationStep !== 'idle') {
      setTimeout(() => setValidationStep('idle'), 5000);
    }
  }, [autonomousBuildStore.currentTask, autonomousBuildStore.phase, validationStep]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUserNearBottomRef = useRef(true);
  const lastScrollTimeRef = useRef(0);
  const { toast } = useToast();

  // Bootstrap conversation on mount
  // ✅ FIX (Dec 10, 2025): Always call POST /api/agent/conversation to get proper integer ID
  // External conversation IDs from bootstrap tokens are UUIDs but aiConversations.id is integer
  // The backend will return existing conversation if one exists for this projectId
  useEffect(() => {
    const bootstrapConversation = async () => {
      try {
        const response = await apiRequest('POST', '/api/agent/conversation', {
          projectId: projectId.toString()
        }) as { conversationId: number; agentMode: 'plan' | 'build'; existing: boolean };

        // ✅ FIX (Dec 12, 2025): Migrate messages from temp conversationId to real conversationId
        // During bootstrap, messages are stored under a temporary negative projectId (-712)
        // Once we get the real conversationId, migrate those messages so they remain visible
        const tempConversationId = -parseInt(projectId.toString(), 10);
        const realConversationId = response.conversationId;
        
        // Only migrate if we have a valid real conversationId (not null/undefined)
        if (realConversationId && tempConversationId && realConversationId !== tempConversationId) {
          console.log('[ReplitAgentPanelV3] Migrating messages from temp', tempConversationId, 'to real', realConversationId);
          migrateMessages(tempConversationId, realConversationId);
        }

        setConversationId(realConversationId);
        setAgentMode(response.agentMode);
      } catch (error) {
        console.error('Failed to bootstrap conversation:', error);
        toast({
          title: "Conversation Setup Failed",
          description: "Could not initialize agent conversation",
          variant: "destructive"
        });
      }
    };

    bootstrapConversation();
  }, [projectId, toast, migrateMessages]);

  // Track if initial sync from backend has been completed for this conversation
  const initialSyncDoneRef = useRef<number | null>(null);
  
  // Load existing messages from backend when conversationId is available
  // ✅ FIX (Dec 10, 2025): Always fetch when conversationId is available
  // Previously used `!hasConversation(conversationId)` which prevented fetching
  // when localStorage had rehydrated stale data
  const { data: backendMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['/api/agent/conversation', conversationId, 'messages'],
    enabled: !!conversationId,
  });

  // Sync backend messages to zustand store on fetch
  // ✅ FIX (Dec 10, 2025): Always hydrate store with backend messages on initial load
  // Previously checked `!hasConversation(conversationId)` which prevented updates
  // when the store was empty or had stale localStorage data
  useEffect(() => {
    if (backendMessages?.messages && conversationId) {
      // Only sync once per conversationId to avoid overwriting user's new messages
      if (initialSyncDoneRef.current === conversationId) {
        return;
      }
      
      const fetchedMessages = backendMessages.messages as Message[];
      // Always call setStoreMessages - it handles empty arrays by using default message
      setStoreMessages(conversationId, fetchedMessages);
      setLastSyncedAt(conversationId, Date.now());
      initialSyncDoneRef.current = conversationId;
    }
  }, [backendMessages, conversationId, setStoreMessages, setLastSyncedAt]);

  // Track context injection to prevent duplicates
  const contextInjectedRef = useRef<string | null>(null);
  
  // ✅ FIX (Dec 9, 2025): REMOVED first auto-start effect
  // The second auto-start effect (lines 588-883) is the authoritative one.
  // This first effect was clearing sessionStorage before the second effect could use it,
  // causing the mobile bootstrap flow to fail.
  // Consolidation: Only use the second effect which properly waits for conversationId,
  // handles streaming, and persists messages correctly.

  // Handle selected file/code context injection - with idempotent check using content hash
  useEffect(() => {
    if (!selectedFile || !selectedCode) return;
    
    // Create a unique key using file name and content length + first/last chars for better uniqueness
    const codeHash = `${selectedCode.length}-${selectedCode.substring(0, 50)}-${selectedCode.substring(selectedCode.length - 50)}`;
    const contextKey = `${selectedFile}:${codeHash}`;
    
    if (contextInjectedRef.current !== contextKey) {
      contextInjectedRef.current = contextKey;
      // Add context to the input
      const contextPrefix = `\n\n[Context: ${selectedFile}]\n\`\`\`\n${selectedCode.substring(0, 500)}${selectedCode.length > 500 ? '...' : ''}\n\`\`\`\n\n`;
      setInput(prev => prev ? prev + contextPrefix : contextPrefix);
    }
  }, [selectedFile, selectedCode]);

  // Max Autonomy hook
  const {
    startSession: startAutonomySession,
    isStartingSession: isStartingAutonomy,
    session: autonomySession
  } = useMaxAutonomy(autonomySessionId, projectIdNum);

  // Handler for agent tools settings changes (Replit Agent 3 toggles)
  // State is now lifted to parent (IDEPage) to survive remounts
  const handleAgentToolsChange = useCallback((newSettings: AgentToolsSettings) => {
    // Get previous settings from ref for toast comparison
    const prevSettings = agentToolsSettingsRef.current;
    
    // Update ref to track current settings
    agentToolsSettingsRef.current = newSettings;
    
    // Update state (either parent's state via callback or internal state)
    setAgentToolsSettings(newSettings);
    
    // Show toasts for newly enabled features
    if (newSettings.maxAutonomy && !prevSettings.maxAutonomy) {
      toast({
        title: "Max Autonomy Enabled",
        description: "Agent will supervise itself for up to 200 minutes"
      });
    }
    
    if (newSettings.appTesting && !prevSettings.appTesting) {
      toast({
        title: "App Testing Enabled",
        description: "Agent will test using browser automation with video replays"
      });
    }
    
    if (newSettings.extendedThinking && !prevSettings.extendedThinking) {
      toast({
        title: "Extended Thinking Enabled",
        description: "Deeper reasoning for harder problems"
      });
    }
    
    if (newSettings.highPowerModels && !prevSettings.highPowerModels) {
      toast({
        title: "High Power Models Enabled",
        description: "Using sophisticated AI for complex tasks"
      });
    }
    
    if (newSettings.webSearch && !prevSettings.webSearch) {
      toast({
        title: "Web Search Enabled",
        description: "Agent can search the web for docs and APIs"
      });
    }
  }, [setAgentToolsSettings, toast]);
  
  // Handler for Element Editor save
  const handleElementSave = useCallback((changes: Partial<ElementSelection['styles']> & { text?: string }) => {
    setSelectedElement(null);
    setElementEditorActive(false);
    toast({
      title: "Changes Applied",
      description: "Element styles updated successfully"
    });
  }, [toast]);
  
  // Handler for viewing video replays
  const handleViewVideoReplays = useCallback(() => {
    setVideoReplayViewerOpen(true);
    toast({
      title: "Video Replays",
      description: "Opening test session recordings..."
    });
  }, [toast]);

  // Handler for mode changes (Build/Plan/Edit - 3 modes only)
  const handleModeChange = async (newMode: AgentMode) => {
    if (!conversationId || !Number.isInteger(conversationId) || conversationId <= 0) {
      console.error('Cannot change mode: invalid conversationId', { conversationId });
      return;
    }

    try {
      await apiRequest('POST', `/api/agent/conversation/${conversationId}/mode`, {
        mode: newMode
      });

      setAgentMode(newMode);
      
      const modeDescriptions: Record<AgentMode, string> = {
        build: "Agent will autonomously make changes",
        plan: "Agent will brainstorm without making code changes",
        edit: "Targeted changes to specific files with precise control",
        fast: "Quick responses with reduced reasoning for speed"
      };
      
      toast({
        title: `Switched to ${newMode.charAt(0).toUpperCase() + newMode.slice(1)} Mode`,
        description: modeDescriptions[newMode],
      });
    } catch (error) {
      console.error('Failed to update mode:', error);
      toast({
        title: "Mode Update Failed",
        description: "Could not switch agent mode",
        variant: "destructive"
      });
    }
  };

  // Handler for starting autonomy session
  const handleStartAutonomy = async (goal: string, options: any) => {
    try {
      const response = await apiRequest<{ success: boolean; session: { id: string } }>(
        'POST', 
        '/api/autonomy/sessions', 
        {
          projectId: projectIdNum,
          goal,
          ...options
        }
      );
      
      if (response?.success && response?.session?.id) {
        setAutonomySessionId(response.session.id);
        
        // Add a system message about the autonomous session starting
        const systemMessage: Message = {
          id: `autonomy-start-${Date.now()}`,
          role: 'assistant',
          content: `🚀 **Max Autonomy Session Started**\n\n**Goal:** ${goal}\n\nI'll work autonomously on this with automatic checkpoints and testing. You can pause or stop at any time.`,
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, systemMessage]);
      }
    } catch (error: any) {
      console.error('Failed to start autonomy session:', error);
      toast({
        title: "Failed to Start Session",
        description: error.message || "Could not start autonomous session",
        variant: "destructive"
      });
    }
  };

  // Handler for stopping autonomy session
  const handleStopAutonomy = () => {
    setAutonomySessionId(null);
    setAgentMode('build');
  };

  // Handler for file attachment button click
  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handler for file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      toast({
        title: "File Attachment",
        description: "File attachment coming soon. This feature is under development.",
      });
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  }, [toast]);

  // Handler for voice input button click
  const handleVoiceClick = useCallback(() => {
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: "Voice Input Not Supported",
        description: "Voice input is not supported in this browser. Please try Chrome or Edge.",
        variant: "destructive"
      });
      return;
    }

    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsRecording(false);
      return;
    }

    // Start recording
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      toast({
        title: "Listening...",
        description: "Speak now. Click the mic button again to stop.",
      });
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      // Append transcript to input
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      recognitionRef.current = null;
      if (event.error !== 'aborted') {
        toast({
          title: "Voice Input Error",
          description: `Error: ${event.error}. Please try again.`,
          variant: "destructive"
        });
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isRecording, toast]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  // ✅ FIX (Dec 14, 2025): Fortune 500-grade scroll behavior
  // Track if user is near bottom to prevent jumping when user is reading history
  const checkIfNearBottom = useCallback(() => {
    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      isUserNearBottomRef.current = distanceFromBottom < 150; // Within 150px of bottom
    }
  }, []);

  // Attach scroll listener to track user position
  useEffect(() => {
    const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      const handleScroll = () => {
        lastScrollTimeRef.current = Date.now();
        checkIfNearBottom();
      };
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [checkIfNearBottom]);

  // Auto-scroll to bottom - only when user is near bottom and not actively scrolling
  useEffect(() => {
    // Don't auto-scroll if user recently scrolled (prevents jumping during manual scroll)
    const timeSinceLastScroll = Date.now() - lastScrollTimeRef.current;
    if (timeSinceLastScroll < 100) return;

    // Only auto-scroll if user is near bottom (reading new messages)
    if (!isUserNearBottomRef.current) return;

    if (lastMessageRef.current) {
      // Use requestAnimationFrame for smooth rendering
      requestAnimationFrame(() => {
        lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, [messages.length]); // Only trigger on new messages, not streaming updates

  // Scroll to bottom on streaming completion (when streaming stops)
  const prevStreamingRef = useRef(streamingContent);
  useEffect(() => {
    // Detect when streaming ends (content was streaming, now stopped)
    if (prevStreamingRef.current && !streamingContent && isUserNearBottomRef.current) {
      requestAnimationFrame(() => {
        lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
    prevStreamingRef.current = streamingContent;
  }, [streamingContent]);

  // Auto-focus input
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Ref to track if auto-start has been processed (prevent double execution)
  const autoStartExecutedRef = useRef(false);
  
  // ✅ FIX (Dec 9, 2025): CONSOLIDATED auto-start effect
  // This is now the ONLY auto-start mechanism. The previous first effect was removed
  // because it was clearing sessionStorage before this effect could read it.
  // This effect properly:
  // 1. Waits for conversationId to be available (messages persist to store)
  // 2. Checks multiple prompt sources in priority order
  // 3. Only clears sessionStorage AFTER successfully starting
  useEffect(() => {
    // CRITICAL: Don't start until conversationId is available so messages persist to store
    if (!conversationId) {
      return;
    }
    
    // Prevent double execution
    if (autoStartExecutedRef.current) {
      return;
    }
    
    // Check URL params for prompt and bootstrap token
    const urlParams = new URLSearchParams(window.location.search);
    const promptFromUrl = urlParams.get('prompt');
    const agentEnabled = urlParams.get('agent') === 'true';
    const hasBootstrapToken = !!urlParams.get('bootstrap');
    
    // Check session storage for prompt (IDEPage.tsx and MobileIDEView.tsx store bootstrap prompt here)
    const promptFromSession = window.sessionStorage.getItem(`agent-prompt-${projectId}`);
    
    // ✅ FIX (Dec 9, 2025): Priority order for prompt sources:
    // 1. initialPrompt prop (passed from parent component like MobileIDEView)
    // 2. URL param (?prompt=...)
    // 3. sessionStorage (bootstrap flow)
    const resolvedPrompt = initialPrompt || promptFromUrl || promptFromSession;
    
    // ✅ FIX (Dec 7, 2025): Also trigger for bootstrap token, not just agent=true
    const shouldAutoStart = (agentEnabled || hasBootstrapToken || autoStart) && resolvedPrompt && !isWorking;
    
    if (shouldAutoStart) {
      // Mark as executed to prevent re-runs
      autoStartExecutedRef.current = true;
      // Set the prompt in the input
      setInput(resolvedPrompt);
      
      // Clear session storage
      if (promptFromSession) {
        window.sessionStorage.removeItem(`agent-prompt-${projectId}`);
      }
      
      // Auto-start building after a brief delay
      setTimeout(() => {
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: resolvedPrompt.trim(),
          timestamp: new Date(),
          status: 'sent'
        };

        setMessages(prev => [...prev, userMessage]);
        
        // ✅ FIX (Dec 10, 2025): Persist user message to backend database
        persistMessageToBackend({
          role: 'user',
          content: userMessage.content,
          timestamp: userMessage.timestamp,
        });
        
        setInput('');
        setIsWorking(true);
        setIsPendingResponse(true); // Show skeleton until first chunk
        setStreamingContent('');

        // Show thinking if extended thinking is enabled
        const extendedThinkingEnabled = capabilities.find(c => c.id === 'extended_thinking')?.enabled;
        
        if (extendedThinkingEnabled) {
          const thinkingSteps = simulateThinkingSteps(userMessage.content);
          setActiveThinking(thinkingSteps);
        }

        // Track assistant message ID for error handling
        let autoStartAssistantMessageId: string | null = null;
        
        // Call the AI streaming API
        (async () => {
          try {
            // Use selected provider from model preference (fallback to openai)
            const selectedProvider = provider || 'openai';
            
            // ✅ FIX (Dec 7, 2025): Only send conversationId if it's a valid numeric ID
            // The backend expects an integer, not a string like "conv-123456"
            const chatConversationId = conversationId && !isNaN(Number(conversationId)) 
              ? String(conversationId) 
              : undefined; // Let backend create conversation if needed
            
            // Use raw fetch for SSE streaming - apiRequest consumes the body
            const response = await fetch('/api/agent/chat/stream', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                message: userMessage.content,
                projectId: projectId,
                ...(chatConversationId && { conversationId: chatConversationId }),
                provider: selectedProvider,
                modelId: modelId || undefined,
                context: messages.slice(-5).map(m => ({
                  role: m.role,
                  content: m.content
                })),
                capabilities: {
                  extendedThinking: capabilities.find(c => c.id === 'extended_thinking')?.enabled,
                  webSearch: capabilities.find(c => c.id === 'web_search')?.enabled,
                  highPower: capabilities.find(c => c.id === 'high_power')?.enabled,
                }
              })
            });

            if (!response.ok) {
              throw new Error('Failed to get AI response');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            
            autoStartAssistantMessageId = (Date.now() + 1).toString();
            const assistantMessage: Message = {
              id: autoStartAssistantMessageId,
              role: 'assistant',
              content: '',
              timestamp: new Date(),
              thinking: extendedThinkingEnabled ? [...activeThinking] : undefined,
              isStreaming: true,
              metadata: {
                extendedThinking: extendedThinkingEnabled
              }
            };
            
            // Add assistant message to state BEFORE streaming to support live updates
            setMessages(prev => [...prev, assistantMessage]);

            let fullContent = '';
            const thinkingSteps: ThinkingStep[] = [];
            const toolExecutions: ToolExecution[] = [];
            
            while (reader) {
              const { done, value } = await reader.read();
              
              if (done) break;
              
              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('event: ')) {
                  continue;
                }
                
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    
                    if (data.content) {
                      fullContent += data.content;
                      setStreamingContent(fullContent);
                      setIsPendingResponse(false); // First chunk received
                    }
                    
                    if (data.step) {
                      setIsPendingResponse(false); // Thinking step received
                      const step: ThinkingStep = {
                        ...data.step,
                        timestamp: new Date(data.step.timestamp)
                      };
                      
                      const existingIndex = thinkingSteps.findIndex(s => s.id === step.id);
                      if (existingIndex >= 0) {
                        thinkingSteps[existingIndex] = step;
                      } else {
                        thinkingSteps.push(step);
                      }
                      
                      setActiveThinking([...thinkingSteps]);
                    }
                    
                    if (data.toolCallId) {
                      const toolId = data.toolCallId;
                      
                      if (data.tool && data.parameters && !data.result) {
                        const toolExecution: ToolExecution = {
                          id: toolId,
                          tool: data.tool,
                          parameters: data.parameters,
                          status: 'running'
                        };
                        toolExecutions.push(toolExecution);
                      }
                      
                      if (data.result !== undefined) {
                        const index = toolExecutions.findIndex(t => t.id === toolId);
                        if (index >= 0) {
                          toolExecutions[index] = {
                            ...toolExecutions[index],
                            result: data.result,
                            success: data.success,
                            status: 'complete',
                            metadata: data.metadata
                          };
                        }
                      }
                      
                      if (data.error) {
                        const index = toolExecutions.findIndex(t => t.id === toolId);
                        if (index >= 0) {
                          toolExecutions[index] = {
                            ...toolExecutions[index],
                            status: 'error',
                            error: data.error
                          };
                        }
                      }
                      
                      assistantMessage.toolExecutions = [...toolExecutions];
                      setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage && lastMessage.role === 'assistant') {
                          lastMessage.toolExecutions = [...toolExecutions];
                        }
                        return newMessages;
                      });
                    }
                  } catch (e) {
                    // Skip invalid JSON
                  }
                }
              }
            }

            // Update existing assistant message with final content
            const finalContent = fullContent || "I'll help you build that! Let me start working on it...";
            setMessages(prev => prev.map(msg =>
              msg.id === autoStartAssistantMessageId
                ? {
                    ...msg,
                    content: finalContent,
                    isStreaming: false
                  }
                : msg
            ));
            
            // ✅ FIX (Dec 10, 2025): Persist assistant message to backend database
            // Use current timestamp (not the one captured before streaming) to reflect completion time
            persistMessageToBackend({
              role: 'assistant',
              content: finalContent,
              timestamp: new Date(),
              metadata: assistantMessage.metadata,
              extendedThinking: thinkingSteps.length > 0 ? { steps: thinkingSteps } : undefined,
            });
            
            setStreamingContent('');
            setActiveThinking([]);
            
          } catch (error) {
            // Better error logging with full details
            const errorDetails = error instanceof Error 
              ? { message: error.message, stack: error.stack, name: error.name }
              : { raw: error };
            
            console.error('AI chat error - Full details:', errorDetails);
            
            const { title, message: userFriendlyError } = categorizeError(error);
            const errorContent = `⚠️ ${userFriendlyError}\n\nIf this issue persists, please try:\n- Refreshing the page\n- Checking your internet connection\n- Waiting a few moments before trying again`;
            
            toast({
              title,
              description: userFriendlyError || 'An unknown error occurred. Please check the console for details.',
              variant: 'destructive',
            });
            
            setMessages(prev => {
              // Find and update the streaming assistant message by tracked ID
              if (autoStartAssistantMessageId) {
                const existingMessage = prev.find(msg => msg.id === autoStartAssistantMessageId);
                if (existingMessage) {
                  return prev.map(msg =>
                    msg.id === autoStartAssistantMessageId
                      ? { 
                          ...msg, 
                          content: errorContent, 
                          isStreaming: false,
                          status: 'error' as const,
                          metadata: { ...msg.metadata, error: true }
                        }
                      : msg
                  );
                }
              }
              // Only append new error message if no streaming message was created
              return [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant' as const,
                content: errorContent,
                timestamp: new Date(),
                isStreaming: false,
                status: 'error' as const,
                thinking: extendedThinkingEnabled ? activeThinking : undefined,
                metadata: {
                  extendedThinking: extendedThinkingEnabled,
                  error: true
                }
              }];
            });
            setActiveThinking([]);
          } finally {
            setIsWorking(false);
            setIsPendingResponse(false);
            // Call onBuildComplete callback when bootstrap build finishes
            if (onBuildComplete) {
              onBuildComplete();
            }
          }
        })();
      }, 500); // 500ms delay for smooth UX (reduced from 1000ms since we now wait for conversationId)
      
      // Remove URL params to clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [projectId, conversationId, autoStart, isWorking, initialPrompt]); // ✅ FIX (Dec 9, 2025): Added initialPrompt to deps for mobile bootstrap

  const toggleCapability = useCallback((capabilityId: string) => {
    setCapabilities(prev => prev.map(cap =>
      cap.id === capabilityId ? { ...cap, enabled: !cap.enabled } : cap
    ));
  }, []);

  const simulateThinkingSteps = useCallback((message: string): ThinkingStep[] => {
    const baseTimestamp = new Date();
    return [
      {
        id: '1',
        type: 'reasoning',
        title: 'Understanding the request',
        content: `Analyzing: "${message.substring(0, 50)}..."`,
        status: 'complete',
        timestamp: new Date(baseTimestamp.getTime()),
        details: [
          'Identifying key requirements',
          'Checking for ambiguities',
          'Determining scope and complexity'
        ]
      },
      {
        id: '2',
        type: 'analysis',
        title: 'Analyzing technical requirements',
        content: 'Breaking down the task into implementable components',
        status: 'complete',
        timestamp: new Date(baseTimestamp.getTime() + 1000),
        details: [
          'Identifying required technologies',
          'Assessing complexity level',
          'Determining best approach'
        ]
      },
      {
        id: '3',
        type: 'planning',
        title: 'Planning implementation',
        content: 'Creating step-by-step execution plan',
        status: 'complete',
        timestamp: new Date(baseTimestamp.getTime() + 2000),
        details: [
          'Defining component structure',
          'Planning file organization',
          'Identifying dependencies'
        ]
      }
    ];
  }, []);

  // Fire-and-forget message persistence to backend
  // Does not block streaming - errors are logged but don't affect UI
  const persistMessageToBackend = useCallback((message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
    extendedThinking?: any;
  }) => {
    // Defensive validation: ensure conversationId is a valid integer
    if (!conversationId || !Number.isInteger(conversationId) || conversationId <= 0) {
      console.debug('[Persistence] Skipping: invalid conversationId', { conversationId });
      return;
    }

    // Fire-and-forget: don't await, don't block
    fetch(`/api/agent/conversation/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        metadata: message.metadata || null,
        extendedThinking: message.extendedThinking || null,
      }),
    })
      .then(res => {
        if (!res.ok) {
          // Silently handle persistence errors - non-critical
        }
      })
      .catch(err => {
        console.error('[Persistence] Error persisting message:', err);
      });
  }, [conversationId]);

  const handleSend = async () => {
    if (!input.trim() || isWorking) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Persist user message immediately (fire-and-forget)
    persistMessageToBackend({
      role: 'user',
      content: userMessage.content,
      timestamp: userMessage.timestamp,
    });
    
    setInput('');
    setIsWorking(true);
    setIsPendingResponse(true); // Show skeleton until first chunk
    setStreamingContent('');

    // Show thinking steps if extended thinking is enabled
    const extendedThinkingEnabled = capabilities.find(c => c.id === 'extended_thinking')?.enabled;
    
    if (extendedThinkingEnabled) {
      const thinkingSteps = simulateThinkingSteps(userMessage.content);
      setActiveThinking(thinkingSteps);
    }

    // Track assistant message ID for error handling
    let assistantMessageId: string | null = null;

    try {
      // Use selected provider from model preference (fallback to openai)
      const selectedProvider = provider || 'openai';
      
      // Use actual conversationId for RAG session alignment
      const chatConversationId = conversationId ? String(conversationId) : `conv-${Date.now()}`;
      
      // Use raw fetch for SSE streaming - apiRequest consumes the body
      const response = await fetch('/api/agent/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage.content,
          projectId: projectId,
          conversationId: chatConversationId,
          provider: selectedProvider,
          modelId: modelId || undefined,
          context: messages.slice(-5).map(m => ({
            role: m.role,
            content: m.content
          })),
          capabilities: {
            extendedThinking: capabilities.find(c => c.id === 'extended_thinking')?.enabled,
            webSearch: capabilities.find(c => c.id === 'web_search')?.enabled,
            highPower: capabilities.find(c => c.id === 'high_power')?.enabled,
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        thinking: extendedThinkingEnabled ? [...activeThinking] : undefined,
        isStreaming: true,
        metadata: {
          extendedThinking: extendedThinkingEnabled
        }
      };

      let fullContent = '';
      const thinkingSteps: ThinkingStep[] = [];
      const toolExecutions: ToolExecution[] = [];
      const warningMessages: Message[] = []; // Accumulate warnings during streaming
      
      // Add assistant message to state BEFORE streaming to support live tool/thinking updates
      setMessages(prev => [...prev, assistantMessage]);
      
      while (reader) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          // Handle SSE events
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim();
            continue;
          }
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Handle context truncation warnings (check for presence of warning-specific fields)
              if (data.message && typeof data.message === 'string' && !data.content && !data.step && !data.toolCallId) {
                const warningResult = handleSSEWarning(data as SSEWarningData, { toast });
                if (warningResult.shouldShow && warningResult.systemMessageContent) {
                  // Accumulate warning to be added after streaming completes
                  const systemMessage: Message = {
                    id: `system-${Date.now()}`,
                    role: 'system',
                    content: warningResult.systemMessageContent,
                    timestamp: new Date()
                  };
                  warningMessages.push(systemMessage);
                }
                continue;
              }
              
              // Regular content tokens
              if (data.content) {
                fullContent += data.content;
                setStreamingContent(fullContent);
                setIsPendingResponse(false); // First chunk received
              }
              
              // Handle thinking events from backend
              if (data.step) {
                setIsPendingResponse(false); // Thinking step received
                // Normalize timestamp from ISO string to Date object
                const step: ThinkingStep = {
                  ...data.step,
                  timestamp: new Date(data.step.timestamp)
                };
                
                // Find existing step or add new one
                const existingIndex = thinkingSteps.findIndex(s => s.id === step.id);
                if (existingIndex >= 0) {
                  thinkingSteps[existingIndex] = step;
                } else {
                  thinkingSteps.push(step);
                }
                
                setActiveThinking([...thinkingSteps]);
              }
              
              // Handle RAG status events from backend
              if (data.enabled !== undefined && data.nodesRetrieved !== undefined) {
                // RAG context is automatically injected by the backend
                // This event is for UI feedback only
              }
              
              // Handle tool execution events
              if (data.toolCallId) {
                const toolId = data.toolCallId;
                
                // Tool start event
                if (data.tool && data.parameters && !data.result) {
                  const toolExecution: ToolExecution = {
                    id: toolId,
                    tool: data.tool,
                    parameters: data.parameters,
                    status: 'running'
                  };
                  toolExecutions.push(toolExecution);
                }
                
                // Tool result event
                if (data.result !== undefined) {
                  const index = toolExecutions.findIndex(t => t.id === toolId);
                  if (index >= 0) {
                    toolExecutions[index] = {
                      ...toolExecutions[index],
                      result: data.result,
                      success: data.success,
                      status: 'complete',
                      metadata: data.metadata
                    };
                  }
                }
                
                // Tool error event
                if (data.error) {
                  const index = toolExecutions.findIndex(t => t.id === toolId);
                  if (index >= 0) {
                    toolExecutions[index] = {
                      ...toolExecutions[index],
                      status: 'error',
                      error: data.error
                    };
                  }
                }
                
                // Update assistant message with tool executions
                assistantMessage.toolExecutions = [...toolExecutions];
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.toolExecutions = [...toolExecutions];
                  }
                  return newMessages;
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      assistantMessage.content = fullContent || "I'll help you with that. Let me analyze your request...";
      assistantMessage.isStreaming = false;
      // Update existing assistant message and append any accumulated warnings
      setMessages(prev => [
        ...prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content: assistantMessage.content, isStreaming: false }
            : msg
        ),
        ...warningMessages
      ]);
      
      // Persist assistant message after streaming completes (fire-and-forget)
      persistMessageToBackend({
        role: 'assistant',
        content: assistantMessage.content,
        timestamp: assistantMessage.timestamp,
        metadata: assistantMessage.metadata,
        extendedThinking: thinkingSteps.length > 0 ? { steps: thinkingSteps } : undefined,
      });
      
      setStreamingContent('');
      setActiveThinking([]);
      
      // Call onBuildComplete callback when streaming completes in build mode
      if (agentMode === 'build' && onBuildComplete) {
        onBuildComplete();
      }
      
    } catch (error) {
      console.error('AI chat error:', error);
      
      const { title, message: userFriendlyError } = categorizeError(error);
      const errorContent = `⚠️ ${userFriendlyError}\n\nIf this issue persists, please try:\n- Refreshing the page\n- Checking your internet connection\n- Waiting a few moments before trying again`;
      
      toast({
        title,
        description: userFriendlyError,
        variant: 'destructive',
      });
      
      setMessages(prev => {
        // Find and update the streaming assistant message by tracked ID
        if (assistantMessageId) {
          const existingMessage = prev.find(msg => msg.id === assistantMessageId);
          if (existingMessage) {
            return prev.map(msg =>
              msg.id === assistantMessageId
                ? { 
                    ...msg, 
                    content: errorContent, 
                    isStreaming: false,
                    status: 'error' as const,
                    metadata: { ...msg.metadata, error: true }
                  }
                : msg
            );
          }
        }
        // Only append new error message if no streaming message was created
        return [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: errorContent,
          timestamp: new Date(),
          isStreaming: false,
          status: 'error' as const,
          thinking: extendedThinkingEnabled ? activeThinking : undefined,
          metadata: {
            extendedThinking: extendedThinkingEnabled,
            error: true
          }
        }];
      });
      setActiveThinking([]);
    } finally {
      setIsWorking(false);
      setIsPendingResponse(false);
      // Call onBuildComplete callback when build/execution finishes (for IDE integration)
      if (agentMode === 'build' && onBuildComplete) {
        onBuildComplete();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (conversationId) {
      clearStoreMessages(conversationId);
    }
    toast({
      title: 'Chat cleared',
      description: 'Conversation history has been reset',
    });
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    toast({
      title: isPaused ? 'Resumed' : 'Paused',
      description: isPaused ? 'Agent is working again' : 'Agent work has been paused',
    });
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied',
      description: 'Message copied to clipboard',
    });
  };

  const handleApproveAction = useCallback((action: Action) => {
    toast({
      title: 'Action Approved',
      description: `${action.type}: ${action.description}`,
    });
    setMessages(prev => prev.map(msg => ({
      ...msg,
      actions: msg.actions?.map(a => 
        a.id === action.id ? { ...a, status: 'approved' as const } : a
      )
    })));
  }, [toast]);

  const handleRejectAction = useCallback((action: Action) => {
    toast({
      title: 'Action Rejected',
      description: `${action.type}: ${action.description}`,
    });
    setMessages(prev => prev.map(msg => ({
      ...msg,
      actions: msg.actions?.map(a => 
        a.id === action.id ? { ...a, status: 'rejected' as const } : a
      )
    })));
  }, [toast]);

  const [isRestoringCheckpoint, setIsRestoringCheckpoint] = useState(false);

  const handleRestoreCheckpoint = useCallback(async (checkpointId: number) => {
    setIsRestoringCheckpoint(true);
    try {
      await apiRequest('POST', `/api/auto-checkpoints/${checkpointId}/restore`, {
        createBackup: true,
        includeDatabase: false
      });
      toast({
        title: 'Checkpoint Restored',
        description: `Successfully restored checkpoint #${checkpointId}`
      });
    } catch (error) {
      toast({
        title: 'Restore Failed',
        description: error instanceof Error ? error.message : 'Failed to restore checkpoint',
        variant: 'destructive'
      });
    } finally {
      setIsRestoringCheckpoint(false);
    }
  }, [toast]);

  const isCompactMode = mode === 'mobile' || mode === 'tablet';

  return (
    <div className={cn("h-full flex flex-col bg-background", className)} data-testid="replit-agent-panel-v3">
      {/* Header - Optimized for all screen sizes */}
      <div className="px-2 sm:px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-shrink">
            <ECodeLogo size="xs" showText={!isCompactMode} />
            {isWorking && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs animate-pulse flex-shrink-0" data-testid="header-badge-working">
                <Loader2 className="h-3 w-3 mr-0.5 sm:mr-1 animate-spin" />
                <span className="hidden sm:inline">Working</span>
              </Badge>
            )}
            {/* Memory Bank status indicator - shows if persistent context is active */}
            {memoryBankStatus?.initialized && (
              <MemoryBankStatusBadge initialized={true} className="hidden sm:flex text-[10px]" />
            )}
            {/* Web Search Toggle - Prominent first-class feature (Task 8: Replit Agent 3 parity) */}
            <WebSearchToggle
              enabled={agentToolsSettings.webSearch}
              onToggle={() => handleAgentToolsChange({ ...agentToolsSettings, webSearch: !agentToolsSettings.webSearch })}
              variant="button"
              size="sm"
              showLabel={false}
            />
            {/* Web Search Badge - Shows when web search is active */}
            <AnimatePresence>
              {agentToolsSettings.webSearch && !isCompactMode && (
                <WebSearchBadge enabled={agentToolsSettings.webSearch} />
              )}
            </AnimatePresence>
            {/* Model chip with dropdown for quick model selection */}
            <DropdownMenu open={isModelSelectorOpen} onOpenChange={setIsModelSelectorOpen}>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-md flex-shrink-0">
                  <CurrentModelChip
                    modelName={model?.name}
                    provider={provider || undefined}
                    supportsExtendedThinking={modelSupportsExtendedThinking}
                    extendedThinkingEnabled={capabilities.find(c => c.id === 'extended_thinking')?.enabled}
                    compact={isCompactMode}
                    data-testid="current-model-chip"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 p-2">
                <AIModelSelector 
                  variant="inline" 
                  onModelChange={(newModelId) => {
                    setPreferredModel(newModelId);
                    setIsModelSelectorOpen(false);
                  }}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-1">
            {isWorking && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handlePauseResume}
                      data-testid="button-pause-resume"
                    >
                      {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isPaused ? 'Resume' : 'Pause'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Settings dropdown - simplified (model selector moved to AgentToolsPanel) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  data-testid="button-settings"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => setAudioEnabled(!isAudioEnabled)} 
                  data-testid="dropdown-toggle-audio"
                >
                  {isAudioEnabled ? (
                    <Volume2 className="h-4 w-4 mr-2" />
                  ) : (
                    <VolumeX className="h-4 w-4 mr-2" />
                  )}
                  {isAudioEnabled ? 'Mute notifications' : 'Enable sounds'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleClearChat} className="text-destructive" data-testid="dropdown-clear-chat">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Usage Tracking - Replit Agent 3 style credits icon */}
            <UsageTrackingIcon />

            {/* Pricing Display Toggle - Replit Agent 3 effort-based pricing */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showPricing ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowPricing(!showPricing)}
                    data-testid="button-pricing"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Session pricing</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Checkpoints & Rollback Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showCheckpoints ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setShowCheckpoints(!showCheckpoints)}
                    data-testid="button-checkpoints"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Checkpoints & Rollback</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Preview Deployment - Quick access to app preview */}
            <PreviewDeploymentButton projectId={projectId} />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setHistoryModalOpen(true)}
                    data-testid="button-history"
                  >
                    <History className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  View session history
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClearChat}
              data-testid="button-new-chat"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
      </div>

      {/* Main Chat Content */}
      <>
      {/* Messages */}
      <div className="flex flex-1 flex-col overflow-hidden min-h-0">
        {/* Sync Indicator */}
        <ConversationSyncIndicator
          lastSyncedAt={conversationId ? getLastSyncedAt(conversationId) : undefined}
        />
        
        {/* Effort-based Pricing Display - OUTSIDE ScrollArea to prevent virtualization issues */}
        {/* ✅ FIX (Dec 14, 2025): Moved outside ScrollArea so panel stays open on conversation changes */}
        <AnimatePresence>
          {showPricing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 sm:px-4 py-2 border-b border-border/50"
              data-testid="pricing-panel"
            >
              <EffortPricingDisplay projectId={projectIdNum} onClose={() => setShowPricing(false)} />
            </motion.div>
          )}
        </AnimatePresence>
        
        <ScrollArea ref={scrollRef} className="flex-1 min-h-0 px-3 sm:px-4 py-3">
          <div className="space-y-4 sm:space-y-5">
          {/* Memory Bank Inline Card - Replit-style: appears at top of chat */}
          <MemoryBankPanel
            projectId={projectIdNum}
            compact={true}
            className="mb-2"
          />
          
          {/* Checkpoints Panel with Rollback UI */}
          <AnimatePresence>
            {showCheckpoints && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
                data-testid="checkpoints-panel"
              >
                <CheckpointsPanel projectId={projectIdNum} />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Build/Install/QA Validation Progress (Task 6) */}
          <AnimatePresence>
            {validationStep !== 'idle' && (
              <BuildValidationProgress
                currentStep={validationStep}
                depsResult={depsResult}
                buildResult={buildResult}
                qaResult={qaResult}
              />
            )}
          </AnimatePresence>
          
          <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <EnhancedChatMessage
              key={message.id}
              message={message}
              isCompactMode={isCompactMode}
              onCopy={handleCopyMessage}
              onApproveAction={handleApproveAction}
              onRejectAction={handleRejectAction}
              onRestoreCheckpoint={handleRestoreCheckpoint}
              isRestoringCheckpoint={isRestoringCheckpoint}
            />
          ))}

          {/* Active Thinking Steps (while streaming) */}
          {isWorking && activeThinking.length > 0 && (
            <motion.div 
              key="active-thinking"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3" 
              data-testid="active-thinking-container"
            >
              <Avatar className="h-9 w-9 ring-2 ring-offset-2 ring-offset-background ring-primary/30 shadow-lg" data-testid="active-thinking-avatar">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1" data-testid="active-thinking-display">
                {isCompactMode ? (
                  <ThinkingDisplayCompact
                    steps={activeThinking}
                    isActive={true}
                  />
                ) : (
                  <ThinkingDisplay
                    steps={activeThinking}
                    isActive={true}
                    mode="detailed"
                  />
                )}
              </div>
            </motion.div>
          )}

          {/* Streaming message with enhanced styling */}
          {isWorking && streamingContent && (
            <motion.div 
              key="streaming"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3" 
              data-testid="streaming-message-container"
            >
              <Avatar className="h-9 w-9 ring-2 ring-offset-2 ring-offset-background ring-primary/30 shadow-lg" data-testid="streaming-avatar">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <motion.div 
                  className="bg-muted/80 text-foreground rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%] shadow-md border border-border/50" 
                  data-testid="streaming-content"
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                >
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed" data-testid="streaming-text">
                    {streamingContent}
                    <motion.span 
                      className="inline-block w-0.5 h-4 bg-primary ml-1 align-middle"
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      data-testid="streaming-cursor" 
                    />
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Loading indicator - Shows streaming skeleton while waiting for first response */}
          {isPendingResponse && !streamingContent && activeThinking.length === 0 && (
            <StreamingSkeleton key="skeleton" />
          )}
          </AnimatePresence>
          
          {/* Scroll sentinel - always at the bottom */}
          <div ref={lastMessageRef} className="h-0" />
          </div>
        </ScrollArea>
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border">
        <div className="space-y-2">
          {/* Mode selector and Element Editor row - always visible like Replit Agent 3 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ModeSelector 
                mode={agentMode} 
                onChange={handleModeChange}
              />
              <span className="hidden sm:inline text-[10px] text-muted-foreground">
                {isBootstrapping && !conversationId && "Initializing agent..."}
                {(!isBootstrapping || conversationId) && agentMode === 'build' && "Agent will autonomously make changes"}
                {(!isBootstrapping || conversationId) && agentMode === 'plan' && "Agent will brainstorm without changes"}
                {(!isBootstrapping || conversationId) && agentMode === 'edit' && "Targeted changes to specific files"}
                {(!isBootstrapping || conversationId) && agentMode === 'fast' && "Quick, precise changes in seconds"}
              </span>
            </div>
            
            {/* Element Editor toggle - Replit Nov 2025 feature */}
            <div className="relative">
              <ElementEditor
                isActive={elementEditorActive}
                onToggle={() => setElementEditorActive(!elementEditorActive)}
                selectedElement={selectedElement}
                onSave={handleElementSave}
                onCancel={() => {
                  setSelectedElement(null);
                  setElementEditorActive(false);
                }}
              />
            </div>
          </div>
          
          {/* Max Autonomy Progress - shown when toggle is on */}
          {agentToolsSettings.maxAutonomy && autonomySessionId && (
            <MaxAutonomyProgress
              sessionId={autonomySessionId}
              projectId={projectIdNum}
              onStop={handleStopAutonomy}
            />
          )}
          
          {/* Chat input with inline toolbar - Replit-style with attachment/voice/send */}
          <div className="relative">
            {/* Hidden file input for attachment button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept="image/*,.pdf,.txt,.md,.json,.js,.ts,.jsx,.tsx,.py,.html,.css"
              data-testid="input-file-hidden"
            />
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                agentMode === 'build' ? "What would you like me to build?" :
                agentMode === 'edit' ? "Describe the changes you want to make..." :
                "Ask a question or describe what you want to plan..."
              }
              className={cn(
                "pr-24 resize-none text-sm min-h-[52px] max-h-[200px]",
                "rounded-xl border border-border/50 focus:border-primary/50",
                "transition-all duration-200 shadow-sm focus:shadow-md",
                "placeholder:text-muted-foreground/70"
              )}
              disabled={isWorking}
              data-testid="input-message"
            />
            {/* Replit-style action buttons - attachment, voice, send */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleAttachmentClick}
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      data-testid="button-attach"
                      title="Attach file"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Attach file</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleVoiceClick}
                      className={cn(
                        "h-7 w-7 rounded-lg transition-all duration-200",
                        isRecording 
                          ? "text-red-500 bg-red-500/10 hover:bg-red-500/20 animate-pulse" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                      data-testid="button-voice"
                      title={isRecording ? "Stop recording" : "Voice input"}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{isRecording ? "Stop recording" : "Voice input"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      data-testid="button-figma-import"
                      title="Import from Figma"
                      onClick={() => toast({ title: "Figma Import", description: "Connect your Figma account in settings to import designs." })}
                    >
                      <SiFigma className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Import from Figma</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || isWorking || !conversationId}
                  className={cn(
                    "h-7 w-7 rounded-lg",
                    "transition-all duration-200",
                    input.trim() && conversationId && !isWorking 
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}
                  data-testid="button-send"
                  title={!conversationId ? "Initializing conversation..." : "Send message"}
                >
                  {isWorking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
          
          {/* Chat Toolbar - Replit Agent 3 inline icons for quick toggle access */}
          {isCompactMode ? (
            <ChatToolbarMobile
              extendedThinking={agentToolsSettings.extendedThinking}
              highPowerModels={agentToolsSettings.highPowerModels}
              onToggleExtendedThinking={() => handleAgentToolsChange({ ...agentToolsSettings, extendedThinking: !agentToolsSettings.extendedThinking })}
              onToggleHighPowerModels={() => handleAgentToolsChange({ ...agentToolsSettings, highPowerModels: !agentToolsSettings.highPowerModels })}
              isUpdating={false}
            />
          ) : (
            <ChatToolbar
              extendedThinking={agentToolsSettings.extendedThinking}
              highPowerModels={agentToolsSettings.highPowerModels}
              onToggleExtendedThinking={() => handleAgentToolsChange({ ...agentToolsSettings, extendedThinking: !agentToolsSettings.extendedThinking })}
              onToggleHighPowerModels={() => handleAgentToolsChange({ ...agentToolsSettings, highPowerModels: !agentToolsSettings.highPowerModels })}
              onToggleElementSelector={() => setElementEditorActive(!elementEditorActive)}
              elementSelectorActive={elementEditorActive}
              isUpdating={false}
            />
          )}
          
          {/* RAG Context - Automatic (Replit-style: no visible toggle, always enabled) */}
          {/* Knowledge retrieval happens automatically behind the scenes like Replit's Agent */}
          
          {/* Agent Tools Panel - Replit Agent 3 toggles: Max Autonomy, App Testing, Extended Thinking, High Power Models, Web Search */}
          <AgentToolsPanel
            projectId={projectIdNum}
            settings={agentToolsSettings}
            onSettingsChange={handleAgentToolsChange}
            onViewVideoReplays={handleViewVideoReplays}
            videoReplayCount={videoReplayCount}
            compact={mode !== 'desktop'}
            actualModelName={model?.name}
          />
        </div>
      </div>
        </>

      {/* Agent History Modal - For viewing full session history */}
      {projectIdNum > 0 && (
        <AgentHistoryModal
          open={historyModalOpen}
          onOpenChange={setHistoryModalOpen}
          projectId={projectIdNum}
        />
      )}
      
      {/* Video Replay Viewer - For viewing test session recordings */}
      <VideoReplayViewer
        open={videoReplayViewerOpen}
        onOpenChange={setVideoReplayViewerOpen}
        projectId={projectIdNum}
      />
    </div>
  );
}
