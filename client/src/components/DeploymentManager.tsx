import React, { useState, useEffect } from 'react';
import { Project, Deployment } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Rocket,
  Globe,
  Server,
  Settings,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Link as LinkIcon,
  Copy,
  CircleOff,
  ExternalLink,
  Play,
  ArrowRight
} from 'lucide-react';

interface DeploymentManagerProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function DeploymentManager({ project, isOpen, onClose }: DeploymentManagerProps) {
  const [tab, setTab] = useState<string>('current');
  const [deployUrl, setDeployUrl] = useState<string>('');
  const [useCustomDomain, setUseCustomDomain] = useState<boolean>(false);
  const [customDomain, setCustomDomain] = useState<string>('');
  const [envProduction, setEnvProduction] = useState<boolean>(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Format deployments domain
  useEffect(() => {
    // Default domain pattern: project-name-username.replit.app
    const defaultDomain = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${project.ownerId}.replit.app`;
    setDeployUrl(defaultDomain);
  }, [project]);

  // Fetch deployments
  const { 
    data: deployments = [], 
    isLoading: isLoadingDeployments,
    error: deploymentsError,
    refetch: refetchDeployments
  } = useQuery<Deployment[]>({
    queryKey: ['/api/projects', project.id, 'deployments'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${project.id}/deployments`);
      return res.json();
    },
    enabled: isOpen,
  });

  // Create deployment mutation
  const deployMutation = useMutation({
    mutationFn: async (data: { domain: string; envProduction: boolean }) => {
      const res = await apiRequest('POST', `/api/projects/${project.id}/deployments`, {
        url: data.domain,
        config: { production: data.envProduction }
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', project.id, 'deployments'] });
      toast({
        title: 'Deployment started',
        description: 'Your application is being deployed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Deployment failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Find current deployment (most recent)
  const currentDeployment = deployments.length > 0 
    ? deployments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] 
    : null;

  // Handle deploy button click
  const handleDeploy = async () => {
    const url = useCustomDomain && customDomain ? customDomain : deployUrl;
    await deployMutation.mutateAsync({
      domain: url,
      envProduction,
    });
  };

  // Format deployment status
  const formatDeploymentStatus = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Live
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case 'building':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Building
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <CircleOff className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Unknown
          </Badge>
        );
    }
  };

  // Format date for displaying
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Copy URL to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'URL copied',
      description: 'Deployment URL copied to clipboard',
    });
  };

  // Open URL in new tab
  const openInNewTab = (url: string) => {
    window.open(`https://${url}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Rocket className="h-5 w-5 mr-2" />
            Deploy Project
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="current" value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="current">Current</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="space-y-4">
            {isLoadingDeployments ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : currentDeployment ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Globe className="h-5 w-5 mr-2" />
                      Latest Deployment
                    </span>
                    {formatDeploymentStatus(currentDeployment.status)}
                  </CardTitle>
                  <CardDescription>
                    Deployed {formatDate(currentDeployment.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <div className="text-sm font-medium">Deployment URL</div>
                    <div className="flex items-center">
                      <div className="bg-muted p-2 rounded-l-md border border-r-0 border-border">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <Input
                          value={currentDeployment.url || ''}
                          readOnly
                          className="rounded-l-none border-l-0 truncate"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="ml-2"
                        onClick={() => copyToClipboard(currentDeployment.url || '')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="ml-2"
                        onClick={() => openInNewTab(currentDeployment.url || '')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {currentDeployment.buildLogs && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Deployment Logs</div>
                      <div className="bg-muted p-3 rounded-md max-h-40 overflow-y-auto">
                        <pre className="text-xs whitespace-pre-wrap break-words text-muted-foreground">
                          {currentDeployment.buildLogs}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => refetchDeployments()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button onClick={() => setTab('settings')}>
                    Deploy New Version
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Rocket className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No deployments yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Your project hasn't been deployed yet. Deploy your project to make it accessible online.
                </p>
                <Button onClick={() => setTab('settings')}>
                  Deploy Project
                  <Rocket className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Deployment Settings
                </CardTitle>
                <CardDescription>
                  Configure how your project will be deployed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="deployUrl">Domain Name</Label>
                    <div className="flex items-center">
                      <Checkbox 
                        id="useCustomDomain" 
                        checked={useCustomDomain}
                        onCheckedChange={(checked) => setUseCustomDomain(checked === true)}
                        className="mr-2"
                      />
                      <Label htmlFor="useCustomDomain" className="text-sm">
                        Use custom domain
                      </Label>
                    </div>
                  </div>
                  
                  {useCustomDomain ? (
                    <div className="flex items-center">
                      <div className="bg-muted p-2 rounded-l-md border border-r-0 border-border">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input
                        id="customDomain"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        placeholder="yourdomain.com"
                        className="rounded-l-none border-l-0"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="bg-muted p-2 rounded-l-md border border-r-0 border-border">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input
                        id="deployUrl"
                        value={deployUrl}
                        readOnly
                        className="rounded-l-none border-l-0 bg-muted/50"
                      />
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Checkbox 
                      id="envProduction" 
                      checked={envProduction}
                      onCheckedChange={(checked) => setEnvProduction(checked === true)}
                      className="mr-2"
                    />
                    <Label htmlFor="envProduction">
                      Use production environment variables
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    When enabled, your deployment will use production environment variables.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleDeploy} disabled={deployMutation.isPending}>
                  {deployMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4 mr-2" />
                      Deploy Project
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            {isLoadingDeployments ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : deployments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No deployment history found
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">Deployment History</div>
                  <Button variant="outline" size="sm" onClick={() => refetchDeployments()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {deployments
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((deployment) => (
                      <Card key={deployment.id} className="overflow-hidden">
                        <div className="flex flex-col sm:flex-row">
                          <div className="p-4 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <LinkIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span className="text-sm font-medium">{deployment.url || ''}</span>
                              </div>
                              {formatDeploymentStatus(deployment.status)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatDate(deployment.createdAt)}
                            </div>
                          </div>
                          <div className="flex p-2 sm:p-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => copyToClipboard(deployment.url || '')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {deployment.status === 'success' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openInNewTab(deployment.url || '')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}