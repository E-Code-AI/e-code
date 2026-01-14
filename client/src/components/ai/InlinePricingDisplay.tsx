import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InlinePricingDisplayProps {
  projectId: number | string;
  className?: string;
  onClose?: () => void;
}

interface SessionPricing {
  totalCost: number;
  tokensUsed: number;
  requestCount: number;
}

export function InlinePricingDisplay({ projectId, className, onClose }: InlinePricingDisplayProps) {
  const { data } = useQuery<SessionPricing>({
    queryKey: ['/api/ai-usage/session', projectId],
    enabled: !!projectId,
    staleTime: 10000,
    refetchInterval: 30000,
  });

  const cost = data?.totalCost || 0;
  const tokens = data?.tokensUsed || 0;
  const requests = data?.requestCount || 0;

  const formatCost = (c: number) => {
    if (c < 0.01) return '<$0.01';
    return `$${c.toFixed(2)}`;
  };

  const formatTokens = (t: number) => {
    if (t >= 1000000) return `${(t / 1000000).toFixed(1)}M`;
    if (t >= 1000) return `${(t / 1000).toFixed(1)}K`;
    return t.toString();
  };

  return (
    <div className={cn("flex items-center gap-3 py-1.5 px-2 rounded-md bg-muted/30 border border-border/40", className)}>
      <Zap className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
      <div className="flex items-center gap-3 text-xs flex-1">
        <span className="text-muted-foreground">
          Session: <span className="text-foreground font-medium">{formatCost(cost)}</span>
        </span>
        <span className="text-muted-foreground/60">|</span>
        <span className="text-muted-foreground">
          {formatTokens(tokens)} tokens
        </span>
        <span className="text-muted-foreground/60">|</span>
        <span className="text-muted-foreground">
          {requests} requests
        </span>
      </div>
      {onClose && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground"
          onClick={onClose}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
