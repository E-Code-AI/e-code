// @ts-nocheck
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Home, Code, Zap, Globe, Users, Database, Book,
  Settings, User, HelpCircle, Crown, Plus, Search, FileCode,
  Terminal, GitBranch, Sparkles, Package, Shield, LogOut,
  ChevronRight, Heart, Star, Briefcase, GraduationCap, Workflow,
  HardDrive, BarChart3, Rocket, Cpu, Activity, ArrowRight,
  Moon, Sun, Palette, Bell, MessageSquare, Key, Cloud, Lock
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  isActiveNavigationItem,
  primaryNavigation,
  secondaryNavigation,
  type NavigationItem,
} from '@/constants/navigation';

interface MobileMenuProps {
  onOpenSpotlight?: () => void;
}

export function MobileMenu({ onOpenSpotlight }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => setIsVisible(true), 50);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  const handleNavigate = (path: string) => {
    setOpen(false);
    setTimeout(() => {
      navigate(path);
    }, 150);
  };

  const handleLogout = () => {
    setOpen(false);
    setTimeout(() => {
      logoutMutation.mutate();
    }, 150);
  };

  const quickActions = [
    {
      icon: Plus,
      label: 'Create App',
      path: '/projects',
      action: 'create' as const,
      ctaLabel: 'Create a new application',
    },
    {
      icon: Code,
      label: 'Import code or design',
      path: '/github-import',
      ctaLabel: 'Import an existing codebase or design',
    },
  ];

  const navigationLinks: NavigationItem[] = [...primaryNavigation, ...secondaryNavigation];

  type MenuItem =
    | {
        key: string;
        type: 'quick';
        icon: LucideIcon;
        label: string;
        path: string;
        description?: string;
        ctaLabel?: string;
        badge?: string;
        onSelect: () => void;
      }
    | {
        key: string;
        type: 'nav';
        icon: LucideIcon;
        label: string;
        path: string;
        description?: string;
        ctaLabel?: string;
        badge?: string;
        navigation: NavigationItem;
        onSelect: () => void;
      };

  const menuItems: MenuItem[] = [
    ...quickActions.map((action) => ({
      key: `quick-${action.label.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'quick' as const,
      icon: action.icon,
      label: action.label,
      path: action.path,
      description: action.ctaLabel,
      ctaLabel: action.ctaLabel,
      onSelect: () => handleQuickActionClick(action),
    })),
    ...navigationLinks.map((item) => ({
      key: `nav-${item.key}`,
      type: 'nav' as const,
      icon: item.icon,
      label: item.label,
      path: item.path,
      description: item.description,
      ctaLabel: item.ctaLabel,
      badge: item.badge,
      navigation: item,
      onSelect: () => handleNavigationClick(item),
    })),
  ];

  const handleQuickActionClick = (link: (typeof quickActions)[number]) => {
    if (link.action === 'create') {
      setOpen(false);
      setTimeout(() => {
        navigate('/projects');
        setTimeout(() => {
          const createButton = document.querySelector('[data-create-project]');
          if (createButton) {
            (createButton as HTMLElement).click();
          }
        }, 300);
      }, 150);
    } else {
      handleNavigate(link.path);
    }
  };

  const handleNavigationClick = (item: NavigationItem) => {
    handleNavigate(item.path);
  };

  return (
    <>
      {/* Enhanced Menu Button with Animation */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="lg:hidden"
      >
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-11 w-11 rounded-xl bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 backdrop-blur-xl border border-[var(--ecode-border)] dark:border-zinc-700/50 shadow-lg"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5 text-[var(--ecode-text)] dark:text-white" />
        </Button>
      </motion.div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent 
          side="left" 
          className="w-full sm:w-[420px] p-0 bg-[var(--ecode-surface)] dark:bg-zinc-950/95 backdrop-blur-2xl border-r border-[var(--ecode-border)] dark:border-zinc-800/50 shadow-2xl"
        >
          {/* Professional Header with Gradient */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--ecode-accent)]/10 via-transparent to-[var(--ecode-accent)]/5 dark:from-purple-600/20 dark:via-transparent dark:to-blue-600/20 animate-gradient-xy" />
            <div className="relative px-6 py-5 border-b border-[var(--ecode-border)] dark:border-zinc-800/50 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--ecode-accent)] to-[var(--ecode-accent-hover)] dark:from-purple-500 dark:to-blue-600 flex items-center justify-center shadow-lg">
                    <Rocket className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--ecode-text)] dark:text-white">E-Code</h2>
                    <p className="text-xs text-[var(--ecode-text-muted)] dark:text-zinc-400">Professional Development Platform</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-88px)]">
            <div className="px-6 py-6">
              {/* Enhanced Search with Glassmorphism */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <button
                  className="w-full p-4 rounded-2xl bg-[var(--ecode-surface-secondary)] dark:bg-gradient-to-r dark:from-zinc-800/50 dark:to-zinc-900/50 backdrop-blur-xl border border-[var(--ecode-border)] dark:border-[var(--ecode-border)] dark:border-zinc-700/50 flex items-center gap-3 transition-all hover:bg-[var(--ecode-surface-tertiary)] dark:hover:bg-zinc-800/70 hover:border-[var(--ecode-accent)]/30 dark:hover:border-zinc-600/50 hover:shadow-lg group"
                  onClick={() => {
                    setOpen(false);
                    onOpenSpotlight?.();
                  }}
                >
                  <div className="h-10 w-10 rounded-xl bg-[var(--ecode-accent)]/10 dark:bg-blue-500/10 flex items-center justify-center group-hover:bg-[var(--ecode-accent)]/20 dark:group-hover:bg-blue-500/20 transition-colors">
                    <Search className="h-5 w-5 text-[var(--ecode-accent)] dark:text-blue-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[var(--ecode-text)] dark:text-white">Quick Search</p>
                    <p className="text-xs text-[var(--ecode-text-muted)] dark:text-zinc-400">Search files, commands, and more...</p>
                  </div>
                  <kbd className="text-xs bg-[var(--ecode-surface-tertiary)] dark:bg-zinc-800 px-2 py-1 rounded border border-[var(--ecode-border)] dark:border-zinc-700 text-[var(--ecode-text-muted)] dark:text-zinc-400">⌘K</kbd>
                </button>
              </motion.div>

              {/* Enhanced User Profile Card */}
              {user && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="mt-6 mb-6"
                >
                  <div 
                    className="relative p-4 rounded-2xl bg-gradient-to-br from-[var(--ecode-accent)]/10 to-[var(--ecode-accent)]/5 dark:from-purple-600/10 dark:to-blue-600/10 backdrop-blur-xl border border-[var(--ecode-border)] dark:border-[var(--ecode-border)] dark:border-zinc-700/50 cursor-pointer transition-all hover:from-[var(--ecode-accent)]/20 hover:to-[var(--ecode-accent)]/10 dark:hover:from-purple-600/20 dark:hover:to-blue-600/20 hover:shadow-xl group"
                    onClick={() => handleNavigate(`/@${user.username}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--ecode-accent)] to-[var(--ecode-accent-hover)] dark:from-purple-500 dark:to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[var(--ecode-surface)] dark:border-zinc-950 shadow-lg" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-[var(--ecode-text)] dark:text-white text-base">{user.displayName || user.username}</p>
                        <p className="text-sm text-[var(--ecode-text-muted)] dark:text-zinc-400">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-[var(--ecode-accent)]/20 text-[var(--ecode-accent)] dark:bg-purple-500/20 dark:text-purple-300 px-2 py-0.5 rounded-full">Pro Plan</span>
                          <span className="text-xs text-[var(--ecode-text-muted)] dark:text-zinc-500">• Active</span>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[var(--ecode-text-muted)] dark:text-zinc-400 group-hover:text-[var(--ecode-accent)] dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Enhanced Primary Navigation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isVisible ? 1 : 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="space-y-2 mb-8"
              >
                <h3 className="text-xs font-semibold text-[var(--ecode-text-muted)] dark:text-zinc-500 uppercase tracking-wider mb-3 px-1">Main Menu</h3>
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive =
                    item.type === 'nav'
                      ? isActiveNavigationItem(location, item.navigation)
                      : location.startsWith(item.path);

                  return (
                    <motion.div
                    key={item.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -20 }}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                  >
                    <button
                      className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all relative group ${
                        isActive
                          ? 'bg-gradient-to-r from-[var(--ecode-accent)]/20 to-[var(--ecode-accent)]/10 dark:from-purple-600/20 dark:to-blue-600/20 border border-[var(--ecode-accent)]/30 dark:border-purple-500/30'
                          : 'hover:bg-[var(--ecode-surface-secondary)] dark:hover:bg-[var(--ecode-surface-secondary)] dark:dark:hover:bg-zinc-800/50 hover:border-[var(--ecode-border)] dark:border-transparent border border-transparent'
                      }`}
                      onClick={item.onSelect}
                      aria-label={item.ctaLabel || item.label}
                    >
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-gradient-to-br from-[var(--ecode-accent)] to-[var(--ecode-accent-hover)] dark:from-purple-500 dark:to-blue-600 shadow-lg'
                          : 'bg-[var(--ecode-surface-secondary)] dark:bg-zinc-800/50 group-hover:bg-[var(--ecode-surface-tertiary)] dark:group-hover:bg-zinc-700/50'
                      }`}>
                        <Icon
                          className={`h-5 w-5 ${
                            isActive
                              ? 'text-[var(--ecode-text)] dark:text-white'
                              : 'text-[var(--ecode-text-muted)] dark:text-zinc-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <p
                          className={`text-sm font-medium ${
                            isActive
                              ? 'text-[var(--ecode-text)] dark:text-white'
                              : 'text-[var(--ecode-text-secondary)] dark:text-zinc-300'
                          }`}
                        >
                          {item.label}
                        </p>
                        {(item.description || item.type === 'quick') && (
                          <p className="text-xs text-[var(--ecode-text-muted)] dark:text-zinc-500">
                            {item.description || 'Start building instantly'}
                          </p>
                        )}
                      </div>
                      {item.badge && (
                        <span className="px-2 py-1 text-[10px] bg-[var(--ecode-accent)] dark:bg-orange-500 text-[var(--ecode-text)] dark:text-white rounded-full font-medium animate-pulse">
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[var(--ecode-accent)]/5 to-[var(--ecode-accent)]/10 dark:from-purple-600/10 dark:to-blue-600/10 pointer-events-none" />
                      )}
                    </button>
                  </motion.div>
                  );
                })}
              </motion.div>

              {/* Enhanced Explore Section */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isVisible ? 1 : 0 }}
                transition={{ duration: 0.3, delay: 0.6 }}
                className="mb-8"
              >
                <h3 className="text-xs font-semibold text-[var(--ecode-text-muted)] dark:text-zinc-500 uppercase tracking-wider mb-3 px-1">Explore Platform</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Database, label: 'Bounties', path: '/bounties', color: 'from-green-500 to-emerald-600' },
                    { icon: Package, label: 'Templates', path: '/templates', color: 'from-blue-500 to-cyan-600' },
                    { icon: GraduationCap, label: 'Learn', path: '/learn', color: 'from-purple-500 to-pink-600' },
                    { icon: Book, label: 'Docs', path: '/docs', color: 'from-orange-500 to-red-600' },
                  ].map((item, index) => (
                    <motion.button
                      key={item.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.9 }}
                      transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-4 rounded-2xl bg-[var(--ecode-surface-secondary)] dark:bg-zinc-800/30 backdrop-blur-xl border border-[var(--ecode-border)] dark:border-zinc-700/50 transition-all hover:bg-[var(--ecode-surface-tertiary)] dark:hover:bg-zinc-800/50 hover:border-[var(--ecode-accent)]/30 dark:hover:border-zinc-600/50 hover:shadow-lg group"
                      onClick={() => handleNavigate(item.path)}
                    >
                      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${item.color} mx-auto mb-2 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
                        <item.icon className="h-6 w-6 text-[var(--ecode-text)] dark:text-white" />
                      </div>
                      <p className="text-sm font-medium text-[var(--ecode-text-secondary)] dark:text-zinc-300">{item.label}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isVisible ? 1 : 0 }}
                transition={{ duration: 0.3, delay: 0.8 }}
                className="mb-8"
              >
                <h3 className="text-xs font-semibold text-[var(--ecode-text-muted)] dark:text-zinc-500 uppercase tracking-wider mb-3 px-1">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    className="w-full p-3 rounded-xl bg-gradient-to-r from-[var(--ecode-accent)]/20 to-[var(--ecode-accent)]/10 dark:from-purple-600/20 dark:to-blue-600/20 border border-[var(--ecode-accent)]/30 dark:border-purple-500/30 flex items-center justify-between group transition-all hover:from-[var(--ecode-accent)]/30 hover:to-[var(--ecode-accent)]/20 dark:hover:from-purple-600/30 dark:hover:to-blue-600/30"
                    onClick={() => handleNavigate('/cycles')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[var(--ecode-accent)]/20 dark:bg-purple-500/20 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-[var(--ecode-accent)] dark:text-purple-400" />
                      </div>
                      <span className="text-sm font-medium text-[var(--ecode-text)] dark:text-white">Cycles Balance</span>
                    </div>
                    <span className="text-xs bg-[var(--ecode-accent)]/20 text-[var(--ecode-accent)] dark:bg-purple-500/20 dark:text-purple-300 px-2 py-1 rounded-full">1,250</span>
                  </button>
                  
                  <button
                    className="w-full p-3 rounded-xl bg-[var(--ecode-surface-secondary)] dark:bg-zinc-800/30 border border-[var(--ecode-border)] dark:border-zinc-700/50 flex items-center justify-between group transition-all hover:bg-[var(--ecode-surface-tertiary)] dark:hover:bg-zinc-800/50"
                    onClick={() => handleNavigate('/support')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[var(--ecode-surface-tertiary)] dark:bg-zinc-700/50 flex items-center justify-center">
                        <HelpCircle className="h-4 w-4 text-[var(--ecode-text-muted)] dark:text-zinc-400" />
                      </div>
                      <span className="text-sm font-medium text-[var(--ecode-text-secondary)] dark:text-zinc-300">Get Help</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[var(--ecode-text-muted)] dark:text-zinc-500 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>

              {/* Settings & Account */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isVisible ? 1 : 0 }}
                transition={{ duration: 0.3, delay: 0.9 }}
                className="space-y-2 mb-8"
              >
                <h3 className="text-xs font-semibold text-[var(--ecode-text-muted)] dark:text-zinc-500 uppercase tracking-wider mb-3 px-1">Settings</h3>
                <button
                  className="w-full p-3 rounded-xl hover:bg-[var(--ecode-surface-secondary)] dark:hover:bg-zinc-800/50 transition-colors flex items-center gap-3 group"
                  onClick={() => handleNavigate('/account')}
                >
                  <Settings className="h-5 w-5 text-[var(--ecode-text-muted)] dark:text-zinc-400 group-hover:text-[var(--ecode-accent)] dark:group-hover:text-zinc-300" />
                  <span className="text-sm text-[var(--ecode-text-secondary)] dark:text-zinc-300">Account Settings</span>
                </button>
                <button
                  className="w-full p-3 rounded-xl hover:bg-[var(--ecode-surface-secondary)] dark:hover:bg-zinc-800/50 transition-colors flex items-center gap-3 group"
                  onClick={() => handleNavigate('/themes')}
                >
                  <Palette className="h-5 w-5 text-[var(--ecode-text-muted)] dark:text-zinc-400 group-hover:text-[var(--ecode-accent)] dark:group-hover:text-zinc-300" />
                  <span className="text-sm text-[var(--ecode-text-secondary)] dark:text-zinc-300">Themes</span>
                </button>
                {user && (
                  <button
                    className="w-full p-3 rounded-xl hover:bg-red-500/10 transition-colors flex items-center gap-3 group"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5 text-red-400 group-hover:text-red-300" />
                    <span className="text-sm text-red-400 group-hover:text-red-300">Sign Out</span>
                  </button>
                )}
              </motion.div>

              {/* Footer with App Download */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isVisible ? 1 : 0 }}
                transition={{ duration: 0.3, delay: 1 }}
                className="pt-8 pb-6 mt-auto"
              >
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[var(--ecode-surface-secondary)] to-[var(--ecode-surface-tertiary)] dark:from-zinc-800/30 dark:to-zinc-900/30 backdrop-blur-xl border border-[var(--ecode-border)] dark:border-zinc-700/50">
                  <h3 className="text-xs font-semibold text-[var(--ecode-text-muted)] dark:text-zinc-500 uppercase tracking-wider mb-3">Get the App</h3>
                  <p className="text-xs text-[var(--ecode-text-muted)] dark:text-zinc-400 mb-4">Code anywhere with E-Code mobile apps</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="p-3 rounded-xl bg-[var(--ecode-surface-secondary)] dark:bg-zinc-800/50 hover:bg-[var(--ecode-surface-tertiary)] dark:hover:bg-zinc-700/50 transition-all flex items-center justify-center gap-2 group"
                      onClick={() => window.open('https://apps.apple.com/app/e-code', '_blank')}
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--ecode-text-muted)] dark:text-zinc-400 group-hover:text-[var(--ecode-accent)] dark:group-hover:text-white transition-colors" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                      </svg>
                      <span className="text-xs text-[var(--ecode-text-muted)] dark:text-zinc-400 group-hover:text-[var(--ecode-accent)] dark:group-hover:text-white">iOS</span>
                    </button>
                    <button
                      className="p-3 rounded-xl bg-[var(--ecode-surface-secondary)] dark:bg-zinc-800/50 hover:bg-[var(--ecode-surface-tertiary)] dark:hover:bg-zinc-700/50 transition-all flex items-center justify-center gap-2 group"
                      onClick={() => window.open('https://play.google.com/store/apps/details?id=com.ecode', '_blank')}
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-[var(--ecode-text-muted)] dark:text-zinc-400 group-hover:text-[var(--ecode-accent)] dark:group-hover:text-white transition-colors" fill="currentColor">
                        <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                      </svg>
                      <span className="text-xs text-[var(--ecode-text-muted)] dark:text-zinc-400 group-hover:text-[var(--ecode-accent)] dark:group-hover:text-white">Android</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}