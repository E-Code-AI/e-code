// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Cpu, 
  HardDrive, 
  Wifi, 
  AlertTriangle,
  Activity,
  Zap,
  TrendingUp,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResourceMonitorProps {
  projectId: number;
  className?: string;
}

interface ResourceUsage {
  cpu: {
    usage: number;
    limit: number;
    unit: string;
  };
  memory: {
    usage: number;
    limit: number;
    unit: string;
  };
  storage: {
    usage: number;
    limit: number;
    unit: string;
  };
  bandwidth: {
    usage: number;
    limit: number;
    unit: string;
  };
  uptime: number;
  status: 'running' | 'idle' | 'stopped';
}

export function ResourceMonitor({ projectId, className }: ResourceMonitorProps) {
  const [resources, setResources] = useState<ResourceUsage>({
    cpu: { usage: 0, limit: 100, unit: '%' },
    memory: { usage: 0, limit: 2048, unit: 'MB' },
    storage: { usage: 0, limit: 10240, unit: 'MB' },
    bandwidth: { usage: 0, limit: 1024, unit: 'MB' },
    uptime: 0,
    status: 'idle'
  });

  useEffect(() => {
    // Simulate resource usage updates
    const interval = setInterval(() => {
      setResources(prev => ({
        cpu: {
          ...prev.cpu,
          usage: Math.min(prev.cpu.limit, Math.max(0, prev.cpu.usage + (Math.random() - 0.5) * 10))
        },
        memory: {
          ...prev.memory,
          usage: Math.min(prev.memory.limit, Math.max(100, prev.memory.usage + (Math.random() - 0.5) * 50))
        },
        storage: {
          ...prev.storage,
          usage: Math.min(prev.storage.limit, prev.storage.usage + Math.random() * 0.1)
        },
        bandwidth: {
          ...prev.bandwidth,
          usage: Math.min(prev.bandwidth.limit, prev.bandwidth.usage + Math.random() * 0.5)
        },
        uptime: prev.uptime + 1,
        status: 'running'
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [projectId]);

  const getPercentage = (usage: number, limit: number) => {
    return Math.round((usage / limit) * 100);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Resource Monitor
          </CardTitle>
          <Badge 
            variant={resources.status === 'running' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {resources.status === 'running' && <Zap className="h-3 w-3 mr-1" />}
            {resources.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CPU Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">CPU</span>
            </div>
            <span className={cn("font-mono", getStatusColor(getPercentage(resources.cpu.usage, resources.cpu.limit)))}>
              {resources.cpu.usage.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={getPercentage(resources.cpu.usage, resources.cpu.limit)} 
            className="h-2"
          />
        </div>

        {/* Memory Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Memory</span>
            </div>
            <span className={cn("font-mono", getStatusColor(getPercentage(resources.memory.usage, resources.memory.limit)))}>
              {resources.memory.usage.toFixed(0)} / {resources.memory.limit} MB
            </span>
          </div>
          <Progress 
            value={getPercentage(resources.memory.usage, resources.memory.limit)} 
            className="h-2"
          />
        </div>

        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Storage</span>
            </div>
            <span className={cn("font-mono", getStatusColor(getPercentage(resources.storage.usage, resources.storage.limit)))}>
              {(resources.storage.usage / 1024).toFixed(1)} / {(resources.storage.limit / 1024).toFixed(0)} GB
            </span>
          </div>
          <Progress 
            value={getPercentage(resources.storage.usage, resources.storage.limit)} 
            className="h-2"
          />
        </div>

        {/* Bandwidth Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Bandwidth</span>
            </div>
            <span className={cn("font-mono", getStatusColor(getPercentage(resources.bandwidth.usage, resources.bandwidth.limit)))}>
              {resources.bandwidth.usage.toFixed(1)} / {resources.bandwidth.limit} MB
            </span>
          </div>
          <Progress 
            value={getPercentage(resources.bandwidth.usage, resources.bandwidth.limit)} 
            className="h-2"
          />
        </div>

        {/* Uptime */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span>Uptime</span>
            </div>
            <span className="font-mono">{formatUptime(resources.uptime)}</span>
          </div>
        </div>

        {/* Alerts */}
        {(getPercentage(resources.cpu.usage, resources.cpu.limit) > 80 ||
          getPercentage(resources.memory.usage, resources.memory.limit) > 80) && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              High resource usage detected. Consider optimizing your code or upgrading your plan.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}