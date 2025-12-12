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

interface PlanPhase {
  number: number;
  title: string;
  description?: string;
  tasks?: string[];
}

interface InlinePlanCardProps {
  title: string;
  features: string[];
  planText?: string;
  phases?: PlanPhase[];
  isExpanded?: boolean;
  onToggle?: () => void;
  onChangePlan?: () => void;
}

export function InlinePlanCard({ 
  title, 
  features, 
  planText,
  phases,
  isExpanded = true, 
  onToggle,
  onChangePlan 
}: InlinePlanCardProps) {
  const [expanded, setExpanded] = useState(isExpanded);
  const [showFullPlan, setShowFullPlan] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  const parsePlanIntoPhases = (text: string): PlanPhase[] => {
    if (!text) return [];
    const lines = text.split('\n').filter(line => line.trim());
    const parsedPhases: PlanPhase[] = [];
    let currentPhase: PlanPhase | null = null;
    
    lines.forEach(line => {
      const phaseMatch = line.match(/^(?:Phase\s*)?(\d+)[.:\s-]+(.+)/i);
      const taskMatch = line.match(/^\s*[-•*]\s*(.+)/);
      
      if (phaseMatch) {
        if (currentPhase) parsedPhases.push(currentPhase);
        currentPhase = {
          number: parseInt(phaseMatch[1]),
          title: phaseMatch[2].trim(),
          tasks: []
        };
      } else if (taskMatch && currentPhase) {
        currentPhase.tasks?.push(taskMatch[1].trim());
      } else if (currentPhase && line.trim() && !line.startsWith('#')) {
        if (!currentPhase.description) {
          currentPhase.description = line.trim();
        } else {
          currentPhase.tasks?.push(line.trim());
        }
      }
    });
    
    if (currentPhase) parsedPhases.push(currentPhase);
    return parsedPhases;
  };

  const displayPhases = phases || (planText ? parsePlanIntoPhases(planText) : []);
  const hasPhases = displayPhases.length > 0;

  return (
    <motion.div 
      initial={shouldAnimate ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 overflow-hidden my-2"
      data-testid="inline-plan-card"
    >
      <div 
        className="p-3 cursor-pointer flex items-center justify-between"
        onClick={() => {
          setExpanded(!expanded);
          onToggle?.();
        }}
        data-testid="plan-card-header"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">{title}</span>
          {features.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {features.length} features
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={shouldAnimate ? { height: 0, opacity: 0 } : { opacity: 1 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={shouldAnimate ? { height: 0, opacity: 0 } : { opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-3 pb-3 space-y-3">
              {hasPhases ? (
                <div className="space-y-3">
                  {displayPhases.map((phase, i) => (
                    <motion.div
                      key={i}
                      initial={shouldAnimate ? { opacity: 0, x: -10 } : { opacity: 1 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="border-l-2 border-blue-300 dark:border-blue-700 pl-3"
                      data-testid={`plan-phase-${phase.number}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">
                          Phase {phase.number}
                        </span>
                        <span className="text-sm font-medium">{phase.title}</span>
                      </div>
                      {phase.description && (
                        <p className="text-xs text-muted-foreground mb-1.5">{phase.description}</p>
                      )}
                      {phase.tasks && phase.tasks.length > 0 && (
                        <ul className="space-y-1 ml-2">
                          {phase.tasks.map((task, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <span className="mt-1">○</span>
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {features.map((feature, i) => (
                    <motion.li 
                      key={i}
                      initial={shouldAnimate ? { opacity: 0, x: -10 } : { opacity: 1 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </motion.li>
                  ))}
                </ul>
              )}
              
              {planText && (
                <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                  <button
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullPlan(!showFullPlan);
                    }}
                    data-testid="button-toggle-full-plan"
                  >
                    {showFullPlan ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showFullPlan ? 'Hide full plan' : 'Show full plan'}
                  </button>
                  
                  <AnimatePresence>
                    {showFullPlan && (
                      <motion.div
                        initial={shouldAnimate ? { height: 0, opacity: 0 } : { opacity: 1 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={shouldAnimate ? { height: 0, opacity: 0 } : { opacity: 0 }}
                        className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto"
                        data-testid="full-plan-text"
                      >
                        {planText}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              
              {onChangePlan && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground gap-1"
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

// =============================================================================
// INLINE FILE OPERATION - Shows file creates/edits/deletes with visual feedback
// =============================================================================
export type FileOperationType = 'create' | 'edit' | 'delete' | 'read' | 'move';

interface InlineFileOperationProps {
  operation: FileOperationType;
  filePath: string;
  language?: string;
  linesChanged?: number;
  preview?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'error';
}

const FILE_OPERATION_CONFIG: Record<FileOperationType, { 
  label: string; 
  icon: typeof FileCode; 
  color: string; 
  bgColor: string;
}> = {
  create: { 
    label: 'Created', 
    icon: FileCode, 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30'
  },
  edit: { 
    label: 'Edited', 
    icon: FileText, 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  delete: { 
    label: 'Deleted', 
    icon: FileCode, 
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30'
  },
  read: { 
    label: 'Read', 
    icon: FolderOpen, 
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30'
  },
  move: { 
    label: 'Moved', 
    icon: FolderOpen, 
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30'
  }
};

export function InlineFileOperation({ 
  operation, 
  filePath, 
  language,
  linesChanged,
  preview,
  status = 'completed'
}: InlineFileOperationProps) {
  const [showPreview, setShowPreview] = useState(false);
  const config = FILE_OPERATION_CONFIG[operation];
  const Icon = config.icon;
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  
  const fileName = filePath.split('/').pop() || filePath;
  const dirPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';

  const previewToggleId = `file-preview-${filePath.replace(/[^a-zA-Z0-9]/g, '-')}`;

  const handleTogglePreview = () => {
    if (preview) {
      setShowPreview(!showPreview);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (preview && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleTogglePreview();
    }
  };

  const contentRow = (
    <>
      <div className={cn("p-1.5 rounded", config.bgColor)}>
        {status === 'in_progress' ? (
          <Loader2 className={cn("h-3.5 w-3.5 animate-spin", config.color)} />
        ) : (
          <Icon className={cn("h-3.5 w-3.5", config.color)} />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
          <code className="text-xs font-mono truncate text-foreground">{fileName}</code>
        </div>
        {dirPath && (
          <p className="text-[10px] text-muted-foreground truncate">{dirPath}</p>
        )}
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {language && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{language}</Badge>
        )}
        {linesChanged !== undefined && (
          <span className={cn(
            "text-[10px] font-mono",
            operation === 'delete' ? 'text-red-500' : 'text-green-500'
          )}>
            {operation === 'delete' ? '-' : '+'}{linesChanged} lines
          </span>
        )}
        {preview && (
          showPreview 
            ? <ChevronUp className="h-3 w-3 text-muted-foreground" aria-hidden="true" /> 
            : <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
    </>
  );

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, x: -10 } : { opacity: 1 }}
      animate={{ opacity: 1, x: 0 }}
      className="border rounded-lg bg-card/50 overflow-hidden my-1.5"
      data-testid={`inline-file-operation-${operation}`}
    >
      {preview ? (
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-2 w-full text-left transition-colors cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
          onClick={handleTogglePreview}
          onKeyDown={handleKeyDown}
          aria-expanded={showPreview}
          aria-controls={previewToggleId}
          aria-label={`${config.label} ${fileName}, ${showPreview ? 'preview visible, press to hide' : 'press to show preview'}`}
          data-testid={`file-operation-toggle-${operation}`}
        >
          {contentRow}
        </button>
      ) : (
        <div 
          className="flex items-center gap-2 px-3 py-2"
          role="status"
          aria-label={`${config.label} ${fileName}`}
          data-testid={`file-operation-info-${operation}`}
        >
          {contentRow}
        </div>
      )}
      
      <AnimatePresence>
        {showPreview && preview && (
          <motion.div
            id={previewToggleId}
            initial={shouldAnimate ? { height: 0, opacity: 0 } : { opacity: 1 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={shouldAnimate ? { height: 0, opacity: 0 } : { opacity: 0 }}
            className="border-t border-border/50"
          >
            <pre className="text-[11px] font-mono p-3 bg-muted/30 overflow-x-auto max-h-40 overflow-y-auto">
              {preview}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// INLINE TERMINAL OUTPUT - Shows command executions with rich formatting
// =============================================================================
interface InlineTerminalOutputProps {
  command: string;
  output?: string;
  status?: 'running' | 'success' | 'error';
  exitCode?: number;
  duration?: number;
}

export function InlineTerminalOutput({ 
  command, 
  output, 
  status = 'success',
  exitCode,
  duration
}: InlineTerminalOutputProps) {
  const [showOutput, setShowOutput] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  
  const terminalOutputId = `terminal-output-${command.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 40)}`;

  const handleToggleOutput = () => {
    if (output) {
      setShowOutput(!showOutput);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (output && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleToggleOutput();
    }
  };

  const terminalContentRow = (
    <>
      <div className="flex items-center gap-1.5">
        {status === 'running' ? (
          <Loader2 className="h-3.5 w-3.5 text-yellow-400 animate-spin" />
        ) : status === 'success' ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
        ) : (
          <Package className="h-3.5 w-3.5 text-red-400" />
        )}
        <Terminal className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
      </div>
      
      <code className="flex-1 text-xs font-mono text-zinc-200 truncate">
        $ {command}
      </code>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {duration !== undefined && (
          <span className="text-[10px] text-zinc-500">{duration}ms</span>
        )}
        {exitCode !== undefined && exitCode !== 0 && (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
            Exit {exitCode}
          </Badge>
        )}
        {output && (
          showOutput 
            ? <ChevronUp className="h-3 w-3 text-zinc-500" aria-hidden="true" /> 
            : <ChevronDown className="h-3 w-3 text-zinc-500" aria-hidden="true" />
        )}
      </div>
    </>
  );

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg overflow-hidden my-2 bg-zinc-950"
      data-testid="inline-terminal-output"
    >
      {output ? (
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-2 w-full text-left transition-colors cursor-pointer hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
          onClick={handleToggleOutput}
          onKeyDown={handleKeyDown}
          aria-expanded={showOutput}
          aria-controls={terminalOutputId}
          aria-label={`Terminal command: ${command}, ${showOutput ? 'output visible, press to hide' : 'press to show output'}`}
          data-testid="terminal-output-toggle"
        >
          {terminalContentRow}
        </button>
      ) : (
        <div 
          className="flex items-center gap-2 px-3 py-2"
          role="status"
          aria-label={`Terminal command: ${command}, ${status === 'running' ? 'running' : status === 'success' ? 'completed successfully' : 'completed with error'}`}
          data-testid="terminal-output-info"
        >
          {terminalContentRow}
        </div>
      )}
      
      <AnimatePresence>
        {showOutput && output && (
          <motion.div
            id={terminalOutputId}
            initial={shouldAnimate ? { height: 0, opacity: 0 } : { opacity: 1 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={shouldAnimate ? { height: 0, opacity: 0 } : { opacity: 0 }}
            className="border-t border-zinc-800"
          >
            <pre className="text-[11px] font-mono p-3 text-zinc-300 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">
              {output}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// INLINE CODE BLOCK - Shows code snippets with syntax highlighting indication
// =============================================================================
interface InlineCodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  action?: 'adding' | 'removing' | 'modifying';
}

export function InlineCodeBlock({ code, language, filename, action }: InlineCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const actionColors = {
    adding: 'border-l-green-500 bg-green-50/30 dark:bg-green-950/20',
    removing: 'border-l-red-500 bg-red-50/30 dark:bg-red-950/20',
    modifying: 'border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
  };

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border rounded-lg overflow-hidden my-2 border-l-4",
        action ? actionColors[action] : "border-l-primary"
      )}
      data-testid="inline-code-block"
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Code className="h-3.5 w-3.5 text-muted-foreground" />
          {filename && <code className="text-xs font-mono text-foreground">{filename}</code>}
          {language && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{language}</Badge>}
          {action && (
            <span className={cn(
              "text-[10px] font-medium",
              action === 'adding' && 'text-green-600 dark:text-green-400',
              action === 'removing' && 'text-red-600 dark:text-red-400',
              action === 'modifying' && 'text-blue-600 dark:text-blue-400'
            )}>
              {action === 'adding' ? '+ Adding' : action === 'removing' ? '- Removing' : '~ Modifying'}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCopy}
          data-testid="button-copy-code"
        >
          {copied ? (
            <CheckCircle2 className="h-3 w-3 text-green-500" />
          ) : (
            <Code className="h-3 w-3" />
          )}
        </Button>
      </div>
      <pre className="text-[11px] font-mono p-3 overflow-x-auto max-h-60 overflow-y-auto">
        {code}
      </pre>
    </motion.div>
  );
}

// =============================================================================
// INLINE THINKING STEP - Shows what the agent is thinking with Replit-style
// =============================================================================
interface InlineThinkingStepProps {
  step: string;
  isActive?: boolean;
  index?: number;
}

export function InlineThinkingStep({ step, isActive = false, index = 0 }: InlineThinkingStepProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, x: -10 } : { opacity: 1 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "flex items-center gap-2 py-1.5 px-3 rounded-lg text-sm",
        isActive 
          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" 
          : "text-muted-foreground"
      )}
      data-testid={`inline-thinking-step-${index}`}
    >
      {isActive ? (
        shouldAnimate ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          >
            <Brain className="h-3.5 w-3.5" />
          </motion.div>
        ) : (
          <Brain className="h-3.5 w-3.5" />
        )
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
      )}
      <span>{step}</span>
    </motion.div>
  );
}

// =============================================================================
// INLINE AGENT ACTION - Shows a specific action the agent is taking
// =============================================================================
interface InlineAgentActionProps {
  action: string;
  description?: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  icon?: typeof Sparkles;
}

export function InlineAgentAction({ 
  action, 
  description, 
  type = 'info',
  icon: CustomIcon
}: InlineAgentActionProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  const typeStyles = {
    info: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: Zap },
    warning: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: Settings },
    success: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: CheckCircle2 },
    error: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: Package }
  };

  const style = typeStyles[type];
  const Icon = CustomIcon || style.icon;

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex items-start gap-2 py-2 px-3 rounded-lg my-1", style.bg)}
      data-testid={`inline-agent-action-${type}`}
    >
      <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", style.text)} />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", style.text)}>{action}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// INLINE DEPENDENCY INSTALL - Shows package installation progress
// =============================================================================
interface InlineDependencyInstallProps {
  packages: string[];
  status?: 'installing' | 'success' | 'error';
  manager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
}

export function InlineDependencyInstall({ 
  packages, 
  status = 'success',
  manager = 'npm'
}: InlineDependencyInstallProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 10 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg bg-card/50 p-3 my-2"
      data-testid="inline-dependency-install"
    >
      <div className="flex items-center gap-2 mb-2">
        {status === 'installing' ? (
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
        ) : status === 'success' ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Package className="h-4 w-4 text-red-500" />
        )}
        <span className="text-sm font-medium">
          {status === 'installing' ? 'Installing dependencies...' : 
           status === 'success' ? 'Dependencies installed' : 'Installation failed'}
        </span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 ml-auto">{manager}</Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {packages.map((pkg, i) => (
          <motion.span
            key={pkg}
            initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : { opacity: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="text-xs font-mono bg-muted px-2 py-0.5 rounded"
          >
            {pkg}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}
