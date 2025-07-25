import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Project } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  TrendingUp, 
  Clock, 
  Star, 
  GitFork,
  MessageSquare,
  Users,
  Zap,
  Globe,
  Code2,
  Rocket,
  Search,
  Filter,
  Grid3X3,
  List,
  Eye,
  EyeOff,
  ChevronRight,
  Crown
} from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { ECodeLoading } from '@/components/ECodeLoading';

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch recent projects
  const { data: recentProjects = [], isLoading: loadingRecent } = useQuery<Project[]>({
    queryKey: ['/api/projects/recent'],
    enabled: !!user,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest('POST', '/api/projects', {
        name,
        language: 'javascript',
        visibility: 'private',
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects/recent'] });
      setIsCreateModalOpen(false);
      navigate(`/project/${data.id}`);
    },
  });

  // Fetch trending projects (mock data for now)
  const trendingRepls = [
    {
      id: 1,
      name: 'My First Website',
      author: 'alex_beginner',
      language: 'HTML',
      stars: 342,
      forks: 89,
      description: 'A colorful personal website I made to share my hobbies',
      lastUpdated: '2 hours ago',
      avatar: null,
    },
    {
      id: 2,
      name: 'Fun Drawing App',
      author: 'creative_sarah',
      language: 'JavaScript',
      stars: 567,
      forks: 123,
      description: 'Draw and paint right in your browser - super easy to use!',
      lastUpdated: '5 hours ago',
      avatar: null,
    },
    {
      id: 3,
      name: 'Daily Journal',
      author: 'mindful_mike',
      language: 'Python',
      stars: 234,
      forks: 45,
      description: 'A simple app to write and save your daily thoughts',
      lastUpdated: '1 day ago',
      avatar: null,
    },
  ];

  // Community activity feed (mock data)
  const activityFeed = [
    {
      id: 1,
      type: 'remix',
      user: 'sarah_learner',
      action: 'remixed',
      target: 'Birthday Card Maker',
      time: '10 minutes ago',
    },
    {
      id: 2,
      type: 'like',
      user: 'creative_mike',
      action: 'liked',
      target: 'Story Writing Helper',
      time: '25 minutes ago',
    },
    {
      id: 3,
      type: 'comment',
      user: 'helpful_emma',
      action: 'gave feedback on',
      target: 'Recipe Organizer',
      time: '1 hour ago',
    },
    {
      id: 4,
      type: 'share',
      user: 'proud_parent',
      action: 'shared',
      target: 'Kids Math Game',
      time: '2 hours ago',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'remix': return <GitFork className="h-4 w-4" />;
      case 'like': return <Star className="h-4 w-4" />;
      case 'comment': return <MessageSquare className="h-4 w-4" />;
      case 'share': return <Rocket className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      'JavaScript': 'bg-yellow-500',
      'TypeScript': 'bg-blue-500',
      'Python': 'bg-green-500',
      'Java': 'bg-orange-500',
      'Go': 'bg-cyan-500',
      'Rust': 'bg-red-500',
      'C++': 'bg-purple-500',
      'Ruby': 'bg-pink-500',
    };
    return colors[language] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-[var(--ecode-background)]">
      {/* Replit-style Dashboard Header */}
      <div className="border-b border-[var(--ecode-border)] bg-[var(--ecode-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-semibold text-[var(--ecode-text)]">Home</h1>
              {user?.username === 'admin' && (
                <Badge variant="outline" className="border-[var(--ecode-accent)] text-[var(--ecode-accent)]">
                  <Crown className="h-3 w-3 mr-1" />
                  Pro
                </Badge>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ecode-muted)]" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-80 pl-10 bg-[var(--ecode-sidebar)] border-[var(--ecode-border)] text-[var(--ecode-text)] placeholder:text-[var(--ecode-muted)]"
                />
              </div>
              <Button 
                onClick={() => setIsCreateModalOpen(true)} 
                className="gap-2 bg-[var(--ecode-accent)] hover:bg-[var(--ecode-accent-hover)] text-white"
              >
                <Plus className="h-4 w-4" />
                Create Repl
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Projects */}
            <div className="bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)]">
              <div className="p-6 border-b border-[var(--ecode-border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--ecode-text)]">Recent</h2>
                    <p className="text-sm text-[var(--ecode-muted)] mt-1">Pick up where you left off</p>
                  </div>
                  <div className="flex items-center gap-1 bg-[var(--ecode-sidebar)] rounded-md p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={`h-8 px-3 ${viewMode === 'grid' ? 'bg-[var(--ecode-background)] shadow-sm' : ''}`}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={`h-8 px-3 ${viewMode === 'list' ? 'bg-[var(--ecode-background)] shadow-sm' : ''}`}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {loadingRecent ? (
                  <div className="flex items-center justify-center py-12">
                    <ECodeLoading size="md" text="Loading recent projects..." />
                  </div>
                ) : recentProjects.length === 0 ? (
                  <div className="text-center py-12">
                    <Code2 className="h-16 w-16 mx-auto text-[var(--ecode-muted)] mb-4" />
                    <h3 className="text-lg font-medium text-[var(--ecode-text)] mb-2">No projects yet</h3>
                    <p className="text-[var(--ecode-muted)] mb-6">Create your first project to get started</p>
                    <Button 
                      onClick={() => setIsCreateModalOpen(true)} 
                      className="bg-[var(--ecode-accent)] hover:bg-[var(--ecode-accent-hover)] text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create your first Repl
                    </Button>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-3'}>
                    {recentProjects.map((project: any) => (
                      <div 
                        key={project.id} 
                        className="group bg-[var(--ecode-sidebar)] rounded-lg p-4 hover:bg-[var(--ecode-sidebar-hover)] cursor-pointer transition-all border border-transparent hover:border-[var(--ecode-border)]"
                        onClick={() => navigate(`/project/${project.id}`)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-[var(--ecode-text)] group-hover:text-[var(--ecode-accent)] transition-colors truncate">
                              {project.name}
                            </h3>
                            <p className="text-sm text-[var(--ecode-muted)] mt-1 line-clamp-2">
                              {project.description || 'No description'}
                            </p>
                          </div>
                          <div className={`h-2 w-2 rounded-full ml-3 mt-1.5 ${getLanguageColor(project.language)}`} />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[var(--ecode-muted)]">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            {project.visibility === 'private' ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            {project.visibility || 'private'}
                          </span>
                          <span className="text-[var(--ecode-muted)]">
                            {project.language}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Explore Templates */}
            <div className="bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)]">
              <div className="p-6 border-b border-[var(--ecode-border)]">
                <h2 className="text-xl font-semibold text-[var(--ecode-text)]">Start with a template</h2>
                <p className="text-sm text-[var(--ecode-muted)] mt-1">Jumpstart your next project</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto flex-col p-4 border-[var(--ecode-border)] hover:bg-[var(--ecode-sidebar)] hover:border-[var(--ecode-accent)]"
                    onClick={() => navigate('/templates')}
                  >
                    <Globe className="h-8 w-8 mb-2 text-[var(--ecode-accent)]" />
                    <span className="text-sm font-medium">Website</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col p-4 border-[var(--ecode-border)] hover:bg-[var(--ecode-sidebar)] hover:border-[var(--ecode-accent)]"
                    onClick={() => navigate('/templates')}
                  >
                    <Zap className="h-8 w-8 mb-2 text-yellow-500" />
                    <span className="text-sm font-medium">Game</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col p-4 border-[var(--ecode-border)] hover:bg-[var(--ecode-sidebar)] hover:border-[var(--ecode-accent)]"
                    onClick={() => navigate('/templates')}
                  >
                    <MessageSquare className="h-8 w-8 mb-2 text-green-500" />
                    <span className="text-sm font-medium">Chat App</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto flex-col p-4 border-[var(--ecode-border)] hover:bg-[var(--ecode-sidebar)] hover:border-[var(--ecode-accent)]"
                    onClick={() => navigate('/templates')}
                  >
                    <Rocket className="h-8 w-8 mb-2 text-purple-500" />
                    <span className="text-sm font-medium">API</span>
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full mt-4 text-[var(--ecode-accent)] hover:bg-[var(--ecode-sidebar)]"
                  onClick={() => navigate('/templates')}
                >
                  Browse all templates
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Stats */}
            <div className="bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--ecode-text)] mb-4">Your Activity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-[var(--ecode-sidebar)] rounded-lg">
                  <div className="text-2xl font-bold text-[var(--ecode-accent)]">{recentProjects.length}</div>
                  <div className="text-xs text-[var(--ecode-muted)]">Projects</div>
                </div>
                <div className="text-center p-3 bg-[var(--ecode-sidebar)] rounded-lg">
                  <div className="text-2xl font-bold text-[var(--ecode-accent)]">47</div>
                  <div className="text-xs text-[var(--ecode-muted)]">Likes</div>
                </div>
                <div className="text-center p-3 bg-[var(--ecode-sidebar)] rounded-lg">
                  <div className="text-2xl font-bold text-[var(--ecode-accent)]">12</div>
                  <div className="text-xs text-[var(--ecode-muted)]">Followers</div>
                </div>
                <div className="text-center p-3 bg-[var(--ecode-sidebar)] rounded-lg">
                  <div className="text-2xl font-bold text-[var(--ecode-accent)]">8</div>
                  <div className="text-xs text-[var(--ecode-muted)]">Following</div>
                </div>
              </div>
            </div>

            {/* Community Feed */}
            <div className="bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)]">
              <div className="p-6 border-b border-[var(--ecode-border)]">
                <h3 className="text-lg font-semibold text-[var(--ecode-text)] flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Community Feed
                </h3>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="p-6 space-y-4">
                  {activityFeed.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`mt-1 ${
                        activity.type === 'like' ? 'text-pink-500' :
                        activity.type === 'remix' ? 'text-blue-500' :
                        activity.type === 'comment' ? 'text-green-500' :
                        'text-purple-500'
                      }`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm text-[var(--ecode-text)]">
                          <span className="font-medium hover:text-[var(--ecode-accent)] cursor-pointer">
                            {activity.user}
                          </span>
                          {' '}{activity.action}{' '}
                          <span className="font-medium hover:text-[var(--ecode-accent)] cursor-pointer">
                            {activity.target}
                          </span>
                        </p>
                        <p className="text-xs text-[var(--ecode-muted)]">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => navigate('/explore')}
                  >
                    <Globe className="h-4 w-4" />
                    Explore Community
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => navigate('/teams')}
                  >
                    <Users className="h-4 w-4" />
                    My Teams
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start gap-2"
                    onClick={() => navigate('/deployments')}
                  >
                    <Rocket className="h-4 w-4" />
                    Deployments
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(name) => createProjectMutation.mutate(name)}
        isLoading={createProjectMutation.isPending}
      />
    </div>
  );
}