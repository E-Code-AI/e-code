import { motion } from 'framer-motion';
import { 
  Play, Square, Monitor, Plus, Globe, 
  PanelRightOpen, PanelRightClose
} from 'lucide-react';
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

const tabs: { id: MobileTab; icon: typeof Monitor; label: string }[] = [
  { id: 'preview', icon: Monitor, label: 'Preview' },
  { id: 'agent', icon: ReplitAgentIcon as any, label: 'Agent' },
  { id: 'deploy', icon: Globe, label: 'Deploy' },
];

export function ReplitMobileNavigation({
  activeTab,
  onTabChange,
  isRunning = false,
  onPlayStop,
  isPanelOpen = false,
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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 mobile-safe-bottom">
      <div className="absolute inset-0 bg-white dark:bg-[#1C1C1C] border-t border-gray-200 dark:border-gray-700" />
      
      <nav className="relative flex items-center justify-between h-14 px-2">
        <motion.button
          onClick={handlePlayStop}
          className={cn(
            "relative flex items-center justify-center w-11 h-11 rounded-lg transition-colors",
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

        <div className="flex items-center bg-gray-100 dark:bg-[#2A2A2A] rounded-full p-1 gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isAgentTab = tab.id === 'agent';
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "relative flex items-center justify-center w-10 h-10 rounded-full transition-all",
                  isActive 
                    ? "bg-white dark:bg-[#3A3A3A]" 
                    : "hover:bg-gray-200 dark:hover:bg-[#3A3A3A]"
                )}
                whileTap={{ scale: 0.95 }}
                data-testid={`tab-${tab.id}`}
              >
                {isAgentTab ? (
                  <ReplitAgentIcon 
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive 
                        ? "text-[#7C65C1]" 
                        : "text-gray-500 dark:text-gray-400"
                    )} 
                  />
                ) : (
                  <Icon 
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive 
                        ? "text-gray-900 dark:text-white" 
                        : "text-gray-500 dark:text-gray-400"
                    )} 
                  />
                )}
                
                {isActive && (
                  <motion.div
                    className="absolute -bottom-1 left-1/2 w-1 h-1 bg-[#7C65C1] rounded-full"
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
            className={cn(
              "relative flex items-center justify-center w-10 h-10 rounded-full transition-all",
              "hover:bg-gray-200 dark:hover:bg-[#3A3A3A]"
            )}
            whileTap={{ scale: 0.95 }}
            data-testid="button-more-tools"
          >
            <Plus 
              className="h-5 w-5 transition-colors text-gray-500 dark:text-gray-400"
            />
          </motion.button>
        </div>

        <motion.button
          onClick={handlePanelToggle}
          className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors"
          whileTap={{ scale: 0.92 }}
          data-testid="button-panel-toggle"
        >
          {isPanelOpen ? (
            <PanelRightClose className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <PanelRightOpen className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          )}
        </motion.button>
      </nav>
    </div>
  );
}
