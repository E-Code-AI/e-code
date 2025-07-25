import React, { useState } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  FileCode, 
  Terminal as TerminalIcon, 
  Globe,
  X,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

export function ReplitEditorLayout({
  leftPanel,
  centerPanel,
  bottomPanel,
  rightPanels = [],
  defaultRightPanel,
  onRightPanelChange
}: ReplitEditorLayoutProps) {
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeRightPanel, setActiveRightPanel] = useState(defaultRightPanel || rightPanels[0]?.id);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);

  const handleRightPanelChange = (panelId: string | null) => {
    setActiveRightPanel(panelId || '');
    onRightPanelChange?.(panelId);
  };

  return (
    <div className="h-[calc(100vh-48px)] flex">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Left Panel - File Explorer */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <div className="h-full bg-[var(--ecode-background)] border-r border-[var(--ecode-border)]">
            {leftPanel}
          </div>
        </ResizablePanel>
        
        <ResizableHandle className="w-1 bg-[var(--ecode-border)] hover:bg-[var(--ecode-accent-subtle)]" />
        
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
                        onClick={() => setBottomPanelOpen(false)}
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
                    onClick={() => setRightPanelOpen(false)}
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
      {!rightPanelOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed right-2 top-16 h-8 w-8 shadow-md"
          onClick={() => setRightPanelOpen(true)}
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      )}
      
      {!bottomPanelOpen && bottomPanel && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-2 left-1/2 -translate-x-1/2 h-8 w-8 shadow-md"
          onClick={() => setBottomPanelOpen(true)}
        >
          <TerminalIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}