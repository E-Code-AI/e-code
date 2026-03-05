import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Monitor, RefreshCw, ExternalLink, 
  ChevronLeft, ChevronRight, ArrowRight,
  Globe, MoreVertical, Play, Loader2,
  Layers, RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface MobilePreviewPanelProps {
  projectId: string | number;
  previewUrl?: string;
  className?: string;
  onBack?: () => void;
}

interface PreviewStatus {
  previewUrl: string | null;
  status: 'running' | 'stopped' | 'starting' | 'error' | 'static' | 'no_runnable_files';
  message?: string;
}

function NotRunningState({ onRun, isStarting }: { onRun: () => void; isStarting: boolean }) {
  return (
    <div 
      className="flex flex-col items-center justify-center h-full bg-white"
      data-testid="mobile-preview-not-running"
    >
      <div className="flex flex-col items-center gap-4 px-8 py-12">
        <div 
          className="w-16 h-16 rounded-2xl border-2 border-gray-200 flex items-center justify-center"
          style={{ borderColor: '#e5e7eb' }}
        >
          <Monitor className="w-8 h-8 text-gray-400" />
          <div className="absolute w-4 h-4 bg-gray-300 rounded-sm flex items-center justify-center -mt-1 -ml-1 opacity-0" />
        </div>

        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="w-14 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center bg-gray-50">
            <div className="w-4 h-4 rounded border-2 border-gray-400 flex items-center justify-center">
              <div className="w-2 h-2 text-gray-400 font-bold text-xs leading-none">×</div>
            </div>
          </div>
          <div className="absolute -bottom-1 w-6 h-1 bg-gray-300 rounded-full" />
          <div className="absolute -bottom-2.5 w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="text-center space-y-1">
          <h3 
            className="text-[17px] font-semibold text-gray-900 leading-tight"
            data-testid="text-not-running-title"
          >
            Your app is not running
          </h3>
          <p 
            className="text-[14px] text-gray-500 leading-snug"
            data-testid="text-not-running-description"
          >
            Run to preview your app.
          </p>
        </div>

        <Button
          onClick={onRun}
          disabled={isStarting}
          className="h-12 px-8 text-[15px] font-semibold rounded-xl gap-2 bg-[#4CAF50] hover:bg-[#43A047] text-white shadow-none border-0"
          data-testid="button-run-app"
          style={{ backgroundColor: '#4CAF50' }}
        >
          {isStarting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-white" />
          )}
          {isStarting ? 'Starting...' : 'Run'}
        </Button>
      </div>
    </div>
  );
}

export function MobilePreviewPanel({ 
  projectId, 
  previewUrl: externalPreviewUrl,
  className,
  onBack
}: MobilePreviewPanelProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [currentPath, setCurrentPath] = useState('/');
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();
  const hasAttemptedAutoStart = useRef(false);

  const { data: previewStatus, isLoading: isStatusLoading, refetch: refetchStatus } = useQuery<PreviewStatus>({
    queryKey: ['/api/preview/url', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/preview/url?projectId=${projectId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to get preview status');
      return response.json();
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'starting') return 2000;
      if (data?.status === 'running') return 10000;
      return false;
    }
  });

  const startPreviewMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/preview/projects/${projectId}/preview/start`, {});
    },
    onSuccess: () => {
      setTimeout(() => refetchStatus(), 2000);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to start', 
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
    }
  });

  const republishMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/deployments/projects/${projectId}/deploy`, {});
    },
    onSuccess: () => {
      toast({ title: 'Republishing...', description: 'Your app is being republished.' });
    },
    onError: () => {
      toast({ title: 'Republish failed', variant: 'destructive' });
    }
  });

  const isPreviewRunning = previewStatus?.status === 'running' || previewStatus?.status === 'static';
  const isPreviewStarting = previewStatus?.status === 'starting' || startPreviewMutation.isPending;
  const baseUrl = externalPreviewUrl || previewStatus?.previewUrl || `/api/preview/projects/${projectId}/preview`;
  const computedPreviewUrl = baseUrl + (currentPath === '/' ? '' : currentPath);

  useEffect(() => {
    if (
      previewStatus?.status === 'stopped' && 
      !hasAttemptedAutoStart.current &&
      projectId
    ) {
      hasAttemptedAutoStart.current = true;
      startPreviewMutation.mutate(undefined);
    }
  }, [previewStatus?.status, projectId]);

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleNavigateBack = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.history.back();
    }
  };

  const handleNavigateForward = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.history.forward();
    }
  };

  const handleOpenExternal = () => {
    window.open(computedPreviewUrl, '_blank');
  };

  const handleRun = () => {
    startPreviewMutation.mutate(undefined);
  };

  const handleRepublish = () => {
    republishMutation.mutate(undefined);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    try {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow?.location?.pathname) {
        setCurrentPath(iframe.contentWindow.location.pathname);
      }
    } catch {
    }
  };

  const displayPath = currentPath || '/';

  return (
    <div 
      className={cn('flex flex-col h-full bg-white', className)}
      data-testid="mobile-preview-panel"
    >
      {/* ── TOP BAR ── Replit-style: ← | Republish | 🖥 Preview | stacked | ⋮ */}
      <div 
        className="flex-shrink-0 flex items-center h-[52px] px-2 bg-white border-b border-gray-100"
        data-testid="mobile-preview-top-bar"
      >
        {/* Back button */}
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={onBack}
            data-testid="mobile-preview-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}

        {/* Republish button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 rounded-xl gap-1.5 text-[13px] font-medium text-gray-700 hover:bg-gray-100 flex-shrink-0"
          onClick={handleRepublish}
          disabled={republishMutation.isPending}
          data-testid="mobile-preview-republish"
        >
          {republishMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Globe className="w-4 h-4 text-gray-500" style={{ color: '#6d7aff' }} />
          )}
          <span style={{ color: '#6d7aff' }}>Republish</span>
        </Button>

        {/* Preview title — centered */}
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <Monitor className="w-[18px] h-[18px] text-gray-600 flex-shrink-0" />
          <span className="text-[15px] font-semibold text-gray-900 leading-none">Preview</span>
        </div>

        {/* Stacked windows icon */}
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 flex-shrink-0"
          data-testid="mobile-preview-overlay"
        >
          <Layers className="w-5 h-5" />
        </Button>

        {/* Three dots menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 flex-shrink-0"
              data-testid="mobile-preview-menu"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleRepublish}>
              <Globe className="w-4 h-4 mr-2" />
              Republish
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              navigator.clipboard.writeText(computedPreviewUrl);
              toast({ title: 'Link copied', description: 'Development link copied to clipboard' });
            }}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Share dev link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenExternal}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in browser
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── URL BAR ── Replit-style: ← → ↻ | URL path | → | Open in browser */}
      <div 
        className="flex-shrink-0 flex items-center gap-1 px-2 py-2 bg-white border-b border-gray-100"
        data-testid="mobile-preview-url-bar"
      >
        {/* Back navigation */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex-shrink-0"
          onClick={handleNavigateBack}
          data-testid="mobile-preview-nav-back"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Forward navigation */}
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex-shrink-0"
          onClick={handleNavigateForward}
          data-testid="mobile-preview-nav-forward"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex-shrink-0",
            isLoading && "animate-spin"
          )}
          onClick={handleRefresh}
          data-testid="mobile-preview-refresh"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        {/* URL input — shows just the path */}
        <div 
          className="flex-1 flex items-center min-w-0 h-8 px-3 rounded-lg bg-gray-100 border border-gray-200 text-[13px] text-gray-600"
          data-testid="mobile-preview-url-path"
        >
          <span className="truncate flex-1">{displayPath}</span>
          <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-1" />
        </div>

        {/* Open in browser */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 rounded-lg text-[12px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex-shrink-0 gap-1 whitespace-nowrap"
          onClick={handleOpenExternal}
          data-testid="mobile-preview-open-external"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Open in browser</span>
        </Button>
      </div>

      {/* ── CONTENT AREA ── Clean iframe or Not Running state */}
      <div className="flex-1 relative bg-white overflow-hidden">
        {isStatusLoading ? (
          <div className="flex items-center justify-center h-full bg-white">
            <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
          </div>
        ) : !isPreviewRunning && !isPreviewStarting ? (
          <NotRunningState onRun={handleRun} isStarting={startPreviewMutation.isPending} />
        ) : isPreviewStarting ? (
          <div className="flex flex-col items-center justify-center h-full bg-white gap-4">
            <Loader2 className="w-8 h-8 text-[#4CAF50] animate-spin" />
            <p className="text-[14px] text-gray-500 font-medium">Starting your app...</p>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-100 z-10">
                <div 
                  className="h-full bg-[#6d7aff] animate-pulse"
                  style={{ width: '60%' }}
                />
              </div>
            )}
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={computedPreviewUrl}
              className="w-full h-full border-0 bg-white"
              onLoad={handleIframeLoad}
              onError={() => setIsLoading(false)}
              title="App Preview"
              sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
              data-testid="mobile-preview-iframe"
            />
          </>
        )}
      </div>
    </div>
  );
}

export default MobilePreviewPanel;
