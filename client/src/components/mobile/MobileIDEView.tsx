import React, { useState, useRef, useEffect, Suspense } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Terminal, Monitor, MoreHorizontal, Sparkles, Loader2, CheckCircle, ExternalLink, FolderOpen, Rocket, Code, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedMobileFileExplorer } from './EnhancedMobileFileExplorer';
import { InlineMobileFileExplorer } from './InlineMobileFileExplorer';
import { LazyMobileCodeEditor } from './LazyMobileCodeEditor';
import { MobilePreviewPanel } from './MobilePreviewPanel';
import { MobileMoreMenu } from './MobileMoreMenu';
import { MobileCollaborationPanel } from './MobileCollaborationPanel';
import { ReplitGitPanel } from '@/components/editor/ReplitGitPanel';
import { MobilePackagesPanel } from './MobilePackagesPanel';
import { MobileSecretsPanel } from './MobileSecretsPanel';
import { MobileDatabasePanel } from './MobileDatabasePanel';
import { MobileDebugPanel } from './MobileDebugPanel';
import { MobileSlidePanel } from './MobileSlidePanel';
import { ReplitBottomTabs } from './ReplitBottomTabs';
import { MobileFAB } from './MobileFAB';
import { 
  TerminalSkeleton, 
  EditorSkeleton, 
  PreviewSkeleton, 
  AgentSkeleton
} from './MobileLoadingSkeleton';
import { useTabPersistence, useFileBrowserPersistence } from '@/hooks/use-mobile-persistence';
import { ReplitAgentPanelV3 } from '../ai/ReplitAgentPanelV3';
import { ReplitSettingsPanel } from '@/components/editor/ReplitSettingsPanel';
import { useAgentTools } from '@/hooks/useAgentTools';
import { ShortcutHint, ShortcutTester } from '@/components/utilities';
import { ReplitPublishButton } from '@/components/ide/ReplitPublishButton';
import { useConnectionStatus } from '@/hooks/use-connection-status';
import { useProblemsCount } from '@/hooks/use-problems-count';
import { useReducedMotion, SPRING_CONFIG, getReducedMotionTransition } from '@/hooks/use-reduced-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';

const EnhancedMobileTerminal = React.lazy(() => 
  import('./EnhancedMobileTerminal').then(module => ({ default: module.EnhancedMobileTerminal }))
);

const TerminalFallback = () => (
  <TerminalSkeleton className="h-full" />
);

const EditorFallback = () => (
  <EditorSkeleton className="h-full" />
);

const PreviewFallback = () => (
  <PreviewSkeleton className="h-full" />
);

const AgentFallback = () => (
  <AgentSkeleton className="h-full" />
);

export type MobilePanelType = 'git' | 'packages' | 'secrets' | 'database' | 'settings' | 'debug' | null;

export type MobileTab = 'agent' | 'files' | 'console' | 'preview' | 'more';

interface MobileIDEViewProps {
  projectId: string | number;
  className?: string;
}

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
  const prefersReducedMotion = useReducedMotion();

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
      transition={getReducedMotionTransition(prefersReducedMotion, SPRING_CONFIG.snappy)}
    >
      <AnimatePresence>
        {isLive && showLabel && !prefersReducedMotion && (
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
        whileTap={!isPublishing && !prefersReducedMotion ? { scale: 0.9 } : undefined}
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
            <span className={cn(
              "absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75",
              !prefersReducedMotion && "animate-ping"
            )} />
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
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.2 }}
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
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'preview', label: 'Webview', icon: Monitor },
  { id: 'more', label: 'Tools', icon: MoreHorizontal },
];

export function MobileIDEView({ projectId, className }: MobileIDEViewProps) {
  const normalizedProjectId = normalizeProjectId(projectId);
  const prefersReducedMotion = useReducedMotion();
  
  const numericProjectId = typeof projectId === 'number' ? projectId : parseInt(String(projectId), 10) || 1;
  const { settings: agentSettings, updateSettings: updateAgentSettings } = useAgentTools(numericProjectId);
  
  const [activeTab, setActiveTab] = useTabPersistence(normalizedProjectId);
  const { selectedFileId, setSelectedFileId } = useFileBrowserPersistence(normalizedProjectId);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<MobilePanelType>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isEditingFile, setIsEditingFile] = useState(false);
  
  interface GitStatus {
    branch: string;
    ahead: number;
    behind: number;
    staged: string[];
    unstaged: string[];
    untracked: string[];
  }
  
  const { data: gitStatus } = useQuery<GitStatus>({
    queryKey: ['/api/git/status'],
    refetchInterval: 30000,
  });
  
  const gitChangesCount = gitStatus 
    ? (gitStatus.staged?.length || 0) + (gitStatus.unstaged?.length || 0) + (gitStatus.untracked?.length || 0)
    : 0;
  
  const isConnected = useConnectionStatus();
  const { errorsCount } = useProblemsCount(normalizedProjectId);
  
  const [enableShortcutHint, setEnableShortcutHint] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('keyboard-shortcut-hint') !== 'false';
  });
  const [enableShortcutTester, setEnableShortcutTester] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('keyboard-shortcut-tester') === 'true';
  });
  
  useEffect(() => {
    const handleKeyboardSettingsChanged = (event: Event) => {
      const customEvent = event as CustomEvent;
      const hintValue = customEvent.detail?.shortcutHint ?? localStorage.getItem('keyboard-shortcut-hint');
      const testerValue = customEvent.detail?.shortcutTester ?? localStorage.getItem('keyboard-shortcut-tester');
      
      setEnableShortcutHint(hintValue !== 'false');
      setEnableShortcutTester(testerValue === 'true');
    };
    
    window.addEventListener('keyboard-settings-changed', handleKeyboardSettingsChanged);
    return () => window.removeEventListener('keyboard-settings-changed', handleKeyboardSettingsChanged);
  }, []);

  useEffect(() => {
    if (activeTab !== 'files') {
      setIsEditingFile(false);
    }
  }, [activeTab]);
  
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const parallaxOffset = useTransform(x, [-200, 0, 200], [30, 0, -30]);
  const dragOpacity = useTransform(x, [-150, -50, 0, 50, 150], [0.6, 0.9, 1, 0.9, 0.6]);
  
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
  const SWIPE_THRESHOLD = 50;
  const VELOCITY_THRESHOLD = 500;

  const handleDragStart = () => {
    setIsDragging(true);
    setSwipeDirection(null);
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 20) {
      setSwipeDirection('right');
    } else if (info.offset.x < -20) {
      setSwipeDirection('left');
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setIsDragging(false);
    setSwipeDirection(null);
    
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    
    const shouldSwipe = Math.abs(offset) > SWIPE_THRESHOLD || Math.abs(velocity) > VELOCITY_THRESHOLD;
    
    if (shouldSwipe) {
      if (offset > 0 && activeIndex > 0) {
        const prevTab = tabs[activeIndex - 1];
        if (prevTab.id !== 'more') {
          setActiveTab(prevTab.id);
          if ('vibrate' in navigator) {
            navigator.vibrate(10);
          }
        }
      } else if (offset < 0 && activeIndex < tabs.length - 1) {
        const nextTab = tabs[activeIndex + 1];
        if (nextTab.id !== 'more') {
          setActiveTab(nextTab.id);
          if ('vibrate' in navigator) {
            navigator.vibrate(10);
          }
        }
      }
    }
    
    x.set(0);
  };

  const handleTabClick = (tabId: string) => {
    if (tabId === 'more') {
      setIsMoreMenuOpen(true);
    } else {
      setActiveTab(tabId);
    }
    
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };
  
  const handleOpenFiles = () => {
    setIsFilesOpen(true);
    setIsMoreMenuOpen(false);
  };
  
  const handleOpenPanel = (panel: MobilePanelType) => {
    setActivePanel(panel);
    setIsMoreMenuOpen(false);
  };
  
  const handleClosePanel = () => {
    setActivePanel(null);
  };
  
  const handleFileSelect = (file: { id: string | number }) => {
    const fileId = typeof file.id === 'string' ? parseInt(file.id, 10) : file.id;
    setSelectedFileId(isNaN(fileId) ? undefined : fileId);
  };

  const getTabVariants = (direction: 'left' | 'right' | null) => {
    if (prefersReducedMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
    }
    
    const offset = direction === 'left' ? -30 : direction === 'right' ? 30 : 20;
    const exitOffset = direction === 'left' ? 30 : direction === 'right' ? -30 : -20;
    
    return {
      initial: { opacity: 0, x: offset, scale: 0.98 },
      animate: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, x: exitOffset, scale: 0.98 },
    };
  };

  return (
    <div className={cn('flex flex-col h-full bg-background dark:bg-[var(--ecode-background)]', className)}>
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative touch-pan-y"
        data-testid="mobile-ide-content"
      >
        <motion.div
          drag={activeTab === 'agent' || prefersReducedMotion ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          style={{ x, opacity: prefersReducedMotion ? 1 : dragOpacity }}
          className={cn('h-full', isDragging && 'cursor-grabbing')}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              variants={getTabVariants(swipeDirection)}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={getReducedMotionTransition(prefersReducedMotion, SPRING_CONFIG.default)}
              className="h-full"
              style={{ x: prefersReducedMotion ? 0 : parallaxOffset }}
            >
              {activeTab === 'agent' && (
                <Suspense fallback={<AgentFallback />}>
                  <ReplitAgentPanelV3 
                    projectId={String(projectId)}
                    mode="mobile"
                    agentToolsSettings={agentSettings}
                    onAgentToolsSettingsChange={updateAgentSettings}
                  />
                </Suspense>
              )}
              
              {activeTab === 'files' && (
                isEditingFile && selectedFileId ? (
                  <Suspense fallback={<EditorFallback />}>
                    <div className="h-full flex flex-col">
                      <div className="flex items-center gap-2 p-2 border-b border-[var(--ecode-border)] bg-[var(--ecode-surface)]">
                        <button
                          onClick={() => setIsEditingFile(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--ecode-accent)] hover:bg-[var(--ecode-surface-hover)] rounded-lg touch-manipulation min-h-[44px]"
                          data-testid="button-back-to-files"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Back to Files
                        </button>
                      </div>
                      <div className="flex-1">
                        <LazyMobileCodeEditor 
                          projectId={projectId}
                          fileId={selectedFileId}
                        />
                      </div>
                    </div>
                  </Suspense>
                ) : (
                  <InlineMobileFileExplorer
                    projectId={normalizedProjectId}
                    selectedFileId={selectedFileId}
                    onFileSelect={(file) => {
                      setSelectedFileId(file.id);
                      setIsEditingFile(true);
                    }}
                  />
                )
              )}
              
              {activeTab === 'console' && (
                <Suspense fallback={<TerminalFallback />}>
                  <EnhancedMobileTerminal projectId={projectId} />
                </Suspense>
              )}
              
              {activeTab === 'preview' && (
                <Suspense fallback={<PreviewFallback />}>
                  <MobilePreviewPanel projectId={projectId} />
                </Suspense>
              )}
              
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {isDragging && !prefersReducedMotion && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-8">
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.8 }}
              animate={{ 
                opacity: swipeDirection === 'right' ? 0.5 : 0.2, 
                x: swipeDirection === 'right' ? 0 : -10,
                scale: swipeDirection === 'right' ? 1 : 0.9
              }}
              transition={SPRING_CONFIG.default}
              className="text-white/50 text-2xl font-light"
            >
              {activeIndex > 0 && '‹'}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.8 }}
              animate={{ 
                opacity: swipeDirection === 'left' ? 0.5 : 0.2, 
                x: swipeDirection === 'left' ? 0 : 10,
                scale: swipeDirection === 'left' ? 1 : 0.9
              }}
              transition={SPRING_CONFIG.default}
              className="text-white/50 text-2xl font-light"
            >
              {activeIndex < tabs.length - 2 && '›'}
            </motion.div>
          </div>
        )}
      </div>

      <ReplitBottomTabs
        activeTab={activeTab}
        onTabChange={handleTabClick}
        badgeCounts={{ git: gitChangesCount, errors: errorsCount }}
        isConnected={isConnected}
      />

      <MobileFAB projectId={normalizedProjectId} />

      <MobilePublishFAB 
        projectId={normalizedProjectId} 
        onNavigateToDeploy={() => handleOpenPanel('settings')}
      />

      <EnhancedMobileFileExplorer
        isOpen={isFilesOpen}
        onClose={() => setIsFilesOpen(false)}
        projectId={normalizedProjectId}
        onFileSelect={(file) => {
          setSelectedFileId(file.id);
          setActiveTab('files' as MobileTab);
          setIsFilesOpen(false);
        }}
      />

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
      
      <MobileCollaborationPanel
        projectId={parseInt(normalizedProjectId, 10) || 0}
        isOpen={isCollaborationOpen}
        onClose={() => setIsCollaborationOpen(false)}
      />
      
      <MobileSlidePanel
        isOpen={activePanel === 'git'}
        onClose={handleClosePanel}
        title="Git"
      >
        <ReplitGitPanel projectId={normalizedProjectId} className="h-full" />
      </MobileSlidePanel>
      
      <MobileSlidePanel
        isOpen={activePanel === 'packages'}
        onClose={handleClosePanel}
        title="Packages"
      >
        <MobilePackagesPanel projectId={normalizedProjectId} className="h-full" />
      </MobileSlidePanel>
      
      <MobileSlidePanel
        isOpen={activePanel === 'secrets'}
        onClose={handleClosePanel}
        title="Secrets & Environment"
      >
        <MobileSecretsPanel projectId={normalizedProjectId} className="h-full" />
      </MobileSlidePanel>
      
      <MobileSlidePanel
        isOpen={activePanel === 'database'}
        onClose={handleClosePanel}
        title="Database"
      >
        <MobileDatabasePanel projectId={normalizedProjectId} className="h-full" />
      </MobileSlidePanel>
      
      <MobileSlidePanel
        isOpen={activePanel === 'settings'}
        onClose={handleClosePanel}
        title="Settings"
      >
        <div className="h-full overflow-y-auto p-4">
          <ReplitSettingsPanel />
        </div>
      </MobileSlidePanel>
      
      <MobileSlidePanel
        isOpen={activePanel === 'debug'}
        onClose={handleClosePanel}
        title="Debugger"
      >
        <MobileDebugPanel projectId={normalizedProjectId} className="h-full" />
      </MobileSlidePanel>
      
      {enableShortcutHint && <ShortcutHint />}
      {enableShortcutTester && <ShortcutTester />}
    </div>
  );
}
