import { Link, useLocation } from 'wouter';
import { Home, Folder, Plus, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  isCenter?: boolean;
  badge?: number;
}

const navItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/dashboard' },
  { icon: Folder, label: 'Projects', path: '/projects' },
  { icon: Plus, label: 'Create', path: '#create', isCenter: true },
  { icon: Bell, label: 'Notifications', path: '/notifications', badge: 3 },
  { icon: User, label: 'Profile', path: '/profile' },
];

interface MobileNavigationProps {
  onCreateClick?: () => void;
  notifications?: number;
}

export function MobileNavigation({ onCreateClick, notifications = 0 }: MobileNavigationProps) {
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState(location);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [showPulse, setShowPulse] = useState(true);
  const activeIndicatorRef = useRef<HTMLDivElement>(null);
  
  // Use improved mobile detection that considers both width AND height
  // This correctly shows mobile nav for phone landscape mode
  const isMobile = useIsMobile();

  // Update active tab when location changes
  useEffect(() => {
    setActiveTab(location);
  }, [location]);

  // Pulse animation for Create button
  useEffect(() => {
    const interval = setInterval(() => {
      setShowPulse(prev => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleItemClick = (item: NavItem, e?: React.MouseEvent) => {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // Double-tap on Home to scroll to top
    if (item.path === '/dashboard' && activeTab === '/dashboard') {
      const currentTime = Date.now();
      if (currentTime - lastTapTime < 500) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Stronger haptic for double-tap
        if ('vibrate' in navigator) {
          navigator.vibrate([10, 10, 10]);
        }
      }
      setLastTapTime(currentTime);
    }

    if (item.isCenter && onCreateClick) {
      onCreateClick();
      // Special haptic pattern for create
      if ('vibrate' in navigator) {
        navigator.vibrate([20, 10, 20]);
      }
    } else if (!item.isCenter) {
      setActiveTab(item.path);
    }
  };

  // Don't render if not mobile (this handles both portrait and landscape phones)
  if (!isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 mobile-safe-bottom">
      {/* Backdrop blur effect with solid background */}
      <div className="absolute inset-0 bg-[var(--mobile-ide-bg)] backdrop-blur-xl border-t border-[var(--ecode-border)]" />
      
      {/* Active tab slide indicator */}
      <motion.div
        className="absolute top-0 h-[2px] bg-ecode-accent"
        layoutId="activeIndicator"
        initial={false}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />
      
      <nav className="relative flex items-center justify-around h-14">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = activeTab === item.path;
          const isCenter = item.isCenter;
          const hasBadge = item.badge || (item.path === '/notifications' && notifications > 0);
          const badgeCount = item.badge || notifications;

          if (isCenter) {
            return (
              <motion.button
                key={item.label}
                onClick={() => handleItemClick(item)}
                className="relative mobile-touch-target flex items-center justify-center"
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <motion.div
                  className={cn(
                    "relative bg-gradient-to-br from-ecode-accent to-ecode-accent-hover rounded-full p-3 shadow-lg",
                    showPulse && "animate-pulse"
                  )}
                  whileHover={{ scale: 1.05 }}
                  animate={{ 
                    rotate: showPulse ? [0, -5, 5, -5, 0] : 0,
                    scale: showPulse ? [1, 1.05, 1] : 1
                  }}
                  transition={{ 
                    rotate: { duration: 0.5 },
                    scale: { duration: 0.3 }
                  }}
                >
                  <Icon className="h-6 w-6 text-white" />
                  
                  {/* Ripple effect */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-white"
                    initial={{ scale: 0, opacity: 0.5 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ 
                      duration: 1,
                      repeat: Infinity,
                      repeatDelay: 2
                    }}
                  />
                </motion.div>
              </motion.button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.path}
              onClick={(e) => handleItemClick(item, e)}
              className="relative mobile-touch-target flex flex-col items-center justify-center px-3 py-2 group"
            >
              <motion.div
                className="relative"
                whileTap={{ scale: 0.92 }}
                animate={{ 
                  y: isActive ? -2 : 0,
                  scale: isActive ? 1.1 : 1
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 transition-all duration-300',
                    isActive 
                      ? 'text-ecode-accent' 
                      : 'text-[var(--ecode-text-muted)] group-active:text-ecode-accent'
                  )}
                />
                
                {/* Badge notification */}
                {hasBadge && badgeCount > 0 && (
                  <motion.div
                    className="absolute -top-1 -right-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    <div className="bg-status-critical text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </div>
                    
                    {/* Badge pulse animation */}
                    <motion.div
                      className="absolute inset-0 bg-status-critical rounded-full"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ 
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: 'reverse'
                      }}
                    />
                  </motion.div>
                )}
                
                {/* Active indicator with sliding animation */}
                <AnimatePresence mode="wait">
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-2 left-1/2 transform -translate-x-1/2"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 20, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <div className="h-[2px] bg-ecode-accent rounded-full" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              
              <motion.span 
                className={cn(
                  'text-[10px] mt-1 transition-all duration-300',
                  isActive 
                    ? 'text-ecode-accent font-semibold' 
                    : 'text-[var(--ecode-text-muted)] font-normal'
                )}
                animate={{ 
                  scale: isActive ? 1.05 : 1,
                  opacity: isActive ? 1 : 0.8
                }}
                transition={{ duration: 0.2 }}
              >
                {item.label}
              </motion.span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}