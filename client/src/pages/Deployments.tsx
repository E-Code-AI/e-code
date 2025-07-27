import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Globe, RefreshCw, Shield, AlertTriangle, 
  ChevronDown, MoreVertical, Eye, 
  Sparkles, ExternalLink, FileCode,
  Terminal, BarChart3, FolderOpen,
  Play, Laptop, Database, Activity,
  Package, FileText, CheckCircle, Monitor
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Deployments() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAllFailedBuilds, setShowAllFailedBuilds] = useState(false);

  // Mock deployment data
  const deployment = {
    name: 'Production',
    status: 'failed',
    lastDeployAt: '6 days ago',
    failedAt: '6 days ago',
    environment: 'production',
    visibility: 'private',
    buildErrors: [
      'Monaco Editor worker module resolution failed during Vite build in client/src/lib/monaco-config.ts',
      'Vite cannot resolve the entry module for monaco-editor/esm/vs/language/json/json.worker',
      'Build process failed preventing deployment due to missing worker dependencies'
    ]
  };

  const agentSuggestions = [
    {
      text: 'Install the monaco-editor package dependencies',
      file: 'package.json',
      action: 'install'
    },
    {
      text: 'Update the monaco-editor configuration',
      file: 'client/src/lib/monaco-config.ts',
      action: 'update'
    },
    {
      text: 'Add Vite configuration to properly handle workers',
      file: 'vite.config.ts',
      action: 'config'
    },
    {
      text: 'Consider using the vite-plugin-monaco-editor',
      file: 'vite.config.ts',
      action: 'plugin'
    }
  ];

  const handleRedeploy = () => {
    toast({
      title: 'Redeploying...',
      description: 'Your deployment has been queued for redeployment.'
    });
  };

  const handleRunSecurityScan = () => {
    toast({
      title: 'Security scan started',
      description: 'Security scan is running on your deployment.'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <span className="font-medium">Deployments</span>
            </div>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="h-12 w-full justify-start rounded-none border-0 bg-transparent p-0">
              <TabsTrigger 
                value="overview" 
                className="rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-foreground data-[state=active]:bg-transparent"
              >
                <Monitor className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="logs" 
                className="rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-foreground data-[state=active]:bg-transparent"
              >
                <FileText className="h-4 w-4 mr-2" />
                Logs
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-foreground data-[state=active]:bg-transparent"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="resources" 
                className="rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-foreground data-[state=active]:bg-transparent"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Resources
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Action buttons */}
        <div className="flex flex-col gap-3 mb-6">
          <Button 
            onClick={handleRedeploy}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4" />
            Redeploy
            <span className="ml-auto text-xs text-muted-foreground">Edit commands and secrets</span>
          </Button>
          
          <Button 
            onClick={handleRunSecurityScan}
            className="w-full justify-start gap-2"
            variant="outline"
          >
            <Shield className="h-4 w-4" />
            Run security scan
          </Button>
        </div>

        {/* Build failed alert */}
        <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertTitle className="text-red-900 dark:text-red-100">
            1 build failed
            <Button
              variant="link"
              className="ml-2 h-auto p-0 text-xs"
              onClick={() => setShowAllFailedBuilds(!showAllFailedBuilds)}
            >
              View logs
              <ChevronDown className={cn(
                "ml-1 h-3 w-3 transition-transform",
                showAllFailedBuilds && "rotate-180"
              )} />
            </Button>
          </AlertTitle>
          <AlertDescription className="mt-2 text-red-800 dark:text-red-200">
            Your deployment attempt had the following errors:
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {deployment.buildErrors.map((error, index) => (
                <li key={index} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>

        {/* Agent suggestions */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <CardTitle className="text-base">Agent suggestions</CardTitle>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30"
              >
                <Sparkles className="h-3 w-3" />
                Debug with Agent
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {agentSuggestions.map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                <span className="text-sm">{suggestion.text}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{suggestion.file}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* View all failed builds */}
        <Button
          variant="ghost"
          className="w-full justify-between text-sm"
          onClick={() => setShowAllFailedBuilds(!showAllFailedBuilds)}
        >
          <span>View all failed builds</span>
          <span className="text-muted-foreground">6 days ago</span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            showAllFailedBuilds && "rotate-180"
          )} />
        </Button>

        {/* Deployment status */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-2 w-2 rounded-full bg-foreground" />
            <h3 className="font-medium">{deployment.name}</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-sm">
                  Simon failed to deploy {deployment.failedAt}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Visibility</span>
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                <span className="text-sm capitalize">{deployment.visibility}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom action icons */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-around">
              <Button variant="ghost" size="icon">
                <Laptop className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Terminal className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Database className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Activity className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Package className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}