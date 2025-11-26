import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Hammer, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AgentMode = 'plan' | 'build';

interface ModeSelectorProps {
  mode: AgentMode;
  onChange: (mode: AgentMode) => void;
  className?: string;
}

export function ModeSelector({ mode, onChange, className }: ModeSelectorProps) {
  const modes = [
    {
      id: 'build' as const,
      label: 'Build',
      icon: Hammer,
      description: 'Make, test, iterate autonomously',
      badge: 'Auto'
    },
    {
      id: 'plan' as const,
      label: 'Plan',
      icon: MessageSquare,
      description: 'Ask questions, plan your work'
    }
  ];

  const currentMode = modes.find(m => m.id === mode) || modes[0];
  const CurrentIcon = currentMode.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 gap-1 text-xs font-medium",
            mode === 'build' 
              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50" 
              : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50",
            "border-0 rounded-full",
            className
          )}
          data-testid="mode-selector-trigger"
        >
          <CurrentIcon className="w-3 h-3" />
          {currentMode.label}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = m.id === mode;
          
          return (
            <DropdownMenuItem
              key={m.id}
              onClick={() => onChange(m.id)}
              className={cn(
                "flex items-center gap-2.5 p-2.5 cursor-pointer min-h-[44px]",
                isActive && (m.id === 'build' 
                  ? "bg-emerald-50 dark:bg-emerald-950/30" 
                  : "bg-blue-50 dark:bg-blue-950/30")
              )}
              data-testid={`mode-option-${m.id}`}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                m.id === 'build' 
                  ? "bg-emerald-100 dark:bg-emerald-900/50" 
                  : "bg-blue-100 dark:bg-blue-900/50"
              )}>
                <Icon className={cn(
                  "w-4 h-4",
                  m.id === 'build' 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : "text-blue-600 dark:text-blue-400"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "font-medium text-sm",
                    isActive 
                      ? (m.id === 'build' ? "text-emerald-900 dark:text-emerald-100" : "text-blue-900 dark:text-blue-100")
                      : "text-gray-900 dark:text-gray-100"
                  )}>
                    {m.label}
                  </span>
                  {m.badge && (
                    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">
                      {m.badge}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  {m.description}
                </div>
              </div>
              {isActive && (
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  m.id === 'build' ? "bg-emerald-500" : "bg-blue-500"
                )} />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
