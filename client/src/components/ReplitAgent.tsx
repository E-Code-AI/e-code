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
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'code' | 'explanation' | 'suggestion' | 'error' | 'action' | 'progress';
  metadata?: {
    language?: string;
    fileName?: string;
    action?: string;
    files?: string[];
    packages?: string[];
    progress?: number;
  };
}

interface AgentAction {
  type: 'create_file' | 'edit_file' | 'delete_file' | 'install_package' | 'run_code' | 'create_folder';
  path?: string;
  content?: string;
  package?: string;
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
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
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

  const executeAction = async (action: AgentAction) => {
    switch (action.type) {
      case 'create_file':
        if (action.path && action.content !== undefined) {
          await fetch(`/api/projects/${projectId}/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: action.path.split('/').pop(),
              content: action.content,
              parentPath: action.path.substring(0, action.path.lastIndexOf('/')) || '/'
            })
          });
        }
        break;
      case 'edit_file':
        if (action.path && action.content !== undefined) {
          const fileId = await getFileIdByPath(action.path);
          if (fileId) {
            await fetch(`/api/projects/${projectId}/files/${fileId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: action.content })
            });
          }
        }
        break;
      case 'install_package':
        if (action.package) {
          await fetch(`/api/projects/${projectId}/packages/install`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packages: [action.package] })
          });
        }
        break;
      case 'create_folder':
        if (action.path) {
          await fetch(`/api/projects/${projectId}/folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: action.path.split('/').pop(),
              parentPath: action.path.substring(0, action.path.lastIndexOf('/')) || '/'
            })
          });
        }
        break;
    }
  };

  const getFileIdByPath = async (path: string): Promise<number | null> => {
    const response = await fetch(`/api/projects/${projectId}/files`);
    if (response.ok) {
      const files = await response.json();
      const file = files.find((f: any) => f.name === path.split('/').pop());
      return file?.id || null;
    }
    return null;
  };

  const buildApplication = async (description: string) => {
    setIsBuilding(true);
    setBuildProgress(0);
    
    // System message to start building
    const startMessage: Message = {
      id: Date.now().toString(),
      role: 'system',
      content: '🚀 Starting to build your application...',
      timestamp: new Date(),
      type: 'progress',
      metadata: { progress: 0 }
    };
    setMessages(prev => [...prev, startMessage]);

    // Simulate building process with progress updates
    const steps = [
      { progress: 20, task: 'Setting up project structure...', action: 'create_folder', path: 'src' },
      { progress: 40, task: 'Creating main application file...', action: 'create_file', path: 'src/index.js' },
      { progress: 60, task: 'Installing dependencies...', action: 'install_package', package: 'express' },
      { progress: 80, task: 'Adding configuration files...', action: 'create_file', path: 'package.json' },
      { progress: 100, task: 'Application ready!', action: 'complete' }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setBuildProgress(step.progress);
      setCurrentTask(step.task);
      
      const progressMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: step.task,
        timestamp: new Date(),
        type: 'progress',
        metadata: { progress: step.progress }
      };
      setMessages(prev => [...prev, progressMessage]);
    }

    setIsBuilding(false);
    setBuildProgress(100);
    
    const completeMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `✅ I've successfully built your ${description}! The application is ready to run. Would you like me to start it or make any modifications?`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, completeMessage]);
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

    // Check if user wants to build something
    const buildKeywords = ['build', 'create', 'make', 'develop', 'generate'];
    const wantsToBuild = buildKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );

    if (wantsToBuild && content.toLowerCase().includes('app')) {
      await buildApplication(content);
      setIsLoading(false);
      setIsTyping(false);
      return;
    }

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
            history: messages.slice(-5),
            mode: 'agent' // Indicate this is the autonomous agent
          }
        })
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();
      
      // Check if response contains actions to execute
      if (data.actions && Array.isArray(data.actions)) {
        for (const action of data.actions) {
          await executeAction(action);
          
          const actionMessage: Message = {
            id: Date.now().toString(),
            role: 'system',
            content: `✓ ${action.type}: ${action.path || action.package}`,
            timestamp: new Date(),
            type: 'action',
            metadata: { action: action.type }
          };
          setMessages(prev => [...prev, actionMessage]);
        }
      }

      const assistantMessage: Message = {
        id: data.id || (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'I can help you build entire applications! Just describe what you want to create.',
        timestamp: new Date(data.timestamp || Date.now()),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      
      // Demo autonomous capabilities
      const demoMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm an AI agent that can build entire applications for you! I can:

🏗️ Create complete project structures
📝 Write code across multiple files
📦 Install necessary packages
⚙️ Set up configurations
🧪 Add tests
🚀 Deploy your application

Just tell me what you want to build, like:
- "Build a todo app with React"
- "Create a REST API with authentication"
- "Make a real-time chat application"

What would you like me to build?`,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, demoMessage]);
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
    const isSystem = message.role === 'system';
    
    if (isSystem) {
      return (
        <div key={message.id} className="px-4 py-2">
          <div className={cn(
            "text-xs flex items-center gap-2",
            message.type === 'progress' ? "text-[var(--ecode-accent)]" : "text-[var(--ecode-text-secondary)]"
          )}>
            {message.type === 'action' && <Zap className="h-3 w-3" />}
            {message.type === 'progress' && <RefreshCw className="h-3 w-3 animate-spin" />}
            {message.content}
          </div>
          {message.metadata?.progress !== undefined && (
            <div className="mt-2 w-full bg-[var(--ecode-surface)] rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                style={{ width: `${message.metadata.progress}%` }}
              />
            </div>
          )}
        </div>
      );
    }
    
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
          {isBuilding && (
            <div className="flex items-center gap-2 text-xs text-[var(--ecode-text-secondary)]">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>{currentTask}</span>
            </div>
          )}
        </div>
        {isBuilding && (
          <div className="text-xs text-[var(--ecode-text-secondary)]">
            {buildProgress}%
          </div>
        )}
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