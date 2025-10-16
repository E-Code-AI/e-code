import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  Settings, Users, Shield, Database, Activity, 
  FileText, Cpu, GitBranch, Package, Globe,
  Lock, BarChart3, CheckCircle, XCircle,
  DollarSign, TrendingUp, Palette, Zap, Heart,
  Presentation
} from 'lucide-react';
import { Link } from 'wouter';
import PerformanceMonitor from '@/pages/admin/PerformanceMonitor';
import { formatDistanceToNow } from 'date-fns';
import NewsletterSubscribers from '@/components/admin/NewsletterSubscribers';

interface SystemStatus {
  database: { status: string; connections: number };
  redis: { status: string; memory: string };
  storage: { used: string; available: string };
  services: {
    git: boolean;
    ai: boolean;
    search: boolean;
    billing: boolean;
    deployments: boolean;
  };
}

interface UserStats {
  totalUsers: number;
  activeToday: number;
  newThisWeek: number;
  premiumUsers: number;
}

interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  totalFiles: number;
  totalStorage: string;
}

interface ImportStats {
  figma: number;
  bolt: number;
  lovable: number;
  webContent: number;
  total: number;
  recent: Array<{
    id: number;
    type: string;
    url: string;
    projectId: number;
    status: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch system status
  const { data: systemStatus } = useQuery({
    queryKey: ['/api/admin/system-status'],
    refetchInterval: 30000
  });

  // Fetch user statistics
  const { data: userStats } = useQuery({
    queryKey: ['/api/admin/user-stats']
  });

  // Fetch project statistics  
  const { data: projectStats } = useQuery({
    queryKey: ['/api/admin/project-stats']
  });

  // Fetch import statistics
  const { data: importStats } = useQuery({
    queryKey: ['/api/admin/import-stats']
  });

  // Fetch recent activities
  const { data: activities } = useQuery({
    queryKey: ['/api/admin/activities'],
    refetchInterval: 60000
  });

  // Cache management mutations
  const clearCacheMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/cache/clear', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
    }
  });

  const runMaintenanceMutation = useMutation({
    mutationFn: () => apiRequest('/api/admin/maintenance/run', { method: 'POST' })
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System administration and monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Admin Access
          </Badge>
          <Link href="/admin/pitch-deck">
            <Button variant="outline" className="flex items-center gap-2">
              <Presentation className="h-4 w-4" />
              View Pitch Deck
            </Button>
          </Link>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userStats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{userStats?.newThisWeek || 0} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projectStats?.activeProjects || 0}</div>
                <p className="text-xs text-muted-foreground">
                  of {projectStats?.totalProjects || 0} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projectStats?.totalStorage || '0 GB'}</div>
                <p className="text-xs text-muted-foreground">
                  {projectStats?.totalFiles || 0} files
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Operational</div>
                <p className="text-xs text-muted-foreground">
                  All systems running
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Service Status */}
          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
              <CardDescription>Current status of all platform services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {systemStatus?.services && Object.entries(systemStatus.services).map(([service, status]) => (
                  <div key={service} className="flex items-center gap-2 p-3 border rounded-lg">
                    {status ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="capitalize">{service}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Import Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Imports</CardTitle>
              <CardDescription>Import activity from various platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <Palette className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold">{importStats?.figma || 0}</div>
                  <div className="text-sm text-muted-foreground">Figma Imports</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <div className="text-2xl font-bold">{importStats?.bolt || 0}</div>
                  <div className="text-sm text-muted-foreground">Bolt Imports</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Heart className="h-8 w-8 mx-auto mb-2 text-red-600" />
                  <div className="text-2xl font-bold">{importStats?.lovable || 0}</div>
                  <div className="text-sm text-muted-foreground">Lovable Imports</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Globe className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-2xl font-bold">{importStats?.webContent || 0}</div>
                  <div className="text-sm text-muted-foreground">Web Imports</div>
                </div>
              </div>
              
              {importStats?.recent && importStats.recent.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Recent Imports</h4>
                  <div className="space-y-2">
                    {importStats.recent.slice(0, 5).map((importItem) => (
                      <div key={importItem.id} className="flex items-center justify-between text-sm p-2 border rounded">
                        <div className="flex items-center gap-2">
                          {importItem.type === 'figma' && <Palette className="h-4 w-4 text-purple-600" />}
                          {importItem.type === 'bolt' && <Zap className="h-4 w-4 text-yellow-600" />}
                          {importItem.type === 'lovable' && <Heart className="h-4 w-4 text-red-600" />}
                          {importItem.type === 'web' && <Globe className="h-4 w-4 text-blue-600" />}
                          <span className="capitalize">{importItem.type} Import</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Link href={`/projects/${importItem.projectId}`}>
                            <Button variant="ghost" size="sm">
                              View Project
                            </Button>
                          </Link>
                          <Badge variant={importItem.status === 'completed' ? 'default' : 'secondary'}>
                            {importItem.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(importItem.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/admin/usage">
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Usage Analytics</CardTitle>
                      <CardDescription>Monitor platform usage and resource consumption</CardDescription>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <p>• View real-time usage statistics</p>
                    <p>• Monitor resource consumption by user</p>
                    <p>• Export usage reports</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/billing">
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Billing Management</CardTitle>
                      <CardDescription>Configure pricing plans and billing settings</CardDescription>
                    </div>
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <p>• Manage pricing tiers</p>
                    <p>• Configure resource limits</p>
                    <p>• Update billing settings</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Latest platform activities and events</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {activities?.map((activity: any, index: number) => (
                    <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0">
                      <div className={`p-2 rounded-full ${
                        activity.type === 'user' ? 'bg-blue-100' :
                        activity.type === 'project' ? 'bg-green-100' :
                        activity.type === 'system' ? 'bg-purple-100' :
                        'bg-gray-100'
                      }`}>
                        {activity.type === 'user' ? <Users className="h-4 w-4" /> :
                         activity.type === 'project' ? <FileText className="h-4 w-4" /> :
                         activity.type === 'system' ? <Settings className="h-4 w-4" /> :
                         <Activity className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage platform users and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  User management interface coming soon. Use database tools for now.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Management</CardTitle>
              <CardDescription>Monitor and manage user projects</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Project management interface coming soon. Use database tools for now.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="newsletter">
          <NewsletterSubscribers />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceMonitor />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Status</CardTitle>
                <CardDescription>PostgreSQL connection pool status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Status</span>
                  <Badge variant="outline">{systemStatus?.database?.status || 'Unknown'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Active Connections</span>
                  <span>{systemStatus?.database?.connections || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Storage Status</CardTitle>
                <CardDescription>File storage usage and availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Used</span>
                  <span>{systemStatus?.storage?.used || '0 GB'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available</span>
                  <span>{systemStatus?.storage?.available || '0 GB'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Maintenance Actions</CardTitle>
              <CardDescription>System maintenance and optimization tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Clear Cache</p>
                  <p className="text-sm text-muted-foreground">Clear all application caches</p>
                </div>
                <Button 
                  onClick={() => clearCacheMutation.mutate()}
                  disabled={clearCacheMutation.isPending}
                >
                  {clearCacheMutation.isPending ? 'Clearing...' : 'Clear Cache'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Run Maintenance</p>
                  <p className="text-sm text-muted-foreground">Optimize database and clean up files</p>
                </div>
                <Button 
                  onClick={() => runMaintenanceMutation.mutate()}
                  disabled={runMaintenanceMutation.isPending}
                  variant="outline"
                >
                  {runMaintenanceMutation.isPending ? 'Running...' : 'Run Maintenance'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>View application and error logs</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertDescription>
                  Log viewer interface coming soon. Check server logs for now.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}