import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, Tablet, Monitor, RotateCw, RefreshCw,
  ExternalLink, ChevronDown, X
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
}

const devicePresets: DevicePreset[] = [
  { name: 'iPhone SE', width: 375, height: 667, type: 'phone', icon: Smartphone },
  { name: 'iPhone 14', width: 390, height: 844, type: 'phone', icon: Smartphone },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932, type: 'phone', icon: Smartphone },
  { name: 'Samsung Galaxy S21', width: 360, height: 800, type: 'phone', icon: Smartphone },
  { name: 'Google Pixel 7', width: 412, height: 915, type: 'phone', icon: Smartphone },
  { name: 'iPad Mini', width: 768, height: 1024, type: 'tablet', icon: Tablet },
  { name: 'iPad Pro 11"', width: 834, height: 1194, type: 'tablet', icon: Tablet },
  { name: 'Desktop 1080p', width: 1920, height: 1080, type: 'desktop', icon: Monitor },
];

interface MobilePreviewPanelProps {
  projectId: string | number; // Support both UUID strings and numeric IDs
  previewUrl?: string;
  className?: string;
}

export function MobilePreviewPanel({ 
  projectId, 
  previewUrl,
  className 
}: MobilePreviewPanelProps) {
  const [selectedDevice, setSelectedDevice] = useState<DevicePreset>(devicePresets[0]);
  const [isLandscape, setIsLandscape] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [showDeviceFrame, setShowDeviceFrame] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  // Get computed preview URL
  const computedPreviewUrl = previewUrl || `${window.location.origin}/preview/${projectId}`;

  // Get device dimensions (swap if landscape)
  const deviceWidth = isLandscape ? selectedDevice.height : selectedDevice.width;
  const deviceHeight = isLandscape ? selectedDevice.width : selectedDevice.height;

  // Calculate scale to fit in container
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerWidth = container.clientWidth - 40; // Padding
      const containerHeight = container.clientHeight - 100; // Toolbar height
      
      const scaleX = containerWidth / deviceWidth;
      const scaleY = containerHeight / deviceHeight;
      const newScale = Math.min(scaleX, scaleY, 1); // Max scale 1 (100%)
      
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [deviceWidth, deviceHeight]);

  // Refresh iframe
  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
    toast({
      title: 'Preview refreshed',
      description: 'Reloading preview content',
    });
  };

  // Open in new tab
  const handleOpenExternal = () => {
    window.open(computedPreviewUrl, '_blank');
  };

  // Toggle orientation
  const handleRotate = () => {
    setIsLandscape(prev => !prev);
  };

  return (
    <div 
      className={cn('flex flex-col h-full bg-[#1e1e1e]', className)}
      ref={containerRef}
    >
      {/* Toolbar */}
      <div 
        className="flex-shrink-0 border-b border-[#3e3e42] bg-[#252526] p-2"
        data-testid="mobile-preview-toolbar"
      >
        <div className="flex items-center gap-2">
          {/* Device Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs hover:bg-[#3e3e42] active:scale-95 touch-manipulation flex items-center gap-2"
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
                  onClick={() => setSelectedDevice(device)}
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
              <DropdownMenuLabel>Tablet Devices</DropdownMenuLabel>
              {devicePresets.filter(d => d.type === 'tablet').map((device) => (
                <DropdownMenuItem
                  key={device.name}
                  onClick={() => setSelectedDevice(device)}
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
                  onClick={() => setSelectedDevice(device)}
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
            className="h-8 w-8 p-0 hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
            onClick={handleRotate}
            data-testid="mobile-preview-rotate"
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          {/* Refresh Button */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
            onClick={handleRefresh}
            data-testid="mobile-preview-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Open External */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
            onClick={handleOpenExternal}
            data-testid="mobile-preview-external"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>

          <div className="flex-1" />

          {/* Device Frame Toggle */}
          <Button
            size="sm"
            variant={showDeviceFrame ? 'default' : 'ghost'}
            className="h-8 px-3 text-xs hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
            onClick={() => setShowDeviceFrame(prev => !prev)}
            data-testid="mobile-preview-frame-toggle"
          >
            {showDeviceFrame ? 'Hide Frame' : 'Show Frame'}
          </Button>
        </div>

        {/* Device Info */}
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
          <span>{isLandscape ? 'Landscape' : 'Portrait'}</span>
          <span>•</span>
          <span>{deviceWidth}×{deviceHeight}px</span>
          <span>•</span>
          <span>{Math.round(scale * 100)}% scale</span>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-auto">
        <motion.div
          key={`${selectedDevice.name}-${isLandscape}`}
          className={cn(
            'relative transition-all',
            showDeviceFrame && 'shadow-2xl'
          )}
          style={{
            width: deviceWidth * scale,
            height: deviceHeight * scale,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          data-testid="mobile-preview-container"
        >
          {/* Device Frame */}
          {showDeviceFrame && (
            <div 
              className="absolute inset-0 border-[12px] border-[#2a2a2a] rounded-[36px] pointer-events-none z-10"
              data-testid="mobile-preview-frame"
            >
              {/* Notch (for phone devices) */}
              {selectedDevice.type === 'phone' && !isLandscape && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#2a2a2a] rounded-b-3xl" />
              )}
              
              {/* Camera (for phone devices) */}
              {selectedDevice.type === 'phone' && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a1a1a] rounded-full" />
              )}
            </div>
          )}

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
            data-testid="mobile-preview-iframe"
          />
        </motion.div>
      </div>
    </div>
  );
}
