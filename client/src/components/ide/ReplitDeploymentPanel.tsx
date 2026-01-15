import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  Rocket,
  Globe,
  Server,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
  Zap,
  Copy,
  Play,
  Square,
  RotateCcw,
  Pause,
  Trash2,
  Filter,
  ArrowDown,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Timer,
  DollarSign,
  Wifi,
  WifiOff,
  FileText,
  Terminal,
  Info,
  History,
  ArrowLeft,
  Shield,
  Link2,
  CheckCircle2,
} from 'lucide-react';

interface ReplitDeploymentPanelProps {
  projectId: string;
  className?: string;
  defaultTab?: 'deploy' | 'logs' | 'analytics';
}

type InternalStatus = 'pending' | 'building' | 'deploying' | 'deployed' | 'active' | 'failed' | 'stopped';
type UIStatus = 'idle' | 'publishing' | 'live' | 'failed' | 'needs-republish';

interface Deployment {
  id: string;
  deploymentId?: string;
  projectId: string;
  status: InternalStatus;
  uiStatus?: UIStatus;
  url?: string;
  domain?: string;
  customDomain?: string;
  environment: string;
  region?: string;
  type?: string;
  createdAt: string;
  updatedAt?: string;
  deployedAt?: string;
  lastCodeChange?: string;
  buildLogs?: string[];
  deploymentLogs?: string[];
}

function translateStatusToUI(internalStatus: string, lastCodeChange?: string, deployedAt?: string): UIStatus {
  switch (internalStatus) {
    case 'pending':
    case 'building':
    case 'deploying':
      return 'publishing';
    case 'active':
    case 'deployed':
      if (lastCodeChange && deployedAt) {
        const codeChangeTime = new Date(lastCodeChange).getTime();
        const deployedTime = new Date(deployedAt).getTime();
        if (codeChangeTime > deployedTime) {
          return 'needs-republish';
        }
      }
      return 'live';
    case 'failed':
      return 'failed';
    case 'stopped':
      return 'idle';
    default:
      return 'idle';
  }
}

interface LogEntry {
  id: string;
  type: 'build' | 'deploy';
  message: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

interface DeploymentAnalytics {
  summary: {
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    avgResponseTime: number;
    uptime: number;
    bandwidth: {
      incoming: number;
      outgoing: number;
      total: number;
    };
  };
  latency: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
    min: number;
  };
  costs: {
    period: string;
    compute: number;
    bandwidth: number;
    storage: number;
    total: number;
    currency: string;
    projectedMonthly: number;
  };
  timeSeries: Array<{
    timestamp: string;
    requests: number;
    errors: number;
    latencyP50: number;
    latencyP99: number;
  }>;
}

type TimePeriod = '1h' | '6h' | '24h' | '7d' | '30d';

const WEBSOCKET_RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function ReplitDeploymentPanel({ 
  projectId, 
  className, 
  defaultTab = 'deploy' 
}: ReplitDeploymentPanelProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [deployType, setDeployType] = useState<'static' | 'autoscale' | 'reserved-vm'>('autoscale');
  const [customDomain, setCustomDomain] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'staging'>('production');
  const [region, setRegion] = useState('us-east-1');
  const [isDeploying, setIsDeploying] = useState(false);
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('24h');
  
  const [showHistory, setShowHistory] = useState(false);
  const [dnsVerificationStatus, setDnsVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
  const [dnsRecords, setDnsRecords] = useState<{ type: string; name: string; value: string; verified: boolean }[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const { data: latestDeployment, isLoading: isLoadingDeployment, refetch: refetchDeployment } = useQuery<{ 
    success: boolean; 
    deployment: Deployment 
  }>({
    queryKey: ['/api/projects', projectId, 'deployment', 'latest'],
    refetchInterval: isDeploying ? 3000 : false,
    enabled: !!projectId,
  });

  const { data: deploymentHistory, isLoading: isLoadingHistory } = useQuery<{ 
    success: boolean; 
    deployments: Deployment[] 
  }>({
    queryKey: ['/api/projects', projectId, 'deployments'],
    enabled: !!projectId,
  });

  const { data: analyticsData, isLoading: isLoadingAnalytics, refetch: refetchAnalytics } = useQuery<{
    success: boolean;
    analytics: DeploymentAnalytics;
    period: string;
  }>({
    queryKey: ['/api/projects', projectId, 'deployments', 'analytics', { period: timePeriod }],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/deployments/analytics?period=${timePeriod}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    enabled: !!projectId && activeTab === 'analytics',
  });

  const connectWebSocket = useCallback((deploymentId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'subscribe', deploymentId }));
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/deployments`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        reconnectAttempts.current = 0;
        ws.send(JSON.stringify({ action: 'subscribe', deploymentId }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'build_log' || message.type === 'deploy_log') {
            const newLog: LogEntry = {
              id: `${message.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: message.type === 'build_log' ? 'build' : 'deploy',
              message: message.data?.log || '',
              timestamp: message.data?.timestamp || new Date().toISOString(),
              level: detectLogLevel(message.data?.log || ''),
            };
            setLogs(prev => [...prev, newLog]);
          } else if (message.type === 'status_change') {
            refetchDeployment();
            const uiStatus = message.data?.uiStatus || translateStatusToUI(message.data?.status || '');
            const internalStatus = message.data?.status;
            
            if (uiStatus === 'live' || internalStatus === 'deployed' || internalStatus === 'active') {
              setIsDeploying(false);
              toast({ title: 'Deployment successful', description: 'Your app is now live!' });
            } else if (uiStatus === 'failed' || internalStatus === 'failed') {
              setIsDeploying(false);
              toast({ 
                title: 'Deployment failed', 
                description: 'Check the logs for more details',
                variant: 'destructive'
              });
            }
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current++;
          setTimeout(() => connectWebSocket(deploymentId), WEBSOCKET_RECONNECT_DELAY);
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
        fetchLogsViaHTTP(deploymentId);
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      fetchLogsViaHTTP(deploymentId);
    }
  }, [refetchDeployment]);

  const fetchLogsViaHTTP = useCallback(async (deploymentId: string) => {
    try {
      const response = await fetch(`/api/deployments/${deploymentId}/logs`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.logs && Array.isArray(data.logs)) {
          setLogs(data.logs.map((log: any) => ({
            ...log,
            level: log.level || detectLogLevel(log.message),
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch logs via HTTP:', error);
    }
  }, []);

  const detectLogLevel = (message: string): 'info' | 'warn' | 'error' | 'success' => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('error') || lowerMessage.includes('failed') || lowerMessage.includes('❌')) {
      return 'error';
    }
    if (lowerMessage.includes('warning') || lowerMessage.includes('warn') || lowerMessage.includes('⚠️')) {
      return 'warn';
    }
    if (lowerMessage.includes('success') || lowerMessage.includes('complete') || lowerMessage.includes('✓') || lowerMessage.includes('✅')) {
      return 'success';
    }
    return 'info';
  };

  useEffect(() => {
    const deploymentId = latestDeployment?.deployment?.deploymentId || latestDeployment?.deployment?.id;
    if (deploymentId && activeTab === 'logs') {
      connectWebSocket(deploymentId);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [latestDeployment?.deployment?.deploymentId, latestDeployment?.deployment?.id, activeTab, connectWebSocket]);

  useEffect(() => {
    if (isAutoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isAutoScroll]);

  const publishMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/projects/${projectId}/publish`, {
        customDomain: customDomain || undefined,
      });
    },
    onSuccess: () => {
      setIsDeploying(true);
      setLogs([]);
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      toast({ title: 'Publishing started', description: 'Your app is being deployed...' });
    },
    onError: (error: Error) => {
      if (error.message.includes('ALREADY_PUBLISHED')) {
        republishMutation.mutate(undefined);
      } else {
        toast({ title: 'Publish failed', description: error.message, variant: 'destructive' });
      }
    },
  });

  const republishMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/projects/${projectId}/republish`, {
        forceRebuild: false,
      });
    },
    onSuccess: () => {
      setIsDeploying(true);
      setLogs([]);
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      toast({ title: 'Republishing started', description: 'Updating your deployment...' });
    },
    onError: (error: Error) => {
      toast({ title: 'Republish failed', description: error.message, variant: 'destructive' });
    },
  });

  const deployMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/projects/${projectId}/deploy`, {
        type: deployType,
        environment,
        regions: [region],
        customDomain: customDomain || undefined,
        sslEnabled: true,
      });
    },
    onSuccess: () => {
      setIsDeploying(true);
      setLogs([]);
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      toast({ title: 'Deployment started', description: 'Your app is being deployed...' });
    },
    onError: (error: Error) => {
      toast({ title: 'Deployment failed', description: error.message, variant: 'destructive' });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (deploymentId: string) => {
      return apiRequest('POST', `/api/deployments/${deploymentId}/stop`);
    },
    onSuccess: () => {
      setIsDeploying(false);
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      toast({ title: 'Deployment stopped' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to stop deployment', description: error.message, variant: 'destructive' });
    },
  });

  const restartMutation = useMutation({
    mutationFn: async (deploymentId: string) => {
      return apiRequest('POST', `/api/deployments/${deploymentId}/restart`);
    },
    onSuccess: () => {
      setIsDeploying(true);
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      toast({ title: 'Deployment restarting' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to restart deployment', description: error.message, variant: 'destructive' });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async ({ deploymentId, version }: { deploymentId: string; version: string }) => {
      return apiRequest('POST', `/api/deployments/${deploymentId}/rollback`, {
        version,
        reason: `Rollback initiated from deployment panel`,
      });
    },
    onSuccess: () => {
      setIsDeploying(true);
      setLogs([]);
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      toast({ title: 'Rollback initiated', description: 'Rolling back to previous version...' });
    },
    onError: (error: Error) => {
      toast({ title: 'Rollback failed', description: error.message, variant: 'destructive' });
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      return apiRequest('POST', `/api/projects/${projectId}/domains/verify`, { domain });
    },
    onMutate: () => {
      setDnsVerificationStatus('verifying');
    },
    onSuccess: (data: any) => {
      if (data.verified) {
        setDnsVerificationStatus('verified');
        setDnsRecords(data.records || []);
        toast({ title: 'Domain verified', description: 'Your custom domain is configured correctly!' });
      } else {
        setDnsVerificationStatus('failed');
        setDnsRecords(data.records || []);
        toast({ title: 'Domain verification failed', description: 'Please check your DNS settings', variant: 'destructive' });
      }
    },
    onError: (error: Error) => {
      setDnsVerificationStatus('failed');
      toast({ title: 'Verification failed', description: error.message, variant: 'destructive' });
    },
  });

  const updateDomainMutation = useMutation({
    mutationFn: async (domain: string) => {
      return apiRequest('POST', `/api/projects/${projectId}/domains`, { customDomain: domain });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      toast({ title: 'Domain updated', description: 'Custom domain configuration saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update domain', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
      case 'active':
      case 'live':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'building':
      case 'deploying':
      case 'pending':
      case 'publishing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'stopped':
      case 'idle':
        return <Square className="h-4 w-4 text-gray-500" />;
      case 'needs-republish':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const variants: Record<string, string> = {
      deployed: 'bg-green-500/10 text-green-500 border-green-500/20',
      active: 'bg-green-500/10 text-green-500 border-green-500/20',
      live: 'bg-green-500/10 text-green-500 border-green-500/20',
      building: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      deploying: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      publishing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20',
      stopped: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
      idle: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
      'needs-republish': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    };
    return variants[status] || variants.pending;
  };
  
  const getDisplayStatus = (deployment: Deployment): string => {
    if (deployment.uiStatus) {
      return deployment.uiStatus;
    }
    return translateStatusToUI(deployment.status, deployment.lastCodeChange, deployment.deployedAt);
  };

  const getLogLevelClass = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400 bg-red-500/10';
      case 'warn':
        return 'text-yellow-400 bg-yellow-500/10';
      case 'success':
        return 'text-green-400 bg-green-500/10';
      default:
        return 'text-blue-400 bg-blue-500/10';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter(log => log.level === logFilter);
  }, [logs, logFilter]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const chartConfig: ChartConfig = {
    requests: {
      label: 'Requests',
      color: 'hsl(var(--chart-1))',
    },
    errors: {
      label: 'Errors',
      color: 'hsl(var(--chart-2))',
    },
    latencyP50: {
      label: 'P50 Latency',
      color: 'hsl(var(--chart-3))',
    },
    latencyP99: {
      label: 'P99 Latency',
      color: 'hsl(var(--chart-4))',
    },
  };

  const latencyChartData = useMemo(() => {
    if (!analyticsData?.analytics?.latency) return [];
    const { p50, p75, p90, p95, p99 } = analyticsData.analytics.latency;
    return [
      { percentile: 'P50', value: Math.round(p50), fill: 'hsl(var(--chart-1))' },
      { percentile: 'P75', value: Math.round(p75), fill: 'hsl(var(--chart-2))' },
      { percentile: 'P90', value: Math.round(p90), fill: 'hsl(var(--chart-3))' },
      { percentile: 'P95', value: Math.round(p95), fill: 'hsl(var(--chart-4))' },
      { percentile: 'P99', value: Math.round(p99), fill: 'hsl(var(--chart-5))' },
    ];
  }, [analyticsData]);

  const timeSeriesData = useMemo(() => {
    if (!analyticsData?.analytics?.timeSeries) return [];
    return analyticsData.analytics.timeSeries.map(item => ({
      ...item,
      time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));
  }, [analyticsData]);

  const deployment = latestDeployment?.deployment;
  const deploymentId = deployment?.deploymentId || deployment?.id;
  const displayStatus = deployment ? getDisplayStatus(deployment) : 'idle';
  const isActive = displayStatus === 'live' || displayStatus === 'needs-republish' || 
    deployment?.status === 'deployed' || deployment?.status === 'active';
  const isInProgress = displayStatus === 'publishing' || 
    deployment?.status === 'building' || deployment?.status === 'deploying' || deployment?.status === 'pending';

  return (
    <Card className={cn('h-full flex flex-col overflow-hidden', className)} data-testid="replit-deployment-panel">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          Deployments
          {wsConnected && activeTab === 'logs' && (
            <Badge variant="outline" className="ml-auto text-[11px] bg-green-500/10 text-green-500">
              <Wifi className="h-3 w-3 mr-1" />
              Live
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="h-full flex flex-col"
        >
          <TabsList className="mx-4 grid grid-cols-3 shrink-0" data-testid="deployment-tabs">
            <TabsTrigger value="deploy" data-testid="tab-deploy">
              <Rocket className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Deploy
            </TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">
              <Terminal className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deploy" className="flex-1 overflow-auto p-4 space-y-4 m-0" data-testid="deploy-tab-content">
            {isLoadingDeployment ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                {deployment && (
                  <Card className="border-primary/20" data-testid="current-deployment-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(displayStatus)}
                          <span className="font-medium text-[13px] sm:text-base">Current Deployment</span>
                        </div>
                        <Badge 
                          className={getStatusBadgeClass(displayStatus)}
                          data-testid="status-badge"
                        >
                          {displayStatus}
                        </Badge>
                      </div>

                      {deployment.url && (
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                          <a
                            href={deployment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] text-primary hover:underline flex items-center gap-1 break-all"
                            data-testid="link-deployment-url"
                          >
                            {deployment.url}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => copyToClipboard(deployment.url!)}
                            data-testid="button-copy-url"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {deployment.customDomain && (
                        <div className="flex items-center gap-2 mb-3 text-[13px] text-muted-foreground">
                          <span>Custom Domain:</span>
                          <span className="text-foreground">{deployment.customDomain}</span>
                        </div>
                      )}

                      {isInProgress && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                            <span>{deployment.status === 'building' ? 'Building...' : 'Deploying...'}</span>
                            <span>{deployment.status === 'building' ? '40%' : '80%'}</span>
                          </div>
                          <Progress 
                            value={deployment.status === 'building' ? 40 : 80} 
                            className="h-2" 
                            data-testid="progress-deployment"
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refetchDeployment()}
                          data-testid="button-refresh-deployment"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Refresh</span>
                        </Button>
                        
                        {isActive && deploymentId && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => stopMutation.mutate(deploymentId)}
                              disabled={stopMutation.isPending}
                              data-testid="button-stop-deployment"
                            >
                              {stopMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Square className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">Stop</span>
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => restartMutation.mutate(deploymentId)}
                              disabled={restartMutation.isPending}
                              data-testid="button-restart-deployment"
                            >
                              {restartMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">Restart</span>
                                </>
                              )}
                            </Button>
                          </>
                        )}
                        
                        {deployment.status === 'stopped' && deploymentId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restartMutation.mutate(deploymentId)}
                            disabled={restartMutation.isPending}
                            data-testid="button-start-deployment"
                          >
                            {restartMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Start</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deploy-type">Deployment Type</Label>
                    <Select 
                      value={deployType} 
                      onValueChange={(v) => setDeployType(v as typeof deployType)}
                    >
                      <SelectTrigger id="deploy-type" data-testid="select-deploy-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span>Static</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="autoscale">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            <span>Autoscale</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="reserved-vm">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            <span>Reserved VM</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="environment">Environment</Label>
                      <Select 
                        value={environment} 
                        onValueChange={(v) => setEnvironment(v as typeof environment)}
                      >
                        <SelectTrigger id="environment" data-testid="select-environment">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="production">Production</SelectItem>
                          <SelectItem value="staging">Staging</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="region">Region</Label>
                      <Select value={region} onValueChange={setRegion}>
                        <SelectTrigger id="region" data-testid="select-region">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="us-east-1">🇺🇸 US East (Virginia)</SelectItem>
                          <SelectItem value="us-west-2">🇺🇸 US West (Oregon)</SelectItem>
                          <SelectItem value="eu-west-1">🇪🇺 EU (Ireland)</SelectItem>
                          <SelectItem value="eu-central-1">🇩🇪 EU (Frankfurt)</SelectItem>
                          <SelectItem value="ap-southeast-1">🇸🇬 Asia Pacific (Singapore)</SelectItem>
                          <SelectItem value="ap-northeast-1">🇯🇵 Asia Pacific (Tokyo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Domain Settings
                    </Label>
                    
                    {deployment?.url && (
                      <div className="p-3 bg-muted/50 rounded-md border">
                        <div className="text-[11px] text-muted-foreground mb-1">Generated URL</div>
                        <div className="flex items-center gap-2">
                          <code className="text-[13px] font-mono text-primary break-all flex-1">
                            {deployment.url}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => copyToClipboard(deployment.url!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Input
                        id="custom-domain"
                        placeholder="myapp.example.com"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        className="flex-1"
                        data-testid="input-custom-domain"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (customDomain) {
                            verifyDomainMutation.mutate(customDomain);
                          }
                        }}
                        disabled={!customDomain || verifyDomainMutation.isPending}
                        data-testid="button-verify-domain"
                      >
                        {verifyDomainMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-1" />
                            Verify
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {dnsVerificationStatus !== 'idle' && (
                      <div className={cn(
                        'p-3 rounded-md border text-[13px]',
                        dnsVerificationStatus === 'verified' && 'bg-green-500/10 border-green-500/20 text-green-600',
                        dnsVerificationStatus === 'verifying' && 'bg-blue-500/10 border-blue-500/20 text-blue-600',
                        dnsVerificationStatus === 'failed' && 'bg-red-500/10 border-red-500/20 text-red-600'
                      )}>
                        <div className="flex items-center gap-2 mb-2">
                          {dnsVerificationStatus === 'verified' && <CheckCircle2 className="h-4 w-4" />}
                          {dnsVerificationStatus === 'verifying' && <Loader2 className="h-4 w-4 animate-spin" />}
                          {dnsVerificationStatus === 'failed' && <XCircle className="h-4 w-4" />}
                          <span className="font-medium">
                            {dnsVerificationStatus === 'verified' && 'Domain Verified'}
                            {dnsVerificationStatus === 'verifying' && 'Verifying DNS...'}
                            {dnsVerificationStatus === 'failed' && 'Verification Failed'}
                          </span>
                        </div>
                        
                        {dnsRecords.length > 0 && (
                          <div className="space-y-2 mt-2">
                            <div className="text-[11px] font-medium text-muted-foreground">Required DNS Records:</div>
                            {dnsRecords.map((record, idx) => (
                              <div key={idx} className="p-2 bg-background rounded text-[11px] font-mono">
                                <div className="flex items-center gap-2">
                                  {record.verified ? (
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-red-500" />
                                  )}
                                  <span>{record.type}</span>
                                  <span className="text-muted-foreground">{record.name}</span>
                                  <span className="text-primary break-all">{record.value}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {dnsVerificationStatus === 'verified' && customDomain && (
                          <Button
                            size="sm"
                            className="mt-2 w-full"
                            onClick={() => updateDomainMutation.mutate(customDomain)}
                            disabled={updateDomainMutation.isPending}
                          >
                            {updateDomainMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : null}
                            Save Domain Configuration
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Deployment History
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHistory(!showHistory)}
                        data-testid="button-toggle-history"
                      >
                        {showHistory ? 'Hide' : 'Show'}
                      </Button>
                    </div>
                    
                    {showHistory && (
                      <div className="space-y-2" data-testid="deployment-history">
                        {isLoadingHistory ? (
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <Skeleton key={i} className="h-16 w-full" />
                            ))}
                          </div>
                        ) : deploymentHistory?.deployments && deploymentHistory.deployments.length > 0 ? (
                          <ScrollArea className="max-h-[200px]">
                            <div className="space-y-2 pr-3">
                              {deploymentHistory.deployments.map((dep, idx) => {
                                const depStatus = getDisplayStatus(dep);
                                const depId = dep.deploymentId || dep.id;
                                const isCurrentDeployment = depId === deploymentId;
                                
                                return (
                                  <div
                                    key={dep.id}
                                    className={cn(
                                      'p-3 rounded-md border flex items-center justify-between gap-2',
                                      isCurrentDeployment && 'border-primary/40 bg-primary/5'
                                    )}
                                    data-testid={`deployment-history-item-${idx}`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        {getStatusIcon(depStatus)}
                                        <span className="text-[11px] font-mono truncate">
                                          {depId?.substring(0, 12)}...
                                        </span>
                                        <Badge variant="outline" className={cn('text-[10px] shrink-0', getStatusBadgeClass(depStatus))}>
                                          {depStatus}
                                        </Badge>
                                        {isCurrentDeployment && (
                                          <Badge variant="secondary" className="text-[10px] shrink-0">
                                            Current
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-muted-foreground">
                                        {dep.createdAt ? new Date(dep.createdAt).toLocaleString() : 'Unknown date'}
                                      </div>
                                    </div>
                                    
                                    {!isCurrentDeployment && depStatus !== 'failed' && depId && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0"
                                        onClick={() => {
                                          if (confirm(`Are you sure you want to rollback to deployment ${depId.substring(0, 8)}?`)) {
                                            rollbackMutation.mutate({ 
                                              deploymentId: deploymentId || depId, 
                                              version: depId 
                                            });
                                          }
                                        }}
                                        disabled={rollbackMutation.isPending}
                                        data-testid={`button-rollback-${idx}`}
                                      >
                                        {rollbackMutation.isPending ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            <ArrowLeft className="h-3 w-3 mr-1" />
                                            Rollback
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground text-[13px]">
                            No deployment history yet
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        if (isActive) {
                          republishMutation.mutate(undefined);
                        } else {
                          publishMutation.mutate(undefined);
                        }
                      }}
                      disabled={publishMutation.isPending || republishMutation.isPending || isDeploying}
                      data-testid="button-publish"
                    >
                      {publishMutation.isPending || republishMutation.isPending || isDeploying ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {isActive ? 'Republishing...' : 'Publishing...'}
                        </>
                      ) : (
                        <>
                          <Rocket className="h-4 w-4 mr-2" />
                          {isActive ? 'Republish' : 'Publish'}
                        </>
                      )}
                    </Button>
                    
                    {!isActive && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => deployMutation.mutate(undefined)}
                        disabled={deployMutation.isPending || isDeploying}
                        data-testid="button-deploy"
                      >
                        {deployMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deploying...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Deploy
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="logs" className="flex-1 flex flex-col overflow-hidden p-4 m-0 gap-3" data-testid="logs-tab-content">
            <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Select value={logFilter} onValueChange={(v) => setLogFilter(v as typeof logFilter)}>
                  <SelectTrigger className="w-[120px] h-8" data-testid="select-log-filter">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Logs</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
                
                {!wsConnected && (
                  <Badge variant="outline" className="text-[11px] bg-yellow-500/10 text-yellow-500">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAutoScroll(!isAutoScroll)}
                  className={cn(isAutoScroll && 'bg-accent')}
                  data-testid="button-toggle-autoscroll"
                >
                  {isAutoScroll ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLogs}
                  data-testid="button-clear-logs"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                {deploymentId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchLogsViaHTTP(deploymentId)}
                    data-testid="button-refresh-logs"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Badge variant="outline" className="text-[11px]">
                <FileText className="h-3 w-3 mr-1" />
                Build: {logs.filter(l => l.type === 'build').length}
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                <Terminal className="h-3 w-3 mr-1" />
                Deploy: {logs.filter(l => l.type === 'deploy').length}
              </Badge>
            </div>

            <ScrollArea className="flex-1 rounded-md border bg-muted/30" ref={logsContainerRef}>
              <div className="p-2 font-mono text-[11px] space-y-1" data-testid="logs-container">
                {filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Terminal className="h-8 w-8 mb-2 opacity-50" />
                    <p>No logs available</p>
                    <p className="text-[11px] mt-1">Logs will appear here during deployment</p>
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        'flex items-start gap-2 p-1.5 rounded text-[11px]',
                        getLogLevelClass(log.level)
                      )}
                      data-testid={`log-entry-${log.id}`}
                    >
                      <span className="text-muted-foreground shrink-0 w-16">
                        {new Date(log.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit' 
                        })}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-[10px] px-1 py-0 shrink-0',
                          log.type === 'build' ? 'bg-purple-500/10 text-purple-400' : 'bg-cyan-500/10 text-cyan-400'
                        )}
                      >
                        {log.type}
                      </Badge>
                      <span className="break-all">{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 overflow-auto p-4 space-y-4 m-0" data-testid="analytics-tab-content">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-medium text-[13px]">Deployment Analytics</h3>
              <div className="flex items-center gap-2">
                <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                  <SelectTrigger className="w-[100px] h-8" data-testid="select-time-period">
                    <Clock className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 hour</SelectItem>
                    <SelectItem value="6h">6 hours</SelectItem>
                    <SelectItem value="24h">24 hours</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchAnalytics()}
                  data-testid="button-refresh-analytics"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoadingAnalytics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </div>
            ) : analyticsData?.analytics ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card data-testid="metric-requests">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span className="text-[11px] text-muted-foreground">Requests</span>
                      </div>
                      <p className="text-[15px] font-bold mt-1">
                        {formatNumber(analyticsData.analytics.summary.totalRequests)}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card data-testid="metric-error-rate">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-[11px] text-muted-foreground">Error Rate</span>
                      </div>
                      <p className="text-[15px] font-bold mt-1">
                        {analyticsData.analytics.summary.errorRate.toFixed(2)}%
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card data-testid="metric-response-time">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <Timer className="h-4 w-4 text-green-500" />
                        <span className="text-[11px] text-muted-foreground">Avg Response</span>
                      </div>
                      <p className="text-[15px] font-bold mt-1">
                        {Math.round(analyticsData.analytics.summary.avgResponseTime)}ms
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card data-testid="metric-uptime">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <Activity className="h-4 w-4 text-purple-500" />
                        <span className="text-[11px] text-muted-foreground">Uptime</span>
                      </div>
                      <p className="text-[15px] font-bold mt-1">
                        {analyticsData.analytics.summary.uptime.toFixed(2)}%
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card data-testid="chart-latency">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[13px] font-medium">Latency Percentiles (ms)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[180px] w-full">
                      <BarChart data={latencyChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="percentile" type="category" width={40} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar 
                          dataKey="value" 
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card data-testid="chart-requests">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[13px] font-medium">Requests & Errors Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[180px] w-full">
                      <AreaChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="requests"
                          stroke="hsl(var(--chart-1))"
                          fill="hsl(var(--chart-1))"
                          fillOpacity={0.3}
                          name="Requests"
                        />
                        <Area
                          type="monotone"
                          dataKey="errors"
                          stroke="hsl(var(--chart-2))"
                          fill="hsl(var(--chart-2))"
                          fillOpacity={0.3}
                          name="Errors"
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card data-testid="cost-breakdown">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Cost Breakdown ({analyticsData.analytics.costs.period})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[13px]">
                        <span className="text-muted-foreground">Compute</span>
                        <span className="font-medium">${analyticsData.analytics.costs.compute.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[13px]">
                        <span className="text-muted-foreground">Bandwidth</span>
                        <span className="font-medium">${analyticsData.analytics.costs.bandwidth.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[13px]">
                        <span className="text-muted-foreground">Storage</span>
                        <span className="font-medium">${analyticsData.analytics.costs.storage.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total</span>
                        <span className="font-bold text-[15px]">${analyticsData.analytics.costs.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                        <span>Projected Monthly</span>
                        <span>${analyticsData.analytics.costs.projectedMonthly.toFixed(2)}/mo</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mb-3 opacity-50" />
                <p>No analytics data available</p>
                <p className="text-[11px] mt-1">Deploy your app to see analytics</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ReplitDeploymentPanel;
