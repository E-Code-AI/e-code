import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Users, 
  Globe, 
  TrendingUp, 
  Eye,
  Mouse,
  Smartphone,
  Monitor,
  MapPin,
  Calendar,
  Filter,
  Download,
  Share,
  Settings
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('7d');

  // Mock analytics data
  const overviewStats = [
    { label: 'Total Views', value: '2,847', change: '+12.5%', trend: 'up' },
    { label: 'Unique Visitors', value: '1,923', change: '+8.2%', trend: 'up' },
    { label: 'Page Views', value: '4,521', change: '+15.3%', trend: 'up' },
    { label: 'Avg. Session', value: '3m 42s', change: '-2.1%', trend: 'down' }
  ];

  const trafficSources = [
    { source: 'Direct', visitors: 1234, percentage: 45 },
    { source: 'Google Search', visitors: 856, percentage: 31 },
    { source: 'Social Media', visitors: 423, percentage: 15 },
    { source: 'Referrals', visitors: 234, percentage: 9 }
  ];

  const topPages = [
    { page: '/dashboard', views: 1456, change: '+12%' },
    { page: '/projects', views: 1234, change: '+8%' },
    { page: '/editor/my-app', views: 987, change: '+15%' },
    { page: '/bounties', views: 654, change: '+3%' },
    { page: '/learn', views: 432, change: '+22%' }
  ];

  const deviceData = [
    { device: 'Desktop', percentage: 68, users: 1308 },
    { device: 'Mobile', percentage: 25, users: 481 },
    { device: 'Tablet', percentage: 7, users: 135 }
  ];

  const geographicData = [
    { country: 'United States', users: 743, flag: '🇺🇸' },
    { country: 'United Kingdom', users: 284, flag: '🇬🇧' },
    { country: 'Canada', users: 192, flag: '🇨🇦' },
    { country: 'Germany', users: 156, flag: '🇩🇪' },
    { country: 'France', users: 123, flag: '🇫🇷' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Track your project performance and user engagement</p>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Last 7 days
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setTimeRange('1d')}>Last 24 hours</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeRange('7d')}>Last 7 days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeRange('30d')}>Last 30 days</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeRange('90d')}>Last 90 days</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {overviewStats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <Badge 
                        variant={stat.trend === 'up' ? 'default' : 'secondary'}
                        className={stat.trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                      >
                        {stat.change}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-full">
                    {index === 0 && <Eye className="h-5 w-5 text-primary" />}
                    {index === 1 && <Users className="h-5 w-5 text-primary" />}
                    {index === 2 && <BarChart3 className="h-5 w-5 text-primary" />}
                    {index === 3 && <Clock className="h-5 w-5 text-primary" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="audience">Audience</TabsTrigger>
            <TabsTrigger value="realtime">Real-time</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Traffic Chart Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Overview</CardTitle>
                  <CardDescription>Page views and unique visitors over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Traffic chart would appear here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Referrers */}
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Sources</CardTitle>
                  <CardDescription>Where your visitors come from</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {trafficSources.map((source, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{source.source}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20">
                            <Progress value={source.percentage} className="h-2" />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {source.visitors}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="traffic" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Traffic Trends</CardTitle>
                  <CardDescription>Detailed traffic analysis over the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Traffic trends chart would appear here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Traffic Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {trafficSources.map((source, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{source.source}</span>
                          <span>{source.percentage}%</span>
                        </div>
                        <Progress value={source.percentage} />
                        <p className="text-xs text-muted-foreground">{source.visitors} visitors</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
                <CardDescription>Most visited pages on your site</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPages.map((page, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-full p-2">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{page.page}</p>
                          <p className="text-sm text-muted-foreground">{page.views} views</p>
                        </div>
                      </div>
                      <Badge variant={page.change.startsWith('+') ? 'default' : 'secondary'}>
                        {page.change}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audience" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Device Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Types</CardTitle>
                  <CardDescription>How users access your site</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {deviceData.map((device, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {device.device === 'Desktop' && <Monitor className="h-4 w-4 text-muted-foreground" />}
                          {device.device === 'Mobile' && <Smartphone className="h-4 w-4 text-muted-foreground" />}
                          {device.device === 'Tablet' && <Smartphone className="h-4 w-4 text-muted-foreground" />}
                          <span className="font-medium">{device.device}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20">
                            <Progress value={device.percentage} className="h-2" />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {device.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Geographic Data */}
              <Card>
                <CardHeader>
                  <CardTitle>Geographic Distribution</CardTitle>
                  <CardDescription>Where your users are located</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {geographicData.map((country, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{country.flag}</span>
                          <span className="font-medium">{country.country}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {country.users} users
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="realtime" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Users</CardTitle>
                  <CardDescription>Users currently on your site</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">23</div>
                    <p className="text-sm text-muted-foreground">Active right now</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Live Activity</CardTitle>
                  <CardDescription>Real-time user actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>User viewed /dashboard</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span>New user signed up</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <span>Project created</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Page Views (Last Hour)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">127</div>
                    <p className="text-sm text-muted-foreground">+15% vs previous hour</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Active Pages</CardTitle>
                <CardDescription>Pages currently being viewed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['/dashboard', '/project/my-app', '/bounties', '/learn'].map((page, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="font-mono text-sm">{page}</span>
                      <Badge variant="outline">{index + 2} users</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}