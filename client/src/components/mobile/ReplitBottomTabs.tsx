import { FileText, Code2, Terminal as TerminalIcon, Monitor, MoreHorizontal, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type MobileTab = 'agent' | 'files' | 'code' | 'terminal' | 'preview' | 'more';

interface Tab {
  id: MobileTab;
  icon: React.ElementType;
  label: string;
}

interface ReplitBottomTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function ReplitBottomTabs({ 
  activeTab,
  onTabChange
}: ReplitBottomTabsProps) {
  // Mobile tabs with AI Agent first
  const tabs: Tab[] = [
    { id: 'agent', icon: Sparkles, label: 'Agent' },
    { id: 'files', icon: FileText, label: 'Files' },
    { id: 'code', icon: Code2, label: 'Code' },
    { id: 'terminal', icon: TerminalIcon, label: 'Terminal' },
    { id: 'preview', icon: Monitor, label: 'Preview' },
    { id: 'more', icon: MoreHorizontal, label: 'More' },
  ];

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    
    // Haptic feedback for tab switch
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom md:hidden">
      {/* Backdrop with iOS-style blur */}
      <div className="absolute inset-0 bg-background/95 dark:bg-background/98 backdrop-blur-xl border-t border-border/50" />
      
      {/* Tab Navigation Container - 5 tabs with touch-optimized spacing */}
      <nav className="relative flex items-center h-16 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 h-14 flex-1 rounded-lg transition-all touch-manipulation min-w-0",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted/50 active:bg-muted"
              )}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              data-testid={`tab-${tab.id}`}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform flex-shrink-0",
                isActive && "scale-110"
              )} />
              
              <span className={cn(
                "text-[10px] font-medium truncate max-w-full px-0.5",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {tab.label}
              </span>
              
              {/* Active indicator bar */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="absolute bottom-1 left-1/2 h-0.5 bg-primary rounded-full"
                    initial={{ width: 0, x: '-50%' }}
                    animate={{ width: '70%', x: '-50%' }}
                    exit={{ width: 0, x: '-50%' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
}
