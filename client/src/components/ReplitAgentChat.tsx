import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, User, Send, Paperclip, Mic, Image, FileText, 
  Loader2, Sparkles, Code, Terminal, Globe, Database,
  Settings, RotateCcw, Play, Square, CheckCircle,
  AlertCircle, Clock, Zap, Brain, Search, Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface ReplitAgentChatProps {
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
  };
}

interface AgentCapability {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export function ReplitAgentChat({ projectId }: ReplitAgentChatProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [buildProgress, setBuildProgress] = useState(0);
  const [isBuilding, setIsBuilding] = useState(false);
  const [activeMode, setActiveMode] = useState<'standard' | 'thinking' | 'highpower'>('standard');
  const [conversations, setConversations] = useState<Array<{ id: string; title: string; lastMessage: Date }>>([
    { id: '1', title: 'Current Conversation', lastMessage: new Date() }
  ]);
  const [activeConversation, setActiveConversation] = useState('1');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const capabilities: AgentCapability[] = [
    {
      id: 'code-generation',
      name: 'Code Generation',
      description: 'Generate complete applications from natural language',
      icon: <Code className="h-4 w-4" />,
      enabled: true
    },
    {
      id: 'visual-design',
      name: 'Visual Design',
      description: 'Create UI from screenshots and mockups',
      icon: <Image className="h-4 w-4" />,
      enabled: true
    },
    {
      id: 'web-search',
      name: 'Web Search',
      description: 'Search the web for information and resources',
      icon: <Search className="h-4 w-4" />,
      enabled: true
    },
    {
      id: 'deployment',
      name: 'Deployment',
      description: 'Deploy applications to production',
      icon: <Globe className="h-4 w-4" />,
      enabled: true
    },
    {
      id: 'database',
      name: 'Database Setup',
      description: 'Configure and manage databases',
      icon: <Database className="h-4 w-4" />,
      enabled: true
    },
    {
      id: 'debugging',
      name: 'Advanced Debugging',
      description: 'Identify and fix complex issues',
      icon: <Terminal className="h-4 w-4" />,
      enabled: true
    }
  ];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, scrollToBottom]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || 
      file.type === 'text/plain' ||
      file.name.endsWith('.js') ||
      file.name.endsWith('.tsx') ||
      file.name.endsWith('.html') ||
      file.name.endsWith('.css') ||
      file.name.endsWith('.py') ||
      file.name.endsWith('.json')
    );
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Some files not supported",
        description: "Only images and code files are allowed",
        variant: "destructive"
      });
    }
    
    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const simulateStreaming = async (content: string, onUpdate: (chunk: string) => void) => {
    const words = content.split(' ');
    let currentContent = '';
    
    for (let i = 0; i < words.length; i++) {
      currentContent += (i > 0 ? ' ' : '') + words[i];
      onUpdate(currentContent);
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70));
    }
  };

  const simulateBuildingProcess = async (description: string) => {
    setIsBuilding(true);
    setBuildProgress(0);

    const buildSteps = [
      { message: "🧠 Analyzing your request...", progress: 10 },
      { message: "🔍 Researching best practices...", progress: 20 },
      { message: "📋 Planning application structure...", progress: 30 },
      { message: "📁 Creating project files...", progress: 50 },
      { message: "⚡ Installing dependencies...", progress: 70 },
      { message: "🎨 Generating components...", progress: 85 },
      { message: "🔧 Configuring build tools...", progress: 95 },
      { message: "🚀 Finalizing deployment...", progress: 100 }
    ];

    for (const step of buildSteps) {
      setBuildProgress(step.progress);
      
      const systemMessage: Message = {
        id: `system-${Date.now()}-${step.progress}`,
        role: 'system',
        content: step.message,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, systemMessage]);
      scrollToBottom();
      
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    setIsBuilding(false);
    
    // Add completion message
    const completionMessage: Message = {
      id: `completion-${Date.now()}`,
      role: 'assistant',
      content: `✅ **Application Successfully Built!**

I've created a complete ${description.toLowerCase()} application with:

• **Modern Architecture**: React with TypeScript and Tailwind CSS
• **Responsive Design**: Works perfectly on desktop, tablet, and mobile
• **State Management**: Zustand for efficient state handling
• **API Integration**: RESTful endpoints with proper error handling
• **Database Setup**: PostgreSQL with Drizzle ORM
• **Authentication**: Secure user authentication system
• **Deployment Ready**: Configured for one-click deployment

**Next Steps:**
1. Review the generated code in the file explorer
2. Run the application to see it in action
3. Customize the styling and functionality as needed
4. Deploy to production when ready

Would you like me to explain any part of the implementation or make adjustments?`,
      timestamp: new Date(),
      actions: [
        { type: 'create_file', data: { name: 'App.tsx' }, completed: true },
        { type: 'install_package', data: { name: 'dependencies' }, completed: true },
        { type: 'deploy', data: { url: 'https://your-app.e-code.app' }, completed: true }
      ]
    };
    
    setMessages(prev => [...prev, completionMessage]);
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      attachments: [...attachments],
      metadata: {
        thinking: activeMode === 'thinking',
        highPower: activeMode === 'highpower',
        webSearch: input.toLowerCase().includes('search') || input.toLowerCase().includes('find')
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      // Make real API call to backend
      const response = await apiRequest('POST', `/api/projects/${projectId}/ai/chat`, {
        message: input,
        context: {
          mode: 'agent',
          thinking: activeMode === 'thinking',
          highPower: activeMode === 'highpower',
          webSearch: userMessage.metadata?.webSearch
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      // Handle building actions if returned by backend
      if (data.actions && data.actions.length > 0) {
        setIsBuilding(true);
        setBuildProgress(0);

        // Process actions
        for (const action of data.actions) {
          const systemMessage: Message = {
            id: `system-${Date.now()}-${action.type}`,
            role: 'system',
            content: `${action.type === 'create_file' ? '📄 Creating' : action.type === 'create_folder' ? '📁 Creating' : '📦 Installing'} ${action.data.name || action.data.path}...`,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, systemMessage]);
          setBuildProgress(prev => Math.min(prev + (100 / data.actions.length), 100));
          
          // Execute the action
          if (action.type === 'create_file' && action.data.path && action.data.content) {
            await apiRequest('POST', `/api/projects/${projectId}/files`, {
              path: action.data.path,
              content: action.data.content
            });
          } else if (action.type === 'create_folder' && action.data.path) {
            await apiRequest('POST', `/api/projects/${projectId}/folders`, {
              path: action.data.path
            });
          } else if (action.type === 'install_package' && action.data.packages) {
            await apiRequest('POST', `/api/projects/${projectId}/packages`, {
              packages: action.data.packages
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        setIsBuilding(false);
        setBuildProgress(100);
        
        // Refresh file list
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || '',
        timestamp: new Date(),
        isStreaming: false,
        actions: data.actions?.map((action: any) => ({
          ...action,
          completed: true
        })),
        metadata: {
          thinking: activeMode === 'thinking',
          highPower: activeMode === 'highpower'
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      // Fallback to simulation if API fails
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you want to ${input.toLowerCase()}. While I'm having trouble connecting to the AI service right now, I can still help you build your application.

**What I can do for you:**
• Generate complete applications from your description
• Create modern, responsive user interfaces
• Set up databases and backend infrastructure
• Debug and optimize existing code

Please make sure you have configured your AI API key in the project settings. You can add it in the Secrets tab.`,
        timestamp: new Date(),
        isStreaming: false
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
      
      toast({
        title: "Connection Issue",
        description: "Please check your AI API key in project secrets.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = () => {
    const newId = (Date.now()).toString();
    const newConversation = {
      id: newId,
      title: `Conversation ${conversations.length + 1}`,
      lastMessage: new Date()
    };
    
    setConversations(prev => [...prev, newConversation]);
    setActiveConversation(newId);
    setMessages([]);
  };

  const rollbackToMessage = (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex > -1) {
      setMessages(prev => prev.slice(0, messageIndex));
      toast({
        title: "Rolled back",
        description: "Conversation rolled back to selected point"
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with Conversation Management */}
      <div className="border-b border-[var(--ecode-border)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">E-Code Agent</h3>
              <p className="text-xs text-muted-foreground">
                {isBuilding ? 'Building your app...' : 'Ready to help'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={createNewConversation}
              className="h-8 px-2"
            >
              <span className="text-lg">+</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mode Selector */}
        <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as any)}>
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="standard" className="text-xs">Standard</TabsTrigger>
            <TabsTrigger value="thinking" className="text-xs">
              <Brain className="h-3 w-3 mr-1" />
              Thinking
            </TabsTrigger>
            <TabsTrigger value="highpower" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              High Power
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Hi! I'm your E-Code Agent</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                I can help you build complete applications, debug code, set up databases, and deploy your projects.
              </p>
              
              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                {capabilities.slice(0, 4).map((capability) => (
                  <div key={capability.id} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      {capability.icon}
                      <span className="text-xs font-medium">{capability.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{capability.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role !== 'user' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                <div className={`p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-auto' 
                    : msg.role === 'system'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-200'
                    : 'bg-muted'
                }`}>
                  {msg.metadata?.thinking && (
                    <Badge variant="secondary" className="mb-2 text-xs">
                      <Brain className="h-3 w-3 mr-1" />
                      Extended Thinking
                    </Badge>
                  )}
                  
                  {msg.metadata?.highPower && (
                    <Badge variant="secondary" className="mb-2 text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      High Power Mode
                    </Badge>
                  )}

                  {msg.isStreaming ? (
                    <div>
                      <div className="whitespace-pre-wrap">{streamingMessage}</div>
                      <span className="inline-block w-2 h-5 bg-current opacity-75 animate-pulse ml-1" />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                  
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.attachments.map((file, index) => (
                        <div key={index} className="flex items-center gap-1 text-xs bg-background/50 rounded px-2 py-1">
                          {file.type.startsWith('image/') ? <Image className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                          {file.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.actions.map((action, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          {action.completed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="capitalize">{action.type.replace('_', ' ')}</span>
                          <span className="text-muted-foreground">
                            {typeof action.data === 'object' ? action.data.name || action.data.url : action.data}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-1 px-3">
                  <span className="text-xs text-muted-foreground">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                  {msg.role === 'assistant' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => rollbackToMessage(msg.id)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Rollback to here
                    </Button>
                  )}
                </div>
              </div>
              
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 order-3">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{activeMode === 'thinking' ? 'Thinking deeply...' : activeMode === 'highpower' ? 'Processing with advanced models...' : 'AI is thinking...'}</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Build Progress */}
      {isBuilding && (
        <div className="p-4 border-t bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-orange-500 animate-pulse" />
            <span className="text-sm font-medium">Building your application...</span>
          </div>
          <Progress value={buildProgress} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">
            {Math.round(buildProgress)}% complete
          </div>
        </div>
      )}

      {/* Input Section */}
      <div className="border-t p-4">
        {/* File Attachments */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm">
                {file.type.startsWith('image/') ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                <span className="max-w-32 truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeAttachment(index)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Message Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want to build or ask for help..."
              className="w-full min-h-[44px] max-h-32 text-sm resize-none border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary bg-background"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLoading || isBuilding}
            />
          </div>
          
          <div className="flex items-end gap-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*,.txt,.js,.tsx,.html,.css,.py,.json"
              className="hidden"
            />
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="p-2"
              disabled={isLoading || isBuilding}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2"
              disabled={isLoading || isBuilding}
            >
              <Mic className="h-4 w-4" />
            </Button>
            
            <Button 
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || isLoading || isBuilding}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4"
            >
              {isLoading || isBuilding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}