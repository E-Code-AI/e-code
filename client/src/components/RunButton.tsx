import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface RunButtonProps {
  projectId: number;
  language?: string;
  onRunning?: (running: boolean) => void;
}

export function RunButton({ projectId, language, onRunning }: RunButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  // Start project execution
  const runProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/run`);
      return res.json();
    },
    onSuccess: (data) => {
      setIsRunning(true);
      onRunning?.(true);
      toast({
        title: 'Project started',
        description: 'Your project is now running',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to run project',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Stop project execution
  const stopProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/stop`);
      return res.json();
    },
    onSuccess: () => {
      setIsRunning(false);
      onRunning?.(false);
      toast({
        title: 'Project stopped',
        description: 'Your project has been stopped',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to stop project',
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

  const isLoading = runProjectMutation.isPending || stopProjectMutation.isPending;

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      size="sm"
      className={`gap-2 font-medium ${
        isRunning 
          ? 'bg-red-600 hover:bg-red-700 text-white' 
          : 'bg-green-600 hover:bg-green-700 text-white'
      }`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {isRunning ? 'Stopping...' : 'Starting...'}
        </>
      ) : isRunning ? (
        <>
          <Square className="h-4 w-4" />
          Stop
        </>
      ) : (
        <>
          <Play className="h-4 w-4" />
          Run
        </>
      )}
    </Button>
  );
}