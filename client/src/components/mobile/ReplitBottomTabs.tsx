import { Code2, Terminal as TerminalIcon, Monitor, MoreHorizontal, Sparkles, Rocket, GitBranch, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion, SPRING_CONFIG, getReducedMotionTransition } from '@/hooks/use-reduced-motion';

type MobileTab = 'agent' | 'code' | 'terminal' | 'preview' | 'deploy' | 'more';

interface Tab {
  id: MobileTab;
  icon: React.ElementType;
  label: string;
}

interface BadgeCounts {
  git?: number;
  errors?: number;
}

interface ReplitBottomTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  badgeCounts?: BadgeCounts;
  isConnected?: boolean;
}

export function ReplitBottomTabs({ 
  activeTab,
  onTabChange,
  badgeCounts = {},
  isConnected = true,
}: ReplitBottomTabsProps) {
  const prefersReducedMotion = useReducedMotion();
  
  const tabs: Tab[] = [
    { id: 'agent', icon: Sparkles, label: 'Agent' },
    { id: 'code', icon: Code2, label: 'Code' },
    { id: 'terminal', icon: TerminalIcon, label: 'Shell' },
    { id: 'preview', icon: Monitor, label: 'Web' },
    { id: 'deploy', icon: Rocket, label: 'Deploy' },
    { id: 'more', icon: MoreHorizontal, label: 'More' },
  ];

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const getBadgeForTab = (tabId: MobileTab): number | undefined => {
    if (tabId === 'more') {
      const gitCount = badgeCounts.git || 0;
      const errorsCount = badgeCounts.errors || 0;
      return gitCount + errorsCount > 0 ? gitCount + errorsCount : undefined;
    }
    return undefined;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="absolute inset-0 bg-background/98 backdrop-blur-xl border-t border-border" />
      
      <div className="absolute top-2 left-3 z-10" data-testid="indicator-connection-status">
        {isConnected ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-red-500" />
        )}
      </div>
      
      <div className="absolute top-2 right-3 z-10 flex items-center gap-3">
        {badgeCounts.errors && badgeCounts.errors > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-red-500" data-testid="indicator-errors">
            <AlertCircle className="h-3 w-3" />
            <span>{badgeCounts.errors}</span>
          </div>
        )}
        {badgeCounts.git && badgeCounts.git > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground" data-testid="indicator-git-changes">
            <GitBranch className="h-3 w-3" />
            <span>{badgeCounts.git}</span>
          </div>
        )}
      </div>
      
      <nav className="relative flex items-center justify-around h-[60px] px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badge = getBadgeForTab(tab.id);

          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full py-2 touch-manipulation",
                "min-w-[52px] max-w-[72px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
              transition={getReducedMotionTransition(prefersReducedMotion, { type: 'spring', stiffness: 400, damping: 17 })}
              data-testid={`tab-${tab.id}`}
            >
              <div className="relative">
                <motion.div
                  animate={isActive && !prefersReducedMotion ? {
                    scale: [1, 1.1, 1],
                  } : {}}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <Icon className={cn(
                    "h-6 w-6 mb-1 transition-all duration-200",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                </motion.div>
                
                <AnimatePresence>
                  {isActive && !prefersReducedMotion && (
                    <motion.div
                      className="absolute inset-0 -z-10 rounded-full"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1.8 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={SPRING_CONFIG.default}
                      style={{
                        background: 'radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)',
                        filter: 'blur(4px)',
                      }}
                    />
                  )}
                </AnimatePresence>
                
                {badge !== undefined && badge > 0 && (
                  <motion.span 
                    className="absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-[14px] px-1 text-[9px] font-bold text-white bg-red-500 rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={getReducedMotionTransition(prefersReducedMotion, SPRING_CONFIG.bouncy)}
                  >
                    {badge > 99 ? '99+' : badge}
                  </motion.span>
                )}
              </div>
              
              <motion.span 
                className={cn(
                  "text-[11px] font-medium leading-tight",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                animate={isActive ? { scale: prefersReducedMotion ? 1 : 1.05 } : { scale: 1 }}
                transition={getReducedMotionTransition(prefersReducedMotion, SPRING_CONFIG.default)}
              >
                {tab.label}
              </motion.span>
              
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="absolute -top-[1px] left-1/2 h-[2px] bg-primary rounded-full"
                    initial={{ width: 0, x: '-50%', opacity: 0 }}
                    animate={{ width: '60%', x: '-50%', opacity: 1 }}
                    exit={{ width: 0, x: '-50%', opacity: 0 }}
                    transition={getReducedMotionTransition(prefersReducedMotion, SPRING_CONFIG.default)}
                    style={{
                      boxShadow: prefersReducedMotion ? 'none' : '0 0 8px 2px hsl(var(--primary) / 0.4)',
                    }}
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
