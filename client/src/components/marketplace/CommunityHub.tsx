import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, Trophy, TrendingUp, Upload, MessageSquare, 
  BookOpen, Award, Star, GitBranch, Heart, Eye,
  Calendar, ChevronRight, Plus, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'wouter';

export function CommunityHub() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - in real app, these would be API calls
  const topDevelopers = [
    {
      id: 1,
      name: 'Sarah Chen',
      avatar: null,
      templates: 15,
      downloads: 45000,
      rating: 4.9,
      badge: 'gold',
    },
    {
      id: 2,
      name: 'Alex Rodriguez',
      avatar: null,
      templates: 12,
      downloads: 38000,
      rating: 4.8,
      badge: 'silver',
    },
    {
      id: 3,
      name: 'Jamie Park',
      avatar: null,
      templates: 10,
      downloads: 28000,
      rating: 4.7,
      badge: 'bronze',
    },
    {
      id: 4,
      name: 'Morgan Lee',
      avatar: null,
      templates: 8,
      downloads: 18000,
      rating: 4.6,
    },
    {
      id: 5,
      name: 'Chris Taylor',
      avatar: null,
      templates: 7,
      downloads: 15000,
      rating: 4.5,
    },
  ];

  const collections = [
    {
      id: 1,
      name: 'Best of 2024',
      description: 'Top-rated templates from this year',
      templates: 24,
      icon: Trophy,
      color: 'text-yellow-500',
    },
    {
      id: 2,
      name: 'Beginner Friendly',
      description: 'Perfect for getting started',
      templates: 18,
      icon: Award,
      color: 'text-green-500',
    },
    {
      id: 3,
      name: 'Production Ready',
      description: 'Enterprise-grade templates',
      templates: 15,
      icon: Sparkles,
      color: 'text-purple-500',
    },
  ];

  const recentActivity = [
    {
      user: 'Sarah Chen',
      action: 'submitted',
      template: 'Next.js E-commerce',
      time: '2 hours ago',
    },
    {
      user: 'Alex Rodriguez',
      action: 'updated',
      template: 'React Dashboard Pro',
      time: '5 hours ago',
    },
    {
      user: 'Jamie Park',
      action: 'published',
      template: 'Vue.js Admin Panel',
      time: '1 day ago',
    },
    {
      user: 'Morgan Lee',
      action: 'forked',
      template: 'Node.js API Starter',
      time: '2 days ago',
    },
  ];

  const communityStats = {
    totalTemplates: 1234,
    totalDevelopers: 456,
    totalDownloads: 890000,
    monthlyActive: 234,
  };

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case 'gold':
        return 'bg-yellow-500';
      case 'silver':
        return 'bg-gray-400';
      case 'bronze':
        return 'bg-orange-600';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Community Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-500" />
            Community Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-orange-500">
                {communityStats.totalTemplates.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Templates</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-blue-500">
                {communityStats.totalDevelopers}
              </p>
              <p className="text-xs text-muted-foreground">Developers</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-green-500">
                {(communityStats.totalDownloads / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-muted-foreground">Downloads</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-purple-500">
                {communityStats.monthlyActive}
              </p>
              <p className="text-xs text-muted-foreground">Active/mo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Template CTA */}
      {user && (
        <Card className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Share Your Template</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Join the community and showcase your work
                </p>
              </div>
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600"
                onClick={() => window.location.href = '/templates/submit'}
              >
                <Upload className="h-3 w-3 mr-1" />
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="developers">Developers</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Featured Collections */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Featured Collections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {collections.map((collection) => {
                const Icon = collection.icon;
                return (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg bg-muted", collection.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{collection.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {collection.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{collection.templates}</Badge>
                  </div>
                );
              })}
              <Button variant="outline" className="w-full mt-2" size="sm">
                View All Collections
              </Button>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/docs/templates">
                <a className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                  <span className="text-sm flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Template Guidelines
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Link>
              <Link href="/community/forum">
                <a className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                  <span className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Community Forum
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Link>
              <Link href="/tutorials">
                <a className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                  <span className="text-sm flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Tutorials
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="developers" className="space-y-4 mt-4">
          {/* Top Developers */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topDevelopers.map((dev, index) => (
                  <div
                    key={dev.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={dev.avatar} />
                          <AvatarFallback>
                            {dev.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {dev.badge && (
                          <div className={cn(
                            "absolute -bottom-1 -right-1 h-4 w-4 rounded-full",
                            getBadgeColor(dev.badge)
                          )} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{dev.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {dev.templates} templates • {(dev.downloads / 1000).toFixed(0)}k downloads
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current text-yellow-500" />
                      <span className="text-xs font-medium">{dev.rating}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-3" size="sm">
                View All Developers
              </Button>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-purple-500">First Template</Badge>
                  <Progress value={100} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground">Unlocked</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">10 Downloads</Badge>
                  <Progress value={60} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground">6/10</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">5-Star Rating</Badge>
                  <Progress value={20} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground">1/5</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 mt-4">
          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 pb-3 border-b last:border-0"
                    >
                      <Avatar className="h-6 w-6 mt-0.5">
                        <AvatarFallback>
                          {activity.user.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{activity.user}</span>
                          {' '}
                          <span className="text-muted-foreground">{activity.action}</span>
                          {' '}
                          <span className="font-medium">{activity.template}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Join Discussion */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h3 className="font-semibold text-sm mb-1">Join the Discussion</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Connect with other developers and share ideas
              </p>
              <Button size="sm" variant="outline">
                Visit Forum
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}