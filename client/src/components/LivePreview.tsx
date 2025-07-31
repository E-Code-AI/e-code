import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ExternalLink, Monitor, Smartphone, Tablet } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PreviewStatus {
  projectId: number;
  port: number;
  url: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  logs: string[];
}

interface LivePreviewProps {
  projectId: number;
  onPreviewReady?: (url: string) => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ projectId, onPreviewReady }) => {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Query to get preview status
  const { data: previewStatus, refetch } = useQuery<PreviewStatus>({
    queryKey: [`/api/projects/${projectId}/preview/status`],
    refetchInterval: 2000
  });

  // Mutation to start preview
  const startPreviewMutation = useMutation({
    mutationFn: () => apiRequest(`/api/projects/${projectId}/preview/start`, 'POST'),
    onSuccess: (data) => {
      toast({
        title: "Preview Started",
        description: "Your app is starting up..."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/preview/status`] });
      if (data.url && onPreviewReady) {
        onPreviewReady(data.url);
      }
    },
    onError: (error) => {
      toast({
        title: "Preview Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation to stop preview
  const stopPreviewMutation = useMutation({
    mutationFn: () => apiRequest(`/api/projects/${projectId}/preview/stop`, 'POST'),
    onSuccess: () => {
      toast({
        title: "Preview Stopped",
        description: "The preview has been stopped."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/preview/status`] });
    }
  });

  // Auto-start preview on mount if not running
  useEffect(() => {
    if (previewStatus?.status === 'stopped' || !previewStatus) {
      startPreviewMutation.mutate();
    }
  }, []);

  const getDeviceClass = () => {
    switch (device) {
      case 'tablet':
        return 'max-w-[768px] mx-auto';
      case 'mobile':
        return 'max-w-[375px] mx-auto';
      default:
        return 'w-full';
    }
  };

  const handleRefresh = () => {
    const iframe = document.getElementById(`preview-${projectId}`) as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  const getPreviewUrl = () => {
    if (!previewStatus || previewStatus.status !== 'running') return '';
    // Use proxy URL that routes through our server
    return `/preview/${projectId}/`;
  };

  const renderPreviewContent = () => {
    if (previewStatus?.status === 'starting') {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Starting preview server...</p>
          {previewStatus.logs.length > 0 && (
            <div className="max-w-md w-full mt-4">
              <div className="bg-secondary/50 rounded-md p-3 max-h-32 overflow-y-auto">
                {previewStatus.logs.map((log, i) => (
                  <p key={i} className="text-xs font-mono text-muted-foreground">{log}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (previewStatus?.status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <div className="text-red-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">Preview failed to start</p>
          {previewStatus.logs.length > 0 && (
            <div className="max-w-md w-full mt-4">
              <div className="bg-red-500/10 rounded-md p-3 max-h-32 overflow-y-auto">
                {previewStatus.logs.map((log, i) => (
                  <p key={i} className="text-xs font-mono text-red-500">{log}</p>
                ))}
              </div>
            </div>
          )}
          <Button onClick={() => startPreviewMutation.mutate()} size="sm">
            Retry
          </Button>
        </div>
      );
    }

    if (previewStatus?.status === 'running') {
      const previewUrl = getPreviewUrl();
      return (
        <iframe
          id={`preview-${projectId}`}
          src={previewUrl}
          className="w-full h-full border-0 bg-white"
          title="Live Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      );
    }

    // Not started yet
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Monitor className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Preview not started</p>
        <Button onClick={() => startPreviewMutation.mutate()} size="sm">
          Start Preview
        </Button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Preview Controls */}
      <div className="border-b p-2 flex items-center justify-between bg-background">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDevice('desktop')}
            className={device === 'desktop' ? 'bg-secondary' : ''}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDevice('tablet')}
            className={device === 'tablet' ? 'bg-secondary' : ''}
          >
            <Tablet className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDevice('mobile')}
            className={device === 'mobile' ? 'bg-secondary' : ''}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {previewStatus?.status === 'running' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(getPreviewUrl(), '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </>
          )}
          {previewStatus?.status === 'running' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => stopPreviewMutation.mutate()}
              disabled={stopPreviewMutation.isPending}
            >
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 bg-gray-100 overflow-hidden">
        <div className={`h-full ${getDeviceClass()} bg-white shadow-lg`}>
          {renderPreviewContent()}
        </div>
      </div>

      {/* Status Bar */}
      {previewStatus?.status === 'running' && (
        <div className="border-t p-2 bg-background text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Preview running at {getPreviewUrl()}
          </span>
        </div>
      )}
    </div>
  );
};