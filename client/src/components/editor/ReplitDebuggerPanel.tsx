import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Bug,
  Play,
  Pause,
  Square,
  SkipForward,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Circle,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  X
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

interface CallStackFrame {
  id: string;
  name: string;
  file: string;
  line: number;
  isActive: boolean;
}

interface DebugSession {
  projectId: string;
  isRunning: boolean;
  isPaused: boolean;
  breakpoints: Breakpoint[];
  variables: Variable[];
  callStack: CallStackFrame[];
  watchExpressions: string[];
  currentFile?: string;
  currentLine?: number;
}

export function ReplitDebuggerPanel({ projectId = '1' }: { projectId?: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('breakpoints');
  const [expandedVariables, setExpandedVariables] = useState<Set<string>>(new Set());
  const [newWatchExpression, setNewWatchExpression] = useState('');

  const { data: session, refetch } = useQuery<DebugSession>({
    queryKey: ['/api/debug/session', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/debug/session/${projectId}`);
      if (!res.ok) throw new Error('Failed to fetch debug session');
      return res.json();
    },
  });

  const startDebugMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/debug/start/${projectId}`, 'POST', {});
    },
    onSuccess: () => {
      refetch();
      toast({ description: 'Debug session started' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to start debugging', variant: 'destructive' });
    },
  });

  const stopDebugMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/debug/stop/${projectId}`, 'POST', {});
    },
    onSuccess: () => {
      refetch();
      toast({ description: 'Debug session stopped' });
    },
  });

  const pauseDebugMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/debug/pause/${projectId}`, 'POST', {});
    },
    onSuccess: () => {
      refetch();
      toast({ description: 'Paused at breakpoint' });
    },
  });

  const continueDebugMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/debug/continue/${projectId}`, 'POST', {});
    },
    onSuccess: () => {
      refetch();
      toast({ description: 'Resumed execution' });
    },
  });

  const stepOverMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/debug/step-over/${projectId}`, 'POST', {});
    },
    onSuccess: () => refetch(),
  });

  const stepIntoMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/debug/step-into/${projectId}`, 'POST', {});
    },
    onSuccess: () => refetch(),
  });

  const stepOutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/debug/step-out/${projectId}`, 'POST', {});
    },
    onSuccess: () => refetch(),
  });

  const toggleBreakpointMutation = useMutation({
    mutationFn: async ({ breakpointId }: { breakpointId: string }) => {
      return apiRequest(`/api/debug/breakpoint/enable/${projectId}/${breakpointId}`, 'POST', {});
    },
    onSuccess: () => refetch(),
  });

  const deleteBreakpointMutation = useMutation({
    mutationFn: async ({ breakpointId }: { breakpointId: string }) => {
      return apiRequest(`/api/debug/breakpoint/${projectId}/${breakpointId}`, 'DELETE', {});
    },
    onSuccess: () => refetch(),
  });

  const addWatchMutation = useMutation({
    mutationFn: async ({ expression }: { expression: string }) => {
      return apiRequest(`/api/debug/watch/add/${projectId}`, 'POST', { expression });
    },
    onSuccess: () => {
      refetch();
      setNewWatchExpression('');
    },
  });

  const deleteWatchMutation = useMutation({
    mutationFn: async ({ index }: { index: number }) => {
      return apiRequest(`/api/debug/watch/${projectId}/${index}`, 'DELETE', {});
    },
    onSuccess: () => refetch(),
  });

  const toggleVariableExpansion = (name: string) => {
    const newExpanded = new Set(expandedVariables);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedVariables(newExpanded);
  };

  const handleAddWatch = () => {
    if (newWatchExpression.trim()) {
      addWatchMutation.mutate({ expression: newWatchExpression.trim() });
    }
  };

  const renderVariableValue = (value: any, type: string) => {
    if (type === 'object') {
      return <span className="text-[var(--ecode-text-muted)]">{'{ ... }'}</span>;
    }
    if (type === 'string') {
      return <span className="text-status-success">"{value}"</span>;
    }
    if (type === 'boolean') {
      return <span className="text-status-info">{value.toString()}</span>;
    }
    if (type === 'number') {
      return <span className="text-status-warning">{value}</span>;
    }
    return <span className="text-[var(--ecode-text)]">{value}</span>;
  };

  const isRunning = session?.isRunning || false;
  const isPaused = session?.isPaused || false;
  const breakpoints = session?.breakpoints || [];
  const variables = session?.variables || [];
  const callStack = session?.callStack || [];
  const watchExpressions = session?.watchExpressions || [];

  return (
    <div className="h-full flex flex-col bg-[var(--ecode-surface)]">
      {/* Header */}
      <div className="px-3 py-3 border-b border-[var(--ecode-border)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-[var(--ecode-accent)]" />
            <h3 className="font-semibold text-[var(--ecode-text)] text-sm font-[family-name:var(--ecode-font-sans)]">
              Debugger
            </h3>
            {isRunning && (
              <Badge className={cn(
                "text-xs",
                isPaused ? "bg-status-warning/20 text-status-warning" : "bg-status-success/20 text-status-success"
              )}>
                {isPaused ? 'Paused' : 'Running'}
              </Badge>
            )}
          </div>
        </div>

        {/* Debug Controls */}
        <div className="flex items-center gap-1">
          {!isRunning ? (
            <Button
              size="sm"
              onClick={() => startDebugMutation.mutate(undefined)}
              disabled={startDebugMutation.isPending}
              className="text-xs h-7"
              data-testid="button-debug-start"
            >
              <Play className="h-3 w-3 mr-1" />
              Start Debug
            </Button>
          ) : (
            <>
              {isPaused ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => continueDebugMutation.mutate(undefined)}
                  disabled={continueDebugMutation.isPending}
                  data-testid="button-debug-continue"
                >
                  <Play className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => pauseDebugMutation.mutate(undefined)}
                  disabled={pauseDebugMutation.isPending}
                  data-testid="button-debug-pause"
                >
                  <Pause className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => stopDebugMutation.mutate(undefined)}
                disabled={stopDebugMutation.isPending}
                data-testid="button-debug-stop"
              >
                <Square className="h-3 w-3" />
              </Button>
              <div className="w-px h-5 bg-[var(--ecode-border)] mx-1" />
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!isPaused || stepOverMutation.isPending}
                onClick={() => stepOverMutation.mutate(undefined)}
                data-testid="button-debug-step-over"
              >
                <ArrowRight className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!isPaused || stepIntoMutation.isPending}
                onClick={() => stepIntoMutation.mutate(undefined)}
                data-testid="button-debug-step-into"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!isPaused || stepOutMutation.isPending}
                onClick={() => stepOutMutation.mutate(undefined)}
                data-testid="button-debug-step-out"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <div className="w-px h-5 bg-[var(--ecode-border)] mx-1" />
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => refetch()}
                data-testid="button-debug-refresh"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 px-3 pt-2 bg-[var(--ecode-surface)]">
          <TabsTrigger value="breakpoints" className="text-xs">
            Breakpoints
          </TabsTrigger>
          <TabsTrigger value="variables" className="text-xs">
            Variables
          </TabsTrigger>
          <TabsTrigger value="watch" className="text-xs">
            Watch
          </TabsTrigger>
          <TabsTrigger value="callstack" className="text-xs">
            Call Stack
          </TabsTrigger>
        </TabsList>

        {/* Breakpoints Tab */}
        <TabsContent value="breakpoints" className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-2">
              {breakpoints.length > 0 ? (
                breakpoints.map((bp) => (
                  <div
                    key={bp.id}
                    className={cn(
                      "flex items-center gap-2 px-2 py-2 hover:bg-[var(--ecode-surface-hover)] rounded",
                      !bp.isEnabled && "opacity-50"
                    )}
                    data-testid={`breakpoint-${bp.id}`}
                  >
                    <input
                      type="checkbox"
                      checked={bp.isEnabled}
                      onChange={() => toggleBreakpointMutation.mutate({ breakpointId: bp.id })}
                      className="rounded border-[var(--ecode-border)]"
                    />
                    <Circle className={cn(
                      "h-3 w-3",
                      bp.isEnabled ? "text-status-critical fill-status-critical" : "text-[var(--ecode-text-muted)]"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-[family-name:var(--ecode-font-mono)] text-[var(--ecode-text)] truncate">
                        {bp.file}:{bp.line}
                      </div>
                      {bp.condition && (
                        <div className="text-xs text-[var(--ecode-text-muted)]">
                          Condition: {bp.condition}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {bp.hitCount}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => deleteBreakpointMutation.mutate({ breakpointId: bp.id })}
                      data-testid={`button-delete-breakpoint-${bp.id}`}
                    >
                      <Trash2 className="h-3 w-3 text-status-critical" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Circle className="h-12 w-12 text-[var(--ecode-text-muted)] mb-3" />
                  <p className="text-sm text-[var(--ecode-text-muted)] font-[family-name:var(--ecode-font-sans)]">
                    No breakpoints set
                  </p>
                  <p className="text-xs text-[var(--ecode-text-muted)] mt-1 font-[family-name:var(--ecode-font-sans)]">
                    Click on line numbers in the editor to add breakpoints
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Variables Tab */}
        <TabsContent value="variables" className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-2">
              {isRunning && isPaused && variables.length > 0 ? (
                variables.map((variable) => (
                  <div key={variable.name} className="mb-1">
                    <div
                      className={cn(
                        "flex items-center gap-2 px-2 py-1 hover:bg-[var(--ecode-surface-hover)] rounded cursor-pointer",
                        variable.children && "font-medium"
                      )}
                      onClick={() => variable.children && toggleVariableExpansion(variable.name)}
                    >
                      {variable.children ? (
                        expandedVariables.has(variable.name) ? (
                          <ChevronDown className="h-3 w-3 text-[var(--ecode-text-muted)]" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-[var(--ecode-text-muted)]" />
                        )
                      ) : (
                        <div className="w-3" />
                      )}
                      <span className="text-sm text-[var(--ecode-text)] font-[family-name:var(--ecode-font-mono)]">
                        {variable.name}
                      </span>
                      <span className="text-sm text-[var(--ecode-text-muted)]">:</span>
                      <span className="text-sm font-[family-name:var(--ecode-font-mono)]">
                        {renderVariableValue(variable.value, variable.type)}
                      </span>
                    </div>

                    {variable.children && expandedVariables.has(variable.name) && (
                      <div className="ml-6">
                        {variable.children.map((child) => (
                          <div
                            key={child.name}
                            className="flex items-center gap-2 px-2 py-1 hover:bg-[var(--ecode-surface-hover)] rounded"
                          >
                            <div className="w-3" />
                            <span className="text-sm text-[var(--ecode-text)] font-[family-name:var(--ecode-font-mono)]">
                              {child.name}
                            </span>
                            <span className="text-sm text-[var(--ecode-text-muted)]">:</span>
                            <span className="text-sm font-[family-name:var(--ecode-font-mono)]">
                              {renderVariableValue(child.value, child.type)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <AlertCircle className="h-12 w-12 text-[var(--ecode-text-muted)] mb-3" />
                  <p className="text-sm text-[var(--ecode-text-muted)] font-[family-name:var(--ecode-font-sans)]">
                    {isRunning ? 'Not paused' : 'Start debugging to see variables'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Watch Tab */}
        <TabsContent value="watch" className="flex-1">
          <div className="p-2">
            <div className="flex gap-2 mb-2">
              <Input
                value={newWatchExpression}
                onChange={(e) => setNewWatchExpression(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWatch()}
                placeholder="Add watch expression..."
                className="flex-1 h-7 text-xs font-[family-name:var(--ecode-font-mono)]"
                data-testid="input-watch-expression"
              />
              <Button
                size="sm"
                onClick={handleAddWatch}
                className="h-7 w-7 p-0"
                disabled={!newWatchExpression.trim() || addWatchMutation.isPending}
                data-testid="button-add-watch"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <ScrollArea className="h-full">
              {watchExpressions.map((expr, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--ecode-surface-hover)] rounded"
                  data-testid={`watch-${index}`}
                >
                  <span className="text-sm font-[family-name:var(--ecode-font-mono)] text-[var(--ecode-text)] flex-1">
                    {expr}
                  </span>
                  <span className="text-sm text-[var(--ecode-text-muted)] font-[family-name:var(--ecode-font-mono)]">
                    {isRunning && isPaused ? (
                      <span className="text-status-success">"value"</span>
                    ) : (
                      <span className="text-[var(--ecode-text-muted)]">-</span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => deleteWatchMutation.mutate({ index })}
                    data-testid={`button-delete-watch-${index}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Call Stack Tab */}
        <TabsContent value="callstack" className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-2">
              {isRunning && isPaused && callStack.length > 0 ? (
                callStack.map((frame) => (
                  <div
                    key={frame.id}
                    className={cn(
                      "px-2 py-2 hover:bg-[var(--ecode-surface-hover)] rounded cursor-pointer",
                      frame.isActive && "bg-status-info/10"
                    )}
                    data-testid={`callstack-frame-${frame.id}`}
                  >
                    <div className="flex items-center gap-2">
                      {frame.isActive && (
                        <ChevronRight className="h-3 w-3 text-status-info" />
                      )}
                      <div className={cn(
                        "flex-1",
                        !frame.isActive && "ml-5"
                      )}>
                        <div className="text-sm font-medium text-[var(--ecode-text)] font-[family-name:var(--ecode-font-mono)]">
                          {frame.name}
                        </div>
                        <div className="text-xs text-[var(--ecode-text-muted)] font-[family-name:var(--ecode-font-mono)]">
                          {frame.file}:{frame.line}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <AlertCircle className="h-12 w-12 text-[var(--ecode-text-muted)] mb-3" />
                  <p className="text-sm text-[var(--ecode-text-muted)] font-[family-name:var(--ecode-font-sans)]">
                    {isRunning ? 'Not paused' : 'Start debugging to see call stack'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
