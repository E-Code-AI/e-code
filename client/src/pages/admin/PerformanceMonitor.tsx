// @ts-nocheck
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Server,
  TrendingUp,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
  stats: {
    totalRequests: number;
    totalErrors: number;
    overallSuccessRate: number;
    endpointStats: Record<string, any>;
  };
  system: {
    uptime: number;
    memory: any;
    cpu: any;
  };
}

interface Metric {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
}

export default function PerformanceMonitor() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<Metric[]>([]);

  // Fetch health status
  const { data: health, refetch: refetchHealth } = useQuery<HealthStatus>({
    queryKey: ['/api/monitoring/status'],
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // Fetch time series data
  const { data: timeSeries } = useQuery<{ data: any[] }>({
    queryKey: ['/api/monitoring/metrics/timeseries'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Setup real-time monitoring stream
  useEffect(() => {
    if (!autoRefresh) {
      eventSource?.close();
      setEventSource(null);
      return;
    }

    const es = new EventSource('/api/monitoring/stream');
    
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'metric') {
        setRealtimeMetrics(prev => [...prev.slice(-20), data.metric]);
      }
    };

    es.onerror = () => {
      es.close();
      setEventSource(null);
    };

    setEventSource(es);

    return () => {
      es.close();
    };
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'unhealthy':
        return 'text-red-500';
      default:
        return '';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Monitor</h1>
          <p className="text-muted-foreground">
            Real-time system performance and health metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchHealth()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      {/* System Status */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(health.status)}
              <span className={getStatusColor(health.status)}>
                System {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
              </span>
            </CardTitle>
            <CardDescription>
              Overall system health and performance status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {health.issues.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Performance Issues Detected</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {health.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatUptime(health.system.uptime)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    System running time
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {health.stats.overallSuccessRate.toFixed(1)}%
                  </div>
                  <Progress
                    value={health.stats.overallSuccessRate}
                    className="mt-2"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {health.stats.totalRequests.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    In the last 5 minutes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatBytes(health.system.memory.heapUsed)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    of {formatBytes(health.system.memory.heapTotal)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Time Chart */}
      {timeSeries?.data && timeSeries.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Response Time Trends</CardTitle>
            <CardDescription>
              Average response times over the last 10 minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeries.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Area
                  type="monotone"
                  dataKey="avgResponseTime"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                  name="Avg Response Time (ms)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Request Volume Chart */}
      {timeSeries?.data && timeSeries.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request Volume</CardTitle>
            <CardDescription>
              Number of requests and errors over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeries.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#82ca9d"
                  name="Requests"
                />
                <Line
                  type="monotone"
                  dataKey="errorCount"
                  stroke="#ff7c7c"
                  name="Errors"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Endpoint Performance */}
      {health?.stats.endpointStats && (
        <Card>
          <CardHeader>
            <CardTitle>Endpoint Performance</CardTitle>
            <CardDescription>
              Performance metrics for individual API endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(health.stats.endpointStats).map(([key, stat]: [string, any]) => (
                <div key={key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{stat.method}</Badge>
                      <span className="font-mono text-sm">{stat.endpoint}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        <Clock className="h-3 w-3 inline mr-1" />
                        {stat.avgResponseTime.toFixed(0)}ms avg
                      </span>
                      <span>
                        <Zap className="h-3 w-3 inline mr-1" />
                        {stat.p95.toFixed(0)}ms p95
                      </span>
                      <span className={stat.successRate < 95 ? 'text-red-500' : 'text-green-500'}>
                        {stat.successRate.toFixed(1)}% success
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground">
                    <div>Count: {stat.count}</div>
                    <div>Min: {stat.minResponseTime}ms</div>
                    <div>Max: {stat.maxResponseTime}ms</div>
                    <div>p50: {stat.p50}ms</div>
                    <div>p99: {stat.p99}ms</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Activity</CardTitle>
          <CardDescription>
            Live stream of API requests (last 20)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {realtimeMetrics.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Waiting for activity...
              </p>
            ) : (
              realtimeMetrics.map((metric, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={metric.statusCode >= 400 ? 'destructive' : 'default'}
                    >
                      {metric.statusCode}
                    </Badge>
                    <span className="font-mono text-sm">
                      {metric.method} {metric.endpoint}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{metric.responseTime}ms</span>
                    <span>{formatDistanceToNow(new Date(metric.timestamp))} ago</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}