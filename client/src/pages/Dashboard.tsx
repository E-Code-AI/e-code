import React, { useState, useRef, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Project } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, CheckCircle2, Clock, Code2,
  Sparkles, Plus, Github, BookMarked, FileText,
  Loader2, Sun, Moon, Sunrise, Coffee, Search, Edit, Play, ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ECodeLoading } from '@/components/ECodeLoading';
import { getProjectUrl, cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { TABLET_GRID_CLASSES } from '@shared/responsive-config';
import { apiRequest } from '@/lib/queryClient';
import { AIModelSelector } from '@/components/ai/AIModelSelector';

// Get personalized greeting based on time of day
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'Good night', icon: Moon };
  if (hour < 12) return { text: 'Good morning', icon: Sunrise };
  if (hour < 18) return { text: 'Good afternoon', icon: Sun };
  return { text: 'Good evening', icon: Coffee };
}

// Get project icon based on project details
function getProjectIcon(project: Project) {
  const colors = [
    'bg-gradient-to-br from-orange-500 to-yellow-500',
    'bg-gradient-to-br from-orange-600 to-red-500',
    'bg-gradient-to-br from-yellow-500 to-orange-600',
    'bg-gradient-to-br from-green-500 to-emerald-600',
  ];
  const bgColor = colors[project.id.charCodeAt(0) % colors.length];
  const firstLetter = project.name.charAt(0).toUpperCase();

  return (
    <div className={`${bgColor} w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold text-lg shadow-lg`}>
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
  owner?: {
    id: number;
    username: string;
    email: string;
  };
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [aiPrompt, setAiPrompt] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const greeting = getGreeting();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Fetch recent projects
  const { data: recentProjects = [], isLoading } = useQuery<ProjectWithDeployment[]>({
    queryKey: ['/api/projects'],
    enabled: !!user,
    select: (data) => data.slice(0, 12), // Show up to 12 recent projects
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!aiPrompt.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a project description.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // Use Fortune 500-grade workspace bootstrap endpoint
      // This orchestrates project creation + agent session + auto-start workflow
      const response = await apiRequest('POST', '/api/workspace/bootstrap', {
        prompt: aiPrompt,
        options: {
          language: 'typescript',
          framework: 'react',
          autoStart: true,
          visibility: 'private'
        }
      }) as any;

      // Redirect to IDE with bootstrap token (agent auto-starts via WebSocket)
      console.log('🎯 [Dashboard] Redirecting to IDE with bootstrap token:', response.bootstrapToken?.substring(0, 20) + '...');
      console.log('🎯 [Dashboard] Full response:', { projectId: response.projectId, sessionId: response.sessionId, hasToken: !!response.bootstrapToken });
      navigate(`/ide/${response.projectId}?bootstrap=${response.bootstrapToken}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const quickActions = [
    {
      icon: Plus,
      title: 'Create New Project',
      description: 'Start from scratch',
      action: () => inputRef.current?.focus()
    },
    {
      icon: Github,
      title: 'Import from GitHub',
      description: 'Clone repository',
      action: () => navigate('/github-import')
    },
    {
      icon: BookMarked,
      title: 'Browse Templates',
      description: 'Start with template',
      action: () => navigate('/templates')
    },
    {
      icon: FileText,
      title: 'Documentation',
      description: 'Learn the platform',
      action: () => navigate('/docs')
    },
  ];

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return recentProjects;
    return recentProjects.filter(project =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [recentProjects, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative h-full min-h-[calc(100vh-200px)]">
            <div className="absolute inset-0 flex items-center justify-center">
              <ECodeLoading size="lg" text="Loading your dashboard..." />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header with AI Prompt */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 p-6 md:p-8 text-white shadow-lg"
        >
          <div className="flex items-center gap-3 mb-3">
            <greeting.icon className="h-8 w-8" />
            <h1 className="text-2xl md:text-3xl font-bold">
              {greeting.text}, {user?.displayName || user?.username || 'Developer'}!
            </h1>
          </div>
          <p className="text-white/90 mb-4">
            What would you like to build today?
          </p>

          {/* AI Model Selection */}
          <div className="mb-4">
            <AIModelSelector variant="inline" />
          </div>

          {/* AI Prompt Input */}
          <form onSubmit={handleCreateProject} className="max-w-2xl">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe your app idea in natural language..."
                className="flex-1 px-4 py-3 rounded-lg bg-white/20 backdrop-blur-md text-white placeholder:text-white/70 border border-white/30 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                data-testid="input-ai-prompt"
              />
              <Button
                type="submit"
                size="lg"
                disabled={!aiPrompt.trim() || isCreating}
                className="bg-white text-orange-600 hover:bg-white/90 font-semibold"
                data-testid="button-create-project"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Build
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className={`grid ${TABLET_GRID_CLASSES.quickActionsTabletOptimized} gap-4`}>
            {quickActions.map((action) => (
              <Card
                key={action.title}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={action.action}
                data-testid={`action-${action.title.toLowerCase().replace(/\s/g, '-')}`}
              >
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <action.icon className="h-8 w-8 mb-3 text-orange-500" />
                  <h3 className="font-medium text-sm mb-1">{action.title}</h3>
                  <p className="text-xs text-muted-foreground hidden md:block">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold">Your Projects ({recentProjects.length})</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  data-testid="input-search-projects"
                />
              </div>
              {recentProjects.length > 12 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/projects')}
                  data-testid="button-view-all"
                >
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className={`grid ${TABLET_GRID_CLASSES.projectsTabletOptimized} gap-4`}>
              {[1, 2, 3, 4].map((n) => (
                <Card key={n}>
                  <Skeleton className="aspect-video" />
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5" />
                    <Skeleton className="h-3" />
                    <Skeleton className="h-3 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Code2 className="h-12 w-12 mx-auto mb-4 text-orange-500" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No projects found matching your search.' : 'No projects yet. Create your first one!'}
              </p>
            </Card>
          ) : (
            <div className={`grid ${TABLET_GRID_CLASSES.projectsTabletOptimized} gap-4`}>
              <AnimatePresence>
                {filteredProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card
                      className="cursor-pointer hover:shadow-lg transition-shadow group"
                      onClick={() => {
                        navigate(`/ide/${project.id}`);
                      }}
                      data-testid={`project-card-${project.id}`}
                    >
                      {/* Project Icon/Preview */}
                      <div className="aspect-video relative bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/20 dark:to-amber-950/20 flex items-center justify-center">
                        {getProjectIcon(project)}
                        {project.isDeployed && (
                          <Badge className="absolute top-2 right-2 bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Live
                          </Badge>
                        )}
                        <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">
                          {project.language || 'JavaScript'}
                        </Badge>
                      </div>

                      <CardContent className="p-4">
                        <h3 className="font-semibold truncate mb-1 group-hover:text-orange-500 transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {project.description || 'No description'}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(project.updatedAt)}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0" 
                              data-testid={`button-open-${project.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/ide/${project.id}`);
                              }}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                const projectUrl = getProjectUrl(project, user?.username);
                                navigate(projectUrl);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
