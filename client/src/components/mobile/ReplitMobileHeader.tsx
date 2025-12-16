import { motion } from 'framer-motion';
import { 
  ArrowLeft, History, Plus, MoreVertical, Monitor, Globe, CheckSquare, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MobileTab } from './ReplitMobileNavigation';

const ReplitAgentIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="7" cy="7" r="2.5" />
    <circle cx="17" cy="7" r="2.5" />
    <circle cx="7" cy="17" r="2.5" />
    <circle cx="17" cy="17" r="2.5" />
  </svg>
);

interface ReplitMobileHeaderProps {
  activeTab: MobileTab;
  onBack?: () => void;
  onHistory?: () => void;
  onNewTab?: () => void;
  onMore?: () => void;
  onClose?: () => void;
  showClose?: boolean;
  title?: string;
}

const tabConfig: Record<MobileTab, { icon: any; label: string; iconColor?: string }> = {
  preview: { icon: Monitor, label: 'Preview' },
  agent: { icon: ReplitAgentIcon, label: 'Agent', iconColor: '#7C65C1' },
  deploy: { icon: Globe, label: 'Deploy' },
  tasks: { icon: CheckSquare, label: 'Tasks' },
};

export function ReplitMobileHeader({
  activeTab,
  onBack,
  onHistory,
  onNewTab,
  onMore,
  onClose,
  showClose = false,
  title,
}: ReplitMobileHeaderProps) {
  const config = tabConfig[activeTab];
  const Icon = config.icon;
  const displayTitle = title || config.label;

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-[#1C1C1C] border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-12 px-3">
        <div className="flex items-center gap-2">
          {showClose ? (
            <motion.button
              onClick={onClose}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A]"
              whileTap={{ scale: 0.92 }}
              data-testid="button-close"
            >
              <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </motion.button>
          ) : (
            <>
              <motion.button
                onClick={onBack}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A]"
                whileTap={{ scale: 0.92 }}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </motion.button>

              <motion.button
                onClick={onHistory}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A]"
                whileTap={{ scale: 0.92 }}
                data-testid="button-history"
              >
                <History className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </motion.button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'agent' ? (
            <ReplitAgentIcon className="h-5 w-5 text-[#7C65C1]" />
          ) : (
            <Icon 
              className="h-5 w-5" 
              style={{ color: config.iconColor || '#6B7280' }} 
            />
          )}
          <span className="font-medium text-gray-900 dark:text-white text-sm">
            {displayTitle}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <motion.button
            onClick={onNewTab}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A]"
            whileTap={{ scale: 0.92 }}
            data-testid="button-new-tab"
          >
            <Plus className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </motion.button>

          <motion.button
            onClick={onMore}
            className="p-2 -mr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2A2A]"
            whileTap={{ scale: 0.92 }}
            data-testid="button-more"
          >
            <MoreVertical className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
