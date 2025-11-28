import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, GitCommit, GitPullRequest, GitMerge,
  Bug, Play, Pause, Target,
  AlertTriangle, AlertCircle, Info, CheckCircle,
  Settings, Palette, Key, Database,
  Share2, Link, Users, Download,
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

interface MobileMoreMenuProps {
  projectId: string | number; // Support both UUID strings and numeric IDs
  isOpen: boolean;
  onClose: () => void;
  onOpenFiles?: () => void;
  onOpenCollaboration?: () => void;
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
  problemsCount = 0,
  className 
}: MobileMoreMenuProps) {
  const { toast } = useToast();
  const [dragOffset, setDragOffset] = useState(0);
  const startY = useRef(0);
  const CLOSE_THRESHOLD = 100;
  
  // Handle drag gestures on the handle
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;
    
    // Only allow downward swipe
    if (distance > 0) {
      setDragOffset(distance);
    }
  };
  
  const handleTouchEnd = () => {
    if (dragOffset >= CLOSE_THRESHOLD) {
      onClose();
    } else {
      // Animate back to 0
      setDragOffset(0);
    }
  };

  // Handle menu item clicks
  const handleGitCommit = () => {
    toast({ title: 'Git Commit', description: 'Opening commit dialog...' });
    onClose();
  };

  const handleGitPush = () => {
    toast({ title: 'Git Push', description: 'Pushing changes...' });
    onClose();
  };

  const handleGitPull = () => {
    toast({ title: 'Git Pull', description: 'Pulling latest changes...' });
    onClose();
  };

  const handleGitBranches = () => {
    toast({ title: 'Branches', description: 'Opening branch manager...' });
    onClose();
  };

  const handleDebugStart = () => {
    toast({ title: 'Debug', description: 'Starting debugger...' });
    onClose();
  };

  const handleDebugStop = () => {
    toast({ title: 'Debug', description: 'Stopping debugger...' });
    onClose();
  };

  const handleBreakpoints = () => {
    toast({ title: 'Breakpoints', description: 'Opening breakpoints panel...' });
    onClose();
  };

  const handleWatchVars = () => {
    toast({ title: 'Watch Variables', description: 'Opening watch panel...' });
    onClose();
  };

  const handleViewProblems = () => {
    toast({ title: 'Problems', description: 'Opening problems panel...' });
    onClose();
  };

  const handleProjectSettings = () => {
    toast({ title: 'Project Settings', description: 'Opening settings...' });
    onClose();
  };

  const handleTheme = () => {
    toast({ title: 'Theme', description: 'Opening theme picker...' });
    onClose();
  };

  const handleSecrets = () => {
    toast({ title: 'Secrets', description: 'Managing environment secrets...' });
    onClose();
  };

  const handleDatabase = () => {
    toast({ title: 'Database', description: 'Opening database viewer...' });
    onClose();
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

  const handleExport = () => {
    toast({ title: 'Export', description: 'Preparing project export...' });
    onClose();
  };

  // New handlers for additional services
  const handleWebview = () => {
    toast({ title: 'Webview', description: 'Opening web preview...' });
    onClose();
  };

  const handlePackages = () => {
    toast({ title: 'Packages', description: 'Managing dependencies...' });
    onClose();
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
    toast({ title: 'Security', description: 'Running security scanner...' });
    onClose();
  };

  const handleEnvVars = () => {
    toast({ title: 'Environment Variables', description: 'Managing env vars...' });
    onClose();
  };

  // Files handlers
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

  // Menu sections
  const menuSections: MenuSection[] = [
    {
      title: 'Files',
      icon: FolderOpen,
      items: [
        { id: 'files-explorer', label: 'File Explorer', icon: FolderOpen, onClick: handleOpenFiles },
        { id: 'files-new', label: 'New File', icon: FilePlus, onClick: handleNewFile },
        { id: 'files-recent', label: 'Recent Files', icon: FileCode, onClick: handleOpenRecent },
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="mobile-more-menu-backdrop"
          />
          
          {/* Bottom Sheet */}
          <motion.div
            className={cn(
              'fixed bottom-0 left-0 right-0 bg-[#252526] rounded-t-2xl shadow-2xl z-50 max-h-[85vh] flex flex-col',
              className
            )}
            initial={{ y: '100%' }}
            animate={{ y: dragOffset }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 500 }}
            data-testid="mobile-more-menu-sheet"
          >
            {/* Drag Handle */}
            <div 
              className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              data-testid="mobile-more-menu-handle"
            >
              <div className="w-12 h-1 bg-gray-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#3e3e42]">
              <h2 className="font-semibold text-white text-lg">Tools & More</h2>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-[#3e3e42] touch-manipulation"
                onClick={onClose}
                data-testid="mobile-more-menu-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Menu Content */}
            <ScrollArea className="flex-1 overflow-y-auto mobile-hide-scrollbar" style={{ maxHeight: 'calc(85vh - 120px)' }}>
              <div className="p-4 space-y-6 pb-safe">
                {menuSections.map((section, sectionIndex) => (
                  <div key={section.title} data-testid={`mobile-more-menu-section-${section.title.toLowerCase()}`}>
                    {/* Section Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <section.icon className="h-4 w-4 text-[#F26207]" />
                      <h3 className="font-semibold text-sm text-gray-300 uppercase tracking-wide">
                        {section.title}
                      </h3>
                    </div>

                    {/* Section Items */}
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <motion.button
                          key={item.id}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#3e3e42] active:bg-[#4e4e52] transition-colors touch-manipulation text-left group"
                          onClick={item.onClick}
                          whileTap={{ scale: 0.98 }}
                          data-testid={`mobile-more-menu-${item.id}`}
                        >
                          {/* Icon */}
                          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-[#3e3e42] rounded-lg group-hover:bg-[#4e4e52] transition-colors">
                            <item.icon className="h-5 w-5 text-gray-300" />
                          </div>

                          {/* Label */}
                          <span className="flex-1 text-sm text-white font-medium">
                            {item.label}
                          </span>

                          {/* Badge (if present) */}
                          {item.badge !== undefined && (
                            <Badge variant="destructive" className="flex-shrink-0">
                              {item.badge}
                            </Badge>
                          )}

                          {/* Chevron */}
                          <ChevronRight className="flex-shrink-0 h-4 w-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
                        </motion.button>
                      ))}
                    </div>

                    {/* Separator (except for last section) */}
                    {sectionIndex < menuSections.length - 1 && (
                      <Separator className="mt-6 bg-[#3e3e42]" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer Info */}
            <div className="px-4 py-3 border-t border-[#3e3e42] text-xs text-gray-400 text-center">
              E-Code Mobile • Project #{projectId}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
