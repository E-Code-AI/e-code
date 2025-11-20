/**
 * Universal Autonomous Agent Interface
 * Platform-agnostic agent controls that work seamlessly on web, desktop, and mobile
 * @version 3.0.0 - Added mobile swipe gestures, pull-to-refresh, swipe navigation (Task 2)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAgentWebSocket } from '@/hooks/use-agent-websocket';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Bot,
  Play,
  Square,
  Loader2,
  Sparkles,
  Code,
  FileText,
  Terminal,
  CheckCircle,
  AlertCircle,
  Settings,
  Zap,
  Brain,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  Share2,
  Clock,
  DollarSign,
  TrendingUp,
  Activity
} from 'lucide-react';

interface UniversalAgentInterfaceProps {
  projectId: number;
  className?: string;
  viewport?: 'mobile' | 'tablet' | 'desktop' | 'auto';
}

// UI-specific types (synced with backend API responses)
interface AgentSession {
  id: string;
  status: 'idle' | 'thinking' | 'executing' | 'completed' | 'error';
  progress: number;
  currentTask?: string;
  actions: AgentAction[];
  metrics: AgentMetrics;
  startTime?: number;
  estimatedCompletion?: number;
}

interface AgentAction {
  id: string;
  type: 'code' | 'file' | 'command' | 'analysis' | 'test';
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  timestamp: number;
  details?: any;
}

interface AgentMetrics {
  filesModified: number;
  linesWritten: number;
  testsGenerated: number;
  bugsFixed: number;
  tokensUsed: number;
  costInCents: number;
}

interface AgentPreferences {
  model: string;
  autonomyLevel: 'guided' | 'semi-autonomous' | 'fully-autonomous';
  autoTest: boolean;
  autoCommit: boolean;
  riskThreshold: 'low' | 'medium' | 'high';
  streamingEnabled: boolean;
}

export function UniversalAgentInterface({
  projectId,
  className,
  viewport = 'auto'
}: UniversalAgentInterfaceProps) {
  const { toast } = useToast();
  
  // State management
  const [taskDescription, setTaskDescription] = useState('');
  const [activeSession, setActiveSession] = useState<AgentSession | null>(null);
  const [preferences, setPreferences] = useState<AgentPreferences>({
    model: 'claude-sonnet-4-5',
    autonomyLevel: 'semi-autonomous',
    autoTest: true,
    autoCommit: false,
    riskThreshold: 'medium',
    streamingEnabled: true
  });
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [detectedViewport, setDetectedViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  // Task 2: Mobile swipe gesture state
  const [swipedAction, setSwipedAction] = useState<string | null>(null);
  const [pullToRefreshState, setPullToRefreshState] = useState<'idle' | 'pulling' | 'releasing' | 'refreshing'>('idle');
  const [currentTab, setCurrentTab] = useState('task');
  const pullToRefreshControls = useAnimation();
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Detect viewport size for responsive layout
  useEffect(() => {
    if (viewport !== 'auto') {
      setDetectedViewport(viewport);
      return;
    }
    
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDetectedViewport('mobile');
      } else if (width < 1024) {
        setDetectedViewport('tablet');
      } else {
        setDetectedViewport('desktop');
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewport]);
  
  // Query active session
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['/api/agent/session', projectId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/agent/session/${projectId}`);
      return res.json();
    },
    refetchInterval: activeSession ? 1000 : 5000
  });
  
  // Query agent preferences
  const { data: preferencesData } = useQuery({
    queryKey: ['/api/agent/preferences', projectId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/agent/preferences/${projectId}`);
      return res.json();
    }
  });
  
  // Update local preferences when fetched
  useEffect(() => {
    if (preferencesData?.preferences) {
      setPreferences(prev => ({ ...prev, ...preferencesData.preferences }));
    }
  }, [preferencesData]);
  
  // WebSocket for real-time updates (Architect Fix #1 - Authoritative server merge)
  const handleWebSocketUpdate = useCallback((update: any) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      
      if (update.type === 'step' && update.data?.step) {
        // Update specific action
        const updatedActions = [...(prev.actions || [])];
        const existingIndex = updatedActions.findIndex(a => a.id === update.data.step.id);
        
        if (existingIndex >= 0) {
          updatedActions[existingIndex] = { ...updatedActions[existingIndex], ...update.data.step };
        } else {
          updatedActions.push(update.data.step);
        }
        
        return { ...prev, actions: updatedActions };
      } else if (update.type === 'progress') {
        // Full server merge: use ALL provided fields, preserve only what server omits
        return {
          ...prev,
          ...update.data,
          actions: update.data.actions || prev.actions, // Server wins if provided
          progress: update.data.progress ?? prev.progress,
          currentTask: update.data.currentTask ?? prev.currentTask,
          metrics: update.data.metrics || prev.metrics,
          status: update.data.status ?? prev.status
        };
      } else if (update.type === 'complete') {
        // Terminal state: Full merge of top-level complete data
        return {
          ...prev,
          ...update.data,
          actions: update.data.actions || prev.actions,
          metrics: update.data.metrics || prev.metrics,
          status: 'completed',
          progress: 100
        };
      } else if (update.type === 'error') {
        // Terminal error state
        return {
          ...prev,
          ...update.data,
          actions: update.data.actions || prev.actions,
          status: 'error',
          currentTask: update.data?.error || 'Error occurred'
        };
      } else if (update.type === 'summary') {
        // Summary: spread top-level summary AND merge nested summary object
        return {
          ...prev,
          ...update.data, // Top-level fields (completedAt, etc.)
          ...update.data.summary, // Nested summary fields
          actions: update.data.summary?.actions || update.data.actions || prev.actions,
          metrics: update.data.metrics || update.data.summary?.metrics || prev.metrics, // Prefer top-level metrics
          status: 'completed',
          progress: 100
        };
      }
      
      return prev;
    });
  }, []);
  
  useAgentWebSocket({
    projectId,
    sessionId: activeSession?.id,
    onUpdate: handleWebSocketUpdate,
    enabled: preferences.streamingEnabled && !!activeSession
  });
  
  // Update active session when data changes (fallback to polling)
  useEffect(() => {
    if (sessionData?.session) {
      setActiveSession(sessionData.session);
    }
  }, [sessionData]);
  
  // Start agent mutation
  const startAgent = useMutation({
    mutationFn: async (task: string) => {
      const res = await apiRequest('POST', '/api/agent/start', {
        projectId,
        task,
        preferences
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent/session', projectId] });
      toast({
        title: 'Agent Started',
        description: 'Your autonomous agent is now working on your task.',
      });
      setTaskDescription('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start agent',
        variant: 'destructive',
      });
    }
  });
  
  // Stop agent mutation (Architect Fix #5: error handling)
  const stopAgent = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest('POST', '/api/agent/stop', {
        projectId,
        sessionId
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent/session', projectId] });
      toast({
        title: 'Agent Stopped',
        description: 'The agent has been stopped.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Stop Agent',
        description: error.message || 'Could not stop the agent. Please try again.',
        variant: 'destructive',
      });
    }
  });
  
  // Update preferences mutation (Architect Fix #2: server-authoritative with optimistic UI)
  const updatePreferences = useMutation({
    mutationFn: async (newPrefs: Partial<AgentPreferences>) => {
      const res = await apiRequest('PUT', `/api/agent/preferences/${projectId}`, {
        preferences: newPrefs
      });
      return res.json();
    },
    onMutate: async (newPrefs) => {
      // Snapshot previous state for rollback
      const previousPrefs = { ...preferences };
      // Optimistic update using ONLY the mutation variables
      setPreferences(prev => ({ ...prev, ...newPrefs }));
      return { previousPrefs, optimisticPrefs: newPrefs };
    },
    onSuccess: (data, variables, context) => {
      // Server response is authoritative - fully replace with server values
      if (data?.preferences) {
        setPreferences(data.preferences);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/agent/preferences', projectId] });
      toast({
        title: 'Preferences Updated',
        description: 'Your agent preferences have been saved.',
      });
    },
    onError: (error: any, newPrefs, context) => {
      // Rollback to previous state on error
      if (context?.previousPrefs) {
        setPreferences(context.previousPrefs);
      }
      toast({
        title: 'Failed to Update Preferences',
        description: error.message || 'Could not save preferences. Changes have been reverted.',
        variant: 'destructive',
      });
    }
  });
  
  // Auto-scroll to latest action
  useEffect(() => {
    if (scrollAreaRef.current && activeSession?.actions.length) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [activeSession?.actions.length]);
  
  const handleStartAgent = () => {
    if (!taskDescription.trim()) {
      toast({
        title: 'Task Required',
        description: 'Please describe what you want the agent to build.',
        variant: 'destructive',
      });
      return;
    }
    
    startAgent.mutate(taskDescription);
  };
  
  const toggleActionExpansion = (actionId: string) => {
    setExpandedActions(prev => {
      const next = new Set(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  };
  
  const getActionIcon = (type: AgentAction['type']) => {
    switch (type) {
      case 'code': return Code;
      case 'file': return FileText;
      case 'command': return Terminal;
      case 'analysis': return Brain;
      case 'test': return CheckCircle;
      default: return Activity;
    }
  };
  
  const getStatusColor = (status: AgentAction['status']) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'in_progress': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };
  
  const isMobile = detectedViewport === 'mobile';
  const isTablet = detectedViewport === 'tablet';
  const isDesktop = detectedViewport === 'desktop';
  
  // Task 2: Swipe gesture handlers for mobile workflows
  const handleActionSwipe = useCallback((actionId: string, event: any, info: PanInfo) => {
    if (!isMobile) return; // Only on mobile
    
    const swipeThreshold = 100; // pixels
    const offset = info.offset.x;
    
    if (Math.abs(offset) < swipeThreshold) {
      setSwipedAction(null);
      return;
    }
    
    if (offset < -swipeThreshold) {
      // Swipe left - show details/retry
      setSwipedAction(actionId);
    } else if (offset > swipeThreshold) {
      // Swipe right - dismiss
      setSwipedAction(null);
    }
  }, [isMobile]);
  
  const handlePullToRefresh = useCallback(async (event: any, info: PanInfo) => {
    if (!isMobile || activeSession?.status === 'executing') return;
    
    const pullThreshold = 80; // pixels
    const offset = info.offset.y;
    
    if (offset > pullThreshold && pullToRefreshState === 'idle') {
      setPullToRefreshState('releasing');
      await pullToRefreshControls.start({ y: 0, transition: { duration: 0.3 } });
      setPullToRefreshState('refreshing');
      
      // Refetch session data
      queryClient.invalidateQueries({ queryKey: ['/api/agent/session', projectId] });
      
      setTimeout(() => {
        setPullToRefreshState('idle');
      }, 1000);
    } else if (offset < 0) {
      setPullToRefreshState('idle');
    } else if (offset > 0 && offset < pullThreshold) {
      setPullToRefreshState('pulling');
    }
  }, [isMobile, activeSession?.status, pullToRefreshState, pullToRefreshControls, projectId]);
  
  const handleTabSwipe = useCallback((event: any, info: PanInfo) => {
    if (!isMobile) return;
    
    const swipeThreshold = 50;
    const offset = info.offset.x;
    
    if (offset < -swipeThreshold && currentTab === 'task') {
      setCurrentTab('progress');
    } else if (offset > swipeThreshold && currentTab === 'progress') {
      setCurrentTab('task');
    }
  }, [isMobile, currentTab]);
  
  return (
    <div className={cn(
      'flex flex-col h-full',
      isMobile && 'p-2',
      isTablet && 'p-4',
      isDesktop && 'p-6',
      className
    )}>
      <Card className="flex-1 flex flex-col">
        <CardHeader className={cn(
          isMobile && 'p-4 pb-2',
          isTablet && 'p-5 pb-3',
          isDesktop && 'p-6 pb-4'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className={cn(
                isMobile && 'h-5 w-5',
                isTablet && 'h-6 w-6',
                isDesktop && 'h-8 w-8'
              )} />
              <div>
                <CardTitle className={cn(
                  isMobile && 'text-lg',
                  isTablet && 'text-xl',
                  isDesktop && 'text-2xl'
                )}>
                  Autonomous Agent
                </CardTitle>
                <CardDescription className={cn(
                  isMobile && 'text-xs',
                  isTablet && 'text-sm'
                )}>
                  AI-powered development assistant for {detectedViewport}
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isMobile ? (
                <Smartphone className="h-4 w-4 text-muted-foreground" data-testid="icon-viewport-mobile" />
              ) : isTablet ? (
                <Tablet className="h-5 w-5 text-muted-foreground" data-testid="icon-viewport-tablet" />
              ) : (
                <Monitor className="h-5 w-5 text-muted-foreground" data-testid="icon-viewport-desktop" />
              )}
              
              {activeSession && (
                <Badge variant={
                  activeSession.status === 'executing' ? 'default' :
                  activeSession.status === 'completed' ? 'success' :
                  activeSession.status === 'error' ? 'destructive' :
                  'secondary'
                } data-testid={`badge-status-${activeSession.status}`}>
                  {activeSession.status}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className={cn(
          'flex-1 flex flex-col gap-4',
          isMobile && 'p-4 pt-2',
          isTablet && 'p-5 pt-3',
          isDesktop && 'p-6 pt-4'
        )}>
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 flex flex-col">
            {/* Pull-to-refresh indicator (mobile only) */}
            {isMobile && pullToRefreshState !== 'idle' && (
              <motion.div
                className="flex items-center justify-center py-2"
                animate={pullToRefreshControls}
                initial={{ y: -40, opacity: 0 }}
              >
                <Loader2 className={cn(
                  'h-4 w-4',
                  pullToRefreshState === 'refreshing' && 'animate-spin'
                )} />
                <span className="ml-2 text-xs text-muted-foreground">
                  {pullToRefreshState === 'pulling' && 'Pull to refresh'}
                  {pullToRefreshState === 'releasing' && 'Release to refresh'}
                  {pullToRefreshState === 'refreshing' && 'Refreshing...'}
                </span>
              </motion.div>
            )}
            
            <TabsList className={cn(
              'grid w-full',
              isMobile ? 'grid-cols-2' : 'grid-cols-3'
            )}>
              <TabsTrigger value="task" className={cn(isMobile && 'text-xs')} data-testid="tab-task">
                <Sparkles className="h-4 w-4 mr-1" />
                {!isMobile && 'Task'}
              </TabsTrigger>
              <TabsTrigger value="progress" className={cn(isMobile && 'text-xs')} data-testid="tab-progress">
                <Activity className="h-4 w-4 mr-1" />
                {!isMobile && 'Progress'}
              </TabsTrigger>
              {!isMobile && (
                <TabsTrigger value="settings" className={cn(isTablet && 'text-sm')} data-testid="tab-settings">
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </TabsTrigger>
              )}
            </TabsList>
            
            {/* Task Tab */}
            <TabsContent value="task" className="flex-1 flex flex-col gap-4 mt-4">
              <motion.div
                drag={isMobile ? "x" : false}
                dragConstraints={{ left: -200, right: 200 }}
                dragElastic={0.1}
                onDragEnd={handleTabSwipe}
                className="flex-1 flex flex-col gap-4"
              >
                <div className="space-y-2">
                <Label htmlFor="task-input" className={cn(isMobile && 'text-sm')}>
                  What should the agent build?
                </Label>
                <Textarea
                  id="task-input"
                  data-testid="textarea-task-description"
                  placeholder={
                    isMobile
                      ? "Describe your task..."
                      : "Describe what you want the autonomous agent to build. Be as specific as possible."
                  }
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className={cn(
                    isMobile && 'min-h-[100px] text-sm',
                    isTablet && 'min-h-[120px]',
                    isDesktop && 'min-h-[150px]'
                  )}
                  disabled={activeSession?.status === 'executing' || activeSession?.status === 'thinking'}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  data-testid="button-start-agent"
                  onClick={handleStartAgent}
                  disabled={
                    !taskDescription.trim() ||
                    activeSession?.status === 'executing' ||
                    activeSession?.status === 'thinking' ||
                    startAgent.isPending
                  }
                  className={cn(
                    'flex-1',
                    isMobile && 'text-sm h-10',
                    isTablet && 'h-11',
                    isDesktop && 'h-12'
                  )}
                >
                  {startAgent.isPending || activeSession?.status === 'executing' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isMobile ? 'Working...' : 'Agent Working...'}
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      {isMobile ? 'Start' : 'Start Agent'}
                    </>
                  )}
                </Button>
                
                {activeSession && activeSession.status !== 'completed' && (
                  <Button
                    data-testid="button-stop-agent"
                    variant="destructive"
                    onClick={() => stopAgent.mutate(activeSession.id)}
                    disabled={stopAgent.isPending}
                    className={cn(
                      isMobile && 'text-sm h-10 px-3',
                      isTablet && 'h-11',
                      isDesktop && 'h-12'
                    )}
                  >
                    <Square className="mr-1 h-4 w-4" />
                    {!isMobile && 'Stop'}
                  </Button>
                )}
              </div>
              
              {/* Quick Model Selector */}
              <div className="flex items-center gap-2">
                <Label htmlFor="model-select" className={cn('flex-shrink-0', isMobile && 'text-xs')}>
                  Model:
                </Label>
                <Select
                  value={preferences.model}
                  onValueChange={(value) => {
                    updatePreferences.mutate({ model: value });
                  }}
                >
                  <SelectTrigger id="model-select" data-testid="select-model" className={cn(isMobile && 'h-9 text-xs')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-sonnet-4-5">Claude Sonnet 4.5</SelectItem>
                    <SelectItem value="claude-opus-4-1">Claude Opus 4.1</SelectItem>
                    <SelectItem value="gpt-5.1">GPT-5.1</SelectItem>
                    <SelectItem value="gpt-5">GPT-5</SelectItem>
                    <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              </motion.div>
            </TabsContent>
            
            {/* Progress Tab */}
            <TabsContent value="progress" className="flex-1 flex flex-col gap-4 mt-4">
              <motion.div
                drag={isMobile ? "x" : false}
                dragConstraints={{ left: -200, right: 200 }}
                dragElastic={0.1}
                onDragEnd={handleTabSwipe}
                className="flex-1 flex flex-col gap-4"
              >
                {activeSession ? (
                  <motion.div
                    drag={isMobile ? "y" : false}
                    dragConstraints={{ top: 0, bottom: 150 }}
                    dragElastic={0.2}
                    onDragEnd={handlePullToRefresh}
                    className="flex-1 flex flex-col gap-4"
                  >
                    <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={cn(isMobile && 'text-xs')}>Progress</span>
                      <span className={cn('font-medium', isMobile && 'text-xs')}>
                        {Math.round(activeSession.progress)}%
                      </span>
                    </div>
                    <Progress value={activeSession.progress} className="h-2" />
                    {activeSession.currentTask && (
                      <p className={cn(
                        'text-sm text-muted-foreground',
                        isMobile && 'text-xs'
                      )}>
                        {activeSession.currentTask}
                      </p>
                    )}
                  </div>
                  
                  {/* Metrics */}
                  <div className={cn(
                    'grid gap-2',
                    isMobile ? 'grid-cols-2' : 'grid-cols-3'
                  )}>
                    <Card>
                      <CardContent className={cn('p-3', isMobile && 'p-2')}>
                        <div className="flex items-center gap-2">
                          <FileText className={cn('h-4 w-4 text-blue-500', isMobile && 'h-3 w-3')} />
                          <div>
                            <p className={cn('text-xs text-muted-foreground', isMobile && 'text-[10px]')}>Files</p>
                            <p className={cn('text-lg font-semibold', isMobile && 'text-sm')} data-testid="metric-files">
                              {activeSession.metrics.filesModified}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className={cn('p-3', isMobile && 'p-2')}>
                        <div className="flex items-center gap-2">
                          <Code className={cn('h-4 w-4 text-green-500', isMobile && 'h-3 w-3')} />
                          <div>
                            <p className={cn('text-xs text-muted-foreground', isMobile && 'text-[10px]')}>Lines</p>
                            <p className={cn('text-lg font-semibold', isMobile && 'text-sm')} data-testid="metric-lines">
                              {activeSession.metrics.linesWritten}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className={cn('p-3', isMobile && 'p-2')}>
                        <div className="flex items-center gap-2">
                          <DollarSign className={cn('h-4 w-4 text-purple-500', isMobile && 'h-3 w-3')} />
                          <div>
                            <p className={cn('text-xs text-muted-foreground', isMobile && 'text-[10px]')}>Cost</p>
                            <p className={cn('text-lg font-semibold', isMobile && 'text-sm')} data-testid="metric-cost">
                              ${(activeSession.metrics.costInCents / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Actions List */}
                  <div className="flex-1 flex flex-col">
                    <Label className={cn('mb-2', isMobile && 'text-xs')}>Agent Actions</Label>
                    <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
                      <div className="space-y-2">
                        {activeSession.actions.length === 0 ? (
                          <p className={cn(
                            'text-sm text-muted-foreground text-center py-8',
                            isMobile && 'text-xs py-4'
                          )}>
                            No actions yet. Start the agent to see progress.
                          </p>
                        ) : (
                          activeSession.actions.map((action) => {
                            const Icon = getActionIcon(action.type);
                            const isExpanded = expandedActions.has(action.id);
                            const isSwiped = swipedAction === action.id;
                            
                            return (
                              <motion.div
                                key={action.id}
                                drag={isMobile ? "x" : false}
                                dragConstraints={{ left: -120, right: 0 }}
                                dragElastic={0.2}
                                onDragEnd={(event, info) => handleActionSwipe(action.id, event, info)}
                                animate={{
                                  x: isSwiped ? -120 : 0,
                                  opacity: isSwiped ? 0.8 : 1
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="relative"
                              >
                                {/* Swipe action buttons (revealed on swipe left) */}
                                {isMobile && isSwiped && (
                                  <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1 pr-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 px-2 text-xs"
                                      onClick={() => toggleActionExpansion(action.id)}
                                      data-testid={`action-details-${action.id}`}
                                    >
                                      Details
                                    </Button>
                                  </div>
                                )}
                                
                                <Card className={cn(isMobile && 'text-xs')}>
                                  <CardHeader
                                    className={cn(
                                      'p-3 cursor-pointer hover:bg-accent/50 transition-colors',
                                      isMobile && 'p-2'
                                    )}
                                    onClick={() => toggleActionExpansion(action.id)}
                                    data-testid={`action-${action.id}`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-2 flex-1">
                                        <Icon className={cn(
                                          'h-4 w-4 mt-0.5',
                                          getStatusColor(action.status),
                                          isMobile && 'h-3 w-3'
                                        )} />
                                        <div className="flex-1 min-w-0">
                                          <p className={cn('font-medium', isMobile && 'text-xs')}>
                                            {action.title}
                                          </p>
                                          <p className={cn(
                                            'text-sm text-muted-foreground line-clamp-1',
                                            isMobile && 'text-[10px]'
                                          )}>
                                            {action.description}
                                          </p>
                                        </div>
                                      </div>
                                      {isExpanded ? (
                                        <ChevronUp className={cn('h-4 w-4 flex-shrink-0', isMobile && 'h-3 w-3')} />
                                      ) : (
                                        <ChevronDown className={cn('h-4 w-4 flex-shrink-0', isMobile && 'h-3 w-3')} />
                                      )}
                                    </div>
                                  </CardHeader>
                                  
                                  {isExpanded && action.details && (
                                    <CardContent className={cn('p-3 pt-0 border-t', isMobile && 'p-2')}>
                                      <pre className={cn(
                                        'text-xs bg-muted p-2 rounded overflow-x-auto',
                                        isMobile && 'text-[10px] p-1'
                                      )}>
                                        {JSON.stringify(action.details, null, 2)}
                                      </pre>
                                    </CardContent>
                                  )}
                                </Card>
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </>
                  </motion.div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Bot className={cn(
                        'h-16 w-16 mx-auto text-muted-foreground',
                        isMobile && 'h-12 w-12'
                      )} />
                      <p className={cn(
                        'text-sm text-muted-foreground',
                        isMobile && 'text-xs'
                      )}>
                        No active session. Start a new task to begin.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </TabsContent>
            
            {/* Settings Tab (Desktop/Tablet only) */}
            {!isMobile && (
              <TabsContent value="settings" className="flex-1 flex flex-col gap-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="autonomy-level">Autonomy Level</Label>
                    <Select
                      value={preferences.autonomyLevel}
                      onValueChange={(value: any) => {
                        updatePreferences.mutate({ autonomyLevel: value });
                      }}
                    >
                      <SelectTrigger id="autonomy-level" data-testid="select-autonomy">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guided">Guided (Ask before actions)</SelectItem>
                        <SelectItem value="semi-autonomous">Semi-Autonomous (Ask for risky actions)</SelectItem>
                        <SelectItem value="fully-autonomous">Fully Autonomous (No confirmations)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-test">Auto-Generate Tests</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically create tests for new code
                        </p>
                      </div>
                      <Switch
                        id="auto-test"
                        data-testid="switch-auto-test"
                        checked={preferences.autoTest}
                        onCheckedChange={(checked) => {
                          updatePreferences.mutate({ autoTest: checked });
                        }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="streaming">Real-Time Streaming</Label>
                        <p className="text-sm text-muted-foreground">
                          Stream agent actions in real-time
                        </p>
                      </div>
                      <Switch
                        id="streaming"
                        data-testid="switch-streaming"
                        checked={preferences.streamingEnabled}
                        onCheckedChange={(checked) => {
                          updatePreferences.mutate({ streamingEnabled: checked });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
        
        {activeSession && activeSession.status === 'completed' && (
          <CardFooter className={cn(
            'border-t',
            isMobile && 'p-3',
            isTablet && 'p-4',
            isDesktop && 'p-6'
          )}>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className={cn(isMobile && 'text-xs')}>
                Task completed in {Math.round((Date.now() - (activeSession.startTime || 0)) / 1000)}s
              </span>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
