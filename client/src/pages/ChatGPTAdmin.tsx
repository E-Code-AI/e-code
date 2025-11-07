import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Brain, FileCode, Terminal, GitBranch, Package, Database, 
  Search, PlayCircle, StopCircle, AlertCircle, CheckCircle,
  Code2, FolderTree, Cpu, Zap, Activity, Clock, Loader2,
  Settings, Bot, Sparkles, RefreshCw, Save, Download, Upload,
  FileText, FolderOpen, Trash2, Edit, Eye, Copy, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';
import MonacoEditor from '@monaco-editor/react';

interface AgentSession {
  id: string;
  userId: string;
  projectId?: string;
  sessionToken: string;
  model: string;
  context: any;
  isActive: boolean;
  totalTokensUsed: number;
  totalOperations: number;
  startedAt: Date;
  endedAt?: Date;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  functionCall?: any;
  timestamp: Date;
}

interface Tool {
  id: string;
  name: string;
  displayName: string;
  description: string;
  capability: string;
  isEnabled: boolean;
  requiresAuth: boolean;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  config: any;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

interface FileOperation {
  id: string;
  path: string;
  operation: string;
  status: string;
  timestamp: Date;
}

export default function ChatGPTAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeSession, setActiveSession] = useState<AgentSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-5');
  const [extendedThinking, setExtendedThinking] = useState(true);
  const [highPower, setHighPower] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [fileExplorer, setFileExplorer] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [commandOutput, setCommandOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check admin status
  useEffect(() => {
    if (!user?.isAdmin) {
      window.location.href = '/';
    }
  }, [user]);

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io('/agent', {
      auth: { token: user?.id }
    });

    newSocket.on('connect', () => {
      console.log('Connected to agent WebSocket');
    });

    newSocket.on('file:operation', (event) => {
      console.log('File operation:', event);
      refreshFileExplorer();
    });

    newSocket.on('command:event', (event) => {
      console.log('Command event:', event);
      if (event.type === 'output') {
        setCommandOutput(prev => prev + event.data);
      }
    });

    newSocket.on('tool:event', (event) => {
      console.log('Tool event:', event);
    });

    newSocket.on('workflow:event', (event) => {
      console.log('Workflow event:', event);
      if (event.type === 'step_complete') {
        setWorkflowSteps(prev => prev.map(step => 
          step.id === event.stepId ? { ...step, status: 'completed' } : step
        ));
      }
    });

    newSocket.on('agent:function', (event) => {
      console.log('Agent function:', event);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user?.id]);

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: { model: string }) => {
      const res = await apiRequest('/api/admin/agent/sessions', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create session');
      return await res.json();
    },
    onSuccess: (data) => {
      setActiveSession(data.session);
      toast({
        title: 'Session Created',
        description: 'Agent session is ready',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Execute agent mutation
  const executeAgentMutation = useMutation({
    mutationFn: async (data: { messages: Message[] }) => {
      if (!activeSession) throw new Error('No active session');
      
      const res = await apiRequest(`/api/admin/agent/sessions/${activeSession.id}/execute`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to execute agent');
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.message) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        }]);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Execution Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Stream agent execution
  const streamExecution = async (prompt: string) => {
    if (!activeSession) return;
    
    setIsStreaming(true);
    setIsExecuting(true);
    
    try {
      const response = await fetch(`/api/admin/agent/sessions/${activeSession.id}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsStreaming(false);
              setIsExecuting(false);
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content') {
                  assistantMessage += parsed.content;
                  updateLastMessage(assistantMessage);
                } else if (parsed.type === 'function_result') {
                  console.log('Function executed:', parsed);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error: any) {
      toast({
        title: 'Stream Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsStreaming(false);
      setIsExecuting(false);
    }
  };

  const updateLastMessage = (content: string) => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
        newMessages[newMessages.length - 1].content = content;
      } else {
        newMessages.push({
          id: Date.now().toString(),
          role: 'assistant',
          content,
          timestamp: new Date()
        });
      }
      return newMessages;
    });
  };

  // Get available tools
  const { data: tools } = useQuery({
    queryKey: ['/api/admin/agent/tools'],
    enabled: !!activeSession
  });

  // Get session stats
  const { data: stats } = useQuery({
    queryKey: [`/api/admin/agent/stats/${activeSession?.id}`],
    enabled: !!activeSession,
    refetchInterval: 5000
  });

  // Handle message submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeSession) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Stream the execution
    await streamExecution(input);
  };

  // Start new session
  const startNewSession = () => {
    createSessionMutation.mutate({ model: selectedModel });
  };

  // Refresh file explorer
  const refreshFileExplorer = async () => {
    if (!activeSession) return;
    
    try {
      const res = await apiRequest('/api/admin/agent/files/list', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: activeSession.id,
          path: '.',
          recursive: false
        })
      });
      if (res.ok) {
        const data = await res.json();
        setFileExplorer(data.files || []);
      }
    } catch (error) {
      console.error('Error refreshing file explorer:', error);
    }
  };

  // Load file content
  const loadFile = async (path: string) => {
    if (!activeSession) return;
    
    try {
      const res = await apiRequest('/api/admin/agent/files/read', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: activeSession.id,
          path
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedFile(path);
        setFileContent(data.content || '');
      }
    } catch (error) {
      console.error('Error loading file:', error);
    }
  };

  // Save file content
  const saveFile = async () => {
    if (!activeSession || !selectedFile) return;
    
    try {
      const res = await apiRequest('/api/admin/agent/files/write', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: activeSession.id,
          path: selectedFile,
          content: fileContent
        })
      });
      
      if (res.ok) {
        toast({
          title: 'File Saved',
          description: `${selectedFile} has been updated`,
        });
      } else {
        throw new Error('Failed to save file');
      }
    } catch (error: any) {
      toast({
        title: 'Save Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Execute command
  const executeCommand = async (command: string) => {
    if (!activeSession) return;
    
    setCommandOutput('');
    setIsExecuting(true);
    
    try {
      const res = await apiRequest('/api/admin/agent/commands/execute', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: activeSession.id,
          command: command.split(' ')[0],
          args: command.split(' ').slice(1)
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setCommandOutput(data.stdout || data.stderr || '');
      } else {
        throw new Error('Failed to execute command');
      }
    } catch (error: any) {
      setCommandOutput(`Error: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user?.isAdmin) {
    return <div>Access denied</div>;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Session & Tools */}
      <div className="w-80 border-r bg-card/50">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">GPT-5 Agent</h1>
            <Badge variant="outline">Enterprise</Badge>
          </div>
          
          {!activeSession ? (
            <Card>
              <CardHeader>
                <CardTitle>Start Agent Session</CardTitle>
                <CardDescription>Configure and launch autonomous agent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-5">GPT-5 (Latest)</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="extended-thinking">Extended Thinking</Label>
                    <Switch 
                      id="extended-thinking"
                      checked={extendedThinking}
                      onCheckedChange={setExtendedThinking}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="high-power">High Power Mode</Label>
                    <Switch 
                      id="high-power"
                      checked={highPower}
                      onCheckedChange={setHighPower}
                    />
                  </div>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={startNewSession}
                  disabled={createSessionMutation.isPending}
                >
                  {createSessionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Initialize Agent
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Session</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {activeSession.id.slice(0, 8)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-medium">{activeSession.model}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tokens Used</span>
                        <span className="font-mono">{stats?.tokensUsed || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Operations</span>
                        <span className="font-mono">{stats?.totalOperations || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Available Tools */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Available Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {tools?.tools?.map((tool: Tool) => (
                        <div key={tool.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent">
                          <Code2 className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{tool.displayName}</div>
                            <div className="text-xs text-muted-foreground">{tool.capability}</div>
                          </div>
                          {tool.isEnabled && (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Workflow Steps */}
        {workflowSteps.length > 0 && (
          <div className="p-4 border-t">
            <h3 className="font-medium mb-2">Workflow Progress</h3>
            <div className="space-y-1">
              {workflowSteps.map(step => (
                <div key={step.id} className="flex items-center gap-2 text-sm">
                  {step.status === 'completed' ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : step.status === 'running' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : step.status === 'failed' ? (
                    <AlertCircle className="h-3 w-3 text-red-500" />
                  ) : (
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={step.status === 'completed' ? 'text-muted-foreground' : ''}>
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {activeSession ? (
          <>
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="border-b">
                <TabsList className="w-full justify-start rounded-none h-12 bg-transparent">
                  <TabsTrigger value="chat" className="gap-2">
                    <Brain className="h-4 w-4" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="files" className="gap-2">
                    <FileCode className="h-4 w-4" />
                    Files
                  </TabsTrigger>
                  <TabsTrigger value="terminal" className="gap-2">
                    <Terminal className="h-4 w-4" />
                    Terminal
                  </TabsTrigger>
                  <TabsTrigger value="git" className="gap-2">
                    <GitBranch className="h-4 w-4" />
                    Git
                  </TabsTrigger>
                  <TabsTrigger value="database" className="gap-2">
                    <Database className="h-4 w-4" />
                    Database
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Chat Tab */}
              <TabsContent value="chat" className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    <AnimatePresence>
                      {messages.map(message => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                        >
                          {message.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Bot className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div className={`max-w-[70%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
                            <div className="whitespace-pre-wrap">{message.content}</div>
                            <div className="text-xs opacity-70 mt-1">
                              {format(message.timestamp, 'HH:mm')}
                            </div>
                          </div>
                          {message.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                              <span className="text-sm font-medium">{user?.username?.[0]?.toUpperCase()}</span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                
                <form onSubmit={handleSubmit} className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isStreaming ? "Agent is thinking..." : "Ask the agent to build something..."}
                      disabled={isStreaming || !activeSession}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isStreaming || !activeSession || !input.trim()}>
                      {isStreaming ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {isExecuting && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Activity className="h-3 w-3 animate-pulse" />
                      Agent is working...
                    </div>
                  )}
                </form>
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files" className="flex-1 flex p-0">
                <div className="w-64 border-r bg-card/50">
                  <div className="p-2 border-b">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={refreshFileExplorer}
                    >
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Refresh
                    </Button>
                  </div>
                  <ScrollArea className="h-full">
                    <div className="p-2 space-y-1">
                      {fileExplorer.map((item: any) => (
                        <button
                          key={item.path}
                          onClick={() => !item.isDirectory && loadFile(item.path)}
                          className={`w-full flex items-center gap-2 p-2 rounded text-sm hover:bg-accent text-left ${selectedFile === item.path ? 'bg-accent' : ''}`}
                        >
                          {item.isDirectory ? (
                            <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="truncate">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                
                <div className="flex-1 flex flex-col">
                  {selectedFile ? (
                    <>
                      <div className="p-2 border-b flex items-center justify-between">
                        <span className="text-sm font-mono">{selectedFile}</span>
                        <Button size="sm" onClick={saveFile}>
                          <Save className="h-3 w-3 mr-2" />
                          Save
                        </Button>
                      </div>
                      <MonacoEditor
                        value={fileContent}
                        onChange={(value) => setFileContent(value || '')}
                        language="typescript"
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: 'on',
                        }}
                      />
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      Select a file to edit
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Terminal Tab */}
              <TabsContent value="terminal" className="flex-1 flex flex-col p-0">
                <div className="flex-1 bg-black text-green-400 font-mono p-4 overflow-auto">
                  <pre className="whitespace-pre-wrap">{commandOutput}</pre>
                </div>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.command.value;
                    if (input) {
                      executeCommand(input);
                      e.currentTarget.command.value = '';
                    }
                  }}
                  className="p-4 border-t bg-card"
                >
                  <div className="flex gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      name="command"
                      placeholder="Enter command..."
                      disabled={isExecuting}
                      className="flex-1 font-mono"
                    />
                  </div>
                </form>
              </TabsContent>

              {/* Other tabs can be implemented similarly */}
            </Tabs>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Bot className="h-16 w-16 mx-auto text-muted-foreground" />
              <h2 className="text-2xl font-bold">GPT-5 Autonomous Agent</h2>
              <p className="text-muted-foreground max-w-md">
                Start a new session to access the full autonomous app-building capabilities.
                The agent can create complete applications, manage files, execute commands,
                handle databases, and deploy to production.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}