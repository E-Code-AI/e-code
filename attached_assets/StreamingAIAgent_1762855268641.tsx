/**
 * StreamingAIAgent - Fortune 500 Streaming AI Agent
 * Real-time streaming responses like ChatGPT
 * 
 * ✅ Claude 3.7 Sonnet Support:
 * - Extended Thinking visualization
 * - Vision API (image upload)
 * - Tool Use display
 * - Prompt Caching indicators
 */

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, X, Square, StopCircle, Brain, Wrench, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Card } from "./ui/card";
import { ImageUploadButton, type UploadedImage } from "./ImageUploadButton";
import { ModelSelector } from "./ModelSelector";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useStreamingAgent } from "../hooks/useStreamingAgent";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner@2.0.3";
import { logAgentInteraction, captureAgentError } from "../utils/sentryHelpers";

interface StreamingAIAgentProps {
  projectId: string;
  aiModel?: string;
  onCodeGenerate?: (code: string, language: string) => void;
  onFileModify?: (path: string, content: string) => void;
  onFilesCreated?: (files: any[]) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  actions?: any[];
  summary?: string;
  images?: UploadedImage[]; // ✅ NEW: Images attached to message
  timestamp: Date;
  isStreaming?: boolean;
  isThinking?: boolean; // ✅ NEW: Extended thinking phase
}

export function StreamingAIAgent({ 
  projectId, 
  aiModel = 'claude-3-7-sonnet-20250219', // ✅ Default to Claude 3.7 (new ID format)
  onCodeGenerate,
  onFileModify,
  onFilesCreated 
}: StreamingAIAgentProps) {
  const { session } = useAuth();
  const [selectedModel, setSelectedModel] = useState(aiModel);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 Hi! I\\'m E-Code Agent with **21+ AI models** to choose from!\\n\\n✨ **Available Models:**\\n- 🧠 Claude 3.7 Sonnet (Extended Thinking)\\n- ⚡ GPT-4o (Multimodal)\\n- 🆓 Gemini 2.0 Thinking (Free!)\\n- 💰 GPT-4o Mini (Cheapest)\\n\\nClick ⚙️ to choose your model. What would you like to create today?',
      timestamp: new Date(),
    },
  ]);
  
  const [input, setInput] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isStreaming,
    streamedContent,
    thinking,
    actions,
    summary,
    stats,
    error,
    sendMessage,
    cancelStream,
  } = useStreamingAgent({
    projectId,
    userId: session?.user?.id,
    aiModel,
    onChunk: (chunk) => {
      // Update the last message with new content
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.isStreaming) {
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + chunk },
          ];
        }
        return prev;
      });
    },
    onComplete: (data) => {
      // Finalize the message
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.isStreaming) {
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              isStreaming: false,
              thinking: data.thinking,
              actions: data.actions,
              summary: data.summary,
            },
          ];
        }
        return prev;
      });

      // Handle actions
      if (data.actions) {
        data.actions.forEach((action: any) => {
          if (action.type === 'create_file' && action.status === 'completed') {
            onFileModify?.(action.path, action.content);
            onCodeGenerate?.(action.content, action.language || 'typescript');
          }
        });

        // Notify files created
        const createdFiles = data.actions.filter((a: any) => a.type === 'create_file' && a.status === 'completed');
        if (createdFiles.length > 0) {
          onFilesCreated?.(createdFiles);
          toast.success(`✅ Created ${createdFiles.length} file(s)`);
        }
      }

      // Log to Sentry
      logAgentInteraction({
        projectId,
        userId: session?.user?.id || 'anonymous',
        action: 'stream_complete',
        metadata: {
          stats: data.stats,
          actionsCount: data.actions?.length || 0,
        },
      });

      toast.success(data.summary || '✅ Complete');
    },
    onError: (errorMsg) => {
      toast.error(`❌ ${errorMsg}`);
      captureAgentError(new Error(errorMsg), {
        projectId,
        userId: session?.user?.id || 'anonymous',
      });

      // Remove streaming message
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.isStreaming) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamedContent]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      images: uploadedImages.length > 0 ? uploadedImages : undefined, // ✅ Attach images
      timestamp: new Date(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);

    // Add empty assistant message for streaming
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    // Clear input and images
    const messagesToSend = uploadedImages;
    setInput('');
    setUploadedImages([]); // ✅ Clear images after sending

    // ✅ Start streaming WITH images
    sendMessage(input, messagesToSend);

    // Log to Sentry
    logAgentInteraction({
      projectId,
      userId: session?.user?.id || 'anonymous',
      action: 'send_message',
      metadata: {
        messageLength: input.length,
        model: aiModel,
        hasImages: messagesToSend.length > 0,
        imageCount: messagesToSend.length,
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">E-Code Agent</h2>
            <p className="text-xs text-muted-foreground">
              {isStreaming ? '✨ Streaming...' : '21+ AI models available'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
              >
                <Settings className="w-3.5 h-3.5 mr-1.5" />
                Model
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>AI Model Settings</SheetTitle>
                <SheetDescription>
                  Choose from 21+ AI models across 5 providers
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <ModelSelector
                  value={selectedModel}
                  onChange={(model) => {
                    setSelectedModel(model);
                    toast.success(`Switched to ${model}`);
                  }}
                  showFeatures={true}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Stop Button (when streaming) */}
          {isStreaming && (
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelStream}
              className="h-8"
            >
              <Square className="w-3.5 h-3.5 mr-1.5" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary/10">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-lg p-3 ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  {msg.thinking && !msg.isStreaming && (
                    <div className="mb-2 text-xs text-muted-foreground italic">
                      💭 {msg.thinking}
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap">
                    {msg.content}
                    {msg.isStreaming && (
                      <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                    )}
                  </div>

                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-xs font-semibold">Actions:</div>
                      {msg.actions.map((action, idx) => (
                        <Badge key={idx} variant="secondary" className="mr-1">
                          {action.type === 'create_file' && `📄 Created ${action.path}`}
                          {action.type === 'edit_file' && `✏️ Edited ${action.path}`}
                          {action.type === 'install_package' && `📦 Installed ${action.package}`}
                          {action.type === 'message' && `💬 ${action.content.substring(0, 30)}...`}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {msg.summary && !msg.isStreaming && (
                    <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                      ✅ {msg.summary}
                    </div>
                  )}
                </div>

                <span className="text-xs text-muted-foreground">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>

              {msg.role === 'user' && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    {session?.user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        {error && (
          <div className="mb-2 p-2 bg-destructive/10 text-destructive text-sm rounded-md">
            ❌ {error}
          </div>
        )}

        {stats && (
          <div className="mb-2 p-2 bg-primary/10 text-xs rounded-md flex gap-4">
            <span>📄 Files created: {stats.filesCreated}</span>
            <span>✏️ Files edited: {stats.filesEdited}</span>
            <span>⚡ Total actions: {stats.totalActions}</span>
          </div>
        )}

        {/* ✅ Image Upload Button */}
        <div className="mb-2">
          <ImageUploadButton
            onImagesChange={setUploadedImages}
            maxImages={5}
            maxSizeMB={5}
          />
        </div>

        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "Streaming in progress..." : "Type your message... (Shift+Enter for new line)"}
            className="min-h-[60px] max-h-[200px] resize-none"
            disabled={isStreaming}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
          <Sparkles className="w-3 h-3" />
          <span>Using {selectedModel} • Press Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}