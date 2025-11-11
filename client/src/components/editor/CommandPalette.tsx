import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  FileCode,
  Search,
  Settings,
  GitBranch,
  Database,
  Package,
  Terminal,
  Sparkles,
  Rocket,
  Eye,
  Code,
  FolderOpen,
  Play,
  Share2,
  Users,
  Download,
  Upload,
  History,
  Bug,
  TestTube,
  Palette,
  Key,
  Lock,
} from 'lucide-react';
import { File } from '@shared/schema';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  keywords: string[];
  category: 'file' | 'tool' | 'action' | 'recent';
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files?: File[];
  onFileSelect?: (file: File) => void;
  onToolSelect?: (tool: string) => void;
  className?: string;
}

export function CommandPalette({
  open,
  onOpenChange,
  files = [],
  onFileSelect,
  onToolSelect,
  className,
}: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Build command list
  const buildCommands = useCallback((): CommandItem[] => {
    const commands: CommandItem[] = [];

    // File commands
    files.forEach(file => {
      if (!file.isFolder) {
        commands.push({
          id: `file-${file.id}`,
          title: file.name,
          subtitle: file.path || 'Root',
          icon: <FileCode className="h-4 w-4" />,
          keywords: [file.name, file.path || '', 'file', 'open'],
          category: 'file',
          action: () => {
            onFileSelect?.(file);
            onOpenChange(false);
            addToRecent(`file-${file.id}`);
          },
        });
      }
    });

    // Tool commands
    const tools: CommandItem[] = [
      {
        id: 'tool-files',
        title: 'Open Files Panel',
        subtitle: 'View and manage project files',
        icon: <FolderOpen className="h-4 w-4" />,
        keywords: ['files', 'explorer', 'tree', 'sidebar'],
        category: 'tool',
        action: () => {
          onToolSelect?.('files');
          onOpenChange(false);
          addToRecent('tool-files');
        },
      },
      {
        id: 'tool-search',
        title: 'Open Search Panel',
        subtitle: 'Search across all files',
        icon: <Search className="h-4 w-4" />,
        keywords: ['search', 'find', 'grep'],
        category: 'tool',
        shortcut: '⌘⇧F',
        action: () => {
          onToolSelect?.('search');
          onOpenChange(false);
          addToRecent('tool-search');
        },
      },
      {
        id: 'tool-agent',
        title: 'Open AI Agent',
        subtitle: 'Get AI assistance',
        icon: <Sparkles className="h-4 w-4" />,
        keywords: ['ai', 'agent', 'assistant', 'gpt'],
        category: 'tool',
        shortcut: '⌘I',
        action: () => {
          onToolSelect?.('agent');
          onOpenChange(false);
          addToRecent('tool-agent');
        },
      },
      {
        id: 'tool-git',
        title: 'Open Git Panel',
        subtitle: 'Version control',
        icon: <GitBranch className="h-4 w-4" />,
        keywords: ['git', 'version', 'commit', 'push', 'pull'],
        category: 'tool',
        action: () => {
          onToolSelect?.('git');
          onOpenChange(false);
          addToRecent('tool-git');
        },
      },
      {
        id: 'tool-database',
        title: 'Open Database Panel',
        subtitle: 'Browse database',
        icon: <Database className="h-4 w-4" />,
        keywords: ['database', 'db', 'sql', 'postgres'],
        category: 'tool',
        action: () => {
          onToolSelect?.('database');
          onOpenChange(false);
          addToRecent('tool-database');
        },
      },
      {
        id: 'tool-packages',
        title: 'Open Packages Panel',
        subtitle: 'Manage dependencies',
        icon: <Package className="h-4 w-4" />,
        keywords: ['packages', 'npm', 'dependencies', 'modules'],
        category: 'tool',
        action: () => {
          onToolSelect?.('packages');
          onOpenChange(false);
          addToRecent('tool-packages');
        },
      },
      {
        id: 'tool-terminal',
        title: 'Open Terminal',
        subtitle: 'Run shell commands',
        icon: <Terminal className="h-4 w-4" />,
        keywords: ['terminal', 'shell', 'console', 'bash'],
        category: 'tool',
        action: () => {
          onToolSelect?.('terminal');
          onOpenChange(false);
          addToRecent('tool-terminal');
        },
      },
      {
        id: 'tool-debugger',
        title: 'Open Debugger',
        subtitle: 'Debug your code',
        icon: <Bug className="h-4 w-4" />,
        keywords: ['debugger', 'debug', 'breakpoint'],
        category: 'tool',
        action: () => {
          onToolSelect?.('debugger');
          onOpenChange(false);
          addToRecent('tool-debugger');
        },
      },
      {
        id: 'tool-secrets',
        title: 'Open Secrets Panel',
        subtitle: 'Manage environment variables',
        icon: <Key className="h-4 w-4" />,
        keywords: ['secrets', 'env', 'environment', 'variables'],
        category: 'tool',
        action: () => {
          onToolSelect?.('secrets');
          onOpenChange(false);
          addToRecent('tool-secrets');
        },
      },
      {
        id: 'tool-themes',
        title: 'Open Themes Panel',
        subtitle: 'Customize appearance',
        icon: <Palette className="h-4 w-4" />,
        keywords: ['themes', 'appearance', 'colors', 'dark', 'light'],
        category: 'tool',
        action: () => {
          onToolSelect?.('themes');
          onOpenChange(false);
          addToRecent('tool-themes');
        },
      },
      {
        id: 'tool-settings',
        title: 'Open Settings',
        subtitle: 'Configure editor',
        icon: <Settings className="h-4 w-4" />,
        keywords: ['settings', 'preferences', 'config'],
        category: 'tool',
        action: () => {
          onToolSelect?.('settings');
          onOpenChange(false);
          addToRecent('tool-settings');
        },
      },
    ];

    commands.push(...tools);

    // Action commands
    const actions: CommandItem[] = [
      {
        id: 'action-run',
        title: 'Run Project',
        subtitle: 'Execute your code',
        icon: <Play className="h-4 w-4" />,
        keywords: ['run', 'execute', 'start', 'play'],
        category: 'action',
        shortcut: '⌘⏎',
        action: () => {
          // Trigger run button
          const runButton = document.querySelector('[data-testid="button-run-project"]') as HTMLButtonElement;
          runButton?.click();
          onOpenChange(false);
          addToRecent('action-run');
        },
      },
      {
        id: 'action-share',
        title: 'Share Project',
        subtitle: 'Invite collaborators',
        icon: <Share2 className="h-4 w-4" />,
        keywords: ['share', 'invite', 'collaborate'],
        category: 'action',
        action: () => {
          const shareButton = document.querySelector('[data-testid="button-share-project"]') as HTMLButtonElement;
          shareButton?.click();
          onOpenChange(false);
          addToRecent('action-share');
        },
      },
      {
        id: 'action-deploy',
        title: 'Deploy Project',
        subtitle: 'Publish to production',
        icon: <Rocket className="h-4 w-4" />,
        keywords: ['deploy', 'publish', 'production'],
        category: 'action',
        action: () => {
          const deployButton = document.querySelector('[data-testid="button-deploy-project"]') as HTMLButtonElement;
          deployButton?.click();
          onOpenChange(false);
          addToRecent('action-deploy');
        },
      },
    ];

    commands.push(...actions);

    return commands;
  }, [files, onFileSelect, onToolSelect, onOpenChange]);

  // Fuzzy search
  const fuzzyMatch = (query: string, text: string): number => {
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();
    
    // Exact match gets highest score
    if (lowerText === lowerQuery) return 1000;
    if (lowerText.startsWith(lowerQuery)) return 900;
    if (lowerText.includes(lowerQuery)) return 800;
    
    // Fuzzy matching (characters in order)
    let queryIndex = 0;
    let textIndex = 0;
    let score = 0;
    let consecutiveMatches = 0;
    
    while (queryIndex < lowerQuery.length && textIndex < lowerText.length) {
      if (lowerQuery[queryIndex] === lowerText[textIndex]) {
        score += 10 + consecutiveMatches * 5; // Bonus for consecutive matches
        consecutiveMatches++;
        queryIndex++;
      } else {
        consecutiveMatches = 0;
      }
      textIndex++;
    }
    
    return queryIndex === lowerQuery.length ? score : 0;
  };

  // Filter and rank commands
  const filteredCommands = useCallback(() => {
    const commands = buildCommands();
    
    if (!searchQuery.trim()) {
      // Show recent commands first
      const recent = commands.filter(cmd => recentCommands.includes(cmd.id));
      const others = commands.filter(cmd => !recentCommands.includes(cmd.id));
      return [...recent, ...others].slice(0, 50);
    }
    
    // Fuzzy search
    const scored = commands
      .map(cmd => {
        const titleScore = fuzzyMatch(searchQuery, cmd.title);
        const keywordScore = Math.max(...cmd.keywords.map(k => fuzzyMatch(searchQuery, k)));
        const subtitleScore = cmd.subtitle ? fuzzyMatch(searchQuery, cmd.subtitle) : 0;
        
        return {
          command: cmd,
          score: Math.max(titleScore, keywordScore, subtitleScore),
        };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.command);
    
    return scored.slice(0, 50);
  }, [buildCommands, searchQuery, recentCommands]);

  const commands = filteredCommands();

  // Add to recent commands
  const addToRecent = (commandId: string) => {
    setRecentCommands(prev => {
      const filtered = prev.filter(id => id !== commandId);
      return [commandId, ...filtered].slice(0, 10);
    });
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSelectedIndex(0);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, commands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = commands[selectedIndex];
        if (selected) {
          selected.action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, commands, selectedIndex]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (scrollAreaRef.current) {
      const selectedElement = scrollAreaRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Category badge colors
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'file':
        return 'bg-status-info/10 text-status-info border-status-info/20';
      case 'tool':
        return 'bg-primary/10 text-primary border-border/20';
      case 'action':
        return 'bg-status-success/10 text-status-success border-status-success/20';
      case 'recent':
        return 'bg-status-warning/10 text-status-warning border-status-warning/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-border/20';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-2xl p-0 gap-0", className)}>
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Command Palette</DialogTitle>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search files, tools, and actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0"
            autoComplete="off"
            data-testid="command-palette-input"
          />
        </DialogHeader>

        <ScrollArea ref={scrollAreaRef} className="max-h-[400px] overflow-y-auto">
          <div className="p-2">
            {commands.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No results found for "{searchQuery}"
              </div>
            ) : (
              <div className="space-y-1">
                {commands.map((command, index) => (
                  <button
                    key={command.id}
                    data-index={index}
                    onClick={() => command.action()}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                      selectedIndex === index
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                    data-testid={`command-item-${command.id}`}
                  >
                    <div className="flex-shrink-0 text-muted-foreground">
                      {command.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{command.title}</span>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0", getCategoryColor(command.category))}
                        >
                          {command.category}
                        </Badge>
                      </div>
                      {command.subtitle && (
                        <div className="text-xs text-muted-foreground truncate">
                          {command.subtitle}
                        </div>
                      )}
                    </div>
                    {command.shortcut && (
                      <kbd className="hidden sm:inline-block px-2 py-1 text-xs rounded bg-muted font-mono">
                        {command.shortcut}
                      </kbd>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground bg-muted/50">
          <div className="flex items-center justify-between">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-background font-mono">↑↓</kbd> Navigate
              <kbd className="ml-2 px-1.5 py-0.5 rounded bg-background font-mono">↵</kbd> Select
              <kbd className="ml-2 px-1.5 py-0.5 rounded bg-background font-mono">Esc</kbd> Close
            </span>
            <span className="text-muted-foreground/60">
              {commands.length} {commands.length === 1 ? 'result' : 'results'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
