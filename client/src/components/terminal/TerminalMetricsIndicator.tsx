import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Activity, AlertTriangle, CheckCircle2, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useTerminalHealth, useTerminalMetrics } from '@/hooks/use-terminal-metrics';
import { cn } from '@/lib/utils';

interface TerminalMetricsIndicatorProps {
  className?: string;
  showDetailed?: boolean;
  compact?: boolean;
}

export function TerminalMetricsIndicator({
  className,
  showDetailed = false,
  compact = false
}: TerminalMetricsIndicatorProps) {
  const { data: healthData, isLoading: healthLoading } = useTerminalHealth({
    refetchInterval: 10000
  });
  
  const { data: metricsData, isLoading: metricsLoading } = useTerminalMetrics({
    enabled: showDetailed,
    refetchInterval: 5000
  });

  if (healthLoading && !healthData) {
    return null;
  }

  const health = healthData?.status || 'unknown';
  const utilizationPercent = healthData?.metrics?.utilizationPercent || 0;
  const activeSessions = healthData?.metrics?.activeSessions || 0;
  const maxSessions = healthData?.metrics?.maxSessions || 100;

  // Determine health status icon and color
  const getHealthIcon = () => {
    switch (health) {
      case 'healthy':
        return <CheckCircle2 className="h-3 w-3" data-testid="icon-health-healthy" />;
      case 'degraded':
        return <AlertTriangle className="h-3 w-3" data-testid="icon-health-degraded" />;
      case 'unhealthy':
        return <XCircle className="h-3 w-3" data-testid="icon-health-unhealthy" />;
      default:
        return <Activity className="h-3 w-3" data-testid="icon-health-unknown" />;
    }
  };

  const getHealthColor = () => {
    switch (health) {
      case 'healthy':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
      case 'degraded':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
      case 'unhealthy':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    }
  };

  const getCapacityColor = () => {
    if (utilizationPercent < 50) return 'text-green-600 dark:text-green-400';
    if (utilizationPercent < 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium cursor-help rounded-md border px-2.5 py-0.5 transition-colors',
                getHealthColor(),
                className
              )}
              data-testid="terminal-metrics-indicator-compact"
            >
              {getHealthIcon()}
              <span className={getCapacityColor()} data-testid="text-capacity">
                {activeSessions}/{maxSessions}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">Terminal Health:</span>
                <span className="text-xs font-medium capitalize">{health}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">Active Sessions:</span>
                <span className="text-xs font-medium">{activeSessions} / {maxSessions}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">Capacity Used:</span>
                <span className="text-xs font-medium">{utilizationPercent.toFixed(1)}%</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detailed view
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 bg-card',
        className
      )}
      data-testid="terminal-metrics-indicator-detailed"
    >
      {/* Health Status */}
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn('flex items-center gap-1.5', getHealthColor())}
          data-testid="badge-health-status"
        >
          {getHealthIcon()}
          <span className="capitalize text-xs">{health}</span>
        </Badge>
      </div>

      {/* Capacity */}
      <div className="flex items-center gap-2 text-sm">
        <Activity className="h-4 w-4 text-muted-foreground" data-testid="icon-activity" />
        <span className="text-muted-foreground">Capacity:</span>
        <span className={cn('font-medium', getCapacityColor())} data-testid="text-capacity-detailed">
          {activeSessions}/{maxSessions}
        </span>
        <span className="text-muted-foreground text-xs">
          ({utilizationPercent.toFixed(1)}%)
        </span>
      </div>

      {/* Backpressure indicator */}
      {metricsData?.metrics?.health?.underBackpressure && (
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
          data-testid="badge-backpressure"
        >
          <TrendingUp className="h-3 w-3" />
          <span className="text-xs">High Load</span>
        </Badge>
      )}

      {/* Session metrics (if available) */}
      {showDetailed && metricsData?.metrics?.sessions && metricsData.metrics.sessions.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
          <TrendingDown className="h-3 w-3" />
          <span data-testid="text-sessions-count">
            {metricsData.metrics.sessions.length} active sessions
          </span>
        </div>
      )}
    </div>
  );
}
