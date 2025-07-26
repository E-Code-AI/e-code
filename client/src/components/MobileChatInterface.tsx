import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, Send, Paperclip, Mic, X, Bot, User, Image, FileText, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { QUICK_SUGGESTIONS } from '@/constants/brand';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  attachments?: File[];
  actions?: Array<{
    type: 'create_file' | 'create_folder' | 'install_package' | 'deploy';
    data: any;
    completed: boolean;
  }>;
}

interface MobileChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  onStartBuilding: (description: string) => void;
}

export function MobileChatInterface({ isOpen, onClose, onStartBuilding }: MobileChatInterfaceProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [buildProgress, setBuildProgress] = useState(0);
  const [isBuilding, setIsBuilding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || 
      file.type === 'text/plain' ||
      file.name.endsWith('.js') ||
      file.name.endsWith('.tsx') ||
      file.name.endsWith('.html')
    );
    
    if (validFiles.length !== files.length) {
      toast({
        title: "Some files not supported",
        description: "Only images and text files are allowed",
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
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }
  };

  const handleSend = async () => {
    if (!message.trim() && attachments.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      attachments: [...attachments]
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setAttachments([]);
    setIsLoading(true);

    // Check if this is a build request
    const buildKeywords = ['build', 'create', 'make', 'develop', 'generate'];
    const isBuildRequest = buildKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (isBuildRequest) {
      setIsBuilding(true);
      setBuildProgress(0);

      // Simulate building process
      const buildSteps = [
        "🤖 Analyzing your request...",
        "📁 Setting up project structure...",
        "⚡ Installing dependencies...",
        "🎨 Generating UI components...",
        "🔧 Configuring build tools...",
        "🚀 Deploying your application..."
      ];

      for (let i = 0; i < buildSteps.length; i++) {
        setBuildProgress((i + 1) / buildSteps.length * 100);
        
        const systemMessage: Message = {
          id: `system-${Date.now()}-${i}`,
          role: 'system',
          content: buildSteps[i],
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, systemMessage]);
        scrollToBottom();
        
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      setIsBuilding(false);
      onStartBuilding(message);
    }

    // Simulate AI response
    try {
      const responseContent = `I understand you want to ${message.toLowerCase()}. Let me help you with that! I can create a complete application with:

• Modern React components with TypeScript
• Responsive design with Tailwind CSS  
• State management and API integration
• Database setup and configuration
• Deployment to production

Would you like me to start building this for you?`;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      };

      setMessages(prev => [...prev, assistantMessage]);

      await simulateStreaming(responseContent, (chunk) => {
        setStreamingMessage(chunk);
      });

      // Complete the streaming
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessage.id 
            ? { ...msg, content: responseContent, isStreaming: false }
            : msg
        )
      );
      setStreamingMessage('');

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Use first 3 suggestions
  const quickSuggestions = QUICK_SUGGESTIONS.slice(0, 3);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="h-full flex flex-col">
        {/* Header matching Replit design */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
              {user ? (user.displayName || user.username || 'You').slice(0, 2).toUpperCase() : 'GU'}
            </div>
            <span className="font-medium text-foreground">
              {user ? `${user.displayName || user.username || 'Your'}'s workspace` : "Guest's workspace"}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Chat Messages or Initial Interface */}
        <div className="flex-1 flex flex-col">
          {messages.length > 0 ? (
            /* Chat History */
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role !== 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                      <div className={`p-3 rounded-lg ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground ml-auto' 
                          : msg.role === 'system'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-muted'
                      }`}>
                        {msg.isStreaming ? (
                          <div>
                            {streamingMessage}
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
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-1 px-3">
                        {msg.timestamp.toLocaleTimeString()}
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
                        <span>AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          ) : (
            /* Initial Interface */
            <div className="flex-1 flex flex-col justify-center p-4 md:p-8 max-w-2xl mx-auto w-full">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-semibold mb-2 text-foreground">
                  Hi {user ? (user.displayName || user.username || 'there') : 'there'},
                </h2>
                <p className="text-xl md:text-2xl text-muted-foreground">
                  what do you want to make?
                </p>
              </div>

              {/* Quick suggestions */}
              <div className="mb-6 space-y-2">
                <p className="text-sm text-muted-foreground text-center">Try these ideas:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickSuggestions.map((suggestion, index) => (
                    <Button 
                      key={index}
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => setMessage(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Build Progress */}
          {isBuilding && (
            <div className="p-4 border-t bg-muted/50">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-orange-500 animate-pulse" />
                  <span className="text-sm font-medium">Building your application...</span>
                </div>
                <Progress value={buildProgress} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round(buildProgress)}% complete
                </div>
              </div>
            </div>
          )}

          {/* Input Section */}
          <div className="border-t p-4 bg-background">
            <div className="max-w-4xl mx-auto">
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
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Input */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={messages.length > 0 ? "Continue the conversation..." : "Describe a website or app you want to make..."}
                    className="w-full min-h-[44px] max-h-32 text-base resize-none border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                </div>
                
                <div className="flex items-end gap-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*,.txt,.js,.tsx,.html"
                    className="hidden"
                  />
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="p-2"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    onClick={handleSend}
                    disabled={(!message.trim() && attachments.length === 0) || isLoading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom navigation matching Replit mobile design */}
        <div className="border-t p-4 bg-background">
          <div className="flex justify-around max-w-sm mx-auto">
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">My Apps</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">+</span>
              </div>
              <span className="text-xs font-medium text-foreground">Create</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-muted-foreground rounded-full" />
              </div>
              <span className="text-xs text-muted-foreground">Account</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}