import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Project, InsertProject } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn, getProjectUrl } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/use-debounce';

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
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ECodeLoading, ECodeSpinner } from '@/components/ECodeLoading';
import { PageShell, PageHeader, PageShellLoading } from '@/components/layout/PageShell';
import { 
  Code, Code2, Plus, Trash2, Edit, ExternalLink, Clock, Eye, EyeOff, Settings,
  Search, Grid3X3, List, Filter, ChevronDown, ArrowUpDown, Pin, GitFork, Heart,
  Play, Share2, Folder, FolderPlus, Github, Users, User, MoreVertical, FileText,
  PinOff, Upload, Download, Copy, Sparkles, Star, GitBranch, Package, Rocket,
  Globe, Calendar, Activity, TrendingUp, AlertCircle, CheckCircle2, XCircle,
  Database, Server, Layers, Zap, Shield, Terminal, Coffee, Moon, Sun, Sunrise,
  BarChart3, LineChart, Hash, Archive, Lock, Unlock, FolderOpen, GitCommit,
  GitMerge, GitPullRequest, Tag, BookMarked, PlusCircle, MinusCircle, X
} from 'lucide-react';
import codingImagePath from '@assets/stock_images/coding_programming_l_3c65a90d.jpg';
import modernDevImagePath from '@assets/stock_images/modern_software_deve_49bda81c.jpg';

// Form schema
const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required").max(64, "Project name must be less than 64 characters"),
  description: z.string().max(255, "Description must be less than 255 characters").optional(),
  language: z.string().min(1, "Language is required"),
  visibility: z.enum(["public", "private", "unlisted"]),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

// Extended Project type that includes owner information from the backend
interface ProjectWithOwner extends Project {
  owner?: {
    id: string;
    username: string | null;
    email: string | null;
    displayName: string | null;
    profileImageUrl: string | null;
  };
}

// Technology stack colors and icons
const techStackConfig = {
  JavaScript: { color: 'bg-yellow-500', icon: '⚡' },
  TypeScript: { color: 'bg-blue-600', icon: '🔷' },
  Python: { color: 'bg-green-600', icon: '🐍' },
  React: { color: 'bg-cyan-500', icon: '⚛️' },
  'Node.js': { color: 'bg-green-500', icon: '🟢' },
  Vue: { color: 'bg-emerald-500', icon: '🌿' },
  Angular: { color: 'bg-red-600', icon: '🅰️' },
  Docker: { color: 'bg-blue-500', icon: '🐳' },
  MongoDB: { color: 'bg-green-700', icon: '🍃' },
  PostgreSQL: { color: 'bg-indigo-600', icon: '🐘' },
  Redis: { color: 'bg-red-500', icon: '🔴' },
  AWS: { color: 'bg-orange-600', icon: '☁️' },
};

// Language display names and colors
const languageColors: Record<string, string> = {
  javascript: 'bg-yellow-500',
  typescript: 'bg-blue-600',
  python: 'bg-green-600',
  java: 'bg-red-600',
  cpp: 'bg-pink-600',
  c: 'bg-gray-600',
  csharp: 'bg-purple-600',
  go: 'bg-cyan-600',
  rust: 'bg-orange-600',
  php: 'bg-indigo-600',
  ruby: 'bg-red-500',
  swift: 'bg-orange-500',
  kotlin: 'bg-violet-600',
  html: 'bg-orange-400',
  css: 'bg-blue-400',
  sql: 'bg-blue-700',
  bash: 'bg-gray-700',
  other: 'bg-gray-500',
};

const ProjectsPage = () => {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  // Enhanced state management
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name' | 'stars'>('updated');
  const [filterLanguage, setFilterLanguage] = useState<string[]>([]);
  const [filterVisibility, setFilterVisibility] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  
  // Debounced search
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

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

  // Query for fetching projects
  const { data: projects = [], isLoading, error } = useQuery<ProjectWithOwner[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/projects');
      if (!res.ok) {
        throw new Error('Failed to fetch projects');
      }
      return await res.json();
    },
    enabled: !!user,
  });

  // Get unique languages from projects
  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    projects.forEach(p => {
      if (p.language) langs.add(p.language);
    });
    return Array.from(langs).sort();
  }, [projects]);

  // Advanced filtering and sorting
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = [...projects];

    // Apply search filter
    if (debouncedSearchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    // Apply language filter
    if (filterLanguage.length > 0) {
      filtered = filtered.filter(p => {
        return p.language && filterLanguage.includes(p.language);
      });
    }

    // Apply visibility filter
    if (filterVisibility.length > 0) {
      filtered = filtered.filter(p => filterVisibility.includes(p.visibility));
    }

    // Apply date range filter
    if (dateRange[0] && dateRange[1]) {
      filtered = filtered.filter(p => {
        const updatedAt = new Date(p.updatedAt);
        return updatedAt >= dateRange[0] && updatedAt <= dateRange[1];
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'stars':
          // Sort by likes since we don't have stars
          return (b.likes || 0) - (a.likes || 0);
        case 'updated':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return filtered;
  }, [projects, debouncedSearchQuery, filterLanguage, filterVisibility, dateRange, sortBy]);

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      const res = await apiRequest('POST', '/api/projects', values);
      if (!res.ok) throw new Error('Failed to create project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setNewProjectOpen(false);
      form.reset();
      toast({ title: "Success", description: "Project created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await apiRequest('DELETE', `/api/projects/${projectId}`);
      if (!res.ok) throw new Error('Failed to delete project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setConfirmDeleteOpen(false);
      toast({ title: "Success", description: "Project deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedProjects.length === 0) return;

    switch (action) {
      case 'delete':
        // Implement bulk delete
        toast({ title: "Info", description: `Deleting ${selectedProjects.length} projects...` });
        break;
      case 'archive':
        // Implement bulk archive
        toast({ title: "Info", description: `Archiving ${selectedProjects.length} projects...` });
        break;
      case 'export':
        // Implement bulk export
        toast({ title: "Info", description: `Exporting ${selectedProjects.length} projects...` });
        break;
    }
    
    setSelectedProjects([]);
    setBulkActionOpen(false);
  };

  // Handle project selection
  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const selectAllProjects = () => {
    if (selectedProjects.length === filteredAndSortedProjects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filteredAndSortedProjects.map(p => p.id));
    }
  };

  if (authLoading) {
    return <PageShellLoading text="Loading your projects..." size="lg" />;
  }

  if (!user) {
    return (
      <PageShell>
        <Card className="max-w-lg mx-auto text-center p-8">
          <CardHeader>
            <CardTitle>Sign in to view your projects</CardTitle>
            <CardDescription>
              You need to be authenticated to access your projects.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => setLocation('/login')} size="lg">
              Sign In
            </Button>
          </CardFooter>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/20" />
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      </div>

      <PageHeader
        title="Projects"
        description="Manage and organize all your development projects in one place"
        icon={Folder}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
            <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Set up a new project with your preferred configuration
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(values => createProjectMutation.mutate(values))} className="space-y-4">
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
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="A brief description..." {...field} />
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
                          <FormLabel>Primary Language</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="javascript">JavaScript</SelectItem>
                              <SelectItem value="typescript">TypeScript</SelectItem>
                              <SelectItem value="python">Python</SelectItem>
                              <SelectItem value="go">Go</SelectItem>
                              <SelectItem value="rust">Rust</SelectItem>
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
                          <FormLabel>Visibility</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select visibility" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="public">
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4" />
                                  Public
                                </div>
                              </SelectItem>
                              <SelectItem value="private">
                                <div className="flex items-center gap-2">
                                  <Lock className="h-4 w-4" />
                                  Private
                                </div>
                              </SelectItem>
                              <SelectItem value="unlisted">
                                <div className="flex items-center gap-2">
                                  <EyeOff className="h-4 w-4" />
                                  Unlisted
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createProjectMutation.isPending}>
                        {createProjectMutation.isPending ? (
                          <>
                            <ECodeSpinner className="mr-2" />
                            Creating...
                          </>
                        ) : (
                          'Create Project'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      />

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-72 flex-shrink-0"
            >
              <Card className="sticky top-6 border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Search */}
                  <div>
                    <Label className="text-sm font-medium mb-2">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Language/Framework Filter */}
                  <div>
                    <Label className="text-sm font-medium mb-2">Languages & Frameworks</Label>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {availableLanguages.map(lang => (
                          <div key={lang} className="flex items-center space-x-2">
                            <Checkbox
                              id={`lang-${lang}`}
                              checked={filterLanguage.includes(lang)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilterLanguage([...filterLanguage, lang]);
                                } else {
                                  setFilterLanguage(filterLanguage.filter(l => l !== lang));
                                }
                              }}
                            />
                            <Label
                              htmlFor={`lang-${lang}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {lang}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Visibility Filter */}
                  <div>
                    <Label className="text-sm font-medium mb-2">Visibility</Label>
                    <div className="space-y-2">
                      {['public', 'private', 'unlisted'].map(vis => (
                        <div key={vis} className="flex items-center space-x-2">
                          <Checkbox
                            id={`vis-${vis}`}
                            checked={filterVisibility.includes(vis)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilterVisibility([...filterVisibility, vis]);
                              } else {
                                setFilterVisibility(filterVisibility.filter(v => v !== vis));
                              }
                            }}
                          />
                          <Label
                            htmlFor={`vis-${vis}`}
                            className="text-sm font-normal cursor-pointer capitalize"
                          >
                            {vis}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterLanguage([]);
                      setFilterVisibility([]);
                      setDateRange([null, null]);
                    }}
                  >
                    Clear All Filters
                  </Button>
                </CardContent>
              </Card>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <Card className="mb-6 border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 border rounded-lg p-1">
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Sort Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Sort by {sortBy}
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setSortBy('updated')}>
                        <Clock className="h-4 w-4 mr-2" />
                        Last Updated
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('created')}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Created Date
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('name')}>
                        <FileText className="h-4 w-4 mr-2" />
                        Name
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('stars')}>
                        <Star className="h-4 w-4 mr-2" />
                        Stars
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Bulk Actions */}
                  {selectedProjects.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2"
                    >
                      <Badge variant="secondary">
                        {selectedProjects.length} selected
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-2">
                            Bulk Actions
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleBulkAction('archive')}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive Selected
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkAction('export')}>
                            <Download className="h-4 w-4 mr-2" />
                            Export Selected
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleBulkAction('delete')}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Selected
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedProjects([])}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedProjects.length === filteredAndSortedProjects.length && filteredAndSortedProjects.length > 0}
                    onCheckedChange={selectAllProjects}
                  />
                  <Label htmlFor="select-all" className="text-sm cursor-pointer">
                    Select All
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects Grid/List */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="border-0 shadow-lg">
                  <div className="aspect-video">
                    <Skeleton className="w-full h-full" />
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAndSortedProjects.length === 0 ? (
            <Card className="p-16 text-center border-dashed">
              <div className="max-w-md mx-auto">
                <Folder className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No projects found</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || filterLanguage.length > 0 || filterVisibility.length > 0
                    ? "Try adjusting your filters or search query"
                    : "Create your first project to get started"}
                </p>
                <Button onClick={() => setNewProjectOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Project
                </Button>
              </div>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredAndSortedProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                    className="relative"
                  >
                    <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
                      {/* Selection Checkbox */}
                      <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Checkbox
                          checked={selectedProjects.includes(project.id)}
                          onCheckedChange={() => toggleProjectSelection(project.id)}
                          className="bg-white/90 backdrop-blur-sm"
                        />
                      </div>

                      {/* Status Badges */}
                      <div className="absolute top-2 right-2 z-10 flex gap-2">
                        {project.isPinned && (
                          <Badge className="bg-yellow-500/90 text-white">
                            <Pin className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>

                      {/* Project Thumbnail */}
                      <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950 dark:to-purple-950">
                        <img 
                          src={index % 2 === 0 ? codingImagePath : modernDevImagePath}
                          alt={project.name}
                          className="absolute inset-0 w-full h-full object-cover opacity-20"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-4xl font-bold text-white/20 select-none">
                            {project.name.substring(0, 2).toUpperCase()}
                          </div>
                        </div>

                        {/* Language Badge */}
                        {project.language && (
                          <div className="absolute bottom-2 left-2">
                            <Badge
                              variant="secondary"
                              className={`${languageColors[project.language] || languageColors.other} text-white text-xs`}
                            >
                              {project.language}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <CardContent className="p-4">
                        <div className="mb-3">
                          <h3 className="font-semibold text-lg truncate mb-1">{project.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {project.description || 'No description available'}
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Heart className="h-3 w-3" />
                              <span>{project.likes || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <GitFork className="h-3 w-3" />
                              <span>{project.forks || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span>{project.views || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Play className="h-3 w-3" />
                              <span>{project.runs || 0}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {project.visibility}
                          </Badge>
                        </div>

                        {/* Updated At */}
                        <div className="text-xs text-muted-foreground border-t pt-3">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Updated
                            </span>
                            <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                              setLocation(`/editor/${project.id}`);
                            }}
                            data-testid={`button-open-${project.id}`}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open
                          </Button>
                          <Button size="sm" variant="ghost" className="px-2">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="px-2">
                            <Rocket className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="px-2">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <GitFork className="h-4 w-4 mr-2" />
                                Fork
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            // List View
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredAndSortedProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.02 }}
                    whileHover={{ x: 4 }}
                  >
                    <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Checkbox */}
                          <Checkbox
                            checked={selectedProjects.includes(project.id)}
                            onCheckedChange={() => toggleProjectSelection(project.id)}
                          />

                          {/* Project Icon */}
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {project.name.substring(0, 2).toUpperCase()}
                          </div>

                          {/* Project Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{project.name}</h3>
                              {project.isPinned && <Pin className="h-4 w-4 text-yellow-500" />}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {project.description || 'No description available'}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {project.likes || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <GitFork className="h-3 w-3" />
                                {project.forks || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {project.views || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Play className="h-3 w-3" />
                                {project.runs || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(project.updatedAt).toLocaleDateString()}
                              </span>
                              <Badge variant="outline">{project.visibility}</Badge>
                            </div>
                          </div>

                          {/* Language Badge */}
                          {project.language && (
                            <Badge 
                              variant="secondary"
                              className={`${languageColors[project.language] || languageColors.other} text-white`}
                            >
                              {project.language}
                            </Badge>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setLocation(`/editor/${project.id}`);
                              }}
                              data-testid={`button-quick-open-${project.id}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Rocket className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Share2 className="h-4 w-4 mr-2" />
                                  Share
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <GitFork className="h-4 w-4 mr-2" />
                                  Fork
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Pagination */}
          {filteredAndSortedProjects.length > 0 && (
            <div className="mt-8 flex justify-center">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  <Button variant="secondary" size="sm">1</Button>
                  <Button variant="outline" size="sm">2</Button>
                  <Button variant="outline" size="sm">3</Button>
                </div>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
      `}</style>
    </PageShell>
  );
};

export default ProjectsPage;