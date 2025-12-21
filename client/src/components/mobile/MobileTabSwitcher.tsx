import { memo, useCallback, useState } from 'react';
import { 
  X, 
  Search, 
  Plus,
  Lock,
  Database,
  Users,
  FileCode,
  Bot,
  Rocket,
  Terminal,
  GitBranch,
  Package,
  Shield,
  Code,
  FolderTree,
  HardDrive,
  Settings,
  Monitor,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface OpenTab {
  id: string;
  name: string;
  icon: string;
}

const iconMap: Record<string, React.ElementType> = {
  search: Search,
  files: FolderTree,
  agent: Bot,
  assistant: Code,
  publishing: Rocket,
  'app-storage': HardDrive,
  auth: Shield,
  console: Terminal,
  database: Database,
  developer: Code,
  git: GitBranch,
  integrations: Package,
  multiplayer: Users,
  preview: Monitor,
  secrets: Lock,
  deploy: Radio,
  settings: Settings,
};

const ReplitAgentIcon = memo(({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="7" cy="7" r="3" />
    <circle cx="17" cy="7" r="3" />
    <circle cx="7" cy="17" r="3" />
    <circle cx="17" cy="17" r="3" />
  </svg>
));
ReplitAgentIcon.displayName = 'ReplitAgentIcon';

const quickAccessTools = [
  { id: 'secrets', name: 'Secrets', icon: Lock },
  { id: 'database', name: 'Database', icon: Database },
  { id: 'auth', name: 'Auth', icon: Users },
];

interface MobileTabSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  openTabs: OpenTab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  onQuickAccess: (toolId: string) => void;
}

export const MobileTabSwitcher = memo(function MobileTabSwitcher({
  isOpen,
  onClose,
  openTabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  onQuickAccess,
}: MobileTabSwitcherProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabSelect = useCallback((tabId: string) => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    onTabSelect(tabId);
    onClose();
  }, [onTabSelect, onClose]);

  const handleTabClose = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    if ('vibrate' in navigator) navigator.vibrate(10);
    onTabClose(tabId);
  }, [onTabClose]);

  const handleNewTab = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    onNewTab();
    onClose();
  }, [onNewTab, onClose]);

  const handleQuickAccess = useCallback((toolId: string) => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    onQuickAccess(toolId);
    onClose();
  }, [onQuickAccess, onClose]);

  const getIcon = useCallback((iconName: string) => {
    if (iconName === 'agent') {
      return <ReplitAgentIcon className="h-5 w-5" />;
    }
    const Icon = iconMap[iconName] || FileCode;
    return <Icon className="h-5 w-5" />;
  }, []);

  const filteredTabs = searchQuery
    ? openTabs.filter(tab => 
        tab.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : openTabs;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl"
      data-testid="mobile-tab-switcher"
    >
      <div className="flex flex-col h-full">
        {/* Main content area with tabs */}
        <div className="flex-1 overflow-auto p-4">
          {openTabs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileCode className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No tabs open</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Open a tool to get started
              </p>
              <button
                onClick={handleNewTab}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                data-testid="button-open-first-tab"
              >
                <Plus className="h-4 w-4" />
                Open Tool
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabSelect(tab.id)}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-4 rounded-xl border transition-all",
                    "active:scale-95 touch-manipulation min-h-[100px]",
                    activeTabId === tab.id
                      ? "bg-primary/10 border-primary"
                      : "bg-surface-secondary-solid border-border hover:border-primary/50"
                  )}
                  data-testid={`tab-card-${tab.id}`}
                >
                  <button
                    onClick={(e) => handleTabClose(e, tab.id)}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    data-testid={`button-close-tab-${tab.id}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg mb-2",
                    activeTabId === tab.id ? "text-primary" : "text-muted-foreground"
                  )}>
                    {getIcon(tab.icon)}
                  </div>
                  <span className={cn(
                    "text-sm font-medium capitalize",
                    activeTabId === tab.id ? "text-primary" : "text-foreground"
                  )}>
                    {tab.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom section with quick access and search */}
        <div className="border-t border-border bg-surface-solid p-4 pb-safe">
          {/* Quick access tools */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto">
            {quickAccessTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleQuickAccess(tool.id)}
                  className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-surface-secondary-solid border border-border hover:border-primary/50 transition-colors min-w-[70px]"
                  data-testid={`quick-access-${tool.id}`}
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{tool.name}</span>
                </button>
              );
            })}
            <button
              onClick={handleNewTab}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-surface-secondary-solid border border-border hover:border-primary/50 transition-colors min-w-[70px]"
              data-testid="button-new-tab"
            >
              <Plus className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">New Tab</span>
            </button>
          </div>

          {/* Search bar and close */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <FileCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-tabs"
              />
            </div>
            <button
              onClick={() => {
                if ('vibrate' in navigator) navigator.vibrate(10);
                setSearchQuery('');
              }}
              className="p-2 text-muted-foreground hover:text-foreground"
              data-testid="button-clear-search"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                if ('vibrate' in navigator) navigator.vibrate(10);
                onClose();
              }}
              className="p-2 text-muted-foreground hover:text-foreground"
              data-testid="button-close-switcher"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
