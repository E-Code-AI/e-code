// @ts-nocheck
import type { Action } from '@/components/agent/messages';
import { LazyAnimatePresence } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { AutonomousBuildMode,Message } from '@/stores/agentConversationStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Bot,Loader2,Radio } from 'lucide-react';
import { forwardRef,memo,useCallback,useEffect,useMemo,useRef } from 'react';
import { EnhancedChatMessage,StreamingSkeleton } from './EnhancedChatMessage';
import { RichMessageContent } from '@/components/agent/messages';

interface VirtualizedMessageListProps {
  messages: Message[];
  isCompactMode?: boolean;
  isPendingResponse?: boolean;
  streamingContent?: string;
  onCopy?: (content: string) => void;
  onRetry?: () => void;
  onApproveAction?: (action: Action) => void;
  onRejectAction?: (action: Action) => void;
  onSelectBuildMode?: (mode: AutonomousBuildMode) => void;
  onChangePlan?: () => void;
  onFileClick?: (filePath: string) => void;
  onRefreshPreview?: () => void;
  onOpenPreviewExternal?: () => void;
  onRestoreCheckpoint?: (checkpointId: number) => void;
  isRestoringCheckpoint?: boolean;
  className?: string;
  autoScrollToBottom?: boolean;
}

const ESTIMATED_MESSAGE_HEIGHT = 120;
const OVERSCAN_COUNT = 5;

export const VirtualizedMessageList = memo(forwardRef<HTMLDivElement, VirtualizedMessageListProps>(
  function VirtualizedMessageList({
    messages,
    isCompactMode = false,
    isPendingResponse = false,
    streamingContent = '',
    onCopy,
    onRetry,
    onApproveAction,
    onRejectAction,
    onSelectBuildMode,
    onChangePlan,
    onFileClick,
    onRefreshPreview,
    onOpenPreviewExternal,
    onRestoreCheckpoint,
    isRestoringCheckpoint,
    className,
    autoScrollToBottom = true,
  }, _ref) {
    const parentRef = useRef<HTMLDivElement>(null);
    const lastMessageRef = useRef<string | null>(null);
    const isUserScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const allItems = useMemo(() => {
      const items = [...messages];
      if (isPendingResponse) {
        items.push({
          id: 'pending-skeleton',
          role: 'assistant' as const,
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        });
      }
      return items;
    }, [messages, isPendingResponse]);

    const virtualizer = useVirtualizer({
      count: allItems.length,
      getScrollElement: () => parentRef.current,
      estimateSize: useCallback(() => ESTIMATED_MESSAGE_HEIGHT, []),
      overscan: OVERSCAN_COUNT,
      paddingStart: 16,
      paddingEnd: 16,
    });

    const handleScroll = useCallback(() => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      const parent = parentRef.current;
      if (!parent) return;

      const isNearBottom = parent.scrollHeight - parent.scrollTop - parent.clientHeight < 100;
      isUserScrollingRef.current = !isNearBottom;

      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 150);
    }, []);

    useEffect(() => {
      const lastMessage = messages[messages.length - 1];
      const lastMessageId = lastMessage?.id;
      
      if (
        autoScrollToBottom && 
        !isUserScrollingRef.current && 
        lastMessageId && 
        lastMessageId !== lastMessageRef.current
      ) {
        virtualizer.scrollToIndex(allItems.length - 1, {
          align: 'end',
          behavior: 'smooth',
        });
        lastMessageRef.current = lastMessageId;
      }
    }, [allItems.length, autoScrollToBottom, messages, virtualizer]);

    useEffect(() => {
      if (isPendingResponse && autoScrollToBottom && !isUserScrollingRef.current) {
        virtualizer.scrollToIndex(allItems.length - 1, {
          align: 'end',
          behavior: 'smooth',
        });
      }
    }, [isPendingResponse, allItems.length, autoScrollToBottom, virtualizer]);

    useEffect(() => {
      return () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, []);

    const virtualItems = virtualizer.getVirtualItems();

    return (
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden",
          "scroll-smooth scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent",
          className
        )}
        style={{ contain: 'strict' }}
        data-testid="virtualized-message-list"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <LazyAnimatePresence mode="popLayout">
            {virtualItems.map((virtualItem) => {
              const message = allItems[virtualItem.index];
              const isPendingSkeleton = message.id === 'pending-skeleton';

              return (
                <div
                  key={message.id}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  {isPendingSkeleton ? (
                    <StreamingSkeleton />
                  ) : (
                    <EnhancedChatMessage
                      message={message}
                      isCompactMode={isCompactMode}
                      onCopy={onCopy}
                      onRetry={onRetry}
                      onApproveAction={onApproveAction}
                      onRejectAction={onRejectAction}
                      onSelectBuildMode={onSelectBuildMode}
                      onChangePlan={onChangePlan}
                      onFileClick={onFileClick}
                      onRefreshPreview={onRefreshPreview}
                      onOpenPreviewExternal={onOpenPreviewExternal}
                      onRestoreCheckpoint={onRestoreCheckpoint}
                      isRestoringCheckpoint={isRestoringCheckpoint}
                    />
                  )}
                </div>
              );
            })}
          </LazyAnimatePresence>
        </div>
        
        {streamingContent && (
          <div className="px-4 py-3 border-t border-border/50 bg-background/95" data-testid="streaming-content-overlay">
            <StreamingAgentWallMessage content={streamingContent} />
          </div>
        )}
      </div>
    );
  }
));

export interface StreamingAgentWallMessageProps {
  content: string;
  className?: string;
}

export const StreamingAgentWallMessage = memo(function StreamingAgentWallMessage({
  content,
  className,
}: StreamingAgentWallMessageProps) {
  return (
    <div
      className={cn("flex gap-3", className)}
      data-testid="agent-wall-streaming-message"
    >
      <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
        <Bot className="h-4 w-4" />
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full border border-background bg-emerald-500" />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <Radio className="h-3 w-3 text-emerald-500" />
            Agent stream
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Live SSE
          </span>
        </div>

        <div className="max-w-[95%] rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm">
          {content.trim() ? (
            <div className="relative text-[13px] leading-relaxed">
              <RichMessageContent content={content} />
              <span
                className="ml-1 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-primary"
                aria-hidden="true"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Waiting for the first token...
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export interface StreamingTextProps {
  content: string;
  isComplete?: boolean;
  className?: string;
  typingSpeed?: number;
}

export const StreamingText = memo(function StreamingText({
  content,
  isComplete = false,
  className,
  typingSpeed: _typingSpeed = 20,
}: StreamingTextProps) {
  const displayedRef = useRef<string>('');
  const indexRef = useRef(0);
  const containerRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isComplete) {
      displayedRef.current = content;
      if (containerRef.current) {
        containerRef.current.textContent = content;
      }
      return;
    }

    const targetLength = content.length;
    
    const animate = () => {
      if (indexRef.current < targetLength) {
        const charsToAdd = Math.min(3, targetLength - indexRef.current);
        displayedRef.current = content.slice(0, indexRef.current + charsToAdd);
        indexRef.current += charsToAdd;
        
        if (containerRef.current) {
          containerRef.current.textContent = displayedRef.current;
        }
        
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [content, isComplete]);

  useEffect(() => {
    if (content.length < displayedRef.current.length) {
      displayedRef.current = '';
      indexRef.current = 0;
    }
  }, [content]);

  return (
    <span 
      ref={containerRef} 
      className={cn("whitespace-pre-wrap", className)}
      data-testid="streaming-text"
    >
      {displayedRef.current || content.slice(0, indexRef.current)}
    </span>
  );
});

export function useOptimisticMessages(
  messages: Message[],
  setMessages: (updater: Message[] | ((prev: Message[]) => Message[])) => void
) {
  const pendingMessagesRef = useRef<Map<string, Message>>(new Map());

  const addOptimisticMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'> & { id?: string }) => {
    const optimisticId = message.id || `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      ...message,
      id: optimisticId,
      timestamp: new Date(),
      status: 'pending' as const,
    } as Message;

    pendingMessagesRef.current.set(optimisticId, optimisticMessage);
    setMessages(prev => [...prev, optimisticMessage]);

    return {
      id: optimisticId,
      confirm: (confirmedMessage?: Partial<Message>) => {
        pendingMessagesRef.current.delete(optimisticId);
        setMessages(prev => prev.map(m => 
          m.id === optimisticId 
            ? { ...m, ...confirmedMessage, status: 'sent' as const }
            : m
        ));
      },
      rollback: (error?: string) => {
        pendingMessagesRef.current.delete(optimisticId);
        setMessages(prev => prev.map(m =>
          m.id === optimisticId
            ? { ...m, status: 'error' as const, error }
            : m
        ));
      },
      remove: () => {
        pendingMessagesRef.current.delete(optimisticId);
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
      },
    };
  }, [setMessages]);

  const getPendingCount = useCallback(() => {
    return pendingMessagesRef.current.size;
  }, []);

  return {
    addOptimisticMessage,
    getPendingCount,
    hasPendingMessages: pendingMessagesRef.current.size > 0,
  };
}

export function useDebouncedStreamingContent(initialContent: string = '', _delay: number = 50) {
  const contentRef = useRef(initialContent);
  const displayedRef = useRef(initialContent);
  const frameRef = useRef<number | null>(null);
  const setDisplayedContent = useRef<((content: string) => void) | null>(null);

  const updateContent = useCallback((newContent: string) => {
    contentRef.current = newContent;
    
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      displayedRef.current = contentRef.current;
      if (setDisplayedContent.current) {
        setDisplayedContent.current(displayedRef.current);
      }
    });
  }, []);

  const getDisplayedContent = useCallback(() => {
    return displayedRef.current;
  }, []);

  const setCallback = useCallback((callback: (content: string) => void) => {
    setDisplayedContent.current = callback;
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return {
    updateContent,
    getDisplayedContent,
    setCallback,
  };
}
