import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, Tablet, Monitor, RotateCw, RefreshCw,
  ExternalLink, ChevronDown, Lock, Copy, Loader2,
  Signal, Wifi, BatteryFull
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
import { useToast } from '@/hooks/use-toast';

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
        "text-[10px] font-medium text-gray-900 dark:text-white",
        isLandscape ? "h-5" : "h-6"
      )}
      style={{ 
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)',
        backdropFilter: 'blur(4px)'
      }}
      data-testid="mobile-preview-status-bar"
    >
      <div className="flex items-center gap-1">
        <span>{formattedTime}</span>
      </div>
      <div className="flex items-center gap-1">
        <Signal className="h-3 w-3" />
        <Wifi className="h-3 w-3" />
        <BatteryFull className="h-3 w-3" />
        <span className="text-[9px]">100%</span>
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
        className="bg-black rounded-[22px] flex items-center justify-center"
        style={{ 
          width: 126 * Math.min(scale, 1), 
          height: 37 * Math.min(scale, 1),
          minWidth: 90,
          minHeight: 26
        }}
      >
        <div 
          className="w-3 h-3 bg-gray-800 rounded-full mr-1"
          style={{ 
            width: 12 * Math.min(scale, 1), 
            height: 12 * Math.min(scale, 1),
            minWidth: 8,
            minHeight: 8
          }}
        />
      </div>
    </div>
  );
}

function ClassicNotch({ scale }: { scale: number }) {
  return (
    <div 
      className="absolute top-0 left-1/2 -translate-x-1/2 bg-gray-700 dark:bg-[#2a2a2a] rounded-b-3xl z-30"
      style={{ 
        width: Math.max(120 * Math.min(scale, 1), 80), 
        height: Math.max(24 * Math.min(scale, 1), 16) 
      }}
      data-testid="mobile-preview-notch"
    >
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gray-800 dark:bg-[#1a1a1a] rounded-full"
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
        {/* Volume buttons - top in landscape */}
        <div 
          className="absolute -top-3 flex gap-3 z-20"
          style={{ left: '20%' }}
          data-testid="mobile-preview-volume-buttons"
        >
          <div 
            className="bg-gray-600 dark:bg-gray-500 rounded-sm"
            style={{ width: 24 * buttonScale, height: 4 }}
            data-testid="mobile-preview-volume-up"
          />
          <div 
            className="bg-gray-600 dark:bg-gray-500 rounded-sm"
            style={{ width: 24 * buttonScale, height: 4 }}
            data-testid="mobile-preview-volume-down"
          />
        </div>
        {/* Power button - bottom in landscape */}
        <div 
          className="absolute -bottom-3 z-20"
          style={{ right: '25%' }}
          data-testid="mobile-preview-power-button"
        >
          <div 
            className="bg-gray-600 dark:bg-gray-500 rounded-sm"
            style={{ width: 40 * buttonScale, height: 4 }}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {/* Volume buttons - left side */}
      <div 
        className="absolute -left-3 flex flex-col gap-2 z-20"
        style={{ top: '15%' }}
        data-testid="mobile-preview-volume-buttons"
      >
        <div 
          className="bg-gray-600 dark:bg-gray-500 rounded-sm"
          style={{ width: 4, height: 24 * buttonScale }}
          data-testid="mobile-preview-volume-up"
        />
        <div 
          className="bg-gray-600 dark:bg-gray-500 rounded-sm"
          style={{ width: 4, height: 24 * buttonScale }}
          data-testid="mobile-preview-volume-down"
        />
      </div>
      {/* Power button - right side */}
      <div 
        className="absolute -right-3 z-20"
        style={{ top: '20%' }}
        data-testid="mobile-preview-power-button"
      >
        <div 
          className="bg-gray-600 dark:bg-gray-500 rounded-sm"
          style={{ width: 4, height: 40 * buttonScale }}
        />
      </div>
    </>
  );
}

function LoadingIndicator() {
  return (
    <motion.div 
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[var(--ecode-surface)] dark:bg-[var(--ecode-background)] backdrop-blur-sm rounded-[24px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      data-testid="mobile-preview-loading"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="h-8 w-8 text-primary" />
      </motion.div>
      <span className="mt-3 text-sm text-muted-foreground font-medium">
        Loading preview...
      </span>
    </motion.div>
  );
}

function URLBar({ url, onCopy }: { url: string; onCopy: () => void }) {
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const truncatedUrl = displayUrl.length > 40 
    ? displayUrl.substring(0, 37) + '...' 
    : displayUrl;

  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 dark:bg-[var(--ecode-surface)] rounded-full border border-border dark:border-[var(--ecode-border)] text-xs"
      data-testid="mobile-preview-url-bar"
    >
      <Lock className="h-3 w-3 text-green-500 flex-shrink-0" data-testid="mobile-preview-lock-icon" />
      <span className="text-muted-foreground truncate" title={url}>
        {truncatedUrl}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-5 w-5 p-0 hover:bg-muted dark:hover:bg-[var(--ecode-surface-hover)] flex-shrink-0"
        onClick={onCopy}
        data-testid="mobile-preview-copy-url"
      >
        <Copy className="h-3 w-3" />
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
    setIframeKey(prev => prev + 1);
    toast({
      title: 'Preview refreshed',
      description: 'Reloading preview content',
    });
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
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

  const springTransition = {
    type: "spring",
    stiffness: 300,
    damping: 30
  };

  return (
    <div 
      className={cn('flex flex-col h-full bg-background dark:bg-[var(--ecode-background)]', className)}
      ref={containerRef}
    >
      {/* Toolbar */}
      <div 
        className="flex-shrink-0 border-b border-border dark:border-[var(--ecode-border)] bg-card dark:bg-[var(--ecode-surface)] p-2"
        data-testid="mobile-preview-toolbar"
      >
        <div className="flex items-center gap-2">
          {/* Device Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs hover:bg-muted dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation flex items-center gap-2"
                data-testid="mobile-preview-device-selector"
              >
                <selectedDevice.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{selectedDevice.name}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Phone Devices</DropdownMenuLabel>
              {devicePresets.filter(d => d.type === 'phone').map((device) => (
                <DropdownMenuItem
                  key={device.name}
                  onClick={() => {
                    setSelectedDevice(device);
                    setIsLoading(true);
                  }}
                  className="flex items-center gap-2"
                  data-testid={`mobile-preview-device-${device.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <device.icon className="h-4 w-4" />
                  <span>{device.name}</span>
                  {device.hasDynamicIsland && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                      Dynamic Island
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {device.width}×{device.height}
                  </span>
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Tablet Devices</DropdownMenuLabel>
              {devicePresets.filter(d => d.type === 'tablet').map((device) => (
                <DropdownMenuItem
                  key={device.name}
                  onClick={() => {
                    setSelectedDevice(device);
                    setIsLoading(true);
                  }}
                  className="flex items-center gap-2"
                  data-testid={`mobile-preview-device-${device.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <device.icon className="h-4 w-4" />
                  <span>{device.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {device.width}×{device.height}
                  </span>
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Desktop</DropdownMenuLabel>
              {devicePresets.filter(d => d.type === 'desktop').map((device) => (
                <DropdownMenuItem
                  key={device.name}
                  onClick={() => {
                    setSelectedDevice(device);
                    setIsLoading(true);
                  }}
                  className="flex items-center gap-2"
                  data-testid={`mobile-preview-device-${device.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <device.icon className="h-4 w-4" />
                  <span>{device.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {device.width}×{device.height}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Rotate Button */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-muted dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation"
            onClick={handleRotate}
            data-testid="mobile-preview-rotate"
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          {/* Refresh Button */}
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 w-8 p-0 hover:bg-muted dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation",
              isLoading && "animate-pulse"
            )}
            onClick={handleRefresh}
            data-testid="mobile-preview-refresh"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>

          {/* Open External */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-muted dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation"
            onClick={handleOpenExternal}
            data-testid="mobile-preview-external"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>

          {/* URL Bar */}
          <div className="flex-1 flex justify-center">
            <URLBar url={computedPreviewUrl} onCopy={handleCopyUrl} />
          </div>

          {/* Device Frame Toggle */}
          <Button
            size="sm"
            variant={showDeviceFrame ? 'default' : 'ghost'}
            className="h-8 px-3 text-xs hover:bg-muted dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation"
            onClick={() => setShowDeviceFrame(prev => !prev)}
            data-testid="mobile-preview-frame-toggle"
          >
            {showDeviceFrame ? 'Hide Frame' : 'Show Frame'}
          </Button>
        </div>

        {/* Device Info */}
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{isLandscape ? 'Landscape' : 'Portrait'}</span>
          <span>•</span>
          <span>{deviceWidth}×{deviceHeight}px</span>
          <span>•</span>
          <span>{Math.round(scale * 100)}% scale</span>
          {selectedDevice.hasDynamicIsland && (
            <>
              <span>•</span>
              <span className="text-primary">Dynamic Island</span>
            </>
          )}
        </div>
      </div>

      {/* Preview Container */}
      <div 
        className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-auto"
        style={{ perspective: '1500px' }}
      >
        <motion.div
          key={`${selectedDevice.name}-${isLandscape}`}
          className={cn(
            'relative',
            showDeviceFrame && 'shadow-2xl'
          )}
          style={{
            width: deviceWidth * scale,
            height: deviceHeight * scale,
            transformStyle: 'preserve-3d',
          }}
          initial={{ 
            opacity: 0, 
            rotateY: isLandscape ? -90 : 90,
            scale: 0.8 
          }}
          animate={{ 
            opacity: 1, 
            rotateY: 0,
            scale: 1 
          }}
          transition={springTransition}
          data-testid="mobile-preview-container"
        >
          {/* Physical Buttons */}
          {showDeviceFrame && selectedDevice.type === 'phone' && (
            <PhysicalButtons 
              isLandscape={isLandscape} 
              scale={scale}
            />
          )}

          {/* Device Frame */}
          {showDeviceFrame && (
            <div 
              className="absolute inset-0 border-[12px] border-gray-700 dark:border-[#2a2a2a] rounded-[36px] pointer-events-none z-10"
              data-testid="mobile-preview-frame"
            >
              {/* Notch or Dynamic Island (for phone devices in portrait) */}
              {selectedDevice.type === 'phone' && !isLandscape && (
                selectedDevice.hasDynamicIsland ? (
                  <DynamicIsland scale={scale} />
                ) : (
                  <ClassicNotch scale={scale} />
                )
              )}
            </div>
          )}

          {/* Simulated Status Bar */}
          {showDeviceFrame && selectedDevice.type === 'phone' && (
            <SimulatedStatusBar isLandscape={isLandscape} />
          )}

          {/* Loading Indicator */}
          <AnimatePresence>
            {isLoading && <LoadingIndicator />}
          </AnimatePresence>

          {/* iframe */}
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={computedPreviewUrl}
            className={cn(
              'w-full h-full bg-white',
              showDeviceFrame ? 'rounded-[24px]' : 'rounded-lg'
            )}
            title={`Preview - ${selectedDevice.name}`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            onLoad={handleIframeLoad}
            data-testid="mobile-preview-iframe"
          />
        </motion.div>
      </div>
    </div>
  );
}
