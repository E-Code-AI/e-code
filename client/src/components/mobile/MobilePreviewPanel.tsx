import { useState, useEffect, useRef } from 'react';
import { LazyMotionDiv, LazyAnimatePresence } from '@/lib/motion';
import { 
  Smartphone, Tablet, Monitor, RotateCw, RefreshCw,
  ExternalLink, ChevronDown, Lock, Copy, Globe,
  Signal, Wifi, BatteryFull, MoreVertical, MonitorX,
  Code, Trees, X, Play, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { PreviewSplashScreen } from '@/components/ide/PreviewSplashScreen';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface DevicePreset {
  name: string;
  width: number;
  height: number;
  type: 'phone' | 'tablet' | 'desktop';
  icon: typeof Smartphone;
  hasDynamicIsland?: boolean;
}

const devicePresets: DevicePreset[] = [
  { name: 'iPhone SE', width: 375, height: 667, type: 'phone', icon: Smartphone },
  { name: 'iPhone 14', width: 390, height: 844, type: 'phone', icon: Smartphone },
  { name: 'iPhone 14 Pro', width: 393, height: 852, type: 'phone', icon: Smartphone, hasDynamicIsland: true },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932, type: 'phone', icon: Smartphone, hasDynamicIsland: true },
  { name: 'Samsung Galaxy S21', width: 360, height: 800, type: 'phone', icon: Smartphone },
  { name: 'Google Pixel 7', width: 412, height: 915, type: 'phone', icon: Smartphone },
  { name: 'iPad Mini', width: 768, height: 1024, type: 'tablet', icon: Tablet },
  { name: 'iPad Pro 11"', width: 834, height: 1194, type: 'tablet', icon: Tablet },
  { name: 'Desktop 1080p', width: 1920, height: 1080, type: 'desktop', icon: Monitor },
];

interface MobilePreviewPanelProps {
  projectId: string | number;
  previewUrl?: string;
  className?: string;
}

function SimulatedStatusBar({ isLandscape }: { isLandscape: boolean }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      className={cn(
        "absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-1",
        "text-[11px] font-medium text-white",
        isLandscape ? "h-5" : "h-6"
      )}
      style={{ 
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)',
        backdropFilter: 'blur(4px)',
      }}
      data-testid="mobile-preview-status-bar"
    >
      <div className="flex items-center gap-1">
        <span>{formattedTime}</span>
      </div>
      <div className="flex items-center gap-1">
        <Signal className="w-4 h-4" />
        <Wifi className="w-4 h-4" />
        <BatteryFull className="w-4 h-4" />
        <span className="text-[11px]">100%</span>
      </div>
    </div>
  );
}

function DynamicIsland({ scale }: { scale: number }) {
  return (
    <div 
      className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center"
      data-testid="mobile-preview-dynamic-island"
    >
      <div 
        className="rounded-[22px] flex items-center justify-center bg-gray-900 dark:bg-[#0e1525]"
        style={{ 
          width: 126 * Math.min(scale, 1), 
          height: 37 * Math.min(scale, 1),
          minWidth: 90,
          minHeight: 26,
        }}
      >
        <div 
          className="rounded-full mr-1 bg-gray-700 dark:bg-[#3d4452]"
          style={{ 
            width: 12 * Math.min(scale, 1), 
            height: 12 * Math.min(scale, 1),
            minWidth: 8,
            minHeight: 8,
          }}
        />
      </div>
    </div>
  );
}

function ClassicNotch({ scale }: { scale: number }) {
  return (
    <div 
      className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-3xl z-30 bg-gray-700 dark:bg-[#3d4452]"
      style={{ 
        width: Math.max(120 * Math.min(scale, 1), 80), 
        height: Math.max(24 * Math.min(scale, 1), 16),
      }}
      data-testid="mobile-preview-notch"
    >
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-800 dark:bg-[#1c2333]"
      />
    </div>
  );
}

function PhysicalButtons({ isLandscape, scale }: { 
  isLandscape: boolean; 
  scale: number;
}) {
  const buttonScale = Math.min(scale, 1);
  
  if (isLandscape) {
    return (
      <>
        <div 
          className="absolute -top-3 flex gap-3 z-20"
          style={{ left: '20%' }}
          data-testid="mobile-preview-volume-buttons"
        >
          <div 
            className="rounded-sm bg-gray-400 dark:bg-[#5c6670]"
            style={{ width: 24 * buttonScale, height: 4 }}
            data-testid="mobile-preview-volume-up"
          />
          <div 
            className="rounded-sm bg-gray-400 dark:bg-[#5c6670]"
            style={{ width: 24 * buttonScale, height: 4 }}
            data-testid="mobile-preview-volume-down"
          />
        </div>
        <div 
          className="absolute -bottom-3 z-20"
          style={{ right: '25%' }}
          data-testid="mobile-preview-power-button"
        >
          <div 
            className="rounded-sm bg-gray-400 dark:bg-[#5c6670]"
            style={{ width: 40 * buttonScale, height: 4 }}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <div 
        className="absolute -left-3 flex flex-col gap-2 z-20"
        style={{ top: '15%' }}
        data-testid="mobile-preview-volume-buttons"
      >
        <div 
          className="rounded-sm bg-gray-400 dark:bg-[#5c6670]"
          style={{ width: 4, height: 24 * buttonScale }}
          data-testid="mobile-preview-volume-up"
        />
        <div 
          className="rounded-sm bg-gray-400 dark:bg-[#5c6670]"
          style={{ width: 4, height: 24 * buttonScale }}
          data-testid="mobile-preview-volume-down"
        />
      </div>
      <div 
        className="absolute -right-3 z-20"
        style={{ top: '20%' }}
        data-testid="mobile-preview-power-button"
      >
        <div 
          className="rounded-sm bg-gray-400 dark:bg-[#5c6670]"
          style={{ width: 4, height: 40 * buttonScale }}
        />
      </div>
    </>
  );
}

function AppNotRunningState({ onRun }: { onRun: () => void }) {
  return (
    <LazyMotionDiv 
      className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-[24px] bg-white dark:bg-gray-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="mobile-preview-not-running"
    >
      <MonitorX 
        className="mb-4 w-12 h-12 text-gray-400 dark:text-[#5c6670]"
      />
      <h3 
        className="text-[15px] font-semibold leading-tight mb-2 text-gray-900 dark:text-white"
        data-testid="text-not-running-title"
      >
        Your app is not running
      </h3>
      <p 
        className="text-[13px] leading-[18px] text-center max-w-[200px] mb-6 text-gray-500 dark:text-[#5c6670]"
        data-testid="text-not-running-description"
      >
        Run to preview your app.
      </p>
      <Button
        onClick={onRun}
        className="h-11 px-6 text-[13px] font-medium rounded-lg gap-2 bg-green-500 hover:bg-green-600 text-white"
        data-testid="button-run-app"
      >
        <Play className="w-4 h-4" />
        Run
      </Button>
    </LazyMotionDiv>
  );
}

interface PreviewOptionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShareDevLink: () => void;
  onSharePublishedLink: () => void;
  onRepublish: () => void;
  onCloseTab: () => void;
}

function PreviewOptionsSheet({
  open,
  onOpenChange,
  onShareDevLink,
  onSharePublishedLink,
  onRepublish,
  onCloseTab,
}: PreviewOptionsSheetProps) {
  const optionButtonClass = "flex items-center gap-3 w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[44px]";
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-[20px] bg-white dark:bg-gray-900 p-0"
        data-testid="preview-options-sheet"
      >
        <SheetHeader className="p-4 pb-2 border-b border-gray-100 dark:border-gray-800">
          <SheetTitle 
            className="text-[15px] font-semibold text-gray-900 dark:text-white"
            data-testid="text-sheet-title"
          >
            Preview
          </SheetTitle>
          <SheetDescription 
            className="text-[13px] text-gray-500 dark:text-gray-400"
            data-testid="text-sheet-description"
          >
            Preview your App.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-2">
          <button
            onClick={() => {
              onShareDevLink();
              onOpenChange(false);
            }}
            className={optionButtonClass}
            data-testid="button-share-dev-link"
          >
            <Code className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-[13px] font-medium text-gray-900 dark:text-white">Share development link</span>
          </button>
          
          <button
            onClick={() => {
              onSharePublishedLink();
              onOpenChange(false);
            }}
            className={optionButtonClass}
            data-testid="button-share-published-link"
          >
            <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-[13px] font-medium text-gray-900 dark:text-white">Share published link</span>
          </button>
          
          <button
            onClick={() => {
              onRepublish();
              onOpenChange(false);
            }}
            className={optionButtonClass}
            data-testid="button-republish"
          >
            <Trees className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-[13px] font-medium text-gray-900 dark:text-white">Republish</span>
          </button>
          
          <button
            onClick={() => {
              onCloseTab();
              onOpenChange(false);
            }}
            className={optionButtonClass}
            data-testid="button-close-tab"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-[13px] font-medium text-gray-900 dark:text-white">Close tab</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function URLBar({ url, onCopy }: { url: string; onCopy: () => void }) {
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <div 
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] w-full min-w-0 bg-gray-100 dark:bg-[#242b3d] border border-gray-200 dark:border-[#3d4452]"
      data-testid="mobile-preview-url-bar"
    >
      <Lock 
        className="w-4 h-4 sm:w-[18px] sm:h-[18px] flex-shrink-0 text-green-500"
        data-testid="mobile-preview-lock-icon" 
      />
      <span 
        className="truncate flex-1 min-w-0 text-[12px] sm:text-[13px] text-gray-600 dark:text-[#9da2a6]" 
        title={url}
      >
        {displayUrl}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="w-9 h-9 sm:w-11 sm:h-11 p-0 flex-shrink-0 rounded-lg text-gray-500 dark:text-[#9da2a6] hover:text-gray-700 dark:hover:text-white"
        onClick={onCopy}
        data-testid="mobile-preview-copy-url"
      >
        <Copy className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
      </Button>
    </div>
  );
}

interface PreviewStatus {
  previewUrl: string | null;
  status: 'running' | 'stopped' | 'starting' | 'error' | 'static' | 'no_runnable_files';
  message?: string;
}

export function MobilePreviewPanel({ 
  projectId, 
  previewUrl: externalPreviewUrl,
  className 
}: MobilePreviewPanelProps) {
  const [selectedDevice, setSelectedDevice] = useState<DevicePreset>(devicePresets[2]);
  const [isLandscape, setIsLandscape] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [showDeviceFrame, setShowDeviceFrame] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOptionsSheetOpen, setIsOptionsSheetOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  // Query preview status from backend
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
      const data = query.state.data;
      if (data?.status === 'starting') return 2000;
      if (data?.status === 'running') return 10000;
      return false;
    }
  });

  // Start preview mutation
  const startPreviewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/preview/projects/${projectId}/preview/start`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Starting preview...', description: 'Your app is being built and started.' });
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

  const isPreviewRunning = previewStatus?.status === 'running' || previewStatus?.status === 'static';
  const isPreviewStarting = previewStatus?.status === 'starting' || startPreviewMutation.isPending;
  const computedPreviewUrl = externalPreviewUrl || previewStatus?.previewUrl || `/api/preview/projects/${projectId}/preview/`;

  // Auto-start preview like Replit does (use ref to prevent re-triggering)
  const hasAttemptedAutoStart = useRef(false);
  useEffect(() => {
    // Auto-start when preview is stopped and we haven't already tried
    if (
      previewStatus?.status === 'stopped' && 
      !hasAttemptedAutoStart.current &&
      projectId
    ) {
      hasAttemptedAutoStart.current = true;
      startPreviewMutation.mutate(undefined);
    }
  }, [previewStatus?.status, projectId]);

  const deviceWidth = isLandscape ? selectedDevice.height : selectedDevice.width;
  const deviceHeight = isLandscape ? selectedDevice.width : selectedDevice.height;

  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerWidth = container.clientWidth - 40;
      const containerHeight = container.clientHeight - 100;
      
      const scaleX = containerWidth / deviceWidth;
      const scaleY = containerHeight / deviceHeight;
      const newScale = Math.min(scaleX, scaleY, 1);
      
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [deviceWidth, deviceHeight]);

  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    setIframeKey(prev => prev + 1);
    toast({
      title: 'Preview refreshed',
      description: 'Reloading preview content',
    });
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleOpenExternal = () => {
    window.open(computedPreviewUrl, '_blank');
  };

  const handleRotate = () => {
    setIsLandscape(prev => !prev);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(computedPreviewUrl);
    toast({
      title: 'URL copied',
      description: 'Preview URL copied to clipboard',
    });
  };

  const handleRun = () => {
    startPreviewMutation.mutate(undefined);
  };

  const handleShareDevLink = () => {
    navigator.clipboard.writeText(computedPreviewUrl);
    toast({
      title: 'Development link copied',
      description: 'Share this link for development preview',
    });
  };

  const handleSharePublishedLink = () => {
    const publishedUrl = computedPreviewUrl.replace('/preview/', '/');
    navigator.clipboard.writeText(publishedUrl);
    toast({
      title: 'Published link copied',
      description: 'Share this link with others',
    });
  };

  const handleRepublish = () => {
    toast({
      title: 'Republishing',
      description: 'Your app is being republished...',
    });
  };

  const handleCloseTab = () => {
    toast({
      title: 'Tab closed',
      description: 'Preview tab has been closed',
    });
  };

  const springTransition = {
    type: "spring",
    stiffness: 300,
    damping: 30
  };

  return (
    <div 
      className={cn('flex flex-col h-full bg-gray-100 dark:bg-[#0e1525]', className)}
      ref={containerRef}
    >
      <div 
        className="flex-shrink-0 p-3 sm:p-4 border-b border-gray-200 dark:border-[#3d4452] bg-white dark:bg-[#1c2333]"
        data-testid="mobile-preview-toolbar"
      >
        {/* URL Bar - Full width on mobile, first row */}
        <div className="mb-2 w-full">
          <URLBar url={computedPreviewUrl} onCopy={handleCopyUrl} />
        </div>
        
        {/* Controls row */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-10 sm:h-11 px-2 sm:px-3 text-[14px] sm:text-[15px] leading-[20px] rounded-lg flex items-center gap-1 sm:gap-2"
                data-testid="mobile-preview-device-selector"
              >
                <selectedDevice.icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline font-medium text-gray-900 dark:text-white">{selectedDevice.name}</span>
                <ChevronDown className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-gray-500 dark:text-[#9da2a6]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="w-56 bg-white dark:bg-[#1c2333] border-gray-200 dark:border-[#3d4452]"
            >
              <DropdownMenuLabel className="text-[13px] text-gray-500 dark:text-[#9da2a6]">
                Phone Devices
              </DropdownMenuLabel>
              {devicePresets.filter(d => d.type === 'phone').map((device) => (
                <DropdownMenuItem
                  key={device.name}
                  onClick={() => {
                    setSelectedDevice(device);
                    setIsLoading(true);
                  }}
                  className="flex items-center gap-2 text-[15px] leading-[20px] text-gray-900 dark:text-white"
                  data-testid={`mobile-preview-device-${device.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <device.icon className="w-[18px] h-[18px]" />
                  <span>{device.name}</span>
                  {device.hasDynamicIsland && (
                    <span 
                      className="ml-1 text-[13px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    >
                      Dynamic Island
                    </span>
                  )}
                  <span className="ml-auto text-[13px] text-gray-400 dark:text-[#5c6670]">
                    {device.width}×{device.height}
                  </span>
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-[#3d4452]" />
              <DropdownMenuLabel className="text-[13px] text-gray-500 dark:text-[#9da2a6]">
                Tablet Devices
              </DropdownMenuLabel>
              {devicePresets.filter(d => d.type === 'tablet').map((device) => (
                <DropdownMenuItem
                  key={device.name}
                  onClick={() => {
                    setSelectedDevice(device);
                    setIsLoading(true);
                  }}
                  className="flex items-center gap-2 text-[15px] leading-[20px] text-gray-900 dark:text-white"
                  data-testid={`mobile-preview-device-${device.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <device.icon className="w-[18px] h-[18px]" />
                  <span>{device.name}</span>
                  <span className="ml-auto text-[13px] text-gray-400 dark:text-[#5c6670]">
                    {device.width}×{device.height}
                  </span>
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-[#3d4452]" />
              <DropdownMenuLabel className="text-[13px] text-gray-500 dark:text-[#9da2a6]">
                Desktop
              </DropdownMenuLabel>
              {devicePresets.filter(d => d.type === 'desktop').map((device) => (
                <DropdownMenuItem
                  key={device.name}
                  onClick={() => {
                    setSelectedDevice(device);
                    setIsLoading(true);
                  }}
                  className="flex items-center gap-2 text-[15px] leading-[20px] text-gray-900 dark:text-white"
                  data-testid={`mobile-preview-device-${device.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <device.icon className="w-[18px] h-[18px]" />
                  <span>{device.name}</span>
                  <span className="ml-auto text-[13px] text-gray-400 dark:text-[#5c6670]">
                    {device.width}×{device.height}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="ghost"
            className="w-10 h-10 sm:w-11 sm:h-11 p-0 rounded-lg text-gray-500 dark:text-[#9da2a6] hover:text-gray-700 dark:hover:text-white"
            onClick={handleRotate}
            data-testid="mobile-preview-rotate"
          >
            <RotateCw className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className={cn("w-10 h-10 sm:w-11 sm:h-11 p-0 rounded-lg text-gray-500 dark:text-[#9da2a6] hover:text-gray-700 dark:hover:text-white", isLoading && "animate-pulse")}
            onClick={handleRefresh}
            data-testid="mobile-preview-refresh"
          >
            <RefreshCw 
              className={cn("w-4 h-4 sm:w-[18px] sm:h-[18px]", isLoading && "animate-spin")} 
            />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="w-10 h-10 sm:w-11 sm:h-11 p-0 rounded-lg hidden sm:flex text-gray-500 dark:text-[#9da2a6] hover:text-gray-700 dark:hover:text-white"
            onClick={handleOpenExternal}
            data-testid="mobile-preview-external"
          >
            <ExternalLink className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
          </Button>

          <div className="flex-1" />

          <Button
            size="sm"
            variant={showDeviceFrame ? 'default' : 'ghost'}
            className="h-10 sm:h-11 px-3 sm:px-4 text-[13px] sm:text-[15px] leading-[20px] font-medium rounded-lg"
            onClick={() => setShowDeviceFrame(!showDeviceFrame)}
            data-testid="mobile-preview-device-frame-toggle"
          >
            <Smartphone className="w-4 h-4 sm:w-[18px] sm:h-[18px] mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Device Frame</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="w-10 h-10 sm:w-11 sm:h-11 p-0 rounded-lg text-gray-500 dark:text-[#9da2a6] hover:text-gray-700 dark:hover:text-white"
            onClick={() => setIsOptionsSheetOpen(true)}
            data-testid="mobile-preview-more-options"
          >
            <MoreVertical className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <LazyMotionDiv
          className="relative"
          animate={{
            width: deviceWidth * scale,
            height: deviceHeight * scale,
          }}
          transition={springTransition}
          data-testid="mobile-preview-device-container"
        >
          {showDeviceFrame && selectedDevice.type === 'phone' && (
            <>
              {/* Device frame */}
              <div 
                className="absolute -inset-3 rounded-[40px] bg-gray-800 dark:bg-[#1c2333] border-4 border-gray-700 dark:border-[#3d4452] shadow-2xl"
                data-testid="mobile-preview-device-frame"
              />
              <PhysicalButtons isLandscape={isLandscape} scale={scale} />
              {selectedDevice.hasDynamicIsland ? (
                <DynamicIsland scale={scale} />
              ) : (
                <ClassicNotch scale={scale} />
              )}
              <SimulatedStatusBar isLandscape={isLandscape} />
            </>
          )}

          {/* Iframe container */}
          <div 
            className={cn(
              "relative overflow-hidden bg-white dark:bg-gray-900",
              showDeviceFrame && selectedDevice.type === 'phone' ? "rounded-[24px]" : "rounded-lg"
            )}
            style={{
              width: deviceWidth * scale,
              height: deviceHeight * scale,
            }}
          >
            <LazyAnimatePresence mode="wait">
              {(isLoading || isStatusLoading || isPreviewStarting) && (
                <PreviewSplashScreen key="splash" />
              )}
            </LazyAnimatePresence>

            {/* Show different states based on preview status */}
            {isStatusLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : isPreviewStarting ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Starting preview...</p>
              </div>
            ) : previewStatus?.status === 'no_runnable_files' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-center p-4">
                <Globe className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-sm text-muted-foreground">No preview available. Add an HTML file or package.json.</p>
              </div>
            ) : !isPreviewRunning && !hasError ? (
              <AppNotRunningState onRun={handleRun} />
            ) : hasError ? (
              <AppNotRunningState onRun={handleRun} />
            ) : previewStatus?.previewUrl || externalPreviewUrl ? (
              <iframe
                ref={iframeRef}
                key={iframeKey}
                src={computedPreviewUrl}
                className="w-full h-full border-0"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  width: deviceWidth,
                  height: deviceHeight,
                }}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title="Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                data-testid="mobile-preview-iframe"
              />
            ) : (
              <AppNotRunningState onRun={handleRun} />
            )}
          </div>
        </LazyMotionDiv>
      </div>

      {/* Options Sheet */}
      <PreviewOptionsSheet
        open={isOptionsSheetOpen}
        onOpenChange={setIsOptionsSheetOpen}
        onShareDevLink={handleShareDevLink}
        onSharePublishedLink={handleSharePublishedLink}
        onRepublish={handleRepublish}
        onCloseTab={handleCloseTab}
      />
    </div>
  );
}
