// @ts-nocheck
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  Globe, RefreshCw, Shield, AlertTriangle, Sparkles, ChevronDown, Rocket,
  Terminal, Laptop, Database, Activity, Package, MoreVertical,
  ExternalLink, Lock, Clock, Server, History, Eye, EyeOff,
  X, Edit2, Search, Play, Pause, Calendar, Filter, Bot, Settings,
  AlertCircle, ChevronRight, WrapText, Monitor, ArrowUpDown,
  SlidersHorizontal, MoreHorizontal, Link, Download, Plus,
  TrendingUp, TrendingDown, CheckCircle2, XCircle, Zap,
  HardDrive, Cpu, Wifi, Timer, GitBranch, GitCommit, Users,
  Cloud, CloudOff, BarChart3, LineChart as LineChartIcon,
  PieChart as PieChartIcon, Hash, Code2, Layers, Copy,
  GitMerge, GitPullRequest, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Deployment } from '@shared/schema';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import { cn } from '@/lib/utils';
import deploymentImagePath from '@assets/stock_images/cloud_computing_tech_179a9c59.jpg';

// Mock data for metrics
const uptimeData = [
  { time: '00:00', uptime: 100 },
  { time: '04:00', uptime: 99.9 },
  { time: '08:00', uptime: 100 },
  { time: '12:00', uptime: 99.8 },
  { time: '16:00', uptime: 100 },
  { time: '20:00', uptime: 99.95 },
  { time: '24:00', uptime: 100 },
];

const responseTimeData = [
  { time: '00:00', p50: 120, p95: 450, p99: 890 },
  { time: '04:00', p50: 115, p95: 420, p99: 850 },
  { time: '08:00', p50: 135, p95: 480, p99: 920 },
  { time: '12:00', p50: 145, p95: 510, p99: 980 },
  { time: '16:00', p50: 130, p95: 470, p99: 900 },
  { time: '20:00', p50: 125, p95: 460, p99: 880 },
  { time: '24:00', p50: 118, p95: 440, p99: 860 },
];

const requestVolumeData = [
  { day: 'Mon', requests: 45000, errors: 120 },
  { day: 'Tue', requests: 52000, errors: 95 },
  { day: 'Wed', requests: 48000, errors: 105 },
  { day: 'Thu', requests: 61000, errors: 88 },
  { day: 'Fri', requests: 58000, errors: 92 },
  { day: 'Sat', requests: 32000, errors: 45 },
  { day: 'Sun', requests: 28000, errors: 38 },
];

const errorRateData = [
  { time: '00:00', rate: 0.02 },
  { time: '04:00', rate: 0.01 },
  { time: '08:00', rate: 0.03 },
  { time: '12:00', rate: 0.05 },
  { time: '16:00', rate: 0.02 },
  { time: '20:00', rate: 0.01 },
  { time: '24:00', rate: 0.01 },
];

const resourceUsageData = [
  { name: 'CPU', value: 65, color: '#3b82f6' },
  { name: 'Memory', value: 72, color: '#10b981' },
  { name: 'Storage', value: 45, color: '#f59e0b' },
  { name: 'Network', value: 38, color: '#8b5cf6' },
];

// Mock deployment history
const deploymentHistory = [
  {
    id: 1,
    version: 'v2.1.0',
    status: 'success',
    environment: 'production',
    deployedBy: 'John Doe',
    timestamp: '2025-10-21T08:30:00Z',
    commitHash: 'abc123',
    duration: '2m 15s',
  },
  {
    id: 2,
    version: 'v2.0.9',
    status: 'failed',
    environment: 'production',
    deployedBy: 'Jane Smith',
    timestamp: '2025-10-20T14:45:00Z',
    commitHash: 'def456',
    duration: '1m 45s',
    error: 'Build failed: Missing dependencies',
  },
  {
    id: 3,
    version: 'v2.0.8',
    status: 'success',
    environment: 'staging',
    deployedBy: 'Mike Johnson',
    timestamp: '2025-10-20T10:15:00Z',
    commitHash: 'ghi789',
    duration: '3m 02s',
  },
  {
    id: 4,
    version: 'v2.0.7',
    status: 'success',
    environment: 'production',
    deployedBy: 'Sarah Wilson',
    timestamp: '2025-10-19T16:20:00Z',
    commitHash: 'jkl012',
    duration: '2m 48s',
  },
  {
    id: 5,
    version: 'v2.0.6',
    status: 'rollback',
    environment: 'production',
    deployedBy: 'System',
    timestamp: '2025-10-18T09:00:00Z',
    commitHash: 'mno345',
    duration: '1m 12s',
  },
];

// Get status color and icon
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'success':
    case 'deployed':
      return { color: 'text-green-600 bg-green-100 dark:bg-green-950', icon: CheckCircle2 };
    case 'failed':
    case 'error':
      return { color: 'text-red-600 bg-red-100 dark:bg-red-950', icon: XCircle };
    case 'pending':
    case 'building':
      return { color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950', icon: Clock };
    case 'rollback':
      return { color: 'text-orange-600 bg-orange-100 dark:bg-orange-950', icon: GitBranch };
    default:
      return { color: 'text-gray-600 bg-gray-100 dark:bg-gray-950', icon: AlertCircle };
  }
};

export default function Deployments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const params = useParams();
  const [, navigate] = useLocation();
  const [selectedEnvironment, setSelectedEnvironment] = useState('production');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [wrapText, setWrapText] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [showEnvVars, setShowEnvVars] = useState(false);
  
  // Fetch deployments
  const { data: deployments, isLoading } = useQuery<any[]>({
    queryKey: ['/api/user/deployments/recent'],
  });
  
  // Get current deployment for the selected environment
  const currentDeployment = useMemo(() => {
    const mockDeployment = {
      id: 1,
      projectId: 'project-1',
      project: 'E-Commerce Platform',
      status: 'deployed',
      environment: selectedEnvironment,
      url: `https://e-commerce-${selectedEnvironment}.e-code.dev`,
      version: 'v2.1.0',
      visibility: 'public',
      time: '2 hours ago',
      metrics: {
        uptime: 99.95,
        avgResponseTime: 125,
        totalRequests: 324000,
        errorRate: 0.02,
        cpuUsage: 65,
        memoryUsage: 72,
        storageUsage: 45,
        networkUsage: 38,
      },
    };
    
    return deployments?.[0] || mockDeployment;
  }, [deployments, selectedEnvironment]);

  // Redeploy mutation
  const redeployMutation = useMutation({
    mutationFn: async () => {
      if (!currentDeployment?.id) return;
      return await apiRequest('POST', `/api/deployment/${currentDeployment.projectId}`, {
        type: 'autoscale',
        environment: selectedEnvironment,
        customDomain: null,
        sslEnabled: true,
        envVars: {},
      });
    },
    onSuccess: () => {
      toast({
        title: "Redeployment Started",
        description: `Deploying to ${selectedEnvironment}...`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/deployments/recent'] });
    },
    onError: (error: any) => {
      toast({
        title: "Redeployment Failed",
        description: error.message || "Failed to redeploy the application",
        variant: "destructive",
      });
    },
  });

  const handleRollback = (version: string) => {
    toast({
      title: "Rolling Back",
      description: `Rolling back to ${version}...`,
    });
  };

  const handlePromoteToProduction = () => {
    toast({
      title: "Promoting to Production",
      description: "Promoting staging deployment to production...",
    });
  };

  // Mock log entries
  const logEntries = [
    { time: '09:45:32', level: 'info', message: '[Server] Application started successfully' },
    { time: '09:45:33', level: 'info', message: '[Database] Connected to PostgreSQL database' },
    { time: '09:45:34', level: 'info', message: '[Cache] Redis cache initialized' },
    { time: '09:45:35', level: 'info', message: '[API] REST API listening on port 3000' },
    { time: '09:45:36', level: 'info', message: '[WebSocket] WebSocket server started' },
    { time: '09:45:38', level: 'warn', message: '[Memory] High memory usage detected (72%)' },
    { time: '09:45:40', level: 'info', message: '[Health] Health check passed' },
    { time: '09:45:42', level: 'error', message: '[API] Failed to fetch user data: Connection timeout' },
    { time: '09:45:43', level: 'info', message: '[Retry] Retrying failed request...' },
    { time: '09:45:44', level: 'info', message: '[API] Request succeeded on retry' },
    { time: '09:45:45', level: 'info', message: '[Metrics] Performance metrics logged' },
    { time: '09:45:46', level: 'info', message: '[Backup] Automatic backup completed' },
  ];

  const filteredLogs = logEntries.filter(log => {
    if (errorsOnly && log.level !== 'error' && log.level !== 'warn') return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  // Loading state
  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Deployments"
          description="Loading deployment information..."
          icon={Rocket}
        />
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-cyan-950/20" />
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      </div>

      <PageHeader
        title={currentDeployment.project || 'Deployments'}
        description={`Monitor and manage your ${selectedEnvironment} deployments`}
        icon={Rocket}
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row">
            {/* Environment Switcher */}
            <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Production
                  </div>
                </SelectItem>
                <SelectItem value="staging">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    Staging
                  </div>
                </SelectItem>
                <SelectItem value="development">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    Development
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              className="gap-2" 
              onClick={() => redeployMutation.mutate()}
              disabled={redeployMutation.isPending}
            >
              <RefreshCw className={cn("h-4 w-4", redeployMutation.isPending && "animate-spin")} />
              Redeploy
            </Button>
            
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        )}
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge className="bg-green-600 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Healthy
          </Badge>
          <span className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            {currentDeployment.url}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Last deployed {currentDeployment.time}
          </span>
          <a
            href={currentDeployment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            Visit Site
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </PageHeader>

      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Metrics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Uptime
                  </CardTitle>
                  <Activity className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentDeployment.metrics?.uptime || 99.95}%</div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>0.05% from last week</span>
                </div>
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={uptimeData}>
                    <Line 
                      type="monotone" 
                      dataKey="uptime" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Response Time
                  </CardTitle>
                  <Timer className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentDeployment.metrics?.avgResponseTime || 125}ms</div>
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <TrendingDown className="h-3 w-3" />
                  <span>-12ms from yesterday</span>
                </div>
                <ResponsiveContainer width="100%" height={60}>
                  <AreaChart data={responseTimeData}>
                    <Area 
                      type="monotone" 
                      dataKey="p50" 
                      stroke="#3b82f6" 
                      fill="#3b82f6"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Request Volume
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {((currentDeployment.metrics?.totalRequests || 324000) / 1000).toFixed(0)}K
                </div>
                <div className="flex items-center gap-1 text-xs text-purple-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>+15% from last week</span>
                </div>
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={requestVolumeData.slice(0, 7)}>
                    <Bar dataKey="requests" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Error Rate
                  </CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentDeployment.metrics?.errorRate || 0.02}%</div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingDown className="h-3 w-3" />
                  <span>-0.01% from yesterday</span>
                </div>
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={errorRateData}>
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Deployment Status */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Deployment Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Environment</span>
                    <Badge variant="outline" className="capitalize">
                      {selectedEnvironment}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Version</span>
                    <span className="font-mono text-sm">{currentDeployment.version}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className="bg-green-600 text-white">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Healthy
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Deployed</span>
                    <span className="text-sm">{currentDeployment.time}</span>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <Button className="w-full" onClick={() => redeployMutation.mutate()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Redeploy
                    </Button>
                    {selectedEnvironment === 'staging' && (
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={handlePromoteToProduction}
                      >
                        <Rocket className="h-4 w-4 mr-2" />
                        Promote to Production
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Resource Usage */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Resource Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {resourceUsageData.map((resource) => (
                      <div key={resource.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{resource.name}</span>
                          <span className="text-sm text-muted-foreground">{resource.value}%</span>
                        </div>
                        <Progress value={resource.value} className="h-2" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Security Status</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All security checks passed. SSL certificate valid until Dec 2025.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deploymentHistory.slice(0, 3).map((deployment) => {
                    const statusConfig = getStatusConfig(deployment.status);
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <div key={deployment.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", statusConfig.color)}>
                            <StatusIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {deployment.version} deployed to {deployment.environment}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              by {deployment.deployedBy} • {formatTimeAgo(deployment.timestamp)}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Response Time Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Response Time</CardTitle>
                    <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">1 Hour</SelectItem>
                        <SelectItem value="24h">24 Hours</SelectItem>
                        <SelectItem value="7d">7 Days</SelectItem>
                        <SelectItem value="30d">30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={responseTimeData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="p50" stroke="#3b82f6" name="P50" strokeWidth={2} />
                      <Line type="monotone" dataKey="p95" stroke="#f59e0b" name="P95" strokeWidth={2} />
                      <Line type="monotone" dataKey="p99" stroke="#ef4444" name="P99" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Request Volume Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Request Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={requestVolumeData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="requests" fill="#3b82f6" name="Requests" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="errors" fill="#ef4444" name="Errors" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Resource Distribution */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Resource Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={resourceUsageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {resourceUsageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {resourceUsageData.map((resource) => (
                      <div key={resource.name} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: resource.color }}
                        />
                        <span className="text-sm">{resource.name}: {resource.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Error Rate Trend */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Error Rate Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={errorRateData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="rate" 
                        stroke="#ef4444" 
                        fill="#ef4444"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Deployment History</CardTitle>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deploymentHistory.map((deployment, index) => {
                    const statusConfig = getStatusConfig(deployment.status);
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <motion.div
                        key={deployment.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="relative"
                      >
                        {/* Timeline connector */}
                        {index < deploymentHistory.length - 1 && (
                          <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border" />
                        )}
                        
                        <div className="flex gap-4">
                          {/* Timeline node */}
                          <div className={cn("flex-shrink-0 p-3 rounded-lg", statusConfig.color)}>
                            <StatusIcon className="h-5 w-5" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 bg-muted/30 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold">{deployment.version}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {deployment.environment} • {formatTimeAgo(deployment.timestamp)}
                                </p>
                              </div>
                              <Badge variant={deployment.status === 'success' ? 'default' : 'destructive'}>
                                {deployment.status}
                              </Badge>
                            </div>
                            
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                <span>{deployment.deployedBy}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <GitCommit className="h-3 w-3" />
                                <code className="font-mono">{deployment.commitHash}</code>
                              </div>
                              <div className="flex items-center gap-2">
                                <Timer className="h-3 w-3" />
                                <span>Duration: {deployment.duration}</span>
                              </div>
                            </div>
                            
                            {deployment.error && (
                              <Alert variant="destructive" className="mt-3">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{deployment.error}</AlertDescription>
                              </Alert>
                            )}
                            
                            {deployment.status === 'success' && index > 0 && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-3"
                                onClick={() => handleRollback(deployment.version)}
                              >
                                <GitBranch className="h-3 w-3 mr-2" />
                                Rollback to this version
                              </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Application Logs</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={isLive ? "default" : "outline"}
                      onClick={() => setIsLive(!isLive)}
                    >
                      {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      <span className="ml-1">{isLive ? 'Pause' : 'Live'}</span>
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="errors"
                          checked={errorsOnly}
                          onCheckedChange={setErrorsOnly}
                        />
                        <Label htmlFor="errors" className="text-sm cursor-pointer">
                          Errors only
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="wrap"
                          checked={wrapText}
                          onCheckedChange={setWrapText}
                        />
                        <Label htmlFor="wrap" className="text-sm cursor-pointer">
                          Wrap text
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Log viewer */}
                  <ScrollArea className="h-[500px] rounded-lg bg-gray-950 p-4">
                    <div className="font-mono text-xs space-y-1">
                      {filteredLogs.map((log, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.01 }}
                          className="flex items-start gap-3"
                        >
                          <span className="text-gray-500 select-none">{log.time}</span>
                          <span className={cn(
                            "font-semibold uppercase",
                            log.level === 'error' && 'text-red-400',
                            log.level === 'warn' && 'text-yellow-400',
                            log.level === 'info' && 'text-blue-400'
                          )}>
                            [{log.level}]
                          </span>
                          <span className={cn(
                            "text-gray-300",
                            wrapText ? 'break-all' : 'whitespace-nowrap'
                          )}>
                            {log.message}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Environment Variables */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Environment Variables</CardTitle>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Variable
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { key: 'NODE_ENV', value: selectedEnvironment },
                      { key: 'DATABASE_URL', value: '••••••••••••' },
                      { key: 'API_KEY', value: '••••••••••••' },
                      { key: 'REDIS_URL', value: '••••••••••••' },
                    ].map((env) => (
                      <div key={env.key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <code className="text-sm font-mono">{env.key}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-muted-foreground">
                            {showEnvVars ? env.value : '••••••••'}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setShowEnvVars(!showEnvVars)}
                          >
                            {showEnvVars ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Deployment Configuration */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Deployment Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-deploy">Auto Deploy</Label>
                    <Switch id="auto-deploy" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ssl">SSL Certificate</Label>
                    <Switch id="ssl" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cdn">CDN</Label>
                    <Switch id="cdn" defaultChecked />
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-sm">Custom Domain</Label>
                    <Input 
                      placeholder="example.com" 
                      className="mt-2"
                      defaultValue={currentDeployment.customDomain}
                    />
                  </div>
                  <Button className="w-full">Save Configuration</Button>
                </CardContent>
              </Card>
            </div>

            {/* Security Settings */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-10 w-10 text-green-600" />
                    <div>
                      <p className="font-medium">SSL/TLS</p>
                      <p className="text-sm text-muted-foreground">Enabled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-10 w-10 text-blue-600" />
                    <div>
                      <p className="font-medium">DDoS Protection</p>
                      <p className="text-sm text-muted-foreground">Active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-10 w-10 text-yellow-600" />
                    <div>
                      <p className="font-medium">WAF</p>
                      <p className="text-sm text-muted-foreground">Configured</p>
                    </div>
                  </div>
                </div>
                <Button className="mt-4" variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Run Security Audit
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
      `}</style>
    </PageShell>
  );
}