import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  ExternalLink, 
  Smartphone, 
  Tablet, 
  Monitor,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useQuery } from '@tanstack/react-query';

interface ResponsiveWebPreviewProps {
  projectId: number;
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

export function ResponsiveWebPreview({ 
  projectId, 
  isRunning,
  className,
  onClose,
  isFullscreen,
  onToggleFullscreen
}: ResponsiveWebPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceType>('responsive');
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Show "Cannot GET" message instead of actual preview
  const previewData = { previewUrl: null };

  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleExternalOpen = () => {
    window.open(previewUrl, '_blank');
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

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
            <div className="flex-1 bg-[var(--ecode-background)] rounded px-2 py-1 text-xs truncate">
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
            disabled={!previewUrl}
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={handleExternalOpen}
            disabled={!previewUrl}
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
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div className="text-center space-y-4">
          <div className="font-mono text-sm text-muted-foreground bg-muted p-4 rounded">
            Cannot GET /
          </div>
          <p className="text-xs text-muted-foreground">
            Preview not available
          </p>
        </div>
      </div>
    </div>
  );
}