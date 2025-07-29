import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  FileText,
  Search,
  Plus,
  Home,
  Folder,
  Settings,
  Terminal,
  Code,
  Database,
  Users,
  Bot,
  Globe,
  Package,
  Key,
  BarChart3,
  BookOpen,
  HelpCircle,
  LogOut,
  User,
  Zap,
  History,
  Play,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function SpotlightSearch() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch recent projects
  const { data: recentProjects } = useQuery({
    queryKey: ['/api/projects/recent'],
    enabled: !!user && open,
  });

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

  const handleSelect = useCallback((callback: () => void) => {
    setOpen(false);
    callback();
  }, []);

  const navigationItems = [
    {
      group: 'Navigation',
      items: [
        {
          icon: <Home className="h-4 w-4" />,
          label: 'Dashboard',
          shortcut: '⌘H',
          onSelect: () => navigate('/dashboard'),
        },
        {
          icon: <Folder className="h-4 w-4" />,
          label: 'Projects',
          shortcut: '⌘P',
          onSelect: () => navigate('/projects'),
        },
        {
          icon: <Bot className="h-4 w-4" />,
          label: 'AI Agent',
          shortcut: '⌘A',
          onSelect: () => navigate('/projects?new=true&agent=true'),
        },
        {
          icon: <Terminal className="h-4 w-4" />,
          label: 'Shell',
          shortcut: '⌘T',
          onSelect: () => navigate('/shell'),
        },
      ],
    },
    {
      group: 'Create',
      items: [
        {
          icon: <Plus className="h-4 w-4" />,
          label: 'New Project',
          shortcut: '⌘N',
          onSelect: () => navigate('/projects?new=true'),
        },
        {
          icon: <Upload className="h-4 w-4" />,
          label: 'Import from GitHub',
          onSelect: () => navigate('/github-import'),
        },
        {
          icon: <Code className="h-4 w-4" />,
          label: 'Browse Templates',
          onSelect: () => navigate('/templates'),
        },
      ],
    },
    {
      group: 'Tools',
      items: [
        {
          icon: <Database className="h-4 w-4" />,
          label: 'Database',
          onSelect: () => navigate('/database'),
        },
        {
          icon: <Key className="h-4 w-4" />,
          label: 'Secrets',
          onSelect: () => navigate('/secrets'),
        },
        {
          icon: <Package className="h-4 w-4" />,
          label: 'Packages',
          onSelect: () => navigate('/packages'),
        },
        {
          icon: <Globe className="h-4 w-4" />,
          label: 'Deployments',
          onSelect: () => navigate('/deployments'),
        },
        {
          icon: <Zap className="h-4 w-4" />,
          label: 'Workflows',
          onSelect: () => navigate('/workflows'),
        },
      ],
    },
    {
      group: 'Account',
      items: [
        {
          icon: <User className="h-4 w-4" />,
          label: 'Profile',
          onSelect: () => navigate('/account'),
        },
        {
          icon: <Settings className="h-4 w-4" />,
          label: 'Settings',
          onSelect: () => navigate('/settings'),
        },
        {
          icon: <BarChart3 className="h-4 w-4" />,
          label: 'Usage',
          onSelect: () => navigate('/usage'),
        },
        {
          icon: <History className="h-4 w-4" />,
          label: 'History',
          onSelect: () => navigate('/history'),
        },
      ],
    },
    {
      group: 'Help',
      items: [
        {
          icon: <BookOpen className="h-4 w-4" />,
          label: 'Documentation',
          onSelect: () => navigate('/docs'),
        },
        {
          icon: <HelpCircle className="h-4 w-4" />,
          label: 'Support',
          onSelect: () => navigate('/support'),
        },
        {
          icon: <Users className="h-4 w-4" />,
          label: 'Community',
          onSelect: () => navigate('/community'),
        },
      ],
    },
  ];

  if (user) {
    navigationItems.push({
      group: 'Session',
      items: [
        {
          icon: <LogOut className="h-4 w-4" />,
          label: 'Sign out',
          onSelect: () => {
            logout();
            navigate('/');
          },
        },
      ],
    });
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search for projects, files, or actions..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {/* Recent Projects */}
        {recentProjects && recentProjects.length > 0 && searchQuery.length === 0 && (
          <>
            <CommandGroup heading="Recent Projects">
              {recentProjects.slice(0, 5).map((project: any) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => handleSelect(() => navigate(`/project/${project.id}`))}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  <span>{project.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {project.language}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Quick Actions */}
        {searchQuery.length === 0 && (
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => handleSelect(() => navigate('/projects?new=true'))}>
              <Plus className="h-4 w-4 mr-2" />
              <span>Create new project</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘N</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect(() => navigate('/projects?new=true&agent=true'))}>
              <Bot className="h-4 w-4 mr-2" />
              <span>Open AI Agent</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘A</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect(() => navigate('/shell'))}>
              <Terminal className="h-4 w-4 mr-2" />
              <span>Open Shell</span>
              <span className="ml-auto text-xs text-muted-foreground">⌘T</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect(() => navigate('/templates'))}>
              <Code className="h-4 w-4 mr-2" />
              <span>Browse templates</span>
            </CommandItem>
          </CommandGroup>
        )}

        {/* Navigation Groups */}
        {navigationItems.map((group) => (
          <CommandGroup key={group.group} heading={group.group}>
            {group.items
              .filter(item => 
                searchQuery.length === 0 || 
                item.label.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((item) => (
                <CommandItem
                  key={item.label}
                  onSelect={() => handleSelect(item.onSelect)}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                  {item.shortcut && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {item.shortcut}
                    </span>
                  )}
                </CommandItem>
              ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}