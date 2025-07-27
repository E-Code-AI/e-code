import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Globe, Rocket, Server, Activity, AlertCircle,
  CheckCircle, XCircle, Clock, TrendingUp, Database,
  Cpu, HardDrive, Wifi, Shield, ExternalLink, RefreshCw,
  Play, Pause, Trash2, Settings, Copy, ChevronRight
} from 'lucide-react';

export default function Deployments() {
  const { toast } = useToast();
  const [selectedDeployment, setSelectedDeployment] = useState<number | null>(null);

  const { data: deployments = [], isLoading: deploymentsLoading } = useQuery({
    queryKey: ['/api/user/deployments'],
    queryFn: async () => {
      const response = await fetch('/api/user/deployments', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch deployments');
      return response.json();
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/user/deployments/stats'],
    queryFn: async () => {
      const response = await fetch('/api/user/deployments/stats', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch deployment stats');
      return response.json();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'paused': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      case 'deploying': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'deploying': return <RefreshCw className="h-4 w-4 animate-spin" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleAction = (action: string, deploymentId: number) => {
    const deployment = deployments.find((d: any) => d.id === deploymentId);
    toast({
      title: `${action} deployment`,
      description: `${action} action initiated for ${deployment?.name}`
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Globe className="h-8 w-8 text-blue-500" />
          Deployments
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage and monitor your deployed applications
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats?.active || deployments.filter((d: any) => d.status === 'active').length || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{stats?.totalRequests ? (stats.totalRequests > 1000 ? `${(stats.totalRequests / 1000).toFixed(1)}K` : stats.totalRequests) : '0'}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Uptime</p>
                <p className="text-2xl font-bold">{stats?.avgUptime ? `${stats.avgUptime}%` : '0%'}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Environments</p>
                <p className="text-2xl font-bold">{stats?.environments || new Set(deployments.map((d: any) => d.environment)).size || 0}</p>
              </div>
              <Server className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deployments List */}
      <div className="space-y-4">
        {deployments.map((deployment: any) => (
          <Card key={deployment.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{deployment.name}</h3>
                      <Badge variant={deployment.environment === 'production' ? 'default' : 'secondary'}>
                        {deployment.environment}
                      </Badge>
                      <div className={`flex items-center gap-1 ${getStatusColor(deployment.status)}`}>
                        {getStatusIcon(deployment.status)}
                        <span className="text-sm font-medium capitalize">{deployment.status}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <a 
                        href={deployment.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        {deployment.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <span>•</span>
                      <span>{deployment.version}</span>
                      <span>•</span>
                      <span>Last deployed {formatDate(deployment.lastDeployed)}</span>
                    </div>

                    {deployment.error && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                        <p className="text-sm text-red-700">{deployment.error}</p>
                      </div>
                    )}
                    
                    {deployment.status === 'active' && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Uptime</p>
                          <p className="text-sm font-semibold">{deployment.metrics.uptime}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Requests</p>
                          <p className="text-sm font-semibold">{deployment.metrics.requests.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Response</p>
                          <p className="text-sm font-semibold">{deployment.metrics.avgResponseTime}ms</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Error Rate</p>
                          <p className="text-sm font-semibold">{deployment.metrics.errorRate}%</p>
                        </div>
                      </div>
                    )}
                    
                    {deployment.status === 'active' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <Cpu className="h-3 w-3" />
                            CPU Usage
                          </span>
                          <span>{deployment.resources.cpu}%</span>
                        </div>
                        <Progress value={deployment.resources.cpu} className="h-2" />
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <HardDrive className="h-3 w-3" />
                            Memory
                          </span>
                          <span>{deployment.resources.memory}%</span>
                        </div>
                        <Progress value={deployment.resources.memory} className="h-2" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {deployment.status === 'active' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('Restart', deployment.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('Pause', deployment.id)}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {deployment.status === 'paused' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction('Resume', deployment.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {deployment.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction('Redeploy', deployment.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDeployment(deployment.id)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {selectedDeployment === deployment.id && (
                <div className="border-t bg-muted/50 p-6">
                  <Tabs defaultValue="logs" className="w-full">
                    <TabsList>
                      <TabsTrigger value="logs">Logs</TabsTrigger>
                      <TabsTrigger value="environment">Environment</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="logs" className="mt-4">
                      <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-md h-48 overflow-y-auto">
                        <p>[2024-01-30 10:30:15] Server started on port 3000</p>
                        <p>[2024-01-30 10:30:16] Connected to database</p>
                        <p>[2024-01-30 10:30:17] All systems operational</p>
                        <p>[2024-01-30 10:31:02] GET / 200 45ms</p>
                        <p>[2024-01-30 10:31:15] GET /api/users 200 23ms</p>
                        <p>[2024-01-30 10:31:28] POST /api/data 201 67ms</p>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="environment" className="mt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <div>
                            <p className="font-medium">NODE_ENV</p>
                            <p className="text-sm text-muted-foreground">production</p>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <div>
                            <p className="font-medium">DATABASE_URL</p>
                            <p className="text-sm text-muted-foreground">postgresql://...</p>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button variant="outline" className="w-full">
                          Add Environment Variable
                        </Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="settings" className="mt-4">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Custom Domain</h4>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="example.com" 
                              className="flex-1 px-3 py-2 text-sm rounded-md border bg-background"
                            />
                            <Button>Add Domain</Button>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2 text-red-600">Danger Zone</h4>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Deployment
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create New Deployment */}
      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="text-center">
            <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Deploy a New Project</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select a Repl and deploy it to the web in seconds
            </p>
            <Button>
              Create New Deployment
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}