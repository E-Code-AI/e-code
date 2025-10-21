// @ts-nocheck
import React, { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Project } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  MoreHorizontal,
  Send,
  Paperclip,
  X,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Edit,
  Copy,
  Trash,
  Search,
  Clock,
  Eye,
  Users,
  Share2,
  Code2,
  Folder,
  GitBranch,
  Star,
  Grid3x3,
  List,
  Sparkles,
  Rocket,
  Store,
  Bot,
  Briefcase,
  ListTodo,
  CloudSun
} from 'lucide-react';
import { CreditBalance } from '@/components/CreditBalance';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ECodeLoading } from '@/components/ECodeLoading';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getProjectUrl } from '@/lib/utils';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
// Get project icon based on project details
function getProjectIcon(project: Project) {
  const colors = [
    'bg-[#4A5BF6]', // Replit blue
    'bg-[#E54B4B]', // Red
    'bg-[#00A67E]', // Green
    'bg-[#F26522]', // Orange
    'bg-[#9B51E0]', // Purple
    'bg-[#F2C94C]', // Yellow
  ];
  
  const bgColor = colors[project.id % colors.length];
  const firstLetter = project.name.charAt(0).toUpperCase();
  
  return (
    <div className={`${bgColor} w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold text-lg`}>
      {firstLetter}
    </div>
  );
}

// Format time ago
function getTimeAgo(date: Date | string) {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

const popularExamples = [
  {
    id: 'nextjs-blog',
    icon: BookOpen,
    label: 'Blog with Next.js',
    prompt:
      'Build a modern blog with Next.js featuring markdown support, categories, tags, search functionality, and a beautiful responsive design'
  },
  {
    id: 'ecommerce-store',
    icon: Store,
    label: 'E-commerce Store',
    prompt:
      'Create an e-commerce store with product catalog, shopping cart, checkout process, payment integration, and admin dashboard'
  },
  {
    id: 'discord-bot',
    icon: Bot,
    label: 'Discord Bot',
    prompt:
      'Build a Discord bot with commands, moderation features, welcome messages, role management, and fun interactive features'
  },
  {
    id: 'portfolio-site',
    icon: Briefcase,
    label: 'Portfolio Website',
    prompt:
      'Create a professional portfolio website with hero section, about me, projects showcase, skills, contact form, and smooth animations'
  },
  {
    id: 'task-manager',
    icon: ListTodo,
    label: 'Task Manager',
    prompt:
      'Build a task manager app with categories, due dates, priority levels, drag and drop, progress tracking, and team collaboration features'
  },
  {
    id: 'weather-dashboard',
    icon: CloudSun,
    label: 'Weather Dashboard',
    prompt:
      'Create a weather dashboard showing current conditions, 5-day forecast, multiple locations, weather maps, and beautiful visualizations'
  }
];


interface ProjectWithDeployment extends Project {
  isDeployed?: boolean;
  deploymentUrl?: string;
  deploymentStatus?: string;
  owner?: {
    id: number;
    username: string;
    email: string;
  };
}

interface DashboardSummary {
  totalProjects: number;
  activeDeployments: number;
  totalDeployments: number;
  storageUsed: number;
  computeHours: number;
  lastActivityDate: Date;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [aiPrompt, setAiPrompt] = useState('');
  const [showBanner, setShowBanner] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const inputRef = useRef<HTMLInputElement | null>(null);
  

  // Fetch recent projects with deployment status
  const { data: recentProjects = [], isLoading } = useQuery<ProjectWithDeployment[]>({
    queryKey: ['/api/projects/recent'],
    enabled: !!user,
  });

  // Fetch dashboard summary
  const { data: dashboardSummary } = useQuery<DashboardSummary>({
    queryKey: ['/api/dashboard/summary'],
    enabled: !!user,
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    try {
      // Create a new project immediately
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: aiPrompt,
          description: aiPrompt,
          language: 'javascript',
          visibility: 'private'
        }),
      });

      if (response.ok) {
        const project = await response.json();
        console.log('Project created:', project);
        
        // Store prompt in sessionStorage for the AI agent
        window.sessionStorage.setItem(`agent-prompt-${project.id}`, aiPrompt);
        
        const projectUrl = getProjectUrl(project, user?.username);
        console.log(`Navigating to: ${projectUrl}`);
        console.log('Project has slug:', project.slug);

        // Add a small delay to ensure project is fully created and indexed
        setTimeout(() => {
          // Use window.location for full page reload to ensure auth state is fresh
          window.location.href = `${projectUrl}?agent=true&prompt=${encodeURIComponent(aiPrompt)}`;
        }, 500);
      } else {
        const errorText = await response.text();
        console.error('Failed to create project:', response.status, errorText);
        toast({
          title: "Error",
          description: "Failed to create project. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  // Filter projects based on search and filter
  const filteredProjects = recentProjects.filter(project => {
    // Search filter
    if (searchQuery && !project.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Tag filter
    if (filterTag !== 'all') {
      if (filterTag === 'deployed' && !project.isDeployed) return false;
      if (filterTag === 'private' && project.visibility !== 'private') return false;
      if (filterTag === 'public' && project.visibility !== 'public') return false;
    }
    
    return true;
  });

  // Get unique languages/tags from projects
  const projectTags = ['all', 'deployed', 'private', 'public'];

  if (isLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Loading your workspace"
          description="Hang tight while we prepare your personalized dashboard."
          icon={Sparkles}
        />
        <div className="flex justify-center py-24">
          <ECodeLoading size="lg" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {showBanner && (
        <Card className="border-[var(--ecode-border)] bg-gradient-to-r from-blue-50 to-purple-50 p-4 shadow-sm dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="rounded bg-gradient-to-r from-blue-500 to-purple-500 px-2 py-0.5 text-xs font-semibold text-white">
                Beta
              </span>
              <div>
                <h3 className="mb-0.5 text-sm font-medium text-[var(--ecode-text)]">
                  Purchase domains on E-Code
                </h3>
                <p className="text-xs text-[var(--ecode-text-secondary)]">
                  Get your dream domain name in just a few clicks.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowBanner(false)}
              className="h-7 w-7 rounded hover:bg-white/50 dark:hover:bg-black/20"
              aria-label="Dismiss domain purchase announcement"
            >
              <X className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)]" />
            </Button>
          </div>
        </Card>
      )}

      <PageHeader
        title={`Hi ${user?.displayName || user?.username}, what do you want to build?`}
        description="Describe your idea and watch AI build it instantly."
        icon={Sparkles}
        actions={(
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="gap-2" onClick={() => navigate('/projects')}>
              <Code2 className="h-4 w-4" />
              Browse projects
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate('/deployments')}
            >
              <Rocket className="h-4 w-4" />
              Manage deployments
            </Button>
          </div>
        )}
      >
        <div className="flex flex-col items-center gap-8">
          <CreditBalance />
          <form onSubmit={handleCreateProject} className="w-full max-w-3xl px-4 sm:px-0">
            <div className="relative">
              <div className="rounded-xl border border-[var(--ecode-border)] bg-[var(--ecode-surface)] p-1 shadow-sm transition-shadow duration-200 hover:shadow-md">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="What would you like to build?"
                      className="w-full border-none bg-transparent px-3 py-3 text-base font-normal text-[var(--ecode-text)] outline-none placeholder:text-[var(--ecode-text-secondary)]/70 focus:ring-0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && aiPrompt.trim()) {
                          handleCreateProject(e);
                        }
                      }}
                      aria-label="Describe your project idea"
                      data-testid="input-project-prompt"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md opacity-60 transition-opacity hover:bg-[var(--ecode-surface-secondary)] hover:opacity-100"
                      aria-label="Attach context"
                    >
                      <Paperclip className="h-4 w-4 text-[var(--ecode-text-secondary)]" />
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!aiPrompt.trim()}
                      className="h-auto rounded-lg border-0 bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-none hover:bg-violet-700"
                    >
                      Build
                    </Button>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-sm font-normal text-[var(--ecode-text-secondary)]">
                Free to use • No setup required • Deploy instantly
              </p>
            </div>
          </form>
          <div className="w-full text-center">
            <p className="mb-4 text-sm font-medium text-[var(--ecode-text-secondary)]">
              Or try these popular examples:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 px-4 sm:px-0">
              {popularExamples.map((example) => {
                const Icon = example.icon;
                return (
                  <Button
                    key={example.id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAiPrompt(example.prompt);
                      if (inputRef.current) {
                        inputRef.current.focus();
                        inputRef.current.setSelectionRange(example.prompt.length, example.prompt.length);
                      }
                    }}
                    className="h-10 gap-2 rounded-xl border-[var(--ecode-border)] px-4 sm:px-5 text-sm font-medium text-[var(--ecode-text-secondary)] shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50/70 dark:hover:bg-violet-950/20 focus-visible:ring-2 focus-visible:ring-violet-500/40"
                    data-testid={`button-example-${example.id}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{example.label}</span>
                    <span className="sm:hidden text-xs">{example.label.split(' ')[0]}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </PageHeader>
      <div className="space-y-12">
        {/* Your recent Apps - Enhanced Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium text-[var(--ecode-text)]">
              Your recent Apps
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/projects')}
              className="text-sm text-[var(--ecode-text-secondary)] hover:text-[var(--ecode-text)] -mr-2 flex items-center gap-1"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Search and Filter Bar - Mobile Responsive */}
          <div className="flex flex-col gap-3 mb-6 sm:gap-4">
            {/* Search input - Full width on mobile */}
            <div className="w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ecode-text-secondary)]" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[var(--ecode-surface)] border border-[var(--ecode-border)] rounded-lg text-sm text-[var(--ecode-text)] placeholder:text-[var(--ecode-text-secondary)]/70 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                data-testid="input-search-projects"
              />
            </div>
            
            {/* Filter buttons and View mode - Responsive row */}
            <div className="flex items-center justify-between gap-3">
              {/* Filter buttons - Scrollable on mobile */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
                {projectTags.map(tag => (
                  <Button
                    key={tag}
                    variant={filterTag === tag ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 px-3 text-xs capitalize whitespace-nowrap"
                    onClick={() => setFilterTag(tag)}
                    data-testid={`button-filter-${tag}`}
                  >
                    {tag === 'all' ? 'All' : tag}
                  </Button>
                ))}
              </div>
              
              {/* View mode toggle - Always visible */}
              <div className="flex items-center gap-1 border-l border-[var(--ecode-border)] pl-3">
                <Button
                  variant={viewMode === 'grid' ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  data-testid="button-view-grid"
                >
                  <Grid3x3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  data-testid="button-view-list"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <Card className="p-16 text-center bg-[var(--ecode-surface)] border border-[var(--ecode-border)] rounded-lg">
              <p className="text-[var(--ecode-text-secondary)] text-base">
                {searchQuery || filterTag !== 'all' 
                  ? 'No apps match your search criteria' 
                  : 'No apps yet. Create your first one above!'}
              </p>
            </Card>
          ) : viewMode === 'grid' ? (
            // Grid view with enhanced cards - Responsive
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.map((project) => (
                <Card 
                  key={project.id}
                  className="group relative overflow-hidden bg-[var(--ecode-surface)] border border-[var(--ecode-border)] hover:border-violet-500/50 transition-all duration-300 cursor-pointer hover:shadow-lg"
                  onClick={() => {
                    const ownerUsername = project.owner?.username || user?.username || 'admin';
                    const projectUrl = project.slug ? `/u/${ownerUsername}/${project.slug}` : `/project/${project.id}`;
                    navigate(projectUrl);
                  }}
                  data-testid={`card-project-${project.id}`}
                >
                  {/* Thumbnail/Preview area */}
                  <div className="aspect-video bg-gradient-to-br from-violet-500/10 to-blue-500/10 border-b border-[var(--ecode-border)] relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Code2 className="h-12 w-12 text-[var(--ecode-text-secondary)]/20" />
                    </div>
                    {project.isDeployed && (
                      <Badge className="absolute top-2 right-2 bg-green-500/90 text-white border-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Live
                      </Badge>
                    )}
                  </div>
                  
                  {/* Card content */}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-semibold text-base text-[var(--ecode-text)] truncate" data-testid={`text-project-name-${project.id}`}>
                          {project.name}
                        </h3>
                        <p className="text-xs text-[var(--ecode-text-secondary)] mt-1 line-clamp-2">
                          {project.description || 'No description'}
                        </p>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            const ownerUsername = project.owner?.username || user?.username || 'admin';
                            const projectUrl = project.slug ? `/u/${ownerUsername}/${project.slug}` : `/project/${project.id}`;
                            navigate(projectUrl);
                          }}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <GitBranch className="h-4 w-4 mr-2" />
                            Fork
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Stats row */}
                    <div className="flex items-center justify-between text-xs text-[var(--ecode-text-secondary)]">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{getTimeAgo(project.updatedAt)}</span>
                        </div>
                        {project.stats?.views && (
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>{project.stats.views}</span>
                          </div>
                        )}
                        {project.collaborators?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{project.collaborators.length}</span>
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {project.language || 'JavaScript'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            // List view - Mobile Responsive
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="group bg-[var(--ecode-surface)] border border-[var(--ecode-border)] hover:border-[var(--ecode-border-hover)] transition-colors cursor-pointer rounded-lg p-4"
                  onClick={() => {
                    const projectUrl = getProjectUrl(project, user?.username);
                    navigate(projectUrl);
                  }}
                  data-testid={`row-project-${project.id}`}
                >
                  <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <div className="hidden sm:block">{getProjectIcon(project)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-base text-[var(--ecode-text)]" data-testid={`text-project-name-${project.id}`}>
                        {project.name}
                      </h3>
                      <p className="text-sm text-[var(--ecode-text-secondary)] mt-0.5">
                        {getTimeAgo(project.updatedAt)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      {project.isDeployed && (
                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm hidden sm:inline">Deployed</span>
                          <span className="text-xs sm:hidden">Live</span>
                        </div>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            const ownerUsername = project.owner?.username || user?.username;
                            const projectUrl = getProjectUrl(project, ownerUsername);
                            navigate(projectUrl);
                          }}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}