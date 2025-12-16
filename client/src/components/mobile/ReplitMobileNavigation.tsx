import { memo, useCallback } from 'react';
import { Play, Square, Monitor, Radio, Plus, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MobileTab = 'preview' | 'agent' | 'deploy' | 'more';

interface ReplitMobileNavigationProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  isRunning?: boolean;
  onPlayStop?: () => void;
  isPanelOpen?: boolean;
  onPanelToggle?: () => void;
  onMorePress?: () => void;
}

const ReplitAgentIcon = memo(({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
  >
    <circle cx="7" cy="7" r="3" />
    <circle cx="17" cy="7" r="3" />
    <circle cx="7" cy="17" r="3" />
    <circle cx="17" cy="17" r="3" />
  </svg>
));
ReplitAgentIcon.displayName = 'ReplitAgentIcon';

const tabConfig = [
  { id: 'preview' as const, label: 'Preview' },
  { id: 'agent' as const, label: 'Agent' },
  { id: 'deploy' as const, label: 'Deploy' },
] as const;

export const ReplitMobileNavigation = memo(function ReplitMobileNavigation({
  activeTab,
  onTabChange,
  isRunning = false,
  onPlayStop,
  onPanelToggle,
  onMorePress,
}: ReplitMobileNavigationProps) {
  const handleTabClick = useCallback((tabId: MobileTab) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onTabChange(tabId);
  }, [onTabChange]);

  const handlePlayStop = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([15, 10, 15]);
    }
    onPlayStop?.();
  }, [onPlayStop]);

  const handlePanelToggle = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onPanelToggle?.();
  }, [onPanelToggle]);

  const handleMorePress = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onMorePress?.();
  }, [onMorePress]);

  const renderTabIcon = useCallback((tabId: MobileTab, isActive: boolean) => {
    const baseClass = "h-5 w-5 transition-colors duration-150";
    const activeClass = tabId === 'agent' ? "text-[#7C65C1]" : "text-gray-900 dark:text-white";
    const inactiveClass = "text-gray-500 dark:text-gray-400";
    const iconClass = cn(baseClass, isActive ? activeClass : inactiveClass);

    switch (tabId) {
      case 'preview':
        return <Monitor className={iconClass} />;
      case 'agent':
        return <ReplitAgentIcon className={iconClass} />;
      case 'deploy':
        return <Radio className={iconClass} />;
      default:
        return null;
    }
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 mobile-safe-bottom">
      <div 
        className="absolute inset-0 bg-white/95 dark:bg-[#1C1C1C]/95 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-700/50"
        style={{ WebkitBackdropFilter: 'blur(20px)' }}
      />
      
      <nav className="relative flex items-center justify-between h-14 px-3">
        <button
          onClick={handlePlayStop}
          className={cn(
            "relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150",
            "active:scale-95 touch-manipulation",
            isRunning 
              ? "bg-gray-900 dark:bg-white shadow-lg" 
              : "bg-[#B8A5FF] shadow-lg shadow-purple-500/25"
          )}
          data-testid="button-play-stop"
        >
          {isRunning ? (
            <Square className="h-4 w-4 text-white dark:text-gray-900" fill="currentColor" />
          ) : (
            <Play className="h-5 w-5 text-white ml-0.5" fill="currentColor" />
          )}
        </button>

        <div 
          className="flex items-center bg-gray-100/80 dark:bg-[#2A2A2A]/80 backdrop-blur-sm rounded-full p-1 shadow-sm"
          style={{ WebkitBackdropFilter: 'blur(8px)' }}
        >
          {tabConfig.map((tab) => {
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "relative flex items-center justify-center w-11 h-9 rounded-full transition-all duration-150",
                  "active:scale-95 touch-manipulation",
                  isActive && "bg-white dark:bg-[#3A3A3A] shadow-sm"
                )}
                data-testid={`tab-${tab.id}`}
              >
                {renderTabIcon(tab.id, isActive)}
                
                {isActive && (
                  <span 
                    className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#7C65C1] rounded-full"
                  />
                )}
              </button>
            );
          })}
          
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
          
          <button
            onClick={handleMorePress}
            className={cn(
              "relative flex items-center justify-center w-11 h-9 rounded-full transition-all duration-150",
              "active:scale-95 active:bg-gray-200 dark:active:bg-[#3A3A3A] touch-manipulation"
            )}
            data-testid="button-more"
          >
            <Plus className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <button
          onClick={handlePanelToggle}
          className={cn(
            "flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-150",
            "active:scale-95 active:bg-gray-100 dark:active:bg-[#2A2A2A] touch-manipulation"
          )}
          data-testid="button-panel-toggle"
        >
          <MoreVertical className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </nav>
    </div>
  );
});
