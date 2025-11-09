/**
 * ChatGPT Admin Interface
 * Admin-only ChatGPT assistant for project development
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bot, 
  Send, 
  Code, 
  FileText, 
  Settings, 
  Trash2, 
  RefreshCw,
  User,
  MessageSquare,
  FolderOpen,
  Sparkles,
  Copy,
  Download,
  ChevronDown,
  Plus,
  X
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface ChatSession {
  id: string;
  userId: string;
  projectId?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  model: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

export function ChatGPTAdmin() {
  const [message, setMessage] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [includeProjectContext, setIncludeProjectContext] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showCodeGeneration, setShowCodeGeneration] = useState(false);
  const [codeRequest, setCodeRequest] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('typescript');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [useStreaming, setUseStreaming] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Check if user is admin
  const { data: adminStatus } = useQuery({
    queryKey: ['/api/admin/check'],
    enabled: true
  });

  // Fetch user's projects
  const { data: projects } = useQuery({
    queryKey: ['/api/admin/chatgpt/projects'],
    enabled: adminStatus?.isAdmin
  });

  // Fetch chat sessions
  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ['/api/admin/chatgpt/sessions'],
    enabled: adminStatus?.isAdmin
  });

  // Fetch current session
  const { data: currentSession, refetch: refetchCurrentSession } = useQuery({
    queryKey: ['/api/admin/chatgpt/sessions', currentSessionId],
    enabled: !!currentSessionId && adminStatus?.isAdmin
  });

  // Create new session mutation
  const createSession = useMutation({
    mutationFn: async (projectId?: string) => {
      const response = await apiRequest('POST', '/api/admin/chatgpt/sessions', { projectId });
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.id);
      refetchSessions();
      toast({
        title: 'New session created',
        description: 'Started a new ChatGPT conversation'
      });
    }
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (params: { message: string; includeProjectContext: boolean }) => {
      if (!currentSessionId) throw new Error('No active session');
      
      const response = await apiRequest('POST', `/api/admin/chatgpt/sessions/${currentSessionId}/messages`, params);
      return response.json();
    },
    onSuccess: () => {
      setMessage('');
      refetchCurrentSession();
      scrollToBottom();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
      });
    }
  });

  // Generate code mutation
  const generateCode = useMutation({
    mutationFn: async (params: { request: string; language: string }) => {
      if (!currentSessionId) throw new Error('No active session');
      
      const response = await apiRequest('POST', '/api/admin/chatgpt/generate-code', {
        sessionId: currentSessionId,
        ...params
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Code generated',
        description: 'Your code has been generated successfully'
      });
      setCodeRequest('');
      setShowCodeGeneration(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate code',
        variant: 'destructive'
      });
    }
  });

  // Clear session mutation
  const clearSession = useMutation({
    mutationFn: async () => {
      if (!currentSessionId) throw new Error('No active session');
      
      const response = await apiRequest('DELETE', `/api/admin/chatgpt/sessions/${currentSessionId}/messages`);
      return response.json();
    },
    onSuccess: () => {
      refetchCurrentSession();
      toast({
        title: 'Session cleared',
        description: 'Conversation history has been cleared'
      });
    }
  });

  // Delete session mutation
  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('DELETE', `/api/admin/chatgpt/sessions/${sessionId}`);
      return response.json();
    },
    onSuccess: () => {
      if (currentSessionId === deleteSession.variables) {
        setCurrentSessionId(null);
      }
      refetchSessions();
      toast({
        title: 'Session deleted',
        description: 'The session has been permanently deleted'
      });
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStreamingMessage = async () => {
    if (!message.trim() || !currentSessionId) return;
    
    setIsStreaming(true);
    setStreamingMessage('');
    const userMessage = message;
    setMessage('');
    
    try {
      const response = await apiRequest('POST', `/api/admin/chatgpt/sessions/${currentSessionId}/stream`, {
        message: userMessage,
        includeProjectContext
      });
      
      if (!response.ok) {
        throw new Error('Failed to start streaming');
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No reader available');
      }
      
      let accumulatedMessage = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content') {
                accumulatedMessage += data.content;
                setStreamingMessage(accumulatedMessage);
                scrollToBottom();
              } else if (data.type === 'done') {
                setIsStreaming(false);
                setStreamingMessage('');
                refetchCurrentSession();
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error: any) {
      setIsStreaming(false);
      toast({
        title: 'Error',
        description: error.message || 'Failed to stream message',
        variant: 'destructive'
      });
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    if (useStreaming) {
      handleStreamingMessage();
    } else {
      sendMessage.mutate({ message, includeProjectContext });
    }
  };

  const handleGenerateCode = () => {
    if (!codeRequest.trim()) return;
    generateCode.mutate({ request: codeRequest, language: codeLanguage });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Content copied to clipboard'
    });
  };

  // Auto-scroll when messages update
  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  // If not admin, show access denied
  if (adminStatus && !adminStatus.isAdmin) {
    return (
      <Card className="m-4 p-8 text-center">
        <CardContent>
          <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
          <p className="text-gray-600">You need administrator privileges to access ChatGPT.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Bot className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg font-semibold">ChatGPT Admin</h2>
            </div>
            <Button
              size="sm"
              onClick={() => createSession.mutate(selectedProjectId || undefined)}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-new-session"
            >
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>
          
          {/* Project selector */}
          <div className="space-y-2">
            <Label htmlFor="project">Project Context</Label>
            <Select value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
              <SelectTrigger data-testid="select-project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No project</SelectItem>
                {projects?.map((project: Project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Sessions list */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {sessions?.map((session: ChatSession) => (
              <Card
                key={session.id}
                className={`p-3 cursor-pointer transition-colors ${
                  currentSessionId === session.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                }`}
                onClick={() => setCurrentSessionId(session.id)}
                data-testid={`session-${session.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {session.messages.length} messages
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession.mutate(session.id);
                    }}
                    data-testid={`button-delete-session-${session.id}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {currentSessionId && currentSession ? (
          <>
            {/* Chat header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-medium">ChatGPT Conversation</h3>
                <span className="text-sm text-gray-500">Model: {currentSession.model}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => clearSession.mutate({})}
                  data-testid="button-clear-session"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCodeGeneration(!showCodeGeneration)}
                  data-testid="button-toggle-code"
                >
                  <Code className="w-4 h-4 mr-1" />
                  Code
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 p-6 bg-gray-50">
              <div className="max-w-4xl mx-auto space-y-4">
                {currentSession.messages.slice(1).map((msg: any, index: number) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    data-testid={`message-${index}`}
                  >
                    <div
                      className={`max-w-2xl p-4 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center mb-2">
                        {msg.role === 'user' ? (
                          <User className="w-4 h-4 mr-2" />
                        ) : (
                          <Bot className="w-4 h-4 mr-2" />
                        )}
                        <span className="text-xs font-medium">
                          {msg.role === 'user' ? 'You' : 'ChatGPT'}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`mt-2 ${msg.role === 'user' ? 'text-white/80 hover:text-white' : ''}`}
                        onClick={() => copyToClipboard(msg.content)}
                        data-testid={`button-copy-${index}`}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Code generation panel */}
            {showCodeGeneration && (
              <div className="bg-white border-t p-4">
                <div className="max-w-4xl mx-auto">
                  <h4 className="text-sm font-medium mb-2">Generate Code</h4>
                  <div className="flex gap-2">
                    <Select value={codeLanguage} onValueChange={setCodeLanguage}>
                      <SelectTrigger className="w-32" data-testid="select-language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="react">React</SelectItem>
                        <SelectItem value="html">HTML/CSS</SelectItem>
                        <SelectItem value="sql">SQL</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={codeRequest}
                      onChange={(e) => setCodeRequest(e.target.value)}
                      placeholder="Describe the code you want to generate..."
                      className="flex-1"
                      data-testid="input-code-request"
                    />
                    <Button
                      onClick={handleGenerateCode}
                      disabled={generateCode.isPending || !codeRequest.trim()}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-generate-code"
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Generate
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Message input */}
            <div className="bg-white border-t p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center space-x-2 mb-2">
                  <Switch
                    id="context"
                    checked={includeProjectContext}
                    onCheckedChange={setIncludeProjectContext}
                    data-testid="switch-context"
                  />
                  <Label htmlFor="context" className="text-sm">
                    Include project context
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask ChatGPT anything..."
                    className="flex-1 resize-none"
                    rows={2}
                    disabled={sendMessage.isPending}
                    data-testid="input-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sendMessage.isPending || !message.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-send"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <Card className="p-8 text-center max-w-md">
              <Bot className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <CardTitle className="mb-2">Welcome to ChatGPT Admin</CardTitle>
              <p className="text-gray-600 mb-4">
                Start a new conversation or select an existing session to continue.
              </p>
              <Button
                onClick={() => createSession.mutate(selectedProjectId || undefined)}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-start-chat"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Start New Chat
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}