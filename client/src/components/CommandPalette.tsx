import { useState, useEffect, useCallback } from 'react';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { 
  FileIcon, FolderIcon, Settings, User, LogOut, Home, Code, 
  Terminal, Package, GitBranch, Rocket, Search, Zap, Users,
  Book, MessageCircle, BarChart, Shield, Plus, Play, Save,
  Copy, Clipboard, Trash2, Upload, Download, Eye, EyeOff,
  Globe, Camera, FileText
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  group: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  // Fetch recent projects and files
  const { data: recentProjects } = useQuery({
    queryKey: ['/api/projects/recent'],
    enabled: !!user
  });

  // Keyboard shortcut to open command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleLogout = useCallback(() => {
    logoutMutation.mutate();
    setOpen(false);
  }, [logoutMutation]);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-home',
      label: 'Go to Home',
      icon: <Home className="h-4 w-4" />,
      shortcut: '⌘H',
      action: () => { navigate('/'); setOpen(false); },
      group: 'Navigation'
    },
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      icon: <BarChart className="h-4 w-4" />,
      shortcut: '⌘D',
      action: () => { navigate('/dashboard'); setOpen(false); },
      group: 'Navigation'
    },
    {
      id: 'nav-projects',
      label: 'Go to Projects',
      icon: <FolderIcon className="h-4 w-4" />,
      shortcut: '⌘P',
      action: () => { navigate('/projects'); setOpen(false); },
      group: 'Navigation'
    },
    {
      id: 'nav-templates',
      label: 'Browse Templates',
      icon: <Book className="h-4 w-4" />,
      action: () => { navigate('/templates'); setOpen(false); },
      group: 'Navigation'
    },
    {
      id: 'nav-community',
      label: 'Go to Community',
      icon: <Users className="h-4 w-4" />,
      action: () => { navigate('/community'); setOpen(false); },
      group: 'Navigation'
    },
    
    // Actions
    {
      id: 'action-new-project',
      label: 'Create New Project',
      icon: <Plus className="h-4 w-4" />,
      shortcut: '⌘N',
      action: () => { 
        window.dispatchEvent(new CustomEvent('create-project'));
        setOpen(false); 
      },
      group: 'Actions'
    },
    {
      id: 'action-run',
      label: 'Run Project',
      icon: <Play className="h-4 w-4" />,
      shortcut: '⌘⏎',
      action: () => {
        window.dispatchEvent(new CustomEvent('run-project'));
        setOpen(false);
      },
      group: 'Actions'
    },
    {
      id: 'action-save',
      label: 'Save File',
      icon: <Save className="h-4 w-4" />,
      shortcut: '⌘S',
      action: () => {
        window.dispatchEvent(new CustomEvent('save-file'));
        setOpen(false);
      },
      group: 'Actions'
    },
    {
      id: 'action-search',
      label: 'Global Search',
      icon: <Search className="h-4 w-4" />,
      shortcut: '⌘⇧F',
      action: () => {
        window.dispatchEvent(new CustomEvent('global-search'));
        setOpen(false);
      },
      group: 'Actions'
    },
    
    // Import Actions
    {
      id: 'import-web-content',
      label: 'Import from URL',
      icon: <Globe className="h-4 w-4" />,
      shortcut: '⌘⇧I',
      action: () => {
        window.dispatchEvent(new CustomEvent('open-web-import'));
        setOpen(false);
      },
      group: 'Import'
    },
    {
      id: 'import-screenshot',
      label: 'Capture Screenshot',
      icon: <Camera className="h-4 w-4" />,
      action: () => {
        window.dispatchEvent(new CustomEvent('capture-screenshot'));
        setOpen(false);
      },
      group: 'Import'
    },
    {
      id: 'import-text-only',
      label: 'Extract Text Only',
      icon: <FileText className="h-4 w-4" />,
      action: () => {
        window.dispatchEvent(new CustomEvent('extract-text-only'));
        setOpen(false);
      },
      group: 'Import'
    },
    
    // Tools
    {
      id: 'tool-terminal',
      label: 'Open Terminal',
      icon: <Terminal className="h-4 w-4" />,
      shortcut: '⌘`',
      action: () => {
        window.dispatchEvent(new CustomEvent('toggle-terminal'));
        setOpen(false);
      },
      group: 'Tools'
    },
    {
      id: 'tool-packages',
      label: 'Manage Packages',
      icon: <Package className="h-4 w-4" />,
      action: () => {
        window.dispatchEvent(new CustomEvent('open-packages'));
        setOpen(false);
      },
      group: 'Tools'
    },
    {
      id: 'tool-git',
      label: 'Git Panel',
      icon: <GitBranch className="h-4 w-4" />,
      shortcut: '⌘⇧G',
      action: () => {
        window.dispatchEvent(new CustomEvent('open-git'));
        setOpen(false);
      },
      group: 'Tools'
    },
    {
      id: 'tool-deploy',
      label: 'Deploy Project',
      icon: <Rocket className="h-4 w-4" />,
      action: () => {
        window.dispatchEvent(new CustomEvent('deploy-project'));
        setOpen(false);
      },
      group: 'Tools'
    },
    
    // User
    {
      id: 'user-profile',
      label: 'View Profile',
      icon: <User className="h-4 w-4" />,
      action: () => { 
        if (user) navigate(`/user/${user.username}`); 
        setOpen(false); 
      },
      group: 'User'
    },
    {
      id: 'user-settings',
      label: 'Settings',
      icon: <Settings className="h-4 w-4" />,
      shortcut: '⌘,',
      action: () => { navigate('/user/settings'); setOpen(false); },
      group: 'User'
    },
    {
      id: 'user-logout',
      label: 'Log Out',
      icon: <LogOut className="h-4 w-4" />,
      action: handleLogout,
      group: 'User'
    }
  ];

  // Add admin command if user is admin
  if (user?.username === 'admin') {
    commands.push({
      id: 'admin-dashboard',
      label: 'Admin Dashboard',
      icon: <Shield className="h-4 w-4" />,
      action: () => { navigate('/admin'); setOpen(false); },
      group: 'Admin'
    });
  }

  // Group commands
  const groupedCommands = commands.reduce((acc, command) => {
    if (!acc[command.group]) acc[command.group] = [];
    acc[command.group].push(command);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {/* Recent Projects */}
        {Array.isArray(recentProjects) && recentProjects.length > 0 && (
          <>
            <CommandGroup heading="Recent Projects">
              {recentProjects.slice(0, 5).map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => {
                    navigate(`/editor/${project.id}`);
                    setOpen(false);
                  }}
                >
                  <Code className="mr-2 h-4 w-4" />
                  <span>{project.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        
        {/* Command Groups */}
        {Object.entries(groupedCommands).map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={item.action}
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