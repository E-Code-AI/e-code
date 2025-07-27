import { useState } from 'react';
import { ReplitLayout } from '@/components/layout/ReplitLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, RefreshCw, Shield, AlertTriangle, Sparkles, ChevronDown,
  Terminal, Laptop, Database, Activity, Package, MoreVertical,
  ExternalLink, Lock, Clock, Server, History, Eye, EyeOff,
  X, Edit2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Deployments() {
  const { toast } = useToast();
  const [showBottomMenu, setShowBottomMenu] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleDebugWithAgent = () => {
    toast({
      title: "Starting AI Agent",
      description: "The AI Agent will help debug your deployment issues.",
    });
  };

  const handleRedeploy = () => {
    toast({
      title: "Redeploying",
      description: "Your application is being redeployed...",
    });
  };

  const handleSecurityScan = () => {
    toast({
      title: "Security Scan Started",
      description: "Running security analysis on your deployment...",
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <ReplitLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Globe className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Deployments</h1>
        </div>

        {/* Main Deployment Card */}
        <Card>
          <CardContent className="pt-6">
            {/* Deployment Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold">my-awesome-app</h2>
                  <Badge variant="default" className="bg-green-500">
                    Production
                  </Badge>
                  <Badge variant="outline">
                    <Eye className="h-3 w-3 mr-1" />
                    Public
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <a href="#" className="hover:text-primary flex items-center gap-1">
                      my-awesome-app.e-code.app
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-1">
                    <Server className="h-3 w-3" />
                    <span>Autoscale</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Deployed 2 hours ago</span>
                  </div>
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowBottomMenu(!showBottomMenu)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

            {/* Deployment Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Button size="lg" onClick={handleRedeploy} className="flex-1 sm:flex-initial">
                <RefreshCw className="mr-2 h-4 w-4" />
                Redeploy
              </Button>
              <Button size="lg" variant="outline" className="flex-1 sm:flex-initial">
                <Edit2 className="mr-2 h-4 w-4" />
                Edit commands and secrets
              </Button>
              <Button size="lg" variant="outline" onClick={handleSecurityScan} className="flex-1 sm:flex-initial">
                <Shield className="mr-2 h-4 w-4" />
                Run security scan
              </Button>
            </div>

            {/* Build Status Alert */}
            <Card className="border-red-500 bg-red-50 dark:bg-red-950/20 mb-6">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 dark:text-red-100">Build failed</h3>
                    <pre className="mt-2 text-sm bg-red-100 dark:bg-red-900/20 p-3 rounded-md overflow-x-auto">
                      <code className="text-red-800 dark:text-red-200">
{`error: Module not found: Error: Can't resolve './components/NonExistentComponent'
  --> src/App.tsx:5:8
   |
 5 | import NonExistentComponent from './components/NonExistentComponent';
   |        ^^^^^^^^^^^^^^^^^^^^
   |
   = This component does not exist in the specified path`}
                      </code>
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agent Suggestions */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Agent suggestion</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      It looks like there's an import error in your application. The AI Agent can help fix this issue automatically.
                    </p>
                    <Button variant="default" size="sm" onClick={handleDebugWithAgent}>
                      Debug with Agent
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expandable Sections */}
            <div className="space-y-3">
              {/* Deployment History */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <button 
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => toggleSection('history')}
                  >
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      <span className="text-sm font-medium">Deployment History</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedSection === 'history' ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {expandedSection === 'history' && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between p-2 hover:bg-muted rounded">
                        <div>
                          <p className="text-sm font-medium">v1.2.3</p>
                          <p className="text-xs text-muted-foreground">2 hours ago - Build failed</p>
                        </div>
                        <Badge variant="destructive">Failed</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 hover:bg-muted rounded">
                        <div>
                          <p className="text-sm font-medium">v1.2.2</p>
                          <p className="text-xs text-muted-foreground">Yesterday - Deployed successfully</p>
                        </div>
                        <Badge variant="default">Success</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 hover:bg-muted rounded">
                        <div>
                          <p className="text-sm font-medium">v1.2.1</p>
                          <p className="text-xs text-muted-foreground">3 days ago - Deployed successfully</p>
                        </div>
                        <Badge variant="default">Success</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Failed Builds */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <button 
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => toggleSection('failed')}
                  >
                    <span className="text-sm font-medium">View all failed builds</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedSection === 'failed' ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {expandedSection === 'failed' && (
                    <div className="mt-4 space-y-2">
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded">
                        <p className="text-sm font-medium">Build #123 - 2 hours ago</p>
                        <p className="text-xs text-muted-foreground mt-1">Module not found error</p>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded">
                        <p className="text-sm font-medium">Build #120 - 5 hours ago</p>
                        <p className="text-xs text-muted-foreground mt-1">TypeScript compilation error</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

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

        {/* Bottom Menu Popup */}
        {showBottomMenu && (
          <div className="fixed inset-0 z-50" onClick={() => setShowBottomMenu(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute bottom-0 left-0 right-0 bg-background border-t animate-slide-up">
              <div className="p-4 space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={handleRedeploy}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Redeploy
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => {
                    setShowBottomMenu(false);
                    toast({ title: "Tab closed" });
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Close Tab
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ReplitLayout>
  );
}