// @ts-nocheck
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Globe, RefreshCw, Shield, AlertTriangle, Sparkles, ChevronDown, Rocket,
  Terminal, Laptop, Database, Activity, Package, MoreVertical,
  ExternalLink, Lock, Clock, Server, History, Eye, EyeOff,
  X, Edit2, Search, Play, Pause, Calendar, Filter, Bot, Settings,
  AlertCircle, ChevronRight, WrapText, Monitor, ArrowUpDown,
  SlidersHorizontal, MoreHorizontal, Link, Download, Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Deployment } from '@shared/schema';
import { PageHeader, PageShell } from '@/components/layout/PageShell';

export default function Deployments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const params = useParams();
  const [, navigate] = useLocation();
  const [showBottomMenu, setShowBottomMenu] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [dateAfter, setDateAfter] = useState('');
  const [dateBefore, setDateBefore] = useState('');
  const [logLevel, setLogLevel] = useState('all');
  const [isLive, setIsLive] = useState(false);
  const [wrapText, setWrapText] = useState(true);
  const [showColors, setShowColors] = useState(true);
  const [expandLogs, setExpandLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch recent deployments
  const { data: recentDeployments, isLoading } = useQuery<any[]>({
    queryKey: ['/api/user/deployments/recent'],
  });
  
  // Get the first deployment for display (simulating a deployment detail view)
  const currentDeployment = recentDeployments?.[0];
  
  // Redeploy mutation
  const redeployMutation = useMutation({
    mutationFn: async () => {
      if (!currentDeployment?.id) return;
      return await apiRequest('POST', `/api/deployment/${currentDeployment.projectId}`, {
        type: 'autoscale',
        customDomain: null,
        sslEnabled: true,
        envVars: {},
      });
    },
    onSuccess: () => {
      toast({
        title: "Redeployment Started",
        description: "Your application is being redeployed...",
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

  const handleDebugWithAgent = () => {
    if (currentDeployment?.project) {
      navigate(`/@${currentDeployment.project?.owner?.username || user?.username}/${currentDeployment.project?.slug}?mode=agent&debug=true`);
    } else {
      toast({
        title: "Starting AI Agent",
        description: "The AI Agent will help debug your deployment issues.",
      });
    }
  };

  const handleRedeploy = () => {
    redeployMutation.mutate();
  };

  const handleSecurityScan = async () => {
    if (!currentDeployment?.projectId) return;
    
    try {
      await apiRequest('POST', `/api/security/${currentDeployment.projectId}/scan`);
      toast({
        title: "Security Scan Started",
        description: "Running security analysis on your deployment...",
      });
    } catch (error: any) {
      toast({
        title: "Security Scan Failed",
        description: error.message || "Failed to start security scan",
        variant: "destructive",
      });
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const logEntries = [
    { time: '07-27 15:57:48', level: 'info', message: 'reloading process' },
    { time: '07-27 15:57:48', level: 'info', message: 'NODE_ENV: development' },
    { time: '07-27 15:57:50', level: 'info', message: 'Generated icon-144.png' },
    { time: '07-27 15:57:50', level: 'info', message: 'Generated icon-192.png' },
    { time: '07-27 15:57:50', level: 'info', message: 'Generated icon-256.png' },
    { time: '07-27 15:57:50', level: 'info', message: 'Generated icon-512.png' },
    { time: '07-27 15:57:50', level: 'info', message: 'All favicon files generated successfully' },
    { time: '07-27 15:57:50', level: 'info', message: '12:57:50 PM [express] Favicons generated' },
    { time: '07-27 15:57:50', level: 'info', message: 'Using custom JWT authentication for production' },
    { time: '07-27 15:57:50', level: 'info', message: 'Next automatic backup scheduled for: 2025-06-22' },
    { time: '07-27 15:57:50', level: 'info', message: '12:57:50 PM [express] serving on port 5000' },
    { time: '07-27 15:57:50', level: 'info', message: 'Backup service initialized' },
    { time: '07-27 15:57:50', level: 'info', message: 'Database connection established' },
  ];

  const filteredLogs = logEntries.filter(log => {
    if (errorsOnly && log.level !== 'error') return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Show loading state
  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Deployments"
          description="Loading your deployment information"
          icon={Rocket}
        />
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="flex justify-center py-16">
            <div className="text-center">
              <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // Show empty state if no deployments
  if (!currentDeployment) {
    return (
      <PageShell>
        <PageHeader
          title="Deployments"
          description="Manage and monitor your deployed applications"
          icon={Rocket}
          actions={(
            <Button 
              className="gap-2" 
              onClick={() => navigate('/dashboard')}
            >
              <Rocket className="h-4 w-4" />
              <span className="hidden sm:inline">Deploy</span>
              <span className="sm:hidden">Deploy</span>
            </Button>
          )}
        />
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-xl font-bold">
                No Active Deployments
              </CardTitle>
            </CardHeader>
            <CardContent className="py-8">
              <div className="flex flex-col items-center text-center">
                <Package className="mb-4 h-16 w-16 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                  Create an e-commerce store
                </h3>
                <p className="mb-6 text-sm text-muted-foreground max-w-md mx-auto">
                  Deploy your first application with product catalog, shopping cart, and checkout functionality
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    size="lg" 
                    onClick={() => navigate('/templates')}
                    className="w-full sm:w-auto"
                  >
                    <Package className="mr-2 h-5 w-5" />
                    Browse Templates
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={() => navigate('/dashboard')}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create New Project
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Start Guide */}
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-semibold">Quick Start Guide</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Terminal className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">1. Create Project</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Start with a template or build from scratch
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">2. Configure</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Set environment variables and deployment settings
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Rocket className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">3. Deploy</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click deploy and your app goes live instantly
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  const deploymentStatus = currentDeployment.status || 'deployed';
  const hasErrors = deploymentStatus === 'failed' || deploymentStatus === 'error';
  const statusLabel =
    deploymentStatus === 'deployed'
      ? 'Running'
      : deploymentStatus === 'pending'
        ? 'Pending'
        : deploymentStatus === 'building'
          ? 'Building'
          : 'Failed';
  const description = `${currentDeployment.visibility === 'public' ? 'Public deployment' : 'Private deployment'} • Autoscale • Updated ${currentDeployment.time || 'just now'}`;

  return (
    <PageShell>
      <PageHeader
        title={currentDeployment.project || 'E-Code'}
        description={description}
        icon={Rocket}
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="gap-2" onClick={handleRedeploy}>
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Redeploy</span>
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                if (currentDeployment?.projectId) {
                  navigate(`/projects/${currentDeployment.projectId}/settings`);
                }
              }}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        )}
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge
            variant="default"
            className={
              deploymentStatus === 'deployed'
                ? 'bg-green-600 text-white'
                : deploymentStatus === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : deploymentStatus === 'building'
                    ? 'bg-blue-600 text-white'
                    : 'bg-red-600 text-white'
            }
          >
            {statusLabel}
          </Badge>
          <span className="flex items-center gap-1">
            <Server className="h-4 w-4" />
            Autoscale
          </span>
          <span className="flex items-center gap-1">
            {currentDeployment.visibility === 'public' ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {currentDeployment.visibility === 'public' ? 'Public' : 'Private'}
          </span>
          {currentDeployment.url && (
            <a
              href={currentDeployment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              {currentDeployment.url.replace('https://', '')}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </PageHeader>

      <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
        {hasErrors && (
          <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between">
              <span>Build failed</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => setActiveTab('logs')}
              >
                View logs
                <Badge variant="secondary" className="ml-2">
                  999+
                </Badge>
              </Button>
            </AlertTitle>
            <AlertDescription className="mt-4 space-y-4">
              <div>
                <p className="font-semibold">Your deployment had the following errors:</p>
                <div className="mt-3 rounded-md bg-gray-900 p-4 font-mono text-sm text-gray-100">
                  <p className="mb-2 text-red-400">
                    Build process failed during compilation
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <Bot className="h-4 w-4" />
                  Agent suggestions
                </h3>
                <ol className="list-inside list-decimal space-y-2 text-sm">
                  <li>Check your build configuration</li>
                  <li>Verify all dependencies are installed</li>
                  <li>Review the error logs for specific issues</li>
                </ol>
                <div className="mt-4">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleDebugWithAgent}
                    className="bg-[#0074d9] hover:bg-[#0058b3]"
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    Debug with Agent
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Deployment Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Deployment Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={hasErrors ? "destructive" : "default"}>
                        {statusLabel}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">URL</Label>
                    <p className="text-sm font-mono mt-1">
                      {currentDeployment.url || 'Not deployed'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Last Updated</Label>
                    <p className="text-sm mt-1">
                      {currentDeployment.time || 'Just now'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" onClick={handleRedeploy}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Redeploy
                  </Button>
                  <Button className="w-full" variant="outline" onClick={handleSecurityScan}>
                    <Shield className="mr-2 h-4 w-4" />
                    Run Security Scan
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => setActiveTab('logs')}>
                    <Terminal className="mr-2 h-4 w-4" />
                    View Logs
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Deployment History */}
            <Card>
              <CardHeader>
                <button 
                  className="flex items-center justify-between w-full text-left"
                  onClick={() => toggleSection('history')}
                >
                  <CardTitle className="text-base">Deployment History</CardTitle>
                  <ChevronDown className={`h-4 w-4 transition-transform ${expandedSection === 'history' ? 'rotate-180' : ''}`} />
                </button>
              </CardHeader>
              {expandedSection === 'history' && (
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 hover:bg-muted rounded">
                      <div>
                        <p className="text-sm font-medium">v1.2.3</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                      <Badge variant="destructive">Failed</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 hover:bg-muted rounded">
                      <div>
                        <p className="text-sm font-medium">v1.2.2</p>
                        <p className="text-xs text-muted-foreground">Yesterday</p>
                      </div>
                      <Badge variant="default">Success</Badge>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4 mt-6">
            <Card>
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
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Search and Filters */}
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
                      <Checkbox
                        id="errors"
                        checked={errorsOnly}
                        onCheckedChange={setErrorsOnly}
                      />
                      <Label htmlFor="errors" className="text-sm">
                        Errors only
                      </Label>
                    </div>
                  </div>

                  {/* Log entries */}
                  <div className="rounded-md bg-gray-900 p-4 font-mono text-xs text-gray-100 max-h-96 overflow-auto">
                    {filteredLogs.map((log, index) => (
                      <div key={index} className="mb-1 flex">
                        <span className="text-gray-500 mr-3">{log.time}</span>
                        <span className={`mr-3 ${
                          log.level === 'error' ? 'text-red-400' :
                          log.level === 'warn' ? 'text-yellow-400' :
                          'text-blue-400'
                        }`}>
                          [{log.level}]
                        </span>
                        <span className={wrapText ? 'break-all' : 'whitespace-nowrap'}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Deployment Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Deployment Type</Label>
                  <p className="text-sm text-muted-foreground mt-1">Autoscale</p>
                </div>
                <div>
                  <Label>Visibility</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentDeployment?.visibility || 'Public'}
                  </p>
                </div>
                <Button variant="outline" className="w-full">
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4 mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">23%</div>
                  <p className="text-xs text-muted-foreground">Average over 24h</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Memory</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">512 MB</div>
                  <p className="text-xs text-muted-foreground">Out of 2 GB</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1.2K</div>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}