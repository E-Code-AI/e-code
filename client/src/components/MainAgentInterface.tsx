import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Sparkles, Pause, Play, 
  ChevronDown, ChevronRight, CheckCircle, AlertCircle,
  RefreshCw, X, Copy, Clock, Code, FileCode, 
  Zap, Brain, Globe, Image, DollarSign, 
  SkipForward, Settings, Minimize2, Maximize2,
  MessageSquare, History, Info, Layers
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
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PolyglotIndicator } from '@/components/PolyglotIndicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MainAgentInterfaceProps {
  projectId: number;
  initialPrompt?: string;
  onMinimize?: () => void;
  className?: string;
}

interface AgentMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  status?: 'thinking' | 'working' | 'complete' | 'error' | 'paused';
  steps?: WorkStep[];
  metrics?: {
    timeWorked?: string;
    filesModified?: number;
    linesOfCode?: number;
    tokensUsed?: number;
  };
  cost?: string;
}

interface WorkStep {
  id: string;
  type: 'file_operation' | 'command' | 'search' | 'decision' | 'checkpoint';
  title: string;
  description?: string;
  status: 'pending' | 'working' | 'complete' | 'error';
  expanded?: boolean;
  details?: string[];
  icon?: React.ElementType;
}

interface AgentMode {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  badge?: string;
}

export const MainAgentInterface: React.FC<MainAgentInterfaceProps> = ({
  projectId,
  initialPrompt,
  onMinimize,
  className
}) => {
  // State
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  // Agent Modes (like Replit)
  const [modes, setModes] = useState<AgentMode[]>([
    { 
      id: 'web_search', 
      name: 'Web Search', 
      description: 'Search the internet for information',
      icon: Globe, 
      enabled: true,
      badge: 'NEW'
    },
    { 
      id: 'image_generation', 
      name: 'Image Generation', 
      description: 'Generate images with AI',
      icon: Image, 
      enabled: false 
    },
    { 
      id: 'extended_thinking', 
      name: 'Extended Thinking', 
      description: 'Deep reasoning for complex tasks',
      icon: Brain, 
      enabled: true 
    },
    { 
      id: 'high_power', 
      name: 'High Power Mode', 
      description: 'Use the most capable model',
      icon: Zap, 
      enabled: true,
      badge: 'PRO'
    }
  ]);
  
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize WebSocket for real-time updates - ROUTES THROUGH GO SERVICE (Polyglot)
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // WebSocket connections handled by Go service for high performance
    const wsUrl = `${protocol}//${window.location.host}/ws/agent?projectId=${projectId}&sessionId=${sessionId}&service=go-runtime`;
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('Connected to agent WebSocket');
      websocket.send(JSON.stringify({
        type: 'connect',
        projectId,
        sessionId
      }));
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'step_update') {
        setCurrentStep(data.step.title);
        setProgress(data.progress || 0);
        
        // Update the last message with new step
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'agent' && lastMessage.status === 'working') {
            lastMessage.steps = [...(lastMessage.steps || []), data.step];
          }
          return newMessages;
        });
      } else if (data.type === 'complete') {
        setIsWorking(false);
        setProgress(100);
      } else if (data.type === 'error') {
        setIsWorking(false);
        toast({
          title: 'Agent Error',
          description: data.error,
          variant: 'destructive'
        });
      }
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    websocket.onclose = () => {
      console.log('WebSocket closed');
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, [projectId, sessionId]);

  // Process initial prompt if provided
  useEffect(() => {
    if (initialPrompt && messages.length === 0) {
      // Add initial user message
      const userMessage: AgentMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: initialPrompt,
        timestamp: new Date()
      };
      setMessages([userMessage]);
      
      // Start working on it
      handleSendMessage(initialPrompt);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleMode = (modeId: string) => {
    setModes(prev => prev.map(mode => 
      mode.id === modeId ? { ...mode, enabled: !mode.enabled } : mode
    ));
    
    // Update on server
    updateToolSetting(modeId, !modes.find(m => m.id === modeId)?.enabled);
  };

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
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isWorking) return;

    // Clear input
    if (!messageText) {
      setInput('');
    }

    // Add agent thinking message
    const agentMessage: AgentMessage = {
      id: (Date.now() + 1).toString(),
      role: 'agent',
      content: 'Let me work on that...',
      timestamp: new Date(),
      status: 'thinking',
      steps: []
    };
    setMessages(prev => [...prev, agentMessage]);

    setIsWorking(true);
    setProgress(0);
    setCurrentStep('Analyzing your request...');

    try {
      // Send to AI agent with MCP backend
      const response = await fetch(`/api/projects/${projectId}/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: {
            sessionId,
            extendedThinking: modes.find(m => m.id === 'extended_thinking')?.enabled,
            highPowerMode: modes.find(m => m.id === 'high_power')?.enabled,
            webSearch: modes.find(m => m.id === 'web_search')?.enabled,
            imageGeneration: modes.find(m => m.id === 'image_generation')?.enabled,
            isPaused
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message to agent');
      }

      const data = await response.json();
      
      // Update agent message with response
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'agent') {
          lastMessage.content = data.content || 'Task completed successfully!';
          lastMessage.status = data.completed ? 'complete' : 'working';
          lastMessage.metrics = data.metrics;
          lastMessage.cost = data.pricing?.costInDollars;
        }
        return newMessages;
      });

      if (data.completed) {
        setIsWorking(false);
        setProgress(100);
        setCurrentStep('');
      }
    } catch (error) {
      console.error('Error:', error);
      setIsWorking(false);
      
      // Update message with error
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'agent') {
          lastMessage.status = 'error';
          lastMessage.content = 'Sorry, I encountered an error. Please try again.';
        }
        return newMessages;
      });
      
      toast({
        title: 'Error',
        description: 'Failed to process your request',
        variant: 'destructive'
      });
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    if (ws) {
      ws.send(JSON.stringify({
        type: 'control',
        action: isPaused ? 'resume' : 'pause',
        projectId,
        sessionId
      }));
    }
  };

  const handleSkip = () => {
    if (ws) {
      ws.send(JSON.stringify({
        type: 'control',
        action: 'skip',
        projectId,
        sessionId
      }));
    }
  };

  const toggleStepExpanded = (stepId: string) => {
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

  const renderStep = (step: WorkStep) => {
    const Icon = step.icon || FileCode;
    const isExpanded = expandedSteps.has(step.id);
    
    return (
      <div key={step.id} className="border rounded-lg p-3 space-y-2">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleStepExpanded(step.id)}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{step.title}</span>
            {step.status === 'working' && (
              <RefreshCw className="h-3 w-3 animate-spin text-primary" />
            )}
            {step.status === 'complete' && (
              <CheckCircle className="h-3 w-3 text-green-500" />
            )}
          </div>
          {step.details && step.details.length > 0 && (
            isExpanded ? 
              <ChevronDown className="h-4 w-4" /> : 
              <ChevronRight className="h-4 w-4" />
          )}
        </div>
        
        {step.description && (
          <p className="text-xs text-muted-foreground pl-6">{step.description}</p>
        )}
        
        {isExpanded && step.details && (
          <div className="pl-6 space-y-1">
            {step.details.map((detail, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                • {detail}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-semibold">AI Agent</span>
            </div>
            {isWorking && (
              <Badge variant="secondary" className="animate-pulse">
                Working...
              </Badge>
            )}
            {/* POLYGLOT SERVICE INDICATOR - Shows which backend service is active */}
            <PolyglotIndicator className="h-8" />
          </div>
          
          <div className="flex items-center gap-2">
            {/* Control buttons */}
            {isWorking && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handlePause}
                      >
                        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isPaused ? 'Resume' : 'Pause'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleSkip}
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Skip current step
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
            
            {/* Settings dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-4 space-y-4">
                  <div className="font-medium text-sm">Agent Capabilities</div>
                  {modes.map(mode => (
                    <div key={mode.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <mode.icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-1">
                            <Label htmlFor={mode.id} className="text-sm">
                              {mode.name}
                            </Label>
                            {mode.badge && (
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                {mode.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {mode.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        id={mode.id}
                        checked={mode.enabled}
                        onCheckedChange={() => toggleMode(mode.id)}
                      />
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {onMinimize && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={onMinimize}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        {isWorking && (
          <div className="mt-3 space-y-1">
            <Progress value={progress} className="h-1" />
            {currentStep && (
              <p className="text-xs text-muted-foreground">{currentStep}</p>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Hi! I'm your AI Agent</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  I can help you build, debug, and improve your code. Just describe what you need!
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInput("Build a todo app with React")}
                >
                  Build a todo app
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInput("Add authentication to my app")}
                >
                  Add authentication
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInput("Fix the bug in my code")}
                >
                  Debug my code
                </Button>
              </div>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' && "justify-end"
                )}
              >
                {message.role === 'agent' && (
                  <div className="flex-shrink-0">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )}
                
                <div
                  className={cn(
                    "rounded-lg px-4 py-3 max-w-[80%] space-y-2",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Show work steps for agent messages */}
                  {message.role === 'agent' && message.steps && message.steps.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {message.steps.map(step => renderStep(step))}
                    </div>
                  )}
                  
                  {/* Show metrics */}
                  {message.metrics && (
                    <div className="flex items-center gap-4 mt-2 pt-2 border-t text-xs text-muted-foreground">
                      {message.metrics.timeWorked && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {message.metrics.timeWorked}
                        </div>
                      )}
                      {message.metrics.filesModified !== undefined && (
                        <div className="flex items-center gap-1">
                          <FileCode className="h-3 w-3" />
                          {message.metrics.filesModified} files
                        </div>
                      )}
                      {message.metrics.linesOfCode !== undefined && (
                        <div className="flex items-center gap-1">
                          <Code className="h-3 w-3" />
                          {message.metrics.linesOfCode} lines
                        </div>
                      )}
                      {message.cost && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {message.cost}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="rounded-full bg-muted p-2">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Describe what you want to build or change..."
            className="min-h-[60px] resize-none"
            disabled={isWorking}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isWorking}
            className="px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Active modes indicator */}
        <div className="flex items-center gap-2 mt-2">
          {modes.filter(m => m.enabled).map(mode => (
            <Badge key={mode.id} variant="secondary" className="text-xs">
              <mode.icon className="h-3 w-3 mr-1" />
              {mode.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};