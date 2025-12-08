import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
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

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("bg-[#242b3d] rounded-lg", className)}
      animate={{
        backgroundPosition: ["200% 0", "-200% 0"],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear",
      }}
      style={{
        backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
        backgroundSize: "200% 100%",
      }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-3 space-y-3">
      <ShimmerSkeleton className="h-8 w-full" />
      <ShimmerSkeleton className="h-8 w-3/4" />
      <ShimmerSkeleton className="h-8 w-5/6" />
      <ShimmerSkeleton className="h-8 w-2/3" />
    </div>
  );
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: { 
  icon: any;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-3">
      <Icon className="w-12 h-12 text-[#5c6670] opacity-40 mb-3" />
      <h4 className="text-[15px] leading-[20px] font-medium text-[#ffffff] mb-1">
        {title}
      </h4>
      <p className="text-[13px] text-[#9da2a6] text-center mb-4">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="h-8 rounded-lg bg-[#0079f2] hover:bg-[#0079f2]/90 text-[#ffffff] text-[13px]"
          data-testid="button-empty-state-action"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ReplitDebuggerPanel({ projectId = '1' }: { projectId?: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('breakpoints');
  const [expandedVariables, setExpandedVariables] = useState<Set<string>>(new Set());
  const [newWatchExpression, setNewWatchExpression] = useState('');

  const { data: session, refetch, isLoading } = useQuery<DebugSession>({
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
      return <span className="text-[#9da2a6]">{'{ ... }'}</span>;
    }
    if (type === 'string') {
      return <span className="text-[#0079f2]">"{value}"</span>;
    }
    if (type === 'boolean') {
      return <span className="text-[#0079f2]">{value.toString()}</span>;
    }
    if (type === 'number') {
      return <span className="text-[#0079f2]">{value}</span>;
    }
    return <span className="text-[#ffffff]">{value}</span>;
  };

  const isRunning = session?.isRunning || false;
  const isPaused = session?.isPaused || false;
  const breakpoints = session?.breakpoints || [];
  const variables = session?.variables || [];
  const callStack = session?.callStack || [];
  const watchExpressions = session?.watchExpressions || [];

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-[#0e1525]">
        <div className="p-3 min-h-[48px] border-b border-[#3d4452]">
          <ShimmerSkeleton className="h-6 w-24" />
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0e1525]">
      {/* Header */}
      <div className="p-3 min-h-[48px] border-b border-[#3d4452]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bug className="w-[18px] h-[18px] text-[#0079f2]" />
            <h3 className="text-[17px] font-medium leading-tight text-[#ffffff]">
              Debugger
            </h3>
            {isRunning && (
              <Badge className={cn(
                "text-[11px] uppercase tracking-wider rounded-lg",
                isPaused 
                  ? "bg-[#242b3d] text-[#9da2a6] border border-[#3d4452]" 
                  : "bg-[#0079f2]/20 text-[#0079f2] border border-[#0079f2]/30"
              )}>
                {isPaused ? 'Paused' : 'Running'}
              </Badge>
            )}
          </div>
        </div>

        {/* Debug Controls */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <Button
              onClick={() => startDebugMutation.mutate(undefined)}
              disabled={startDebugMutation.isPending}
              className="h-8 rounded-lg bg-[#0079f2] hover:bg-[#0079f2]/90 text-[#ffffff] text-[13px] px-3"
              data-testid="button-debug-start"
            >
              <Play className="w-[18px] h-[18px] mr-2" />
              Start Debug
            </Button>
          ) : (
            <>
              {isPaused ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-[#d4d8dd] dark:border-[#3d4452] bg-transparent hover:bg-[#242b3d]"
                  onClick={() => continueDebugMutation.mutate(undefined)}
                  disabled={continueDebugMutation.isPending}
                  data-testid="button-debug-continue"
                >
                  <Play className="w-[18px] h-[18px] text-[#0079f2]" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg border-[#d4d8dd] dark:border-[#3d4452] bg-transparent hover:bg-[#242b3d]"
                  onClick={() => pauseDebugMutation.mutate(undefined)}
                  disabled={pauseDebugMutation.isPending}
                  data-testid="button-debug-pause"
                >
                  <Pause className="w-[18px] h-[18px] text-[#9da2a6]" />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-[#d4d8dd] dark:border-[#3d4452] bg-transparent hover:bg-[#242b3d]"
                onClick={() => stopDebugMutation.mutate(undefined)}
                disabled={stopDebugMutation.isPending}
                data-testid="button-debug-stop"
              >
                <Square className="w-[18px] h-[18px] text-[#9da2a6]" />
              </Button>
              <div className="w-px h-6 bg-[#3d4452] mx-1" />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-[#d4d8dd] dark:border-[#3d4452] bg-transparent hover:bg-[#242b3d]"
                disabled={!isPaused || stepOverMutation.isPending}
                onClick={() => stepOverMutation.mutate(undefined)}
                data-testid="button-debug-step-over"
              >
                <ArrowRight className="w-[18px] h-[18px] text-[#9da2a6]" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-[#d4d8dd] dark:border-[#3d4452] bg-transparent hover:bg-[#242b3d]"
                disabled={!isPaused || stepIntoMutation.isPending}
                onClick={() => stepIntoMutation.mutate(undefined)}
                data-testid="button-debug-step-into"
              >
                <ArrowDown className="w-[18px] h-[18px] text-[#9da2a6]" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-[#d4d8dd] dark:border-[#3d4452] bg-transparent hover:bg-[#242b3d]"
                disabled={!isPaused || stepOutMutation.isPending}
                onClick={() => stepOutMutation.mutate(undefined)}
                data-testid="button-debug-step-out"
              >
                <ArrowUp className="w-[18px] h-[18px] text-[#9da2a6]" />
              </Button>
              <div className="w-px h-6 bg-[#3d4452] mx-1" />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-[#d4d8dd] dark:border-[#3d4452] bg-transparent hover:bg-[#242b3d]"
                onClick={() => refetch()}
                data-testid="button-debug-refresh"
              >
                <RefreshCw className="w-[18px] h-[18px] text-[#9da2a6]" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 p-3 bg-[#0e1525] gap-1">
          <TabsTrigger 
            value="breakpoints" 
            className="text-[11px] uppercase tracking-wider h-8 rounded-lg data-[state=active]:bg-[#242b3d] data-[state=active]:text-[#ffffff] text-[#9da2a6]"
          >
            Breakpoints
          </TabsTrigger>
          <TabsTrigger 
            value="variables" 
            className="text-[11px] uppercase tracking-wider h-8 rounded-lg data-[state=active]:bg-[#242b3d] data-[state=active]:text-[#ffffff] text-[#9da2a6]"
          >
            Variables
          </TabsTrigger>
          <TabsTrigger 
            value="watch" 
            className="text-[11px] uppercase tracking-wider h-8 rounded-lg data-[state=active]:bg-[#242b3d] data-[state=active]:text-[#ffffff] text-[#9da2a6]"
          >
            Watch
          </TabsTrigger>
          <TabsTrigger 
            value="callstack" 
            className="text-[11px] uppercase tracking-wider h-8 rounded-lg data-[state=active]:bg-[#242b3d] data-[state=active]:text-[#ffffff] text-[#9da2a6]"
          >
            Call Stack
          </TabsTrigger>
        </TabsList>

        {/* Breakpoints Tab */}
        <TabsContent value="breakpoints" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {breakpoints.length > 0 ? (
                breakpoints.map((bp) => (
                  <div
                    key={bp.id}
                    className={cn(
                      "flex items-center gap-3 p-3 hover:bg-[#1c2333] rounded-lg transition-colors",
                      !bp.isEnabled && "opacity-50"
                    )}
                    data-testid={`breakpoint-${bp.id}`}
                  >
                    <input
                      type="checkbox"
                      checked={bp.isEnabled}
                      onChange={() => toggleBreakpointMutation.mutate({ breakpointId: bp.id })}
                      className="rounded border-[#3d4452] bg-[#242b3d] w-4 h-4"
                    />
                    <Circle className={cn(
                      "w-[18px] h-[18px]",
                      bp.isEnabled ? "text-[#0079f2] fill-[#0079f2]" : "text-[#5c6670]"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] leading-[20px] font-mono text-[#ffffff] truncate">
                        {bp.file}:{bp.line}
                      </div>
                      {bp.condition && (
                        <div className="text-[13px] text-[#9da2a6]">
                          Condition: {bp.condition}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[11px] uppercase tracking-wider px-2 py-0.5 border-[#3d4452] text-[#9da2a6] rounded-lg">
                      {bp.hitCount}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg hover:bg-[#242b3d]"
                      onClick={() => deleteBreakpointMutation.mutate({ breakpointId: bp.id })}
                      data-testid={`button-delete-breakpoint-${bp.id}`}
                    >
                      <Trash2 className="w-[18px] h-[18px] text-[#5c6670] hover:text-[#0079f2]" />
                    </Button>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={Circle}
                  title="No breakpoints set"
                  description="Click on line numbers in the editor to add breakpoints"
                />
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Variables Tab */}
        <TabsContent value="variables" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {isRunning && isPaused && variables.length > 0 ? (
                variables.map((variable) => (
                  <div key={variable.name} className="space-y-1">
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 hover:bg-[#1c2333] rounded-lg cursor-pointer transition-colors",
                        variable.children && "font-medium"
                      )}
                      onClick={() => variable.children && toggleVariableExpansion(variable.name)}
                    >
                      {variable.children ? (
                        expandedVariables.has(variable.name) ? (
                          <ChevronDown className="w-[18px] h-[18px] text-[#5c6670]" />
                        ) : (
                          <ChevronRight className="w-[18px] h-[18px] text-[#5c6670]" />
                        )
                      ) : (
                        <div className="w-[18px]" />
                      )}
                      <span className="text-[15px] leading-[20px] text-[#ffffff] font-mono">
                        {variable.name}
                      </span>
                      <span className="text-[15px] leading-[20px] text-[#5c6670]">:</span>
                      <span className="text-[15px] leading-[20px] font-mono">
                        {renderVariableValue(variable.value, variable.type)}
                      </span>
                    </div>

                    {variable.children && expandedVariables.has(variable.name) && (
                      <div className="ml-8 space-y-1">
                        {variable.children.map((child) => (
                          <div
                            key={child.name}
                            className="flex items-center gap-3 p-3 hover:bg-[#1c2333] rounded-lg transition-colors"
                          >
                            <div className="w-[18px]" />
                            <span className="text-[15px] leading-[20px] text-[#ffffff] font-mono">
                              {child.name}
                            </span>
                            <span className="text-[15px] leading-[20px] text-[#5c6670]">:</span>
                            <span className="text-[15px] leading-[20px] font-mono">
                              {renderVariableValue(child.value, child.type)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={AlertCircle}
                  title={isRunning ? 'Not paused' : 'No active debug session'}
                  description={isRunning ? 'Pause execution to inspect variables' : 'Start debugging to see variables'}
                  actionLabel={!isRunning ? 'Start Debug' : undefined}
                  onAction={!isRunning ? () => startDebugMutation.mutate(undefined) : undefined}
                />
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Watch Tab */}
        <TabsContent value="watch" className="flex-1 mt-0">
          <div className="p-3 space-y-3">
            <div className="flex gap-2">
              <Input
                value={newWatchExpression}
                onChange={(e) => setNewWatchExpression(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWatch()}
                placeholder="Add watch expression..."
                className="flex-1 h-8 rounded-lg text-[13px] font-mono bg-[#1c2333] border-[#3d4452] text-[#ffffff] placeholder:text-[#5c6670]"
                data-testid="input-watch-expression"
              />
              <Button
                onClick={handleAddWatch}
                className="h-8 w-8 rounded-lg bg-[#0079f2] hover:bg-[#0079f2]/90 p-0"
                disabled={!newWatchExpression.trim() || addWatchMutation.isPending}
                data-testid="button-add-watch"
              >
                <Plus className="w-[18px] h-[18px] text-[#ffffff]" />
              </Button>
            </div>

            <ScrollArea className="h-full">
              <div className="space-y-2">
                {watchExpressions.length > 0 ? (
                  watchExpressions.map((expr, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 hover:bg-[#1c2333] rounded-lg transition-colors"
                      data-testid={`watch-${index}`}
                    >
                      <span className="text-[15px] leading-[20px] font-mono text-[#ffffff] flex-1">
                        {expr}
                      </span>
                      <span className="text-[15px] leading-[20px] text-[#9da2a6] font-mono">
                        {isRunning && isPaused ? (
                          <span className="text-[#0079f2]">"value"</span>
                        ) : (
                          <span className="text-[#5c6670]">-</span>
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-[#242b3d]"
                        onClick={() => deleteWatchMutation.mutate({ index })}
                        data-testid={`button-delete-watch-${index}`}
                      >
                        <X className="w-[18px] h-[18px] text-[#5c6670] hover:text-[#0079f2]" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={AlertCircle}
                    title="No watch expressions"
                    description="Add expressions to monitor their values during debugging"
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Call Stack Tab */}
        <TabsContent value="callstack" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {isRunning && isPaused && callStack.length > 0 ? (
                callStack.map((frame) => (
                  <div
                    key={frame.id}
                    className={cn(
                      "p-3 hover:bg-[#1c2333] rounded-lg cursor-pointer transition-colors",
                      frame.isActive && "bg-[#0079f2]/10 border border-[#0079f2]/30"
                    )}
                    data-testid={`callstack-frame-${frame.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {frame.isActive && (
                        <ChevronRight className="w-[18px] h-[18px] text-[#0079f2]" />
                      )}
                      <div className={cn(
                        "flex-1",
                        !frame.isActive && "ml-[26px]"
                      )}>
                        <div className="text-[15px] leading-[20px] font-medium text-[#ffffff] font-mono">
                          {frame.name}
                        </div>
                        <div className="text-[13px] text-[#9da2a6] font-mono">
                          {frame.file}:{frame.line}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={AlertCircle}
                  title={isRunning ? 'Not paused' : 'No active debug session'}
                  description={isRunning ? 'Pause execution to see call stack' : 'Start debugging to see call stack'}
                  actionLabel={!isRunning ? 'Start Debug' : undefined}
                  onAction={!isRunning ? () => startDebugMutation.mutate(undefined) : undefined}
                />
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
