import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, User, Send, Paperclip, Mic, Image, FileText, 
  Loader2, Sparkles, Code, Terminal, Globe, Database,
  Settings, RotateCcw, Play, Square, CheckCircle,
  AlertCircle, Clock, Zap, Brain, Search, Upload, MessageSquare,
  Eye, Palette, FileCode, ListPlus, Shield, Cpu, Activity,
  DollarSign, Plus, Layers, ChevronRight, Hash,
  GitBranch, Package, RefreshCw, X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface UnifiedAgentInterfaceProps {
  projectId: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  attachments?: File[];
  actions?: Array<{
    type: 'create_file' | 'create_folder' | 'install_package' | 'deploy' | 'run_command';
    data: any;
    completed: boolean;
    progress?: number;
  }>;
  metadata?: {
    thinking?: boolean;
    highPower?: boolean;
    webSearch?: boolean;
    rollbackId?: string;
    model?: string;
    tokens?: number;
    effort?: number;
  };
}

interface AgentV2Progress {
  status: 'initializing' | 'analyzing' | 'building' | 'testing' | 'completed' | 'error';
  progress: number;
  currentStep: string;
  stepsCompleted: string[];
  filesModified: number;
  linesWritten: number;
  tokensUsed: number;
  estimatedCost: number;
  checkpointsCreated: number;
  errors: string[];
  actions: Array<{
    timestamp: Date;
    type: string;
    description: string;
    result?: any;
  }>;
}

export function UnifiedAgentInterface({ projectId }: UnifiedAgentInterfaceProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [buildProgress, setBuildProgress] = useState(0);
  const [isBuilding, setIsBuilding] = useState(false);
  
  // Agent modes - combining both systems
  const [agentMode, setAgentMode] = useState<'standard' | 'thinking' | 'highpower' | 'v2'>('standard');
  const [complexity, setComplexity] = useState<'simple' | 'moderate' | 'complex' | 'expert'>('moderate');
  
  // Agent tools and capabilities
  const [agentTools, setAgentTools] = useState({
    webSearch: false,
    dynamicIntelligence: false,
    visualEditor: false,
    packageManagement: true,
    environmentSetup: true,
    rollback: false,
    autoCheckpoints: true,
    realTimeUpdates: true,
  });
  
  // V2 specific state
  const [additionalContext, setAdditionalContext] = useState('');
  const [v2Progress, setV2Progress] = useState<AgentV2Progress | null>(null);
  
  const [selectedProvider, setSelectedProvider] = useState<string>('claude-4');
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [totalEffort, setTotalEffort] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load agent prompt if available
  useEffect(() => {
    const storedPrompt = window.sessionStorage.getItem(`agent-prompt-${projectId}`);
    if (storedPrompt) {
      setInitialPrompt(storedPrompt);
      setInput(storedPrompt);
      window.sessionStorage.removeItem(`agent-prompt-${projectId}`);
    }
  }, [projectId]);

  // MCP Server integration - Powers all AI operations
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const [mcpConnected, setMcpConnected] = useState(false);
  
  // Load MCP tools on mount and show connection status
  useEffect(() => {
    const loadMCPTools = async () => {
      try {
        const response = await fetch('http://localhost:3200/tools');
        if (response.ok) {
          const tools = await response.json();
          setMcpTools(tools);
          setMcpConnected(true);
          console.log(`[MCP] ✅ Connected to MCP server with ${tools.length} tools available`);
          toast({
            title: 'MCP Server Connected',
            description: `Connected to Model Context Protocol with ${tools.length} tools`,
            variant: 'default',
          });
        }
      } catch (error) {
        console.error('[MCP] ❌ Failed to connect to MCP server:', error);
        setMcpConnected(false);
      }
    };
    loadMCPTools();
  }, []);

  // Execute MCP tool - Used by AI agent for all operations
  const executeMCPTool = async (toolName: string, args: any) => {
    try {
      console.log(`[MCP] 🔧 Executing tool: ${toolName}`, args);
      const response = await fetch(`http://localhost:3200/tools/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      const result = await response.json();
      console.log(`[MCP] ✅ Tool ${toolName} result:`, result);
      return result;
    } catch (error) {
      console.error(`[MCP] ❌ Failed to execute tool ${toolName}:`, error);
      return null;
    }
  };

  // Check for active V2 build
  const { data: activeBuildData } = useQuery({
    queryKey: ['/api/agent-v2/active-build', projectId],
    queryFn: () => apiRequest('GET', `/api/agent-v2/active-build/${projectId}`).then(res => res.json()),
    refetchInterval: 5000,
    enabled: agentMode === 'v2'
  });

  const activeBuildId = activeBuildData?.buildId;

  // Get V2 build progress
  const { data: progressData } = useQuery({
    queryKey: ['/api/agent-v2/build-progress', activeBuildId],
    queryFn: () => apiRequest('GET', `/api/agent-v2/build-progress/${activeBuildId}`).then(res => res.json()),
    enabled: !!activeBuildId && agentMode === 'v2',
    refetchInterval: agentTools.realTimeUpdates ? 1000 : 5000
  });

  useEffect(() => {
    if (progressData?.progress) {
      setV2Progress(progressData.progress);
    }
  }, [progressData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start V2 build mutation
  const startV2Build = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/agent-v2/start-build', data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent-v2/active-build', projectId] });
      toast({
        title: 'Claude 4.0 Agent Started',
        description: 'The agent is now working on your task with advanced capabilities.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to start build',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      if (agentMode === 'v2') {
        // Use Agent V2 with Claude 4.0
        await startV2Build.mutateAsync({
          projectId,
          taskDescription: userMessage.content,
          complexity,
          autoCheckpoints: agentTools.autoCheckpoints,
          realTimeUpdates: agentTools.realTimeUpdates,
          additionalContext,
          attachments: userMessage.attachments,
        });
      } else {
        // Use standard agent modes
        setIsBuilding(true);
        simulateAgentResponse(userMessage);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      setIsBuilding(false);
    }
  };

  const simulateAgentResponse = (userMessage: Message) => {
    // Simulate streaming response
    let fullResponse = '';
    const streamInterval = setInterval(() => {
      const chunk = getResponseChunk(userMessage.content, agentMode);
      fullResponse += chunk;
      setStreamingMessage(fullResponse);
      setBuildProgress(prev => Math.min(prev + 10, 100));
    }, 200);

    setTimeout(() => {
      clearInterval(streamInterval);
      
      const effort = agentMode === 'highpower' ? Math.floor(Math.random() * 100) + 50 : 
                     agentMode === 'thinking' ? Math.floor(Math.random() * 50) + 25 :
                     Math.floor(Math.random() * 25) + 10;
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
        metadata: {
          model: selectedProvider,
          tokens: Math.floor(Math.random() * 2000) + 500,
          effort,
          thinking: agentMode === 'thinking',
          highPower: agentMode === 'highpower',
          webSearch: agentTools.webSearch,
        },
        actions: getSimulatedActions(userMessage.content),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setTotalEffort(prev => prev + effort);
      setStreamingMessage('');
      setIsLoading(false);
      setIsBuilding(false);
      setBuildProgress(0);

      // Show preview if mentioned
      if (userMessage.content.toLowerCase().includes('preview') || 
          userMessage.content.toLowerCase().includes('show')) {
        window.postMessage({ type: 'show-preview' }, '*');
      }
    }, 3000);
  };

  const getResponseChunk = (query: string, mode: string): string => {
    const chunks = {
      standard: ['Building your application... ', 'Setting up components... ', 'Applying styles... ', 'Running tests... ', 'Complete! '],
      thinking: ['🤔 Analyzing requirements... ', 'Planning architecture... ', 'Considering edge cases... ', 'Optimizing solution... ', 'Implementation ready! '],
      highpower: ['⚡ Initializing high-power mode... ', 'Deep analysis in progress... ', 'Generating optimized code... ', 'Performance tuning... ', 'Maximum efficiency achieved! '],
    };
    
    return chunks[mode as keyof typeof chunks][Math.floor(Math.random() * 5)];
  };

  const getSimulatedActions = (query: string): Message['actions'] => {
    const actions = [];
    
    if (query.toLowerCase().includes('create') || query.toLowerCase().includes('build')) {
      actions.push({
        type: 'create_file' as const,
        data: { path: '/src/App.tsx', content: '// Generated code' },
        completed: true,
        progress: 100,
      });
    }
    
    if (query.toLowerCase().includes('install') || query.toLowerCase().includes('package')) {
      actions.push({
        type: 'install_package' as const,
        data: { packages: ['react', 'react-dom'] },
        completed: true,
        progress: 100,
      });
    }
    
    return actions;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'initializing': return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'analyzing': return <Brain className="h-4 w-4" />;
      case 'building': return <Code className="h-4 w-4" />;
      case 'testing': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Unified AI Agent</h2>
          {agentMode === 'v2' && (
            <Badge variant="secondary" className="text-xs">Claude 4.0</Badge>
          )}
          {agentMode === 'thinking' && (
            <Badge variant="outline" className="text-xs">Thinking Mode</Badge>
          )}
          {agentMode === 'highpower' && (
            <Badge variant="default" className="text-xs">High Power</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCapabilities(!showCapabilities)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      {/* Agent Mode Selection */}
      <div className="p-3 border-b bg-muted/50">
        <Tabs value={agentMode} onValueChange={(v) => setAgentMode(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="standard" className="text-xs">Standard</TabsTrigger>
            <TabsTrigger value="thinking" className="text-xs">Thinking</TabsTrigger>
            <TabsTrigger value="highpower" className="text-xs">High Power</TabsTrigger>
            <TabsTrigger value="v2" className="text-xs">Agent v2</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Capabilities Panel */}
      {showCapabilities && (
        <div className="p-4 border-b bg-muted/50 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Model Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-4">Claude 4.0 Sonnet</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gemini-2.5">Gemini 2.5 Pro</SelectItem>
                  <SelectItem value="grok-2">Grok 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {agentMode === 'v2' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Task Complexity</Label>
                <RadioGroup value={complexity} onValueChange={(v) => setComplexity(v as any)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="simple" id="simple" />
                    <Label htmlFor="simple" className="text-xs">Simple</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="moderate" id="moderate" />
                    <Label htmlFor="moderate" className="text-xs">Moderate</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="complex" id="complex" />
                    <Label htmlFor="complex" className="text-xs">Complex</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expert" id="expert" />
                    <Label htmlFor="expert" className="text-xs">Expert</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Agent Tools</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="web-search" className="text-xs">Web Search</Label>
                <Switch
                  id="web-search"
                  checked={agentTools.webSearch}
                  onCheckedChange={(checked) => setAgentTools(prev => ({ ...prev, webSearch: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="dynamic-intel" className="text-xs">Dynamic Intelligence</Label>
                <Switch
                  id="dynamic-intel"
                  checked={agentTools.dynamicIntelligence}
                  onCheckedChange={(checked) => setAgentTools(prev => ({ ...prev, dynamicIntelligence: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-checkpoints" className="text-xs">Auto Checkpoints</Label>
                <Switch
                  id="auto-checkpoints"
                  checked={agentTools.autoCheckpoints}
                  onCheckedChange={(checked) => setAgentTools(prev => ({ ...prev, autoCheckpoints: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="real-time" className="text-xs">Real-time Updates</Label>
                <Switch
                  id="real-time"
                  checked={agentTools.realTimeUpdates}
                  onCheckedChange={(checked) => setAgentTools(prev => ({ ...prev, realTimeUpdates: checked }))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* V2 Progress Display */}
      {agentMode === 'v2' && v2Progress && (
        <Card className="m-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                {getStatusIcon(v2Progress.status)}
                {v2Progress.currentStep}
              </CardTitle>
              <Badge variant="outline">{v2Progress.progress}%</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={v2Progress.progress} className="h-2" />
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <FileCode className="h-3 w-3" />
                <span>{v2Progress.filesModified} files</span>
              </div>
              <div className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                <span>{v2Progress.linesWritten} lines</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>{v2Progress.tokensUsed} tokens</span>
              </div>
              <div className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                <span>{v2Progress.checkpointsCreated} checkpoints</span>
              </div>
            </div>
            
            {v2Progress.errors.length > 0 && (
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {v2Progress.errors[v2Progress.errors.length - 1]}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {agentMode === 'v2' ? 'Claude 4.0 Agent Ready' : 
                 agentMode === 'highpower' ? 'High Power Mode Active' :
                 agentMode === 'thinking' ? 'Thinking Mode Active' :
                 'AI Agent Ready'}
              </p>
              <p className="text-sm">
                {agentMode === 'v2' 
                  ? 'Describe your task and I\'ll build it with advanced capabilities'
                  : 'Describe what you want to build and I\'ll create it for you'}
              </p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-4 space-y-2",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap mb-0">{message.content}</p>
                </div>
                
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.attachments.map((file, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        <Paperclip className="h-3 w-3 mr-1" />
                        {file.name}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {message.actions && message.actions.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {message.actions.map((action, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {action.completed ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        <span className="opacity-70">{action.type.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {message.metadata && (
                  <div className="flex items-center gap-2 mt-2">
                    {message.metadata.model && (
                      <Badge variant="outline" className="text-xs">
                        {message.metadata.model}
                      </Badge>
                    )}
                    {message.metadata.effort && (
                      <Badge variant="secondary" className="text-xs">
                        {message.metadata.effort} effort
                      </Badge>
                    )}
                    {message.metadata.webSearch && (
                      <Badge variant="secondary" className="text-xs">
                        <Search className="h-3 w-3 mr-1" />
                        Web Search
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          
          {streamingMessage && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="max-w-[80%] rounded-lg p-4 bg-muted">
                <p className="whitespace-pre-wrap">{streamingMessage}</p>
                <Loader2 className="h-3 w-3 animate-spin mt-2" />
              </div>
            </div>
          )}
          
          {isBuilding && buildProgress > 0 && (
            <div className="flex gap-3">
              <div className="w-8 h-8" />
              <Card className="max-w-[80%]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Building your application...</span>
                    <span className="text-sm text-muted-foreground">{buildProgress}%</span>
                  </div>
                  <Progress value={buildProgress} className="h-2" />
                </CardContent>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Total Effort Display */}
      {totalEffort > 0 && (
        <div className="px-4 py-2 border-t bg-muted/50 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total effort used:</span>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">{totalEffort} effort points</span>
            <span className="text-muted-foreground">
              (${(totalEffort * 0.001).toFixed(3)})
            </span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t">
        {agentMode === 'v2' && (
          <div className="mb-3">
            <Textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Additional context or requirements (optional)..."
              className="min-h-[60px] text-sm"
            />
          </div>
        )}
        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                agentMode === 'v2'
                  ? "Describe your task for Claude 4.0..."
                  : "Describe what you want to build..."
              }
              className="min-h-[80px] pr-12"
            />
            <div className="absolute bottom-2 right-2 flex gap-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                className="hidden"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-full min-h-[80px]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setMessages([]);
                  setTotalEffort(0);
                  setV2Progress(null);
                }}
                title="Clear chat"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {attachments.map((file, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                <Paperclip className="h-3 w-3 mr-1" />
                {file.name}
                <button
                  onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                  className="ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}