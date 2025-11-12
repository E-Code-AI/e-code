/**
 * Message Renderer
 * Main dispatcher for rendering different message types
 * Production-grade component matching Replit's architecture
 */

import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AgentMessage } from './types';
import { ThinkingMessage } from './ThinkingMessage';
import { TaskMessage } from './TaskMessage';
import { ActionMessage } from './ActionMessage';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MessageRendererProps {
  message: AgentMessage;
  onApproveAction?: (action: any) => void;
  onRejectAction?: (action: any) => void;
}

export function MessageRenderer({ message, onApproveAction, onRejectAction }: MessageRendererProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      description: "Code copied to clipboard",
    });
  };

  // System messages (progress, notifications)
  if (isSystem) {
    return (
      <div className="px-4 py-2" data-testid="system-message">
        <div className={cn(
          "text-xs flex items-center gap-2",
          message.type === 'progress' ? "text-[var(--ecode-accent)]" : "text-[var(--ecode-text-secondary)]"
        )}>
          {message.content}
        </div>
        {message.progress && (
          <div className="mt-2 w-full bg-[var(--ecode-surface)] rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${message.progress.percentage}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // Main message container
  return (
    <div 
      className={cn(
        "flex gap-3 px-4 py-4 border-b border-[var(--ecode-border)]",
        isUser && "bg-[var(--ecode-surface-secondary)]",
        isUser ? "agent-message-user" : "agent-message-assistant"
      )}
      data-testid={`message-${message.role}-${message.id}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--ecode-surface)] border border-[var(--ecode-border)] flex items-center justify-center">
          <User className="h-4 w-4 text-[var(--ecode-text)]" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Main text content */}
        {message.content && (
          <div className="text-sm text-[var(--ecode-text)] leading-relaxed">
            {message.content.split('```').map((part, index) => {
              if (index % 2 === 1) {
                const [lang, ...codeLines] = part.split('\n');
                const code = codeLines.join('\n');
                return (
                  <div key={index} className="my-3">
                    <div className="relative group">
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyCode(code)}
                          className="h-7 w-7 bg-[var(--ecode-surface)] hover:bg-[var(--ecode-surface-secondary)]"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="rounded-lg bg-[var(--ecode-surface)] border border-[var(--ecode-border)] overflow-hidden">
                        {lang.trim() && (
                          <div className="px-3 py-1.5 text-xs text-[var(--ecode-text-secondary)] border-b border-[var(--ecode-border)] font-mono">
                            {lang.trim()}
                          </div>
                        )}
                        <pre className="p-3 overflow-x-auto">
                          <code className="text-xs font-mono">{code}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              }
              return <p key={index} className={index > 0 ? "mt-2" : ""}>{part}</p>;
            })}
          </div>
        )}

        {/* Thinking Process */}
        {!isUser && message.thinking && message.thinking.steps.length > 0 && (
          <ThinkingMessage
            steps={message.thinking.steps}
            isStreaming={message.thinking.isStreaming}
            totalTokens={message.thinking.totalTokens}
            thinkingTime={message.thinking.thinkingTime}
          />
        )}

        {/* Tasks */}
        {!isUser && message.tasks && message.tasks.length > 0 && (
          <TaskMessage tasks={message.tasks} />
        )}

        {/* Actions */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <ActionMessage
            actions={message.actions}
            onApprove={onApproveAction}
            onReject={onRejectAction}
          />
        )}

        {/* Error Display */}
        {message.error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <div className="font-medium text-sm text-red-800 dark:text-red-200">
                Error: {message.error.message}
              </div>
            </div>
            {message.error.stack && (
              <pre className="mt-2 text-xs font-mono text-red-700 dark:text-red-300 overflow-x-auto">
                {message.error.stack}
              </pre>
            )}
            {message.error.recoverable && (
              <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                This error is recoverable. The agent can continue.
              </div>
            )}
          </div>
        )}

        {/* Metadata (Tokens, Time, Model) */}
        {!isUser && message.metadata && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--ecode-border)]">
            {message.metadata.tokensUsed !== undefined && (
              <span className="text-xs text-[var(--ecode-text-secondary)]">
                {message.metadata.tokensUsed} tokens
              </span>
            )}
            {message.metadata.executionTimeMs !== undefined && (
              <span className="text-xs text-[var(--ecode-text-secondary)]">
                {message.metadata.executionTimeMs}ms
              </span>
            )}
            {message.metadata.model && (
              <span className="text-xs text-[var(--ecode-text-secondary)] font-mono">
                {message.metadata.model}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
