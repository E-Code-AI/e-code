import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  List
} from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { CreateProjectModal } from '@/components/CreateProjectModal';

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch recent projects
  const { data: recentProjects = [], isLoading: loadingRecent } = useQuery({
    queryKey: ['/api/projects/recent'],
    enabled: !!user,
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
    <div className="min-h-screen bg-background pb-14 md:pb-0">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container-responsive py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-responsive-lg font-bold">Dashboard</h1>
              <Badge variant="secondary" className="gap-1">
                <Zap className="h-3 w-3" />
                <span className="hidden sm:inline">Pro</span>
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-10"
                />
              </div>
              <Button 
                onClick={() => setIsCreateModalOpen(true)} 
                className="gap-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                <span className="sm:inline">Create Project</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-responsive py-responsive">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Projects */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Projects</CardTitle>
                    <CardDescription>Things you've been working on recently</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewMode('grid')}
                      className={viewMode === 'grid' ? 'bg-accent' : ''}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewMode('list')}
                      className={viewMode === 'list' ? 'bg-accent' : ''}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingRecent ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent" />
                  </div>
                ) : recentProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <Code2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No recent projects</p>
                    <Button 
                      onClick={() => setIsCreateModalOpen(true)} 
                      className="mt-4"
                      variant="outline"
                    >
                      Start your first project
                    </Button>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4' : 'space-y-3'}>
                    {recentProjects.map((project: any) => (
                      <Card 
                        key={project.id} 
                        className="cursor-pointer hover:shadow-md transition-all"
                        onClick={() => navigate(`/project/${project.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold">{project.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {project.description || 'No description'}
                              </p>
                            </div>
                            <Badge variant="secondary" className={`ml-2 ${getLanguageColor(project.language)}`}>
                              {project.language}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {project.updatedAt}
                            </span>
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {project.visibility || 'Private'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trending Repls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Popular Projects
                </CardTitle>
                <CardDescription>See what others are creating</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trendingRepls.map((repl) => (
                    <div key={repl.id} className="flex items-start gap-3 p-3 hover:bg-accent/50 cursor-pointer">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                        <AvatarImage src={repl.avatar || undefined} />
                        <AvatarFallback>{repl.author[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-responsive-sm truncate">{repl.name}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">by {repl.author}</p>
                            <p className="text-xs sm:text-sm mt-1 line-clamp-2">{repl.description}</p>
                          </div>
                          <Badge variant="secondary" className={`${getLanguageColor(repl.language)} flex-shrink-0 text-xs`}>
                            {repl.language}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {repl.stars} likes
                          </span>
                          <span className="flex items-center gap-1">
                            <GitFork className="h-3 w-3" />
                            {repl.forks} remixes
                          </span>
                          <span className="hidden sm:inline">{repl.lastUpdated}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Your Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{recentProjects.length}</div>
                    <div className="text-xs text-muted-foreground">Your Projects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-xs text-muted-foreground">Friends</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">45</div>
                    <div className="text-xs text-muted-foreground">Total Likes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">8</div>
                    <div className="text-xs text-muted-foreground">Shared Projects</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Community Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {activityFeed.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 text-sm">
                        <div className={`mt-0.5 ${
                          activity.type === 'star' ? 'text-yellow-500' :
                          activity.type === 'fork' ? 'text-blue-500' :
                          activity.type === 'comment' ? 'text-green-500' :
                          'text-purple-500'
                        }`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <p>
                            <span className="font-semibold">{activity.user}</span>
                            {' '}{activity.action}{' '}
                            <span className="font-semibold">{activity.target}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

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
      />
    </div>
  );
}