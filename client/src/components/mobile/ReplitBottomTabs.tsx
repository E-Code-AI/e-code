import { Code2, Terminal as TerminalIcon, Monitor, MoreHorizontal, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type MobileTab = 'agent' | 'code' | 'terminal' | 'preview' | 'more';

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
  const tabs: Tab[] = [
    { id: 'agent', icon: Sparkles, label: 'Agent' },
    { id: 'code', icon: Code2, label: 'Code' },
    { id: 'terminal', icon: TerminalIcon, label: 'Shell' },
    { id: 'preview', icon: Monitor, label: 'Web' },
    { id: 'more', icon: MoreHorizontal, label: 'More' },
  ];

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="absolute inset-0 bg-background/98 backdrop-blur-xl border-t border-border" />
      
      <nav className="relative flex items-center justify-around h-[60px] px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full py-2 touch-manipulation",
                "min-w-[52px] max-w-[72px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              data-testid={`tab-${tab.id}`}
            >
              <Icon className={cn(
                "h-6 w-6 mb-1 transition-all duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              
              <span className={cn(
                "text-[11px] font-medium leading-tight",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {tab.label}
              </span>
              
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="absolute -top-[1px] left-1/2 h-[2px] bg-primary rounded-full"
                    initial={{ width: 0, x: '-50%' }}
                    animate={{ width: '60%', x: '-50%' }}
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
