/**
 * InlineBuildProgress - Replit-style inline chat components for autonomous workspace
 * 
 * Displays plan, build options, and progress directly in the chat stream
 * instead of a separate dialog (like Replit Agent does)
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type BuildMode = 'design-first' | 'full-app';

interface InlineWorkingIndicatorProps {
  message?: string;
}

export function InlineWorkingIndicator({ message = 'Working...' }: InlineWorkingIndicatorProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <Sparkles className="h-4 w-4 text-primary animate-pulse" />
      <span>{message}</span>
    </motion.div>
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

export function InlineBuildProgressCard({ 
  phase, 
  currentTask, 
  progress, 
  tasks,
  planText,
  isStreaming 
}: InlineBuildProgressProps) {
  const [showTasks, setShowTasks] = useState(true);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 my-2"
    >
      {phase === 'planning' && (
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-muted-foreground">
            {planText ? 'Generating design guidelines...' : 'Analyzing your request...'}
          </span>
        </div>
      )}
      
      {phase === 'executing' && (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>{currentTask || 'Building...'}</span>
            <span className="text-muted-foreground ml-auto">{Math.round(progress)}%</span>
          </div>
          
          <Progress value={progress} className="h-1.5" />
          
          {tasks.length > 0 && (
            <div className="space-y-1">
              <div 
                className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer"
                onClick={() => setShowTasks(!showTasks)}
              >
                <span>{tasks.filter(t => t.status === 'completed').length}/{tasks.length} tasks</span>
                {showTasks ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </div>
              
              <AnimatePresence>
                {showTasks && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-1 overflow-hidden"
                  >
                    {tasks.slice(-5).map((task) => (
                      <div key={task.id} className="flex items-center gap-2 text-xs py-0.5">
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                        ) : task.status === 'in_progress' ? (
                          <Loader2 className="h-3 w-3 animate-spin text-primary flex-shrink-0" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-muted-foreground/30 flex-shrink-0" />
                        )}
                        <span className="truncate text-muted-foreground">{task.name}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
      
      {phase === 'complete' && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>Build complete!</span>
        </div>
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
