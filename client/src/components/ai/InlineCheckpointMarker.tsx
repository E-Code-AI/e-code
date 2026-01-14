import { useState } from 'react';
import { RotateCcw, Check, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface InlineCheckpointMarkerProps {
  checkpointId?: number;
  messageId?: string;
  projectId: number;
  cost?: number;
  tokens?: number;
  timestamp?: Date;
  isLatest?: boolean;
  onRollback?: () => void;
}

export function InlineCheckpointMarker({
  checkpointId,
  messageId,
  projectId,
  cost = 0,
  tokens = 0,
  timestamp,
  isLatest = false,
  onRollback
}: InlineCheckpointMarkerProps) {
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const handleRollback = async () => {
    if (!checkpointId) return;
    
    setIsRollingBack(true);
    try {
      await apiRequest('POST', `/api/checkpoints/${checkpointId}/rollback`);
      toast({
        title: 'Rolled back',
        description: 'Project restored to this checkpoint'
      });
      onRollback?.();
    } catch (error) {
      toast({
        title: 'Rollback failed',
        description: 'Could not restore checkpoint',
        variant: 'destructive'
      });
    } finally {
      setIsRollingBack(false);
      setShowConfirm(false);
    }
  };

  const formatCost = (amount: number) => {
    if (amount === 0) return 'Free';
    if (amount < 0.01) return '<$0.01';
    return `$${amount.toFixed(2)}`;
  };

  const formatTokens = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatTime = (date?: Date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex items-center justify-center py-1.5 my-1">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
        <div className="h-px w-8 bg-border/40" />
        
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full",
                  "bg-muted/30 hover:bg-muted/50 transition-colors",
                  "cursor-default select-none"
                )}
              >
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Checkpoint</span>
                {timestamp && (
                  <span className="text-muted-foreground/40">
                    {formatTime(timestamp)}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              className="p-0 overflow-hidden"
              sideOffset={4}
            >
              <div className="bg-popover border rounded-lg shadow-lg min-w-[180px]">
                <div className="px-3 py-2 border-b border-border/50">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Usage for this step</span>
                  </div>
                </div>
                <div className="px-3 py-2 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Cost</span>
                    <span className="font-medium">{formatCost(cost)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Tokens</span>
                    <span className="font-medium">{formatTokens(tokens)}</span>
                  </div>
                  {timestamp && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">{formatTime(timestamp)}</span>
                    </div>
                  )}
                </div>
                {checkpointId && !isLatest && (
                  <div className="px-3 py-2 border-t border-border/50">
                    {showConfirm ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Rollback?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-6 px-2 text-xs"
                          onClick={handleRollback}
                          disabled={isRollingBack}
                        >
                          {isRollingBack ? 'Rolling back...' : 'Yes'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => setShowConfirm(false)}
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full h-7 text-xs gap-1.5"
                        onClick={() => setShowConfirm(true)}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Rollback to here
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-px w-8 bg-border/40" />
      </div>
    </div>
  );
}

export function CheckpointDivider({ 
  cost, 
  tokens,
  label = "Checkpoint saved"
}: { 
  cost?: number; 
  tokens?: number;
  label?: string;
}) {
  const formatCost = (amount: number) => {
    if (amount === 0) return 'Free';
    if (amount < 0.01) return '<$0.01';
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="flex items-center justify-center py-2 my-1">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
        <div className="h-px w-12 bg-border/30" />
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-default">
                <Check className="w-3 h-3 text-emerald-500/70" />
                <span>{label}</span>
              </div>
            </TooltipTrigger>
            {(cost !== undefined || tokens !== undefined) && (
              <TooltipContent side="top" className="text-xs">
                <div className="flex items-center gap-2">
                  {cost !== undefined && <span>{formatCost(cost)}</span>}
                  {tokens !== undefined && <span>• {tokens.toLocaleString()} tokens</span>}
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <div className="h-px w-12 bg-border/30" />
      </div>
    </div>
  );
}
