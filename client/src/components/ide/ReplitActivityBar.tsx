import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FileText,
  Search,
  GitBranch,
  Package,
  Bug,
  Settings,
  Terminal,
  Bot,
  Rocket,
  Key,
  Database,
  Play,
  LayoutGrid,
  Layers,
  History,
  Zap,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type ActivityItem = 
  | 'files'
  | 'search'
  | 'git'
  | 'packages'
  | 'debug'
  | 'terminal'
  | 'agent'
  | 'deploy'
  | 'secrets'
  | 'database'
  | 'preview'
  | 'workflows'
  | 'history'
  | 'extensions'
  | 'settings';

interface ActivityBarItem {
  id: ActivityItem;
  icon: typeof FileText;
  label: string;
  shortcut?: string;
  badge?: number | string;
  separator?: boolean;
}

interface ReplitActivityBarProps {
  activeItem: ActivityItem;
  onItemClick: (item: ActivityItem) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  badgeCounts?: Partial<Record<ActivityItem, number | string>>;
}

const defaultItems: ActivityBarItem[] = [
  { id: 'files', icon: FileText, label: 'Files', shortcut: '⌘⇧E' },
  { id: 'search', icon: Search, label: 'Search', shortcut: '⌘⇧F' },
  { id: 'git', icon: GitBranch, label: 'Git', shortcut: '⌘⇧G' },
  { id: 'packages', icon: Package, label: 'Packages' },
  { id: 'debug', icon: Bug, label: 'Debug', shortcut: '⌘⇧D', separator: true },
  { id: 'terminal', icon: Terminal, label: 'Terminal', shortcut: '⌘`' },
  { id: 'agent', icon: Bot, label: 'AI Agent', shortcut: '⌘⇧A' },
  { id: 'deploy', icon: Rocket, label: 'Deploy' },
  { id: 'secrets', icon: Key, label: 'Secrets' },
  { id: 'database', icon: Database, label: 'Database', separator: true },
  { id: 'preview', icon: Eye, label: 'Preview', shortcut: '⌘⇧P' },
  { id: 'workflows', icon: Zap, label: 'Workflows' },
  { id: 'history', icon: History, label: 'History' },
];

const bottomItems: ActivityBarItem[] = [
  { id: 'extensions', icon: LayoutGrid, label: 'Extensions' },
  { id: 'settings', icon: Settings, label: 'Settings', shortcut: '⌘,' },
];

export function ReplitActivityBar({
  activeItem,
  onItemClick,
  isCollapsed = false,
  onToggleCollapse,
  className,
  badgeCounts = {},
}: ReplitActivityBarProps) {
  const renderItem = (item: ActivityBarItem) => {
    const Icon = item.icon;
    const isActive = activeItem === item.id;
    const badge = badgeCounts[item.id];

    return (
      <div key={item.id}>
        {item.separator && (
          <div className="mx-2 my-2 border-t border-[var(--ecode-border)]" />
        )}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onItemClick(item.id)}
              data-testid={`activity-${item.id}`}
              className={cn(
                'relative w-10 h-10 p-0 rounded-lg transition-all duration-200',
                'hover:bg-[var(--ecode-sidebar-hover)]',
                'focus-visible:ring-2 focus-visible:ring-[var(--ecode-accent)] focus-visible:ring-offset-0',
                isActive && [
                  'bg-[var(--ecode-accent)]/10',
                  'text-[var(--ecode-accent)]',
                  'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
                  'before:w-[3px] before:h-6 before:rounded-r-full',
                  'before:bg-[var(--ecode-accent)]',
                ],
                !isActive && 'text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)]'
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {badge !== undefined && (
                <span className={cn(
                  'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1',
                  'flex items-center justify-center',
                  'text-[10px] font-semibold rounded-full',
                  'bg-[var(--ecode-accent)] text-white',
                  'shadow-sm'
                )}>
                  {typeof badge === 'number' && badge > 99 ? '99+' : badge}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="flex items-center gap-2">
            <span>{item.label}</span>
            {item.shortcut && (
              <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">
                {item.shortcut}
              </kbd>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex flex-col h-full w-12 py-2',
          'bg-[var(--ecode-sidebar-bg)] border-r border-[var(--ecode-border)]',
          'transition-all duration-200',
          className
        )}
        data-testid="activity-bar"
      >
        <div className="flex flex-col items-center gap-1 flex-1">
          {defaultItems.map(renderItem)}
        </div>
        
        <div className="flex flex-col items-center gap-1 mt-auto pt-2 border-t border-[var(--ecode-border)]">
          {bottomItems.map(renderItem)}
          
          {onToggleCollapse && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapse}
                  data-testid="activity-collapse-toggle"
                  className={cn(
                    'w-10 h-10 p-0 rounded-lg mt-1',
                    'text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)]',
                    'hover:bg-[var(--ecode-sidebar-hover)]'
                  )}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
