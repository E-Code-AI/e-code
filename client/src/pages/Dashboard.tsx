// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Project } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen,
  FileText,
  BarChart3,
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
  Zap,
  Search,
  Filter,
  Clock,
  Eye,
  Users,
  Share2,
  Code2,
  Folder,
  GitBranch,
  Star,
  Grid3x3,
  List
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


// Icon mapping for quick actions
const iconMap: Record<string, any> = {
  BookOpen,
  FileText,
  BarChart3,
  Zap
};

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

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  description: string;
  template: string;
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
  
  // Auto-login for development mode
  useEffect(() => {
    const autoLogin = async () => {
      if (import.meta.env.DEV && !user) {
        console.log('[Dashboard] Development mode - attempting auto-login');
        try {
          const response = await fetch('/api/dev-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username: 'admin' })
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('[Dashboard] Auto-login successful:', data.user?.username);
            window.location.reload(); // Reload to get authenticated state
          } else {
            console.log('[Dashboard] Auto-login failed, user can login manually');
          }
        } catch (error) {
          console.error('[Dashboard] Auto-login error:', error);
        }
      }
    };
    
    autoLogin();
  }, [user]);

  // Fetch recent projects with deployment status
  const { data: recentProjects = [], isLoading } = useQuery<ProjectWithDeployment[]>({
    queryKey: ['/api/projects/recent'],
    enabled: !!user,
  });

  // Fetch quick actions
  const { data: quickActions = [] } = useQuery<QuickAction[]>({
    queryKey: ['/api/dashboard/quick-actions'],
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
          name: aiPrompt.slice(0, 30),
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
        
        // Ensure we have the owner username and slug
        const ownerUsername = project.owner?.username || user?.username || 'admin';
        // Use slug if available, otherwise fallback to name (which should be slugified)
        const projectSlug = project.slug || project.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const projectUrl = `/@${ownerUsername}/${projectSlug}`;
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

  const handleQuickAction = async (action: QuickAction) => {
    // Use the description from the API or fallback to action label
    const prompt = action.description || action.label;
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: action.label,
          description: prompt,
          template: action.template, // Use the template ID from the API
          language: 'javascript',
          visibility: 'private'
        }),
      });

      if (response.ok) {
        const project = await response.json();
        console.log('Quick action project created:', project);
        
        // Store prompt in sessionStorage for the AI agent
        window.sessionStorage.setItem(`agent-prompt-${project.id}`, prompt);
        
        // Ensure we have the owner username
        const ownerUsername = project.owner?.username || user?.username || 'admin';
        const projectUrl = `/@${ownerUsername}/${project.slug}`;
        console.log(`Navigating to: ${projectUrl}`);
        
        // Add a small delay to ensure project is fully created and indexed
        setTimeout(() => {
          // Use window.location for full page reload to ensure auth state is fresh
          window.location.href = `${projectUrl}?agent=true&prompt=${encodeURIComponent(prompt)}`;
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
    return <ECodeLoading size="lg" />;
  }

  return (
    <div className="min-h-screen bg-[var(--ecode-background)]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Beta banner */}
        {showBanner && (
          <Card className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-[var(--ecode-border)] rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded">
                  Beta
                </span>
                <div>
                  <h3 className="font-medium text-[var(--ecode-text)] text-sm mb-0.5">
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
                className="h-7 w-7 hover:bg-white/50 dark:hover:bg-black/20 rounded"
              >
                <X className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)]" />
              </Button>
            </div>
          </Card>
        )}

        {/* Main greeting - Lovable.dev style */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CreditBalance />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--ecode-text)] mb-2">
            Hi {user?.displayName || user?.username}, what do you want to build?
          </h1>
          <p className="text-lg text-[var(--ecode-text-secondary)] font-medium">
            Describe your idea and watch AI build it instantly
          </p>
        </div>
          
        {/* Lovable.dev Exact Style AI prompt input */}
        <form onSubmit={handleCreateProject} className="mb-10">
          <div className="max-w-3xl mx-auto">
            <div className="relative">
              {/* Exact Lovable.dev style input */}
              <div className="bg-[var(--ecode-surface)] border border-[var(--ecode-border)] rounded-xl p-1 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="What would you like to build?"
                      className="w-full bg-transparent border-none outline-none text-base placeholder:text-[var(--ecode-text-secondary)]/70 focus:ring-0 px-3 py-3 font-normal text-[var(--ecode-text)]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && aiPrompt.trim()) {
                          handleCreateProject(e);
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-[var(--ecode-surface-secondary)] rounded-md opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <Paperclip className="h-4 w-4 text-[var(--ecode-text-secondary)]" />
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!aiPrompt.trim()}
                      className="bg-violet-600 hover:bg-violet-700 text-white shadow-none border-0 rounded-lg px-4 py-2 text-sm font-medium h-auto"
                    >
                      Build
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Clean feature text */}
              <p className="text-center mt-3 text-sm text-[var(--ecode-text-secondary)] font-normal">
                Free to use • No setup required • Deploy instantly
              </p>
            </div>
          </div>
        </form>

        {/* Quick actions - Enhanced design */}
        <div className="text-center mb-12">
          <p className="text-sm text-[var(--ecode-text-secondary)] mb-4 font-medium">
            Or try these popular examples:
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {quickActions.map((action) => {
              const IconComponent = iconMap[action.icon] || FileText;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action)}
                  className="h-10 px-5 gap-2 text-sm font-medium text-[var(--ecode-text-secondary)] border-[var(--ecode-border)] hover:bg-[var(--ecode-surface)] hover:border-[var(--ecode-accent)]/50 rounded-xl transition-all shadow-sm hover:shadow-md"
                >
                  <IconComponent className="h-4 w-4" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>



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
          
          {/* Search and Filter Bar */}
          <div className="flex items-center gap-3 mb-6">
            {/* Search input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ecode-text-secondary)]" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[var(--ecode-surface)] border border-[var(--ecode-border)] rounded-lg text-sm text-[var(--ecode-text)] placeholder:text-[var(--ecode-text-secondary)]/70 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
            
            {/* Filter buttons */}
            <div className="flex items-center gap-2 border-l pl-3">
              {projectTags.map(tag => (
                <Button
                  key={tag}
                  variant={filterTag === tag ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 px-3 text-xs capitalize"
                  onClick={() => setFilterTag(tag)}
                >
                  {tag === 'all' ? 'All' : tag}
                </Button>
              ))}
            </div>
            
            {/* View mode toggle */}
            <div className="flex items-center gap-1 border-l pl-3">
              <Button
                variant={viewMode === 'grid' ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
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
            // Grid view with enhanced cards
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <Card 
                  key={project.id}
                  className="group relative overflow-hidden bg-[var(--ecode-surface)] border border-[var(--ecode-border)] hover:border-violet-500/50 transition-all duration-300 cursor-pointer hover:shadow-lg"
                  onClick={() => {
                    const ownerUsername = project.owner?.username || user?.username || 'admin';
                    const projectUrl = project.slug ? `/@${ownerUsername}/${project.slug}` : `/project/${project.id}`;
                    navigate(projectUrl);
                  }}
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
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-[var(--ecode-text)] truncate">
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
                            const projectUrl = project.slug ? `/@${ownerUsername}/${project.slug}` : `/project/${project.id}`;
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
            // List view (existing style but enhanced)
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="group bg-[var(--ecode-surface)] border border-[var(--ecode-border)] hover:border-[var(--ecode-border-hover)] transition-colors cursor-pointer rounded-lg p-4"
                  onClick={() => {
                    // Navigate to the proper Replit-style URL format
                    const ownerUsername = project.owner?.username || user?.username || 'admin';
                    const projectUrl = project.slug ? `/@${ownerUsername}/${project.slug}` : `/project/${project.id}`;
                    navigate(projectUrl);
                  }}
                >
                  <div className="flex items-center gap-3">
                    {getProjectIcon(project)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-base text-[var(--ecode-text)]">
                        {project.name}
                      </h3>
                      <p className="text-sm text-[var(--ecode-text-secondary)]">
                        {getTimeAgo(project.updatedAt)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {project.isDeployed && (
                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm">Deployed</span>
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
                            const ownerUsername = project.owner?.username || user?.username || 'admin';
                            const projectUrl = project.slug ? `/@${ownerUsername}/${project.slug}` : `/project/${project.id}`;
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
    </div>
  );
}