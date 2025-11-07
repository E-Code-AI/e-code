import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Bot, User, Send, Paperclip, FileText, 
  Loader2, CheckCircle, Clock, 
  Play, X, Settings, Sparkles, MoreHorizontal,
  Folder, Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAgentSession } from '@/../../shared/agent';
import '@/lib/agentApiClient'; // Initialize web API client

interface MobileAgentInterfaceProps {
  projectId: number;
  className?: string;
}

export function MobileAgentInterface({ projectId, className }: MobileAgentInterfaceProps) {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use shared Agent session hook
  const { state, actions } = useAgentSession({
    projectId,
    onBuildComplete: () => {
      toast({
        title: "Project built successfully!",
        description: "Your application is ready to use.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive"
      });
    }
  });

  const { messages, isLoading, isBuilding, buildProgress, currentPlan, showPlanDialog } = state;
  const { sendMessage: sendAgentMessage, approvePlan, toggleTaskSelection } = actions;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async (messageText?: string) => {
    const messageContent = messageText || input.trim();
    if (!messageContent && attachments.length === 0) return;

    await sendAgentMessage(messageContent, attachments);
    setInput('');
    setAttachments([]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files]);
      toast({
        title: "Files attached",
        description: `Added ${files.length} file(s) to your message.`,
      });
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleApprovePlan = () => {
    if (currentPlan) {
      const selectedTasks = currentPlan.tasks.filter(task => task.selected);
      toast({
        title: "Plan approved!",
        description: `Building ${selectedTasks.length} selected features.`,
      });
      approvePlan(selectedTasks);
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'file': return <FileText className="h-4 w-4" />;
      case 'folder': return <Folder className="h-4 w-4" />;
      case 'package': return <Package className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-950 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-white font-medium">E-Code Agent</h3>
            <p className="text-gray-400 text-xs">
              {isBuilding ? 'Building...' : isLoading ? 'Processing...' : 'Ready to help'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-gray-400">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-400">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-2">
        <div className="space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 mx-auto text-gray-600 mb-4" />
              <h3 className="text-white font-medium mb-2">Ready to build something amazing?</h3>
              <p className="text-gray-400 text-sm">
                Describe your project and I'll help you build it step by step.
              </p>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className="space-y-3">
              <div className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-blue-600' 
                    : 'bg-gradient-to-br from-orange-500 to-red-600'
                }`}>
                  {message.role === 'user' ? 
                    <User className="h-4 w-4 text-white" /> : 
                    <Bot className="h-4 w-4 text-white" />
                  }
                </div>
                
                <div className={`flex-1 max-w-[85%] ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white ml-auto' 
                      : 'bg-gray-800 text-gray-100'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachments.map((file: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-xs opacity-80">
                            <FileText className="h-3 w-3" />
                            <span>{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.actions.map((action, index) => (
                        <div key={index} className="bg-gray-800 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getTaskIcon(action.type)}
                              <span className="text-sm text-gray-300">
                                {action.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                            {action.completed ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : action.progress ? (
                              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                            ) : (
                              <Clock className="h-4 w-4 text-gray-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {action.path || action.package || action.data?.name || action.description}
                          </p>
                          {action.progress && action.progress > 0 && (
                            <Progress value={action.progress} className="mt-2 h-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-800 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-400">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          {isBuilding && (
            <div className="bg-blue-900/50 rounded-lg p-4 border border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-blue-300 font-medium">Building your project...</span>
              </div>
              <Progress value={buildProgress} className="h-2" />
              <p className="text-xs text-blue-400 mt-1">{buildProgress.toFixed(0)}% complete</p>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-800">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-300 truncate max-w-24">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(index)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Describe what you want to build..."
              className="w-full bg-gray-800 text-white placeholder-gray-400 rounded-2xl px-4 py-3 pr-12 resize-none max-h-32 border border-gray-700 focus:border-blue-500 focus:outline-none"
              rows={1}
              disabled={isLoading}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-2 bottom-2 h-8 w-8 p-0 text-gray-400 hover:text-white"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => sendMessage()}
            disabled={isLoading || (!input.trim() && attachments.length === 0)}
            className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
          >
            <Send className="h-5 w-5 text-white" />
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.txt,.js,.ts,.jsx,.tsx,.html,.css,.json,.md"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Plan Approval Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={() => actions.cancelPlan()}>
        <DialogContent className="max-w-md mx-auto bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              {currentPlan?.title}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {currentPlan?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            <p className="text-sm text-gray-300 font-medium">Select what to build:</p>
            {currentPlan?.tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                <Checkbox
                  checked={task.selected}
                  onCheckedChange={() => toggleTaskSelection(task.id)}
                  disabled={task.required}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getTaskIcon(task.type)}
                    <span className="text-sm font-medium">{task.title}</span>
                    {task.required && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{task.description}</p>
                  <p className="text-xs text-gray-500 mt-1">Est. {task.estimated}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => actions.cancelPlan()}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApprovePlan}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Building
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
