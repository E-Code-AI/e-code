import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, Tablet, Monitor, RotateCw, RefreshCw,
  ExternalLink, ChevronDown, Lock, Copy, Globe,
  Signal, Wifi, BatteryFull, MoreVertical, MonitorX,
  Code, Trees, X, Play
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

const colors = {
  primary: '#0079f2',
  background: '#0e1525',
  textMuted: '#5c6670',
  border: '#d4d8dd',
  surface: '#3d4452',
  white: '#ffffff',
  dark: '#1c2333',
  textSecondary: '#9da2a6',
  surfaceAlt: '#242b3d',
};

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
        "text-[13px] font-medium",
        isLandscape ? "h-5" : "h-6"
      )}
      style={{ 
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)',
        backdropFilter: 'blur(4px)',
        color: colors.white,
      }}
      data-testid="mobile-preview-status-bar"
    >
      <div className="flex items-center gap-1">
        <span>{formattedTime}</span>
      </div>
      <div className="flex items-center gap-1">
        <Signal className="w-[18px] h-[18px]" />
        <Wifi className="w-[18px] h-[18px]" />
        <BatteryFull className="w-[18px] h-[18px]" />
        <span className="text-[13px]">100%</span>
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
        className="rounded-[22px] flex items-center justify-center"
        style={{ 
          width: 126 * Math.min(scale, 1), 
          height: 37 * Math.min(scale, 1),
          minWidth: 90,
          minHeight: 26,
          backgroundColor: colors.background,
        }}
      >
        <div 
          className="rounded-full mr-1"
          style={{ 
            width: 12 * Math.min(scale, 1), 
            height: 12 * Math.min(scale, 1),
            minWidth: 8,
            minHeight: 8,
            backgroundColor: colors.surface,
          }}
        />
      </div>
    </div>
  );
}

function ClassicNotch({ scale }: { scale: number }) {
  return (
    <div 
      className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-3xl z-30"
      style={{ 
        width: Math.max(120 * Math.min(scale, 1), 80), 
        height: Math.max(24 * Math.min(scale, 1), 16),
        backgroundColor: colors.surface,
      }}
      data-testid="mobile-preview-notch"
    >
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
        style={{ backgroundColor: colors.dark }}
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
            className="rounded-sm"
            style={{ width: 24 * buttonScale, height: 4, backgroundColor: colors.textMuted }}
            data-testid="mobile-preview-volume-up"
          />
          <div 
            className="rounded-sm"
            style={{ width: 24 * buttonScale, height: 4, backgroundColor: colors.textMuted }}
            data-testid="mobile-preview-volume-down"
          />
        </div>
        <div 
          className="absolute -bottom-3 z-20"
          style={{ right: '25%' }}
          data-testid="mobile-preview-power-button"
        >
          <div 
            className="rounded-sm"
            style={{ width: 40 * buttonScale, height: 4, backgroundColor: colors.textMuted }}
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
          className="rounded-sm"
          style={{ width: 4, height: 24 * buttonScale, backgroundColor: colors.textMuted }}
          data-testid="mobile-preview-volume-up"
        />
        <div 
          className="rounded-sm"
          style={{ width: 4, height: 24 * buttonScale, backgroundColor: colors.textMuted }}
          data-testid="mobile-preview-volume-down"
        />
      </div>
      <div 
        className="absolute -right-3 z-20"
        style={{ top: '20%' }}
        data-testid="mobile-preview-power-button"
      >
        <div 
          className="rounded-sm"
          style={{ width: 4, height: 40 * buttonScale, backgroundColor: colors.textMuted }}
        />
      </div>
    </>
  );
}

function AppNotRunningState({ onRun }: { onRun: () => void }) {
  return (
    <motion.div 
      className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-[24px]"
      style={{ backgroundColor: colors.white }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="mobile-preview-not-running"
    >
      <MonitorX 
        className="mb-4"
        style={{ width: 48, height: 48, color: colors.textMuted }}
      />
      <h3 
        className="text-[17px] font-semibold leading-tight mb-2"
        style={{ color: colors.dark }}
        data-testid="text-not-running-title"
      >
        Your app is not running
      </h3>
      <p 
        className="text-[15px] leading-[20px] text-center max-w-[200px] mb-6"
        style={{ color: colors.textMuted }}
        data-testid="text-not-running-description"
      >
        Run to preview your app.
      </p>
      <Button
        onClick={onRun}
        className="h-11 px-6 text-[15px] font-medium rounded-lg gap-2"
        style={{ backgroundColor: '#22c55e', color: colors.white }}
        data-testid="button-run-app"
      >
        <Play className="w-4 h-4" />
        Run
      </Button>
    </motion.div>
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
  const optionButtonClass = "flex items-center gap-3 w-full p-4 text-left hover:bg-gray-100 transition-colors min-h-[56px]";
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-[20px] bg-white p-0"
        data-testid="preview-options-sheet"
      >
        <SheetHeader className="p-4 pb-2 border-b border-gray-100">
          <SheetTitle 
            className="text-[17px] font-semibold text-black"
            data-testid="text-sheet-title"
          >
            Preview
          </SheetTitle>
          <SheetDescription 
            className="text-[15px] text-gray-500"
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
            <Code className="w-5 h-5 text-gray-600" />
            <span className="text-[15px] font-medium text-black">Share development link</span>
          </button>
          
          <button
            onClick={() => {
              onSharePublishedLink();
              onOpenChange(false);
            }}
            className={optionButtonClass}
            data-testid="button-share-published-link"
          >
            <Globe className="w-5 h-5 text-gray-600" />
            <span className="text-[15px] font-medium text-black">Share published link</span>
          </button>
          
          <button
            onClick={() => {
              onRepublish();
              onOpenChange(false);
            }}
            className={optionButtonClass}
            data-testid="button-republish"
          >
            <Trees className="w-5 h-5 text-gray-600" />
            <span className="text-[15px] font-medium text-black">Republish</span>
          </button>
          
          <button
            onClick={() => {
              onCloseTab();
              onOpenChange(false);
            }}
            className={optionButtonClass}
            data-testid="button-close-tab"
          >
            <X className="w-5 h-5 text-gray-600" />
            <span className="text-[15px] font-medium text-black">Close tab</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function URLBar({ url, onCopy }: { url: string; onCopy: () => void }) {
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const truncatedUrl = displayUrl.length > 40 
    ? displayUrl.substring(0, 37) + '...' 
    : displayUrl;

  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px]"
      style={{ backgroundColor: colors.surfaceAlt, border: `1px solid ${colors.surface}` }}
      data-testid="mobile-preview-url-bar"
    >
      <Lock 
        className="w-[18px] h-[18px] flex-shrink-0" 
        style={{ color: '#22c55e' }}
        data-testid="mobile-preview-lock-icon" 
      />
      <span className="truncate" title={url} style={{ color: colors.textSecondary }}>
        {truncatedUrl}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="w-11 h-11 p-0 flex-shrink-0 rounded-lg"
        onClick={onCopy}
        data-testid="mobile-preview-copy-url"
      >
        <Copy className="w-[18px] h-[18px]" style={{ color: colors.textSecondary }} />
      </Button>
    </div>
  );
}

export function MobilePreviewPanel({ 
  projectId, 
  previewUrl,
  className 
}: MobilePreviewPanelProps) {
  const [selectedDevice, setSelectedDevice] = useState<DevicePreset>(devicePresets[2]);
  const [isLandscape, setIsLandscape] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [showDeviceFrame, setShowDeviceFrame] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOptionsSheetOpen, setIsOptionsSheetOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  const computedPreviewUrl = previewUrl || `${window.location.origin}/preview/${projectId}`;

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
    setIsLoading(true);
    setHasError(false);
    setIframeKey(prev => prev + 1);
    toast({
      title: 'Starting app',
      description: 'Running your application...',
    });
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
      className={cn('flex flex-col h-full', className)}
      style={{ backgroundColor: colors.background }}
      ref={containerRef}
    >
      <div 
        className="flex-shrink-0 p-4 min-h-[56px]"
        style={{ borderBottom: `1px solid ${colors.surface}`, backgroundColor: colors.dark }}
        data-testid="mobile-preview-toolbar"
      >
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-11 px-3 text-[15px] leading-[20px] rounded-lg flex items-center gap-2"
                data-testid="mobile-preview-device-selector"
              >
                <selectedDevice.icon className="w-[18px] h-[18px]" />
                <span className="hidden sm:inline font-medium" style={{ color: colors.white }}>{selectedDevice.name}</span>
                <ChevronDown className="w-[18px] h-[18px]" style={{ color: colors.textSecondary }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="w-56"
              style={{ backgroundColor: colors.dark, borderColor: colors.surface }}
            >
              <DropdownMenuLabel className="text-[13px]" style={{ color: colors.textSecondary }}>
                Phone Devices
              </DropdownMenuLabel>
              {devicePresets.filter(d => d.type === 'phone').map((device) => (
                <DropdownMenuItem
                  key={device.name}
                  onClick={() => {
                    setSelectedDevice(device);
                    setIsLoading(true);
                  }}
                  className="flex items-center gap-2 text-[15px] leading-[20px]"
                  style={{ color: colors.white }}
                  data-testid={`mobile-preview-device-${device.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <device.icon className="w-[18px] h-[18px]" />
                  <span>{device.name}</span>
                  {device.hasDynamicIsland && (
                    <span 
                      className="ml-1 text-[13px] px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                    >
                      Dynamic Island
                    </span>
                  )}
                  <span className="ml-auto text-[13px]" style={{ color: colors.textMuted }}>
                    {device.width}×{device.height}
                  </span>
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator style={{ backgroundColor: colors.surface }} />
              <DropdownMenuLabel className="text-[13px]" style={{ color: colors.textSecondary }}>
                Tablet Devices
              </DropdownMenuLabel>
              {devicePresets.filter(d => d.type === 'tablet').map((device) => (
                <DropdownMenuItem
                  key={device.name}
                  onClick={() => {
                    setSelectedDevice(device);
                    setIsLoading(true);
                  }}
                  className="flex items-center gap-2 text-[15px] leading-[20px]"
                  style={{ color: colors.white }}
                  data-testid={`mobile-preview-device-${device.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <device.icon className="w-[18px] h-[18px]" />
                  <span>{device.name}</span>
                  <span className="ml-auto text-[13px]" style={{ color: colors.textMuted }}>
                    {device.width}×{device.height}
                  </span>
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator style={{ backgroundColor: colors.surface }} />
              <DropdownMenuLabel className="text-[13px]" style={{ color: colors.textSecondary }}>
                Desktop
              </DropdownMenuLabel>
              {devicePresets.filter(d => d.type === 'desktop').map((device) => (
                <DropdownMenuItem
                  key={device.name}
                  onClick={() => {
                    setSelectedDevice(device);
                    setIsLoading(true);
                  }}
                  className="flex items-center gap-2 text-[15px] leading-[20px]"
                  style={{ color: colors.white }}
                  data-testid={`mobile-preview-device-${device.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <device.icon className="w-[18px] h-[18px]" />
                  <span>{device.name}</span>
                  <span className="ml-auto text-[13px]" style={{ color: colors.textMuted }}>
                    {device.width}×{device.height}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="ghost"
            className="w-11 h-11 p-0 rounded-lg"
            onClick={handleRotate}
            data-testid="mobile-preview-rotate"
          >
            <RotateCw className="w-[18px] h-[18px]" style={{ color: colors.textSecondary }} />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className={cn("w-11 h-11 p-0 rounded-lg", isLoading && "animate-pulse")}
            onClick={handleRefresh}
            data-testid="mobile-preview-refresh"
          >
            <RefreshCw 
              className={cn("w-[18px] h-[18px]", isLoading && "animate-spin")} 
              style={{ color: colors.textSecondary }}
            />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="w-11 h-11 p-0 rounded-lg"
            onClick={handleOpenExternal}
            data-testid="mobile-preview-external"
          >
            <ExternalLink className="w-[18px] h-[18px]" style={{ color: colors.textSecondary }} />
          </Button>

          <div className="flex-1 flex justify-center">
            <URLBar url={computedPreviewUrl} onCopy={handleCopyUrl} />
          </div>

          <Button
            size="sm"
            variant={showDeviceFrame ? 'default' : 'ghost'}
            className="h-11 px-4 text-[15px] leading-[20px] font-medium rounded-lg"
            style={{ 
              backgroundColor: showDeviceFrame ? colors.primary : 'transparent',
              color: showDeviceFrame ? colors.white : colors.textSecondary,
            }}
            onClick={() => setShowDeviceFrame(prev => !prev)}
            data-testid="mobile-preview-frame-toggle"
          >
            {showDeviceFrame ? 'Hide Frame' : 'Show Frame'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="w-11 h-11 p-0 rounded-lg"
            onClick={() => setIsOptionsSheetOpen(true)}
            data-testid="mobile-preview-options-menu"
          >
            <MoreVertical className="w-[18px] h-[18px]" style={{ color: colors.textSecondary }} />
          </Button>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[13px]" style={{ color: colors.textMuted }}>
          <span>{isLandscape ? 'Landscape' : 'Portrait'}</span>
          <span>•</span>
          <span>{deviceWidth}×{deviceHeight}px</span>
          <span>•</span>
          <span>{Math.round(scale * 100)}% scale</span>
          {selectedDevice.hasDynamicIsland && (
            <>
              <span>•</span>
              <span style={{ color: colors.primary }}>Dynamic Island</span>
            </>
          )}
        </div>
      </div>

      <div 
        className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-auto"
        style={{ perspective: '1500px' }}
      >
        <motion.div
          key={`${selectedDevice.name}-${isLandscape}`}
          className={cn('relative', showDeviceFrame && 'shadow-2xl')}
          style={{
            width: deviceWidth * scale,
            height: deviceHeight * scale,
            transformStyle: 'preserve-3d',
          }}
          initial={{ opacity: 0, rotateY: isLandscape ? -90 : 90, scale: 0.8 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          transition={springTransition}
          data-testid="mobile-preview-container"
        >
          {showDeviceFrame && selectedDevice.type === 'phone' && (
            <PhysicalButtons isLandscape={isLandscape} scale={scale} />
          )}

          {showDeviceFrame && (
            <div 
              className="absolute inset-0 border-[12px] rounded-[36px] pointer-events-none z-10"
              style={{ borderColor: colors.surface }}
              data-testid="mobile-preview-frame"
            >
              {selectedDevice.type === 'phone' && !isLandscape && (
                selectedDevice.hasDynamicIsland ? (
                  <DynamicIsland scale={scale} />
                ) : (
                  <ClassicNotch scale={scale} />
                )
              )}
            </div>
          )}

          {showDeviceFrame && selectedDevice.type === 'phone' && (
            <SimulatedStatusBar isLandscape={isLandscape} />
          )}

          <AnimatePresence>
            {isLoading && (
              <motion.div 
                className="absolute inset-0 z-40 rounded-[24px] overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                data-testid="mobile-preview-loading"
              >
                <PreviewSplashScreen isBuilding={isLoading} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {hasError && !isLoading && <AppNotRunningState onRun={handleRun} />}
          </AnimatePresence>

          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={computedPreviewUrl}
            className={cn('w-full h-full', showDeviceFrame ? 'rounded-[24px]' : 'rounded-lg')}
            style={{ backgroundColor: colors.white }}
            title={`Preview - ${selectedDevice.name}`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            data-testid="mobile-preview-iframe"
          />
        </motion.div>
      </div>

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
