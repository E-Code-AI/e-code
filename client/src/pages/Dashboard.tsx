// @ts-nocheck
import React, { useState, useRef, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Project } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  BookOpen, MoreHorizontal, Send, Paperclip, X, ChevronRight, ExternalLink,
  CheckCircle2, Edit, Copy, Trash, Search, Clock, Eye, Users, Share2, Code2,
  Folder, GitBranch, Star, Grid3x3, List, Sparkles, Rocket, Store, Bot,
  Briefcase, ListTodo, CloudSun, TrendingUp, TrendingDown, Activity, HardDrive,
  Zap, Plus, Github, FileText, BookMarked, Settings, ArrowUpRight, Download,
  Upload, Database, Cpu, Timer, AlertCircle, Sun, Moon, Sunrise, Coffee, Play,
  Pause, StopCircle, GitCommit, GitPullRequest, Package, Terminal, Shield,
  BarChart3, PieChartIcon, Layers, Server
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
import { Progress } from '@/components/ui/progress';
import { getProjectUrl, cn } from '@/lib/utils';
import { PageHeader, PageShell } from '@/components/layout/PageShell';
import analyticsImagePath from '@assets/stock_images/data_analytics_dashb_76f0a2c7.jpg';

// Get personalized greeting based on time of day
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'Good night', icon: Moon };
  if (hour < 12) return { text: 'Good morning', icon: Sunrise };
  if (hour < 15) return { text: 'Good afternoon', icon: Sun };
  if (hour < 18) return { text: 'Good afternoon', icon: Coffee };
  if (hour < 22) return { text: 'Good evening', icon: Sun };
  return { text: 'Good night', icon: Moon };
}

// Get project icon based on project details
function getProjectIcon(project: Project) {
  const colors = [
    'bg-gradient-to-br from-blue-500 to-cyan-600',
    'bg-gradient-to-br from-purple-500 to-pink-600',
    'bg-gradient-to-br from-green-500 to-emerald-600',
    'bg-gradient-to-br from-orange-500 to-red-600',
    'bg-gradient-to-br from-indigo-500 to-purple-600',
    'bg-gradient-to-br from-yellow-500 to-orange-600',
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

// Mock data for charts
const weeklyActivityData = [
  { day: 'Mon', commits: 12, deploys: 3, builds: 8 },
  { day: 'Tue', commits: 19, deploys: 5, builds: 12 },
  { day: 'Wed', commits: 15, deploys: 2, builds: 10 },
  { day: 'Thu', commits: 25, deploys: 7, builds: 15 },
  { day: 'Fri', commits: 22, deploys: 6, builds: 18 },
  { day: 'Sat', commits: 8, deploys: 1, builds: 5 },
  { day: 'Sun', commits: 5, deploys: 0, builds: 3 },
];

const storageData = [
  { name: 'Code', value: 35, color: '#3b82f6' },
  { name: 'Assets', value: 25, color: '#10b981' },
  { name: 'Databases', value: 20, color: '#f59e0b' },
  { name: 'Logs', value: 10, color: '#ef4444' },
  { name: 'Free', value: 10, color: '#9ca3af' },
];

const apiCallsData = [
  { name: 'Jan', calls: 1200 },
  { name: 'Feb', calls: 1900 },
  { name: 'Mar', calls: 2400 },
  { name: 'Apr', calls: 2800 },
  { name: 'May', calls: 3200 },
  { name: 'Jun', calls: 3800 },
];

const performanceMetrics = [
  { name: 'Response Time', value: 125, unit: 'ms', trend: -12, color: 'text-green-600' },
  { name: 'Uptime', value: 99.9, unit: '%', trend: 0.2, color: 'text-green-600' },
  { name: 'Error Rate', value: 0.02, unit: '%', trend: -0.01, color: 'text-green-600' },
  { name: 'Active Users', value: 1234, unit: '', trend: 89, color: 'text-blue-600' },
];

// Activity feed mock data
const activityFeed = [
  { id: 1, type: 'deploy', user: 'John Doe', avatar: '👤', project: 'E-Commerce Store', time: '2 minutes ago', status: 'success' },
  { id: 2, type: 'commit', user: 'Jane Smith', avatar: '👩', project: 'Blog Platform', time: '15 minutes ago', message: 'Fixed responsive layout issues' },
  { id: 3, type: 'collab', user: 'Mike Johnson', avatar: '🧑', project: 'Weather App', time: '1 hour ago', action: 'joined as collaborator' },
  { id: 4, type: 'build', user: 'Sarah Williams', avatar: '👱‍♀️', project: 'Task Manager', time: '2 hours ago', status: 'success' },
  { id: 5, type: 'fork', user: 'Alex Chen', avatar: '👨‍💻', project: 'Discord Bot', time: '3 hours ago', action: 'forked your project' },
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
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const greeting = getGreeting();

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
        window.sessionStorage.setItem(`agent-prompt-${project.id}`, aiPrompt);
        const projectUrl = getProjectUrl(project, user?.username);
        setTimeout(() => {
          window.location.href = `${projectUrl}?agent=true&prompt=${encodeURIComponent(aiPrompt)}`;
        }, 500);
      } else {
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

  const quickActions = [
    {
      icon: Plus,
      title: 'Create New Project',
      description: 'Start from scratch',
      color: 'from-blue-500 to-cyan-600',
      action: () => inputRef.current?.focus()
    },
    {
      icon: Github,
      title: 'Import from GitHub',
      description: 'Clone repository',
      color: 'from-purple-500 to-pink-600',
      action: () => navigate('/github-import')
    },
    {
      icon: BookMarked,
      title: 'Browse Templates',
      description: 'Start with template',
      color: 'from-green-500 to-emerald-600',
      action: () => navigate('/templates')
    },
    {
      icon: FileText,
      title: 'View Documentation',
      description: 'Learn the platform',
      color: 'from-orange-500 to-red-600',
      action: () => navigate('/docs')
    },
  ];

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return recentProjects.slice(0, 6);
    return recentProjects.filter(project =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 6);
  }, [recentProjects, searchQuery]);

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex justify-center py-24">
          <ECodeLoading size="lg" text="Loading your dashboard..." />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20" />
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      </div>

      {/* Hero Welcome Section */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <greeting.icon className="h-8 w-8" />
            <h1 className="text-3xl font-bold">
              {greeting.text}, {user?.displayName || user?.username || 'Developer'}!
            </h1>
          </div>
          <p className="text-lg opacity-90 mb-6">
            Ready to build something amazing today? Your workspace is all set up.
          </p>

          {/* AI Prompt Input */}
          <form onSubmit={handleCreateProject} className="max-w-2xl">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Décrivez votre idée d'application en langage naturel..."
                className="flex-1 px-4 py-3 rounded-lg bg-white/20 backdrop-blur-sm text-white placeholder:text-white/70 border border-white/30 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20"
                data-testid="input-ai-prompt"
              />
              <Button
                type="submit"
                size="lg"
                disabled={!aiPrompt.trim()}
                className="bg-white text-purple-600 hover:bg-white/90 font-semibold"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Build
              </Button>
            </div>
          </form>
        </div>

        <CreditBalance className="absolute top-8 right-8" />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column - Charts and Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Data Visualization Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Analytics Chart */}
            <Card className="overflow-hidden border-0 shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Weekly Activity</CardTitle>
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weeklyActivityData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="commits" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="builds" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="deploys" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Storage Usage Donut Chart */}
            <Card className="overflow-hidden border-0 shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">Storage Usage</CardTitle>
                  <HardDrive className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={storageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {storageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {storageData.slice(0, 4).map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* API Calls Bar Chart */}
            <Card className="overflow-hidden border-0 shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">API Calls</CardTitle>
                  <Zap className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={apiCallsData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className="overflow-hidden border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceMetrics.map((metric) => (
                    <div key={metric.name} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{metric.name}</p>
                        <p className="text-2xl font-bold">
                          {metric.value}{metric.unit}
                        </p>
                      </div>
                      <div className={cn("flex items-center gap-1", metric.color)}>
                        {metric.trend > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="text-sm font-medium">
                          {Math.abs(metric.trend)}{metric.unit === '%' ? '%' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden group"
                    onClick={action.action}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                    <CardContent className="p-6 relative">
                      <action.icon className="h-8 w-8 mb-3 text-primary" />
                      <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recent Projects Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Projects</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/projects')}
                >
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Code2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No projects found. Create your first one!</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      className="group"
                    >
                      <Card
                        className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                        onClick={() => {
                          const projectUrl = getProjectUrl(project, user?.username);
                          navigate(projectUrl);
                        }}
                      >
                        {/* Preview Image */}
                        <div className="aspect-video relative overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950">
                          <img
                            src={analyticsImagePath}
                            alt="Project preview"
                            className="absolute inset-0 w-full h-full object-cover opacity-20"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            {getProjectIcon(project)}
                          </div>
                          {project.isDeployed && (
                            <Badge className="absolute top-2 right-2 bg-green-500 text-white">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Live
                            </Badge>
                          )}
                          <div className="absolute bottom-2 left-2 flex gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {project.language || 'JavaScript'}
                            </Badge>
                          </div>
                        </div>

                        <CardContent className="p-4">
                          <h3 className="font-semibold truncate mb-1">{project.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {project.description || 'No description available'}
                          </p>

                          {/* Quick Actions */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {getTimeAgo(project.updatedAt)}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                <Rocket className="h-4 w-4" />
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

        {/* Right Column - Activity Feed */}
        <div className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Feed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 p-6 pt-0">
                  {activityFeed.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg">
                        {activity.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-semibold">{activity.user}</span>
                              {activity.type === 'deploy' && ' deployed '}
                              {activity.type === 'commit' && ' pushed to '}
                              {activity.type === 'collab' && ' '}
                              {activity.type === 'build' && ' built '}
                              {activity.type === 'fork' && ' '}
                              <span className="font-semibold">{activity.project}</span>
                              {activity.action && ` ${activity.action}`}
                              {activity.message && (
                                <span className="block text-xs text-muted-foreground mt-1">
                                  "{activity.message}"
                                </span>
                              )}
                            </p>
                          </div>
                          {activity.status === 'success' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">API</span>
                <Badge variant="outline" className="text-green-600">
                  <div className="w-2 h-2 rounded-full bg-green-600 mr-1.5" />
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Deployments</span>
                <Badge variant="outline" className="text-green-600">
                  <div className="w-2 h-2 rounded-full bg-green-600 mr-1.5" />
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <Badge variant="outline" className="text-green-600">
                  <div className="w-2 h-2 rounded-full bg-green-600 mr-1.5" />
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">CDN</span>
                <Badge variant="outline" className="text-yellow-600">
                  <div className="w-2 h-2 rounded-full bg-yellow-600 mr-1.5" />
                  Degraded
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <style>{`
        .bg-grid-pattern {
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
      `}</style>
    </PageShell>
  );
}