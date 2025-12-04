import { Terminal as TerminalIcon, Monitor, MoreHorizontal, Sparkles, FolderOpen, GitBranch, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion, SPRING_CONFIG, getReducedMotionTransition } from '@/hooks/use-reduced-motion';

type MobileTab = 'agent' | 'files' | 'console' | 'preview' | 'more';

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
    { id: 'files', icon: FolderOpen, label: 'Files' },
    { id: 'console', icon: TerminalIcon, label: 'Console' },
    { id: 'preview', icon: Monitor, label: 'Webview' },
    { id: 'more', icon: MoreHorizontal, label: 'Tools' },
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
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden" 
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="absolute inset-0 bg-[var(--ecode-surface)]/98 dark:bg-[var(--ecode-surface)]/98 backdrop-blur-xl border-t border-[var(--ecode-border)]" />
      
      <div className="absolute top-2.5 left-3 z-10 flex items-center gap-1.5" data-testid="indicator-connection-status">
        <motion.div
          animate={isConnected ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          {isConnected ? (
            <Wifi className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-500 animate-pulse" />
          )}
        </motion.div>
        <span className={cn(
          "text-[9px] font-medium uppercase tracking-wider",
          isConnected ? "text-green-500" : "text-red-500"
        )}>
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>
      
      <div className="absolute top-2.5 right-3 z-10 flex items-center gap-2.5">
        {badgeCounts.errors && badgeCounts.errors > 0 && (
          <motion.div 
            className="flex items-center gap-1 text-[10px] font-medium text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full" 
            data-testid="indicator-errors"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <AlertCircle className="h-3 w-3" />
            <span>{badgeCounts.errors}</span>
          </motion.div>
        )}
        {badgeCounts.git && badgeCounts.git > 0 && (
          <motion.div 
            className="flex items-center gap-1 text-[10px] font-medium text-[var(--ecode-text-muted)] bg-[var(--ecode-surface-hover)] px-1.5 py-0.5 rounded-full" 
            data-testid="indicator-git-changes"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <GitBranch className="h-3 w-3" />
            <span>{badgeCounts.git}</span>
          </motion.div>
        )}
      </div>
      
      <nav className="relative flex items-center justify-around h-[64px] px-1">
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
                "min-w-[56px] max-w-[76px] rounded-lg",
                isActive ? "text-[var(--ecode-accent)]" : "text-[var(--ecode-text-muted)]",
                "active:bg-[var(--ecode-surface-hover)]"
              )}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
              transition={prefersReducedMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 500, damping: 25 }}
              data-testid={`tab-${tab.id}`}
            >
              <div className="relative">
                <motion.div
                  animate={isActive && !prefersReducedMotion ? {
                    y: [0, -3, 0],
                    scale: [1, 1.15, 1],
                  } : {}}
                  transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <Icon className={cn(
                    "h-6 w-6 mb-0.5 transition-colors duration-150",
                    isActive ? "text-[var(--ecode-accent)]" : "text-[var(--ecode-text-muted)]"
                  )} />
                </motion.div>
                
                <AnimatePresence>
                  {isActive && !prefersReducedMotion && (
                    <motion.div
                      className="absolute inset-0 -z-10 rounded-full"
                      initial={{ opacity: 0, scale: 0.3 }}
                      animate={{ opacity: 1, scale: 2 }}
                      exit={{ opacity: 0, scale: 0.3 }}
                      transition={SPRING_CONFIG.default}
                      style={{
                        background: 'radial-gradient(circle, var(--ecode-accent) 0%, transparent 70%)',
                        opacity: 0.15,
                        filter: 'blur(6px)',
                      }}
                    />
                  )}
                </AnimatePresence>
                
                {badge !== undefined && badge > 0 && (
                  <motion.span 
                    className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-bold text-white bg-red-500 rounded-full border-2 border-[var(--ecode-surface)]"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={prefersReducedMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    {badge > 99 ? '99+' : badge}
                  </motion.span>
                )}
              </div>
              
              <motion.span 
                className={cn(
                  "text-[10px] font-semibold leading-tight mt-0.5",
                  isActive ? "text-[var(--ecode-accent)]" : "text-[var(--ecode-text-muted)]"
                )}
                animate={isActive ? { 
                  scale: prefersReducedMotion ? 1 : 1.08,
                  y: prefersReducedMotion ? 0 : -1 
                } : { scale: 1, y: 0 }}
                transition={getReducedMotionTransition(prefersReducedMotion, SPRING_CONFIG.default)}
              >
                {tab.label}
              </motion.span>
              
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="absolute -top-[1px] left-1/2 h-[3px] bg-[var(--ecode-accent)] rounded-full"
                    initial={{ width: 0, x: '-50%', opacity: 0 }}
                    animate={{ width: '70%', x: '-50%', opacity: 1 }}
                    exit={{ width: 0, x: '-50%', opacity: 0 }}
                    transition={prefersReducedMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 400, damping: 25 }}
                    style={{
                      boxShadow: prefersReducedMotion ? 'none' : '0 0 12px 3px var(--ecode-accent)',
                      opacity: prefersReducedMotion ? 1 : 0.9,
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
