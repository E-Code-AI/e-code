import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Pause, Play, Square, Loader2, AlertTriangle } from 'lucide-react';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { useToast } from '@/hooks/use-toast';

interface PauseResumeControlProps {
  sessionId: string | null;
  isRunning: boolean;
  onStateChange?: (state: 'running' | 'paused' | 'stopped') => void;
}

type AgentState = 'idle' | 'running' | 'pausing' | 'paused' | 'resuming' | 'stopping' | 'stopped';

export function PauseResumeControl({ 
  sessionId, 
  isRunning, 
  onStateChange 
}: PauseResumeControlProps) {
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [pauseReason, setPauseReason] = useState<string>('');
  const [canResume, setCanResume] = useState(true);
  const { toast } = useToast();
  
  const isEnabled = useFeatureFlag('aiUx.pauseResume');
  
  useEffect(() => {
    if (isRunning && agentState === 'idle') {
      setAgentState('running');
    } else if (!isRunning && agentState === 'running') {
      setAgentState('idle');
    }
  }, [isRunning, agentState]);
  
  const handlePause = async () => {
    if (!sessionId) return;
    
    setAgentState('pausing');
    
    try {
      const response = await fetch(`/api/ai/agent/${sessionId}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          reason: 'user_requested',
          preserveState: true 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to pause agent');
      }
      
      const result = await response.json();
      setAgentState('paused');
      setPauseReason(result.reason || 'Paused by user');
      setCanResume(result.canResume !== false);
      
      onStateChange?.('paused');
      
      toast({
        title: "Agent Paused",
        description: "AI agent has been paused. You can resume later.",
      });
    } catch (error) {
      console.error('Error pausing agent:', error);
      setAgentState('running');
      toast({
        title: "Failed to Pause",
        description: "Could not pause the AI agent. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleResume = async () => {
    if (!sessionId || !canResume) return;
    
    setAgentState('resuming');
    
    try {
      const response = await fetch(`/api/ai/agent/${sessionId}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to resume agent');
      }
      
      setAgentState('running');
      setPauseReason('');
      
      onStateChange?.('running');
      
      toast({
        title: "Agent Resumed",
        description: "AI agent has resumed from where it left off.",
      });
    } catch (error) {
      console.error('Error resuming agent:', error);
      setAgentState('paused');
      toast({
        title: "Failed to Resume",
        description: "Could not resume the AI agent. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleStop = async () => {
    if (!sessionId) return;
    
    setAgentState('stopping');
    
    try {
      const response = await fetch(`/api/ai/agent/${sessionId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          reason: 'user_requested',
          preserveState: false 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop agent');
      }
      
      setAgentState('stopped');
      setPauseReason('');
      
      onStateChange?.('stopped');
      
      toast({
        title: "Agent Stopped",
        description: "AI agent has been stopped completely.",
      });
    } catch (error) {
      console.error('Error stopping agent:', error);
      setAgentState(agentState === 'paused' ? 'paused' : 'running');
      toast({
        title: "Failed to Stop",
        description: "Could not stop the AI agent. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  if (!isEnabled || !sessionId) {
    return null;
  }
  
  const getStateDisplay = () => {
    switch (agentState) {
      case 'running':
        return { text: 'Running', variant: 'default' as const, color: 'bg-green-500' };
      case 'pausing':
        return { text: 'Pausing...', variant: 'secondary' as const, color: 'bg-yellow-500' };
      case 'paused':
        return { text: 'Paused', variant: 'secondary' as const, color: 'bg-yellow-500' };
      case 'resuming':
        return { text: 'Resuming...', variant: 'secondary' as const, color: 'bg-blue-500' };
      case 'stopping':
        return { text: 'Stopping...', variant: 'destructive' as const, color: 'bg-red-500' };
      case 'stopped':
        return { text: 'Stopped', variant: 'destructive' as const, color: 'bg-gray-500' };
      default:
        return { text: 'Idle', variant: 'outline' as const, color: 'bg-gray-400' };
    }
  };
  
  const stateDisplay = getStateDisplay();
  
  return (
    <div className="flex items-center gap-2 p-2 border rounded-lg bg-white">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${stateDisplay.color}`} />
        <Badge variant={stateDisplay.variant}>{stateDisplay.text}</Badge>
      </div>
      
      {pauseReason && (
        <Tooltip>
          <TooltipTrigger>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{pauseReason}</p>
          </TooltipContent>
        </Tooltip>
      )}
      
      <div className="flex items-center gap-1 ml-auto">
        {agentState === 'running' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePause}
                className="gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Pause the AI agent (can be resumed later)</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {agentState === 'paused' && canResume && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResume}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Resume the AI agent from where it was paused</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {(agentState === 'running' || agentState === 'paused') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStop}
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Stop the AI agent completely (cannot be resumed)</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {(agentState === 'pausing' || agentState === 'resuming' || agentState === 'stopping') && (
          <Button variant="outline" size="sm" disabled className="gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {agentState === 'pausing' && 'Pausing...'}
            {agentState === 'resuming' && 'Resuming...'}
            {agentState === 'stopping' && 'Stopping...'}
          </Button>
        )}
      </div>
    </div>
  );
}