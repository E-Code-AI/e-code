// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, Send, Code, FileText, Terminal, Zap, Brain, 
  Sparkles, Settings, History, Copy, Download, Share,
  RotateCcw, ChevronDown, ChevronUp, Loader2, Check,
  FileCode, Play, Square, RefreshCw, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnifiedAIInterfaceProps {
  projectId: number;
  currentFile?: string;
  selectedCode?: string;
  onApplyCode?: (code: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  tokens?: number;
  effort?: number;
}

export function UnifiedAIInterface({ 
  projectId, 
  currentFile, 
  selectedCode,
  onApplyCode 
}: UnifiedAIInterfaceProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'agent' | 'assistant' | 'advanced'>('agent');
  const [model, setModel] = useState('claude-sonnet-4-20250514');
  const [autoRun, setAutoRun] = useState(true);
  const [showEffortPricing, setShowEffortPricing] = useState(false);
  const [totalEffort, setTotalEffort] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load agent prompt if available
  useEffect(() => {
    const storedPrompt = window.sessionStorage.getItem(`agent-prompt-${projectId}`);
    if (storedPrompt) {
      setInput(storedPrompt);
      window.sessionStorage.removeItem(`agent-prompt-${projectId}`);
      // Auto-send if in agent mode
      if (mode === 'agent' && storedPrompt) {
        handleSend();
      }
    }
  }, [projectId, mode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate AI response with different behaviors based on mode
      setTimeout(() => {
        const effort = Math.floor(Math.random() * 50) + 10;
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: getAIResponse(userMessage.content, mode),
          timestamp: new Date(),
          model: model,
          tokens: Math.floor(Math.random() * 1000) + 200,
          effort: mode === 'agent' ? effort : undefined
        };

        setMessages(prev => [...prev, assistantMessage]);
        setTotalEffort(prev => prev + (effort || 0));
        setIsLoading(false);

        // Show preview if mentioned
        if (userMessage.content.toLowerCase().includes('preview') || 
            userMessage.content.toLowerCase().includes('show') ||
            userMessage.content.toLowerCase().includes('display')) {
          window.postMessage({ type: 'show-preview' }, '*');
        }

        // Auto-run if enabled and in agent mode
        if (autoRun && mode === 'agent') {
          toast({
            title: "Running project",
            description: "Your changes are being applied and the project is running"
          });
        }
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive"
      });
    }
  };

  const getAIResponse = (query: string, currentMode: string): string => {
    if (currentMode === 'agent') {
      return `I'll help you build that! Let me analyze your requirements and create the implementation.

🔨 **Building your application:**
- Setting up the project structure
- Creating the necessary components
- Implementing the core functionality
- Adding responsive design
- Setting up state management

✅ **Completed tasks:**
- Created main application layout
- Implemented user interface components
- Added interactive features
- Set up routing
- Applied styling and animations

📱 **Your app is now ready!** The preview is available in the preview panel.`;
    } else if (currentMode === 'assistant') {
      if (selectedCode) {
        return `I can see you've selected some code. Here's my analysis:

**Code Review:**
- The selected code appears to be well-structured
- Consider adding error handling for edge cases
- You might want to optimize the performance by memoizing expensive computations

**Suggested improvements:**
\`\`\`typescript
// Add error boundary
try {
  ${selectedCode}
} catch (error) {
  console.error('Error:', error);
  // Handle error appropriately
}
\`\`\`

Would you like me to apply these changes?`;
      }
      return `I'm here to help with your code! I can:
- Review and improve your code
- Explain complex concepts
- Debug issues
- Suggest optimizations
- Write documentation

What would you like assistance with?`;
    } else {
      return `Using ${model} for advanced AI capabilities.

**Analysis Complete:**
- Processed your request with enhanced reasoning
- Generated optimized solution
- Applied best practices
- Considered edge cases

**Implementation Details:**
Your request has been processed using our most advanced AI model. The solution incorporates industry best practices and has been optimized for performance and maintainability.

**Next Steps:**
1. Review the generated code
2. Test the implementation
3. Deploy when ready

The implementation is complete and ready for use.`;
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Message copied to clipboard"
    });
  };

  const handleApplyCodeFromMessage = (content: string) => {
    // Extract code from message
    const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
    if (codeMatch && onApplyCode) {
      onApplyCode(codeMatch[1]);
      toast({
        title: "Code applied",
        description: "The code has been applied to your file"
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Unified AI Assistant</h2>
          <Badge variant="secondary" className="text-xs">
            Claude 4.0
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-auto">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="agent" className="text-xs">Agent</TabsTrigger>
              <TabsTrigger value="assistant" className="text-xs">Assistant</TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Settings Bar */}
      {(mode === 'advanced' || mode === 'agent') && (
        <div className="p-3 border-b bg-muted/50">
          <div className="flex items-center gap-4">
            {mode === 'advanced' && (
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-[200px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-sonnet-4-20250514">Claude 4.0 Sonnet</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                  <SelectItem value="grok-2-1212">Grok 2</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {mode === 'agent' && (
              <div className="flex items-center gap-2">
                <Switch 
                  id="auto-run" 
                  checked={autoRun}
                  onCheckedChange={setAutoRun}
                />
                <Label htmlFor="auto-run" className="text-sm">Auto-run</Label>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEffortPricing(!showEffortPricing)}
            >
              <Zap className="h-4 w-4 mr-1" />
              {totalEffort} effort
            </Button>
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {mode === 'agent' ? 'AI Agent Ready' : mode === 'assistant' ? 'AI Assistant Ready' : 'Advanced AI Ready'}
              </p>
              <p className="text-sm">
                {mode === 'agent' 
                  ? 'Describe what you want to build and I\'ll create it for you'
                  : mode === 'assistant'
                  ? 'Select code or ask questions about your project'
                  : 'Use advanced AI models for complex tasks'}
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
              <div
                className={cn(
                  "max-w-[80%] rounded-lg p-4",
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {message.role === 'assistant' && (
                      <Bot className="h-4 w-4" />
                    )}
                    <span className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    {message.model && (
                      <Badge variant="secondary" className="text-xs">
                        {message.model}
                      </Badge>
                    )}
                    {message.effort && (
                      <Badge variant="outline" className="text-xs">
                        {message.effort} effort
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopyMessage(message.content)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {message.role === 'assistant' && message.content.includes('```') && onApplyCode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleApplyCodeFromMessage(message.content)}
                      >
                        <FileCode className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">AI is thinking...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Effort Pricing Display */}
      {showEffortPricing && totalEffort > 0 && (
        <div className="p-3 border-t bg-muted/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total effort used:</span>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{totalEffort} effort points</span>
              <span className="text-muted-foreground">
                (${(totalEffort * 0.001).toFixed(3)})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        {currentFile && mode === 'assistant' && (
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>Working on: {currentFile}</span>
          </div>
        )}
        
        <div className="flex gap-2">
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
              mode === 'agent'
                ? "Describe what you want to build..."
                : mode === 'assistant'
                ? "Ask about your code or select code to analyze..."
                : "Enter your advanced query..."
            }
            className="min-h-[60px] resize-none"
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-full"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setMessages([]);
                  setTotalEffort(0);
                }}
                title="Clear chat"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}