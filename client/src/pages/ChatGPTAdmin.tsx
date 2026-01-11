import React, { useState, useEffect, useRef, Suspense } from 'react';
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
  FileText, FolderOpen, Trash2, Edit, Eye, Copy, ChevronRight,
  Users, Monitor, XCircle
} from 'lucide-react';
import { LazyMotionDiv, LazyAnimatePresence } from '@/lib/motion';
import { io, Socket } from 'socket.io-client';
import { format, formatDistanceToNow } from 'date-fns';
import { CM6Editor } from '@/components/editor/CM6Editor';

const EditorFallback = () => (
  <div className="h-full flex items-center justify-center bg-muted/30">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading editor...</p>
    </div>
  </div>
);

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

interface AdminAgentSession {
  id: string;
  userId: number;
  userEmail?: string;
  username?: string;
  projectId?: number;
  projectName?: string;
  model: string;
  tokensUsed: number;
  status: string;
  startedAt: string;
  lastActivityAt?: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  ownerEmail?: string;
  ownerUsername?: string;
  createdAt: string;
  updatedAt?: string;
}

interface ProjectFile {
  id: number;
  projectId: number;
  name: string;
  path: string;
  content?: string;
  isDirectory?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  const [selectedModel, setSelectedModel] = useState('gpt-5.2');
  const [extendedThinking, setExtendedThinking] = useState(true);
  const [highPower, setHighPower] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [commandOutput, setCommandOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check admin status
  useEffect(() => {
    if (user && user.role !== 'admin') {
      window.location.href = '/';
    }
  }, [user]);

  // Fetch ALL projects from all users
  const { data: allProjects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/admin/chatgpt/all-projects'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/admin/chatgpt/all-projects');
    }
  });

  // Fetch files for selected project
  const { data: projectFiles, isLoading: filesLoading, refetch: refetchFiles } = useQuery<ProjectFile[]>({
    queryKey: ['/api/admin/chatgpt/projects', selectedProject?.id, 'files'],
    queryFn: async () => {
      if (!selectedProject) return [];
      return await apiRequest('GET', `/api/admin/chatgpt/projects/${selectedProject.id}/files`);
    },
    enabled: !!selectedProject
  });

  // Fetch all active agent sessions across all users
  const { data: agentSessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery<AdminAgentSession[]>({
    queryKey: ['/api/admin/chatgpt/agent-sessions'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/admin/chatgpt/agent-sessions');
    },
    refetchInterval: 10000
  });

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io('/agent', {
      auth: { token: user?.id }
    });

    newSocket.on('connect', () => {
    });

    newSocket.on('file:operation', (event) => {
      if (selectedProject) {
        refetchFiles();
      }
    });

    newSocket.on('command:event', (event) => {
      if (event.type === 'output') {
        setCommandOutput(prev => prev + event.data);
      }
    });

    newSocket.on('tool:event', (event) => {
    });

    newSocket.on('workflow:event', (event) => {
      if (event.type === 'step_complete') {
        setWorkflowSteps(prev => prev.map(step => 
          step.id === event.stepId ? { ...step, status: 'completed' } : step
        ));
      }
    });

    newSocket.on('agent:function', (event) => {
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user?.id, selectedProject]);

  // Create session mutation - now uses /api/admin/chatgpt/sessions with projectId
  const createSessionMutation = useMutation({
    mutationFn: async (data: { model: string; projectId?: number }) => {
      return await apiRequest('POST', '/api/admin/chatgpt/sessions', data);
    },
    onSuccess: (data) => {
      setActiveSession(data);
      toast({
        title: 'Session Created',
        description: 'Chat session is ready',
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

  // Terminate session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest('POST', `/api/admin/chatgpt/agent-sessions/${sessionId}/terminate`);
    },
    onSuccess: () => {
      toast({
        title: 'Session Terminated',
        description: 'Agent session has been terminated',
      });
      refetchSessions();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Save file mutation - uses real project endpoint
  const saveFileMutation = useMutation({
    mutationFn: async ({ fileId, content }: { fileId: number; content: string }) => {
      if (!selectedProject) throw new Error('No project selected');
      return await apiRequest('PUT', `/api/admin/chatgpt/projects/${selectedProject.id}/files/${fileId}`, { content });
    },
    onSuccess: () => {
      toast({
        title: 'File Saved',
        description: `${selectedFile?.name} has been updated`,
      });
      refetchFiles();
    },
    onError: (error: any) => {
      toast({
        title: 'Save Error',
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
      const response = await fetch(`/api/admin/chatgpt/sessions/${activeSession.id}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message: prompt, includeProjectContext: !!selectedProject }),
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
                } else if (parsed.type === 'done') {
                  setIsStreaming(false);
                  setIsExecuting(false);
                }
              } catch (e) {
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
    queryKey: ['/api/admin/agent/stats', activeSession?.id],
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

    await streamExecution(input);
  };

  // Start new session with selected project
  const startNewSession = () => {
    createSessionMutation.mutate({ 
      model: selectedModel,
      projectId: selectedProject?.id 
    });
  };

  // Handle project selection
  const handleProjectSelect = (projectId: string) => {
    const project = allProjects?.find(p => p.id === parseInt(projectId));
    if (project) {
      setSelectedProject(project);
      setSelectedFile(null);
      setFileContent('');
    }
  };

  // Load file content from real project
  const loadFile = async (file: ProjectFile) => {
    if (!selectedProject || file.isDirectory) return;
    
    try {
      const data = await apiRequest('GET', `/api/admin/chatgpt/projects/${selectedProject.id}/files/${file.id}`);
      setSelectedFile(data);
      setFileContent(data.content || '');
    } catch (error: any) {
      toast({
        title: 'Error Loading File',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Save file content to real project
  const saveFile = async () => {
    if (!selectedProject || !selectedFile) return;
    saveFileMutation.mutate({ fileId: selectedFile.id, content: fileContent });
  };

  // Execute command
  const executeCommand = async (command: string) => {
    if (!activeSession) return;
    
    setCommandOutput('');
    setIsExecuting(true);
    
    try {
      const data = await apiRequest('POST', '/api/admin/agent/commands/execute', {
        sessionId: activeSession.id,
        command: command.split(' ')[0],
        args: command.split(' ').slice(1)
      });
      setCommandOutput(data.stdout || data.stderr || '');
    } catch (error: any) {
      setCommandOutput(`Error: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (user?.role !== 'admin') {
    return <div>Access denied</div>;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Session & Tools */}
      <div className="w-80 border-r bg-card/50 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Admin Control</h1>
            <Badge variant="outline">Enterprise</Badge>
          </div>
          
          {/* Project Selector */}
          <div className="mb-4">
            <Label className="text-sm font-medium mb-2 block">Select Project (All Users)</Label>
            <Select 
              value={selectedProject?.id?.toString() || ''} 
              onValueChange={handleProjectSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                {projectsLoading ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Loading projects...
                  </div>
                ) : (
                  allProjects?.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      <div className="flex flex-col">
                        <span>{project.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {project.ownerEmail || project.ownerUsername || `User #${project.ownerId}`}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedProject && (
              <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                <div><strong>Owner:</strong> {selectedProject.ownerEmail || selectedProject.ownerUsername}</div>
                <div><strong>ID:</strong> {selectedProject.id}</div>
              </div>
            )}
          </div>
          
          {!activeSession ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Start Chat Session</CardTitle>
                <CardDescription className="text-xs">Configure and launch GPT session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-5.2">GPT-5.2 (Latest)</SelectItem>
                      <SelectItem value="gpt-5.2-codex">GPT-5.2 Codex</SelectItem>
                      <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
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
                  Start Session
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
                    {selectedProject && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Project</span>
                        <span className="font-medium truncate max-w-[120px]">{selectedProject.name}</span>
                      </div>
                    )}
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
                  <ScrollArea className="h-48">
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
                  <TabsTrigger value="sessions" className="gap-2">
                    <Monitor className="h-4 w-4" />
                    Sessions
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
                    <LazyAnimatePresence>
                      {messages.map(message => (
                        <LazyMotionDiv
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
                        </LazyMotionDiv>
                      ))}
                    </LazyAnimatePresence>
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

              {/* Files Tab - Now shows REAL project files */}
              <TabsContent value="files" className="flex-1 flex p-0">
                <div className="w-64 border-r bg-card/50">
                  <div className="p-2 border-b flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => refetchFiles()}
                      disabled={!selectedProject}
                    >
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Refresh
                    </Button>
                  </div>
                  {!selectedProject ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Select a project to view files
                    </div>
                  ) : filesLoading ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      Loading files...
                    </div>
                  ) : (
                    <ScrollArea className="h-full">
                      <div className="p-2 space-y-1">
                        {projectFiles?.map((file: ProjectFile) => (
                          <button
                            key={file.id}
                            onClick={() => loadFile(file)}
                            className={`w-full flex items-center gap-2 p-2 rounded text-sm hover:bg-accent text-left ${selectedFile?.id === file.id ? 'bg-accent' : ''}`}
                          >
                            {file.isDirectory ? (
                              <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="truncate">{file.name || file.path}</span>
                          </button>
                        ))}
                        {projectFiles?.length === 0 && (
                          <div className="text-sm text-muted-foreground p-2">No files found</div>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col">
                  {selectedFile ? (
                    <>
                      <div className="p-2 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">{selectedFile.name || selectedFile.path}</span>
                          <Badge variant="outline" className="text-xs">ID: {selectedFile.id}</Badge>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={saveFile}
                          disabled={saveFileMutation.isPending}
                        >
                          {saveFileMutation.isPending ? (
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3 mr-2" />
                          )}
                          Save
                        </Button>
                      </div>
                      <Suspense fallback={<EditorFallback />}>
                        <CM6Editor
                          value={fileContent}
                          onChange={(value) => setFileContent(value)}
                          language="typescript"
                          theme="dark"
                          height="100%"
                        />
                      </Suspense>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      {selectedProject ? 'Select a file to edit' : 'Select a project first'}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Sessions Tab - Monitor all active agent sessions */}
              <TabsContent value="sessions" className="flex-1 flex flex-col p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">Active Agent Sessions</h2>
                    <p className="text-sm text-muted-foreground">Monitor and manage all user sessions</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchSessions()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !agentSessions || agentSessions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No active agent sessions</p>
                    </CardContent>
                  </Card>
                ) : (
                  <ScrollArea className="flex-1">
                    <div className="space-y-3">
                      {agentSessions.map((session) => (
                        <Card key={session.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                                    {session.status}
                                  </Badge>
                                  <span className="font-mono text-sm">{session.id.slice(0, 12)}...</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mt-2">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">User:</span>
                                    <span>{session.userEmail || session.username || `#${session.userId}`}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <FolderOpen className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">Project:</span>
                                    <span>{session.projectName || session.projectId || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Bot className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">Model:</span>
                                    <span>{session.model}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Zap className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">Tokens:</span>
                                    <span>{session.tokensUsed?.toLocaleString() || 0}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">Started:</span>
                                    <span>
                                      {session.startedAt 
                                        ? formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })
                                        : 'Unknown'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Activity className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">Last Activity:</span>
                                    <span>
                                      {session.lastActivityAt 
                                        ? formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true })
                                        : 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => terminateSessionMutation.mutate(session.id)}
                                disabled={terminateSessionMutation.isPending}
                              >
                                {terminateSessionMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Terminate
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
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

              {/* Git Tab (Placeholder) */}
              <TabsContent value="git" className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Git integration coming soon</p>
                </div>
              </TabsContent>

              {/* Database Tab (Placeholder) */}
              <TabsContent value="database" className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Database panel coming soon</p>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Bot className="h-16 w-16 mx-auto text-muted-foreground" />
              <h2 className="text-2xl font-bold">Admin Control Panel</h2>
              <p className="text-muted-foreground max-w-md">
                Select a project from any user and start a session to access the full admin capabilities.
                You can view and edit files, monitor active sessions, and intervene when needed.
              </p>
              {selectedProject && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">Selected Project: {selectedProject.name}</p>
                  <p className="text-xs text-muted-foreground">Owner: {selectedProject.ownerEmail || selectedProject.ownerUsername}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
