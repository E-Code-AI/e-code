import { useState, useCallback, memo } from 'react';
import { Monitor, Loader2, History } from 'lucide-react';
import { ReplitMobileHeader } from './ReplitMobileHeader';
import { ReplitMobileNavigation, type MobileTab } from './ReplitMobileNavigation';
import { ReplitMobileInputBar } from './ReplitMobileInputBar';
import { ReplitToolsSheet } from './ReplitToolsSheet';
import { MobileMoreMenu } from './MobileMoreMenu';
import { AppNotReadyPlaceholder } from './AppNotReadyPlaceholder';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAgentTools } from '@/hooks/useAgentTools';
import { useSchemaWarmingStore } from '@/stores/schemaWarmingStore';

const ReplitAgentIcon = memo(({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="7" cy="7" r="2.5" />
    <circle cx="17" cy="7" r="2.5" />
    <circle cx="7" cy="17" r="2.5" />
    <circle cx="17" cy="17" r="2.5" />
  </svg>
));
ReplitAgentIcon.displayName = 'ReplitAgentIcon';

interface ReplitMobileIDEProps {
  projectId?: number;
  children?: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  showInputBar?: boolean;
  onSendMessage?: (message: string) => void;
  isAgentBusy?: boolean;
}

export const ReplitMobileIDE = memo(function ReplitMobileIDE({
  projectId,
  children,
  isLoading = false,
  loadingText = "The workspace is loading...",
  showInputBar = true,
  onSendMessage,
  isAgentBusy = false,
}: ReplitMobileIDEProps) {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<MobileTab>('deploy'); // Deploy active by default on mobile/tablet
  const [isRunning, setIsRunning] = useState(false);
  const [showToolsSheet, setShowToolsSheet] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  const [buildMode, setBuildMode] = useState<'build' | 'edit' | 'chat'>('build');
  const { settings: agentToolsSettings, updateSettings: setAgentToolsSettings } = useAgentTools();
  const { isReady: isSchemaReady, isWarming } = useSchemaWarmingStore();

  const handleTabChange = useCallback((tab: MobileTab) => {
    setActiveTab(tab);
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handlePlayStop = useCallback(() => {
    setIsRunning(!isRunning);
    if ('vibrate' in navigator) {
      navigator.vibrate([15, 10, 15]);
    }
  }, [isRunning]);

  const handlePanelToggle = useCallback(() => {
    setShowToolsSheet(prev => !prev);
  }, []);

  const handleBack = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const handleHistory = useCallback(() => {
    setShowHistorySheet(true);
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleNewTab = useCallback(() => {
    setShowToolsSheet(true);
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleMore = useCallback(() => {
    setShowMoreMenu(true);
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleToolSelect = useCallback((toolId: string) => {
    setShowToolsSheet(false);
  }, []);

  const handleSubmitMessage = useCallback((message: string) => {
    onSendMessage?.(message);
  }, [onSendMessage]);

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {activeTab === 'agent' ? (
            <>
              <ReplitAgentIcon className="h-10 w-10 text-[#7C65C1] mb-3 animate-spin-slow" />
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin mb-2" />
            </>
          ) : (
            <>
              <Monitor className="h-10 w-10 text-gray-400 mb-3" />
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin mb-2" />
            </>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {loadingText}
          </p>
        </div>
      );
    }

    // Show AppNotReadyPlaceholder for preview/deploy tabs when schema not ready
    if (!isSchemaReady && (activeTab === 'preview' || activeTab === 'deploy')) {
      return <AppNotReadyPlaceholder tabName={activeTab} />;
    }

    if (children) {
      return children;
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {activeTab === 'agent' ? (
          <ReplitAgentIcon className="h-10 w-10 text-[#7C65C1] mb-3" />
        ) : (
          <Monitor className="h-10 w-10 text-gray-400 mb-3" />
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
          {activeTab === 'agent' 
            ? "Start building by sending a message"
            : "Run your app to see a preview"}
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-[#1C1C1C]">
      <ReplitMobileHeader
        activeTab={activeTab}
        onBack={handleBack}
        onHistory={handleHistory}
        onNewTab={handleNewTab}
        onMore={handleMore}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div
          key={activeTab}
          className={cn(
            "flex-1 flex flex-col overflow-auto",
            "animate-fade-in-fast"
          )}
        >
          {renderTabContent()}
        </div>
      </main>

      {showInputBar && activeTab === 'agent' && (
        <ReplitMobileInputBar
          placeholder="Make, test, iterate..."
          onSubmit={handleSubmitMessage}
          buildMode={buildMode}
          onBuildModeChange={setBuildMode}
          disabled={isLoading}
          isLoading={isAgentBusy}
          agentToolsSettings={agentToolsSettings}
          onAgentToolsSettingsChange={setAgentToolsSettings}
        />
      )}

      <ReplitMobileNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isRunning={isRunning}
        onPlayStop={handlePlayStop}
        isPanelOpen={showToolsSheet}
        onPanelToggle={handlePanelToggle}
      />

      <ReplitToolsSheet
        open={showToolsSheet}
        onOpenChange={setShowToolsSheet}
        onToolSelect={handleToolSelect}
      />

      <MobileMoreMenu
        projectId={projectId || 0}
        isOpen={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        onOpenHistory={() => {
          setShowMoreMenu(false);
          setShowHistorySheet(true);
        }}
        onOpenSettings={() => {
          setShowMoreMenu(false);
          navigate('/settings');
        }}
        onOpenDeploy={() => {
          setShowMoreMenu(false);
          if (projectId) navigate(`/ide/${projectId}/deploy`);
        }}
      />

      <Sheet open={showHistorySheet} onOpenChange={setShowHistorySheet}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-sm">
              <History className="h-4 w-4" />
              Session History
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-xs font-medium">No history available yet</p>
              <p className="text-[10px] mt-1 opacity-75">Your session checkpoints will appear here</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
});
