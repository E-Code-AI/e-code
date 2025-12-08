import { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { 
  GitBranch, GitCommit, GitPullRequest, GitMerge,
  Bug, Play, Pause, Target,
  AlertTriangle, AlertCircle, Info, CheckCircle,
  Settings, Palette, Key, Database,
  Share2, Link, Users, Download, UserPlus, MessageSquare, Radio,
  ChevronRight, X,
  Globe, Package, TestTube, Search,
  FileText, Server, Shield, Variable,
  FolderOpen, FileCode, FilePlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useReducedMotion, SPRING_CONFIG, getReducedMotionTransition, DURATION_CONFIG } from '@/hooks/use-reduced-motion';

interface MobileMoreMenuProps {
  projectId: string | number;
  isOpen: boolean;
  onClose: () => void;
  onOpenFiles?: () => void;
  onOpenCollaboration?: () => void;
  onOpenGit?: () => void;
  onOpenPackages?: () => void;
  onOpenSecrets?: () => void;
  onOpenDatabase?: () => void;
  onOpenSettings?: () => void;
  onOpenDebug?: () => void;
  onOpenSecurity?: () => void;
  problemsCount?: number;
  className?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: typeof GitBranch;
  badge?: string | number;
  onClick: () => void;
}

interface MenuSection {
  title: string;
  icon: typeof GitBranch;
  items: MenuItem[];
}

export function MobileMoreMenu({ 
  projectId,
  isOpen,
  onClose,
  onOpenFiles,
  onOpenCollaboration,
  onOpenGit,
  onOpenPackages,
  onOpenSecrets,
  onOpenDatabase,
  onOpenSettings,
  onOpenDebug,
  onOpenSecurity,
  problemsCount = 0,
  className 
}: MobileMoreMenuProps) {
  const { toast } = useToast();
  const prefersReducedMotion = useReducedMotion();
  
  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(dragY, (value) => {
    if (typeof value !== 'number' || isNaN(value)) return 1;
    const clamped = Math.max(0, Math.min(150, value));
    return 1 - (clamped / 150) * 0.5;
  });
  const dragScale = useTransform(dragY, (value) => {
    if (typeof value !== 'number' || isNaN(value)) return 1;
    const clamped = Math.max(0, Math.min(150, value));
    return 1 - (clamped / 150) * 0.02;
  });
  
  const startY = useRef(0);
  const velocity = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(Date.now());
  const CLOSE_THRESHOLD = 100;
  const VELOCITY_THRESHOLD = 500;

  const handleDragStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    lastY.current = e.touches[0].clientY;
    lastTime.current = Date.now();
    velocity.current = 0;
  };

  const handleDrag = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const currentTime = Date.now();
    const distance = currentY - startY.current;
    const timeDelta = currentTime - lastTime.current;
    
    if (timeDelta > 0) {
      velocity.current = (currentY - lastY.current) / timeDelta * 1000;
    }
    
    lastY.current = currentY;
    lastTime.current = currentTime;
    
    if (distance > 0) {
      dragY.set(distance);
    }
  };

  const handleDragEnd = () => {
    const currentOffset = dragY.get();
    const shouldClose = currentOffset >= CLOSE_THRESHOLD || velocity.current >= VELOCITY_THRESHOLD;
    
    if (shouldClose) {
      onClose();
    }
    
    dragY.set(0);
    velocity.current = 0;
  };

  const handleGitCommit = () => {
    if (onOpenGit) {
      onOpenGit();
    } else {
      toast({ title: 'Git Commit', description: 'Opening commit dialog...' });
      onClose();
    }
  };

  const handleGitPush = () => {
    if (onOpenGit) {
      onOpenGit();
    } else {
      toast({ title: 'Git Push', description: 'Pushing changes...' });
      onClose();
    }
  };

  const handleGitPull = () => {
    if (onOpenGit) {
      onOpenGit();
    } else {
      toast({ title: 'Git Pull', description: 'Pulling latest changes...' });
      onClose();
    }
  };

  const handleGitBranches = () => {
    if (onOpenGit) {
      onOpenGit();
    } else {
      toast({ title: 'Branches', description: 'Opening branch manager...' });
      onClose();
    }
  };

  const handleDebugStart = () => {
    if (onOpenDebug) {
      onOpenDebug();
    } else {
      toast({ title: 'Debug', description: 'Starting debugger...' });
      onClose();
    }
  };

  const handleDebugStop = () => {
    if (onOpenDebug) {
      onOpenDebug();
    } else {
      toast({ title: 'Debug', description: 'Stopping debugger...' });
      onClose();
    }
  };

  const handleBreakpoints = () => {
    if (onOpenDebug) {
      onOpenDebug();
    } else {
      toast({ title: 'Breakpoints', description: 'Opening breakpoints panel...' });
      onClose();
    }
  };

  const handleWatchVars = () => {
    if (onOpenDebug) {
      onOpenDebug();
    } else {
      toast({ title: 'Watch Variables', description: 'Opening watch panel...' });
      onClose();
    }
  };

  const handleViewProblems = () => {
    toast({ title: 'Problems', description: 'Opening problems panel...' });
    onClose();
  };

  const handleProjectSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      toast({ title: 'Project Settings', description: 'Opening settings...' });
      onClose();
    }
  };

  const handleTheme = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      toast({ title: 'Theme', description: 'Opening theme picker...' });
      onClose();
    }
  };

  const handleSecrets = () => {
    if (onOpenSecrets) {
      onOpenSecrets();
    } else {
      toast({ title: 'Secrets', description: 'Managing environment secrets...' });
      onClose();
    }
  };

  const handleDatabase = () => {
    if (onOpenDatabase) {
      onOpenDatabase();
    } else {
      toast({ title: 'Database', description: 'Opening database viewer...' });
      onClose();
    }
  };

  const handleShareLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/projects/${projectId}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link Copied', description: 'Project link copied to clipboard' });
      onClose();
    } catch (error) {
      toast({ 
        title: 'Copy Failed', 
        description: 'Failed to copy link to clipboard',
        variant: 'destructive'
      });
    }
  };

  const handleInviteUsers = () => {
    if (onOpenCollaboration) {
      onOpenCollaboration();
    } else {
      toast({ title: 'Invite Users', description: 'Opening invite dialog...' });
    }
    onClose();
  };

  const handleOpenCollabPanel = () => {
    if (onOpenCollaboration) {
      onOpenCollaboration();
    } else {
      toast({ title: 'Collaboration', description: 'Opening collaboration panel...' });
    }
    onClose();
  };

  const handleCollabChat = () => {
    if (onOpenCollaboration) {
      onOpenCollaboration();
    }
    toast({ title: 'Team Chat', description: 'Opening team chat...' });
    onClose();
  };

  const handleActiveUsers = () => {
    if (onOpenCollaboration) {
      onOpenCollaboration();
    }
    toast({ title: 'Active Users', description: 'Viewing active collaborators...' });
    onClose();
  };

  const handleExport = () => {
    toast({ title: 'Export', description: 'Preparing project export...' });
    onClose();
  };

  const handleWebview = () => {
    toast({ title: 'Webview', description: 'Opening web preview...' });
    onClose();
  };

  const handlePackages = () => {
    if (onOpenPackages) {
      onOpenPackages();
    } else {
      toast({ title: 'Packages', description: 'Managing dependencies...' });
      onClose();
    }
  };

  const handleTests = () => {
    toast({ title: 'Tests', description: 'Running test suite...' });
    onClose();
  };

  const handleGlobalSearch = () => {
    toast({ title: 'Search', description: 'Opening global search...' });
    onClose();
  };

  const handleOutput = () => {
    toast({ title: 'Output', description: 'Viewing output logs...' });
    onClose();
  };

  const handleResources = () => {
    toast({ title: 'Resources', description: 'Managing project resources...' });
    onClose();
  };

  const handleSecurity = () => {
    if (onOpenSecurity) {
      onOpenSecurity();
    } else {
      toast({ title: 'Security', description: 'Running security scanner...' });
      onClose();
    }
  };

  const handleEnvVars = () => {
    if (onOpenSecrets) {
      onOpenSecrets();
    } else {
      toast({ title: 'Environment Variables', description: 'Managing env vars...' });
      onClose();
    }
  };

  const handleOpenFiles = () => {
    if (onOpenFiles) {
      onOpenFiles();
    } else {
      toast({ title: 'Files', description: 'Opening file explorer...' });
    }
    onClose();
  };

  const handleNewFile = () => {
    toast({ title: 'New File', description: 'Creating new file...' });
    onClose();
  };

  const handleOpenRecent = () => {
    toast({ title: 'Recent Files', description: 'Opening recent files...' });
    onClose();
  };

  // Note: Files section removed - use dedicated Files tab in bottom navigation instead
  const menuSections: MenuSection[] = [
    {
      title: 'Collaboration',
      icon: Users,
      items: [
        { id: 'collab-panel', label: 'Collaboration Panel', icon: Users, onClick: handleOpenCollabPanel },
        { id: 'collab-active', label: 'Active Collaborators', icon: Radio, onClick: handleActiveUsers },
        { id: 'collab-chat', label: 'Team Chat', icon: MessageSquare, onClick: handleCollabChat },
        { id: 'collab-invite', label: 'Invite Users', icon: UserPlus, onClick: handleInviteUsers },
      ],
    },
    {
      title: 'Git',
      icon: GitBranch,
      items: [
        { id: 'git-commit', label: 'Commit Changes', icon: GitCommit, onClick: handleGitCommit },
        { id: 'git-push', label: 'Push', icon: GitPullRequest, onClick: handleGitPush },
        { id: 'git-pull', label: 'Pull', icon: GitMerge, onClick: handleGitPull },
        { id: 'git-branches', label: 'Branches', icon: GitBranch, onClick: handleGitBranches },
      ],
    },
    {
      title: 'Debug',
      icon: Bug,
      items: [
        { id: 'debug-start', label: 'Start Debugging', icon: Play, onClick: handleDebugStart },
        { id: 'debug-stop', label: 'Stop Debugging', icon: Pause, onClick: handleDebugStop },
        { id: 'debug-breakpoints', label: 'Breakpoints', icon: Target, onClick: handleBreakpoints },
        { id: 'debug-watch', label: 'Watch Variables', icon: AlertCircle, onClick: handleWatchVars },
      ],
    },
    {
      title: 'Problems',
      icon: AlertTriangle,
      items: [
        { 
          id: 'problems-view', 
          label: 'View Problems', 
          icon: AlertTriangle, 
          badge: problemsCount > 0 ? problemsCount : undefined,
          onClick: handleViewProblems 
        },
      ],
    },
    {
      title: 'Webview & Tools',
      icon: Globe,
      items: [
        { id: 'webview', label: 'Web Preview', icon: Globe, onClick: handleWebview },
        { id: 'packages', label: 'Packages', icon: Package, onClick: handlePackages },
        { id: 'tests', label: 'Tests', icon: TestTube, onClick: handleTests },
        { id: 'search', label: 'Global Search', icon: Search, onClick: handleGlobalSearch },
      ],
    },
    {
      title: 'Development',
      icon: Server,
      items: [
        { id: 'output', label: 'Output & Logs', icon: FileText, onClick: handleOutput },
        { id: 'resources', label: 'Resources', icon: Server, onClick: handleResources },
        { id: 'security', label: 'Security Scanner', icon: Shield, onClick: handleSecurity },
        { id: 'env-vars', label: 'Environment Variables', icon: Variable, onClick: handleEnvVars },
      ],
    },
    {
      title: 'Settings',
      icon: Settings,
      items: [
        { id: 'settings-project', label: 'Project Settings', icon: Settings, onClick: handleProjectSettings },
        { id: 'settings-theme', label: 'Theme', icon: Palette, onClick: handleTheme },
        { id: 'settings-secrets', label: 'Secrets', icon: Key, onClick: handleSecrets },
        { id: 'settings-database', label: 'Database', icon: Database, onClick: handleDatabase },
      ],
    },
    {
      title: 'Share',
      icon: Share2,
      items: [
        { id: 'share-link', label: 'Copy Link', icon: Link, onClick: handleShareLink },
        { id: 'share-invite', label: 'Invite Users', icon: Users, onClick: handleInviteUsers },
        { id: 'share-export', label: 'Export Project', icon: Download, onClick: handleExport },
      ],
    },
  ];

  const sheetVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { y: '100%' },
        visible: { 
          y: 0,
          transition: {
            type: 'spring',
            stiffness: 400,
            damping: 28,
            mass: 0.8,
          }
        },
      };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const sectionVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      };

  const itemVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 },
      };

  const containerVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 1 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 1 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.03,
            delayChildren: 0.1,
          },
        },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-[#0E1525] z-40"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: prefersReducedMotion ? 0.01 : DURATION_CONFIG.normal }}
            onClick={onClose}
            data-testid="mobile-more-menu-backdrop"
          />
          
          <motion.div
            className={cn(
              'fixed bottom-0 left-0 right-0 bg-card dark:bg-[var(--ecode-surface)] rounded-t-2xl shadow-2xl z-50 max-h-[85vh] flex flex-col',
              className
            )}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={prefersReducedMotion ? {} : { 
              y: dragY, 
              opacity: dragOpacity,
              scale: dragScale,
            }}
            data-testid="mobile-more-menu-sheet"
          >
            <div 
              className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={handleDragStart}
              onTouchMove={handleDrag}
              onTouchEnd={handleDragEnd}
              data-testid="mobile-more-menu-handle"
            >
              <motion.div 
                className="w-12 h-1 bg-muted-foreground/50 rounded-full"
                whileHover={prefersReducedMotion ? {} : { scaleX: 1.2 }}
                transition={SPRING_CONFIG.default}
              />
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground text-lg">Tools & More</h2>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-muted touch-manipulation"
                onClick={onClose}
                data-testid="mobile-more-menu-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 overflow-y-auto mobile-hide-scrollbar" style={{ maxHeight: 'calc(85vh - 120px)' }}>
              <motion.div 
                className="p-4 space-y-6 pb-safe"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {menuSections.map((section, sectionIndex) => (
                  <motion.div 
                    key={section.title} 
                    variants={sectionVariants}
                    transition={getReducedMotionTransition(prefersReducedMotion, SPRING_CONFIG.gentle)}
                    data-testid={`mobile-more-menu-section-${section.title.toLowerCase()}`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <section.icon className="h-4 w-4 text-[#F26207]" />
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        {section.title}
                      </h3>
                    </div>

                    <div className="space-y-1">
                      {section.items.map((item, itemIndex) => (
                        <motion.button
                          key={item.id}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted active:bg-[#2B3245] transition-colors touch-manipulation text-left group"
                          onClick={item.onClick}
                          variants={itemVariants}
                          whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                          transition={getReducedMotionTransition(prefersReducedMotion, SPRING_CONFIG.default)}
                          data-testid={`mobile-more-menu-${item.id}`}
                        >
                          <motion.div 
                            className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-muted dark:bg-[var(--ecode-surface-secondary)] rounded-lg group-hover:bg-[#2B3245] transition-colors"
                            whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                            transition={SPRING_CONFIG.default}
                          >
                            <item.icon className="h-5 w-5 text-muted-foreground" />
                          </motion.div>

                          <span className="flex-1 text-sm text-foreground font-medium">
                            {item.label}
                          </span>

                          {item.badge !== undefined && (
                            <Badge variant="destructive" className="flex-shrink-0">
                              {item.badge}
                            </Badge>
                          )}

                          <ChevronRight className="flex-shrink-0 h-4 w-4 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors" />
                        </motion.button>
                      ))}
                    </div>

                    {sectionIndex < menuSections.length - 1 && (
                      <Separator className="mt-6 bg-border" />
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </ScrollArea>

            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground text-center">
              E-Code Mobile • Project #{projectId}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
