/**
 * TabletIDEView Component
 * Tablet-optimized IDE with sliding drawer navigation + resizable dual panels
 * Supports iPad, Surface, and Android tablets with touch-first interactions
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Code,
  Terminal,
  Monitor,
  Search,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useTablet, useTabletLayout, useTabletOrientation } from '@/hooks/use-tablet';
import {
  useDrawerPersistence,
  usePanelPersistence,
  usePanelSizesPersistence,
  useTabletFilePersistence,
} from '@/hooks/use-tablet-persistence';
import { TabletDrawerContent } from './TabletDrawerContent';
import { LazyMobileCodeEditor } from '@/components/mobile/LazyMobileCodeEditor';
import { MobileTerminal } from '@/components/mobile/MobileTerminal';
import { MobilePreviewPanel } from '@/components/mobile/MobilePreviewPanel';
import { useToast } from '@/hooks/use-toast';

export type TabletPanel = 'editor' | 'terminal' | 'preview';

interface TabletIDEViewProps {
  projectId: string; // UUID string from route params
  className?: string;
}

export function TabletIDEView({ projectId, className }: TabletIDEViewProps) {
  // Tablet detection and layout config
  const { isIPad, isIPadPro, orientation, screenSize } = useTablet();
  const layout = useTabletLayout();
  const { toast } = useToast();
  
  // State management with persistence (tablet-8)
  const [drawerOpen, setDrawerOpen] = useDrawerPersistence(projectId);
  const [rightPanel, setRightPanel] = usePanelPersistence(projectId, layout.canSplitView);
  const [selectedFileId, setSelectedFileId] = useTabletFilePersistence(projectId);
  const { 
    editorPanelSize, 
    setEditorPanelSize, 
    rightPanelSize, 
    setRightPanelSize 
  } = usePanelSizesPersistence(projectId);
  
  // Refs for gesture handling
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  
  // Update drawer visibility when layout capabilities change
  useEffect(() => {
    if (!layout.canShowSidebar && drawerOpen) {
      setDrawerOpen(false);
    }
  }, [layout.canShowSidebar, drawerOpen]);
  
  // Drawer toggle handler
  const toggleDrawer = useCallback(() => {
    setDrawerOpen(prev => !prev);
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);
  
  // Swipe gesture to open/close drawer
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchDuration = Date.now() - touchStartTime.current;
    const swipeDistance = touchEndX - touchStartX.current;
    const swipeVelocity = swipeDistance / touchDuration;
    
    // Swipe from left edge to open drawer
    if (!drawerOpen && touchStartX.current < 20 && swipeDistance > 80) {
      setDrawerOpen(true);
      if ('vibrate' in navigator) navigator.vibrate(10);
    }
    // Swipe right to left to close drawer
    else if (drawerOpen && swipeDistance < -80 && Math.abs(swipeVelocity) > 0.3) {
      setDrawerOpen(false);
      if ('vibrate' in navigator) navigator.vibrate(10);
    }
  };
  
  // Tool action handlers
  const handleOpenTerminal = useCallback(() => {
    // Close drawer first, then switch panel to ensure pointer events work
    setDrawerOpen(false);
    setTimeout(() => {
      setRightPanel('terminal');
      toast({
        title: 'Terminal Opened',
        description: 'Terminal panel is now active',
      });
    }, 100); // Small delay to let drawer close animation complete
  }, [toast]);
  
  const handleOpenAIAgent = useCallback(() => {
    setDrawerOpen(false);
    toast({
      title: '🤖 AI Agent',
      description: 'Handler ready. Full AI agent panel will be implemented in future phases.',
      duration: 3000,
    });
  }, [toast]);
  
  const handleOpenDeploy = useCallback(() => {
    setDrawerOpen(false);
    toast({
      title: '🚀 Deploy',
      description: 'Handler ready. Deployment configuration panel will be implemented in future phases.',
      duration: 3000,
    });
  }, [toast]);
  
  const handleOpenGit = useCallback(() => {
    setDrawerOpen(false);
    toast({
      title: '🌿 Source Control',
      description: 'Handler ready. Git integration panel will be implemented in future phases.',
      duration: 3000,
    });
  }, [toast]);
  
  const handleOpenPackages = useCallback(() => {
    setDrawerOpen(false);
    toast({
      title: '📦 Packages',
      description: 'Handler ready. Package manager panel will be implemented in future phases.',
      duration: 3000,
    });
  }, [toast]);
  
  const handleOpenDebugger = useCallback(() => {
    setDrawerOpen(false);
    toast({
      title: '🐛 Debugger',
      description: 'Handler ready. Debugger panel will be implemented in future phases.',
      duration: 3000,
    });
  }, [toast]);
  
  const handleOpenSettings = useCallback(() => {
    setDrawerOpen(false);
    toast({
      title: '⚙️ Settings',
      description: 'Handler ready. Settings panel will be implemented in future phases.',
      duration: 3000,
    });
  }, [toast]);
  
  // Single panel switcher (for fallback mode - includes Editor)
  const SinglePanelSwitcher = () => (
    <div className="flex items-center gap-1 border-b border-border bg-background/95 backdrop-blur p-1">
      <Button
        variant={rightPanel === 'editor' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setRightPanel('editor')}
        className="flex-1 h-12 touch-manipulation"
        data-testid="button-editor-panel"
      >
        <Code className="h-5 w-5 mr-2" />
        Editor
      </Button>
      <Button
        variant={rightPanel === 'preview' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setRightPanel('preview')}
        className="flex-1 h-12 touch-manipulation"
        data-testid="button-preview-panel"
      >
        <Monitor className="h-5 w-5 mr-2" />
        Preview
      </Button>
      <Button
        variant={rightPanel === 'terminal' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setRightPanel('terminal')}
        className="flex-1 h-12 touch-manipulation"
        data-testid="button-terminal-panel"
      >
        <Terminal className="h-5 w-5 mr-2" />
        Terminal
      </Button>
    </div>
  );
  
  // Right panel switcher (for split-view mode - Preview/Terminal only)
  const RightPanelSwitcher = () => (
    <div className="flex items-center gap-1 border-b border-border bg-background/95 backdrop-blur p-1">
      <Button
        variant={rightPanel === 'preview' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setRightPanel('preview')}
        className="flex-1 h-12 touch-manipulation"
        data-testid="button-preview-panel"
      >
        <Monitor className="h-5 w-5 mr-2" />
        Preview
      </Button>
      <Button
        variant={rightPanel === 'terminal' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setRightPanel('terminal')}
        className="flex-1 h-12 touch-manipulation"
        data-testid="button-terminal-panel"
      >
        <Terminal className="h-5 w-5 mr-2" />
        Terminal
      </Button>
    </div>
  );
  
  return (
    <div
      className={cn(
        'flex h-screen w-screen overflow-hidden bg-background',
        'touch-manipulation select-none',
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid="tablet-ide-view"
    >
      {/* Sliding Drawer Navigation */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            ref={drawerRef}
            initial={{ x: -layout.optimalSidebarWidth }}
            animate={{ x: 0 }}
            exit={{ x: -layout.optimalSidebarWidth }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed left-0 top-0 z-40 h-full bg-background border-r border-border',
              'shadow-xl'
            )}
            style={{ width: layout.optimalSidebarWidth }}
            data-testid="drawer-navigation"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between h-14 px-4 border-b border-border bg-muted/30">
              <h2 className="text-sm font-semibold">File Explorer</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDrawer}
                className="h-10 w-10 touch-manipulation"
                data-testid="button-close-drawer"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Drawer Content - Files and Tools */}
            <div className="h-[calc(100%-3.5rem)] overflow-hidden">
              <TabletDrawerContent
                projectId={projectId}
                onFileSelect={(file) => {
                  setSelectedFileId(file.id);
                  // Auto-close drawer on small tablets in portrait
                  if (orientation === 'portrait' && screenSize === 'small') {
                    setDrawerOpen(false);
                  }
                }}
                onClose={() => setDrawerOpen(false)}
                onOpenAIAgent={handleOpenAIAgent}
                onOpenDeploy={handleOpenDeploy}
                onOpenGit={handleOpenGit}
                onOpenTerminal={handleOpenTerminal}
                onOpenPackages={handleOpenPackages}
                onOpenDebugger={handleOpenDebugger}
                onOpenSettings={handleOpenSettings}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Drawer Overlay (close on tap outside) */}
      {drawerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          data-testid="drawer-overlay"
        />
      )}
      
      {/* Main Content Area with Resizable Panels */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="flex items-center gap-2 h-14 px-4 border-b border-border bg-background/95 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDrawer}
            className="h-10 w-10 touch-manipulation"
            data-testid="button-toggle-drawer"
          >
            {drawerOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          </Button>
          
          <div className="flex-1 flex items-center gap-2">
            <Code className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium truncate">
              {selectedFileId ? `File ${selectedFileId}` : 'No file selected'}
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 touch-manipulation"
            data-testid="button-search"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 touch-manipulation"
            data-testid="button-settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Resizable Dual-Panel Layout */}
        <div className="flex-1 overflow-hidden pointer-events-auto">
          {layout.canSplitView ? (
            <ResizablePanelGroup
              direction="horizontal"
              onLayout={(sizes) => {
                // Persist both panel sizes (tablet-8)
                if (sizes[0]) {
                  setEditorPanelSize(sizes[0]);
                }
                if (sizes[1]) {
                  setRightPanelSize(sizes[1]);
                }
              }}
            >
              {/* Editor Panel */}
              <ResizablePanel
                defaultSize={editorPanelSize}
                minSize={30}
                maxSize={70}
                className="relative"
              >
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-hidden">
                    <LazyMobileCodeEditor
                      projectId={projectId}
                      fileId={selectedFileId || undefined}
                      className="h-full"
                    />
                  </div>
                </div>
              </ResizablePanel>
              
              {/* Resizable Handle with touch-optimized hit area */}
              <ResizableHandle
                withHandle
                className={cn(
                  'w-2 bg-border hover:bg-primary/20 transition-colors',
                  'touch-manipulation cursor-col-resize',
                  'relative after:absolute after:inset-y-0 after:left-1/2',
                  'after:-translate-x-1/2 after:w-8' // Wider touch target
                )}
              />
              
              {/* Right Panel (Preview or Terminal) */}
              <ResizablePanel
                defaultSize={rightPanelSize}
                minSize={25}
                maxSize={50}
              >
                <div className="h-full flex flex-col">
                  <RightPanelSwitcher />
                  <div className="flex-1 overflow-hidden">
                    {rightPanel === 'preview' ? (
                      <MobilePreviewPanel projectId={projectId} />
                    ) : (
                      <MobileTerminal projectId={projectId} />
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            // Fallback for small portrait tablets: single panel with switcher
            <div className="h-full flex flex-col">
              <SinglePanelSwitcher />
              <div className="flex-1 overflow-hidden">
                {rightPanel === 'editor' ? (
                  <LazyMobileCodeEditor
                    projectId={projectId}
                    fileId={selectedFileId || undefined}
                    className="h-full"
                  />
                ) : rightPanel === 'preview' ? (
                  <MobilePreviewPanel projectId={projectId} />
                ) : (
                  <MobileTerminal projectId={projectId} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
