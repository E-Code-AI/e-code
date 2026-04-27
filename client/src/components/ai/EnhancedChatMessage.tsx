import {
ActionMessage,
RichMessageContent,
TaskMessage,
type Action,
type Task
} from '@/components/agent/messages';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible,CollapsibleContent,CollapsibleTrigger } from '@/components/ui/collapsible';
import { LazyAnimatePresence,LazyMotionButton,LazyMotionDiv,LazyMotionSpan } from '@/lib/motion';
import { containsPlanOrTasks,extractAndFormatTasks } from '@/lib/task-extractor';
import { cn } from '@/lib/utils';
import type { AutonomousBuildMode,Message } from '@/stores/agentConversationStore';
import { formatDistanceToNow } from 'date-fns';
import {
AlertCircle,
Check,
ChevronDown,
ChevronUp,
Clock3,
Copy,
FileCode,
Loader2,
MessageSquareText,
PanelsTopLeft,
Receipt,
RotateCcw,
Search,
Sparkles,
Terminal,
UserRound,
Wrench
} from 'lucide-react';
import { forwardRef,memo,useCallback,useMemo,useState } from 'react';
import { CheckpointCard } from './CheckpointCard';
import {
InlineAgentAction,
InlineAppType,
InlineBuildOptions,
InlineBuildProgressCard,
InlineCheckpoint,
InlineCodeBlock,
InlineCompleteIndicator,
InlineDependencyInstall,
InlineErrorIndicator,
InlineFileOperation,
InlinePlanCard,
InlinePreviewWindow,
InlineProgressTimeline,
InlineSearchIndicator,
InlineTaskListEnhanced,
InlineTerminalOutput,
InlineThinkingStep,
InlineWorkingIndicator,
type BuildMode,
type FileOperationType
} from './InlineBuildProgress';
import { MessageMetadataFooter } from './MessageMetadataFooter';
import { ThinkingDisplay,ThinkingDisplayCompact } from './ThinkingDisplay';
import { ToolExecutionList } from './ToolExecutionDisplay';

interface EnhancedChatMessageProps {
  message: Message;
  isCompactMode?: boolean;
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
}

type EnhancedChatMessageRef = HTMLDivElement;

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

function formatRelativeTimestamp(timestamp: Date | string | undefined) {
  if (!timestamp) return '';
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return '';
  }
}

function formatWorkedDuration(totalMs: number) {
  const safeMs = Math.max(0, Math.round(totalMs));
  const totalSeconds = Math.floor(safeMs / 1000);
  if (totalSeconds === 0) {
    return 'under a second';
  }
  if (totalSeconds < 60) {
    return `${totalSeconds} second${totalSeconds === 1 ? '' : 's'}`;
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (totalMinutes < 60) {
    return remainingSeconds > 0
      ? `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'} ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'}`
      : `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
  }
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return remainingMinutes > 0
    ? `${totalHours} hour${totalHours === 1 ? '' : 's'} ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`
    : `${totalHours} hour${totalHours === 1 ? '' : 's'}`;
}

export const EnhancedChatMessage = memo(forwardRef<EnhancedChatMessageRef, EnhancedChatMessageProps>(function EnhancedChatMessage({
  message,
  isCompactMode = false,
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
  isRestoringCheckpoint
}, ref) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMessageExpanded, setIsMessageExpanded] = useState(false);
  const [isWorkSummaryExpanded, setIsWorkSummaryExpanded] = useState(false);
  const [isUsageExpanded, setIsUsageExpanded] = useState(false);
  const [selectedBuildMode, setSelectedBuildMode] = useState<AutonomousBuildMode | null>(null);
  
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

  const handleSelectBuildMode = useCallback((mode: BuildMode) => {
    setSelectedBuildMode(mode as AutonomousBuildMode);
    onSelectBuildMode?.(mode as AutonomousBuildMode);
  }, [onSelectBuildMode]);
  
  const isUser = message.role === 'user';
  const isError = message.status === 'error' || message.metadata?.error;
  const hasThinking = message.thinking && message.thinking.length > 0;
  const hasTools = message.toolExecutions && message.toolExecutions.length > 0;
  const hasStructuredTasks = message.tasks && message.tasks.length > 0;
  const hasActions = message.actions && message.actions.length > 0;
  const isAutonomousMessage = message.type?.startsWith('autonomous_');
  const autonomousPayload = message.autonomousPayload;
  const rendersDedicatedAutonomousBody =
    message.type === 'autonomous_working' ||
    message.type === 'autonomous_search' ||
    message.type === 'autonomous_plan' ||
    message.type === 'autonomous_build_options' ||
    message.type === 'autonomous_progress' ||
    message.type === 'autonomous_complete' ||
    message.type === 'autonomous_error' ||
    message.type === 'autonomous_file_operation' ||
    message.type === 'autonomous_terminal' ||
    message.type === 'autonomous_code' ||
    message.type === 'autonomous_dependencies' ||
    message.type === 'autonomous_action' ||
    message.type === 'autonomous_thinking' ||
    message.type === 'autonomous_timeline' ||
    message.type === 'autonomous_checkpoint' ||
    message.type === 'autonomous_task_list' ||
    message.type === 'autonomous_preview';
  
  // Extract tasks from message content when no structured tasks exist (Replit-like task extraction)
  const extractedTasks = useMemo(() => {
    // Only extract from assistant messages that look like plans
    if (isUser || hasStructuredTasks || isAutonomousMessage) return [];
    if (!message.content || message.content.length < 50) return [];
    if (!containsPlanOrTasks(message.content)) return [];
    
    const isComplete = (message.status as string) === 'complete' || message.status === 'sent';
    const tasks = extractAndFormatTasks(message.content, isComplete);
    
    // Only return if we found meaningful tasks (at least 2)
    return tasks.length >= 2 ? tasks : [];
  }, [message.content, message.status, isUser, hasStructuredTasks, isAutonomousMessage]);
  
  const hasTasks = hasStructuredTasks || extractedTasks.length > 0;
  const displayTasks = hasStructuredTasks ? message.tasks : extractedTasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status
  })) as Task[];

  const relativeTimestamp = useMemo(() => formatRelativeTimestamp(message.timestamp), [message.timestamp]);

  const messageStructureSummary = useMemo(() => {
    const toolExecutions = message.toolExecutions || [];
    const thinkingSteps = message.thinking || [];
    const structuredTasks = displayTasks || [];
    const actions = message.actions || [];
    const autonomousTimelineEvents = message.autonomousPayload?.timeline?.events || [];
    const autonomousTaskItems = message.autonomousPayload?.taskList?.items || [];
    const autonomousThinkingSteps = message.autonomousPayload?.thinkingSteps || [];

    const messageCount =
      (message.content?.trim() ? 1 : 0) +
      thinkingSteps.length +
      structuredTasks.length +
      actions.length +
      autonomousTimelineEvents.length +
      autonomousTaskItems.length +
      autonomousThinkingSteps.length;

    return {
      actions: toolExecutions.length,
      messages: messageCount,
      tasks: structuredTasks.length,
      steps: thinkingSteps.length + autonomousThinkingSteps.length,
    };
  }, [displayTasks, message.actions, message.autonomousPayload, message.content, message.thinking, message.toolExecutions]);

  const workSummary = useMemo(() => {
    const toolExecutions = message.toolExecutions || [];
    const executionMs = toolExecutions.reduce((total, execution) => total + (execution.metadata?.executionTime || 0), 0);
    const thinkingMs = (message.thinking || []).reduce((total, step) => total + (step.duration || 0), 0);
    const streamingMs = message.metadata?.streamingDuration || 0;
    const totalMs = executionMs + thinkingMs + streamingMs;
    const resolvedMs = totalMs > 0 ? totalMs : ((message.metadata?.latency || 0) > 0 ? (message.metadata?.latency || 0) : 0);
    const workDone = messageStructureSummary.actions || messageStructureSummary.messages;
    const usageCategory = message.metadata?.usageCategory || 'General work';
    const billedLabel = message.metadata?.billedLabel || message.metadata?.cost || 'Included';
    const promoLine = message.metadata?.promoText
      || (message.metadata?.promoMode && message.metadata?.promoDiscountPercent
        ? `Promo: ${message.metadata.promoMode} mode at up to ${message.metadata.promoDiscountPercent}% off`
        : null);

    return {
      totalMs: resolvedMs,
      workedLabel: formatWorkedDuration(resolvedMs),
      workDone,
      usageCategory,
      billedLabel,
      promoLine,
    };
  }, [message.metadata, message.thinking, message.toolExecutions, messageStructureSummary]);

  const shouldCollapseMessageBody = useMemo(() => {
    if (isUser) return false;
    if (isAutonomousMessage) return false;
    const longContent = (message.content?.length || 0) > 700 || (message.content?.split('\n').length || 0) > 12;
    const densePayload = (message.toolExecutions?.length || 0) >= 4 || (message.thinking?.length || 0) >= 5 || messageStructureSummary.messages >= 8;
    return longContent || densePayload;
  }, [isAutonomousMessage, isUser, message.content, message.thinking, message.toolExecutions, messageStructureSummary.messages]);

  const collapsedPreview = useMemo(() => {
    const trimmed = (message.content || '').replace(/\s+/g, ' ').trim();
    if (!trimmed) return '';
    return trimmed.length > 180 ? `${trimmed.slice(0, 180)}...` : trimmed;
  }, [message.content]);

  const toolSummary = useMemo(() => {
    const executions = message.toolExecutions || [];
    const summary = {
      total: executions.length,
      completed: 0,
      running: 0,
      failed: 0,
      files: 0,
      commands: 0,
      searches: 0,
      uniqueFiles: new Set<string>(),
      currentLabel: '' as string | null,
    };

    executions.forEach((execution) => {
      const toolName = execution.tool || '';
      const path = execution.parameters?.path;
      const filesChanged = execution.metadata?.filesChanged || [];

      if (execution.status === 'running' || execution.status === 'pending') {
        summary.running += 1;
      } else if (execution.status === 'error' || (execution.status === 'complete' && execution.success === false)) {
        summary.failed += 1;
      } else if (execution.status === 'complete' && execution.success !== false) {
        summary.completed += 1;
      }

      if (toolName.includes('search')) {
        summary.searches += 1;
      } else if (toolName.includes('command') || toolName.includes('install') || toolName.includes('diagnostic')) {
        summary.commands += 1;
      } else {
        summary.files += 1;
      }

      if (typeof path === 'string' && path.length > 0) {
        summary.uniqueFiles.add(path);
      }
      filesChanged.forEach((file: string) => {
        if (file) summary.uniqueFiles.add(file);
      });
    });

    const activeExecution = [...executions].reverse().find((execution) => execution.status === 'running' || execution.status === 'pending');
    if (activeExecution) {
      const path = activeExecution.parameters?.path;
      const command = activeExecution.parameters?.command;
      const query = activeExecution.parameters?.query || activeExecution.parameters?.pattern;
      if (path) {
        summary.currentLabel = `Editing ${path}`;
      } else if (command) {
        summary.currentLabel = `Running ${command}`;
      } else if (query) {
        summary.currentLabel = `Searching ${query}`;
      } else {
        summary.currentLabel = `Running ${activeExecution.tool}`;
      }
    }

    return {
      ...summary,
      filesTouched: summary.uniqueFiles.size,
    };
  }, [message.toolExecutions]);

  const messageStatus = message.status as string | undefined;
  const userStatusLabel = useMemo(() => {
    if (messageStatus === 'error') return 'Failed';
    if (messageStatus === 'sending' || messageStatus === 'pending') return 'Sending';
    return 'Sent';
  }, [messageStatus]);
  
  return (
    <LazyMotionDiv
      ref={ref}
      layout
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        "flex group",
        isUser && "flex-row-reverse"
      )}
      data-testid={`enhanced-message-${message.id}`}
      data-message-role={message.role}
    >
      <div className={cn(
        "flex-1 min-w-0 space-y-2 max-w-full overflow-hidden",
        isUser && "flex flex-col items-end"
      )}>
        {hasThinking && (
          <div className="collapsible-content expanded w-full min-w-0 overflow-hidden">
            <div className="w-full min-w-0 overflow-hidden">
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
            </div>
          </div>
        )}

        {!isUser && (
          <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              {messageStructureSummary.actions} action{messageStructureSummary.actions !== 1 ? 's' : ''}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquareText className="h-3 w-3" />
              {messageStructureSummary.messages} message{messageStructureSummary.messages !== 1 ? 's' : ''}
            </span>
            {relativeTimestamp && (
              <span className="inline-flex items-center gap-1 ml-auto">
                <Clock3 className="h-3 w-3" />
                {relativeTimestamp}
              </span>
            )}
          </div>
        )}

        <LazyMotionDiv 
          className={cn(
            "relative rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 transition-all duration-200",
            "min-h-[36px] sm:min-h-[44px] min-w-[36px] sm:min-w-[44px]",
            isUser
              ? cn(
                  "w-fit max-w-[94%] sm:max-w-[84%] bg-card text-card-foreground border",
                  isError ? "border-destructive/30 shadow-lg shadow-destructive/10" : "border-border/70 shadow-sm",
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
          {isUser ? (
            <div className="space-y-2" data-testid={`enhanced-user-message-${message.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <UserRound className="h-3 w-3" />
                  </span>
                  You
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    isError
                      ? "bg-destructive/10 text-destructive"
                      : messageStatus === 'sending' || messageStatus === 'pending'
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {messageStatus === 'sending' || messageStatus === 'pending' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isError ? (
                    <AlertCircle className="h-3 w-3" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {userStatusLabel}
                </span>
              </div>
              <div className="rounded-xl bg-muted/30 px-3 py-2">
                <RichMessageContent content={message.content} />
              </div>
              {relativeTimestamp && (
                <div className="flex justify-end text-[10px] text-muted-foreground">
                  {relativeTimestamp}
                </div>
              )}
            </div>
          ) : message.content && !(isAutonomousMessage && rendersDedicatedAutonomousBody) ? (
            shouldCollapseMessageBody && !isMessageExpanded ? (
              <div className="space-y-3">
                <p className="text-[13px] leading-relaxed text-foreground/90" data-testid={`enhanced-message-preview-${message.id}`}>
                  {collapsedPreview}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 rounded-lg px-2.5 text-[11px]"
                  onClick={() => setIsMessageExpanded(true)}
                  data-testid={`enhanced-message-expand-${message.id}`}
                >
                  <PanelsTopLeft className="mr-1.5 h-3 w-3" />
                  Show full message
                </Button>
              </div>
            ) : (
              <RichMessageContent content={message.content} />
            )
          ) : (
            <p 
              className={cn(
                "text-[13px] whitespace-pre-wrap break-words leading-relaxed",
                isError && "text-destructive"
              )}
              data-testid={`enhanced-message-text-${message.id}`}
            >
              {message.content}
            </p>
          )}

          {message.isStreaming && (
            <LazyMotionSpan 
              className="inline-block w-0.5 h-4 bg-current ml-1 align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}

          <LazyAnimatePresence>
            <LazyMotionDiv 
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
            </LazyMotionDiv>
          </LazyAnimatePresence>
        </LazyMotionDiv>

        {hasTasks && displayTasks && displayTasks.length > 0 && (
          <LazyMotionDiv 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full mt-2"
            data-testid={`enhanced-tasks-${message.id}`}
          >
            <TaskMessage tasks={displayTasks} />
          </LazyMotionDiv>
        )}

        {hasActions && (
          <LazyMotionDiv 
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
          </LazyMotionDiv>
        )}

        {hasTools && (
          <LazyMotionDiv 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="w-full mt-2"
            data-testid={`enhanced-tool-executions-${message.id}`}
          >
            <div
              className="rounded-xl border border-border/60 bg-muted/30 p-3"
              data-testid={`enhanced-tools-summary-${message.id}`}
            >
              <div 
                className="flex items-center gap-2 cursor-pointer"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid={`enhanced-tools-toggle-${message.id}`}
              >
                <span className="text-[12px] font-medium text-foreground">
                  {toolSummary.total} action{toolSummary.total !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1.5 ml-auto">
                  {toolSummary.completed > 0 && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-emerald-950 text-emerald-400 border-emerald-500/70">
                      {toolSummary.completed} done
                    </Badge>
                  )}
                  {toolSummary.running > 0 && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-blue-950 text-blue-400 border-blue-500/70">
                      {toolSummary.running} running
                    </Badge>
                  )}
                  {toolSummary.failed > 0 && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-red-950 text-red-400 border-red-500/70">
                      {toolSummary.failed} failed
                    </Badge>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {toolSummary.currentLabel && (
                  <span className="font-medium text-foreground truncate max-w-full">
                    {toolSummary.currentLabel}
                  </span>
                )}
                {toolSummary.files > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <FileCode className="h-3 w-3" />
                    {toolSummary.files} file
                    {toolSummary.files !== 1 ? 's' : ''}
                  </span>
                )}
                {toolSummary.commands > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Terminal className="h-3 w-3" />
                    {toolSummary.commands} command
                    {toolSummary.commands !== 1 ? 's' : ''}
                  </span>
                )}
                {toolSummary.searches > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    {toolSummary.searches} search
                    {toolSummary.searches !== 1 ? 'es' : ''}
                  </span>
                )}
                {toolSummary.filesTouched > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    {toolSummary.filesTouched} file
                    {toolSummary.filesTouched !== 1 ? 's' : ''} touched
                  </span>
                )}
              </div>

              <div className={cn("collapsible-content", isExpanded && "expanded")}>
                <div className="mt-3">
                  <ToolExecutionList 
                    toolExecutions={message.toolExecutions!} 
                    showFilters={false}
                    compact={true}
                  />
                </div>
              </div>
            </div>
          </LazyMotionDiv>
        )}

        {/* Autonomous Workspace Inline Components - Replit-style */}
        {isAutonomousMessage && autonomousPayload && (
          <LazyMotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full mt-2"
            data-testid={`enhanced-autonomous-${message.id}`}
          >
            {/* Search indicator */}
            {message.type === 'autonomous_search' && autonomousPayload.searchQuery && (
              <InlineSearchIndicator query={autonomousPayload.searchQuery} />
            )}

            {/* App type indicator */}
            {autonomousPayload.appType && (
              <InlineAppType appType={autonomousPayload.appType} />
            )}

            {/* Plan card with features - show when featureList OR planText exists */}
            {message.type === 'autonomous_plan' && (
              (autonomousPayload.featureList && autonomousPayload.featureList.length > 0) || autonomousPayload.planText
            ) && (
              <InlinePlanCard
                title={autonomousPayload.planTitle || "I'll include the following features:"}
                features={autonomousPayload.featureList || []}
                planText={autonomousPayload.planText}
                onChangePlan={onChangePlan}
              />
            )}

            {/* Build mode options */}
            {message.type === 'autonomous_build_options' && (
              <InlineBuildOptions
                onSelectMode={handleSelectBuildMode}
                selectedMode={selectedBuildMode || autonomousPayload.buildMode}
                disabled={autonomousPayload.phase === 'executing'}
              />
            )}

            {/* Build progress */}
            {message.type === 'autonomous_progress' && (
              <InlineBuildProgressCard
                phase={autonomousPayload.phase === 'complete' ? 'complete' : 
                       autonomousPayload.phase === 'executing' ? 'executing' : 'planning'}
                currentTask={autonomousPayload.currentTask}
                progress={autonomousPayload.progress || 0}
                tasks={autonomousPayload.tasks || []}
                planText={autonomousPayload.planText}
                isStreaming={message.isStreaming}
              />
            )}

            {/* Working indicator */}
            {message.type === 'autonomous_working' && (
              <InlineWorkingIndicator 
                message={message.content || 'Working...'} 
                status={autonomousPayload.agentStatus || 'working'}
                subMessage={autonomousPayload.subMessage}
              />
            )}

            {/* File operations - show file creates/edits/deletes */}
            {message.type === 'autonomous_file_operation' && autonomousPayload.fileOperation && (
              <InlineFileOperation
                operation={autonomousPayload.fileOperation.type as FileOperationType}
                filePath={autonomousPayload.fileOperation.path}
                language={autonomousPayload.fileOperation.language}
                linesChanged={autonomousPayload.fileOperation.linesChanged}
                preview={autonomousPayload.fileOperation.preview}
                status={autonomousPayload.fileOperation.status}
              />
            )}

            {/* Terminal output - show command executions */}
            {message.type === 'autonomous_terminal' && autonomousPayload.terminal && (
              <InlineTerminalOutput
                command={autonomousPayload.terminal.command}
                output={autonomousPayload.terminal.output}
                status={autonomousPayload.terminal.status}
                exitCode={autonomousPayload.terminal.exitCode}
                duration={autonomousPayload.terminal.duration}
              />
            )}

            {/* Code block - show code snippets */}
            {message.type === 'autonomous_code' && autonomousPayload.code && (
              <InlineCodeBlock
                code={autonomousPayload.code.content}
                language={autonomousPayload.code.language}
                filename={autonomousPayload.code.filename}
                action={autonomousPayload.code.action}
              />
            )}

            {/* Dependency installation */}
            {message.type === 'autonomous_dependencies' && autonomousPayload.dependencies && (
              <InlineDependencyInstall
                packages={autonomousPayload.dependencies.packages}
                status={autonomousPayload.dependencies.status}
                manager={autonomousPayload.dependencies.manager}
              />
            )}

            {/* Agent action - show specific actions */}
            {message.type === 'autonomous_action' && autonomousPayload.action && (
              <InlineAgentAction
                action={autonomousPayload.action.title}
                description={autonomousPayload.action.description}
                type={autonomousPayload.action.type}
              />
            )}

            {/* Thinking steps - show agent thought process */}
            {message.type === 'autonomous_thinking' && autonomousPayload.thinkingSteps && (
              <div className="space-y-1">
                {autonomousPayload.thinkingSteps.map((step: string, index: number) => (
                  <InlineThinkingStep
                    key={index}
                    step={step}
                    isActive={index === autonomousPayload.thinkingSteps!.length - 1 && message.isStreaming}
                    index={index}
                  />
                ))}
              </div>
            )}

            {/* Complete indicator */}
            {message.type === 'autonomous_complete' && (
              <InlineCompleteIndicator 
                message={message.content || 'Build complete!'}
                projectUrl={autonomousPayload.projectUrl}
              />
            )}

            {/* Error indicator */}
            {message.type === 'autonomous_error' && (
              <InlineErrorIndicator 
                message={message.content || 'An error occurred'}
                details={autonomousPayload.errorDetails}
                onRetry={onRetry}
              />
            )}

            {/* Progress timeline - chronological activity feed */}
            {message.type === 'autonomous_timeline' && autonomousPayload.timeline && (
              <InlineProgressTimeline
                events={autonomousPayload.timeline.events}
                onFileClick={onFileClick}
                maxHeight={autonomousPayload.timeline.maxHeight}
              />
            )}

            {/* Checkpoint marker - milestone in chat */}
            {message.type === 'autonomous_checkpoint' && autonomousPayload.checkpoint && (
              <InlineCheckpoint
                title={autonomousPayload.checkpoint.title}
                description={autonomousPayload.checkpoint.description}
                checkpointNumber={autonomousPayload.checkpoint.number}
                completedTasks={autonomousPayload.checkpoint.completedTasks}
                totalTasks={autonomousPayload.checkpoint.totalTasks}
                eta={autonomousPayload.checkpoint.eta}
              />
            )}

            {/* Task list with progress */}
            {message.type === 'autonomous_task_list' && autonomousPayload.taskList && (
              <InlineTaskListEnhanced
                title={autonomousPayload.taskList.title}
                tasks={autonomousPayload.taskList.items}
                showProgress={autonomousPayload.taskList.showProgress}
                onFileClick={onFileClick}
                compact={autonomousPayload.taskList.compact}
              />
            )}

            {/* Live preview window */}
            {message.type === 'autonomous_preview' && autonomousPayload.preview && (
              <InlinePreviewWindow
                previewUrl={autonomousPayload.preview.url}
                title={autonomousPayload.preview.title}
                isLoading={autonomousPayload.preview.isLoading}
                isLive={autonomousPayload.preview.isLive}
                onRefresh={onRefreshPreview}
                onOpenExternal={onOpenPreviewExternal}
              />
            )}
          </LazyMotionDiv>
        )}

        {/* Auto-saved checkpoint card - inline in chat */}
        {message.type === 'auto_checkpoint_created' && message.autoCheckpoint && (
          <LazyMotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <CheckpointCard
              checkpointId={message.autoCheckpoint.id}
              aiSummary={message.autoCheckpoint.aiSummary}
              filesCount={message.autoCheckpoint.filesCount}
              createdAt={message.autoCheckpoint.createdAt}
              type={message.autoCheckpoint.type}
              onRestore={onRestoreCheckpoint}
              isRestoring={isRestoringCheckpoint}
            />
          </LazyMotionDiv>
        )}

        {message.metadata && !isUser && (
          <LazyMotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <MessageMetadataFooter
              metadata={message.metadata}
              messageId={message.id}
              compact={isCompactMode}
            />
          </LazyMotionDiv>
        )}

        {!isUser && (
          <Collapsible open={isWorkSummaryExpanded} onOpenChange={setIsWorkSummaryExpanded}>
            <div className="rounded-xl border border-border/60 bg-muted/20" data-testid={`message-work-summary-${message.id}`}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                  data-testid={`message-work-summary-toggle-${message.id}`}
                >
                  <span className="text-[12px] font-medium text-foreground">
                    Worked for {workSummary.workedLabel}
                  </span>
                  {isWorkSummaryExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-3 border-t border-border/50 px-3 py-3 text-[12px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Time worked</span>
                    <span className="font-medium text-foreground">{workSummary.workedLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Work done</span>
                    <span className="font-medium text-foreground">
                      {workSummary.workDone} item{workSummary.workDone === 1 ? '' : 's'}
                    </span>
                  </div>

                  <Collapsible open={isUsageExpanded} onOpenChange={setIsUsageExpanded}>
                    <div className="rounded-lg border border-border/60 bg-background/70">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                          data-testid={`message-usage-toggle-${message.id}`}
                        >
                          <span className="inline-flex items-center gap-2 text-[12px] font-medium text-foreground">
                            <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                            Agent Usage
                          </span>
                          {isUsageExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-2 border-t border-border/50 px-3 py-3 text-[12px]">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">{workSummary.usageCategory}</span>
                            <span className="font-medium text-foreground">{workSummary.billedLabel}</span>
                          </div>
                          {workSummary.promoLine && (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                              {workSummary.promoLine}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
      </div>
    </LazyMotionDiv>
  );
}));

export const StreamingSkeleton = memo(function StreamingSkeleton() {
  return (
    <LazyMotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex"
      data-testid="streaming-skeleton"
    >
      <div className="flex-1 space-y-2 sm:space-y-3 max-w-full">
        <div className="bg-muted/80 rounded-xl sm:rounded-2xl rounded-bl-md px-3 py-3 sm:px-4 sm:py-4 shadow-md border border-border/50">
          <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Working
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <LazyMotionDiv 
              className="h-2.5 sm:h-3 bg-muted-foreground/20 rounded-full w-3/4"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <LazyMotionDiv 
              className="h-2.5 sm:h-3 bg-muted-foreground/20 rounded-full w-1/2"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
            <LazyMotionDiv 
              className="h-2.5 sm:h-3 bg-muted-foreground/20 rounded-full w-2/3"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        </div>
      </div>
    </LazyMotionDiv>
  );
});

export const TypingIndicator = memo(function TypingIndicator({ text = "Thinking" }: { text?: string }) {
  return (
    <LazyMotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex"
      data-testid="typing-indicator"
    >
      <div className="bg-muted/80 rounded-2xl rounded-bl-md px-4 py-3 shadow-md border border-border/50 flex items-center gap-2">
        <span className="text-[13px] text-muted-foreground">{text}</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <LazyMotionSpan
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
    </LazyMotionDiv>
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
    <LazyMotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4"
      data-testid="empty-conversation"
    >
      <LazyMotionDiv
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={springConfig}
        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-lg"
      >
        <Sparkles className="h-8 w-8 text-primary" />
      </LazyMotionDiv>
      
      <h3 className="text-[15px] font-semibold mb-2">How can I help you today?</h3>
      <p className="text-[13px] text-muted-foreground text-center mb-6 max-w-sm">
        I can help you build, debug, and improve your code with transparent reasoning.
      </p>
      
      {onQuickAction && (
        <div className="grid grid-cols-2 gap-2 w-full max-w-md">
          {quickActions.map((action, i) => (
            <LazyMotionButton
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
              <span className="text-[15px]">{action.icon}</span>
              <span className="text-[13px] font-medium">{action.label}</span>
            </LazyMotionButton>
          ))}
        </div>
      )}
    </LazyMotionDiv>
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
  const isVisible = isSyncing || hasUnsyncedChanges || lastSyncedAt;
  
  return (
    <div
      className={cn(
        "collapsible-content",
        isVisible && "expanded"
      )}
      data-testid="sync-indicator"
    >
      <div
        className={cn(
          "flex items-center justify-center gap-2 py-1.5 px-3 text-[11px]",
          "bg-muted/50 border-b border-border/50"
        )}
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
      </div>
    </div>
  );
});

export default EnhancedChatMessage;
