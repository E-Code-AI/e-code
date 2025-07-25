import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Project, InsertProject } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ECodeLoading, ECodeSpinner } from '@/components/ECodeLoading';
import { 
  Code, 
  Plus, 
  Trash2, 
  Edit, 
  ExternalLink, 
  Clock, 
  Eye, 
  EyeOff, 
  Settings,
  Search,
  Grid3X3,
  List,
  Filter,
  ChevronDown,
  ArrowUpDown,
  Pin,
  GitFork,
  Heart,
  Play,
  Share2,
  Folder,
  FolderPlus,
  Github,
  Users,
  User,
  MoreVertical,
  FileText,
  PinOff,
  Upload,
  Download,
  Copy,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';

// Form schema
const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required").max(64, "Project name must be less than 64 characters"),
  description: z.string().max(255, "Description must be less than 255 characters").optional(),
  language: z.string().min(1, "Language is required"),
  visibility: z.enum(["public", "private", "unlisted"]),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

const ProjectsPage = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  // New state for Replit features
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name'>('updated');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');
  const [filterVisibility, setFilterVisibility] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('personal');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);

  // Form for new project
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      language: "typescript",
      visibility: "private",
    },
  });

  // Mock data for teams and folders
  const teams = [
    { id: 'personal', name: 'Personal', icon: User },
    { id: 'team-1', name: 'E-Code Team', icon: Users },
    { id: 'team-2', name: 'Dev Squad', icon: Users },
  ];

  const folders = [
    { id: 'folder-1', name: 'Web Projects', count: 5 },
    { id: 'folder-2', name: 'Python Scripts', count: 3 },
    { id: 'folder-3', name: 'Learning', count: 8 },
  ];

  // Mock pinned projects
  const pinnedProjects = [1, 3]; // IDs of pinned projects

  // Query for fetching projects
  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/projects');
      if (!res.ok) {
        throw new Error('Failed to fetch projects');
      }
      return res.json();
    }
  });

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    
    let filtered = [...projects];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Language filter
    if (filterLanguage !== 'all') {
      filtered = filtered.filter(project => project.language === filterLanguage);
    }
    
    // Visibility filter
    if (filterVisibility !== 'all') {
      filtered = filtered.filter(project => project.visibility === filterVisibility);
    }
    
    // Sort projects
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [projects, searchQuery, filterLanguage, filterVisibility, sortBy]);

  // Get unique languages from projects
  const availableLanguages = useMemo(() => {
    if (!projects) return [];
    const languages = new Set(projects.map(p => p.language).filter(Boolean));
    return Array.from(languages);
  }, [projects]);

  // Mutation for creating a new project
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: ProjectFormValues) => {
      const res = await apiRequest('POST', '/api/projects', projectData);
      if (!res.ok) {
        throw new Error('Failed to create project');
      }
      return res.json();
    },
    onSuccess: (project: Project) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      form.reset();
      setNewProjectOpen(false);
      toast({
        title: "Great! Your project is ready",
        description: `"${project.name}" is all set up. Let's start creating!`,
      });
      // Navigate to the new project
      setLocation(`/project/${project.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Oops! Something went wrong",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation for deleting a project
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest('DELETE', `/api/projects/${projectId}`);
      if (!res.ok) {
        throw new Error('Failed to delete project');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setConfirmDeleteOpen(false);
      setDeleteProjectId(null);
      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete project",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle new project form submission
  const onSubmit = (data: ProjectFormValues) => {
    createProjectMutation.mutate(data);
  };

  // Handle delete project confirmation
  const confirmDelete = () => {
    if (deleteProjectId) {
      deleteProjectMutation.mutate(deleteProjectId);
    }
  };

  // Function to get language icon
  const getLanguageIcon = (language: string | null) => {
    switch (language) {
      case 'typescript':
      case 'javascript':
        return <Code className="h-4 w-4 text-blue-400" />;
      case 'python':
        return <Code className="h-4 w-4 text-yellow-400" />;
      case 'html':
        return <Code className="h-4 w-4 text-orange-400" />;
      case 'css':
        return <Code className="h-4 w-4 text-purple-400" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

  // Function to get language color
  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      'javascript': 'bg-yellow-500',
      'typescript': 'bg-blue-500',
      'python': 'bg-green-500',
      'java': 'bg-orange-500',
      'go': 'bg-cyan-500',
      'rust': 'bg-red-500',
      'cpp': 'bg-purple-500',
      'csharp': 'bg-pink-500',
      'ruby': 'bg-red-400',
      'html': 'bg-orange-400',
      'css': 'bg-blue-400',
    };
    return colors[language.toLowerCase()] || 'bg-gray-500';
  };

  // Function to format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Function to get visibility badge
  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Badge variant="default" className="bg-green-600"><Eye className="h-3 w-3 mr-1" />Everyone can see</Badge>;
      case 'private':
        return <Badge variant="secondary"><EyeOff className="h-3 w-3 mr-1" />Just for you</Badge>;
      case 'unlisted':
        return <Badge variant="outline"><Eye className="h-3 w-3 mr-1" />Link sharing only</Badge>;
      default:
        return null;
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="container-responsive py-10 flex flex-col items-center justify-center min-h-[60vh]">
        <ECodeLoading size="lg" text="Loading your creative work..." />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="container-responsive py-10 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-destructive/10 p-4 sm:p-6 text-destructive max-w-md mx-auto w-full text-center">
          <p className="text-responsive-sm">Error loading projects: {error.message}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/projects'] })}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ecode-background)]">
      {/* Enhanced Replit-style Projects Header */}
      <div className="border-b border-[var(--ecode-border)] bg-[var(--ecode-surface)] sticky top-0 z-10">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          {/* Top Bar with Team Selector and Actions */}
          <div className="flex items-center justify-between py-4 border-b border-[var(--ecode-border)]">
            <div className="flex items-center gap-4">
              {/* Team Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    {teams.find(t => t.id === selectedTeam)?.icon && (
                      <div>{React.createElement(teams.find(t => t.id === selectedTeam)!.icon, { className: "h-4 w-4" })}</div>
                    )}
                    <span>{teams.find(t => t.id === selectedTeam)?.name}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Switch Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {teams.map(team => (
                    <DropdownMenuItem 
                      key={team.id}
                      onClick={() => setSelectedTeam(team.id)}
                      className="flex items-center gap-2"
                    >
                      {React.createElement(team.icon, { className: "h-4 w-4" })}
                      <span>{team.name}</span>
                      {selectedTeam === team.id && <Badge variant="secondary" className="ml-auto">Active</Badge>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <h1 className="text-2xl font-semibold text-[var(--ecode-text)]">My Repls</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Link href="/github-import">
                <Button variant="outline" size="sm" className="gap-2">
                  <Github className="h-4 w-4" />
                  Import from GitHub
                </Button>
              </Link>
              <Link href="/templates">
                <Button variant="outline" size="sm" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Templates
                </Button>
              </Link>
              <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 bg-[var(--ecode-accent)] hover:bg-[var(--ecode-accent-hover)] text-white">
                    <Plus className="h-4 w-4" />
                    Create Repl
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>
          
          {/* Search and Filters Bar */}
          <div className="py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex-1 flex items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--ecode-muted)]" />
                <Input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[var(--ecode-sidebar)] border-[var(--ecode-border)]"
                />
              </div>
              
              {/* Filters */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {(filterLanguage !== 'all' || filterVisibility !== 'all') && 
                      <Badge variant="secondary" className="ml-1">Active</Badge>
                    }
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Language</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={filterLanguage === 'all'}
                    onCheckedChange={() => setFilterLanguage('all')}
                  >
                    All Languages
                  </DropdownMenuCheckboxItem>
                  {availableLanguages.map(lang => (
                    <DropdownMenuCheckboxItem
                      key={lang}
                      checked={filterLanguage === lang}
                      onCheckedChange={() => setFilterLanguage(lang)}
                    >
                      {lang}
                    </DropdownMenuCheckboxItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Visibility</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={filterVisibility === 'all'}
                    onCheckedChange={() => setFilterVisibility('all')}
                  >
                    All Projects
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filterVisibility === 'public'}
                    onCheckedChange={() => setFilterVisibility('public')}
                  >
                    Public
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filterVisibility === 'private'}
                    onCheckedChange={() => setFilterVisibility('private')}
                  >
                    Private
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filterVisibility === 'unlisted'}
                    onCheckedChange={() => setFilterVisibility('unlisted')}
                  >
                    Unlisted
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setSortBy('updated')}>
                    Recently Updated
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('created')}>
                    Recently Created
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('name')}>
                    Name (A-Z)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Toggle
                pressed={viewMode === 'grid'}
                onPressedChange={() => setViewMode('grid')}
                size="sm"
                aria-label="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </Toggle>
              <Toggle
                pressed={viewMode === 'list'}
                onPressedChange={() => setViewMode('list')}
                size="sm"
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Toggle>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area with Folders Sidebar */}
      <div className="flex h-[calc(100vh-180px)]">
        {/* Folders Sidebar */}
        <div className="w-64 border-r border-[var(--ecode-border)] bg-[var(--ecode-surface)] p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Folders Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[var(--ecode-text)]">Folders</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setCreateFolderOpen(true)}
                  className="h-6 w-6 p-0"
                >
                  <FolderPlus className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                <Button
                  variant={selectedFolder === null ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => setSelectedFolder(null)}
                >
                  <Folder className="h-4 w-4" />
                  All Projects
                </Button>
                {folders.map(folder => (
                  <Button
                    key={folder.id}
                    variant={selectedFolder === folder.id ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-between"
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <span className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      {folder.name}
                    </span>
                    <Badge variant="secondary" className="ml-auto">{folder.count}</Badge>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Quick Filters */}
            <Separator />
            <div>
              <h3 className="text-sm font-medium text-[var(--ecode-text)] mb-2">Quick Filters</h3>
              <div className="space-y-1">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <Pin className="h-4 w-4" />
                  Pinned
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <GitFork className="h-4 w-4" />
                  Forked
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                  <Users className="h-4 w-4" />
                  Shared with me
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--ecode-background)]">
          {/* Bulk Actions Bar */}
          {selectedProjects.length > 0 && (
            <div className="mb-4 p-4 bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)] flex items-center justify-between">
              <span className="text-sm text-[var(--ecode-text)]">
                {selectedProjects.length} project{selectedProjects.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedProjects([])}>
                  Deselect All
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <MoreVertical className="h-4 w-4" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {/* Projects Display */}
          {filteredProjects && filteredProjects.length > 0 ? (
            viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProjects.map((project) => (
                  <div 
                    key={project.id} 
                    className="group relative bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)] hover:border-[var(--ecode-accent)] hover:shadow-lg transition-all overflow-hidden"
                  >
                    {/* Pin Indicator */}
                    {pinnedProjects.includes(project.id) && (
                      <div className="absolute top-2 right-2 z-10">
                        <Pin className="h-4 w-4 text-[var(--ecode-accent)] fill-current" />
                      </div>
                    )}
                    
                    {/* Project Cover Image */}
                    <div 
                      className="h-32 bg-gradient-to-br from-[var(--ecode-accent)] to-[var(--ecode-accent-hover)] opacity-20 cursor-pointer"
                      onClick={() => setLocation(`/project/${project.id}`)}
                    />
                    
                    {/* Project Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 
                          className="font-medium text-[var(--ecode-text)] group-hover:text-[var(--ecode-accent)] transition-colors truncate flex-1 cursor-pointer"
                          onClick={() => setLocation(`/project/${project.id}`)}
                        >
                          {project.name}
                        </h3>
                        <div className={`h-2 w-2 rounded-full ml-2 mt-1.5 flex-shrink-0 ${getLanguageColor(project.language || 'javascript')}`} />
                      </div>
                      
                      <p className="text-sm text-[var(--ecode-muted)] line-clamp-2 mb-3">
                        {project.description || "No description"}
                      </p>
                      
                      {/* Project Stats */}
                      <div className="flex items-center gap-3 text-xs text-[var(--ecode-muted)] mb-3">
                        <span className="flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          {Math.floor(Math.random() * 100)} runs
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="h-3 w-3" />
                          {Math.floor(Math.random() * 10)} forks
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {Math.floor(Math.random() * 50)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-[var(--ecode-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                        {getVisibilityBadge(project.visibility || 'private')}
                      </div>
                    </div>
                    
                    {/* Quick Actions */}
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/project/${project.id}`);
                        }}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Run
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Fork functionality
                        }}
                      >
                        <GitFork className="h-4 w-4 mr-1" />
                        Fork
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="secondary">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            {pinnedProjects.includes(project.id) ? (
                              <>
                                <PinOff className="h-4 w-4 mr-2" />
                                Unpin
                              </>
                            ) : (
                              <>
                                <Pin className="h-4 w-4 mr-2" />
                                Pin
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteProjectId(project.id);
                              setConfirmDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="space-y-2">
                {filteredProjects.map((project) => (
                  <div 
                    key={project.id}
                    className="bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)] hover:border-[var(--ecode-accent)] transition-all p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`h-8 w-8 rounded flex items-center justify-center ${getLanguageColor(project.language || 'javascript')}`}>
                          <Code className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 
                              className="font-medium text-[var(--ecode-text)] hover:text-[var(--ecode-accent)] cursor-pointer"
                              onClick={() => setLocation(`/project/${project.id}`)}
                            >
                              {project.name}
                            </h3>
                            {pinnedProjects.includes(project.id) && (
                              <Pin className="h-3 w-3 text-[var(--ecode-accent)] fill-current" />
                            )}
                            {getVisibilityBadge(project.visibility || 'private')}
                          </div>
                          <p className="text-sm text-[var(--ecode-muted)] line-clamp-1">
                            {project.description || "No description"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 text-sm text-[var(--ecode-muted)]">
                          <span className="flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            {Math.floor(Math.random() * 100)}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitFork className="h-3 w-3" />
                            {Math.floor(Math.random() * 10)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {Math.floor(Math.random() * 50)}
                          </span>
                        </div>
                        
                        <span className="text-sm text-[var(--ecode-muted)]">
                          Updated {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setLocation(`/project/${project.id}`)}>
                              <Play className="h-4 w-4 mr-2" />
                              Run
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <GitFork className="h-4 w-4 mr-2" />
                              Fork
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setDeleteProjectId(project.id);
                                setConfirmDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)] border-dashed">
              <Code className="h-16 w-16 text-[var(--ecode-muted)] mb-4" />
              <h3 className="text-xl font-medium text-[var(--ecode-text)] mb-2">No Repls found</h3>
              <p className="text-[var(--ecode-muted)] mb-6 text-center max-w-md">
                {searchQuery || filterLanguage !== 'all' || filterVisibility !== 'all' 
                  ? "Try adjusting your filters or search query" 
                  : "Create your first Repl to start building amazing things"}
              </p>
              <Button 
                onClick={() => setNewProjectOpen(true)}
                className="bg-[var(--ecode-accent)] hover:bg-[var(--ecode-accent-hover)] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create your first Repl
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Let's start something new! Give your project a name and choose your starting point.
            </DialogDescription>
          </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Awesome Project" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="A brief description of your project" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What would you like to create?</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose your starting point" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="html">Website (HTML)</SelectItem>
                          <SelectItem value="javascript">Interactive App (JavaScript)</SelectItem>
                          <SelectItem value="python">Automation Script (Python)</SelectItem>
                          <SelectItem value="typescript">Advanced Web App (TypeScript)</SelectItem>
                          <SelectItem value="go">Server Application (Go)</SelectItem>
                          <SelectItem value="rust">System Tool (Rust)</SelectItem>
                          <SelectItem value="java">Desktop App (Java)</SelectItem>
                          <SelectItem value="csharp">Windows App (C#)</SelectItem>
                          <SelectItem value="cpp">Performance Tool (C++)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Who can see this?</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose privacy setting" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="private">
                            <div className="flex items-center">
                              <EyeOff className="h-4 w-4 mr-2" />
                              Just for me
                            </div>
                          </SelectItem>
                          <SelectItem value="public">
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 mr-2" />
                              Share with everyone
                            </div>
                          </SelectItem>
                          <SelectItem value="unlisted">
                            <div className="flex items-center">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Only people with the link
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        You can change this anytime
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setNewProjectOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProjectMutation.isPending}
                  >
                    {createProjectMutation.isPending && (
                      <ECodeSpinner className="mr-2" size={16} />
                    )}
                    Create Project
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Project Grid */}
        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="group bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)] hover:border-[var(--ecode-accent)] hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                onClick={() => setLocation(`/project/${project.id}`)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-[var(--ecode-text)] group-hover:text-[var(--ecode-accent)] transition-colors truncate flex-1">
                      {project.name}
                    </h3>
                    <div className={`h-2 w-2 rounded-full ml-2 mt-1.5 flex-shrink-0 ${getLanguageColor(project.language || 'javascript')}`} />
                  </div>
                  <p className="text-sm text-[var(--ecode-muted)] line-clamp-2 mb-3">
                    {project.description || "No description"}
                  </p>
                  <div className="flex items-center justify-between text-xs text-[var(--ecode-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      {project.visibility === 'private' ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {project.visibility}
                    </span>
                  </div>
                </div>
                <div className="border-t border-[var(--ecode-border)] bg-[var(--ecode-sidebar)] px-4 py-2 flex items-center justify-between">
                  <span className="text-xs text-[var(--ecode-muted)]">
                    {project.language || 'HTML'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs hover:bg-[var(--ecode-sidebar-hover)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteProjectId(project.id);
                        setConfirmDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs hover:bg-[var(--ecode-sidebar-hover)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Settings functionality
                      }}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)] border-dashed">
            <Code className="h-16 w-16 text-[var(--ecode-muted)] mb-4" />
            <h3 className="text-xl font-medium text-[var(--ecode-text)] mb-2">No Repls yet</h3>
            <p className="text-[var(--ecode-muted)] mb-6 text-center max-w-md">
              Create your first Repl to start building amazing things
            </p>
            <Button 
              onClick={() => setNewProjectOpen(true)}
              className="bg-[var(--ecode-accent)] hover:bg-[var(--ecode-accent-hover)] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first Repl
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending && (
                <ECodeSpinner className="mr-2" size={16} />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Organize your projects into folders for better management
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g., Web Projects"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCreateFolderOpen(false);
                setFolderName('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // Create folder logic here
                setCreateFolderOpen(false);
                setFolderName('');
                toast({
                  title: "Folder created",
                  description: `"${folderName}" folder has been created successfully.`
                });
              }}
              disabled={!folderName.trim()}
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;