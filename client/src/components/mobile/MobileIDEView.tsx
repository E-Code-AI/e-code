import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, PanInfo } from 'framer-motion';
import { Code, Terminal, Monitor, MoreHorizontal, Sparkles, Rocket, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedMobileFileExplorer } from './EnhancedMobileFileExplorer';
import { LazyMobileCodeEditor } from './LazyMobileCodeEditor';
import { EnhancedMobileTerminal } from './EnhancedMobileTerminal';
import { MobilePreviewPanel } from './MobilePreviewPanel';
import { MobileMoreMenu } from './MobileMoreMenu';
import { MobileCollaborationPanel } from './MobileCollaborationPanel';
import { MobileGitPanel } from './MobileGitPanel';
import { MobilePackagesPanel } from './MobilePackagesPanel';
import { MobileSecretsPanel } from './MobileSecretsPanel';
import { MobileDatabasePanel } from './MobileDatabasePanel';
import { MobileDebugPanel } from './MobileDebugPanel';
import { MobileSlidePanel } from './MobileSlidePanel';
import { ReplitBottomTabs } from './ReplitBottomTabs';
import { MobileFAB } from './MobileFAB';
import { useTabPersistence, useFileBrowserPersistence } from '@/hooks/use-mobile-persistence';
import { ReplitAgentPanelV3 } from '../ai/ReplitAgentPanelV3';
import { ReplitSettingsPanel } from '@/components/editor/ReplitSettingsPanel';
import { ShortcutHint, ShortcutTester } from '@/components/utilities';
import { ReplitPublishButton } from '@/components/ide/ReplitPublishButton';
import { ReplitDeploymentPanel } from '@/components/ide/ReplitDeploymentPanel';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

export type MobilePanelType = 'git' | 'packages' | 'secrets' | 'database' | 'settings' | 'debug' | null;

export type MobileTab = 'agent' | 'code' | 'terminal' | 'preview' | 'deploy' | 'more';

interface MobileIDEViewProps {
  projectId: string | number; // Support both UUID strings and numeric IDs
  className?: string;
}

// Normalize projectId to string for all child components
const normalizeProjectId = (id: string | number): string => String(id);

type PublishStatus = 'idle' | 'publishing' | 'live' | 'failed' | 'needs-republish';

interface PublishState {
  status: PublishStatus;
  url?: string;
  deployedAt?: string;
  errorMessage?: string;
}

interface MobilePublishFABProps {
  projectId: string;
  className?: string;
  onNavigateToDeploy?: () => void;
}

function MobilePublishFAB({ projectId, className, onNavigateToDeploy }: MobilePublishFABProps) {
  const [showLabel, setShowLabel] = useState(false);

  const { data: publishState, isLoading } = useQuery<PublishState>({
    queryKey: ['/api/projects', projectId, 'publish', 'status'],
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'publishing' ? 2000 : false;
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<PublishState>('POST', `/api/projects/${projectId}/publish`);
    },
    onMutate: () => {
      queryClient.setQueryData<PublishState>(
        ['/api/projects', projectId, 'publish', 'status'],
        (old) => ({ ...old, status: 'publishing' })
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'publish', 'status'] });
      toast({
        title: 'Published successfully!',
        description: data?.url ? `Your app is live at ${data.url}` : 'Your app is now live.',
      });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'publish', 'status'] });
      toast({
        title: 'Publish failed',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  const republishMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<PublishState>('POST', `/api/projects/${projectId}/republish`);
    },
    onMutate: () => {
      queryClient.setQueryData<PublishState>(
        ['/api/projects', projectId, 'publish', 'status'],
        (old) => ({ ...old, status: 'publishing' })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'publish', 'status'] });
      toast({
        title: 'Republished successfully!',
        description: 'Your changes are now live.',
      });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'publish', 'status'] });
      toast({
        title: 'Republish failed',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    },
  });

  const handlePublish = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }

    if (publishState?.status === 'live' || publishState?.status === 'needs-republish') {
      republishMutation.mutate(undefined);
    } else {
      publishMutation.mutate(undefined);
    }
  };

  const handleViewLive = () => {
    if (publishState?.url) {
      window.open(publishState.url, '_blank', 'noopener,noreferrer');
    }
  };

  const status = publishState?.status || 'idle';
  const isPublishing = status === 'publishing' || publishMutation.isPending || republishMutation.isPending;
  const isLive = status === 'live';
  const needsRepublish = status === 'needs-republish';
  const isFailed = status === 'failed';

  const getButtonState = () => {
    if (isPublishing) {
      return {
        icon: Loader2,
        bgColor: 'bg-blue-500',
        label: 'Publishing...',
        ariaLabel: 'Publishing in progress',
        animate: true,
      };
    }
    if (isLive) {
      return {
        icon: CheckCircle,
        bgColor: 'bg-green-500 hover:bg-green-600 active:bg-green-700',
        label: 'Live',
        ariaLabel: 'App is live - tap to view',
      };
    }
    if (needsRepublish) {
      return {
        icon: Rocket,
        bgColor: 'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700',
        label: 'Republish',
        ariaLabel: 'Changes detected - tap to republish',
      };
    }
    if (isFailed) {
      return {
        icon: Rocket,
        bgColor: 'bg-red-500 hover:bg-red-600 active:bg-red-700',
        label: 'Failed',
        ariaLabel: 'Publish failed - tap to retry',
      };
    }
    return {
      icon: Rocket,
      bgColor: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700',
      label: 'Publish',
      ariaLabel: 'Publish app',
    };
  };

  const buttonState = getButtonState();
  const Icon = buttonState.icon;

  if (isLoading) {
    return null;
  }

  return (
    <motion.div
      className={cn(
        'fixed z-40 md:hidden',
        'bottom-20 left-4',
        className
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30, delay: 0.1 }}
    >
      <AnimatePresence>
        {isLive && showLabel && (
          <motion.div
            className="absolute inset-0 rounded-full bg-green-500"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      <motion.button
        onClick={isLive ? handleViewLive : handlePublish}
        onLongPress={onNavigateToDeploy}
        disabled={isPublishing}
        className={cn(
          'w-12 h-12 rounded-full',
          'flex items-center justify-center',
          'shadow-xl',
          'transition-all duration-200',
          'focus:outline-none focus:ring-4 focus:ring-blue-500/50',
          'touch-manipulation',
          isPublishing && 'opacity-75 cursor-not-allowed',
          buttonState.bgColor
        )}
        whileTap={!isPublishing ? { scale: 0.9 } : undefined}
        aria-label={buttonState.ariaLabel}
        data-testid="mobile-publish-fab"
        onHoverStart={() => setShowLabel(true)}
        onHoverEnd={() => setShowLabel(false)}
        onTouchStart={() => setShowLabel(true)}
        onTouchEnd={() => setTimeout(() => setShowLabel(false), 1500)}
      >
        <Icon
          className={cn(
            'h-5 w-5 text-white',
            buttonState.animate && 'animate-spin'
          )}
        />
        
        {isLive && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-white" />
          </span>
        )}
        
        {needsRepublish && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500 border-2 border-white" />
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {showLabel && (
          <motion.div
            className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-black/90 text-white text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {buttonState.label}
            {isLive && publishState?.url && (
              <div className="flex items-center gap-1 mt-1 text-green-300 text-[10px]">
                <ExternalLink className="h-3 w-3" />
                <span>Tap to view</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const tabs: { id: MobileTab; label: string; icon: typeof Code }[] = [
  { id: 'agent', label: 'Agent', icon: Sparkles },
  { id: 'code', label: 'Code', icon: Code },
  { id: 'terminal', label: 'Shell', icon: Terminal },
  { id: 'preview', label: 'Web', icon: Monitor },
  { id: 'deploy', label: 'Deploy', icon: Rocket },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

export function MobileIDEView({ projectId, className }: MobileIDEViewProps) {
  // Normalize projectId to string
  const normalizedProjectId = normalizeProjectId(projectId);
  
  // Persistent tab state
  const [activeTab, setActiveTab] = useTabPersistence(normalizedProjectId);
  
  // Persistent file browser state
  const { selectedFileId, setSelectedFileId } = useFileBrowserPersistence(normalizedProjectId);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<MobilePanelType>(null);
  
  // Keyboard utilities feature flags
  const [enableShortcutHint, setEnableShortcutHint] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('keyboard-shortcut-hint') !== 'false';
  });
  const [enableShortcutTester, setEnableShortcutTester] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('keyboard-shortcut-tester') === 'true';
  });
  
  // Listen for keyboard settings changes
  useEffect(() => {
    const handleKeyboardSettingsChanged = (event: Event) => {
      const customEvent = event as CustomEvent;
      // Use event detail if available, otherwise fallback to localStorage
      const hintValue = customEvent.detail?.shortcutHint ?? localStorage.getItem('keyboard-shortcut-hint');
      const testerValue = customEvent.detail?.shortcutTester ?? localStorage.getItem('keyboard-shortcut-tester');
      
      setEnableShortcutHint(hintValue !== 'false');
      setEnableShortcutTester(testerValue === 'true');
    };
    
    window.addEventListener('keyboard-settings-changed', handleKeyboardSettingsChanged);
    return () => window.removeEventListener('keyboard-settings-changed', handleKeyboardSettingsChanged);
  }, []);
  
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
  const SWIPE_THRESHOLD = 50;

  // Handle swipe gestures
  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    // Determine if swipe threshold met
    if (Math.abs(offset) > SWIPE_THRESHOLD || Math.abs(velocity) > 500) {
      if (offset > 0 && activeIndex > 0) {
        // Swipe right - go to previous tab
        const prevTab = tabs[activeIndex - 1];
        if (prevTab.id !== 'more') {
          setActiveTab(prevTab.id);
          // Haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate(10);
          }
        }
      } else if (offset < 0 && activeIndex < tabs.length - 1) {
        // Swipe left - go to next tab
        const nextTab = tabs[activeIndex + 1];
        if (nextTab.id !== 'more') {
          setActiveTab(nextTab.id);
          // Haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate(10);
          }
        }
      }
    }
    
    // Reset position
    x.set(0);
  };

  // Handle tab bar clicks with modal management
  const handleTabClick = (tabId: string) => {
    if (tabId === 'more') {
      setIsMoreMenuOpen(true);
    } else {
      // Only set active tab for content tabs (agent, code, terminal, preview)
      setActiveTab(tabId);
    }
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };
  
  // Handle opening files from More menu
  const handleOpenFiles = () => {
    setIsFilesOpen(true);
    setIsMoreMenuOpen(false);
  };
  
  // Panel handlers - open real slide panels instead of toasts
  const handleOpenPanel = (panel: MobilePanelType) => {
    setActivePanel(panel);
    setIsMoreMenuOpen(false);
  };
  
  const handleClosePanel = () => {
    setActivePanel(null);
  };
  
  // File selection handler with persistence
  const handleFileSelect = (file: any) => {
    setSelectedFileId(file.id);
  };

  return (
    <div className={cn('flex flex-col h-full bg-[#1e1e1e] md:hidden', className)}>
      {/* Content Area with Swipe Gestures */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative touch-pan-y"
        data-testid="mobile-ide-content"
      >
        <motion.div
          drag={activeTab === 'agent' ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className={cn('h-full', isDragging && 'cursor-grabbing')}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'agent' && (
                <ReplitAgentPanelV3 
                  projectId={String(projectId)}
                  mode="mobile"
                />
              )}
              
              {activeTab === 'code' && (
                <LazyMobileCodeEditor 
                  projectId={projectId}
                  fileId={selectedFileId}
                />
              )}
              
              {activeTab === 'terminal' && (
                <EnhancedMobileTerminal projectId={projectId} />
              )}
              
              {activeTab === 'preview' && (
                <MobilePreviewPanel projectId={projectId} />
              )}
              
              {activeTab === 'deploy' && (
                <div className="h-full overflow-y-auto bg-[#1e1e1e]">
                  <ReplitDeploymentPanel 
                    projectId={normalizedProjectId} 
                    className="h-full"
                    defaultTab="deploy"
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Swipe Indicator (optional visual feedback) */}
        {isDragging && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-white/30"
            >
              {activeIndex > 0 && '‹'}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-white/30"
            >
              {activeIndex < tabs.length - 2 && '›'}
            </motion.div>
          </div>
        )}
      </div>

      {/* Bottom Tab Bar using ReplitBottomTabs */}
      <ReplitBottomTabs
        activeTab={activeTab}
        onTabChange={handleTabClick}
      />

      {/* Floating Action Button (Run) */}
      <MobileFAB projectId={normalizedProjectId} />

      {/* Floating Action Button (Publish Status) */}
      <MobilePublishFAB 
        projectId={normalizedProjectId} 
        onNavigateToDeploy={() => setActiveTab('deploy')}
      />

      {/* File Explorer Modal */}
      <EnhancedMobileFileExplorer
        isOpen={isFilesOpen}
        onClose={() => setIsFilesOpen(false)}
        projectId={normalizedProjectId}
        onFileSelect={(file) => {
          setSelectedFileId(file.id);
          setActiveTab('code' as MobileTab);
          setIsFilesOpen(false);
        }}
      />

      {/* More Menu Modal */}
      <MobileMoreMenu
        projectId={normalizedProjectId}
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        onOpenFiles={handleOpenFiles}
        onOpenCollaboration={() => setIsCollaborationOpen(true)}
        onOpenGit={() => handleOpenPanel('git')}
        onOpenPackages={() => handleOpenPanel('packages')}
        onOpenSecrets={() => handleOpenPanel('secrets')}
        onOpenDatabase={() => handleOpenPanel('database')}
        onOpenSettings={() => handleOpenPanel('settings')}
        onOpenDebug={() => handleOpenPanel('debug')}
      />
      
      {/* Collaboration Panel */}
      <MobileCollaborationPanel
        projectId={parseInt(normalizedProjectId, 10) || 0}
        isOpen={isCollaborationOpen}
        onClose={() => setIsCollaborationOpen(false)}
      />
      
      {/* Git Panel */}
      <MobileSlidePanel
        isOpen={activePanel === 'git'}
        onClose={handleClosePanel}
        title="Git"
      >
        <MobileGitPanel projectId={normalizedProjectId} className="h-full" />
      </MobileSlidePanel>
      
      {/* Packages Panel */}
      <MobileSlidePanel
        isOpen={activePanel === 'packages'}
        onClose={handleClosePanel}
        title="Packages"
      >
        <MobilePackagesPanel projectId={normalizedProjectId} className="h-full" />
      </MobileSlidePanel>
      
      {/* Secrets Panel */}
      <MobileSlidePanel
        isOpen={activePanel === 'secrets'}
        onClose={handleClosePanel}
        title="Secrets & Environment"
      >
        <MobileSecretsPanel projectId={normalizedProjectId} className="h-full" />
      </MobileSlidePanel>
      
      {/* Database Panel */}
      <MobileSlidePanel
        isOpen={activePanel === 'database'}
        onClose={handleClosePanel}
        title="Database"
      >
        <MobileDatabasePanel projectId={normalizedProjectId} className="h-full" />
      </MobileSlidePanel>
      
      {/* Settings Panel */}
      <MobileSlidePanel
        isOpen={activePanel === 'settings'}
        onClose={handleClosePanel}
        title="Settings"
      >
        <div className="h-full overflow-y-auto p-4">
          <ReplitSettingsPanel />
        </div>
      </MobileSlidePanel>
      
      {/* Debug Panel */}
      <MobileSlidePanel
        isOpen={activePanel === 'debug'}
        onClose={handleClosePanel}
        title="Debugger"
      >
        <MobileDebugPanel projectId={normalizedProjectId} className="h-full" />
      </MobileSlidePanel>
      
      {/* Keyboard Utilities (work with external keyboards on mobile) */}
      {enableShortcutHint && <ShortcutHint />}
      {enableShortcutTester && <ShortcutTester />}
    </div>
  );
}
