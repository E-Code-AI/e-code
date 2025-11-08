import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, PanInfo } from 'framer-motion';
import { FileText, Code, Terminal, Monitor, MoreHorizontal, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileFileExplorer } from './MobileFileExplorer';
import { LazyMobileCodeEditor } from './LazyMobileCodeEditor';
import { MobileTerminal } from './MobileTerminal';
import { MobilePreviewPanel } from './MobilePreviewPanel';
import { MobileMoreMenu } from './MobileMoreMenu';
import { ReplitBottomTabs } from './ReplitBottomTabs';
import { MobileFAB } from './MobileFAB';
import { useTabPersistence, useFileBrowserPersistence } from '@/hooks/use-mobile-persistence';
import { ReplitAgentPanelV3 } from '../ai/ReplitAgentPanelV3';

export type MobileTab = 'agent' | 'files' | 'code' | 'terminal' | 'preview' | 'more';

interface MobileIDEViewProps {
  projectId: string | number; // Support both UUID strings and numeric IDs
  className?: string;
}

const tabs: { id: MobileTab; label: string; icon: typeof FileText }[] = [
  { id: 'agent', label: 'Agent', icon: Sparkles },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'code', label: 'Code', icon: Code },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'preview', label: 'Preview', icon: Monitor },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

export function MobileIDEView({ projectId, className }: MobileIDEViewProps) {
  // Persistent tab state
  const [activeTab, setActiveTab] = useTabPersistence(projectId);
  
  // Persistent file browser state
  const { selectedFileId, setSelectedFileId } = useFileBrowserPersistence(projectId);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  
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
          if (prevTab.id === 'files') setIsFilesOpen(true);
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
          if (nextTab.id === 'files') setIsFilesOpen(true);
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
    } else if (tabId === 'files') {
      setIsFilesOpen(true);
    } else {
      // Only set active tab for content tabs (agent, code, terminal, preview)
      setActiveTab(tabId);
    }
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
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
                <MobileTerminal projectId={projectId} />
              )}
              
              {activeTab === 'preview' && (
                <MobilePreviewPanel projectId={projectId} />
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
      <MobileFAB projectId={projectId} />

      {/* File Explorer Modal */}
      <MobileFileExplorer
        isOpen={isFilesOpen}
        onClose={() => setIsFilesOpen(false)}
        projectId={projectId}
        onFileSelect={(file) => {
          setSelectedFileId(file.id);
          setActiveTab('code' as string);
          setIsFilesOpen(false);
        }}
        currentFileId={selectedFileId}
      />

      {/* More Menu Modal */}
      <MobileMoreMenu
        projectId={projectId}
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
      />
    </div>
  );
}
