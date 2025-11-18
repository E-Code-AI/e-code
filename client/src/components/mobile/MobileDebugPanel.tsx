import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Bug,
  Play,
  Pause,
  Square,
  ArrowDown,
  ArrowRight,
  Circle,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Breakpoint {
  id: string;
  file: string;
  line: number;
  isEnabled: boolean;
}

interface Variable {
  name: string;
  value: any;
  type: string;
  children?: Variable[];
}

interface MobileDebugPanelProps {
  projectId: string;
  className?: string;
}

export function MobileDebugPanel({ projectId, className }: MobileDebugPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<'breakpoints' | 'variables'>('breakpoints');
  const [expandedVariables, setExpandedVariables] = useState<Set<string>>(new Set());

  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([
    { id: '1', file: 'src/App.tsx', line: 42, isEnabled: true },
    { id: '2', file: 'src/utils/api.ts', line: 18, isEnabled: false }
  ]);

  const variables: Variable[] = [
    { name: 'user', value: { id: 1, name: 'John Doe' }, type: 'object' },
    { name: 'count', value: 42, type: 'number' },
    { name: 'isActive', value: true, type: 'boolean' },
    { name: 'items', value: [1, 2, 3], type: 'array' }
  ];

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleContinue = () => {
    setIsPaused(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
  };

  const toggleBreakpoint = (id: string) => {
    setBreakpoints(breakpoints.map(bp => 
      bp.id === id ? { ...bp, isEnabled: !bp.isEnabled } : bp
    ));
  };

  const deleteBreakpoint = (id: string) => {
    setBreakpoints(breakpoints.filter(bp => bp.id !== id));
  };

  const toggleVariable = (name: string) => {
    const newExpanded = new Set(expandedVariables);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedVariables(newExpanded);
  };

  const renderValue = (value: any): string => {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return `[${value.length} items]`;
      }
      return `{${Object.keys(value).length} props}`;
    }
    return JSON.stringify(value);
  };

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Debugger</h3>
          </div>
          {isRunning && (
            <Badge variant={isPaused ? "secondary" : "default"} className="text-xs">
              {isPaused ? 'Paused' : 'Running'}
            </Badge>
          )}
        </div>

        {/* Debug Controls */}
        <div className="flex gap-1">
          {!isRunning ? (
            <Button 
              size="sm" 
              className="flex-1"
              onClick={handleStart}
              data-testid="button-debug-start"
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          ) : (
            <>
              {isPaused ? (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleContinue}
                  data-testid="button-debug-continue"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Continue
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={handlePause}
                  data-testid="button-debug-pause"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleStop}
                data-testid="button-debug-stop"
              >
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card">
        {(['breakpoints', 'variables'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-3 text-sm font-medium capitalize transition-colors",
              activeTab === tab
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            )}
            data-testid={`tab-${tab}`}
          >
            {tab}
            {tab === 'breakpoints' && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {breakpoints.length}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === 'breakpoints' && (
          <div className="p-4 space-y-2">
            {breakpoints.map((bp) => (
              <div 
                key={bp.id}
                className={cn(
                  "flex items-center justify-between p-3 border rounded-lg",
                  bp.isEnabled 
                    ? "bg-red-500/10 border-red-500/20"
                    : "bg-muted/50 border-border"
                )}
                data-testid={`breakpoint-${bp.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => toggleBreakpoint(bp.id)}
                    className="flex-shrink-0"
                    data-testid={`button-toggle-breakpoint-${bp.id}`}
                  >
                    <Circle 
                      className={cn(
                        "h-4 w-4",
                        bp.isEnabled 
                          ? "fill-red-500 text-red-500"
                          : "text-muted-foreground"
                      )}
                    />
                  </button>
                  <div className="min-w-0">
                    <div className="text-sm font-mono truncate">{bp.file}</div>
                    <div className="text-xs text-muted-foreground">Line {bp.line}</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => deleteBreakpoint(bp.id)}
                  data-testid={`button-delete-breakpoint-${bp.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {breakpoints.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No breakpoints set</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'variables' && (
          <div className="p-4 space-y-1">
            {!isRunning || !isPaused ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bug className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Start debugging to see variables</p>
              </div>
            ) : (
              variables.map((variable) => (
                <div key={variable.name}>
                  <button
                    onClick={() => toggleVariable(variable.name)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-muted rounded-lg text-left"
                    data-testid={`variable-${variable.name}`}
                  >
                    {variable.type === 'object' || variable.type === 'array' ? (
                      expandedVariables.has(variable.name) ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0" />
                      )
                    ) : (
                      <div className="w-4" />
                    )}
                    <span className="font-mono text-sm flex-1">{variable.name}:</span>
                    <span className="text-sm text-muted-foreground">
                      {renderValue(variable.value)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {variable.type}
                    </Badge>
                  </button>
                  
                  {expandedVariables.has(variable.name) && (
                    <div className="ml-6 pl-3 border-l-2 border-border space-y-1 mt-1">
                      {typeof variable.value === 'object' && variable.value !== null && (
                        Object.entries(variable.value).map(([key, val]) => (
                          <div 
                            key={key}
                            className="flex items-center gap-2 p-2 text-sm font-mono"
                          >
                            <span className="text-muted-foreground">{key}:</span>
                            <span>{JSON.stringify(val)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </ScrollArea>

      {/* Add Breakpoint */}
      {activeTab === 'breakpoints' && (
        <div className="p-4 border-t border-border bg-card">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            data-testid="button-add-breakpoint"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Breakpoint
          </Button>
        </div>
      )}
    </div>
  );
}
