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
  const bgColor = colors[project.id % colors.length];
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
    select: (data) => {
      // Sort by most recent first (updatedAt descending)
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(b.updatedAt).getTime();
        const dateB = new Date(a.updatedAt).getTime();
        return dateA - dateB;
      });
      return sorted.slice(0, 12); // Show up to 12 recent projects
    },
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
    <div className="min-h-screen bg-[var(--ecode-background)] p-4 md:p-6 lg:p-8" style={{ fontFamily: 'var(--ecode-font-sans)' }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Header with AI Prompt - E-Code Branded */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="relative rounded-2xl overflow-hidden"
          style={{ 
            background: 'linear-gradient(135deg, #F26207 0%, #FF8534 50%, #F99D25 100%)',
            boxShadow: '0 8px 32px -8px rgba(242, 98, 7, 0.4)'
          }}
        >
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          
          <div className="relative p-6 md:p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <greeting.icon className="h-6 w-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {greeting.text}, {user?.displayName || user?.username || 'Developer'}!
              </h1>
            </div>
            <p className="text-white/90 mb-5 text-lg">
              What would you like to build today?
            </p>

            {/* AI Model Selection */}
            <div className="mb-5">
              <AIModelSelector variant="inline" />
            </div>

            {/* AI Prompt Input - E-Code Styled */}
            <form onSubmit={handleCreateProject} className="max-w-2xl">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={isMobile ? "Describe your app..." : "Describe your app idea in natural language..."}
                  className="flex-1 px-5 py-3.5 rounded-xl bg-white/15 backdrop-blur-md text-white placeholder:text-white/60 border border-white/25 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/25 text-base transition-all duration-200"
                  style={{ fontFamily: 'var(--ecode-font-sans)' }}
                  data-testid="input-ai-prompt"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={!aiPrompt.trim() || isCreating}
                  className="bg-white text-[#F26207] hover:bg-white/95 font-semibold h-12 sm:h-auto w-full sm:w-auto px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
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
                      Build with AI
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Quick Actions - E-Code Styled */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-[var(--ecode-text)]">Quick Actions</h2>
          <div className={`grid ${TABLET_GRID_CLASSES.quickActionsTabletOptimized} gap-4`}>
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <Card
                  className="cursor-pointer group border border-[var(--ecode-border)] bg-[var(--ecode-surface)] hover:border-[#F26207]/30 hover:shadow-[0_4px_16px_-4px_rgba(242,98,7,0.15)] transition-all duration-200"
                  onClick={action.action}
                  data-testid={`action-${action.title.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="p-3 rounded-xl bg-[#F26207]/10 group-hover:bg-[#F26207]/15 transition-colors mb-3">
                      <action.icon className="h-6 w-6 text-[#F26207]" />
                    </div>
                    <h3 className="font-medium text-sm mb-1 text-[var(--ecode-text)] group-hover:text-[#F26207] transition-colors">{action.title}</h3>
                    <p className="text-xs text-[var(--ecode-text-muted)] hidden md:block">{action.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Projects - E-Code Styled */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-[var(--ecode-text)]">Your Projects ({recentProjects.length})</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ecode-text-muted)]" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2.5 min-h-[44px] text-sm border border-[var(--ecode-border)] rounded-xl bg-[var(--ecode-surface)] focus:outline-none focus:ring-2 focus:ring-[#F26207]/20 focus:border-[#F26207]/40 transition-all duration-200"
                  style={{ fontFamily: 'var(--ecode-font-sans)' }}
                  data-testid="input-search-projects"
                />
              </div>
              {recentProjects.length > 12 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] border-[var(--ecode-border)] hover:border-[#F26207]/40 hover:text-[#F26207] transition-colors rounded-xl"
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
            <Card className="p-12 text-center border-dashed border-[var(--ecode-border)] bg-[var(--ecode-surface)]">
              <div className="p-4 rounded-2xl bg-[#F26207]/10 w-fit mx-auto mb-4">
                <Code2 className="h-10 w-10 text-[#F26207]" />
              </div>
              <p className="text-[var(--ecode-text-muted)]">
                {searchQuery ? 'No projects found matching your search.' : 'No projects yet. Create your first one!'}
              </p>
            </Card>
          ) : (
            <div className={`grid ${TABLET_GRID_CLASSES.projectsTabletOptimized} gap-4`}>
              <AnimatePresence>
                {filteredProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                  >
                    <Card
                      className="cursor-pointer group border border-[var(--ecode-border)] bg-[var(--ecode-surface)] hover:border-[#F26207]/30 hover:shadow-[0_8px_24px_-8px_rgba(242,98,7,0.2)] transition-all duration-200 overflow-hidden"
                      onClick={() => {
                        navigate(`/ide/${project.id}`);
                      }}
                      data-testid={`project-card-${project.id}`}
                    >
                      {/* Project Icon/Preview */}
                      <div className="aspect-video relative bg-gradient-to-br from-[#F26207]/5 to-[#F99D25]/10 flex items-center justify-center">
                        {getProjectIcon(project)}
                        {project.isDeployed && (
                          <Badge className="absolute top-2 right-2 bg-emerald-500 text-white border-0 shadow-sm">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Live
                          </Badge>
                        )}
                        <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs bg-[var(--ecode-surface)] text-[var(--ecode-text-muted)] border border-[var(--ecode-border)]">
                          {project.language || 'JavaScript'}
                        </Badge>
                      </div>

                      <CardContent className="p-4">
                        <h3 className="font-semibold truncate mb-1 text-[var(--ecode-text)] group-hover:text-[#F26207] transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-sm text-[var(--ecode-text-muted)] mb-3 line-clamp-2">
                          {project.description || 'No description'}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[var(--ecode-text-muted)] flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(project.updatedAt)}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 hover:bg-[#F26207]/10 hover:text-[#F26207]" 
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
                              className="h-8 w-8 p-0 hover:bg-[#F26207]/10 hover:text-[#F26207]"
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
