import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Sparkles, Lightbulb } from 'lucide-react';
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
      id: 'plan' as const,
      label: 'Plan',
      icon: Lightbulb,
      description: 'Brainstorm and plan without changing code'
    },
    {
      id: 'build' as const,
      label: 'Build',
      icon: Sparkles,
      description: 'Build and modify your application'
    }
  ];

  const currentMode = modes.find(m => m.id === mode) || modes[1];
  const CurrentIcon = currentMode.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 px-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
            "border border-gray-200 dark:border-gray-700 rounded-md",
            "hover:bg-gray-50 dark:hover:bg-gray-800",
            className
          )}
          data-testid="mode-selector-trigger"
        >
          <CurrentIcon className="w-3.5 h-3.5 mr-1.5" />
          {currentMode.label}
          <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = m.id === mode;
          
          return (
            <DropdownMenuItem
              key={m.id}
              onClick={() => onChange(m.id)}
              className={cn(
                "flex items-start gap-3 p-3 cursor-pointer",
                isActive && "bg-blue-50 dark:bg-blue-950/30"
              )}
              data-testid={`mode-option-${m.id}`}
            >
              <Icon className={cn(
                "w-4 h-4 mt-0.5",
                isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
              )} />
              <div className="flex-1">
                <div className={cn(
                  "font-medium text-sm",
                  isActive ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-gray-100"
                )}>
                  {m.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {m.description}
                </div>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-2" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
