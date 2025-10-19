// @ts-nocheck
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Home, Code, Zap, Globe, Users, Database, Book,
  Settings, User, HelpCircle, Crown, Plus, Search, FileCode,
  Terminal, GitBranch, Sparkles, Package, Shield, LogOut,
  ChevronRight, Heart, Star, Briefcase, GraduationCap, Workflow,
  HardDrive, BarChart3, Rocket, Cpu, Activity, ArrowRight,
  Moon, Sun, Palette, Bell, MessageSquare, Key, Cloud, Lock,
  Building2, TrendingUp, Award, Download
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
  const primaryLinks = [
    { icon: Home, label: 'Dashboard', path: '/dashboard', description: 'Your workspace' },
    { icon: Code, label: 'Projects', path: '/projects', description: 'All your apps', count: 12 },
    { icon: Package, label: 'Deployments', path: '/deployments', description: 'Live services' },
    { icon: Users, label: 'Teams', path: '/teams', description: 'Collaboration' },
    { icon: BarChart3, label: 'Analytics', path: '/usage', description: 'Performance & usage' },
  ];

  const quickActions = [
    { icon: Plus, label: 'New Project', path: '/agent', color: 'from-blue-500 to-cyan-500', action: 'create' },
    { icon: GitBranch, label: 'Import', path: '/github-import', color: 'from-purple-500 to-pink-500' },
    { icon: Sparkles, label: 'AI Agent', path: '/ai-agent', color: 'from-orange-500 to-red-500' },
    { icon: Book, label: 'Templates', path: '/templates', color: 'from-green-500 to-emerald-500' },
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
      {/* Premium Menu Button */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="lg:hidden"
      >
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-11 w-11 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-gray-200 dark:border-zinc-800 shadow-lg hover:shadow-xl transition-all hover:border-[var(--ecode-accent)] dark:hover:border-purple-500"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5 text-gray-900 dark:text-white" />
          {/* Notification Dot */}
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900" />
        </Button>
      </motion.div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent 
          side="left" 
          className="w-full sm:w-[420px] p-0 bg-white dark:bg-zinc-950 backdrop-blur-2xl border-r border-gray-200 dark:border-zinc-800 shadow-2xl flex flex-col"
        >
          {/* Premium Header */}
          <div className="relative border-b border-gray-200 dark:border-zinc-800 flex-shrink-0">
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/20 dark:from-purple-950/20 dark:via-blue-950/10 dark:to-pink-950/5 overflow-hidden" />
            
            <div className="relative px-6 py-5">
              {/* Logo & Brand */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -20 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between mb-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg flex-shrink-0">
                    <Rocket className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">E-Code</h2>
                    <p className="text-xs text-gray-600 dark:text-zinc-400">Enterprise Platform</p>
                  </div>
                </div>
                
                {/* Notification Badge */}
                <button className="relative h-10 w-10 rounded-xl bg-gray-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors">
                  <Bell className="h-5 w-5 text-gray-600 dark:text-zinc-400" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
                </button>
              </motion.div>

              {/* Enhanced User Profile Card */}
              {user && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <div 
                    className="relative p-4 rounded-2xl bg-gradient-to-br from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-900/50 border border-gray-200 dark:border-zinc-800 cursor-pointer transition-all hover:shadow-lg hover:border-gray-300 dark:hover:border-zinc-700 group"
                    onClick={() => handleNavigate(`/@${user.username}`)}
                  >
                    {/* Subtle gradient overlay */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/5 to-purple-600/5 dark:from-blue-600/10 dark:to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative flex items-center gap-4">
                      <div className="relative">
                        {/* Avatar with gradient ring */}
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 p-0.5">
                          <div className="h-full w-full rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center">
                            <span className="text-xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        {/* Active status indicator */}
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-3 border-white dark:border-zinc-900 shadow-lg flex items-center justify-center">
                          <div className="h-2 w-2 bg-white rounded-full" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white text-base truncate">{user.displayName || user.username}</p>
                        <p className="text-sm text-gray-600 dark:text-zinc-400 truncate">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="secondary" className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950 text-blue-700 dark:text-blue-300 border-0">
                            <Crown className="h-3 w-3 mr-1" />
                            Pro
                          </Badge>
                          <span className="text-xs text-gray-500 dark:text-zinc-500">• Active</span>
                        </div>
                      </div>
                      
                      <ArrowRight className="h-5 w-5 text-gray-400 dark:text-zinc-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 overflow-auto">
            <div className="px-6 py-6">
              {/* Quick Search */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="mb-6"
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
                <button
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center gap-3 transition-all hover:bg-gray-100 dark:hover:bg-zinc-800 hover:border-blue-300 dark:hover:border-blue-900 hover:shadow-md group"
                  onClick={() => {
                    setOpen(false);
                    onOpenSpotlight?.();
                  }}
                >
                  <div className="h-10 w-10 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center group-hover:border-blue-300 dark:group-hover:border-blue-700 transition-colors">
                    <Search className="h-5 w-5 text-gray-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Quick Search</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-500">Files, projects, commands...</p>
                  </div>
                  <kbd className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-gray-600 dark:text-zinc-400">⌘K</kbd>
                </button>
              </motion.div>

              {/* Quick Actions Grid */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isVisible ? 1 : 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="mb-8"
              >
                <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-4 px-1">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action, index) => (
                    <motion.button
                      key={action.label}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.95 }}
                      transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 transition-all hover:shadow-lg hover:border-gray-300 dark:hover:border-zinc-700 group overflow-hidden"
                      onClick={() => handlePrimaryLinkClick(action)}
                    >
                      {/* Gradient overlay on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                      
                      <div className="relative">
                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${action.color} mx-auto mb-3 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                          <action.icon className="h-6 w-6 text-white" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white text-center">{action.label}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Navigation Links */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isVisible ? 1 : 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="space-y-1.5 mb-8"
              >
                <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-4 px-1">Workspace</h3>
                {primaryLinks.map((link, index) => {
                  const isActive = location === link.path;
                  return (
                    <motion.div
                      key={link.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -20 }}
                      transition={{ duration: 0.3, delay: 0.6 + index * 0.05 }}
                    >
                      <button
                        className={`w-full p-3.5 rounded-xl flex items-center gap-3 transition-all relative group ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200 dark:border-blue-900 shadow-sm'
                            : 'hover:bg-gray-50 dark:hover:bg-zinc-900 border border-transparent hover:border-gray-200 dark:hover:border-zinc-800'
                        }`}
                        onClick={() => handleNavigate(link.path)}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-r-full" />
                        )}
                        
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-md'
                            : 'bg-gray-100 dark:bg-zinc-800 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700'
                        }`}>
                          <link.icon className={`h-5 w-5 ${
                            isActive ? 'text-white' : 'text-gray-600 dark:text-zinc-400'
                          }`} />
                        </div>
                        
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-medium ${
                            isActive ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-zinc-300'
                          }`}>{link.label}</p>
                          <p className="text-xs text-gray-500 dark:text-zinc-500">{link.description}</p>
                        </div>
                        
                        {link.count && (
                          <Badge variant="secondary" className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-0">
                            {link.count}
                          </Badge>
                        )}
                        
                        <ChevronRight className={`h-4 w-4 transition-all ${
                          isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-zinc-600 group-hover:translate-x-0.5'
                        }`} />
                      </button>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Resources Section */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isVisible ? 1 : 0 }}
                transition={{ duration: 0.3, delay: 0.8 }}
                className="space-y-1.5 mb-8"
              >
                <h3 className="text-xs font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider mb-4 px-1">Resources</h3>
                {[
                  { icon: Book, label: 'Documentation', path: '/docs' },
                  { icon: GraduationCap, label: 'Learn', path: '/learn' },
                  { icon: Building2, label: 'Bounties', path: '/bounties' },
                  { icon: HelpCircle, label: 'Support', path: '/support' },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="w-full p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-3 group"
                    onClick={() => handleNavigate(item.path)}
                  >
                    <item.icon className="h-5 w-5 text-gray-500 dark:text-zinc-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                    <span className="text-sm text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{item.label}</span>
                  </button>
                ))}
              </motion.div>

              {/* Settings & Account */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isVisible ? 1 : 0 }}
                transition={{ duration: 0.3, delay: 0.9 }}
                className="space-y-1.5 pt-6 border-t border-gray-200 dark:border-zinc-800"
              >
                <button
                  className="w-full p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors flex items-center gap-3 group"
                  onClick={() => handleNavigate('/account')}
                >
                  <Settings className="h-5 w-5 text-gray-500 dark:text-zinc-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                  <span className="text-sm text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Settings</span>
                </button>
                
                {user && (
                  <button
                    className="w-full p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-3 group"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-5 w-5 text-gray-500 dark:text-zinc-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                    <span className="text-sm text-gray-700 dark:text-zinc-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Sign Out</span>
                  </button>
                )}
              </motion.div>

              {/* Footer CTA */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isVisible ? 1 : 0 }}
                transition={{ duration: 0.3, delay: 1 }}
                className="pt-8 pb-6"
              >
                <div className="relative p-5 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 overflow-hidden group cursor-pointer" onClick={() => handleNavigate('/upgrade')}>
                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Crown className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Upgrade to Enterprise</h3>
                        <p className="text-xs text-white/80">Unlock advanced features</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate('/upgrade');
                      }}
                    >
                      Learn More
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
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
