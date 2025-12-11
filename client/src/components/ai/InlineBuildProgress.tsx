/**
 * InlineBuildProgress - Replit-style inline chat components for autonomous workspace
 * 
 * Displays plan, build options, and progress directly in the chat stream
 * instead of a separate dialog (like Replit Agent does)
 * 
 * Features rich animated states: Working, Vibing, Thinking, Building, Styling
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation, useReducedMotion } from 'framer-motion';
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  FileCode, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Hammer,
  Paintbrush,
  Clock,
  ExternalLink,
  Code,
  Terminal,
  Package,
  Zap,
  Brain,
  Wand2,
  Palette,
  Rocket,
  Music,
  FolderOpen,
  Settings,
  Database,
  Shield,
  Globe,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// =============================================================================
// REPLIT-STYLE STATUS STATES
// =============================================================================
export type AgentStatus = 
  | 'idle' 
  | 'thinking' 
  | 'vibing' 
  | 'working' 
  | 'building' 
  | 'styling' 
  | 'testing' 
  | 'deploying'
  | 'complete'
  | 'error';

interface StatusConfig {
  label: string;
  icon: typeof Sparkles;
  color: string;
  bgColor: string;
  animation: 'pulse' | 'spin' | 'bounce' | 'wave' | 'glow';
  emoji?: string;
}

const STATUS_CONFIGS: Record<AgentStatus, StatusConfig> = {
  idle: {
    label: 'Ready',
    icon: Sparkles,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    animation: 'pulse',
  },
  thinking: {
    label: 'Thinking',
    icon: Brain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    animation: 'pulse',
    emoji: '🧠',
  },
  vibing: {
    label: 'Vibing',
    icon: Music,
    color: 'text-pink-500',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    animation: 'wave',
    emoji: '✨',
  },
  working: {
    label: 'Working',
    icon: Wand2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    animation: 'spin',
    emoji: '🔧',
  },
  building: {
    label: 'Building',
    icon: Hammer,
    color: 'text-amber-500',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    animation: 'bounce',
    emoji: '🏗️',
  },
  styling: {
    label: 'Styling',
    icon: Palette,
    color: 'text-fuchsia-500',
    bgColor: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
    animation: 'glow',
    emoji: '🎨',
  },
  testing: {
    label: 'Testing',
    icon: Shield,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    animation: 'pulse',
    emoji: '🧪',
  },
  deploying: {
    label: 'Deploying',
    icon: Rocket,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    animation: 'bounce',
    emoji: '🚀',
  },
  complete: {
    label: 'Complete',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    animation: 'glow',
    emoji: '✅',
  },
  error: {
    label: 'Error',
    icon: Package,
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    animation: 'pulse',
    emoji: '❌',
  },
};

// Animation variants for different status animations
const animationVariants = {
  pulse: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
  },
  spin: {
    rotate: 360,
  },
  bounce: {
    y: [0, -4, 0],
  },
  wave: {
    rotate: [0, 15, -15, 0],
  },
  glow: {
    boxShadow: [
      '0 0 0 0 rgba(var(--primary-rgb), 0)',
      '0 0 20px 4px rgba(var(--primary-rgb), 0.3)',
      '0 0 0 0 rgba(var(--primary-rgb), 0)',
    ],
  },
};

// =============================================================================
// REPLIT-STYLE STATUS INDICATOR
// =============================================================================
interface ReplitStatusIndicatorProps {
  status: AgentStatus;
  message?: string;
  subMessage?: string;
  showEmoji?: boolean;
  compact?: boolean;
}

export function ReplitStatusIndicator({ 
  status, 
  message, 
  subMessage,
  showEmoji = true,
  compact = false
}: ReplitStatusIndicatorProps) {
  const config = STATUS_CONFIGS[status];
  const Icon = config.icon;
  const prefersReducedMotion = useReducedMotion();
  
  // Use simpler animations or none when reduced motion is preferred
  const shouldAnimate = !prefersReducedMotion;
  
  return (
    <motion.div 
      initial={shouldAnimate ? { opacity: 0, y: 10, scale: 0.95 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={shouldAnimate ? { opacity: 0, y: -10, scale: 0.95 } : { opacity: 0 }}
      transition={shouldAnimate ? { type: 'spring', stiffness: 300, damping: 20 } : { duration: 0.2 }}
      className={cn(
        "flex items-center gap-3 rounded-xl border transition-all duration-300",
        compact ? "py-2 px-3" : "py-3 px-4",
        config.bgColor,
        "border-transparent"
      )}
      data-testid={`status-indicator-${status}`}
    >
      {/* Icon container - respects reduced motion */}
      <motion.div
        className={cn("relative", compact ? "p-1.5" : "p-2")}
        animate={shouldAnimate ? (config.animation === 'spin' ? { rotate: 360 } : animationVariants[config.animation]) : undefined}
        transition={shouldAnimate ? {
          duration: config.animation === 'spin' ? 1.5 : 2,
          repeat: Infinity,
          ease: config.animation === 'spin' ? 'linear' : 'easeInOut',
        } : undefined}
      >
        <div className={cn(
          "rounded-full flex items-center justify-center",
          config.bgColor,
          compact ? "p-1.5" : "p-2"
        )}>
          <Icon className={cn(
            config.color,
            compact ? "h-4 w-4" : "h-5 w-5"
          )} />
        </div>
        
        {/* Ripple effect for active states - only if animation is enabled */}
        {shouldAnimate && status !== 'idle' && status !== 'complete' && status !== 'error' && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full",
              config.bgColor
            )}
            animate={{
              scale: [1, 1.8],
              opacity: [0.5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        )}
      </motion.div>
      
      {/* Text content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {showEmoji && config.emoji && (
            <span className={compact ? "text-base" : "text-lg"}>
              {config.emoji}
            </span>
          )}
          <span className={cn(
            "font-medium",
            config.color,
            compact ? "text-sm" : "text-base"
          )}>
            {message || config.label}
          </span>
          
          {/* Animated dots for active states - only if animation is enabled */}
          {shouldAnimate && (status === 'thinking' || status === 'working' || status === 'building') && (
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className={cn("rounded-full", config.bgColor, compact ? "w-1 h-1" : "w-1.5 h-1.5")}
                  animate={{ 
                    y: [0, -3, 0],
                    opacity: [0.4, 1, 0.4]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                  style={{ backgroundColor: 'currentColor' }}
                />
              ))}
            </span>
          )}
        </div>
        
        {subMessage && (
          <motion.p
            initial={shouldAnimate ? { opacity: 0, height: 0 } : { opacity: 1 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={cn(
              "text-muted-foreground mt-0.5",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {subMessage}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// TASK PROGRESS ITEM
// =============================================================================
interface TaskProgressItemProps {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  index: number;
  isLast?: boolean;
}

export function TaskProgressItem({ name, status, index, isLast }: TaskProgressItemProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        // Respect reduced motion preference
        if (shouldAnimate) {
          return (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="h-4 w-4 text-primary" />
            </motion.div>
          );
        }
        // Static fallback for reduced motion
        return <Loader2 className="h-4 w-4 text-primary" />;
      case 'error':
        return <Package className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
      animate={{ opacity: 1, x: 0 }}
      transition={shouldAnimate ? { delay: index * 0.05, type: 'spring' } : { duration: 0.1 }}
      className="flex items-start gap-3 relative"
    >
      {/* Connection line */}
      {!isLast && (
        <div className={cn(
          "absolute left-[9px] top-5 w-0.5 h-[calc(100%+8px)]",
          status === 'completed' ? 'bg-green-200 dark:bg-green-800' : 'bg-border'
        )} />
      )}
      
      {/* Status icon */}
      <div className="relative z-10 bg-background rounded-full p-0.5">
        {getStatusIcon()}
      </div>
      
      {/* Task content */}
      <div className="flex-1 min-w-0 pb-3">
        <p className={cn(
          "text-sm truncate",
          status === 'completed' && "text-muted-foreground line-through",
          status === 'in_progress' && "text-foreground font-medium",
          status === 'pending' && "text-muted-foreground",
          status === 'error' && "text-red-500"
        )}>
          {name}
        </p>
        
        {status === 'in_progress' && (
          <motion.div
            className="flex items-center gap-1.5 mt-1"
            initial={shouldAnimate ? { opacity: 0 } : { opacity: 1 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex gap-0.5">
              {shouldAnimate ? (
                // Animated dots when motion is allowed
                [0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1 h-1 rounded-full bg-primary"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))
              ) : (
                // Static dots for reduced motion
                [0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-primary opacity-60"
                  />
                ))
              )}
            </div>
            <span className="text-xs text-muted-foreground">In progress</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export type BuildMode = 'design-first' | 'full-app';

// =============================================================================
// INLINE WORKING INDICATOR (Enhanced with Replit-style)
// =============================================================================
interface InlineWorkingIndicatorProps {
  message?: string;
  status?: AgentStatus;
  subMessage?: string;
}

export function InlineWorkingIndicator({ 
  message = 'Working...', 
  status = 'working',
  subMessage 
}: InlineWorkingIndicatorProps) {
  // Use the status directly from props (authoritative server data)
  return (
    <ReplitStatusIndicator
      status={status}
      message={message}
      subMessage={subMessage}
      compact={true}
    />
  );
}

interface InlineSearchIndicatorProps {
  query: string;
}

export function InlineSearchIndicator({ query }: InlineSearchIndicatorProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 text-sm text-muted-foreground py-1"
    >
      <Search className="h-4 w-4" />
      <span>Searched Replit's integrations for "{query}"</span>
    </motion.div>
  );
}

interface InlineAppTypeProps {
  appType: string;
}

export function InlineAppType({ appType }: InlineAppTypeProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 text-sm py-1"
    >
      <span className="text-muted-foreground">App type</span>
      <span className="text-muted-foreground">○</span>
      <span className="font-medium">{appType}</span>
    </motion.div>
  );
}

interface InlinePlanCardProps {
  title: string;
  features: string[];
  isExpanded?: boolean;
  onToggle?: () => void;
  onChangePlan?: () => void;
}

export function InlinePlanCard({ 
  title, 
  features, 
  isExpanded = true, 
  onToggle,
  onChangePlan 
}: InlinePlanCardProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 overflow-hidden my-2"
    >
      <div 
        className="p-3 cursor-pointer flex items-center justify-between"
        onClick={() => {
          setExpanded(!expanded);
          onToggle?.();
        }}
      >
        <span className="text-sm font-medium">{title}</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-3 pb-3">
              <ul className="space-y-1.5">
                {features.map((feature, i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="text-muted-foreground mt-1.5">•</span>
                    <span>{feature}</span>
                  </motion.li>
                ))}
              </ul>
              
              {onChangePlan && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-xs text-muted-foreground hover:text-foreground gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangePlan();
                  }}
                  data-testid="button-change-plan"
                >
                  <ExternalLink className="h-3 w-3" />
                  Change plan
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface InlineBuildOptionsProps {
  onSelectMode: (mode: BuildMode) => void;
  disabled?: boolean;
  selectedMode?: BuildMode | null;
}

export function InlineBuildOptions({ onSelectMode, disabled, selectedMode }: InlineBuildOptionsProps) {
  const [hoveredOption, setHoveredOption] = useState<BuildMode | null>(null);
  
  const options = [
    {
      id: 'full-app' as BuildMode,
      title: 'Build the entire app',
      time: '20+ mins',
      description: 'Best if you want Agent to build out the full functionality of your app',
      icon: Hammer,
      color: 'emerald'
    },
    {
      id: 'design-first' as BuildMode,
      title: 'Start with a design',
      time: '5-10 mins',
      description: 'Best if you want to see a design prototype first, then iterate on visuals or features',
      icon: Paintbrush,
      color: 'purple'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg bg-card p-4 my-3 space-y-4"
    >
      <div>
        <p className="text-sm font-medium">I've created a feature list based on your request. If everything looks good, we can start building.</p>
        <p className="text-sm text-muted-foreground mt-1">How do you want to continue?</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = selectedMode === option.id;
          const isHovered = hoveredOption === option.id;
          
          return (
            <motion.div
              key={option.id}
              className={cn(
                "relative border rounded-lg p-4 cursor-pointer transition-all",
                "hover:border-primary/50 hover:shadow-sm",
                isSelected && "border-primary bg-primary/5",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onMouseEnter={() => setHoveredOption(option.id)}
              onMouseLeave={() => setHoveredOption(null)}
              onClick={() => !disabled && onSelectMode(option.id)}
              whileHover={{ scale: disabled ? 1 : 1.02 }}
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              data-testid={`build-option-${option.id}`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  option.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-purple-100 dark:bg-purple-900/30'
                )}>
                  <option.icon className={cn(
                    "h-5 w-5",
                    option.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'
                  )} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{option.title}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Clock className="h-3 w-3" />
                    <span>{option.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {option.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      <Button 
        className="w-full gap-2" 
        size="lg"
        disabled={disabled || !selectedMode}
        onClick={() => selectedMode && onSelectMode(selectedMode)}
        data-testid="button-start-building"
      >
        Start building
        <Sparkles className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Button variant="ghost" size="sm" className="text-xs h-7" data-testid="button-edit-plan">
          Edit plan
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" data-testid="button-agent-tools">
          <Code className="h-3 w-3" />
          Agent tools
        </Button>
      </div>
    </motion.div>
  );
}

interface BuildTask {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
}

interface InlineBuildProgressProps {
  phase: 'planning' | 'executing' | 'complete';
  currentTask?: string;
  progress: number;
  tasks: BuildTask[];
  planText?: string;
  isStreaming?: boolean;
}

// Map phase values from autonomousPayload to agent status - uses authoritative server data
function mapPhaseToAgentStatus(phase: 'planning' | 'executing' | 'complete'): AgentStatus {
  switch (phase) {
    case 'planning':
      return 'thinking';
    case 'executing':
      return 'building';
    case 'complete':
      return 'complete';
    default:
      return 'working';
  }
}

export function InlineBuildProgressCard({ 
  phase, 
  currentTask, 
  progress, 
  tasks,
  planText,
  isStreaming 
}: InlineBuildProgressProps) {
  const [showTasks, setShowTasks] = useState(true);
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  
  // Map phase to agent status using authoritative server data
  const currentStatus = useMemo(
    () => mapPhaseToAgentStatus(phase),
    [phase]
  );
  
  // Calculate completed and total tasks
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  return (
    <motion.div 
      initial={shouldAnimate ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 my-3 border rounded-xl bg-card/50 p-4"
      data-testid="inline-build-progress-card"
    >
      {/* Status header with Replit-style indicator */}
      <ReplitStatusIndicator
        status={currentStatus}
        message={
          phase === 'planning' 
            ? (planText ? 'Generating design guidelines...' : 'Analyzing your request...') 
            : currentTask || STATUS_CONFIGS[currentStatus].label
        }
        subMessage={
          phase === 'executing' 
            ? `${completedTasks}/${tasks.length} tasks • ${Math.round(progress)}% complete` 
            : undefined
        }
        compact={false}
      />
      
      {/* Progress bar for executing phase */}
      {phase === 'executing' && (
        <div className="space-y-2">
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            {shouldAnimate ? (
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', stiffness: 50 }}
              />
            ) : (
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full"
                style={{ width: `${progress}%` }}
              />
            )}
            {/* Shimmer effect - only when animation is enabled */}
            {shouldAnimate && (
              <motion.div
                className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-80px', '400px'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Task list with timeline */}
      {phase === 'executing' && tasks.length > 0 && (
        <div className="space-y-2">
          <button
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            onClick={() => setShowTasks(!showTasks)}
            data-testid="toggle-tasks-button"
          >
            <span className="font-medium">{completedTasks}/{tasks.length} tasks</span>
            {shouldAnimate ? (
              <motion.div animate={{ rotate: showTasks ? 180 : 0 }}>
                <ChevronDown className="h-3 w-3" />
              </motion.div>
            ) : (
              <div style={{ transform: showTasks ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <ChevronDown className="h-3 w-3" />
              </div>
            )}
          </button>
          
          {shouldAnimate ? (
            <AnimatePresence>
              {showTasks && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 overflow-hidden pl-1"
                >
                  {tasks.map((task, index) => (
                    <TaskProgressItem
                      key={task.id}
                      name={task.name}
                      status={task.status}
                      index={index}
                      isLast={index === tasks.length - 1}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            showTasks && (
              <div className="space-y-1 pl-1">
                {tasks.map((task, index) => (
                  <TaskProgressItem
                    key={task.id}
                    name={task.name}
                    status={task.status}
                    index={index}
                    isLast={index === tasks.length - 1}
                  />
                ))}
              </div>
            )
          )}
        </div>
      )}
      
      {/* Complete phase with celebration - respects reduced motion */}
      {phase === 'complete' && (
        <motion.div 
          initial={shouldAnimate ? { scale: 0.9, opacity: 0 } : { opacity: 1 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-3 py-2"
        >
          {shouldAnimate ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: 2 }}
            >
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </motion.div>
          ) : (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          )}
          <div>
            <p className="font-medium text-green-600 dark:text-green-400">Build complete!</p>
            <p className="text-xs text-muted-foreground">All tasks finished successfully</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

interface InlineStartBuildingButtonProps {
  onClick: () => void;
  timestamp?: string;
}

export function InlineStartBuildingButton({ onClick, timestamp }: InlineStartBuildingButtonProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 my-2"
    >
      <Button 
        onClick={onClick}
        className="bg-primary hover:bg-primary/90"
        data-testid="button-start-building-inline"
      >
        Start building
      </Button>
      {timestamp && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timestamp}
        </span>
      )}
    </motion.div>
  );
}

interface InlineCompleteIndicatorProps {
  message?: string;
  projectUrl?: string;
}

export function InlineCompleteIndicator({ message = 'Build complete!', projectUrl }: InlineCompleteIndicatorProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800 p-4 my-2"
      data-testid="inline-complete-indicator"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-green-700 dark:text-green-300">{message}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Your workspace is ready to use</p>
        </div>
      </div>
      {projectUrl && (
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3 gap-2" 
          onClick={() => window.open(projectUrl, '_blank')}
          data-testid="button-open-project"
        >
          <ExternalLink className="h-4 w-4" />
          Open Project
        </Button>
      )}
    </motion.div>
  );
}

interface InlineErrorIndicatorProps {
  message: string;
  details?: string;
  onRetry?: () => void;
}

export function InlineErrorIndicator({ message, details, onRetry }: InlineErrorIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800 p-4 my-2"
      data-testid="inline-error-indicator"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 flex-shrink-0">
          <Package className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-red-700 dark:text-red-300">{message}</p>
          {details && (
            <>
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-muted-foreground mt-1 flex items-center gap-1 hover:text-foreground"
              >
                {showDetails ? 'Hide' : 'Show'} details
                {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              <AnimatePresence>
                {showDetails && (
                  <motion.pre
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="text-xs bg-red-100/50 dark:bg-red-900/20 p-2 rounded mt-2 overflow-auto max-h-32"
                  >
                    {details}
                  </motion.pre>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
      {onRetry && (
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3 gap-2 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30" 
          onClick={onRetry}
          data-testid="button-retry-build"
        >
          Try again
        </Button>
      )}
    </motion.div>
  );
}
