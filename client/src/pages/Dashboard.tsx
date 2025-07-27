import React, { useState, useMemo } from 'react';
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
import { Progress } from '@/components/ui/progress';
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
  Crown,
  Github,
  BookOpen,
  Trophy,
  Bell,
  HardDrive,
  Pin,
  Coins,
  Calendar,
  Activity,
  Play,
  Pause,
  MoreHorizontal,
  Sparkles,
  School,
  UserPlus,
  Upload,
  Home,
  Check
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
  const [selectedTab, setSelectedTab] = useState('home');

  // Fetch recent projects
  const { data: recentProjects = [], isLoading: loadingRecent } = useQuery<Project[]>({
    queryKey: ['/api/projects/recent'],
    enabled: !!user,
  });

  // Fetch all projects to calculate statistics
  const { data: allProjects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
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

  // Mock data for additional features
  const pinnedProjects = recentProjects.slice(0, 2);
  const recentDeployments = [
    { id: 1, project: 'Portfolio Site', status: 'active', url: 'https://portfolio.e-code.app', time: '2 hours ago' },
    { id: 2, project: 'Blog Platform', status: 'building', url: null, time: '5 hours ago' },
  ];
  
  const learningProgress = {
    course: '100 Days of Code',
    day: 23,
    streak: 15,
    lastCompleted: 'Day 22: Async/Await',
    nextLesson: 'Day 23: Error Handling',
    progress: 23,
  };

  const storageUsed = 1.2; // GB
  const storageLimit = 5; // GB
  const cyclesBalance = 500;

  // Calculate real statistics from all projects
  const stats = useMemo(() => {
    const totalForks = allProjects.reduce((sum, project) => sum + (project.forks || 0), 0);
    const totalLikes = allProjects.reduce((sum, project) => sum + (project.likes || 0), 0);
    const totalViews = allProjects.reduce((sum, project) => sum + (project.views || 0), 0);
    
    return {
      forks: totalForks,
      likes: totalLikes,
      views: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews.toString()
    };
  }, [allProjects]);
  
  const announcements = [
    { id: 1, title: 'New AI Features Available', type: 'feature', time: '1 day ago' },
    { id: 2, title: 'Scheduled Maintenance', type: 'maintenance', time: '3 days ago' },
  ];

  const teams = [
    { id: 1, name: 'Web Dev Team', members: 5, role: 'owner' },
    { id: 2, name: 'Open Source Contributors', members: 128, role: 'member' },
  ];

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
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold text-[var(--ecode-text)]">Home</h1>
              {user?.username === 'admin' && (
                <Badge variant="secondary" className="bg-gradient-to-r from-orange-400 to-pink-400 text-white border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Hacker
                </Badge>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/github-import')}
                className="gap-2 border-[var(--ecode-border)] hover:bg-[var(--ecode-sidebar)]"
              >
                <Github className="h-4 w-4" />
                Import from GitHub
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ecode-muted)]" />
                <Input
                  placeholder="Search or run a command..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-96 pl-10 bg-[var(--ecode-sidebar)] border-[var(--ecode-border)] text-[var(--ecode-text)] placeholder:text-[var(--ecode-muted)]"
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
          
          {/* Tabs */}
          <div className="mt-4 flex items-center gap-1 border-b border-[var(--ecode-border)]">
            <Button
              variant="ghost"
              className={`px-4 py-2 rounded-t-md border-b-2 ${
                selectedTab === 'home' 
                  ? 'border-[var(--ecode-accent)] text-[var(--ecode-text)]' 
                  : 'border-transparent text-[var(--ecode-muted)] hover:text-[var(--ecode-text)]'
              }`}
              onClick={() => setSelectedTab('home')}
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Button
              variant="ghost"
              className={`px-4 py-2 rounded-t-md border-b-2 ${
                selectedTab === 'deployments' 
                  ? 'border-[var(--ecode-accent)] text-[var(--ecode-text)]' 
                  : 'border-transparent text-[var(--ecode-muted)] hover:text-[var(--ecode-text)]'
              }`}
              onClick={() => setSelectedTab('deployments')}
            >
              <Rocket className="h-4 w-4 mr-2" />
              Deployments
            </Button>
            <Button
              variant="ghost"
              className={`px-4 py-2 rounded-t-md border-b-2 ${
                selectedTab === 'teams' 
                  ? 'border-[var(--ecode-accent)] text-[var(--ecode-text)]' 
                  : 'border-transparent text-[var(--ecode-muted)] hover:text-[var(--ecode-text)]'
              }`}
              onClick={() => setSelectedTab('teams')}
            >
              <Users className="h-4 w-4 mr-2" />
              Teams
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {selectedTab === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-6">
              {/* Notifications/Announcements */}
              {announcements.length > 0 && (
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-[var(--ecode-border)] p-4">
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-[var(--ecode-accent)] mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-medium text-[var(--ecode-text)] mb-2">Latest Updates</h3>
                      <div className="space-y-2">
                        {announcements.map(announcement => (
                          <div key={announcement.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className={
                                announcement.type === 'feature' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'
                              }>
                                {announcement.type}
                              </Badge>
                              <span className="text-sm text-[var(--ecode-text)]">{announcement.title}</span>
                            </div>
                            <span className="text-xs text-[var(--ecode-muted)]">{announcement.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Agent Hero Section */}
              <div className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 rounded-lg border border-[var(--ecode-border)] p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-[var(--ecode-text)] mb-2">
                      Build apps instantly with AI Agent
                    </h3>
                    <p className="text-[var(--ecode-muted)] mb-4">
                      Just describe what you want to build in plain English. Our AI agent creates complete, working applications in seconds.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">No coding required</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Build in 30 seconds</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Production-ready code</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Try AI Agent Now
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => navigate('/ai-agent')}
                      >
                        Learn More
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Continue Learning */}
              <div className="bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)]">
                <div className="p-6 border-b border-[var(--ecode-border)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-[var(--ecode-accent)]" />
                      <h2 className="text-xl font-semibold text-[var(--ecode-text)]">Continue Learning</h2>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/learn')}>
                      View all courses
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="bg-[var(--ecode-sidebar)] rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-[var(--ecode-text)] flex items-center gap-2">
                          {learningProgress.course}
                          <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                            {learningProgress.streak} day streak!
                          </Badge>
                        </h3>
                        <p className="text-sm text-[var(--ecode-muted)] mt-1">Last completed: {learningProgress.lastCompleted}</p>
                      </div>
                      <Trophy className="h-8 w-8 text-yellow-500" />
                    </div>
                    <Progress value={learningProgress.progress} className="mb-4" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--ecode-muted)]">Day {learningProgress.day} of 100</span>
                      <Button 
                        size="sm" 
                        className="bg-[var(--ecode-accent)] hover:bg-[var(--ecode-accent-hover)] text-white"
                        onClick={() => navigate('/learn/100-days-of-code')}
                      >
                        Continue to {learningProgress.nextLesson}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pinned Projects */}
              {pinnedProjects.length > 0 && (
                <div className="bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)]">
                  <div className="p-6 border-b border-[var(--ecode-border)]">
                    <div className="flex items-center gap-2">
                      <Pin className="h-5 w-5 text-[var(--ecode-accent)]" />
                      <h2 className="text-xl font-semibold text-[var(--ecode-text)]">Pinned</h2>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {pinnedProjects.map((project: any) => (
                        <div 
                          key={project.id}
                          className="group bg-[var(--ecode-sidebar)] rounded-lg p-4 hover:bg-[var(--ecode-sidebar-hover)] cursor-pointer transition-all border border-transparent hover:border-[var(--ecode-accent)]"
                          onClick={() => navigate(`/project/${project.id}`)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-[var(--ecode-text)] group-hover:text-[var(--ecode-accent)]">
                              {project.name}
                            </h3>
                            <Pin className="h-4 w-4 text-[var(--ecode-muted)]" />
                          </div>
                          <p className="text-sm text-[var(--ecode-muted)] mb-3">
                            {project.description || 'No description'}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-[var(--ecode-muted)]">
                            <span className={`h-2 w-2 rounded-full ${getLanguageColor(project.language)}`} />
                            <span>{project.language}</span>
                            <span>•</span>
                            <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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

              {/* Recent Deployments */}
              <div className="bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)]">
                <div className="p-6 border-b border-[var(--ecode-border)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Rocket className="h-5 w-5 text-[var(--ecode-accent)]" />
                      <h2 className="text-xl font-semibold text-[var(--ecode-text)]">Recent Deployments</h2>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/deployments')}>
                      View all
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {recentDeployments.map(deployment => (
                      <div key={deployment.id} className="flex items-center justify-between p-3 bg-[var(--ecode-sidebar)] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${
                            deployment.status === 'active' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                          }`} />
                          <div>
                            <h4 className="font-medium text-[var(--ecode-text)]">{deployment.project}</h4>
                            <p className="text-sm text-[var(--ecode-muted)]">
                              {deployment.status === 'active' ? deployment.url : 'Building...'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-[var(--ecode-muted)]">{deployment.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Trending Projects */}
              <div className="bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)]">
                <div className="p-6 border-b border-[var(--ecode-border)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[var(--ecode-accent)]" />
                      <h2 className="text-xl font-semibold text-[var(--ecode-text)]">Trending</h2>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/explore')}>
                      Explore
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {trendingRepls.map((repl) => (
                      <div 
                        key={repl.id} 
                        className="group cursor-pointer hover:bg-[var(--ecode-sidebar)] p-3 rounded-lg transition-all"
                        onClick={() => navigate(`/project/${repl.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-[var(--ecode-accent)] text-white">
                                {repl.author.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-medium text-[var(--ecode-text)] group-hover:text-[var(--ecode-accent)]">
                                {repl.name}
                              </h4>
                              <p className="text-sm text-[var(--ecode-muted)] mb-1">by {repl.author}</p>
                              <p className="text-sm text-[var(--ecode-muted)] line-clamp-2">{repl.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-[var(--ecode-muted)]">
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  {repl.stars}
                                </span>
                                <span className="flex items-center gap-1">
                                  <GitFork className="h-3 w-3" />
                                  {repl.forks}
                                </span>
                                <span className={`h-2 w-2 rounded-full ${getLanguageColor(repl.language)}`} />
                                <span>{repl.language}</span>
                                <span>•</span>
                                <span>{repl.lastUpdated}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
          <div className="lg:col-span-4 space-y-4">
            {/* Cycles & Storage */}
            <div className="bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--ecode-text)] mb-4">Account Overview</h3>
              
              {/* Cycles Balance */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-[var(--ecode-text)]">Cycles</span>
                  </div>
                  <span className="text-sm font-bold text-[var(--ecode-text)]">{cyclesBalance}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full border-yellow-500/20 hover:bg-yellow-500/10"
                  onClick={() => navigate('/cycles')}
                >
                  Get more Cycles
                </Button>
              </div>

              {/* Storage Usage */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-[var(--ecode-text)]">Storage</span>
                  </div>
                  <span className="text-sm text-[var(--ecode-muted)]">{storageUsed}GB / {storageLimit}GB</span>
                </div>
                <Progress value={(storageUsed / storageLimit) * 100} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--ecode-border)]">
                <div className="text-center">
                  <div className="text-xl font-bold text-[var(--ecode-accent)]">{recentProjects.length}</div>
                  <div className="text-xs text-[var(--ecode-muted)]">Repls</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-[var(--ecode-accent)]">2</div>
                  <div className="text-xs text-[var(--ecode-muted)]">Active</div>
                </div>
              </div>
            </div>

            {/* Your Teams */}
            <div className="bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)]">
              <div className="p-6 border-b border-[var(--ecode-border)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--ecode-text)] flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Your Teams
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/teams/create')}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {teams.map(team => (
                    <div 
                      key={team.id}
                      className="flex items-center justify-between p-3 bg-[var(--ecode-sidebar)] rounded-lg hover:bg-[var(--ecode-sidebar-hover)] cursor-pointer transition-all"
                      onClick={() => navigate(`/teams/${team.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                          {team.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-[var(--ecode-text)]">{team.name}</h4>
                          <p className="text-xs text-[var(--ecode-muted)]">{team.members} members • {team.role}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[var(--ecode-muted)]" />
                    </div>
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full mt-3 text-[var(--ecode-accent)]"
                  onClick={() => navigate('/teams')}
                >
                  View all teams
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--ecode-text)] mb-4">Your Activity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-[var(--ecode-sidebar)] rounded-lg">
                  <div className="text-2xl font-bold text-[var(--ecode-accent)]">{allProjects.length}</div>
                  <div className="text-xs text-[var(--ecode-muted)]">Creations</div>
                </div>
                <div className="text-center p-3 bg-[var(--ecode-sidebar)] rounded-lg">
                  <div className="text-2xl font-bold text-[var(--ecode-accent)]">{stats.forks}</div>
                  <div className="text-xs text-[var(--ecode-muted)]">Remixes</div>
                </div>
                <div className="text-center p-3 bg-[var(--ecode-sidebar)] rounded-lg">
                  <div className="text-2xl font-bold text-[var(--ecode-accent)]">{stats.likes}</div>
                  <div className="text-xs text-[var(--ecode-muted)]">Likes</div>
                </div>
                <div className="text-center p-3 bg-[var(--ecode-sidebar)] rounded-lg">
                  <div className="text-2xl font-bold text-[var(--ecode-accent)]">{stats.views}</div>
                  <div className="text-xs text-[var(--ecode-muted)]">Views</div>
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
        )}

        {/* Deployments Tab */}
        {selectedTab === 'deployments' && (
          <div className="space-y-6">
            <div className="bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-[var(--ecode-text)]">Your Deployments</h2>
                  <Button 
                    className="bg-[var(--ecode-accent)] hover:bg-[var(--ecode-accent-hover)] text-white"
                    onClick={() => navigate('/deployments')}
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    New Deployment
                  </Button>
                </div>
                {recentDeployments.length > 0 ? (
                  <div className="space-y-4">
                    {recentDeployments.map(deployment => (
                      <div key={deployment.id} className="bg-[var(--ecode-sidebar)] rounded-lg p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-medium text-[var(--ecode-text)] mb-2">{deployment.project}</h3>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${
                                  deployment.status === 'active' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                                }`} />
                                <span className={deployment.status === 'active' ? 'text-green-500' : 'text-yellow-500'}>
                                  {deployment.status === 'active' ? 'Active' : 'Building'}
                                </span>
                              </div>
                              {deployment.url && (
                                <a href={deployment.url} target="_blank" rel="noopener noreferrer" className="text-[var(--ecode-accent)] hover:underline">
                                  {deployment.url}
                                </a>
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-[var(--ecode-muted)]">{deployment.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Rocket className="h-16 w-16 mx-auto text-[var(--ecode-muted)] mb-4" />
                    <h3 className="text-lg font-medium text-[var(--ecode-text)] mb-2">No deployments yet</h3>
                    <p className="text-[var(--ecode-muted)] mb-6">Deploy your first project to see it here</p>
                    <Button onClick={() => navigate('/deployments')}>
                      Learn about Deployments
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Teams Tab */}
        {selectedTab === 'teams' && (
          <div className="space-y-6">
            <div className="bg-[var(--ecode-surface)] rounded-lg border border-[var(--ecode-border)]">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-[var(--ecode-text)]">Your Teams</h2>
                  <Button 
                    className="bg-[var(--ecode-accent)] hover:bg-[var(--ecode-accent-hover)] text-white"
                    onClick={() => navigate('/teams/create')}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Team
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map(team => (
                    <Card 
                      key={team.id}
                      className="hover:border-[var(--ecode-accent)] cursor-pointer transition-all"
                      onClick={() => navigate(`/teams/${team.id}`)}
                    >
                      <CardHeader>
                        <div className="w-12 h-12 rounded bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold mb-3">
                          {team.name.charAt(0)}
                        </div>
                        <CardTitle>{team.name}</CardTitle>
                        <CardDescription>{team.members} members • {team.role}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="ghost" className="w-full">
                          View Team <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  <Card 
                    className="border-dashed hover:border-[var(--ecode-accent)] cursor-pointer transition-all"
                    onClick={() => navigate('/teams/create')}
                  >
                    <CardContent className="flex flex-col items-center justify-center h-full py-12">
                      <UserPlus className="h-12 w-12 text-[var(--ecode-muted)] mb-4" />
                      <p className="text-sm font-medium text-[var(--ecode-text)]">Create a new team</p>
                      <p className="text-xs text-[var(--ecode-muted)] mt-1">Collaborate with others</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
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