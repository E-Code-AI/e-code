import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Globe, ExternalLink, RefreshCw, Shield, Rocket, 
  Settings, Code, Zap, Monitor, Smartphone, Tablet,
  ChevronRight, Lock, AlertCircle, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Deployment {
  url: string;
  status?: string;
  customDomain?: string;
  sslEnabled?: boolean;
}

interface PreviewPanelProps {
  projectId: number;
  projectUrl?: string;
  className?: string;
}

export function PreviewPanel({ projectId, projectUrl, className }: PreviewPanelProps) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customDomain, setCustomDomain] = useState('');

  // Fetch deployment status
  const { data: deployment } = useQuery<Deployment>({
    queryKey: [`/api/deployment/${projectId}`],
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleDeploy = async () => {
    try {
      await apiRequest('POST', `/api/deployment/${projectId}`, {
        type: 'static',
        customDomain: customDomain || null,
        sslEnabled: true,
      });
    } catch (error) {
      console.error('Deployment failed:', error);
    }
  };

  const getDeviceDimensions = () => {
    switch (device) {
      case 'mobile':
        return 'max-w-[375px]';
      case 'tablet':
        return 'max-w-[768px]';
      default:
        return 'w-full';
    }
  };

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <Tabs defaultValue="preview" className="flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="deploy">Deploy</TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="flex-1 flex flex-col mt-0">
          {/* Preview Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-3">
              {/* Device Selector */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded p-1">
                <Button
                  variant={device === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDevice('desktop')}
                  className="h-7 px-2"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={device === 'tablet' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDevice('tablet')}
                  className="h-7 px-2"
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={device === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDevice('mobile')}
                  className="h-7 px-2"
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>

              {/* URL Bar */}
              <div className="flex items-center gap-2 flex-1">
                <Shield className="h-4 w-4 text-green-600" />
                <Input
                  value={projectUrl || 'https://localhost:5000'}
                  readOnly
                  className="h-8 flex-1 font-mono text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="h-8 w-8 p-0"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(projectUrl || 'https://localhost:5000', '_blank')}
                  className="h-8 w-8 p-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Preview Frame */}
          <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-4 overflow-auto">
            <div className={cn("mx-auto bg-white dark:bg-black rounded-lg shadow-lg overflow-hidden", getDeviceDimensions())}>
              {projectUrl ? (
                <iframe
                  src={projectUrl}
                  className="w-full h-full border-0"
                  style={{ minHeight: '600px' }}
                  title="Project Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              ) : (
                <div className="flex items-center justify-center h-96 text-muted-foreground">
                  <div className="text-center">
                    <Globe className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-sm">Run your project to see the preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Deploy Tab */}
        <TabsContent value="deploy" className="flex-1 p-4 space-y-4 overflow-auto mt-0">
          <Alert>
            <Rocket className="h-4 w-4" />
            <AlertDescription>
              Deploy your project to make it accessible to everyone on the web
            </AlertDescription>
          </Alert>

          {/* Deployment Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Deployment Options
            </h3>

            {/* Static Hosting */}
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium flex items-center gap-2">
                    Static Hosting
                    <Badge variant="secondary" className="text-xs">Free</Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Perfect for static websites, SPAs, and frontend applications
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      Instant deployment
                    </span>
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      Global CDN
                    </span>
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      SSL included
                    </span>
                  </div>
                </div>
                <Button onClick={handleDeploy}>
                  Deploy Now
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </Card>

            {/* Autoscale */}
            <Card className="p-4 border-blue-200 dark:border-blue-800">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium flex items-center gap-2">
                    Autoscale
                    <Badge className="text-xs bg-blue-600">Pro</Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically scales based on traffic with zero configuration
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      Auto-scaling
                    </span>
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      Load balancing
                    </span>
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-600" />
                      Zero downtime
                    </span>
                  </div>
                </div>
                <Button variant="outline">
                  <Lock className="h-4 w-4 mr-1" />
                  Upgrade
                </Button>
              </div>
            </Card>

            {/* Custom Domain */}
            <div className="space-y-2">
              <h4 className="font-medium">Custom Domain</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="example.com"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-1" />
                  Configure
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use your own domain name for your deployment
              </p>
            </div>
          </div>

          {/* Current Deployment Status */}
          {deployment && (
            <Alert className="border-green-200 dark:border-green-800">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Your project is deployed at{' '}
                <a 
                  href={deployment.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  {deployment.url}
                </a>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}