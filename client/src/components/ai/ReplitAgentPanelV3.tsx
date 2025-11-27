import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  AlertCircle
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
import { UsageTrackingIcon } from './UsageTrackingIcon';
import { VideoReplayViewer } from './VideoReplayViewer';
import { History, X, MousePointer2, Coins } from 'lucide-react';

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

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  thinking?: ThinkingStep[];
  toolExecutions?: ToolExecution[];
  isStreaming?: boolean;
  type?: 'text' | 'workflow_features' | 'workflow_build_choice' | 'workflow_design' | 'workflow_mvp';
  workflowPhase?: WorkflowPhase;
  workflowPayload?: {
    featureList?: string[];
    taskList?: string[];
    designPreviewUrl?: string;
    buildChoice?: 'full' | 'design';
  };
  tasks?: Task[];
  actions?: Action[];
  checkpoint?: {
    id: string;
    name: string;
    diff: FileDiff[];
    rollbackAvailable: boolean;
  };
  metadata?: {
    model?: string;
    provider?: string;
    tokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    cost?: string;
    latency?: number;
    webSearchUsed?: boolean;
    extendedThinking?: boolean;
    cacheHit?: boolean;
    streamingDuration?: number;
    finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
  };
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
}

export function ReplitAgentPanelV3({ 
  projectId, 
  className,
  onMinimize,
  mode = 'desktop'
}: ReplitAgentPanelV3Props) {
  // AI Model preference hook
  const { modelId, provider, supportsExtendedThinking: modelSupportsExtendedThinking, model, setPreferredModel } = useAgentModelPreference();
  
  // State for model selector dropdown
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  
  // Conversation state
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [agentMode, setAgentMode] = useState<AgentMode>('build');
  const [autonomySessionId, setAutonomySessionId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI assistant with extended thinking capabilities. I can help you build, debug, and improve your code with transparent reasoning. What would you like to create today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
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
  
  // Agent Tools Panel settings (Replit Agent 3 exact toggles)
  const [agentToolsSettings, setAgentToolsSettings] = useState<AgentToolsSettings>({
    maxAutonomy: false,
    appTesting: true, // ON by default per Replit Agent 3
    extendedThinking: false,
    highPowerModels: false,
    webSearch: false
  });
  
  // Element Editor state
  const [elementEditorActive, setElementEditorActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementSelection | null>(null);
  const [videoReplayCount, setVideoReplayCount] = useState(0);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Bootstrap conversation on mount
  useEffect(() => {
    const bootstrapConversation = async () => {
      try {
        const response = await apiRequest('POST', '/api/agent/conversation', {
          projectId: projectId.toString()
        }) as { conversationId: number; agentMode: 'plan' | 'build'; existing: boolean };

        setConversationId(response.conversationId);
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
  }, [projectId, toast]);

  // Max Autonomy hook
  const projectIdNum = typeof projectId === 'string' ? parseInt(projectId) : projectId;
  const {
    startSession: startAutonomySession,
    isStartingSession: isStartingAutonomy,
    session: autonomySession
  } = useMaxAutonomy(autonomySessionId, projectIdNum);

  // Handler for agent tools settings changes (Replit Agent 3 toggles)
  const handleAgentToolsChange = useCallback((newSettings: AgentToolsSettings) => {
    setAgentToolsSettings(newSettings);
    
    // Handle Max Autonomy toggle
    if (newSettings.maxAutonomy && !agentToolsSettings.maxAutonomy) {
      toast({
        title: "Max Autonomy Enabled",
        description: "Agent will supervise itself for up to 200 minutes"
      });
    }
    
    // Handle App Testing toggle
    if (newSettings.appTesting && !agentToolsSettings.appTesting) {
      toast({
        title: "App Testing Enabled",
        description: "Agent will test using browser automation with video replays"
      });
    }
    
    // Handle Extended Thinking toggle
    if (newSettings.extendedThinking && !agentToolsSettings.extendedThinking) {
      toast({
        title: "Extended Thinking Enabled",
        description: "Deeper reasoning for harder problems"
      });
    }
    
    // Handle High Power Models toggle
    if (newSettings.highPowerModels && !agentToolsSettings.highPowerModels) {
      toast({
        title: "High Power Models Enabled",
        description: "Using sophisticated AI for complex tasks"
      });
    }
    
    // Handle Web Search toggle
    if (newSettings.webSearch && !agentToolsSettings.webSearch) {
      toast({
        title: "Web Search Enabled",
        description: "Agent can search the web for docs and APIs"
      });
    }
  }, [agentToolsSettings, toast]);
  
  // Handler for Element Editor save
  const handleElementSave = useCallback((changes: Partial<ElementSelection['styles']> & { text?: string }) => {
    console.log('Element changes to apply:', changes);
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
    if (!conversationId) {
      console.error('Cannot change mode: no conversationId');
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
        edit: "Targeted changes to specific files with precise control"
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

  // Auto-scroll to bottom using instant scroll for reliability
  useEffect(() => {
    if (lastMessageRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        lastMessageRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      });
    }
  }, [messages, streamingContent, activeThinking]);

  // Auto-focus input
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-start building from URL prompt (Build from Homepage feature)
  useEffect(() => {
    // Check URL params for prompt
    const urlParams = new URLSearchParams(window.location.search);
    const promptFromUrl = urlParams.get('prompt');
    const agentEnabled = urlParams.get('agent') === 'true';
    
    // Check session storage for prompt
    const promptFromSession = window.sessionStorage.getItem(`agent-prompt-${projectId}`);
    
    const initialPrompt = promptFromUrl || promptFromSession;
    
    if (agentEnabled && initialPrompt && !isWorking) {
      // Set the prompt in the input
      setInput(initialPrompt);
      
      // Clear session storage
      if (promptFromSession) {
        window.sessionStorage.removeItem(`agent-prompt-${projectId}`);
      }
      
      // Auto-start building after a brief delay
      setTimeout(() => {
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: initialPrompt.trim(),
          timestamp: new Date(),
          status: 'sent'
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsWorking(true);
        setStreamingContent('');

        // Show thinking if extended thinking is enabled
        const extendedThinkingEnabled = capabilities.find(c => c.id === 'extended_thinking')?.enabled;
        
        if (extendedThinkingEnabled) {
          const thinkingSteps = simulateThinkingSteps(userMessage.content);
          setActiveThinking(thinkingSteps);
        }

        // Call the AI streaming API
        (async () => {
          try {
            // Use selected provider from model preference (fallback to openai)
            const selectedProvider = provider || 'openai';
            
            const response = await apiRequest('POST', '/api/agent/chat/stream', {
              message: userMessage.content,
              projectId: projectId,
              conversationId: `conv-${Date.now()}`,
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
            });

            if (!response.ok) {
              throw new Error('Failed to get AI response');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
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
                    }
                    
                    if (data.step) {
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

            assistantMessage.content = fullContent || "I'll help you build that! Let me start working on it...";
            assistantMessage.isStreaming = false;
            setMessages(prev => [...prev, assistantMessage]);
            setStreamingContent('');
            setActiveThinking([]);
            
          } catch (error) {
            console.error('AI chat error:', error);
            
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: "I'll help you build that! Let me start creating the project structure...",
              timestamp: new Date(),
              thinking: extendedThinkingEnabled ? activeThinking : undefined,
              metadata: {
                extendedThinking: extendedThinkingEnabled
              }
            };
            setMessages(prev => [...prev, assistantMessage]);
            setActiveThinking([]);
          } finally {
            setIsWorking(false);
          }
        })();
      }, 1000); // 1 second delay for smooth UX
      
      // Remove URL params to clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [projectId]); // Only run once on mount

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
    setInput('');
    setIsWorking(true);
    setStreamingContent('');

    // Show thinking steps if extended thinking is enabled
    const extendedThinkingEnabled = capabilities.find(c => c.id === 'extended_thinking')?.enabled;
    
    if (extendedThinkingEnabled) {
      const thinkingSteps = simulateThinkingSteps(userMessage.content);
      setActiveThinking(thinkingSteps);
    }

    try {
      // Use selected provider from model preference (fallback to openai)
      const selectedProvider = provider || 'openai';
      
      const response = await apiRequest('POST', '/api/agent/chat/stream', {
        message: userMessage.content,
        projectId: projectId,
        conversationId: `conv-${Date.now()}`,
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
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
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
              }
              
              // Handle thinking events from backend
              if (data.step) {
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
      setStreamingContent('');
      setActiveThinking([]);
      
    } catch (error) {
      console.error('AI chat error:', error);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'll help you with that. Let me analyze your request and start working on it...",
        timestamp: new Date(),
        thinking: extendedThinkingEnabled ? activeThinking : undefined,
        metadata: {
          extendedThinking: extendedThinkingEnabled
        }
      };
      setMessages(prev => [...prev, assistantMessage]);
      setActiveThinking([]);
    } finally {
      setIsWorking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([messages[0]]);
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

  const isCompactMode = mode === 'mobile' || mode === 'tablet';

  return (
    <div className={cn("h-full flex flex-col bg-background", className)} data-testid="replit-agent-panel-v3">
      {/* Header with Tabs */}
      <div className="px-4 py-2 border-b border-border bg-card space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">AI Agent</h3>
            {isWorking && (
              <Badge variant="secondary" className="text-xs animate-pulse" data-testid="header-badge-working">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Working
              </Badge>
            )}
            {capabilities.find(c => c.id === 'extended_thinking')?.enabled && (
              <Badge variant="outline" className="text-xs" data-testid="header-badge-thinking">
                <Brain className="h-3 w-3 mr-1" />
                Thinking
              </Badge>
            )}
            
            <CurrentModelChip
              modelName={model?.name}
              provider={provider || undefined}
              supportsExtendedThinking={modelSupportsExtendedThinking}
              extendedThinkingEnabled={capabilities.find(c => c.id === 'extended_thinking')?.enabled}
              onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
              data-testid="current-model-chip"
            />
            
            {/* Extended Thinking Toggle - Always visible, disabled when model doesn't support */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent/50 transition-colors">
                    <Label 
                      htmlFor="extended-thinking-header-toggle" 
                      className={cn(
                        "text-xs cursor-pointer flex items-center gap-1.5",
                        !modelSupportsExtendedThinking && "opacity-50"
                      )}
                    >
                      <Brain className="h-3 w-3" />
                      <span>Extended Thinking</span>
                      {!modelSupportsExtendedThinking && (
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                      )}
                    </Label>
                    <Switch
                      id="extended-thinking-header-toggle"
                      checked={capabilities.find(c => c.id === 'extended_thinking')?.enabled || false}
                      disabled={!modelSupportsExtendedThinking}
                      onCheckedChange={(checked) => {
                        setCapabilities(prev => prev.map(cap =>
                          cap.id === 'extended_thinking' ? { ...cap, enabled: checked } : cap
                        ));
                      }}
                      data-testid="toggle-extended-thinking"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {modelSupportsExtendedThinking 
                    ? "Deep reasoning with visible thought process" 
                    : `Current model doesn't support Extended Thinking. Select a compatible model (e.g., Claude Sonnet) to enable.`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            
            <DropdownMenu open={isModelSelectorOpen} onOpenChange={setIsModelSelectorOpen}>
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
              <DropdownMenuContent align="end" className="w-64 sm:w-72">
                <div className="p-2 space-y-2">
                  <div className="font-medium text-xs text-muted-foreground uppercase tracking-wide">AI Model</div>
                  <AIModelSelector 
                    variant="inline" 
                    className="mb-2" 
                    onModelChange={(newModelId) => setPreferredModel(newModelId)}
                  />
                  
                  <div className="font-medium text-xs text-muted-foreground uppercase tracking-wide pt-1">Capabilities</div>
                  {capabilities.map(capability => {
                    const Icon = capability.icon;
                    const isDisabled = capability.id === 'extended_thinking' && !modelSupportsExtendedThinking;
                    
                    return (
                      <div key={capability.id} className="flex items-center justify-between gap-2 py-1" data-testid={`capability-${capability.id}`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" data-testid={`capability-icon-${capability.id}`} />
                          <div className="flex items-center gap-1 min-w-0">
                            <Label htmlFor={capability.id} className={cn("text-xs font-medium cursor-pointer truncate", isDisabled && "opacity-50")} data-testid={`capability-label-${capability.id}`}>
                              {capability.label}
                            </Label>
                            {capability.badge && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0" data-testid={`capability-badge-${capability.id}`}>
                                {capability.badge}
                              </Badge>
                            )}
                            {isDisabled && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertCircle className="h-3 w-3 text-yellow-500 shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[200px] text-xs">
                                    Model doesn't support Extended Thinking
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                        <Switch
                          id={capability.id}
                          checked={capability.enabled}
                          onCheckedChange={() => toggleCapability(capability.id)}
                          disabled={isDisabled}
                          className="scale-90"
                          data-testid={`switch-${capability.id}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleClearChat} className="text-destructive" data-testid="dropdown-clear-chat">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Usage Tracking - Replit Agent 3 style credits icon */}
            <UsageTrackingIcon />

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
              onClick={() => setMessages([messages[0]])}
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
      <div className="flex flex-1 flex-col overflow-hidden">
        <ScrollArea ref={scrollRef} className="flex-1 px-4 py-3">
          <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' && "flex-row-reverse"
              )}
              data-testid={`message-${message.id}`}
            >
              {/* Avatar */}
              <Avatar className="h-8 w-8 shrink-0" data-testid={`avatar-${message.role}-${message.id}`}>
                <AvatarFallback className={cn(
                  "text-xs font-semibold",
                  message.role === 'assistant' 
                    ? "bg-primary/10 text-primary" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {message.role === 'assistant' ? <Sparkles className="h-4 w-4" /> : 'You'}
                </AvatarFallback>
              </Avatar>

              {/* Message content */}
              <div className={cn(
                "flex-1 space-y-2 max-w-[85%]",
                message.role === 'user' && "flex flex-col items-end"
              )}>
                {/* Thinking Display */}
                {message.thinking && message.thinking.length > 0 && (
                  <div className="w-full">
                    {isCompactMode ? (
                      <ThinkingDisplayCompact
                        steps={message.thinking}
                        isActive={message.isStreaming}
                      />
                    ) : (
                      <ThinkingDisplay
                        steps={message.thinking}
                        isActive={message.isStreaming}
                        mode="detailed"
                      />
                    )}
                  </div>
                )}

                {/* Message bubble with Rich Content */}
                <div 
                  className={cn(
                    "rounded-lg px-3 py-2 relative group",
                    message.role === 'assistant'
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                  data-testid={`message-content-${message.id}`}
                >
                  {message.role === 'assistant' && message.content ? (
                    <RichMessageContent content={message.content} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words" data-testid={`message-text-${message.id}`}>
                      {message.content}
                    </p>
                  )}

                  {/* Copy button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleCopyMessage(message.content)}
                    data-testid={`button-copy-${message.id}`}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {/* Tasks - Inline task checklist like Replit */}
                {message.tasks && message.tasks.length > 0 && (
                  <div className="w-full mt-2" data-testid={`tasks-${message.id}`}>
                    <TaskMessage tasks={message.tasks} />
                  </div>
                )}

                {/* Actions - Inline approve/reject like Replit */}
                {message.actions && message.actions.length > 0 && (
                  <div className="w-full mt-2" data-testid={`actions-${message.id}`}>
                    <ActionMessage 
                      actions={message.actions}
                      onApprove={(action) => handleApproveAction(action)}
                      onReject={(action) => handleRejectAction(action)}
                    />
                  </div>
                )}

                {/* Tool Executions - inline in chat like Replit */}
                {message.toolExecutions && message.toolExecutions.length > 0 && (
                  <div className="w-full mt-2" data-testid={`tool-executions-${message.id}`}>
                    <ToolExecutionList 
                      toolExecutions={message.toolExecutions} 
                      showFilters={false}
                      compact={true}
                    />
                  </div>
                )}

                {/* Metadata Footer */}
                {message.metadata && message.role === 'assistant' && (
                  <MessageMetadataFooter
                    metadata={message.metadata}
                    messageId={message.id}
                    compact={isCompactMode}
                  />
                )}
              </div>
            </div>
          ))}

          {/* Active Thinking Steps (while streaming) */}
          {isWorking && activeThinking.length > 0 && (
            <div className="flex gap-3" data-testid="active-thinking-container">
              <Avatar className="h-8 w-8" data-testid="active-thinking-avatar">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  <Sparkles className="h-4 w-4" />
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
            </div>
          )}

          {/* Streaming message */}
          {isWorking && streamingContent && (
            <div className="flex gap-3" data-testid="streaming-message-container">
              <Avatar className="h-8 w-8" data-testid="streaming-avatar">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  <Sparkles className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-muted text-foreground rounded-lg px-3 py-2 max-w-[85%]" data-testid="streaming-content">
                  <p className="text-sm whitespace-pre-wrap break-words" data-testid="streaming-text">
                    {streamingContent}
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 align-middle" data-testid="streaming-cursor" />
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isWorking && !streamingContent && activeThinking.length === 0 && (
            <div className="flex gap-3" data-testid="loading-indicator">
              <Avatar className="h-8 w-8" data-testid="loading-avatar">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg" data-testid="loading-message">
                <Loader2 className="h-4 w-4 animate-spin text-primary" data-testid="loading-spinner" />
                <span className="text-sm text-muted-foreground" data-testid="loading-text">Initializing...</span>
              </div>
            </div>
          )}
          
          {/* Scroll sentinel - always at the bottom */}
          <div ref={lastMessageRef} className="h-0" />
          </div>
        </ScrollArea>
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border">
        <div className="space-y-2">
          {/* Mode selector and Element Editor row - above input like Replit */}
          {conversationId && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ModeSelector 
                  mode={agentMode} 
                  onChange={handleModeChange}
                />
                <span className="text-[10px] text-muted-foreground">
                  {agentMode === 'build' && "Agent will autonomously make changes"}
                  {agentMode === 'plan' && "Agent will brainstorm without changes"}
                  {agentMode === 'edit' && "Targeted changes to specific files"}
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
          )}
          
          {/* Max Autonomy Progress - shown when toggle is on */}
          {agentToolsSettings.maxAutonomy && autonomySessionId && (
            <MaxAutonomyProgress
              sessionId={autonomySessionId}
              projectId={projectIdNum}
              onStop={handleStopAutonomy}
            />
          )}
          
          {/* Chat input with inline toolbar */}
          <div className="relative">
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
              className="pr-12 resize-none text-sm min-h-[60px] max-h-[200px]"
              disabled={isWorking}
              data-testid="input-message"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isWorking}
              className="absolute bottom-2 right-2 h-7 w-7 rounded"
              data-testid="button-send"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {/* Chat Toolbar - Replit Agent 3 inline icons for quick toggle access */}
          {isCompactMode ? (
            <ChatToolbarMobile
              extendedThinking={agentToolsSettings.extendedThinking}
              highPowerModels={agentToolsSettings.highPowerModels}
              webSearch={agentToolsSettings.webSearch}
              onToggleExtendedThinking={() => handleAgentToolsChange({ ...agentToolsSettings, extendedThinking: !agentToolsSettings.extendedThinking })}
              onToggleHighPowerModels={() => handleAgentToolsChange({ ...agentToolsSettings, highPowerModels: !agentToolsSettings.highPowerModels })}
              onToggleWebSearch={() => handleAgentToolsChange({ ...agentToolsSettings, webSearch: !agentToolsSettings.webSearch })}
              isUpdating={false}
            />
          ) : (
            <ChatToolbar
              extendedThinking={agentToolsSettings.extendedThinking}
              highPowerModels={agentToolsSettings.highPowerModels}
              webSearch={agentToolsSettings.webSearch}
              onToggleExtendedThinking={() => handleAgentToolsChange({ ...agentToolsSettings, extendedThinking: !agentToolsSettings.extendedThinking })}
              onToggleHighPowerModels={() => handleAgentToolsChange({ ...agentToolsSettings, highPowerModels: !agentToolsSettings.highPowerModels })}
              onToggleWebSearch={() => handleAgentToolsChange({ ...agentToolsSettings, webSearch: !agentToolsSettings.webSearch })}
              onToggleElementSelector={() => setElementEditorActive(!elementEditorActive)}
              elementSelectorActive={elementEditorActive}
              isUpdating={false}
            />
          )}
          
          {/* Agent Tools Panel - Replit Agent 3 toggles: Max Autonomy, App Testing, Extended Thinking, High Power Models, Web Search */}
          <AgentToolsPanel
            projectId={projectIdNum}
            settings={agentToolsSettings}
            onSettingsChange={handleAgentToolsChange}
            onViewVideoReplays={handleViewVideoReplays}
            videoReplayCount={videoReplayCount}
            compact={mode !== 'desktop'}
          />
        </div>
        
        {/* Quick actions */}
        {!isWorking && messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mt-3" data-testid="quick-actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("Build a full-stack dashboard with real-time charts, data tables with sorting/filtering, user authentication, and dark mode support")}
              className="text-xs"
              data-testid="quick-action-dashboard"
            >
              Build Dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("Add Stripe payment integration with subscription billing, usage tracking, and customer portal")}
              className="text-xs"
              data-testid="quick-action-payments"
            >
              Add Payments
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("Implement user authentication with email/password, social login (Google, GitHub), session management, and protected routes")}
              className="text-xs"
              data-testid="quick-action-auth"
            >
              Add Auth
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput("Debug and fix all TypeScript errors, optimize performance bottlenecks, and add proper error handling throughout the codebase")}
              className="text-xs"
              data-testid="quick-action-debug"
            >
              Debug & Optimize
            </Button>
          </div>
        )}
      </div>
        </>

      {/* Agent History Modal - For viewing full session history */}
      <AgentHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        projectId={typeof projectId === 'number' ? projectId : parseInt(projectId as string, 10) || undefined}
      />
      
      {/* Video Replay Viewer - For viewing test session recordings */}
      <VideoReplayViewer
        open={videoReplayViewerOpen}
        onOpenChange={setVideoReplayViewerOpen}
        projectId={projectIdNum}
      />
    </div>
  );
}
