// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Globe, Image, Brain, Power, Pause, Play, 
  ChevronDown, ChevronRight, CheckCircle, AlertCircle,
  RefreshCw, X, Copy, FileText, Search, Sparkles,
  DollarSign, Clock, Code, FileCode, Info, History,
  ChevronUp, ScrollText, CirclePlay, CirclePause,
  Link, Edit3, Trash, MoveRight, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReplitAgentV2Props {
  projectId: number;
  className?: string;
  initialPrompt?: string;
  onClose?: () => void;
}

interface AgentTool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  cost?: string;
}

interface WorkStep {
  id: string;
  type: 'decision' | 'search' | 'file_operation' | 'checkpoint' | 'action';
  title: string;
  description?: string;
  expandable?: boolean;
  expanded?: boolean;
  duration?: string;
  file?: string;
  icon?: React.ElementType;
  details?: string[];
  children?: WorkStep[];
}

interface Checkpoint {
  id: string;
  message: string;
  timestamp: Date;
  changes: number;
  canRollback: boolean;
}

interface WorkSummary {
  timeWorked: string;
  workDone: number;
  itemsRead: number;
  codeChanged: { added: number; removed: number };
  agentUsage: number;
}

export const ReplitAgentV2: React.FC<ReplitAgentV2Props> = ({
  projectId,
  className,
  initialPrompt,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('agent');
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [imageGenerationEnabled, setImageGenerationEnabled] = useState(false);
  const [extendedThinkingEnabled, setExtendedThinkingEnabled] = useState(true);
  const [highPowerEnabled, setHighPowerEnabled] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showLess, setShowLess] = useState(false);
  const [input, setInput] = useState(initialPrompt || '');
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [workSteps, setWorkSteps] = useState<WorkStep[]>([]);
  const [workSummary, setWorkSummary] = useState<WorkSummary | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { toast } = useToast();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load agent tools configuration
  useEffect(() => {
    const loadAgentTools = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/agent/tools`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const tools = await response.json();
          setWebSearchEnabled(tools.webSearch?.enabled || false);
          setImageGenerationEnabled(tools.imageGeneration?.enabled || false);
          setExtendedThinkingEnabled(tools.dynamicIntelligence?.extendedThinking?.enabled || false);
          setHighPowerEnabled(tools.dynamicIntelligence?.highPowerModel?.enabled || false);
        }
      } catch (error) {
        console.error('Failed to load agent tools:', error);
      }
    };
    
    loadAgentTools();
  }, [projectId]);
  
  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (isWorking && !ws) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/agent?projectId=${projectId}&sessionId=${sessionId}`;
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('Connected to agent WebSocket');
        // Send connection info
        websocket.send(JSON.stringify({
          type: 'connect',
          projectId,
          sessionId
        }));
      };
      
      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'step_update') {
          setWorkSteps(prev => [...prev, data.step]);
        } else if (data.type === 'error') {
          toast({
            title: 'Agent Error',
            description: data.error,
            variant: 'destructive'
          });
        } else if (data.type === 'progress') {
          // Handle other progress updates
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      websocket.onclose = () => {
        console.log('WebSocket closed');
        setWs(null);
      };
      
      setWs(websocket);
    }
    
    return () => {
      if (ws) {
        ws.close();
        setWs(null);
      }
    };
  }, [isWorking, projectId, sessionId]);

  // Start work when initial prompt is provided
  useEffect(() => {
    if (initialPrompt) {
      handleStartWork();
    }
  }, []);

  const updateToolSetting = async (toolId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/agent/tools`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, enabled })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update tool setting');
      }
    } catch (error) {
      console.error('Failed to update tool:', error);
      toast({
        title: 'Error',
        description: 'Failed to update tool setting',
        variant: 'destructive'
      });
    }
  };

  const handleStartWork = async () => {
    if (!input.trim()) return;

    setIsWorking(true);
    setWorkSteps([]);
    setCheckpoints([]);
    
    try {
      // Send message to AI agent
      const response = await fetch(`/api/projects/${projectId}/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: {
            sessionId,
            extendedThinking: extendedThinkingEnabled,
            highPowerMode: highPowerEnabled,
            webSearch: webSearchEnabled,
            imageGeneration: imageGenerationEnabled,
            isPaused
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message to agent');
      }

      const data = await response.json();
      
      // Create checkpoint if provided
      if (data.checkpoint) {
        const checkpoint: Checkpoint = {
          id: data.checkpoint.id || Date.now().toString(),
          message: data.checkpoint.message || input,
          timestamp: new Date(data.checkpoint.timestamp),
          changes: data.checkpoint.changes || 0,
          canRollback: true
        };
        setCheckpoints([checkpoint]);
        
        // Add checkpoint step
        addWorkStep({
          id: `checkpoint-${checkpoint.id}`,
          type: 'checkpoint',
          title: 'Checkpoint created',
          description: checkpoint.message,
          icon: CheckCircle
        });
      }

      // Process work steps from response
      if (data.actions && data.actions.length > 0) {
        processAgentActions(data.actions);
      }

      // Update work summary if provided
      if (data.metrics || data.pricing) {
        setWorkSummary({
          timeWorked: data.timeWorked || '0 minutes',
          workDone: data.actions?.length || 0,
          itemsRead: data.metrics?.linesOfCode || 0,
          codeChanged: { 
            added: data.metrics?.filesModified || 0, 
            removed: 0 
          },
          agentUsage: data.pricing?.costInCents ? data.pricing.costInCents / 100 : 0
        });
      }

      setInput('');
    } catch (error) {
      console.error('Failed to start work:', error);
      toast({
        title: 'Error',
        description: 'Failed to start agent work',
        variant: 'destructive'
      });
    } finally {
      setIsWorking(false);
    }
  };

  const addWorkStep = (step: WorkStep) => {
    setWorkSteps(prev => [...prev, step]);
  };

  const processAgentActions = (actions: any[]) => {
    actions.forEach((action, index) => {
      setTimeout(() => {
        const step: WorkStep = {
          id: `action-${Date.now()}-${index}`,
          type: 'action',
          title: action.description || `${action.type} ${action.path || ''}`,
          icon: getActionIcon(action.type),
          expandable: !!action.details,
          details: action.details
        };
        addWorkStep(step);
      }, index * 500);
    });
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'create_file':
      case 'edit_file':
        return FileText;
      case 'search':
        return Search;
      case 'decision':
        return Brain;
      default:
        return Code;
    }
  };

  const simulateWorkSteps = () => {
    const steps: WorkStep[] = [
      {
        id: 'step-1',
        type: 'action',
        title: 'Optimized Agent memory',
        icon: Brain
      },
      {
        id: 'step-2',
        type: 'decision',
        title: 'Decided on routing discrepancy (5 seconds)',
        expandable: true,
        expanded: false,
        details: [
          'I see the issue - you\'re getting 404 errors because the project routing system is looking for projects with ID 1003, but the correct format should be /@username/projectslug. Let me investigate and fix this routing issue.'
        ],
        children: [
          {
            id: 'step-2-1',
            type: 'search',
            title: 'Searched for "Find where project ID 1003 is being used or where incorrect project routing i..."',
            icon: Search
          },
          {
            id: 'step-2-2',
            type: 'file_operation',
            title: 'Opened client/src/pages/ProjectPage.tsx',
            icon: FileText,
            file: 'client/src/pages/ProjectPage.tsx'
          },
          {
            id: 'step-2-3',
            type: 'action',
            title: 'Found correct project routing (6 seconds)',
            duration: '6 seconds'
          }
        ]
      },
      {
        id: 'step-3',
        type: 'action',
        title: 'Corrected navigation paths',
        expandable: true,
        children: [
          {
            id: 'step-3-1',
            type: 'file_operation',
            title: 'Opened client/src/pages/Home.tsx',
            icon: FileText,
            file: 'client/src/pages/Home.tsx'
          }
        ]
      }
    ];

    // Add steps progressively
    steps.forEach((step, index) => {
      setTimeout(() => {
        addWorkStep(step);
        
        // Update work summary
        if (index === steps.length - 1) {
          setWorkSummary({
            timeWorked: '6 minutes',
            workDone: 30,
            itemsRead: 1210,
            codeChanged: { added: 29, removed: 17 },
            agentUsage: 5.92
          });
          setIsWorking(false);
        }
      }, (index + 1) * 1500);
    });
  };

  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const renderWorkStep = (step: WorkStep, depth = 0) => {
    const isExpanded = expandedSteps.has(step.id);
    const Icon = step.icon;

    return (
      <div key={step.id} className={cn("text-sm", depth > 0 && "ml-6")}>
        <div 
          className={cn(
            "flex items-start gap-2 py-1",
            step.expandable && "cursor-pointer hover:bg-[var(--ecode-surface-hover)] -mx-2 px-2 rounded"
          )}
          onClick={() => step.expandable && toggleStepExpansion(step.id)}
        >
          {step.expandable && (
            <div className="mt-0.5">
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-[var(--ecode-text-secondary)]" />
              ) : (
                <ChevronRight className="h-3 w-3 text-[var(--ecode-text-secondary)]" />
              )}
            </div>
          )}
          {Icon && <Icon className="h-4 w-4 text-[var(--ecode-text-secondary)] mt-0.5 flex-shrink-0" />}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[var(--ecode-text)]">{step.title}</span>
              {step.file && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
            {step.description && (
              <div className="text-[var(--ecode-text-secondary)] mt-1">
                {step.description}
              </div>
            )}
          </div>
        </div>
        
        {isExpanded && step.details && (
          <div className="ml-5 mt-1 p-2 bg-[var(--ecode-surface-secondary)] rounded text-xs">
            {step.details.map((detail, i) => (
              <p key={i} className="text-[var(--ecode-text-secondary)]">{detail}</p>
            ))}
          </div>
        )}
        
        {isExpanded && step.children && (
          <div className="mt-1">
            {step.children.map(child => renderWorkStep(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-[var(--ecode-background)]", className)}>
      {/* Header */}
      <div className="border-b border-[var(--ecode-border)]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between px-2">
            <TabsList className="h-10 bg-transparent border-0 p-0">
              <TabsTrigger 
                value="agent" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-violet-500 rounded-none px-4"
              >
                <Bot className="h-3.5 w-3.5 mr-1.5" />
                Agent
              </TabsTrigger>
              <TabsTrigger 
                value="assistant" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-violet-500 rounded-none px-4"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Assistant
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <MoveRight className="h-4 w-4 mr-2" />
                    Change tab
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <History className="h-4 w-4 mr-2" />
                    Tabs
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Tabs>
      </div>

      <TabsContent value="agent" className="flex-1 m-0 flex flex-col">
        {/* Agent Tools Section */}
        <div className="p-4 space-y-4 border-b border-[var(--ecode-border)]">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[var(--ecode-text)]">Agent Tools</h3>
            <Badge variant="secondary" className="text-xs">New</Badge>
            
            {/* Web Search */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-[var(--ecode-text-secondary)]" />
                <div>
                  <div className="text-sm text-[var(--ecode-text)]">Web search</div>
                  <div className="text-xs text-[var(--ecode-text-secondary)]">
                    Let Agent search the internet
                  </div>
                </div>
              </div>
              <Switch
                checked={webSearchEnabled}
                onCheckedChange={(checked) => {
                  setWebSearchEnabled(checked);
                  updateToolSetting('web_search', checked);
                }}
              />
            </div>

            {/* Image Generation */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Image className="h-4 w-4 text-[var(--ecode-text-secondary)]" />
                <div>
                  <div className="text-sm text-[var(--ecode-text)]">Image generation</div>
                  <div className="text-xs text-[var(--ecode-text-secondary)]">
                    Let Agent generate images
                  </div>
                </div>
              </div>
              <Switch
                checked={imageGenerationEnabled}
                onCheckedChange={(checked) => {
                  setImageGenerationEnabled(checked);
                  updateToolSetting('image_generation', checked);
                }}
              />
            </div>
          </div>

          <Separator />

          {/* Dynamic Intelligence */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[var(--ecode-text)]">Dynamic Intelligence</h3>
            
            {/* Extended Thinking */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Brain className="h-4 w-4 text-[var(--ecode-text-secondary)]" />
                <div>
                  <div className="text-sm text-[var(--ecode-text)]">
                    Extended thinking
                    <span className="text-green-600 ml-2 text-xs">+ $</span>
                  </div>
                  <div className="text-xs text-[var(--ecode-text-secondary)]">
                    Think longer and more holistically
                  </div>
                </div>
              </div>
              <Switch
                checked={extendedThinkingEnabled}
                onCheckedChange={(checked) => {
                  setExtendedThinkingEnabled(checked);
                  updateToolSetting('extended_thinking', checked);
                }}
              />
            </div>

            {/* High Power Model */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Power className="h-4 w-4 text-[var(--ecode-text-secondary)]" />
                <div>
                  <div className="text-sm text-[var(--ecode-text)]">
                    High power model
                    <span className="text-green-600 ml-2 text-xs">+ $$$</span>
                  </div>
                  <div className="text-xs text-[var(--ecode-text-secondary)]">
                    Use a higher accuracy model (Claude Opus 4)
                  </div>
                </div>
              </div>
              <Switch
                checked={highPowerEnabled}
                onCheckedChange={(checked) => {
                  setHighPowerEnabled(checked);
                  updateToolSetting('high_power_model', checked);
                }}
              />
            </div>
          </div>
        </div>

        {/* Work Area */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {/* Checkpoints */}
            {checkpoints.map(checkpoint => (
              <Card key={checkpoint.id} className="p-3 bg-[var(--ecode-surface-secondary)]">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm text-[var(--ecode-text)] font-medium">
                      Checkpoint made {new Date(checkpoint.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-sm text-[var(--ecode-text-secondary)] mt-1">
                      {checkpoint.message}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <History className="h-3 w-3 mr-1" />
                        Rollback here
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <Code className="h-3 w-3 mr-1" />
                        Changes
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* Work Summary */}
            {workSummary && (
              <Card className="p-4 bg-[var(--ecode-surface-secondary)]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-[var(--ecode-text)]">
                    {showLess ? 'Show more' : 'Show less'}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLess(!showLess)}
                    className="h-6 w-6 p-0"
                  >
                    {showLess ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                  </Button>
                </div>
                
                {!showLess && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--ecode-text-secondary)]">Time worked</span>
                      <span className="text-[var(--ecode-text)]">{workSummary.timeWorked}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ecode-text-secondary)]">Work done</span>
                      <span className="text-[var(--ecode-text)]">{workSummary.workDone} actions</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ecode-text-secondary)]">Items read</span>
                      <span className="text-[var(--ecode-text)]">{workSummary.itemsRead} lines</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ecode-text-secondary)]">Code changed</span>
                      <span className="text-[var(--ecode-text)]">
                        +{workSummary.codeChanged.added} -{workSummary.codeChanged.removed}
                      </span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-[var(--ecode-text-secondary)]">Agent Usage</span>
                      <span className="text-[var(--ecode-text)]">
                        <Info className="h-3 w-3 inline mr-1" />
                        ${workSummary.agentUsage.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Work Steps */}
            {workSteps.length > 0 && (
              <Card className="p-4">
                <div className="space-y-2">
                  {workSteps.map(step => renderWorkStep(step))}
                </div>
                
                {workSteps.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-xs"
                    onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
                  >
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Scroll to latest
                  </Button>
                )}
              </Card>
            )}

            {/* Working Status */}
            {isWorking && (
              <Card className="p-4 bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Bot className="h-5 w-5 text-violet-600" />
                      {!isPaused && (
                        <div className="absolute -bottom-1 -right-1">
                          <RefreshCw className="h-3 w-3 animate-spin text-violet-600" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-violet-700 dark:text-violet-300 font-medium">
                      {isPaused ? 'Paused' : 'Working...'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPaused(!isPaused)}
                    className="h-7 text-xs border-violet-300 hover:bg-violet-100 dark:border-violet-700 dark:hover:bg-violet-900/50"
                  >
                    {isPaused ? (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-[var(--ecode-border)] p-4">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What would you like me to build?"
              className="resize-none"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleStartWork();
                }
              }}
            />
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleStartWork}
                disabled={!input.trim() || isWorking}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Link className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Attach files</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {/* Queue Info */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs text-[var(--ecode-text-secondary)]">
              <span>Queue</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Messages in queue: 0</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
            >
              Add to Queue
            </Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="assistant" className="flex-1 m-0">
        <div className="flex items-center justify-center h-full text-[var(--ecode-text-secondary)]">
          <div className="text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Assistant mode coming soon</p>
          </div>
        </div>
      </TabsContent>
    </div>
  );
};