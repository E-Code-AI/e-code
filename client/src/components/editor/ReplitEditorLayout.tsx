// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Terminal as TerminalIcon,
  X,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';

interface ReplitEditorLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  bottomPanel?: React.ReactNode;
  rightPanels?: {
    id: string;
    title: string;
    icon: React.ReactNode;
    content: React.ReactNode;
  }[];
  defaultRightPanel?: string;
  onRightPanelChange?: (panelId: string | null) => void;
  leftPanelOpen?: boolean;
  onLeftPanelOpenChange?: (open: boolean) => void;
  rightPanelOpen?: boolean;
  onRightPanelOpenChange?: (open: boolean) => void;
  activeRightPanel?: string | null;
  bottomPanelOpen?: boolean;
  onBottomPanelOpenChange?: (open: boolean) => void;
}

export function ReplitEditorLayout({
  leftPanel,
  centerPanel,
  bottomPanel,
  rightPanels = [],
  defaultRightPanel,
  onRightPanelChange,
  leftPanelOpen: leftPanelOpenProp,
  onLeftPanelOpenChange,
  rightPanelOpen: rightPanelOpenProp,
  onRightPanelOpenChange,
  activeRightPanel: activeRightPanelProp,
  bottomPanelOpen: bottomPanelOpenProp,
  onBottomPanelOpenChange,
}: ReplitEditorLayoutProps) {
  const [internalLeftPanelOpen, setInternalLeftPanelOpen] = useState(leftPanelOpenProp ?? true);
  const [internalRightPanelOpen, setInternalRightPanelOpen] = useState(rightPanelOpenProp ?? true);
  const [internalBottomPanelOpen, setInternalBottomPanelOpen] = useState(bottomPanelOpenProp ?? true);
  const [internalActiveRightPanel, setInternalActiveRightPanel] = useState<string | null>(
    activeRightPanelProp ?? defaultRightPanel || rightPanels[0]?.id || null
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileBottomPanelOpen, setMobileBottomPanelOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const isTablet = useMediaQuery('(max-width: 1280px)');

  const rightPanelOpen = rightPanelOpenProp ?? internalRightPanelOpen;
  const bottomPanelOpen = bottomPanelOpenProp ?? internalBottomPanelOpen;
  const activeRightPanel = activeRightPanelProp ?? internalActiveRightPanel;
  const leftPanelOpen = leftPanelOpenProp ?? internalLeftPanelOpen;

  useEffect(() => {
    if (leftPanelOpenProp !== undefined) {
      setInternalLeftPanelOpen(leftPanelOpenProp);
    }
  }, [leftPanelOpenProp]);

  useEffect(() => {
    if (rightPanelOpenProp !== undefined) {
      setInternalRightPanelOpen(rightPanelOpenProp);
    }
  }, [rightPanelOpenProp]);

  useEffect(() => {
    if (bottomPanelOpenProp !== undefined) {
      setInternalBottomPanelOpen(bottomPanelOpenProp);
    }
  }, [bottomPanelOpenProp]);

  useEffect(() => {
    if (activeRightPanelProp !== undefined) {
      setInternalActiveRightPanel(activeRightPanelProp);
    }
  }, [activeRightPanelProp]);

  useEffect(() => {
    if (isMobile) {
      updateLeftPanelOpen(false);
      updateRightPanelOpen(false);
      updateBottomPanelOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (rightPanels.length === 0) {
      setActiveRightPanelState(null);
      return;
    }

    if (!activeRightPanel && rightPanels.length > 0) {
      setActiveRightPanelState(defaultRightPanel || rightPanels[0].id);
    }
  }, [rightPanels, defaultRightPanel]);

  const handleRightPanelChange = (panelId: string | null) => {
    setActiveRightPanelState(panelId || null);
  };

  const updateLeftPanelOpen = (open: boolean) => {
    if (leftPanelOpenProp === undefined) {
      setInternalLeftPanelOpen(open);
    }
    onLeftPanelOpenChange?.(open);
  };

  const updateRightPanelOpen = (open: boolean) => {
    if (rightPanelOpenProp === undefined) {
      setInternalRightPanelOpen(open);
    }
    onRightPanelOpenChange?.(open);
  };

  const updateBottomPanelOpen = (open: boolean) => {
    if (bottomPanelOpenProp === undefined) {
      setInternalBottomPanelOpen(open);
    }
    onBottomPanelOpenChange?.(open);
  };

  const setActiveRightPanelState = (panelId: string | null) => {
    if (activeRightPanelProp === undefined) {
      setInternalActiveRightPanel(panelId);
    }
    onRightPanelChange?.(panelId);
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-[calc(100vh-48px)] flex flex-col relative">
        {/* Mobile Menu Button */}
        <div className="absolute top-2 left-2 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(true)}
            className="bg-[var(--ecode-surface)] border border-[var(--ecode-border)]"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent side="left" className="w-[80vw] p-0 bg-[var(--ecode-background)]">
            {leftPanel}
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 bg-[var(--ecode-background)]">
          {centerPanel}
        </div>

        {/* Mobile Bottom Panel */}
        {bottomPanel && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileBottomPanelOpen(!mobileBottomPanelOpen)}
              className="h-8 w-full rounded-none border-t border-[var(--ecode-border)] justify-between px-4"
            >
              <span>Terminal</span>
              <TerminalIcon className="h-3 w-3" />
            </Button>
            {mobileBottomPanelOpen && (
              <div className="h-[40vh] border-t border-[var(--ecode-border)]">
                {bottomPanel}
              </div>
            )}
          </>
        )}

        {/* Mobile Right Panel Tabs */}
        {rightPanels.length > 0 && (
          <div className="border-t border-[var(--ecode-border)]">
            <Tabs value={activeRightPanel || rightPanels[0].id} onValueChange={handleRightPanelChange}>
              <TabsList className="w-full rounded-none h-9">
                {rightPanels.map((panel) => (
                  <TabsTrigger key={panel.id} value={panel.id} className="flex-1">
                    {panel.icon}
                    <span className="ml-1 text-xs">{panel.title}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-48px)] flex">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left Panel - File Explorer */}
        {leftPanelOpen && (
          <>
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
              <div className="h-full bg-[var(--ecode-background)] border-r border-[var(--ecode-border)]">
                {leftPanel}
              </div>
            </ResizablePanel>

            <ResizableHandle className="w-1 bg-[var(--ecode-border)] hover:bg-[var(--ecode-accent-subtle)]" />
          </>
        )}

        {/* Center Panel - Code Editor */}
        <ResizablePanel defaultSize={rightPanelOpen ? 50 : 80}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={bottomPanelOpen ? 70 : 100}>
              <div className="h-full bg-[var(--ecode-background)]">
                {centerPanel}
              </div>
            </ResizablePanel>

            {bottomPanel && bottomPanelOpen && (
              <>
                <ResizableHandle className="h-1 bg-[var(--ecode-border)] hover:bg-[var(--ecode-accent-subtle)]" />
                <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                  <div className="h-full bg-[var(--ecode-background)] border-t border-[var(--ecode-border)]">
                    {/* Console/Terminal Header */}
                    <div className="h-9 flex items-center justify-between px-2 border-b border-[var(--ecode-border)]">
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-xs hover:bg-[var(--ecode-sidebar-hover)]"
                        >
                          <TerminalIcon className="h-3 w-3 mr-1" />
                          Console
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateBottomPanelOpen(false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="h-[calc(100%-36px)]">
                      {bottomPanel}
                    </div>
                  </div>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </ResizablePanel>
        
        {rightPanelOpen && rightPanels.length > 0 && (
          <>
            <ResizableHandle className="w-1 bg-[var(--ecode-border)] hover:bg-[var(--ecode-accent-subtle)]" />

            {/* Right Panel - Output/Preview */}
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
              <div className="h-full bg-[var(--ecode-background)] border-l border-[var(--ecode-border)]">
                {/* Right Panel Tabs */}
                <div className="h-9 flex items-center justify-between px-2 border-b border-[var(--ecode-border)]">
                  <div className="flex items-center gap-1">
                    {rightPanels.map((panel) => (
                      <Button
                        key={panel.id}
                        variant={activeRightPanel === panel.id ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleRightPanelChange(panel.id)}
                      >
                        {panel.icon}
                        <span className="ml-1">{panel.title}</span>
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateRightPanelOpen(false)}
                  >
                    <PanelRightClose className="h-3 w-3" />
                  </Button>
                </div>

                {/* Right Panel Content */}
                <div className="h-[calc(100%-36px)]">
                  {rightPanels.map((panel) => (
                    <div
                      key={panel.id}
                      className={cn(
                        "h-full",
                        activeRightPanel === panel.id ? "block" : "hidden"
                      )}
                    >
                      {panel.content}
                    </div>
                  ))}
                </div>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      
      {/* Floating buttons to reopen panels */}
      {!leftPanelOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed left-2 top-16 h-8 w-8 shadow-md"
          onClick={() => updateLeftPanelOpen(true)}
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      )}

      {!rightPanelOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed right-2 top-16 h-8 w-8 shadow-md"
          onClick={() => updateRightPanelOpen(true)}
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      )}

      {!bottomPanelOpen && bottomPanel && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-2 left-1/2 -translate-x-1/2 h-8 w-8 shadow-md"
          onClick={() => updateBottomPanelOpen(true)}
        >
          <TerminalIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}