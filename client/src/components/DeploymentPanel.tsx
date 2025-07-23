import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Rocket, Globe, Activity, Clock, AlertCircle, CheckCircle, 
  XCircle, RefreshCw, ExternalLink, Copy, Terminal, BarChart3,
  Zap, Shield, Settings, Trash2
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Deployment {
  id: number;
  projectId: number;
  status: 'building' | 'deploying' | 'deployed' | 'failed';
  url?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  buildLogs?: string[];
  metrics?: {
    requests: number;
    errors: number;
    avgResponseTime: number;
    uptime: number;
  };
}

export function DeploymentPanel({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const [selectedDeployment, setSelectedDeployment] = useState<number | null>(null);

  // Fetch deployments
  const { data: deployments, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/deployments`]
  });

  // Fetch deployment status
  const { data: deploymentStatus } = useQuery({
    queryKey: [`/api/deployments/${selectedDeployment}/status`],
    enabled: !!selectedDeployment,
    refetchInterval: 5000 // Refetch every 5 seconds
  });

  // Deploy mutation
  const deployMutation = useMutation({
    mutationFn: () => apiRequest(`/api/projects/${projectId}/deploy`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/deployments`] });
      toast({
        title: 'Deployment started',
        description: 'Your project is being deployed. This may take a few minutes.'
      });
    },
    onError: () => {
      toast({
        title: 'Deployment failed',
        description: 'Failed to start deployment. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Stop deployment mutation
  const stopDeploymentMutation = useMutation({
    mutationFn: (deploymentId: number) => 
      apiRequest(`/api/deployments/${deploymentId}/stop`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/deployments`] });
      toast({
        title: 'Deployment stopped',
        description: 'The deployment has been stopped successfully.'
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'building':
      case 'deploying':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'default';
      case 'building':
      case 'deploying':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'URL copied',
      description: 'Deployment URL copied to clipboard'
    });
  };

  const latestDeployment = deployments?.[0];

  return (
    <div className="space-y-6">
      {/* Quick Deploy Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quick Deploy</CardTitle>
              <CardDescription>
                Deploy your project to production with one click
              </CardDescription>
            </div>
            <Rocket className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {latestDeployment && latestDeployment.status === 'deployed' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Live at</p>
                    <p className="text-sm text-muted-foreground">{latestDeployment.url}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyUrl(latestDeployment.url!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(latestDeployment.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={() => deployMutation.mutate()}
                disabled={deployMutation.isPending}
              >
                {deployMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Deploy New Version
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => deployMutation.mutate()}
              disabled={deployMutation.isPending}
            >
              {deployMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Deploy to Production
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Deployment History */}
      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
          <CardDescription>
            View and manage your project deployments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="deployments">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="deployments">Deployments</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="deployments" className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Loading deployments...</p>
                </div>
              ) : deployments && deployments.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {deployments.map((deployment: Deployment) => (
                      <div
                        key={deployment.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedDeployment(deployment.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(deployment.status)}
                              <span className="font-medium">v{deployment.version}</span>
                              <Badge variant={getStatusColor(deployment.status)}>
                                {deployment.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(deployment.createdAt), { addSuffix: true })}
                            </p>
                            {deployment.url && (
                              <p className="text-xs text-blue-600 hover:underline">
                                {deployment.url}
                              </p>
                            )}
                          </div>
                          {deployment.status === 'deployed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                stopDeploymentMutation.mutate(deployment.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12">
                  <Rocket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No deployments yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Deploy your project to see it here
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="metrics" className="space-y-4">
              {latestDeployment && latestDeployment.status === 'deployed' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Requests</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {latestDeployment.metrics?.requests || 0}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Error Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {latestDeployment.metrics?.errors || 0}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Avg Response Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {latestDeployment.metrics?.avgResponseTime || 0}ms
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Uptime</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">
                          {latestDeployment.metrics?.uptime || 100}%
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <Alert>
                    <BarChart3 className="h-4 w-4" />
                    <AlertDescription>
                      Real-time metrics for your deployed application
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No metrics available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Deploy your project to see metrics
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Deployment settings and configuration options coming soon
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}