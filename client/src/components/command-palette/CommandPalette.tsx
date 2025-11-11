import { useEffect, useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Fuse from 'fuse.js';
import {
  FileCode2,
  Search,
  Settings,
  GitBranch,
  Terminal,
  Database,
  Package,
  History,
  Lock,
  Bug,
  TestTube,
  Rocket,
  Folder,
  File,
  ChevronRight,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category: 'tool' | 'file' | 'action' | 'navigation';
  icon?: React.ReactNode;
  keywords?: string[];
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: CommandItem[];
  files?: Array<{ id: number; path: string; name: string }>;
  onFileSelect?: (fileId: number) => void;
  onToolSelect?: (toolName: string) => void;
}

const getCategoryIcon = (category: CommandItem['category']) => {
  switch (category) {
    case 'tool':
      return <Settings className="h-4 w-4 text-[var(--ecode-accent)]" />;
    case 'file':
      return <File className="h-4 w-4 text-[var(--ecode-text-secondary)]" />;
    case 'action':
      return <Rocket className="h-4 w-4 text-[var(--ecode-accent)]" />;
    case 'navigation':
      return <ChevronRight className="h-4 w-4 text-[var(--ecode-text-secondary)]" />;
  }
};

export function CommandPalette({
  open,
  onOpenChange,
  commands,
  files = [],
  onFileSelect,
  onToolSelect,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Combine commands with file commands
  const allCommands = useMemo(() => {
    const fileCommands: CommandItem[] = files.map((file) => ({
      id: `file-${file.id}`,
      label: file.name,
      description: file.path,
      category: 'file' as const,
      icon: <File className="h-4 w-4 text-[var(--ecode-text-secondary)]" />,
      keywords: [file.name, file.path, 'open', 'edit'],
      action: () => {
        onFileSelect?.(file.id);
        onOpenChange(false);
      },
    }));

    return [...commands, ...fileCommands];
  }, [commands, files, onFileSelect, onOpenChange]);

  // Fuzzy search configuration
  const fuse = useMemo(
    () =>
      new Fuse(allCommands, {
        keys: [
          { name: 'label', weight: 0.4 },
          { name: 'description', weight: 0.3 },
          { name: 'keywords', weight: 0.3 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 1,
      }),
    [allCommands]
  );

  // Filtered results
  const results = useMemo(() => {
    if (!search.trim()) {
      return allCommands.slice(0, 20); // Show first 20 when no search
    }
    return fuse.search(search).map((result) => result.item);
  }, [search, fuse, allCommands]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        results[selectedIndex].action();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    },
    [results, selectedIndex, onOpenChange]
  );

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = document.querySelector(
      `[data-command-index="${selectedIndex}"]`
    );
    selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 bg-[var(--ecode-surface)] border-[var(--ecode-border)] overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-[var(--ecode-border)] px-3">
          <Search className="h-4 w-4 text-[var(--ecode-text-secondary)] mr-2 flex-shrink-0" />
          <Input
            data-testid="input-command-palette-search"
            placeholder="Type a command or search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 font-[family-name:var(--ecode-font-sans)] text-[var(--ecode-text)]"
            autoFocus
          />
          <kbd className="ml-auto px-2 py-1 text-xs text-[var(--ecode-text-secondary)] bg-[var(--ecode-surface-hover)] rounded font-[family-name:var(--ecode-font-mono)]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[400px]">
          <div className="py-2">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--ecode-text-muted)] font-[family-name:var(--ecode-font-sans)]">
                No results found
              </div>
            ) : (
              results.map((item, index) => (
                <button
                  key={item.id}
                  data-testid={`button-command-${item.id}`}
                  data-command-index={index}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-[var(--ecode-surface-hover)]'
                      : 'hover:bg-[var(--ecode-surface-hover)]'
                  }`}
                >
                  {item.icon || getCategoryIcon(item.category)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--ecode-text)] font-[family-name:var(--ecode-font-sans)] truncate">
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-xs text-[var(--ecode-text-secondary)] font-[family-name:var(--ecode-font-mono)] truncate">
                        {item.description}
                      </div>
                    )}
                  </div>
                  {index === selectedIndex && (
                    <kbd className="px-2 py-1 text-xs text-[var(--ecode-text-secondary)] bg-[var(--ecode-surface)] rounded font-[family-name:var(--ecode-font-mono)]">
                      ↵
                    </kbd>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-[var(--ecode-border)] px-3 py-2 flex items-center gap-4 text-xs text-[var(--ecode-text-secondary)] font-[family-name:var(--ecode-font-sans)]">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[var(--ecode-surface-hover)] rounded font-[family-name:var(--ecode-font-mono)]">
              ↑
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-[var(--ecode-surface-hover)] rounded font-[family-name:var(--ecode-font-mono)]">
              ↓
            </kbd>
            <span className="ml-1">navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[var(--ecode-surface-hover)] rounded font-[family-name:var(--ecode-font-mono)]">
              ↵
            </kbd>
            <span className="ml-1">select</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[var(--ecode-surface-hover)] rounded font-[family-name:var(--ecode-font-mono)]">
              ESC
            </kbd>
            <span className="ml-1">close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Default command set generator
export function generateDefaultCommands(callbacks: {
  onToolSelect?: (tool: string) => void;
  onNavigate?: (path: string) => void;
}): CommandItem[] {
  const toolIcon = (Icon: React.ElementType) => (
    <Icon className="h-4 w-4 text-[var(--ecode-accent)]" />
  );

  return [
    // Tools
    {
      id: 'tool-files',
      label: 'Files',
      description: 'Browse project files',
      category: 'tool',
      icon: toolIcon(Folder),
      keywords: ['files', 'explorer', 'tree', 'browse'],
      action: () => callbacks.onToolSelect?.('files'),
    },
    {
      id: 'tool-search',
      label: 'Search',
      description: 'Search in files',
      category: 'tool',
      icon: toolIcon(Search),
      keywords: ['search', 'find', 'grep'],
      action: () => callbacks.onToolSelect?.('search'),
    },
    {
      id: 'tool-git',
      label: 'Git',
      description: 'Source control',
      category: 'tool',
      icon: toolIcon(GitBranch),
      keywords: ['git', 'version', 'control', 'commit'],
      action: () => callbacks.onToolSelect?.('git'),
    },
    {
      id: 'tool-terminal',
      label: 'Terminal',
      description: 'Open terminal',
      category: 'tool',
      icon: toolIcon(Terminal),
      keywords: ['terminal', 'console', 'shell', 'bash'],
      action: () => callbacks.onToolSelect?.('terminal'),
    },
    {
      id: 'tool-debugger',
      label: 'Debugger',
      description: 'Debug your code',
      category: 'tool',
      icon: toolIcon(Bug),
      keywords: ['debug', 'breakpoint', 'inspect'],
      action: () => callbacks.onToolSelect?.('debugger'),
    },
    {
      id: 'tool-testing',
      label: 'Testing',
      description: 'Run tests',
      category: 'tool',
      icon: toolIcon(TestTube),
      keywords: ['test', 'testing', 'spec', 'jest'],
      action: () => callbacks.onToolSelect?.('testing'),
    },
    {
      id: 'tool-database',
      label: 'Database',
      description: 'Database management',
      category: 'tool',
      icon: toolIcon(Database),
      keywords: ['database', 'db', 'sql', 'postgres'],
      action: () => callbacks.onToolSelect?.('database'),
    },
    {
      id: 'tool-packages',
      label: 'Packages',
      description: 'Manage dependencies',
      category: 'tool',
      icon: toolIcon(Package),
      keywords: ['packages', 'npm', 'dependencies', 'install'],
      action: () => callbacks.onToolSelect?.('packages'),
    },
    {
      id: 'tool-agent',
      label: 'AI Agent',
      description: 'AI assistant',
      category: 'tool',
      icon: toolIcon(Rocket),
      keywords: ['ai', 'agent', 'assistant', 'gpt'],
      action: () => callbacks.onToolSelect?.('agent'),
    },
    {
      id: 'tool-settings',
      label: 'Settings',
      description: 'Project settings',
      category: 'tool',
      icon: toolIcon(Settings),
      keywords: ['settings', 'config', 'preferences'],
      action: () => callbacks.onToolSelect?.('settings'),
    },

    // Actions
    {
      id: 'action-run',
      label: 'Run Project',
      description: 'Start the development server',
      category: 'action',
      icon: <Rocket className="h-4 w-4 text-green-500" />,
      keywords: ['run', 'start', 'dev', 'serve'],
      action: () => {
        // TODO: Implement run action
      },
    },
    {
      id: 'action-deploy',
      label: 'Deploy',
      description: 'Deploy to production',
      category: 'action',
      icon: <Rocket className="h-4 w-4 text-blue-500" />,
      keywords: ['deploy', 'publish', 'production'],
      action: () => {
        // TODO: Implement deploy action
      },
    },
  ];
}
