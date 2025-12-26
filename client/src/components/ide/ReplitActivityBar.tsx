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
  GitBranch,
  Package,
  Bug,
  Settings,
  Terminal,
  Bot,
  Rocket,
  Key,
  Database,
  LayoutGrid,
  Zap,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type ActivityItem = 
  | 'files'
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
      <div key={item.id} className="relative">
        {item.separator && (
          <div className="mx-2.5 my-1.5 border-t border-border" />
        )}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onItemClick(item.id)}
              data-testid={`activity-${item.id}`}
              className={cn(
                'relative w-9 h-9 p-0 rounded-md transition-all duration-150',
                'hover:bg-[var(--ecode-sidebar-hover)] active:scale-95',
                'focus-visible:ring-2 focus-visible:ring-[var(--ecode-accent)] focus-visible:ring-offset-0',
                isActive && [
                  'bg-surface-tertiary-solid',
                  'text-[var(--ecode-accent)]',
                  'shadow-sm',
                ],
                !isActive && 'text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)]'
              )}
            >
              {isActive && (
                <span 
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--ecode-accent)] shadow-[0_0_8px_var(--ecode-accent)]"
                  style={{ marginLeft: '-2px' }}
                />
              )}
              <Icon className={cn(
                "h-[18px] w-[18px] transition-transform duration-150",
                isActive && "scale-105"
              )} />
              {badge !== undefined && badge !== 0 && (
                <span className={cn(
                  'absolute -top-1 -right-1 min-w-[16px] h-4 px-1',
                  'flex items-center justify-center',
                  'text-[9px] font-bold rounded-full',
                  'bg-[var(--ecode-accent)] text-white',
                  'shadow-md animate-in fade-in zoom-in-50 duration-200',
                  'border border-[var(--ecode-sidebar-bg)]'
                )}>
                  {typeof badge === 'number' && badge > 99 ? '99+' : badge}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            sideOffset={12} 
            className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-800 text-white border-zinc-700 shadow-xl"
          >
            <span className="font-medium">{item.label}</span>
            {item.shortcut && (
              <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-zinc-700 dark:bg-zinc-600 rounded text-zinc-300">
                {item.shortcut}
              </kbd>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'flex flex-col h-full w-12 py-1.5',
          'bg-[var(--ecode-sidebar-bg)] border-r border-[var(--ecode-border)]',
          'transition-all duration-200',
          className
        )}
        data-testid="activity-bar"
      >
        <div className="flex flex-col items-center gap-0.5 flex-1 px-1.5">
          {defaultItems.map(renderItem)}
        </div>
        
        <div className="flex flex-col items-center gap-0.5 mt-auto pt-1.5 border-t border-[var(--ecode-border)] mx-1.5 px-0">
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
                    'w-9 h-9 p-0 rounded-md mt-0.5',
                    'text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)]',
                    'hover:bg-[var(--ecode-sidebar-hover)] active:scale-95',
                    'transition-all duration-150'
                  )}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent 
                side="right" 
                sideOffset={12}
                className="bg-zinc-900 dark:bg-zinc-800 text-white border-zinc-700"
              >
                {isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
