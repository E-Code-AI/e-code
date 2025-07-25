import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, Sparkles, Code, FileText, HelpCircle,
  Lightbulb, Zap, RefreshCw, Copy, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ReplitAgentProps {
  projectId: number;
  selectedFile?: string;
  selectedCode?: string;
  className?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'code' | 'explanation' | 'suggestion' | 'error';
  metadata?: {
    language?: string;
    fileName?: string;
  };
}

const QUICK_ACTIONS = [
  { id: 'explain', label: 'Explain this', icon: HelpCircle },
  { id: 'improve', label: 'Improve code', icon: Sparkles },
  { id: 'debug', label: 'Debug error', icon: Zap },
  { id: 'generate', label: 'Generate', icon: Code }
];

export function ReplitAgent({ projectId, selectedFile, selectedCode, className }: ReplitAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      inputRef.current.style.height = Math.min(scrollHeight, 150) + 'px';
    }
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      description: "Code copied to clipboard",
      duration: 2000,
    });
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          context: {
            projectId,
            file: selectedFile,
            code: selectedCode,
            history: messages.slice(-5)
          }
        })
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();
      const assistantMessage: Message = {
        id: data.id || (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'I can help you with your code! Try asking me to explain, improve, or debug your code.',
        timestamp: new Date(data.timestamp || Date.now()),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I can help you build software faster! I can explain code, suggest improvements, help debug errors, and generate new code. What would you like help with?',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    return (
      <div key={message.id} className={cn(
        "flex gap-3 px-4 py-4",
        isUser && "bg-[var(--ecode-surface-secondary)]"
      )}>
        {!isUser && (
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
        )}
        
        <div className={cn("flex-1", isUser && "ml-10")}>
          <div className="text-sm text-[var(--ecode-text)] leading-relaxed">
            {message.content.split('```').map((part, index) => {
              if (index % 2 === 1) {
                const [lang, ...codeLines] = part.split('\n');
                const code = codeLines.join('\n');
                return (
                  <div key={index} className="my-3">
                    <div className="relative group">
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyCode(code)}
                          className="h-7 w-7 bg-[var(--ecode-surface)] hover:bg-[var(--ecode-surface-secondary)]"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <pre className="p-3 rounded-lg bg-[var(--ecode-surface)] overflow-x-auto">
                        <code className="text-xs">{code}</code>
                      </pre>
                    </div>
                  </div>
                );
              }
              return <p key={index} className={index > 0 ? "mt-2" : ""}>{part}</p>;
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-[var(--ecode-background)]", className)}>
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ecode-border)]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium text-[var(--ecode-text)]">AI Agent</span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="py-4">
          {messages.length === 0 ? (
            <div className="px-4 py-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="text-sm text-[var(--ecode-text)]">
                  Hi! I'm your AI coding assistant. I can help you:
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 ml-10">
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.id}
                    onClick={() => setInput(action.label)}
                    className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-[var(--ecode-surface-secondary)] hover:bg-[var(--ecode-surface-hover)] transition-colors text-left"
                  >
                    <action.icon className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)]" />
                    <span className="text-[var(--ecode-text)]">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(renderMessage)}
              {isTyping && (
                <div className="flex gap-3 px-4 py-4">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-[var(--ecode-text-secondary)] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-[var(--ecode-text-secondary)] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-[var(--ecode-text-secondary)] rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t border-[var(--ecode-border)]">
        <div className="relative">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your code..."
            className="min-h-[44px] max-h-[150px] pr-12 resize-none bg-[var(--ecode-surface-secondary)] border-[var(--ecode-border)] text-[var(--ecode-text)] placeholder:text-[var(--ecode-text-tertiary)]"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 bottom-2 h-8 w-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}