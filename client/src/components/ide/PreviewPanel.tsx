import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, RefreshCw, ExternalLink, Play, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { PreviewSplashScreen } from './PreviewSplashScreen';

export type AutonomousBuildPhase = 'planning' | 'scaffolding' | 'building' | 'styling' | 'finalizing' | 'complete' | null;

interface PreviewPanelProps {
  projectId: string;
  isRunning?: boolean;
  autoStart?: boolean;
  autonomousBuildPhase?: AutonomousBuildPhase;
  autonomousBuildProgress?: number;
  autonomousBuildTask?: string;
  appName?: string;
}

interface PreviewStatus {
  previewUrl: string | null;
  status: 'running' | 'stopped' | 'starting' | 'error' | 'static' | 'no_runnable_files';
  message?: string;
  runId?: string;
  ports?: number[];
  primaryPort?: number;
  services?: Array<{ port: number; name: string; path?: string }>;
  frameworkType?: string;
}

export function PreviewPanel({ 
  projectId, 
  isRunning: externalIsRunning, 
  autoStart = true,
  autonomousBuildPhase,
  autonomousBuildProgress,
  autonomousBuildTask,
  appName
}: PreviewPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasAttemptedAutoStart = useRef(false);

  // Query preview status
  const { data: previewStatus, isLoading: isStatusLoading, refetch: refetchStatus } = useQuery<PreviewStatus>({
    queryKey: ['/api/preview/url', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/preview/url?projectId=${projectId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to get preview status');
      }
      return response.json();
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      // Poll more frequently when starting, less when running
      const data = query.state.data;
      if (data?.status === 'starting') return 2000;
      if (data?.status === 'running') return 10000;
      return false;
    }
  });

  // Start preview mutation
  const startPreviewMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/preview/projects/${projectId}/preview/start`, {});
    },
    onSuccess: () => {
      toast({ title: 'Preview starting...', description: 'Your app is being built and started.' });
      // Refetch status after a delay to allow startup
      setTimeout(() => refetchStatus(), 2000);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to start preview', 
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
    }
  });

  // Stop preview mutation
  const stopPreviewMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/preview/projects/${projectId}/preview/stop`, {});
    },
    onSuccess: () => {
      toast({ title: 'Preview stopped' });
      refetchStatus();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to stop preview', 
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
    }
  });

  // Auto-start preview when component mounts if there are runnable files
  // ✅ FIX (Dec 1, 2025): Use ref flag to prevent infinite re-triggering if backend rejects
  useEffect(() => {
    if (autoStart && previewStatus && 
        previewStatus.status === 'stopped' && 
        !hasAttemptedAutoStart.current) {
      hasAttemptedAutoStart.current = true;
      startPreviewMutation.mutate(undefined);
    }
  }, [autoStart, previewStatus?.status]);

  // ✅ FIX (Dec 1, 2025): Add cache-busting timestamp to prevent stale content
  const handleRefresh = useCallback(() => {
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe && previewStatus?.previewUrl) {
      const url = new URL(previewStatus.previewUrl, window.location.origin);
      url.searchParams.set('_t', Date.now().toString());
      iframe.src = url.toString();
    }
    refetchStatus();
  }, [previewStatus?.previewUrl, refetchStatus]);

  const handleOpenInNewTab = useCallback(() => {
    if (previewStatus?.previewUrl) {
      // For relative URLs, construct full URL
      const url = previewStatus.previewUrl.startsWith('http') 
        ? previewStatus.previewUrl 
        : `${window.location.origin}${previewStatus.previewUrl}`;
      window.open(url, '_blank');
    }
  }, [previewStatus?.previewUrl]);

  const handleStartPreview = useCallback(() => {
    startPreviewMutation.mutate(undefined);
  }, [startPreviewMutation]);

  const handleStopPreview = useCallback(() => {
    stopPreviewMutation.mutate(undefined);
  }, [stopPreviewMutation]);

  const isPreviewRunning = previewStatus?.status === 'running' || previewStatus?.status === 'static';
  const isPreviewStarting = previewStatus?.status === 'starting' || startPreviewMutation.isPending;
  const canShowPreview = isPreviewRunning && previewStatus?.previewUrl;
  // ✅ FIX (Dec 1, 2025): Use mutation.isPending for loading state instead of local timeout
  const isRefreshing = startPreviewMutation.isPending || stopPreviewMutation.isPending;

  // Get display URL for the toolbar
  const displayUrl = previewStatus?.previewUrl 
    ? (previewStatus.previewUrl.startsWith('http') 
        ? previewStatus.previewUrl 
        : `${window.location.origin}${previewStatus.previewUrl}`)
    : '';

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="h-10 border-b flex items-center justify-between px-3 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Globe className="h-4 w-4 shrink-0" />
          <span className="text-[13px] font-medium">Preview</span>
          {isPreviewRunning && (
            <Badge variant="secondary" className="text-[11px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              Running
            </Badge>
          )}
          {isPreviewStarting && (
            <Badge variant="secondary" className="text-[11px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
              Starting...
            </Badge>
          )}
          {previewStatus?.frameworkType && (
            <Badge variant="outline" className="text-[11px]">
              {previewStatus.frameworkType}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Start/Stop buttons */}
          {!isPreviewRunning && !isPreviewStarting && previewStatus?.status !== 'no_runnable_files' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartPreview}
              disabled={startPreviewMutation.isPending}
              data-testid="button-start-preview"
              className="h-7 px-2 gap-1"
            >
              <Play className="h-3.5 w-3.5" />
              <span className="text-[11px]">Run</span>
            </Button>
          )}
          
          {(isPreviewRunning || isPreviewStarting) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStopPreview}
              disabled={stopPreviewMutation.isPending}
              data-testid="button-stop-preview"
              className="h-7 px-2 gap-1"
            >
              <Square className="h-3.5 w-3.5" />
              <span className="text-[11px]">Stop</span>
            </Button>
          )}
          
          {canShowPreview && (
            <>
              <div className="text-[11px] text-muted-foreground truncate max-w-[150px] hidden sm:block">
                {displayUrl}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                data-testid="button-refresh-preview"
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInNewTab}
                data-testid="button-open-preview"
                className="h-7 w-7 p-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Preview Content */}
      <div className="flex-1 relative bg-background dark:bg-background">
        {/* Autonomous build splash screen - shows during AI-driven builds */}
        {autonomousBuildPhase && autonomousBuildPhase !== 'complete' ? (
          <PreviewSplashScreen
            phase={autonomousBuildPhase}
            currentTask={autonomousBuildTask}
            progress={autonomousBuildProgress}
            appName={appName}
          />
        ) : isStatusLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isPreviewStarting ? (
          <div className="h-full flex items-center justify-center text-center p-8">
            <div>
              <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-primary" />
              <h3 className="text-[15px] font-semibold mb-2">Starting preview...</h3>
              <p className="text-[13px] text-muted-foreground">
                Building and starting your application. This may take a moment.
              </p>
            </div>
          </div>
        ) : previewStatus?.status === 'no_runnable_files' ? (
          <div className="h-full flex items-center justify-center text-center p-8">
            <div>
              <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-[15px] font-semibold mb-2">No preview available</h3>
              <p className="text-[13px] text-muted-foreground">
                Add an HTML file or package.json to preview your project.
              </p>
            </div>
          </div>
        ) : !isPreviewRunning ? (
          <div className="h-full flex items-center justify-center text-center p-8">
            <div>
              <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-[15px] font-semibold mb-2">Preview not running</h3>
              <p className="text-[13px] text-muted-foreground mb-4">
                Click the Run button to start your project and see a live preview.
              </p>
              <Button onClick={handleStartPreview} disabled={startPreviewMutation.isPending}>
                <Play className="h-4 w-4 mr-2" />
                Start Preview
              </Button>
            </div>
          </div>
        ) : previewStatus?.previewUrl ? (
          <iframe
            id="preview-iframe"
            src={previewStatus.previewUrl}
            className="w-full h-full border-0"
            title="Project Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads"
            data-testid="iframe-preview"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-center p-8">
            <div>
              <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-primary" />
              <h3 className="text-[15px] font-semibold mb-2">Loading preview...</h3>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
