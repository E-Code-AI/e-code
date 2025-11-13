import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import {
  Send,
  Sparkles,
  Plus,
  Loader2
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { handleSSEWarning, type SSEWarningData } from '@/lib/sse-warning-handler';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

interface ReplitAgentPanelProps {
  projectId?: string;
  className?: string;
}

export function ReplitAgentPanel({ projectId, className }: ReplitAgentPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI assistant. I can help you build, debug, and improve your code. What would you like to create or work on today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);
    setStreamingContent('');

    try {
      // Use the streaming endpoint
      const response = await apiRequest('POST', '/api/agent/chat/stream', {
        message: userMessage.content,
        projectId: projectId || 1,
        conversationId: `conv-${Date.now()}`,
        provider: 'openai',
        context: messages.slice(-5).map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };

      let fullContent = '';
      
      while (true) {
        const { done, value } = await reader!.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Handle context truncation warnings
              if (data.message && data.droppedCount !== undefined) {
                handleSSEWarning(data as SSEWarningData, {
                  toast,
                  addSystemMessage: (content: string) => {
                    const systemMessage: Message = {
                      id: `system-${Date.now()}`,
                      role: 'system',
                      content,
                      timestamp: new Date()
                    };
                    setMessages(prev => [...prev, systemMessage]);
                  }
                });
                continue;
              }
              
              if (data.content) {
                fullContent += data.content;
                setStreamingContent(fullContent);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Add the complete message
      assistantMessage.content = fullContent || "I'll help you with that. Let me analyze your request...";
      setMessages(prev => [...prev, assistantMessage]);
      setStreamingContent('');
      
    } catch (error) {
      console.error('AI chat error:', error);
      
      // Fallback response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'll help you with that. Let me analyze your request and start working on it...",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">AI</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setMessages([messages[0]])}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-3">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === 'user' && "flex-row-reverse"
              )}
            >
              {/* Avatar */}
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className={cn(
                  "text-xs",
                  message.role === 'assistant' 
                    ? "bg-status-info-soft text-status-info" 
                    : "bg-muted text-foreground"
                )}>
                  {message.role === 'assistant' ? 'AI' : 'You'}
                </AvatarFallback>
              </Avatar>

              {/* Message content */}
              <div className={cn(
                "flex-1 space-y-2",
                message.role === 'user' && "flex flex-col items-end"
              )}>
                <div className={cn(
                  "rounded-lg px-3 py-2 max-w-[85%]",
                  message.role === 'assistant'
                    ? "bg-muted text-foreground"
                    : "bg-primary text-white"
                )}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-status-info-soft text-status-info text-xs">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                {streamingContent ? (
                  <div className="bg-muted text-foreground rounded-lg px-3 py-2 max-w-[85%]">
                    <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
                    <span className="inline-block w-2 h-4 bg-status-info animate-pulse ml-1" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-status-info" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>


      {/* Input area */}
      <div className="p-4 border-t border-border">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask me anything..."
            className="pr-12 resize-none text-sm min-h-[60px]"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="absolute bottom-2 right-2 h-7 w-7 bg-primary hover:bg-primary/90 rounded"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}