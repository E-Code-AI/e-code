import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  RefreshCw, 
  ExternalLink, 
  Smartphone, 
  Tablet, 
  Monitor,
  X,
  Maximize2,
  Minimize2,
  AlertCircle,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useQuery } from '@tanstack/react-query';

interface ResponsiveWebPreviewProps {
  projectId: string | number; // Support both UUID strings and numeric IDs
  isRunning?: boolean;
  className?: string;
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'responsive';

const DEVICE_SIZES = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  tablet: { width: 768, height: 1024, name: 'iPad' },
  desktop: { width: 1366, height: 768, name: 'Desktop' },
  responsive: { width: '100%', height: '100%', name: 'Responsive' }
};

type PreviewState = 'loading' | 'starting' | 'running' | 'error' | 'iframe-error' | 'no-content' | 'offline';

export function ResponsiveWebPreview({ 
  projectId, 
  isRunning,
  className,
  onClose,
  isFullscreen,
  onToggleFullscreen
}: ResponsiveWebPreviewProps) {
  const [deviceType, setDeviceType] = useState<DeviceType>('responsive');
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [cacheBuster, setCacheBuster] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const prevUrlRef = useRef<string>('');
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Track online/offline state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get preview URL from the backend - REAL BACKEND
  // ✅ FIX (Dec 17, 2025): Proper error handling and race condition prevention
  // ✅ FIX (Dec 21, 2025): Custom queryFn to properly pass projectId as query parameter
  const { 
    data: previewData, 
    isLoading: isQueryLoading,
    isError: isQueryError,
    error: queryError,
    refetch: refetchPreview 
  } = useQuery<{ previewUrl: string; status?: string }>({
    queryKey: ['/api/preview/url', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/preview/url?projectId=${projectId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Preview error: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!projectId && (typeof projectId === 'string' ? projectId.length > 0 : projectId > 0) && isOnline,
    staleTime: 2000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchInterval: (query) => {
      if (!isOnline) return false;
      const data = query.state.data;
      if (data?.status === 'starting') return 3000;
      if (data?.status === 'running' || data?.status === 'static') return 10000;
      if (!data?.previewUrl) return 5000;
      return false;
    }
  });

  const previewUrl = previewData?.previewUrl || '';
  const previewStatus = previewData?.status;
  
  // Build iframe URL with cache buster
  const iframeSrc = previewUrl ? `${previewUrl}${previewUrl.includes('?') ? '&' : '?'}_cb=${cacheBuster}` : '';
  
  // Derive current preview state - now includes iframe errors and offline
  const getPreviewState = useCallback((): PreviewState => {
    if (!isOnline) return 'offline';
    if (isQueryLoading) return 'loading';
    if (isQueryError) return 'error';
    if (previewStatus === 'starting') return 'starting';
    if (!previewUrl) return 'no-content';
    if (iframeError && !iframeLoading) return 'iframe-error';
    return 'running';
  }, [isOnline, isQueryLoading, isQueryError, previewStatus, previewUrl, iframeError, iframeLoading]);
  
  const currentState = getPreviewState();

  // Reset iframe loading state when URL changes (prevents race conditions)
  useEffect(() => {
    if (previewUrl && previewUrl !== prevUrlRef.current) {
      setIframeLoading(true);
      setIframeError(false);
      prevUrlRef.current = previewUrl;
    }
  }, [previewUrl]);

  const handleRefresh = useCallback(() => {
    setIframeError(false);
    setIframeLoading(true);
    
    if (currentState === 'error' || currentState === 'offline') {
      refetchPreview();
    } else if (currentState === 'iframe-error' || iframeRef.current) {
      setCacheBuster(prev => prev + 1);
      refetchPreview();
    }
  }, [currentState, refetchPreview]);

  const handleExternalOpen = useCallback(() => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  }, [previewUrl]);

  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false);
    setIframeError(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setIframeLoading(false);
    setIframeError(true);
  }, []);

  const deviceSize = DEVICE_SIZES[deviceType];
  const isResponsive = deviceType === 'responsive';

  return (
    <div className={cn(
      "flex flex-col h-full bg-[var(--ecode-background)]",
      isFullscreen && "fixed inset-0 z-50",
      className
    )}>
      {/* Preview Header */}
      <div className="h-10 flex items-center justify-between px-2 border-b border-[var(--ecode-border)] bg-[var(--ecode-surface)]">
        <div className="flex items-center gap-2">
          {/* Device Type Selector */}
          {!isMobile && (
            <div className="flex items-center gap-1 border-r border-[var(--ecode-border)] pr-2">
              <Button
                variant={deviceType === 'mobile' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setDeviceType('mobile')}
              >
                <Smartphone className="h-3 w-3" />
              </Button>
              <Button
                variant={deviceType === 'tablet' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setDeviceType('tablet')}
              >
                <Tablet className="h-3 w-3" />
              </Button>
              <Button
                variant={deviceType === 'desktop' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setDeviceType('desktop')}
              >
                <Monitor className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* URL Bar */}
          <div className="flex-1 flex items-center gap-2 max-w-lg">
            <div className="flex-1 bg-[var(--ecode-background)] rounded px-2 py-1 text-[11px] truncate">
              {previewUrl}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={handleRefresh}
            disabled={currentState === 'loading'}
            data-testid="button-refresh-preview"
          >
            <RefreshCw className={cn("h-3 w-3", (iframeLoading || currentState === 'loading') && "animate-spin")} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={handleExternalOpen}
            disabled={!previewUrl || currentState === 'loading'}
            data-testid="button-external-preview"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
          {onToggleFullscreen && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleFullscreen}>
              {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto" data-testid="preview-content">
        {/* Offline State */}
        {currentState === 'offline' && (
          <div className="text-center" data-testid="preview-offline">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
              <WifiOff className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-[var(--ecode-text-muted)] mb-2">
              You're offline
            </p>
            <p className="text-[13px] text-[var(--ecode-text-muted)] mb-4">
              Check your internet connection and try again
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh} data-testid="button-retry-preview">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* Loading Skeleton State - Simplified */}
        {currentState === 'loading' && (
          <div className="w-full max-w-md text-center" data-testid="preview-skeleton">
            <div className="rounded-lg border border-[var(--ecode-border)] bg-[var(--ecode-surface)] p-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[var(--ecode-accent)]" />
              <Skeleton className="h-4 w-3/4 mx-auto mb-2" />
              <Skeleton className="h-3 w-1/2 mx-auto" />
            </div>
            <p className="text-[13px] text-[var(--ecode-text-muted)] mt-4">Loading preview...</p>
          </div>
        )}

        {/* Starting State */}
        {currentState === 'starting' && (
          <div className="text-center" data-testid="preview-starting">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[var(--ecode-accent)]" />
            <p className="text-[var(--ecode-text-muted)] mb-2">
              Starting preview server...
            </p>
            <p className="text-[13px] text-[var(--ecode-text-muted)]">
              This may take a few seconds
            </p>
          </div>
        )}

        {/* Error State */}
        {currentState === 'error' && (
          <div className="text-center" data-testid="preview-error">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              {navigator.onLine ? (
                <AlertCircle className="h-8 w-8 text-red-500" />
              ) : (
                <WifiOff className="h-8 w-8 text-red-500" />
              )}
            </div>
            <p className="text-[var(--ecode-text-muted)] mb-2">
              {navigator.onLine ? 'Failed to load preview' : 'No internet connection'}
            </p>
            <p className="text-[13px] text-[var(--ecode-text-muted)] mb-4">
              {queryError instanceof Error ? queryError.message : 'Please try again'}
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh} data-testid="button-retry-preview">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* No Content State */}
        {currentState === 'no-content' && (
          <div className="text-center" data-testid="preview-no-content">
            <p className="text-[var(--ecode-text-muted)] mb-2">
              Add an HTML file to preview your project
            </p>
            <p className="text-[13px] text-[var(--ecode-text-muted)]">
              The preview will appear automatically
            </p>
          </div>
        )}

        {/* Iframe Error State - Full view */}
        {currentState === 'iframe-error' && (
          <div className="text-center" data-testid="preview-iframe-error">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-[var(--ecode-text-muted)] mb-2">
              Failed to load preview page
            </p>
            <p className="text-[13px] text-[var(--ecode-text-muted)] mb-4">
              The preview server may have stopped or the page has an error
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh} data-testid="button-retry-iframe">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {/* Running State - Show Iframe */}
        {currentState === 'running' && iframeSrc && (
          <div 
            className={cn(
              "relative bg-white rounded-lg shadow-lg transition-all duration-300",
              isResponsive ? "w-full h-full" : "overflow-hidden"
            )}
            style={{
              width: isResponsive ? '100%' : deviceSize.width,
              height: isResponsive ? '100%' : deviceSize.height,
              maxWidth: '100%',
              maxHeight: '100%'
            }}
            data-testid="preview-frame"
          >
            {/* Device Frame (optional) */}
            {!isResponsive && !isMobile && (
              <div className="absolute -top-6 left-0 right-0 text-center">
                <span className="text-[11px] text-[var(--ecode-text-muted)]">
                  {deviceSize.name} ({deviceSize.width} × {deviceSize.height})
                </span>
              </div>
            )}

            {/* Loading Overlay for iframe */}
            {iframeLoading && (
              <div className="absolute inset-0 bg-[var(--ecode-background)] flex items-center justify-center z-10">
                <div className="text-center">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[var(--ecode-accent)]" />
                  <p className="text-[13px] text-[var(--ecode-text-muted)]">Loading preview...</p>
                </div>
              </div>
            )}

            {/* Iframe Error Overlay */}
            {iframeError && !iframeLoading && (
              <div className="absolute inset-0 bg-[var(--ecode-background)] flex items-center justify-center z-10">
                <div className="text-center">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                  <p className="text-[13px] text-[var(--ecode-text-muted)] mb-2">Failed to load page</p>
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Iframe */}
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              className="w-full h-full border-0 rounded-lg"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              title={`Preview for project ${projectId}`}
              data-testid="preview-iframe"
            />
          </div>
        )}
      </div>
    </div>
  );
}