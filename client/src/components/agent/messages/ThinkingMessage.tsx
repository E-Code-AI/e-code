/**
 * Thinking Message Component
 * Displays AI extended thinking process with streaming animation
 */

import { Brain, CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThinkingStep } from './types';
import { Badge } from '@/components/ui/badge';

interface ThinkingMessageProps {
  steps: ThinkingStep[];
  isStreaming: boolean;
  totalTokens?: number;
  thinkingTime?: number;
}

const STEP_TYPE_CONFIG = {
  reasoning: { icon: Brain, label: 'Reasoning', color: 'text-blue-500' },
  analysis: { icon: Brain, label: 'Analysis', color: 'text-purple-500' },
  planning: { icon: Brain, label: 'Planning', color: 'text-green-500' },
  tool_use: { icon: Brain, label: 'Tool Use', color: 'text-orange-500' },
};

export function ThinkingMessage({ steps, isStreaming, totalTokens, thinkingTime }: ThinkingMessageProps) {
  if (steps.length === 0 && !isStreaming) return null;

  return (
    <div className="p-4 rounded-lg border border-[var(--ecode-border)] bg-[var(--ecode-surface)]" data-testid="thinking-message">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10">
            <Brain className="h-4 w-4 text-violet-500" />
          </div>
          <span className="text-sm font-medium text-[var(--ecode-text)]">
            {isStreaming ? 'Thinking...' : 'Thought Process'}
          </span>
        </div>
        
        {!isStreaming && (
          <div className="flex items-center gap-2">
            {thinkingTime && (
              <Badge variant="outline" className="text-xs">
                {thinkingTime}ms
              </Badge>
            )}
            {totalTokens && (
              <Badge variant="outline" className="text-xs">
                {totalTokens} tokens
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Thinking Steps */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const config = STEP_TYPE_CONFIG[step.type];
          const Icon = config.icon;
          
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-md border transition-all",
                step.status === 'completed' && "bg-green-50 dark:bg-green-950/10 border-green-200 dark:border-green-900",
                step.status === 'active' && "bg-blue-50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900",
                step.status === 'error' && "bg-red-50 dark:bg-red-950/10 border-red-200 dark:border-red-900"
              )}
            >
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {step.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
                {step.status === 'active' && <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />}
                {step.status === 'error' && <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-xs font-medium", config.color)}>
                    {config.label}
                  </span>
                  {step.duration && (
                    <span className="text-xs text-[var(--ecode-text-secondary)]">
                      {step.duration}ms
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium text-[var(--ecode-text)] mb-1">
                  {step.title}
                </div>
                {step.content && (
                  <div className="text-xs text-[var(--ecode-text-secondary)] leading-relaxed">
                    {step.content}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Streaming Indicator */}
        {isStreaming && steps.length === 0 && (
          <div className="flex items-center gap-2 p-3">
            <Loader2 className="h-4 w-4 text-violet-500 animate-spin" />
            <span className="text-sm text-[var(--ecode-text-secondary)]">
              Processing...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
