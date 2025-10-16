// @ts-nocheck
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
  FileCode2,
  Layers,
  Shield,
  GitBranch,
  Network,
  HardDrive,
  Eye,
  AlertTriangle,
  Lock,
  Wifi,
  MessageSquare,
  Monitor,
  FileSearch,
  ShieldAlert,
  CloudUpload,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Project } from '@shared/schema';

export function SpotlightSearch() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch recent projects
  const { data: recentProjects } = useQuery<Project[]>({
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

  // Tools and features matching Replit's exact interface
  const toolsAndFeatures = [
    // File Operations
    {
      icon: <FileText className="h-4 w-4" />,
      label: 'Files',
      description: 'Find a file',
      onSelect: () => handleSelect(() => navigate('/projects')),
    },
    {
      icon: <Search className="h-4 w-4" />,
      label: 'Search',
      description: 'Search through your files',
      onSelect: () => handleSelect(() => navigate('/search')),
    },
    {
      icon: <Plus className="h-4 w-4" />,
      label: 'New file',
      description: 'Create a new file',
      onSelect: () => handleSelect(() => window.dispatchEvent(new CustomEvent('create-file'))),
    },
    
    // Tools - Tab Management
    {
      icon: <Bot className="h-4 w-4" />,
      label: 'Assistant',
      description: 'Move existing tab here',
      onSelect: () => handleSelect(() => navigate('/assistant')),
    },
    {
      icon: <Database className="h-4 w-4" />,
      label: 'Database',
      description: 'Move existing tab here',
      onSelect: () => handleSelect(() => navigate('/database')),
    },
    {
      icon: <Terminal className="h-4 w-4" />,
      label: 'Shell',
      description: 'Move existing tab here',
      onSelect: () => handleSelect(() => navigate('/shell')),
    },
    {
      icon: <Zap className="h-4 w-4" />,
      label: 'Workflows',
      description: 'Move existing tab here',
      onSelect: () => handleSelect(() => navigate('/workflows')),
    },
    {
      icon: <Key className="h-4 w-4" />,
      label: 'Secrets',
      description: 'Move existing tab here',
      onSelect: () => handleSelect(() => navigate('/secrets')),
    },
    {
      icon: <Terminal className="h-4 w-4" />,
      label: 'Console',
      description: 'Move existing tab here',
      onSelect: () => handleSelect(() => navigate('/console')),
    },
    {
      icon: <Lock className="h-4 w-4" />,
      label: 'Authentication',
      description: 'Move existing tab here',
      onSelect: () => handleSelect(() => navigate('/authentication')),
    },
    {
      icon: <Eye className="h-4 w-4" />,
      label: 'Preview',
      description: 'Move existing tab here',
      onSelect: () => handleSelect(() => navigate('/preview')),
    },
    {
      icon: <Bot className="h-4 w-4" />,
      label: 'Agent',
      description: 'Move existing tab here',
      onSelect: () => handleSelect(() => navigate('/agent')),
    },
    {
      icon: <Globe className="h-4 w-4" />,
      label: 'Deployments',
      description: 'Move existing tab here',
      onSelect: () => handleSelect(() => navigate('/deployments')),
    },
    
    // Auth
    {
      icon: <Lock className="h-4 w-4" />,
      label: 'Auth',
      description: 'Let users log in to your App via a prebuilt login page',
      onSelect: () => handleSelect(() => navigate('/auth')),
    },
    
    // Advanced Tools
    {
      icon: <FileSearch className="h-4 w-4" />,
      label: 'Code Search',
      description: 'Search through the text contents of your App',
      onSelect: () => handleSelect(() => navigate('/code-search')),
    },
    {
      icon: <Package className="h-4 w-4" />,
      label: 'Install, upgrade, and manage dependencies for your environment, build system, and application runtime',
      description: '',
      onSelect: () => handleSelect(() => navigate('/packages')),
    },
    {
      icon: <BookOpen className="h-4 w-4" />,
      label: 'Docs',
      description: 'View Replit Documentation to learn about workspace features, AI, Deployments, and more',
      onSelect: () => handleSelect(() => navigate('/docs')),
    },
    {
      icon: <CloudUpload className="h-4 w-4" />,
      label: 'Extension Store',
      description: 'Find and install workspaces extensions',
      onSelect: () => handleSelect(() => navigate('/extensions')),
    },
    
    // Version Control & Integration
    {
      icon: <GitBranch className="h-4 w-4" />,
      label: 'Git',
      description: 'Version control for your App',
      onSelect: () => handleSelect(() => navigate('/git')),
    },
    {
      icon: <Layers className="h-4 w-4" />,
      label: 'Integrations',
      description: 'Connect to Replit-native and external services',
      onSelect: () => handleSelect(() => navigate('/integrations')),
    },
    
    // Infrastructure
    {
      icon: <Network className="h-4 w-4" />,
      label: 'Networking',
      description: 'Configure web server ports for your App',
      onSelect: () => handleSelect(() => navigate('/networking')),
    },
    {
      icon: <HardDrive className="h-4 w-4" />,
      label: 'Object Storage',
      description: 'Persistent, shared file storage which can be accessed programmatically in your App',
      onSelect: () => handleSelect(() => navigate('/object-storage')),
    },
    {
      icon: <Eye className="h-4 w-4" />,
      label: 'Preview',
      description: 'Preview your App',
      onSelect: () => handleSelect(() => navigate('/preview')),
    },
    
    // Analysis & Security
    {
      icon: <AlertTriangle className="h-4 w-4" />,
      label: 'Problems',
      description: 'View problems in your code detected by static analysis tools like type checkers and linters',
      onSelect: () => handleSelect(() => navigate('/problems')),
    },
    {
      icon: <Database className="h-4 w-4" />,
      label: 'Replit Key-Value Store',
      description: 'Free, easy-to-use key-value store suitable for unstructured data, caching, session management, fast lookups, and flexible data models',
      onSelect: () => handleSelect(() => navigate('/kv-store')),
    },
    {
      icon: <ShieldAlert className="h-4 w-4" />,
      label: 'Security Scanner',
      description: 'Scan your app for vulnerabilities',
      onSelect: () => handleSelect(() => navigate('/security-scanner')),
    },
    
    // Access & Communication
    {
      icon: <Terminal className="h-4 w-4" />,
      label: 'Shell',
      description: 'Directly access your App through a command line interface (CLI)',
      onSelect: () => handleSelect(() => navigate('/shell')),
    },
    {
      icon: <Wifi className="h-4 w-4" />,
      label: 'SSH',
      description: 'Configure remote access to connect to this Repl from another machine or IDE',
      onSelect: () => handleSelect(() => navigate('/ssh')),
    },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      label: 'Threads',
      description: 'Comment and discuss topics with collaborators directly inside code or text files',
      onSelect: () => handleSelect(() => navigate('/threads')),
    },
    
    // Settings
    {
      icon: <Settings className="h-4 w-4" />,
      label: 'User Settings',
      description: 'Configure personal editor preferences and workspace settings which apply to all Apps',
      onSelect: () => handleSelect(() => navigate('/settings')),
    },
    {
      icon: <Monitor className="h-4 w-4" />,
      label: 'VNC',
      description: "View your app's desktop screen output",
      onSelect: () => handleSelect(() => navigate('/vnc')),
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search for files & tools..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {/* Recent Projects */}
        {recentProjects && recentProjects.length > 0 && searchQuery.length === 0 && (
          <>
            <CommandGroup heading="Recent Projects">
              {recentProjects.slice(0, 5).map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => handleSelect(() => navigate(`/${project.slug}`))}
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

        {/* Tools and Features */}
        {(searchQuery.length === 0 || toolsAndFeatures.some(tool => 
          tool.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tool.description.toLowerCase().includes(searchQuery.toLowerCase())
        )) && (
          <CommandGroup heading="Tools & Features">
            {toolsAndFeatures
              .filter(tool => 
                searchQuery.length === 0 || 
                tool.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((tool) => (
                <CommandItem
                  key={tool.label}
                  onSelect={tool.onSelect}
                >
                  {tool.icon}
                  <div className="ml-2 flex-1">
                    <div className="text-sm font-medium">{tool.label}</div>
                    {tool.description && (
                      <div className="text-xs text-muted-foreground">{tool.description}</div>
                    )}
                  </div>
                </CommandItem>
              ))}
          </CommandGroup>
        )}
        
        {/* User Session */}
        {user && (
          <CommandGroup heading="Session">
            <CommandItem onSelect={() => handleSelect(() => {
              logoutMutation.mutate();
            })}>
              <LogOut className="h-4 w-4 mr-2" />
              <span>Sign out</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}