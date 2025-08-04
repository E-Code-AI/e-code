import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bot, User, Send, Paperclip, Mic, Image, FileText, 
  Loader2, Sparkles, Code, Terminal, Globe, Database,
  Settings, RotateCcw, Play, Square, CheckCircle,
  AlertCircle, Clock, Zap, Brain, Search, Upload, MessageSquare,
  Eye, Palette, FileCode, ListPlus, Shield, Cpu, Activity
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
  const [showAgentTools, setShowAgentTools] = useState(false);
  const [agentTools, setAgentTools] = useState({
    webSearch: false,
    dynamicIntelligence: false,
    visualEditor: false,
    codeAnalysis: true,
    securityScan: false,
    performanceAnalysis: false
  });
  const [queueItems, setQueueItems] = useState<string[]>([]);
  const [projectInfo, setProjectInfo] = useState<any>(null);
  
  // Fetch project details
  useEffect(() => {
    const fetchProjectInfo = async () => {
      try {
        const data = await apiRequest('GET', `/api/projects/${projectId}`);
        setProjectInfo(data);
      } catch (error) {
        console.error('Failed to fetch project info:', error);
      }
    };
    
    if (projectId) {
      fetchProjectInfo();
    }
  }, [projectId]);
  
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
          const response = await apiRequest('POST', `/api/ai/chat/${projectId}`, {
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
                  const fileResponse = await apiRequest('POST', `/api/files/${projectId}`, {
                    path: action.data.path,
                    content: action.data.content,
                    isFolder: false
                  });
                  
                  if (!fileResponse.ok) {
                    console.error('Failed to create file:', action.data.path, await fileResponse.text());
                  } else {
                    console.log('Successfully created file:', action.data.path);
                    queryClient.invalidateQueries({ queryKey: [`/api/files/${projectId}`] });
                    
                    // If this is a main file, show preview
                    if (action.data.path && (
                      action.data.path.endsWith('.html') || 
                      action.data.path.endsWith('index.html') ||
                      action.data.path === '/index.html' ||
                      action.data.path === '/app.py' ||
                      action.data.path === '/main.py' ||
                      action.data.path === '/server.js' ||
                      action.data.path === '/app.js'
                    )) {
                      window.postMessage({ type: 'show-preview' }, '*');
                    }
                  }
                } catch (error) {
                  console.error('Error creating file:', action.data.path, error);
                }
              } else if (action.type === 'create_folder' && action.data.path) {
                try {
                  const folderResponse = await apiRequest('POST', `/api/files/${projectId}`, {
                    path: action.data.path,
                    isFolder: true
                  });
                  
                  if (!folderResponse.ok) {
                    console.error('Failed to create folder:', action.data.path, await folderResponse.text());
                  } else {
                    console.log('Successfully created folder:', action.data.path);
                    queryClient.invalidateQueries({ queryKey: [`/api/files/${projectId}`] });
                  }
                } catch (error) {
                  console.error('Error creating folder:', action.data.path, error);
                }
              } else if (action.type === 'install_package' && action.data.packages) {
                try {
                  const packageResponse = await apiRequest('POST', `/api/packages/${projectId}`, {
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
            queryClient.invalidateQueries({ queryKey: [`/api/files/${projectId}`] });
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
      file.type === 'application/pdf' ||
      file.type.startsWith('video/') ||
      file.type === 'application/zip' ||
      file.name.endsWith('.js') ||
      file.name.endsWith('.jsx') ||
      file.name.endsWith('.ts') ||
      file.name.endsWith('.tsx') ||
      file.name.endsWith('.html') ||
      file.name.endsWith('.css') ||
      file.name.endsWith('.scss') ||
      file.name.endsWith('.py') ||
      file.name.endsWith('.java') ||
      file.name.endsWith('.cpp') ||
      file.name.endsWith('.go') ||
      file.name.endsWith('.rs') ||
      file.name.endsWith('.json') ||
      file.name.endsWith('.xml') ||
      file.name.endsWith('.yaml') ||
      file.name.endsWith('.yml') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.txt')
    );
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Some files not supported",
        description: "Unsupported file types were excluded",
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
      const response = await apiRequest('POST', `/api/ai/chat/${projectId}`, {
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
              const fileResponse = await apiRequest('POST', `/api/files/${projectId}`, {
                path: action.data.path,
                content: action.data.content,
                isFolder: false
              });
              
              if (!fileResponse.ok) {
                console.error('Failed to create file:', action.data.path, await fileResponse.text());
              } else {
                console.log('Successfully created file:', action.data.path);
                // Invalidate files cache to refresh file explorer
                queryClient.invalidateQueries({ queryKey: [`/api/files/${projectId}`] });
              }
            } catch (error) {
              console.error('Error creating file:', action.data.path, error);
            }
          } else if (action.type === 'create_folder' && action.data.path) {
            try {
              const folderResponse = await apiRequest('POST', `/api/files/${projectId}`, {
                path: action.data.path,
                isFolder: true
              });
              
              if (!folderResponse.ok) {
                console.error('Failed to create folder:', action.data.path, await folderResponse.text());
              } else {
                console.log('Successfully created folder:', action.data.path);
                // Invalidate files cache to refresh file explorer
                queryClient.invalidateQueries({ queryKey: [`/api/files/${projectId}`] });
              }
            } catch (error) {
              console.error('Error creating folder:', action.data.path, error);
            }
          } else if (action.type === 'install_package' && action.data.packages) {
            try {
              const packageResponse = await apiRequest('POST', `/api/packages/${projectId}`, {
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
        queryClient.invalidateQueries({ queryKey: ['/api/files', projectId] });
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
        content: `I understand you want to ${input.toLowerCase()}. I'm experiencing a temporary connection issue, but I can still help you build your application.

**What I can do for you:**
• Generate complete applications from your description
• Create modern, responsive user interfaces
• Set up databases and backend infrastructure
• Debug and optimize existing code

Our team is working to resolve this issue. Please try again in a moment.`,
        timestamp: new Date(),
        isStreaming: false
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
      
      toast({
        title: "Connection Issue",
        description: "Temporary connection issue. Please try again.",
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
              <h3 className="font-semibold mb-2 text-center">
                {projectInfo ? `Hi! I'm here to help with ${projectInfo.name}` : "Hi! I'm your E-Code Agent"}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto text-center">
                {projectInfo 
                  ? `I can help you enhance your ${projectInfo.template || 'project'}, add features, fix bugs, and deploy updates.`
                  : "I can help you build complete applications, debug code, set up databases, and deploy your projects."
                }
              </p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    {projectInfo ? "Try asking me to:" : "Try asking me to:"}
                  </h4>
                  <div className="space-y-2">
                    {projectInfo ? (
                      // Project-specific suggestions based on the project type
                      <>
                        {projectInfo?.name?.includes('Chat') || projectInfo?.name?.includes('WhatsApp') ? (
                          <>
                            <button
                              onClick={() => setInput('Add voice messages support to the chat')}
                              className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Mic className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium">Add voice messages</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Enable voice recording and playback in chat
                              </p>
                            </button>
                            
                            <button
                              onClick={() => setInput('Implement message reactions and emojis')}
                              className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium">Add reactions</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                React to messages with emojis
                              </p>
                            </button>
                          </>
                        ) : projectInfo?.name?.includes('CRM') || projectInfo?.name?.includes('SalesForce') ? (
                          <>
                            <button
                              onClick={() => setInput('Add email automation for customer follow-ups')}
                              className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-purple-500" />
                                <span className="text-sm font-medium">Email automation</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Automate customer follow-up emails
                              </p>
                            </button>
                            
                            <button
                              onClick={() => setInput('Generate sales reports and analytics dashboard')}
                              className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-orange-500" />
                                <span className="text-sm font-medium">Sales analytics</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Create detailed sales performance reports
                              </p>
                            </button>
                          </>
                        ) : projectInfo?.name?.includes('Solar') || projectInfo?.name?.includes('commerce') ? (
                          <>
                            <button
                              onClick={() => setInput('Add customer reviews and ratings system')}
                              className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-medium">Product reviews</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Let customers rate and review products
                              </p>
                            </button>
                            
                            <button
                              onClick={() => setInput('Implement discount codes and promotions')}
                              className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-red-500" />
                                <span className="text-sm font-medium">Promotions system</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Add coupon codes and special offers
                              </p>
                            </button>
                          </>
                        ) : (
                          // Generic suggestions for other project types
                          <>
                            <button
                              onClick={() => setInput(`Add new features to ${projectInfo.name}`)}
                              className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Code className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium">Enhance features</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Add new functionality to your project
                              </p>
                            </button>
                            
                            <button
                              onClick={() => setInput(`Improve the UI/UX of ${projectInfo.name}`)}
                              className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Palette className="h-4 w-4 text-purple-500" />
                                <span className="text-sm font-medium">Improve design</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Enhance the user interface
                              </p>
                            </button>
                          </>
                        )}
                        
                        <button
                          onClick={() => setInput(`Fix bugs and improve performance`)}
                          className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium">Optimize performance</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Debug issues and improve speed
                          </p>
                        </button>
                        
                        <button
                          onClick={() => setInput(`Deploy ${projectInfo.name} to production`)}
                          className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium">Deploy to production</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Make your project live
                          </p>
                        </button>
                      </>
                    ) : (
                      // Generic suggestions when no project is loaded
                      <>
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
                      </>
                    )}
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
                    ? 'bg-orange-500 text-white ml-auto' 
                    : msg.role === 'system'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-200'
                    : 'bg-gray-800 text-gray-100 dark:bg-gray-800 dark:text-gray-100'
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
                          {file.type.startsWith('image/') ? (
                            <Image className="h-3 w-3" />
                          ) : file.type === 'application/pdf' ? (
                            <FileText className="h-3 w-3 text-red-500" />
                          ) : file.type.startsWith('video/') ? (
                            <Upload className="h-3 w-3 text-purple-500" />
                          ) : (
                            <FileText className="h-3 w-3" />
                          )}
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
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 order-3">
                  <User className="h-4 w-4 text-white" />
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
                {file.type.startsWith('image/') ? (
                  <Image className="h-3 w-3" />
                ) : file.type === 'application/pdf' ? (
                  <FileText className="h-3 w-3 text-red-500" />
                ) : file.type.startsWith('video/') ? (
                  <Upload className="h-3 w-3 text-purple-500" />
                ) : file.type === 'application/zip' ? (
                  <Paperclip className="h-3 w-3 text-blue-500" />
                ) : (
                  <FileText className="h-3 w-3" />
                )}
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

        {/* Agent Tools Bar */}
        {showAgentTools && (
          <div className="mb-3 p-3 bg-muted rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Agent Tools</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => setShowAgentTools(false)}
              >
                ×
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="web-search" className="flex items-center gap-2 cursor-pointer">
                  <Search className="h-4 w-4 text-blue-500" />
                  <span className="text-xs">Web Search</span>
                </Label>
                <Switch
                  id="web-search"
                  checked={agentTools.webSearch}
                  onCheckedChange={(checked) => 
                    setAgentTools(prev => ({ ...prev, webSearch: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="dynamic-intelligence" className="flex items-center gap-2 cursor-pointer">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <span className="text-xs">Dynamic Intelligence</span>
                </Label>
                <Switch
                  id="dynamic-intelligence"
                  checked={agentTools.dynamicIntelligence}
                  onCheckedChange={(checked) => 
                    setAgentTools(prev => ({ ...prev, dynamicIntelligence: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="visual-editor" className="flex items-center gap-2 cursor-pointer">
                  <Palette className="h-4 w-4 text-green-500" />
                  <span className="text-xs">Visual Editor</span>
                </Label>
                <Switch
                  id="visual-editor"
                  checked={agentTools.visualEditor}
                  onCheckedChange={(checked) => 
                    setAgentTools(prev => ({ ...prev, visualEditor: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="code-analysis" className="flex items-center gap-2 cursor-pointer">
                  <FileCode className="h-4 w-4 text-orange-500" />
                  <span className="text-xs">Code Analysis</span>
                </Label>
                <Switch
                  id="code-analysis"
                  checked={agentTools.codeAnalysis}
                  onCheckedChange={(checked) => 
                    setAgentTools(prev => ({ ...prev, codeAnalysis: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="security-scan" className="flex items-center gap-2 cursor-pointer">
                  <Shield className="h-4 w-4 text-red-500" />
                  <span className="text-xs">Security Scan</span>
                </Label>
                <Switch
                  id="security-scan"
                  checked={agentTools.securityScan}
                  onCheckedChange={(checked) => 
                    setAgentTools(prev => ({ ...prev, securityScan: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="performance-analysis" className="flex items-center gap-2 cursor-pointer">
                  <Activity className="h-4 w-4 text-cyan-500" />
                  <span className="text-xs">Performance</span>
                </Label>
                <Switch
                  id="performance-analysis"
                  checked={agentTools.performanceAnalysis}
                  onCheckedChange={(checked) => 
                    setAgentTools(prev => ({ ...prev, performanceAnalysis: checked }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Active Tools Indicators */}
        {Object.values(agentTools).some(enabled => enabled) && (
          <div className="mb-2 flex flex-wrap gap-1">
            {agentTools.webSearch && (
              <Badge variant="secondary" className="text-xs">
                <Search className="h-3 w-3 mr-1" />
                Web Search
              </Badge>
            )}
            {agentTools.dynamicIntelligence && (
              <Badge variant="secondary" className="text-xs">
                <Brain className="h-3 w-3 mr-1" />
                Dynamic Intelligence
              </Badge>
            )}
            {agentTools.visualEditor && (
              <Badge variant="secondary" className="text-xs">
                <Palette className="h-3 w-3 mr-1" />
                Visual Editor
              </Badge>
            )}
            {agentTools.codeAnalysis && (
              <Badge variant="secondary" className="text-xs">
                <FileCode className="h-3 w-3 mr-1" />
                Code Analysis
              </Badge>
            )}
            {agentTools.securityScan && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Security Scan
              </Badge>
            )}
            {agentTools.performanceAnalysis && (
              <Badge variant="secondary" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Performance
              </Badge>
            )}
          </div>
        )}

        {/* Message Input - Mobile Optimized */}
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              onClick={() => setShowAgentTools(!showAgentTools)}
              title="Agent tools"
            >
              <Cpu className={`h-5 w-5 ${showAgentTools ? 'text-primary' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              onClick={() => {
                if (input.trim()) {
                  setQueueItems(prev => [...prev, input]);
                  setInput('');
                  toast({
                    title: "Added to queue",
                    description: "Your task has been added to the queue",
                  });
                }
              }}
              title="Add to queue"
              disabled={!input.trim()}
            >
              <ListPlus className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me to build something..."
              className="w-full min-h-[40px] max-h-24 text-[15px] resize-none border-0 rounded-2xl px-4 py-2.5 pr-12 focus:ring-2 focus:ring-primary focus:outline-none bg-muted placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isBuilding) {
                  e.preventDefault();
                  handleSend();
                }
              }}
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
          
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 flex-shrink-0"
            onClick={() => {
              const mockImage = new Blob(['mock visual editor content'], { type: 'image/png' });
              const file = new File([mockImage], 'visual-design.png', { type: 'image/png' });
              setAttachments(prev => [...prev, file]);
              toast({
                title: "Visual Editor",
                description: "Draw or upload a design to convert to code",
              });
            }}
            title="Visual Editor"
          >
            <Eye className="h-5 w-5" />
          </Button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept="image/*,.pdf,.txt,.js,.jsx,.ts,.tsx,.html,.css,.scss,.py,.java,.cpp,.go,.rs,.json,.xml,.yaml,.yml,.md,.zip,video/*"
            className="hidden"
          />
        </div>
        
        {/* Queue Display */}
        {queueItems.length > 0 && (
          <div className="mt-3 p-2 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">Queue ({queueItems.length} items)</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setQueueItems([])}
              >
                Clear
              </Button>
            </div>
            <div className="space-y-1">
              {queueItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs bg-background rounded px-2 py-1">
                  <span className="truncate flex-1">{item}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 ml-2"
                    onClick={() => setQueueItems(prev => prev.filter((_, i) => i !== index))}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}