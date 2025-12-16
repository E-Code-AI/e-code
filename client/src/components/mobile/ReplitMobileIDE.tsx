import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Loader2 } from 'lucide-react';
import { ReplitMobileHeader } from './ReplitMobileHeader';
import { ReplitMobileNavigation, type MobileTab } from './ReplitMobileNavigation';
import { ReplitMobileInputBar } from './ReplitMobileInputBar';
import { ReplitToolsSheet } from './ReplitToolsSheet';
import { useLocation } from 'wouter';

const ReplitAgentIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="7" cy="7" r="2.5" />
    <circle cx="17" cy="7" r="2.5" />
    <circle cx="7" cy="17" r="2.5" />
    <circle cx="17" cy="17" r="2.5" />
  </svg>
);

interface ReplitMobileIDEProps {
  projectId?: number;
  children?: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  showInputBar?: boolean;
  onSendMessage?: (message: string) => void;
  isAgentBusy?: boolean;
}

export function ReplitMobileIDE({
  projectId,
  children,
  isLoading = false,
  loadingText = "The workspace is loading...",
  showInputBar = true,
  onSendMessage,
  isAgentBusy = false,
}: ReplitMobileIDEProps) {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<MobileTab>('agent');
  const [isRunning, setIsRunning] = useState(false);
  const [showToolsSheet, setShowToolsSheet] = useState(false);
  const [buildMode, setBuildMode] = useState<'build' | 'edit' | 'chat'>('build');

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
  }, []);

  const handleNewTab = useCallback(() => {
    setShowToolsSheet(true);
  }, []);

  const handleMore = useCallback(() => {
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
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          {activeTab === 'agent' ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <ReplitAgentIcon className="h-12 w-12 text-[#7C65C1] mb-4" />
              </motion.div>
              <Loader2 className="h-6 w-6 text-gray-400 animate-spin mb-3" />
            </>
          ) : (
            <>
              <Monitor className="h-12 w-12 text-gray-400 mb-4" />
              <Loader2 className="h-6 w-6 text-gray-400 animate-spin mb-3" />
            </>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            {loadingText}
          </p>
        </div>
      );
    }

    if (children) {
      return children;
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {activeTab === 'agent' ? (
          <ReplitAgentIcon className="h-12 w-12 text-[#7C65C1] mb-4" />
        ) : (
          <Monitor className="h-12 w-12 text-gray-400 mb-4" />
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {activeTab === 'agent' 
            ? "Start building by sending a message to the agent"
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
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col overflow-auto"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {showInputBar && activeTab === 'agent' && (
        <ReplitMobileInputBar
          placeholder="Make, test, iterate..."
          onSubmit={handleSubmitMessage}
          buildMode={buildMode}
          onBuildModeChange={setBuildMode}
          disabled={isLoading}
          isLoading={isAgentBusy}
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
    </div>
  );
}
