import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Play, Square, RotateCcw, ChevronDown, Loader2, Check,
  Terminal, Globe, TestTube, Zap, Settings, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

interface Workflow {
  id: string;
  name: string;
  command: string;
  icon: typeof Play;
  description?: string;
  isDefault?: boolean;
  isRunning?: boolean;
}

interface EnhancedRunButtonProps {
  projectId: string;
  onRunStateChange?: (isRunning: boolean) => void;
  className?: string;
}

const DEFAULT_WORKFLOWS: Workflow[] = [
  { id: 'dev', name: 'Start Development', command: 'npm run dev', icon: Play, description: 'Start development server', isDefault: true },
  { id: 'build', name: 'Build', command: 'npm run build', icon: Zap, description: 'Build for production' },
  { id: 'test', name: 'Run Tests', command: 'npm test', icon: TestTube, description: 'Run test suite' },
  { id: 'preview', name: 'Preview', command: 'npm run preview', icon: Globe, description: 'Preview production build' },
];

export function EnhancedRunButton({ projectId, onRunStateChange, className }: EnhancedRunButtonProps) {
  const queryClient = useQueryClient();
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow>(DEFAULT_WORKFLOWS[0]);
  const [runDuration, setRunDuration] = useState(0);

  const { data: runStatus } = useQuery<{ isRunning: boolean; startedAt?: string; workflow?: string }>({
    queryKey: ['/api/preview/url', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/preview/url?projectId=${projectId}`, {
        credentials: 'include'
      });
      if (!response.ok) return { isRunning: false };
      const data = await response.json();
      return { 
        isRunning: data.status === 'running' || data.status === 'starting',
        startedAt: data.startedAt,
        workflow: data.workflow
      };
    },
    enabled: !!projectId,
    refetchInterval: 5000
  });

  const { data: customWorkflows } = useQuery<Workflow[]>({
    queryKey: ['/api/workflows', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/workflows?projectId=${projectId}`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!projectId
  });

  const startMutation = useMutation({
    mutationFn: async (workflow: Workflow) => {
      const response = await apiRequest('POST', `/api/preview/projects/${projectId}/preview/start`, {
        workflow: workflow.id,
        command: workflow.command
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: `Running: ${selectedWorkflow.name}` });
      queryClient.invalidateQueries({ queryKey: ['/api/preview/url', projectId] });
      onRunStateChange?.(true);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to start', description: error.message, variant: 'destructive' });
    }
  });

  const stopMutation = useMutation({
    mutationFn: async (_unused?: undefined) => {
      const response = await apiRequest('POST', `/api/preview/projects/${projectId}/preview/stop`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Stopped' });
      queryClient.invalidateQueries({ queryKey: ['/api/preview/url', projectId] });
      onRunStateChange?.(false);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to stop', description: error.message, variant: 'destructive' });
    }
  });

  const restartMutation = useMutation({
    mutationFn: async (_unused?: undefined) => {
      await fetch(`/api/preview/projects/${projectId}/preview/stop`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      await new Promise(resolve => setTimeout(resolve, 500));
      const response = await apiRequest('POST', `/api/preview/projects/${projectId}/preview/start`, {
        workflow: selectedWorkflow.id,
        command: selectedWorkflow.command
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Restarted' });
      queryClient.invalidateQueries({ queryKey: ['/api/preview/url', projectId] });
    }
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (runStatus?.isRunning && runStatus.startedAt) {
      const startTime = new Date(runStatus.startedAt).getTime();
      interval = setInterval(() => {
        setRunDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setRunDuration(0);
    }
    return () => clearInterval(interval);
  }, [runStatus?.isRunning, runStatus?.startedAt]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const isRunning = runStatus?.isRunning;
  const isPending = startMutation.isPending || stopMutation.isPending || restartMutation.isPending;
  const allWorkflows = [...DEFAULT_WORKFLOWS, ...(customWorkflows || [])];

  return (
    <div className={cn("flex items-center", className)}>
      <TooltipProvider>
        <div className="flex items-center rounded-md border bg-background shadow-sm">
          {isRunning ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => stopMutation.mutate(undefined)}
                    disabled={isPending}
                    className="h-8 px-3 rounded-r-none border-r text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    data-testid="button-stop"
                  >
                    {stopMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Stop</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => restartMutation.mutate(undefined)}
                    disabled={isPending}
                    className="h-8 px-2 rounded-none border-r"
                    data-testid="button-restart"
                  >
                    {restartMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Restart</TooltipContent>
              </Tooltip>

              <div className="px-2 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-600 dark:text-green-400">
                  Running
                </span>
                {runDuration > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 h-5">
                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                    {formatDuration(runDuration)}
                  </Badge>
                )}
              </div>
            </>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startMutation.mutate(selectedWorkflow)}
                    disabled={isPending}
                    className="h-8 px-3 rounded-r-none border-r text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                    data-testid="button-run"
                  >
                    {startMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Run {selectedWorkflow.name}</TooltipContent>
              </Tooltip>

              <div className="px-2 flex items-center gap-1">
                <span className="text-xs font-medium truncate max-w-[100px]">
                  {selectedWorkflow.name}
                </span>
              </div>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 rounded-l-none"
                data-testid="workflow-selector"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5" />
                Workflows
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allWorkflows.map((workflow) => {
                const Icon = workflow.icon || Terminal;
                const isSelected = selectedWorkflow.id === workflow.id;
                return (
                  <DropdownMenuItem
                    key={workflow.id}
                    onClick={() => setSelectedWorkflow(workflow)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      <div>
                        <p className="text-sm font-medium">{workflow.name}</p>
                        {workflow.description && (
                          <p className="text-xs text-muted-foreground">{workflow.description}</p>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-green-600" />}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-2 text-muted-foreground">
                <Settings className="h-3.5 w-3.5" />
                Configure Workflows
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipProvider>
    </div>
  );
}
