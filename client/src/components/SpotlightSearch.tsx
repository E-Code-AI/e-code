import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  FileCode, 
  FolderOpen, 
  User, 
  Settings, 
  Command as CommandIcon,
  Hash,
  AtSign,
  Code,
  FileText,
  GitBranch,
  Package,
  Zap,
  History,
  Star
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'file' | 'project' | 'command' | 'user' | 'setting';
  title: string;
  description?: string;
  path?: string;
  icon?: React.ReactNode;
  action?: () => void;
  category?: string;
  metadata?: Record<string, any>;
}

export function SpotlightSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Search query
  const { data: searchResults = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ['/api/search/spotlight', query],
    queryFn: () => apiRequest(`/api/search/spotlight?q=${encodeURIComponent(query)}`),
    enabled: query.length > 0
  });

  // Recent searches
  const { data: recentSearches = [] } = useQuery<string[]>({
    queryKey: ['/api/search/recent'],
    queryFn: () => apiRequest('/api/search/recent')
  });

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Command palette commands
  const commands: SearchResult[] = [
    {
      id: 'new-project',
      type: 'command',
      title: 'Create New Project',
      description: 'Start a new project from scratch',
      icon: <FolderOpen className="h-4 w-4" />,
      action: () => {
        setLocation('/projects?new=true');
        setOpen(false);
      }
    },
    {
      id: 'run-project',
      type: 'command',
      title: 'Run Current Project',
      description: 'Execute the current project',
      icon: <Zap className="h-4 w-4" />,
      action: () => {
        // Trigger run action
        document.querySelector('[data-run-button]')?.click();
        setOpen(false);
      }
    },
    {
      id: 'open-terminal',
      type: 'command',
      title: 'Open Terminal',
      description: 'Open integrated terminal',
      icon: <CommandIcon className="h-4 w-4" />,
      action: () => {
        // Trigger terminal open
        document.querySelector('[data-terminal-toggle]')?.click();
        setOpen(false);
      }
    },
    {
      id: 'view-history',
      type: 'command',
      title: 'View Project History',
      description: 'See project timeline and checkpoints',
      icon: <History className="h-4 w-4" />,
      action: () => {
        // Open history panel
        document.querySelector('[data-history-toggle]')?.click();
        setOpen(false);
      }
    },
    {
      id: 'manage-packages',
      type: 'command',
      title: 'Manage Packages',
      description: 'Add or remove dependencies',
      icon: <Package className="h-4 w-4" />,
      action: () => {
        // Open package manager
        document.querySelector('[data-packages-toggle]')?.click();
        setOpen(false);
      }
    }
  ];

  // Filter commands based on query
  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(query.toLowerCase())
  );

  // Group results by type
  const groupedResults = searchResults.reduce((acc, result) => {
    const category = result.category || result.type;
    if (!acc[category]) acc[category] = [];
    acc[category].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const handleSelect = (result: SearchResult) => {
    if (result.action) {
      result.action();
    } else if (result.type === 'file' && result.path) {
      // Navigate to file
      setLocation(result.path);
    } else if (result.type === 'project' && result.metadata?.projectId) {
      // Navigate to project
      setLocation(`/project/${result.metadata.projectId}`);
    } else if (result.type === 'user' && result.metadata?.username) {
      // Navigate to user profile
      setLocation(`/user/${result.metadata.username}`);
    }
    
    // Save to recent searches
    if (query) {
      apiRequest('/api/search/recent', {
        method: 'POST',
        body: JSON.stringify({ query })
      });
    }
    
    setOpen(false);
    setQuery('');
  };

  const getIcon = (result: SearchResult) => {
    if (result.icon) return result.icon;
    
    switch (result.type) {
      case 'file':
        return <FileCode className="h-4 w-4" />;
      case 'project':
        return <FolderOpen className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      case 'setting':
        return <Settings className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getSearchHint = () => {
    if (query.startsWith('@')) return 'Search users...';
    if (query.startsWith('#')) return 'Search projects...';
    if (query.startsWith('/')) return 'Search files...';
    if (query.startsWith('>')) return 'Run command...';
    return 'Search everything...';
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 md:w-48 md:justify-start md:px-3 md:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline-block text-muted-foreground">
          Search...
        </span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          ref={inputRef}
          placeholder={getSearchHint()}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.length === 0 && (
            <>
              {/* Quick actions */}
              <CommandGroup heading="Quick Actions">
                {commands.slice(0, 5).map(cmd => (
                  <CommandItem
                    key={cmd.id}
                    value={cmd.title}
                    onSelect={() => handleSelect(cmd)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {cmd.icon}
                      <div className="flex-1">
                        <p className="font-medium">{cmd.title}</p>
                        {cmd.description && (
                          <p className="text-xs text-muted-foreground">
                            {cmd.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>

              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Recent Searches">
                    {recentSearches.map((search, index) => (
                      <CommandItem
                        key={index}
                        value={search}
                        onSelect={() => setQuery(search)}
                      >
                        <History className="h-4 w-4 mr-3" />
                        {search}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Search hints */}
              <CommandSeparator />
              <CommandGroup heading="Search Tips">
                <CommandItem disabled>
                  <AtSign className="h-4 w-4 mr-3" />
                  <span className="text-sm">@ to search users</span>
                </CommandItem>
                <CommandItem disabled>
                  <Hash className="h-4 w-4 mr-3" />
                  <span className="text-sm"># to search projects</span>
                </CommandItem>
                <CommandItem disabled>
                  <FileText className="h-4 w-4 mr-3" />
                  <span className="text-sm">/ to search files</span>
                </CommandItem>
                <CommandItem disabled>
                  <CommandIcon className="h-4 w-4 mr-3" />
                  <span className="text-sm">&gt; to run commands</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}

          {query.length > 0 && (
            <>
              {/* Commands */}
              {query.startsWith('>') && filteredCommands.length > 0 && (
                <CommandGroup heading="Commands">
                  {filteredCommands.map(cmd => (
                    <CommandItem
                      key={cmd.id}
                      value={cmd.title}
                      onSelect={() => handleSelect(cmd)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {cmd.icon}
                        <div className="flex-1">
                          <p className="font-medium">{cmd.title}</p>
                          {cmd.description && (
                            <p className="text-xs text-muted-foreground">
                              {cmd.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Search results */}
              {!query.startsWith('>') && Object.entries(groupedResults).map(([category, results]) => (
                <CommandGroup key={category} heading={category.charAt(0).toUpperCase() + category.slice(1)}>
                  {results.map(result => (
                    <CommandItem
                      key={result.id}
                      value={result.title}
                      onSelect={() => handleSelect(result)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getIcon(result)}
                        <div className="flex-1">
                          <p className="font-medium">{result.title}</p>
                          {result.description && (
                            <p className="text-xs text-muted-foreground">
                              {result.description}
                            </p>
                          )}
                        </div>
                        {result.metadata?.language && (
                          <Badge variant="secondary" className="text-xs">
                            {result.metadata.language}
                          </Badge>
                        )}
                        {result.metadata?.starred && (
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}

              {isLoading && (
                <CommandEmpty>Searching...</CommandEmpty>
              )}

              {!isLoading && searchResults.length === 0 && filteredCommands.length === 0 && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}