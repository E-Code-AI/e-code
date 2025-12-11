import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { ThinkingDisplay, ThinkingDisplayCompact, ThinkingStep } from './ThinkingDisplay';
import { ToolExecutionList } from './ToolExecutionDisplay';
import { MessageMetadataFooter } from './MessageMetadataFooter';
import { 
  TaskMessage, 
  ActionMessage, 
  RichMessageContent,
  type Task,
  type Action
} from '@/components/agent/messages';
import type { Message } from '@/stores/agentConversationStore';

interface EnhancedChatMessageProps {
  message: Message;
  isCompactMode?: boolean;
  onCopy?: (content: string) => void;
  onRetry?: () => void;
  onApproveAction?: (action: Action) => void;
  onRejectAction?: (action: Action) => void;
}

const springConfig = {
  type: "spring" as const,
  stiffness: 500,
  damping: 30,
  mass: 1
};

const messageVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: springConfig
  },
  exit: { 
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

export const EnhancedChatMessage = memo(function EnhancedChatMessage({
  message,
  isCompactMode = false,
  onCopy,
  onRetry,
  onApproveAction,
  onRejectAction
}: EnhancedChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const handleCopy = useCallback(async () => {
    try {
      if (onCopy) {
        onCopy(message.content);
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message.content);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = message.content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  }, [message.content, onCopy]);
  
  const isUser = message.role === 'user';
  const isError = message.status === 'error' || message.metadata?.error;
  const hasThinking = message.thinking && message.thinking.length > 0;
  const hasTools = message.toolExecutions && message.toolExecutions.length > 0;
  const hasTasks = message.tasks && message.tasks.length > 0;
  const hasActions = message.actions && message.actions.length > 0;
  
  return (
    <motion.div
      layout
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        "flex gap-2 sm:gap-3 group",
        isUser && "flex-row-reverse"
      )}
      data-testid={`enhanced-message-${message.id}`}
    >
      

      <div className={cn(
        "flex-1 space-y-2 max-w-[85%] sm:max-w-[80%]",
        isUser && "flex flex-col items-end"
      )}>
        {hasThinking && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="w-full"
          >
            {isCompactMode ? (
              <ThinkingDisplayCompact
                steps={message.thinking!}
                isActive={message.isStreaming}
              />
            ) : (
              <ThinkingDisplay
                steps={message.thinking!}
                isActive={message.isStreaming}
                mode="detailed"
              />
            )}
          </motion.div>
        )}

        <motion.div 
          className={cn(
            "relative rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 transition-all duration-200",
            "min-h-[36px] sm:min-h-[44px] min-w-[36px] sm:min-w-[44px]",
            isUser
              ? cn(
                  "bg-primary text-primary-foreground",
                  "shadow-lg shadow-primary/20",
                  "rounded-br-md"
                )
              : isError
                ? cn(
                    "bg-destructive/10 text-destructive border border-destructive/20",
                    "shadow-lg shadow-destructive/10",
                    "rounded-bl-md"
                  )
                : cn(
                    "bg-card text-card-foreground border border-border",
                    "shadow-sm",
                    "rounded-bl-md"
                  ),
            "group-hover:shadow-lg transition-shadow duration-300"
          )}
          data-testid={`enhanced-message-content-${message.id}`}
          whileHover={{ scale: 1.005 }}
          transition={{ duration: 0.2 }}
        >
          {!isUser && message.content ? (
            <RichMessageContent content={message.content} />
          ) : (
            <p 
              className={cn(
                "text-sm whitespace-pre-wrap break-words leading-relaxed",
                isError && "text-destructive"
              )}
              data-testid={`enhanced-message-text-${message.id}`}
            >
              {message.content}
            </p>
          )}

          {message.isStreaming && (
            <motion.span 
              className="inline-block w-0.5 h-4 bg-current ml-1 align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}

          <AnimatePresence>
            <motion.div 
              className={cn(
                "absolute -top-2 flex gap-1",
                isUser ? "-left-2" : "-right-2",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              )}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "h-6 w-6 rounded-full shadow-sm",
                  "bg-background/95 hover:bg-background",
                  "border border-border/50"
                )}
                onClick={handleCopy}
                data-testid={`enhanced-button-copy-${message.id}`}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              
              {isError && onRetry && (
                <Button
                  variant="secondary"
                  size="icon"
                  className={cn(
                    "h-6 w-6 rounded-full shadow-sm",
                    "bg-background/95 hover:bg-background",
                    "border border-border/50"
                  )}
                  onClick={onRetry}
                  data-testid={`enhanced-button-retry-${message.id}`}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {hasTasks && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full mt-2"
            data-testid={`enhanced-tasks-${message.id}`}
          >
            <TaskMessage tasks={message.tasks!} />
          </motion.div>
        )}

        {hasActions && onApproveAction && onRejectAction && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full mt-2"
            data-testid={`enhanced-actions-${message.id}`}
          >
            <ActionMessage 
              actions={message.actions as Action[]}
              onApprove={onApproveAction}
              onReject={onRejectAction}
            />
          </motion.div>
        )}

        {hasTools && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="w-full mt-2"
            data-testid={`enhanced-tool-executions-${message.id}`}
          >
            <div 
              className="flex items-center gap-2 cursor-pointer py-1"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid={`enhanced-tools-toggle-${message.id}`}
            >
              <span className="text-xs font-medium text-muted-foreground">
                {message.toolExecutions!.length} tool execution{message.toolExecutions!.length !== 1 ? 's' : ''}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ToolExecutionList 
                    toolExecutions={message.toolExecutions!} 
                    showFilters={false}
                    compact={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {message.metadata && !isUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <MessageMetadataFooter
              metadata={message.metadata}
              messageId={message.id}
              compact={isCompactMode}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

export const StreamingSkeleton = memo(function StreamingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-2 sm:gap-3"
      data-testid="streaming-skeleton"
    >
      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 ring-1 sm:ring-2 ring-offset-1 sm:ring-offset-2 ring-offset-background ring-primary/30 shadow-md">
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
          <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2 sm:space-y-3 max-w-[85%] sm:max-w-[80%]">
        <div className="bg-muted/80 rounded-xl sm:rounded-2xl rounded-bl-md px-3 py-3 sm:px-4 sm:py-4 shadow-md border border-border/50">
          <div className="space-y-1.5 sm:space-y-2">
            <motion.div 
              className="h-2.5 sm:h-3 bg-muted-foreground/20 rounded-full w-3/4"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div 
              className="h-2.5 sm:h-3 bg-muted-foreground/20 rounded-full w-1/2"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div 
              className="h-2.5 sm:h-3 bg-muted-foreground/20 rounded-full w-2/3"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export const TypingIndicator = memo(function TypingIndicator({ text = "Thinking" }: { text?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3"
      data-testid="typing-indicator"
    >
      <Avatar className="h-9 w-9 ring-2 ring-offset-2 ring-offset-background ring-primary/30 shadow-lg">
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
          <Sparkles className="h-4 w-4 animate-pulse" />
        </AvatarFallback>
      </Avatar>
      
      <div className="bg-muted/80 rounded-2xl rounded-bl-md px-4 py-3 shadow-md border border-border/50 flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{text}</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ 
                y: [0, -4, 0],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
});

export const EmptyConversation = memo(function EmptyConversation({ 
  onQuickAction 
}: { 
  onQuickAction?: (prompt: string) => void 
}) {
  const quickActions = [
    { label: "Build Dashboard", prompt: "Build a full-stack dashboard with real-time charts, data tables with sorting/filtering, user authentication, and dark mode support", icon: "📊" },
    { label: "Add Payments", prompt: "Add Stripe payment integration with subscription billing, usage tracking, and customer portal", icon: "💳" },
    { label: "Add Auth", prompt: "Implement user authentication with email/password, social login (Google, GitHub), session management, and protected routes", icon: "🔐" },
    { label: "Debug & Optimize", prompt: "Debug and fix all TypeScript errors, optimize performance bottlenecks, and add proper error handling throughout the codebase", icon: "🔧" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4"
      data-testid="empty-conversation"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={springConfig}
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-lg"
      >
        <Sparkles className="h-8 w-8 text-primary" />
      </motion.div>
      
      <h3 className="text-lg font-semibold mb-2">How can I help you today?</h3>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
        I can help you build, debug, and improve your code with transparent reasoning.
      </p>
      
      {onQuickAction && (
        <div className="grid grid-cols-2 gap-2 w-full max-w-md">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onQuickAction(action.prompt)}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl",
                "bg-muted/50 hover:bg-muted border border-border/50",
                "transition-all duration-200 hover:shadow-md",
                "text-left min-h-[44px]"
              )}
              data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span className="text-lg">{action.icon}</span>
              <span className="text-sm font-medium">{action.label}</span>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
});

export const ConversationSyncIndicator = memo(function ConversationSyncIndicator({
  isSyncing,
  lastSyncedAt,
  hasUnsyncedChanges
}: {
  isSyncing?: boolean;
  lastSyncedAt?: number;
  hasUnsyncedChanges?: boolean;
}) {
  if (!isSyncing && !hasUnsyncedChanges && !lastSyncedAt) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "flex items-center justify-center gap-2 py-1.5 px-3 text-xs",
        "bg-muted/50 border-b border-border/50"
      )}
      data-testid="sync-indicator"
    >
      {isSyncing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-muted-foreground">Syncing conversation...</span>
        </>
      ) : hasUnsyncedChanges ? (
        <>
          <AlertCircle className="h-3 w-3 text-yellow-500" />
          <span className="text-muted-foreground">Unsaved changes</span>
        </>
      ) : lastSyncedAt ? (
        <>
          <Check className="h-3 w-3 text-green-500" />
          <span className="text-muted-foreground">
            Saved {new Date(lastSyncedAt).toLocaleTimeString()}
          </span>
        </>
      ) : null}
    </motion.div>
  );
});

export default EnhancedChatMessage;
