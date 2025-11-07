import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Loader2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RunButtonProps {
  projectId: string | number; // Support both UUID strings and numeric IDs
  language?: string;
  onRunning?: (running: boolean, executionId?: string) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

interface RuntimeStatus {
  isRunning: boolean;
  status: 'starting' | 'running' | 'stopped' | 'error';
  url?: string;
}

export function RunButton({ 
  projectId, 
  language, 
  onRunning, 
  className,
  variant = 'default',
  size = 'default'
}: RunButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [localExecutionId, setLocalExecutionId] = useState<string | undefined>();
  const { toast } = useToast();

  // Poll runtime status from backend - REAL STATUS TRACKING
  const { data: runtimeStatus } = useQuery<RuntimeStatus>({
    queryKey: [`/api/runtime/${projectId}`],
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll more frequently when starting, less when running/stopped
      if (data?.status === 'starting') return 1000;
      if (data?.status === 'running') return 5000;
      return false; // Don't poll when stopped/error
    },
    enabled: !!projectId,
  });

  // Sync local state with backend status - BACKEND IS SOURCE OF TRUTH
  useEffect(() => {
    if (runtimeStatus) {
      const backendIsRunning = runtimeStatus.status === 'running' || runtimeStatus.status === 'starting';
      
      // Only update if backend status differs from local state
      if (backendIsRunning !== isRunning) {
        setIsRunning(backendIsRunning);
        
        // Use executionId from backend or local fallback
        const execId = localExecutionId;
        onRunning?.(backendIsRunning, execId);
      }
    }
  }, [runtimeStatus]);

  // Start project execution - REAL BACKEND
  const runProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/runtime/start`, {
        projectId,
        mainFile: undefined, // Will use auto-detection
        timeout: 30000 // 30 seconds timeout
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to start runtime');
      }
      return res.json();
    },
    onSuccess: async (data) => {
      // Store execution ID for stopping later
      const execId = data.executionId || `exec-${Date.now()}`;
      setLocalExecutionId(execId);
      (window as any).__currentExecutionId = execId;
      
      // CRITICAL: Invalidate query to force refetch and start polling
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/runtime/${projectId}`] 
      });
      
      toast({
        title: 'Starting runtime',
        description: 'Your project is starting...',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to start runtime',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Stop project execution - REAL BACKEND
  const stopProjectMutation = useMutation({
    mutationFn: async () => {
      const executionId = (window as any).__currentExecutionId || localExecutionId;
      const res = await apiRequest('POST', `/api/runtime/stop`, {
        projectId,
        executionId
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to stop runtime');
      }
      return res.json();
    },
    onSuccess: async () => {
      // Clear execution ID
      setLocalExecutionId(undefined);
      delete (window as any).__currentExecutionId;
      
      // CRITICAL: Invalidate query to force refetch and clear stale "running" status
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/runtime/${projectId}`] 
      });
      
      toast({
        title: 'Runtime stopped',
        description: 'Your project has been stopped',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to stop runtime',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleClick = () => {
    if (isRunning) {
      stopProjectMutation.mutate();
    } else {
      runProjectMutation.mutate();
    }
  };

  const isStarting = runtimeStatus?.status === 'starting';
  const isStartMutating = runProjectMutation.isPending;
  const isStopMutating = stopProjectMutation.isPending;
  const isLoading = isStartMutating || isStopMutating || isStarting;

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      size={size}
      variant={isRunning ? "destructive" : variant}
      className={cn("gap-2 font-medium", className)}
      data-testid={isRunning ? "button-stop-runtime" : "button-run-runtime"}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">
            {isStopMutating ? 'Stopping...' : 'Starting...'}
          </span>
        </>
      ) : isRunning ? (
        <>
          <Square className="h-4 w-4" />
          <span className="hidden sm:inline">Stop</span>
        </>
      ) : (
        <>
          <Play className="h-4 w-4" />
          <span className="hidden sm:inline">Run</span>
        </>
      )}
    </Button>
  );
}