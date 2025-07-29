import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bot, User, Send, Paperclip, Mic, Image, FileText, 
  Loader2, Sparkles, Code, Terminal, Globe, Database,
  Settings, RotateCcw, Play, Square, CheckCircle,
  AlertCircle, Clock, Zap, Brain, Search, Upload, MessageSquare
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
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  
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

  // Check for initial prompt from dashboard
  useEffect(() => {
    const storedPrompt = window.sessionStorage.getItem(`agent-prompt-${projectId}`);
    if (storedPrompt && messages.length === 0) {
      // Clear the stored prompt
      window.sessionStorage.removeItem(`agent-prompt-${projectId}`);
      
      // Add welcome message
      setMessages([{
        id: '0',
        role: 'system',
        content: 'Starting to build your application...',
        timestamp: new Date()
      }]);
      
      // Set the initial prompt to trigger automatic send
      setInitialPrompt(storedPrompt);
    }
  }, [projectId]);

  // Send initial prompt when it's set
  useEffect(() => {
    if (initialPrompt && !isLoading) {
      // Automatically send the initial prompt
      const sendInitialPrompt = async () => {
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: initialPrompt,
          timestamp: new Date(),
          attachments: [],
          metadata: {
            thinking: false,
            highPower: false,
            webSearch: false
          }
        };

        setMessages(prev => [...prev, userMessage]);
        setInitialPrompt('');
        setIsLoading(true);

        try {
          const response = await apiRequest('POST', `/api/projects/${projectId}/ai/chat`, {
            message: initialPrompt,
            context: {
              mode: 'agent',
              thinking: false,
              highPower: false,
              webSearch: false
            },
            provider: selectedProvider
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to get AI response' }));
            
            if (errorData.message?.includes('API key') || errorData.message?.includes('credentials')) {
              const modelName = {
                openai: 'OpenAI',
                anthropic: 'Anthropic',
                gemini: 'Google Gemini',
                xai: 'xAI',
                perplexity: 'Perplexity',
                mixtral: 'Mixtral (Together.ai)',
                llama: 'Meta Llama (Together.ai)',
                cohere: 'Cohere',
                deepseek: 'DeepSeek',
                mistral: 'Mistral'
              }[selectedProvider] || selectedProvider.toUpperCase();
              
              throw new Error(`${modelName} API key is missing. Please add it in the Secrets tab.`);
            }
            
            throw new Error(errorData.message || 'Failed to get AI response');
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
                try {
                  const fileResponse = await apiRequest('POST', `/api/projects/${projectId}/files`, {
                    path: action.data.path,
                    content: action.data.content,
                    isFolder: false
                  });
                  
                  if (!fileResponse.ok) {
                    console.error('Failed to create file:', action.data.path, await fileResponse.text());
                  } else {
                    console.log('Successfully created file:', action.data.path);
                    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
                  }
                } catch (error) {
                  console.error('Error creating file:', action.data.path, error);
                }
              } else if (action.type === 'create_folder' && action.data.path) {
                try {
                  const folderResponse = await apiRequest('POST', `/api/projects/${projectId}/files`, {
                    path: action.data.path,
                    isFolder: true
                  });
                  
                  if (!folderResponse.ok) {
                    console.error('Failed to create folder:', action.data.path, await folderResponse.text());
                  } else {
                    console.log('Successfully created folder:', action.data.path);
                    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
                  }
                } catch (error) {
                  console.error('Error creating folder:', action.data.path, error);
                }
              } else if (action.type === 'install_package' && action.data.packages) {
                try {
                  const packageResponse = await apiRequest('POST', `/api/projects/${projectId}/packages`, {
                    packages: action.data.packages
                  });
                  
                  if (!packageResponse.ok) {
                    console.error('Failed to install packages:', action.data.packages, await packageResponse.text());
                  } else {
                    console.log('Successfully installed packages:', action.data.packages);
                  }
                } catch (error) {
                  console.error('Error installing packages:', action.data.packages, error);
                }
              }
              
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            setIsBuilding(false);
            setBuildProgress(100);
            
            // Refresh file list
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
          }

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: data.content || data.response || '',
            timestamp: new Date(),
            isStreaming: false,
            actions: data.actions?.map((action: any) => ({
              ...action,
              completed: true
            })),
            metadata: {
              thinking: false,
              highPower: false
            }
          };

          setMessages(prev => [...prev, assistantMessage]);

        } catch (error: any) {
          console.error('Failed to get AI response:', error);
          
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: error.message || 'Failed to get AI response. Please check your API key in the Secrets tab.',
            timestamp: new Date(),
            isStreaming: false
          };
          
          setMessages(prev => [...prev, errorMessage]);
          
          toast({
            title: "AI Connection Issue",
            description: error.message || "Please check your AI API key in project secrets.",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      };

      sendInitialPrompt();
    }
  }, [initialPrompt, isLoading, projectId, selectedProvider]);

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
      await new Promise(resolve => setTimeout(resolve, 50)); // Fixed delay for consistent experience
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
        },
        provider: selectedProvider
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to get AI response' }));
        
        // Check if it's an API key error
        if (errorData.message?.includes('API key') || errorData.message?.includes('credentials')) {
          const modelName = {
            openai: 'OpenAI',
            anthropic: 'Anthropic',
            gemini: 'Google Gemini',
            xai: 'xAI',
            perplexity: 'Perplexity',
            mixtral: 'Mixtral (Together.ai)',
            llama: 'Meta Llama (Together.ai)',
            cohere: 'Cohere',
            deepseek: 'DeepSeek',
            mistral: 'Mistral'
          }[selectedProvider] || selectedProvider.toUpperCase();
          
          throw new Error(`${modelName} API key is missing. Please add it in the Secrets tab.`);
        }
        
        throw new Error(errorData.message || 'Failed to get AI response');
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
            try {
              const fileResponse = await apiRequest('POST', `/api/projects/${projectId}/files`, {
                path: action.data.path,
                content: action.data.content,
                isFolder: false
              });
              
              if (!fileResponse.ok) {
                console.error('Failed to create file:', action.data.path, await fileResponse.text());
              } else {
                console.log('Successfully created file:', action.data.path);
                // Invalidate files cache to refresh file explorer
                queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
              }
            } catch (error) {
              console.error('Error creating file:', action.data.path, error);
            }
          } else if (action.type === 'create_folder' && action.data.path) {
            try {
              const folderResponse = await apiRequest('POST', `/api/projects/${projectId}/files`, {
                path: action.data.path,
                isFolder: true
              });
              
              if (!folderResponse.ok) {
                console.error('Failed to create folder:', action.data.path, await folderResponse.text());
              } else {
                console.log('Successfully created folder:', action.data.path);
                // Invalidate files cache to refresh file explorer
                queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
              }
            } catch (error) {
              console.error('Error creating folder:', action.data.path, error);
            }
          } else if (action.type === 'install_package' && action.data.packages) {
            try {
              const packageResponse = await apiRequest('POST', `/api/projects/${projectId}/packages`, {
                packages: action.data.packages
              });
              
              if (!packageResponse.ok) {
                console.error('Failed to install packages:', action.data.packages, await packageResponse.text());
              } else {
                console.log('Successfully installed packages:', action.data.packages);
              }
            } catch (error) {
              console.error('Error installing packages:', action.data.packages, error);
            }
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
        content: data.content || data.response || '',
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
    setInput('');
    setAttachments([]);
    setBuildProgress(0);
    setIsBuilding(false);
    
    toast({
      title: "New conversation started",
      description: "Ready to help with your next project!"
    });
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
                {isBuilding ? 'Building your app...' : isLoading ? 'Processing...' : 'Ready to help'}
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2"
              onClick={() => setShowCapabilities(!showCapabilities)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Conversation Selector */}
        <Select value={activeConversation} onValueChange={setActiveConversation}>
          <SelectTrigger className="h-8 text-xs mb-3">
            <SelectValue placeholder="Select conversation" />
          </SelectTrigger>
          <SelectContent>
            {conversations.map(conv => (
              <SelectItem key={conv.id} value={conv.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{conv.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(conv.lastMessage).toLocaleDateString()}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
        
        {/* AI Model Selector */}
        <div className="mt-3">
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select AI Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">
                <div className="flex items-center gap-2">
                  <span className="font-medium">OpenAI GPT-4o</span>
                  <span className="text-xs text-muted-foreground">(Latest)</span>
                </div>
              </SelectItem>
              <SelectItem value="anthropic">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Anthropic Claude Sonnet 4</span>
                  <span className="text-xs text-muted-foreground">(Latest)</span>
                </div>
              </SelectItem>
              <SelectItem value="gemini">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Google Gemini 2.5</span>
                  <span className="text-xs text-muted-foreground">(Flash/Pro)</span>
                </div>
              </SelectItem>
              <SelectItem value="xai">
                <div className="flex items-center gap-2">
                  <span className="font-medium">xAI Grok 2</span>
                  <span className="text-xs text-muted-foreground">(Vision)</span>
                </div>
              </SelectItem>
              <SelectItem value="perplexity">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Perplexity</span>
                  <span className="text-xs text-muted-foreground">(Web Search)</span>
                </div>
              </SelectItem>
              <SelectItem value="mixtral">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Mixtral 8x7B</span>
                  <span className="text-xs text-muted-foreground">(Open Source)</span>
                </div>
              </SelectItem>
              <SelectItem value="llama">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Meta Llama 3</span>
                  <span className="text-xs text-muted-foreground">(70B Model)</span>
                </div>
              </SelectItem>
              <SelectItem value="cohere">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Cohere Command</span>
                  <span className="text-xs text-muted-foreground">(Enterprise)</span>
                </div>
              </SelectItem>
              <SelectItem value="deepseek">
                <div className="flex items-center gap-2">
                  <span className="font-medium">DeepSeek Chat</span>
                  <span className="text-xs text-muted-foreground">(Chinese AI)</span>
                </div>
              </SelectItem>
              <SelectItem value="mistral">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Mistral Medium</span>
                  <span className="text-xs text-muted-foreground">(French AI)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Capabilities Panel */}
      {showCapabilities && (
        <div className="border-b bg-muted/50 p-4">
          <h4 className="font-medium mb-3 text-sm">AI Agent Capabilities</h4>
          <div className="grid grid-cols-2 gap-2">
            {capabilities.map((capability) => (
              <div
                key={capability.id}
                className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                  capability.enabled ? 'bg-green-500/10 border-green-500/20' : 'bg-muted border-border'
                }`}
              >
                {capability.icon}
                <span className="flex-1">{capability.name}</span>
                {capability.enabled && <CheckCircle className="h-3 w-3 text-green-500" />}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className={`flex items-center gap-2 text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">Model: {selectedProvider.toUpperCase()}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="py-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2 text-center">Hi! I'm your E-Code Agent</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto text-center">
                I can help you build complete applications, debug code, set up databases, and deploy your projects.
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Try asking me to:</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => setInput('Build a todo app with React and TypeScript')}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Build a todo app</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Create a modern task management app with React
                      </p>
                    </button>
                    
                    <button
                      onClick={() => setInput('Create a portfolio website with animations')}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Portfolio website</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Design a personal portfolio with smooth animations
                      </p>
                    </button>
                    
                    <button
                      onClick={() => setInput('Build a real-time chat application')}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">Chat application</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Create a WebSocket-powered chat with rooms
                      </p>
                    </button>
                    
                    <button
                      onClick={() => setInput('Create an expense tracker with charts')}
                      className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Expense tracker</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Track expenses with visual charts and reports
                      </p>
                    </button>
                  </div>
                </div>
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

      {/* Input Section - Mobile Optimized */}
      <div className="border-t p-3 bg-background">
        {/* File Attachments */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 text-xs">
                {file.type.startsWith('image/') ? <Image className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                <span className="max-w-24 truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeAttachment(index)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Message Input - Mobile Optimized */}
        <div className="flex gap-2 items-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to build something..."
              className="w-full min-h-[40px] max-h-24 text-[15px] resize-none border-0 rounded-2xl px-4 py-2.5 pr-12 focus:ring-2 focus:ring-primary focus:outline-none bg-muted placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLoading || isBuilding}
            />
            <Button
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || isLoading || isBuilding}
              size="icon"
              className="absolute right-1 bottom-1 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
              data-send-button
            >
              {isLoading || isBuilding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept="image/*,.txt,.js,.tsx,.html,.css,.py,.json"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}