/**
 * BuildModeSelector - Replit-style Build Mode Selection Dialog
 * Allows users to choose between "Start with a design" (3 min prototype) 
 * or "Build the full app" (10 min MVP)
 * 
 * Identical to Replit's build mode selection interface
 */

import { useState } from 'react';
import { 
  Paintbrush, Hammer, ChevronRight, Sparkles, 
  Clock, Layers, Code, FileCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type BuildMode = 'design-first' | 'full-app' | 'continue-planning';

interface BuildModeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (mode: BuildMode) => void;
  featureList?: string[];
  projectName?: string;
}

interface BuildOption {
  id: BuildMode;
  title: string;
  description: string;
  icon: typeof Paintbrush;
  badge?: string;
  timeEstimate: string;
  features: string[];
  color: string;
  recommended?: boolean;
}

const buildOptions: BuildOption[] = [
  {
    id: 'design-first',
    title: 'Start with a design',
    description: 'See your app design first, then add functionality',
    icon: Paintbrush,
    badge: 'Visual First',
    timeEstimate: '~3 minutes',
    features: [
      'Quick clickable prototype',
      'See UI before building',
      'Iterate on design',
      'Build functionality later'
    ],
    color: 'purple',
    recommended: false
  },
  {
    id: 'full-app',
    title: 'Build the full app',
    description: 'Complete working application from the start',
    icon: Hammer,
    badge: 'Recommended',
    timeEstimate: '~10 minutes',
    features: [
      'Full-stack development',
      'Working MVP immediately',
      'Backend + Frontend',
      'Database integration'
    ],
    color: 'emerald',
    recommended: true
  }
];

export function BuildModeSelector({
  open,
  onOpenChange,
  onSelectMode,
  featureList = [],
  projectName
}: BuildModeSelectorProps) {
  const [hoveredOption, setHoveredOption] = useState<BuildMode | null>(null);

  const getColorClasses = (color: string, type: 'bg' | 'border' | 'text' | 'icon') => {
    const colors: Record<string, Record<string, string>> = {
      purple: {
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        border: 'border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600',
        text: 'text-purple-600 dark:text-purple-400',
        icon: 'bg-purple-100 dark:bg-purple-900/50'
      },
      emerald: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        border: 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600',
        text: 'text-emerald-600 dark:text-emerald-400',
        icon: 'bg-emerald-100 dark:bg-emerald-900/50'
      }
    };
    return colors[color]?.[type] || '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden" data-testid="build-mode-selector-dialog">
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/30 dark:to-purple-950/30 border-b">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <DialogTitle className="text-lg font-semibold">
              How do you want to continue?
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {projectName && <span className="font-medium">{projectName}: </span>}
            Choose your preferred build approach
          </DialogDescription>
          
          {/* Feature List Preview */}
          {featureList.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Feature list created</span>
                <Badge variant="secondary" className="text-[10px]">{featureList.length} features</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {featureList.slice(0, 5).map((feature, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {feature}
                  </Badge>
                ))}
                {featureList.length > 5 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{featureList.length - 5} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Build Options */}
          <div className="grid gap-4 md:grid-cols-2">
            {buildOptions.map((option) => {
              const Icon = option.icon;
              const isHovered = hoveredOption === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => onSelectMode(option.id)}
                  onMouseEnter={() => setHoveredOption(option.id)}
                  onMouseLeave={() => setHoveredOption(null)}
                  className={cn(
                    "relative text-left p-4 rounded-xl border-2 transition-all duration-200",
                    "hover:shadow-lg hover:scale-[1.02]",
                    getColorClasses(option.color, 'border'),
                    isHovered && getColorClasses(option.color, 'bg')
                  )}
                  data-testid={`build-option-${option.id}`}
                >
                  {/* Recommended Badge */}
                  {option.recommended && (
                    <div className="absolute -top-2.5 right-4">
                      <Badge className={cn(
                        "text-[10px] px-2",
                        getColorClasses(option.color, 'text'),
                        "bg-emerald-100 dark:bg-emerald-900/50 border-0"
                      )}>
                        ✨ {option.badge}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      getColorClasses(option.color, 'icon')
                    )}>
                      <Icon className={cn("h-5 w-5", getColorClasses(option.color, 'text'))} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{option.title}</h3>
                        {!option.recommended && option.badge && (
                          <Badge variant="secondary" className="text-[10px]">
                            {option.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {option.description}
                      </p>
                      
                      {/* Time Estimate */}
                      <div className="flex items-center gap-1 mb-3">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{option.timeEstimate}</span>
                      </div>
                      
                      {/* Features */}
                      <ul className="space-y-1">
                        {option.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ChevronRight className={cn("h-3 w-3", getColorClasses(option.color, 'text'))} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Continue Planning Option */}
          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => onSelectMode('continue-planning')}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              data-testid="button-continue-planning"
            >
              <Code className="h-4 w-4 mr-2" />
              Continue planning - refine feature list first
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BuildModeSelector;
