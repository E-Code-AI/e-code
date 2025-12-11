/**
 * ReplitBottomTabs - Fortune 500-Grade Mobile Navigation
 * 
 * Premium glassmorphic bottom navigation with:
 * - Elevated glass container with backdrop blur
 * - Refined micro-interactions and spring animations
 * - E-Code orange (#F26207) accent with gradient glow
 * - IBM Plex Sans typography at 11px
 * - 72px height with proper touch targets (min 48px)
 * - Reduced motion support
 */

import { Terminal as TerminalIcon, Monitor, MoreHorizontal, Sparkles, FolderOpen, GitBranch, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion, SPRING_CONFIG, getReducedMotionTransition } from '@/hooks/use-reduced-motion';
import { useIsMobile } from '@/hooks/use-mobile';

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

const PREMIUM_SPRING = {
  stiffness: 400,
  damping: 28,
  mass: 0.8,
};

const GLOW_SPRING = {
  stiffness: 300,
  damping: 35,
  mass: 1,
};

export function ReplitBottomTabs({ 
  activeTab,
  onTabChange,
  badgeCounts = {},
  isConnected = true,
}: ReplitBottomTabsProps) {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  
  if (!isMobile) {
    return null;
  }
  
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
      navigator.vibrate([8, 50, 4]);
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
      className="fixed bottom-0 left-0 right-0 z-50" 
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      data-testid="mobile-bottom-navigation"
    >
      {/* Solid Navigation Container */}
      <div 
        className="absolute inset-x-3 bottom-2 rounded-[var(--mobile-nav-radius)]"
        style={{
          background: 'var(--mobile-nav-gradient)',
          boxShadow: 'var(--mobile-nav-shadow), var(--mobile-nav-inner-shadow)',
          border: '1px solid var(--mobile-nav-border)',
          borderTop: '1px solid var(--mobile-nav-border-top)',
        }}
      >
        {/* Subtle top highlight line */}
        <div 
          className="absolute top-0 left-4 right-4 h-px"
          style={{
            background: 'var(--mobile-nav-border-top)',
          }}
        />
      </div>
      
      {/* Status Indicators Row - Premium Pill Design */}
      <div className="absolute -top-8 left-0 right-0 px-4 flex items-center justify-between pointer-events-none">
        {/* Connection Status Pill */}
        <motion.div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full pointer-events-auto"
          style={{
            background: isConnected 
              ? '#1C2333'
              : '#1C2333',
            border: `1px solid ${isConnected ? '#22c55e' : '#ef4444'}`,
            boxShadow: isConnected 
              ? '0 2px 8px -2px #22c55e'
              : '0 2px 8px -2px #ef4444',
          }}
          data-testid="indicator-connection-status"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ...PREMIUM_SPRING }}
        >
          <motion.div
            animate={isConnected && !prefersReducedMotion ? { 
              scale: [1, 1.15, 1],
              opacity: [1, 0.8, 1],
            } : {}}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          >
            {isConnected ? (
              <div className="relative">
                <Wifi className="h-3 w-3 text-green-500" />
              </div>
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
          </motion.div>
          <span 
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ 
              color: isConnected ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
              fontFamily: 'var(--ecode-font-sans)',
            }}
          >
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </motion.div>
        
        {/* Status Badges */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <AnimatePresence mode="popLayout">
            {badgeCounts.errors && badgeCounts.errors > 0 && (
              <motion.div 
                className="flex items-center gap-1 px-2 py-1 rounded-full"
                style={{
                  background: '#1C2333',
                  border: '1px solid #ef4444',
                  boxShadow: '0 2px 8px -2px #ef4444',
                }}
                data-testid="indicator-errors"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={PREMIUM_SPRING}
              >
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span className="text-[10px] font-bold text-red-500" style={{ fontFamily: 'var(--ecode-font-sans)' }}>
                  {badgeCounts.errors}
                </span>
              </motion.div>
            )}
            
            {badgeCounts.git && badgeCounts.git > 0 && (
              <motion.div 
                className="flex items-center gap-1 px-2 py-1 rounded-full"
                style={{
                  background: '#1C2333',
                  border: '1px solid #3D4455',
                  boxShadow: '0 2px 6px -2px #0E1525',
                }}
                data-testid="indicator-git-changes"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={PREMIUM_SPRING}
              >
                <GitBranch className="h-3 w-3 text-[var(--ecode-text-muted)]" />
                <span className="text-[10px] font-semibold text-[var(--ecode-text-muted)]" style={{ fontFamily: 'var(--ecode-font-sans)' }}>
                  {badgeCounts.git}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Navigation Items */}
      <nav 
        className="relative flex items-center justify-around px-4 mx-3 mb-2"
        style={{ height: 'var(--mobile-nav-height)' }}
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badge = getBadgeForTab(tab.id);

          return (
            <motion.button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1",
                "min-w-[52px] max-w-[72px] min-h-[52px]",
                "rounded-[var(--mobile-nav-item-radius)]",
                "touch-manipulation select-none",
                "transition-colors duration-150",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ecode-accent)] focus-visible:ring-offset-2"
              )}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.92 }}
              transition={prefersReducedMotion ? { duration: 0.01 } : PREMIUM_SPRING}
              data-testid={`tab-${tab.id}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              {/* Active Background Pill */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="absolute inset-1 rounded-[calc(var(--mobile-nav-item-radius)-4px)]"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={prefersReducedMotion ? { duration: 0.01 } : GLOW_SPRING}
                    style={{
                      background: 'var(--mobile-nav-active-bg)',
                      border: '1px solid var(--mobile-nav-active-border)',
                      boxShadow: `0 0 20px -4px var(--mobile-nav-glow), inset 0 1px 0 0 #3D4455`,
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Icon Container */}
              <div className="relative z-10">
                <motion.div
                  animate={isActive ? {
                    y: prefersReducedMotion ? 0 : -2,
                    scale: prefersReducedMotion ? 1 : 1.1,
                  } : { y: 0, scale: 1 }}
                  transition={prefersReducedMotion ? { duration: 0.01 } : PREMIUM_SPRING}
                >
                  <Icon 
                    className="transition-colors duration-200"
                    style={{
                      width: 'var(--mobile-nav-icon-size)',
                      height: 'var(--mobile-nav-icon-size)',
                      color: isActive ? 'var(--ecode-accent)' : 'var(--ecode-text-muted)',
                      opacity: isActive ? 1 : 'var(--mobile-nav-inactive-opacity)',
                      strokeWidth: isActive ? 2.25 : 1.75,
                    }}
                  />
                </motion.div>
                
                {/* Active Glow Effect */}
                <AnimatePresence>
                  {isActive && !prefersReducedMotion && (
                    <motion.div
                      className="absolute inset-0 -z-10 pointer-events-none"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ 
                        opacity: [0.4, 0.2, 0.4],
                        scale: [1.8, 2.2, 1.8],
                      }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{
                        opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                        scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                      }}
                      style={{
                        background: 'radial-gradient(circle, var(--mobile-nav-glow-strong) 0%, transparent 60%)',
                        filter: 'blur(8px)',
                      }}
                    />
                  )}
                </AnimatePresence>
                
                {/* Badge */}
                <AnimatePresence>
                  {badge !== undefined && badge > 0 && (
                    <motion.span 
                      className="absolute -top-2 -right-2.5 flex items-center justify-center"
                      style={{
                        minWidth: '18px',
                        height: '18px',
                        padding: '0 5px',
                        fontSize: '10px',
                        fontWeight: 700,
                        fontFamily: 'var(--ecode-font-sans)',
                        color: 'white',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        borderRadius: '9px',
                        border: '2px solid var(--ecode-surface)',
                        boxShadow: '0 2px 6px -1px #ef4444',
                      }}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      transition={prefersReducedMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 500, damping: 20 }}
                    >
                      {badge > 99 ? '99+' : badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Label */}
              <motion.span 
                className="relative z-10 mt-1 font-semibold leading-tight"
                style={{
                  fontSize: 'var(--mobile-nav-label-size)',
                  fontFamily: 'var(--ecode-font-sans)',
                  color: isActive ? 'var(--ecode-accent)' : 'var(--ecode-text-muted)',
                  opacity: isActive ? 1 : 'var(--mobile-nav-inactive-opacity)',
                  letterSpacing: '0.01em',
                }}
                animate={isActive ? { 
                  y: prefersReducedMotion ? 0 : -1,
                  scale: prefersReducedMotion ? 1 : 1.02,
                } : { y: 0, scale: 1 }}
                transition={prefersReducedMotion ? { duration: 0.01 } : PREMIUM_SPRING}
              >
                {tab.label}
              </motion.span>
              
              {/* Active Indicator Line */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="absolute -bottom-0.5 rounded-full"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '60%', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={prefersReducedMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 400, damping: 28 }}
                    style={{
                      height: '3px',
                      background: 'linear-gradient(90deg, var(--ecode-accent), var(--ecode-accent-hover))',
                      boxShadow: prefersReducedMotion ? 'none' : '0 0 16px 2px var(--mobile-nav-glow-strong)',
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
