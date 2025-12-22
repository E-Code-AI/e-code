import React, { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { LazyMotionDiv, LazyMotionButton, LazyAnimatePresence, type PanInfo } from '@/lib/motion';
import { useNativeMotionValue } from '@/lib/native-motion';
import { Terminal, Monitor, MoreHorizontal, Sparkles, Loader2, CheckCircle, ExternalLink, FolderOpen, Rocket, Code, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedMobileFileExplorer } from './EnhancedMobileFileExplorer';
import { InlineMobileFileExplorer } from './InlineMobileFileExplorer';
import { LazyMobileCodeEditor } from './LazyMobileCodeEditor';
import { MobilePreviewPanel } from './MobilePreviewPanel';
import { MobileDeployPanel } from './MobileDeployPanel';
import { MobileMoreMenu } from './MobileMoreMenu';
import { MobileCollaborationPanel } from './MobileCollaborationPanel';
import { MobileGitPanel } from './MobileGitPanel';
import { MobilePackagesPanel } from './MobilePackagesPanel';
import { MobileSecretsPanel } from './MobileSecretsPanel';
import { MobileDatabasePanel } from './MobileDatabasePanel';
import { MobileDebugPanel } from './MobileDebugPanel';
import { MobileSecurityPanel } from './MobileSecurityPanel';
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
import { BuildModeSelector, BuildMode } from '@/components/ai/BuildModeSelector';
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

const AutonomousWorkspaceViewer = React.lazy(() => 
  import('../ide/AutonomousWorkspaceViewer').then(module => ({ default: module.AutonomousWorkspaceViewer }))
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

export type MobilePanelType = 'git' | 'packages' | 'secrets' | 'database' | 'settings' | 'debug' | 'security' | 'workflows' | 'history' | 'extensions' | 'actions' | 'tools' | 'deploy' | null;

export type MobileTab = 'agent' | 'files' | 'deploy' | 'preview' | 'more';

interface MobileIDEViewProps {
  projectId: string | number;
  className?: string;
  bootstrapToken?: string | null;
  onWorkspaceComplete?: () => void;
  onWorkspaceError?: (error: string) => void;
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
    <LazyMotionDiv
      className={cn(
        'fixed z-40',
        'bottom-20 left-4',
        className
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={getReducedMotionTransition(prefersReducedMotion, SPRING_CONFIG.snappy)}
    >
      <LazyAnimatePresence>
        {isLive && showLabel && !prefersReducedMotion && (
          <LazyMotionDiv
            className="absolute inset-0 rounded-full bg-green-500"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        )}
      </LazyAnimatePresence>

      <LazyMotionButton
        onClick={isLive ? handleViewLive : handlePublish}
        disabled={isPublishing}
        className={cn(
          'w-12 h-12 rounded-full',
          'flex items-center justify-center',
          'shadow-xl',
          'transition-all duration-200',
          'focus:outline-none focus:ring-4 focus:ring-blue-500',
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
      </LazyMotionButton>

      <LazyAnimatePresence>
        {showLabel && (
          <LazyMotionDiv
            className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-background text-white text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none"
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
          </LazyMotionDiv>
        )}
      </LazyAnimatePresence>
    </LazyMotionDiv>
  );
}

const tabs: { id: MobileTab; label: string; icon: typeof Code }[] = [
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'preview', label: 'Preview', icon: Monitor },
  { id: 'agent', label: 'Agent', icon: Sparkles },
  { id: 'deploy', label: 'Deploy', icon: Rocket },
  { id: 'more', label: 'Tools', icon: MoreHorizontal },
];

export function MobileIDEView({ projectId, className, bootstrapToken, onWorkspaceComplete, onWorkspaceError }: MobileIDEViewProps) {
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
  
  // Build mode selector state for workspace creation
  const [isBuildModeOpen, setIsBuildModeOpen] = useState(false);
  const [pendingBuildPrompt, setPendingBuildPrompt] = useState<string | null>(null);
  const [selectedBuildMode, setSelectedBuildMode] = useState<BuildMode | null>(null);
  
  // ✅ FIX (Dec 9, 2025): Mobile Agent Bootstrap - match desktop IDEPage flow
  // Use effect-based initialization to guard browser-only APIs (safe for SSR/tests)
  
  // Bootstrap state - populated in effects to avoid browser-only API calls during render
  const [agentSessionId, setAgentSessionId] = useState<string | null>(null);
  const [agentConversationId, setAgentConversationId] = useState<number | null>(null);
  const [autoStartAgent, setAutoStartAgent] = useState(false);
  const [persistedBootstrapPrompt, setPersistedBootstrapPrompt] = useState<string | null>(null);
  
  const bootstrapPromptKey = `agent-prompt-${normalizedProjectId}`;
  
  // Decode bootstrap token to extract sessionId and conversationId
  const decodeBootstrapToken = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      if (pad) {
        if (pad === 1) throw new Error('Invalid base64url string');
        base64 += new Array(5 - pad).join('=');
      }
      
      const payload = JSON.parse(atob(base64));
      return {
        projectId: payload.projectId,
        sessionId: payload.sessionId,
        conversationId: payload.conversationId,
        userId: payload.userId
      };
    } catch (e) {
      console.error('[MobileIDEView] Failed to decode bootstrap token:', e);
      return null;
    }
  };
  
  const buildModeKey = `agent-build-mode-${normalizedProjectId}`;
  
  // Extract bootstrap parameters from URL on mount (effect-based for SSR safety)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const searchParams = new URLSearchParams(window.location.search);
    const bootstrapToken = searchParams.get('bootstrap');
    const promptParam = searchParams.get('prompt');
    const agentEnabled = searchParams.get('agent') === 'true' || searchParams.get('panel') === 'agent';
    
    // Check for existing build mode in sessionStorage
    const savedBuildMode = sessionStorage.getItem(buildModeKey) as BuildMode | null;
    if (savedBuildMode) {
      setSelectedBuildMode(savedBuildMode);
    }
    
    // Decode bootstrap token if present
    if (bootstrapToken) {
      const tokenData = decodeBootstrapToken(bootstrapToken);
      if (tokenData) {
        setAgentSessionId(tokenData.sessionId || null);
        setAgentConversationId(tokenData.conversationId || null);
      }
      setAutoStartAgent(true);
    } else if (agentEnabled) {
      setAutoStartAgent(true);
    }
    
    // Handle prompt from URL param - show build mode selector if no mode selected
    if (promptParam && normalizedProjectId) {
      // Check if build mode already selected for this project
      if (!savedBuildMode) {
        // Store prompt as pending and show build mode selector
        setPendingBuildPrompt(promptParam);
        setIsBuildModeOpen(true);
      } else {
        // Build mode already selected, proceed with bootstrap
        sessionStorage.setItem(bootstrapPromptKey, promptParam);
        setPersistedBootstrapPrompt(promptParam);
      }
      
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('prompt');
      window.history.replaceState({}, '', url);
    }
    
    // Read existing prompt from sessionStorage
    const saved = sessionStorage.getItem(bootstrapPromptKey);
    if (saved) {
      setPersistedBootstrapPrompt(saved);
    }
  }, [normalizedProjectId, bootstrapPromptKey, buildModeKey]);
  
  // Fetch project data for bootstrap prompt
  const { data: project } = useQuery<{ id: number; name: string; description?: string }>({
    queryKey: [`/api/projects/${normalizedProjectId}`],
    enabled: !!normalizedProjectId && normalizedProjectId !== 'undefined',
  });
  
  // Store project description as fallback prompt for new projects
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!persistedBootstrapPrompt && project?.description) {
      sessionStorage.setItem(bootstrapPromptKey, project.description);
      setPersistedBootstrapPrompt(project.description);
    }
  }, [project?.description, persistedBootstrapPrompt, bootstrapPromptKey]);
  
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
  
  const connectionStatus = useConnectionStatus();
  const isConnected = connectionStatus.isOnline;
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
  
  // Handle build mode selection from dialog
  const handleSelectBuildMode = (mode: BuildMode) => {
    if (typeof window === 'undefined') return;
    
    // Haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
    
    if (mode === 'continue-planning') {
      // User wants to continue planning - close dialog without starting
      setIsBuildModeOpen(false);
      setPendingBuildPrompt(null);
      return;
    }
    
    // Store the selected build mode
    setSelectedBuildMode(mode);
    sessionStorage.setItem(buildModeKey, mode);
    
    // Now store the pending prompt and trigger bootstrap
    if (pendingBuildPrompt) {
      sessionStorage.setItem(bootstrapPromptKey, pendingBuildPrompt);
      setPersistedBootstrapPrompt(pendingBuildPrompt);
      setAutoStartAgent(true);
      setPendingBuildPrompt(null);
    }
    
    setIsBuildModeOpen(false);
  };
  
  const x = useNativeMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State-based style values derived from native motion value
  const [dragStyles, setDragStyles] = useState({ x: 0, parallaxOffset: 0, opacity: 1 });
  
  // Interpolation helper for derived values
  const interpolate = useCallback((
    value: number,
    inputRange: number[],
    outputRange: number[]
  ): number => {
    // Clamp to input range
    const minInput = inputRange[0];
    const maxInput = inputRange[inputRange.length - 1];
    const clampedValue = Math.max(minInput, Math.min(maxInput, value));
    
    // Find the segment
    for (let i = 0; i < inputRange.length - 1; i++) {
      if (clampedValue >= inputRange[i] && clampedValue <= inputRange[i + 1]) {
        const inputStart = inputRange[i];
        const inputEnd = inputRange[i + 1];
        const outputStart = outputRange[i];
        const outputEnd = outputRange[i + 1];
        
        const t = (clampedValue - inputStart) / (inputEnd - inputStart);
        return outputStart + t * (outputEnd - outputStart);
      }
    }
    return outputRange[outputRange.length - 1];
  }, []);
  
  // Subscribe to native motion value changes and compute derived styles
  useEffect(() => {
    const unsubscribe = x.subscribe((value) => {
      const parallaxOffset = interpolate(value, [-200, 0, 200], [30, 0, -30]);
      const opacity = interpolate(value, [-150, -50, 0, 50, 150], [0.6, 0.9, 1, 0.9, 0.6]);
      setDragStyles({ x: value, parallaxOffset, opacity });
    });
    return unsubscribe;
  }, [x, interpolate]);
  
  const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
  const SWIPE_THRESHOLD = 50;
  const VELOCITY_THRESHOLD = 500;

  const handleDragStart = () => {
    setIsDragging(true);
    setSwipeDirection(null);
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    // Update native motion value with current drag offset
    x.set(info.offset.x);
    
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
        <LazyMotionDiv
          drag={activeTab === 'agent' || prefersReducedMotion ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          style={{ 
            transform: `translateX(${dragStyles.x}px)`,
            opacity: prefersReducedMotion ? 1 : dragStyles.opacity 
          }}
          className={cn('h-full', isDragging && 'cursor-grabbing')}
        >
          <LazyAnimatePresence mode="wait" initial={false}>
            <LazyMotionDiv
              key={activeTab}
              variants={getTabVariants(swipeDirection)}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={getReducedMotionTransition(prefersReducedMotion, SPRING_CONFIG.default)}
              className="h-full"
              style={{ 
                transform: prefersReducedMotion ? 'translateX(0px)' : `translateX(${dragStyles.parallaxOffset}px)` 
              }}
            >
              {activeTab === 'agent' && (
                <Suspense fallback={<AgentFallback />}>
                  <ReplitAgentPanelV3 
                    projectId={String(projectId)}
                    mode="mobile"
                    agentToolsSettings={agentSettings}
                    onAgentToolsSettingsChange={updateAgentSettings}
                    initialPrompt={persistedBootstrapPrompt}
                    sessionId={agentSessionId}
                    externalConversationId={agentConversationId}
                    autoStart={autoStartAgent}
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
              
              {activeTab === 'deploy' && (
                <Suspense fallback={<TerminalFallback />}>
                  <MobileDeployPanel projectId={normalizedProjectId} />
                </Suspense>
              )}
              
              {activeTab === 'preview' && (
                <Suspense fallback={<PreviewFallback />}>
                  <MobilePreviewPanel projectId={projectId} />
                </Suspense>
              )}
              
            </LazyMotionDiv>
          </LazyAnimatePresence>
        </LazyMotionDiv>

        {isDragging && !prefersReducedMotion && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-8">
            <LazyMotionDiv
              initial={{ opacity: 0, x: -20, scale: 0.8 }}
              animate={{ 
                opacity: swipeDirection === 'right' ? 0.5 : 0.2, 
                x: swipeDirection === 'right' ? 0 : -10,
                scale: swipeDirection === 'right' ? 1 : 0.9
              }}
              transition={SPRING_CONFIG.default}
              className="text-muted-foreground text-2xl font-light"
            >
              {activeIndex > 0 && '‹'}
            </LazyMotionDiv>
            <LazyMotionDiv
              initial={{ opacity: 0, x: 20, scale: 0.8 }}
              animate={{ 
                opacity: swipeDirection === 'left' ? 0.5 : 0.2, 
                x: swipeDirection === 'left' ? 0 : 10,
                scale: swipeDirection === 'left' ? 1 : 0.9
              }}
              transition={SPRING_CONFIG.default}
              className="text-muted-foreground text-2xl font-light"
            >
              {activeIndex < tabs.length - 2 && '›'}
            </LazyMotionDiv>
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
        onOpenSecurity={() => handleOpenPanel('security')}
        onOpenWorkflows={() => handleOpenPanel('workflows')}
        onOpenHistory={() => handleOpenPanel('history')}
        onOpenExtensions={() => handleOpenPanel('extensions')}
        onOpenActions={() => handleOpenPanel('actions')}
        onOpenTools={() => handleOpenPanel('tools')}
        onOpenDeploy={() => handleOpenPanel('deploy')}
        onOpenCommandPalette={() => {
          toast({ title: 'Commands', description: 'Command palette coming to mobile soon!' });
          setIsMoreMenuOpen(false);
        }}
        onOpenGlobalSearch={() => {
          toast({ title: 'Search', description: 'Global search coming to mobile soon!' });
          setIsMoreMenuOpen(false);
        }}
        problemsCount={errorsCount}
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
        <MobileGitPanel projectId={normalizedProjectId} className="h-full" />
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
      
      <MobileSlidePanel
        isOpen={activePanel === 'security'}
        onClose={handleClosePanel}
        title="Security Scanner"
      >
        <MobileSecurityPanel projectId={normalizedProjectId} className="h-full" />
      </MobileSlidePanel>
      
      <MobileSlidePanel
        isOpen={activePanel === 'workflows'}
        onClose={handleClosePanel}
        title="Workflows"
      >
        <div className="h-full flex items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Terminal className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">Workflows</h3>
            <p className="text-sm text-muted-foreground">Manage your project workflows and automation scripts.</p>
          </div>
        </div>
      </MobileSlidePanel>
      
      <MobileSlidePanel
        isOpen={activePanel === 'history'}
        onClose={handleClosePanel}
        title="History"
      >
        <div className="h-full flex items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <ArrowLeft className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">Project History</h3>
            <p className="text-sm text-muted-foreground">View recent changes and restore previous versions.</p>
          </div>
        </div>
      </MobileSlidePanel>
      
      <MobileSlidePanel
        isOpen={activePanel === 'extensions'}
        onClose={handleClosePanel}
        title="Extensions"
      >
        <div className="h-full flex items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Code className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">Extensions</h3>
            <p className="text-sm text-muted-foreground">Browse and install extensions to enhance your IDE.</p>
          </div>
        </div>
      </MobileSlidePanel>
      
      <MobileSlidePanel
        isOpen={activePanel === 'actions'}
        onClose={handleClosePanel}
        title="Agent Actions"
      >
        <div className="h-full flex items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">Agent Actions</h3>
            <p className="text-sm text-muted-foreground">Review and approve AI-generated changes.</p>
          </div>
        </div>
      </MobileSlidePanel>
      
      <MobileSlidePanel
        isOpen={activePanel === 'tools'}
        onClose={handleClosePanel}
        title="Development Tools"
      >
        <div className="h-full flex items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Code className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg">Development Tools</h3>
            <p className="text-sm text-muted-foreground">Access developer tools and utilities.</p>
          </div>
        </div>
      </MobileSlidePanel>
      
      <MobileSlidePanel
        isOpen={activePanel === 'deploy'}
        onClose={handleClosePanel}
        title="Deploy"
      >
        <div className="h-full flex items-center justify-center p-6 text-center">
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-medium text-lg">Deploy Your App</h3>
            <p className="text-sm text-muted-foreground">Use the publish button to deploy your app live.</p>
          </div>
        </div>
      </MobileSlidePanel>
      
      {enableShortcutHint && <ShortcutHint />}
      {enableShortcutTester && <ShortcutTester />}
      
      {/* Build Mode Selector Dialog - touch-friendly for mobile */}
      <BuildModeSelector
        open={isBuildModeOpen}
        onOpenChange={setIsBuildModeOpen}
        onSelectMode={handleSelectBuildMode}
        projectName={pendingBuildPrompt?.slice(0, 50) + (pendingBuildPrompt && pendingBuildPrompt.length > 50 ? '...' : '')}
      />
      
      {/* Autonomous Workspace Viewer - shows animated progress during workspace creation */}
      {bootstrapToken && (
        <Suspense fallback={null}>
          <AutonomousWorkspaceViewer
            bootstrapToken={bootstrapToken}
            projectId={String(projectId)}
            onComplete={onWorkspaceComplete}
            onError={onWorkspaceError}
          />
        </Suspense>
      )}
    </div>
  );
}
