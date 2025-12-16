import { motion } from 'framer-motion';
import { Play, Square, Monitor, Radio } from 'lucide-react';
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

const ReplitAgentIcon = ({ className }: { className?: string }) => (
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
);

const TasksIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const PanelToggleIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="3" y="4" width="7" height="16" rx="1" />
    <rect x="14" y="4" width="7" height="16" rx="1" />
  </svg>
);

const tabs: { id: MobileTab; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'agent', label: 'Agent' },
  { id: 'deploy', label: 'Deploy' },
];

export function ReplitMobileNavigation({
  activeTab,
  onTabChange,
  isRunning = false,
  onPlayStop,
  onPanelToggle,
  onMorePress,
}: ReplitMobileNavigationProps) {
  const handleTabClick = (tabId: MobileTab) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onTabChange(tabId);
  };

  const handlePlayStop = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([15, 10, 15]);
    }
    onPlayStop?.();
  };

  const handlePanelToggle = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onPanelToggle?.();
  };

  const handleMorePress = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onMorePress?.();
  };

  const renderTabIcon = (tabId: MobileTab, isActive: boolean) => {
    const iconClass = cn(
      "h-5 w-5 transition-colors",
      tabId === 'agent' && isActive ? "text-[#7C65C1]" :
      isActive ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
    );

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
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 mobile-safe-bottom">
      <div className="absolute inset-0 bg-white dark:bg-[#1C1C1C] border-t border-gray-200/60 dark:border-gray-800" />
      
      <nav className="relative flex items-center justify-between h-14 px-3">
        <motion.button
          onClick={handlePlayStop}
          className={cn(
            "relative flex items-center justify-center w-12 h-12 rounded-xl transition-colors",
            isRunning 
              ? "bg-[#0D0D0D] dark:bg-white" 
              : "bg-[#B8A5FF]"
          )}
          whileTap={{ scale: 0.92 }}
          data-testid="button-play-stop"
        >
          {isRunning ? (
            <Square className="h-5 w-5 text-white dark:text-black" fill="currentColor" />
          ) : (
            <Play className="h-5 w-5 text-white ml-0.5" fill="currentColor" />
          )}
        </motion.button>

        <div className="flex items-center bg-gray-100 dark:bg-[#2A2A2A] rounded-full px-1 py-1 gap-0.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "relative flex items-center justify-center w-12 h-10 rounded-full transition-all",
                  isActive && "bg-white dark:bg-[#3A3A3A] shadow-sm"
                )}
                whileTap={{ scale: 0.95 }}
                data-testid={`tab-${tab.id}`}
              >
                {renderTabIcon(tab.id, isActive)}
                
                {isActive && (
                  <motion.div
                    className="absolute bottom-0.5 left-1/2 w-1 h-1 bg-[#7C65C1] rounded-full"
                    layoutId="activeTabIndicator"
                    initial={false}
                    style={{ x: '-50%' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
          
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          
          <motion.button
            onClick={handleMorePress}
            className="relative flex items-center justify-center w-12 h-10 rounded-full transition-all hover:bg-gray-200/50 dark:hover:bg-[#3A3A3A]/50"
            whileTap={{ scale: 0.95 }}
            data-testid="button-more"
          >
            <TasksIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </motion.button>
        </div>

        <motion.button
          onClick={handlePanelToggle}
          className="flex items-center justify-center w-12 h-12 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors"
          whileTap={{ scale: 0.92 }}
          data-testid="button-panel-toggle"
        >
          <PanelToggleIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </motion.button>
      </nav>
    </div>
  );
}
