import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Breakpoint {
  id: string;
  file: string;
  line: number;
  condition?: string;
  isEnabled: boolean;
  hitCount: number;
}

interface Variable {
  name: string;
  value: any;
  type: string;
  children?: Variable[];
}

interface DebugSession {
  projectId: string;
  isRunning: boolean;
  isPaused: boolean;
  breakpoints: Breakpoint[];
  variables: Variable[];
  callStack: any[];
  watchExpressions: string[];
  currentFile?: string;
  currentLine?: number;
}

interface MobileDebugPanelProps {
  projectId: string;
  className?: string;
}

export function MobileDebugPanel({ projectId, className }: MobileDebugPanelProps) {
  const [activeTab, setActiveTab] = useState<'breakpoints' | 'variables'>('breakpoints');
  const [expandedVariables, setExpandedVariables] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch debug session
  const { data: session, isLoading, refetch } = useQuery<DebugSession>({
    queryKey: ['/api/debug/session', projectId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/debug/session/${projectId}`);
      return response;
    },
    refetchInterval: (query) => {
      const data = query.state.data as DebugSession | undefined;
      return data?.isRunning ? 1000 : false; // Poll every second when running
    }
  });

  // Start debugging
  const startMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/debug/start/${projectId}`, {});
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Debug session started",
        description: "You can now set breakpoints and inspect variables"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start debugging",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Stop debugging
  const stopMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/debug/stop/${projectId}`, {});
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Debug session stopped"
      });
    }
  });

  // Pause execution
  const pauseMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/debug/pause/${projectId}`, {});
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Paused at breakpoint",
        description: "Execution paused, inspect variables"
      });
    }
  });

  // Continue execution
  const continueMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/debug/continue/${projectId}`, {});
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Resumed execution"
      });
    }
  });

  // Toggle breakpoint enable/disable
  const toggleEnableMutation = useMutation({
    mutationFn: async (breakpointId: string) => {
      return await apiRequest('POST', `/api/debug/breakpoint/enable/${projectId}/${breakpointId}`, {});
    },
    onSuccess: () => {
      refetch();
    }
  });

  // Delete breakpoint
  const deleteMutation = useMutation({
    mutationFn: async (breakpointId: string) => {
      return await apiRequest('DELETE', `/api/debug/breakpoint/${projectId}/${breakpointId}`, {});
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Breakpoint removed"
      });
    }
  });

  const handleStart = () => {
    startMutation.mutate(undefined as any);
  };

  const handlePause = () => {
    pauseMutation.mutate(undefined as any);
  };

  const handleContinue = () => {
    continueMutation.mutate(undefined as any);
  };

  const handleStop = () => {
    stopMutation.mutate(undefined as any);
  };

  const toggleBreakpoint = (id: string) => {
    toggleEnableMutation.mutate(id);
  };

  const deleteBreakpoint = (id: string) => {
    deleteMutation.mutate(id);
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

  const breakpoints = session?.breakpoints || [];
  const variables = session?.variables || [];
  const isRunning = session?.isRunning || false;
  const isPaused = session?.isPaused || false;

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Debugger</h3>
          </div>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!isLoading && isRunning && (
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
              disabled={startMutation.isPending || isLoading}
              data-testid="button-debug-start"
            >
              {startMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
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
                  disabled={continueMutation.isPending}
                  data-testid="button-debug-continue"
                >
                  {continueMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Continue
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={handlePause}
                  disabled={pauseMutation.isPending}
                  data-testid="button-debug-pause"
                >
                  {pauseMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Pause className="h-4 w-4 mr-2" />
                  )}
                  Pause
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleStop}
                disabled={stopMutation.isPending}
                data-testid="button-debug-stop"
              >
                {stopMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
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
            {tab === 'breakpoints' && breakpoints.length > 0 && (
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
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {!isLoading && breakpoints.map((bp) => (
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
                    disabled={toggleEnableMutation.isPending}
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
                    <div className="text-xs text-muted-foreground">
                      Line {bp.line}
                      {bp.hitCount > 0 && ` • Hit ${bp.hitCount}×`}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0"
                  onClick={() => deleteBreakpoint(bp.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-breakpoint-${bp.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {!isLoading && breakpoints.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No breakpoints set</p>
                <p className="text-xs mt-1">Click + to add a breakpoint</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'variables' && (
          <div className="p-4 space-y-1">
            {!isRunning || !isPaused ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bug className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Start debugging and pause to see variables</p>
              </div>
            ) : (
              <>
                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                
                {!isLoading && variables.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No variables in current scope</p>
                  </div>
                )}

                {!isLoading && variables.map((variable) => (
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
                    
                    {expandedVariables.has(variable.name) && variable.children && (
                      <div className="ml-6 pl-3 border-l-2 border-border space-y-1 mt-1">
                        {variable.children.map((child) => (
                          <div 
                            key={child.name}
                            className="flex items-center gap-2 p-2 text-sm font-mono"
                          >
                            <span className="text-muted-foreground">{child.name}:</span>
                            <span>{JSON.stringify(child.value)}</span>
                            <Badge variant="outline" className="text-xs ml-auto">
                              {child.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {expandedVariables.has(variable.name) && !variable.children && (
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
                ))}
              </>
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
            disabled
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Breakpoint
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Click line numbers in code editor to add breakpoints
          </p>
        </div>
      )}
    </div>
  );
}
