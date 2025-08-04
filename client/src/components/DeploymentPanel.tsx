import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ExternalLink, 
  AlertCircle, 
  RefreshCw,
  Shield,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { queryClient } from '@/lib/queryClient';

interface DeploymentData {
  status?: 'running' | 'failed' | 'building' | 'stopped';
  environment?: string;
  lastDeployedAgo?: string;
  visibility?: 'public' | 'private';
  domain?: string;
  buildErrors?: any[];
}

interface DeploymentPanelProps {
  projectId: number;
}

export const DeploymentPanel: React.FC<DeploymentPanelProps> = ({ projectId }) => {
  const [showAgentSuggestions, setShowAgentSuggestions] = React.useState(true);
  const [showBuildErrors, setShowBuildErrors] = React.useState(true);

  const { data: deployment, isLoading } = useQuery<DeploymentData>({
    queryKey: ['/api/deployment', projectId],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleRedeploy = async () => {
    try {
      const response = await fetch(`/api/deployment/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ['/api/deployment', projectId] });
      }
    } catch (error) {
      console.error('Failed to redeploy:', error);
    }
  };

  const handleSecurityScan = async () => {
    try {
      const response = await fetch(`/api/security/${projectId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ['/api/deployment', projectId] });
      }
    } catch (error) {
      console.error('Failed to run security scan:', error);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading deployment info...</div>;
  }

  const hasErrors = deployment?.status === 'failed' || (deployment?.buildErrors?.length ?? 0) > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Deployment Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="font-medium">Deployment</h3>
            <span className={cn(
              "px-2 py-0.5 text-xs rounded-full font-medium",
              deployment?.status === 'running' ? "bg-green-100 text-green-700" : 
              deployment?.status === 'failed' ? "bg-red-100 text-red-700" :
              "bg-gray-100 text-gray-700"
            )}>
              {deployment?.environment || 'Production'}
            </span>
            {deployment?.status === 'failed' && (
              <span className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Simon failed to deploy {deployment?.lastDeployedAgo || '8 days ago'}
              </span>
            )}
          </div>
        </div>

        {/* Deployment Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Visibility:</span>
            <div className="flex items-center gap-1">
              {deployment?.visibility === 'public' ? (
                <>
                  <Globe className="h-3 w-3" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" />
                  <span>Private</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Domain:</span>
            <a 
              href={deployment?.domain || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline flex items-center gap-1"
            >
              {deployment?.domain || 'https://replit-clone-hemr45.replit.app'}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Type:</span>
            <span>Autoscale (4 vCPU / 8 GiB RAM / 3 Max)</span>
            <Button variant="link" size="sm" className="h-auto p-0 text-blue-600">
              Manage
            </Button>
            <Button variant="link" size="sm" className="h-auto p-0 text-blue-600">
              See all usage
            </Button>
          </div>
        </div>
      </div>

      {/* Build Failed Alert */}
      {hasErrors && (
        <div className="p-4 border-b">
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-medium mb-2">Build process failed preventing deployment due to missing worker dependencies</div>
              <div className="space-y-1 text-sm">
                <div>Install the monaco-editor package as a dependency to resolve the missing worker...</div>
                <Button variant="link" size="sm" className="h-auto p-0 text-blue-600">
                  package.json
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs">Update the monaco-config.ts to use a more compatible worker import...</span>
                <Button variant="link" size="sm" className="h-auto p-0 text-blue-600">
                  client/src/lib/monaco-config.ts
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs">Add the configuration to properly handle Monaco Editor workers in production builds</span>
                <Button variant="link" size="sm" className="h-auto p-0 text-blue-600">
                  vite.config.ts
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs">Consider using the vite-plugin-monaco-editor plugin that's already in dependencies to...</span>
                <Button variant="link" size="sm" className="h-auto p-0 text-blue-600">
                  vite.config.ts
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Agent Suggestions */}
      {hasErrors && (
        <div className="p-4 border-b">
          <button
            onClick={() => setShowAgentSuggestions(!showAgentSuggestions)}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium flex items-center gap-2">
              <span className="text-purple-600">🤖</span>
              Agent suggestions
            </h4>
            {showAgentSuggestions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {showAgentSuggestions && (
            <div className="mt-3 space-y-2">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Install the monaco-editor package as a dependency to resolve the missing worker...</li>
                <li>Update the monaco-config.ts to use a more compatible worker import...</li>
                <li>Add the configuration to properly handle Monaco Editor workers in production builds</li>
                <li>Consider using the vite-plugin-monaco-editor plugin that's already in dependencies to...</li>
              </ol>
              <Button className="w-full mt-3 bg-purple-600 hover:bg-purple-700">
                🤖 Debug with Agent
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 space-y-2">
        <Button 
          onClick={handleRedeploy}
          className="w-full justify-start"
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Redeploy
        </Button>
        
        <Button 
          className="w-full justify-start"
          variant="outline"
        >
          <Clock className="h-4 w-4 mr-2" />
          Edit commands and secrets
        </Button>
        
        <Button 
          onClick={handleSecurityScan}
          className="w-full justify-start"
          variant="outline"
        >
          <Shield className="h-4 w-4 mr-2" />
          Run security scan
        </Button>

        <div className="mt-4">
          <Button 
            variant="link" 
            size="sm" 
            className="text-blue-600 p-0 h-auto flex items-center gap-1"
          >
            View logs
            <span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-xs ml-1">
              999+
            </span>
          </Button>
        </div>
      </div>

      {/* View all failed builds */}
      {hasErrors && (
        <div className="p-4 border-t mt-auto">
          <button
            onClick={() => setShowBuildErrors(!showBuildErrors)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            {showBuildErrors ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            View all failed builds
          </button>
        </div>
      )}
    </div>
  );
};