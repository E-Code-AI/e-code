import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Award, 
  Star, 
  Trophy, 
  Medal, 
  Crown, 
  Target,
  Zap,
  Code,
  Users,
  GitBranch,
  Rocket,
  Heart,
  Flame,
  Shield,
  BookOpen,
  Clock,
  Share2,
  Lock,
  CheckCircle2
} from 'lucide-react';

export default function Badges() {
  const [activeTab, setActiveTab] = useState('earned');

  // Mock badge data
  const earnedBadges = [
    {
      id: 1,
      name: 'First Project',
      description: 'Created your first project on E-Code',
      icon: Rocket,
      color: 'bg-blue-500',
      earnedDate: '2025-01-15',
      rarity: 'common'
    },
    {
      id: 2,
      name: 'Code Explorer',
      description: 'Completed 10 coding projects',
      icon: Code,
      color: 'bg-green-500',
      earnedDate: '2025-02-20',
      rarity: 'uncommon'
    },
    {
      id: 3,
      name: 'Community Helper',
      description: 'Helped 5 other developers in the community',
      icon: Users,
      color: 'bg-purple-500',
      earnedDate: '2025-03-10',
      rarity: 'rare'
    },
    {
      id: 4,
      name: 'AI Enthusiast',
      description: 'Used AI Agent to build 25 projects',
      icon: Zap,
      color: 'bg-yellow-500',
      earnedDate: '2025-03-25',
      rarity: 'epic'
    }
  ];

  const availableBadges = [
    {
      id: 5,
      name: 'Master Builder',
      description: 'Create 100 projects on E-Code',
      icon: Crown,
      color: 'bg-orange-500',
      requirement: '42/100 projects',
      progress: 42,
      rarity: 'legendary'
    },
    {
      id: 6,
      name: 'Team Player',
      description: 'Collaborate on 20 different projects',
      icon: Users,
      color: 'bg-blue-500',
      requirement: '7/20 collaborations',
      progress: 35,
      rarity: 'rare'
    },
    {
      id: 7,
      name: 'Git Guru',
      description: 'Make 500 commits across all projects',
      icon: GitBranch,
      color: 'bg-green-500',
      requirement: '234/500 commits',
      progress: 47,
      rarity: 'epic'
    },
    {
      id: 8,
      name: 'Speed Demon',
      description: 'Deploy a project in under 5 minutes',
      icon: Flame,
      color: 'bg-red-500',
      requirement: 'Not achieved yet',
      progress: 0,
      rarity: 'rare'
    },
    {
      id: 9,
      name: 'Learning Machine',
      description: 'Complete all E-Code tutorials',
      icon: BookOpen,
      color: 'bg-indigo-500',
      requirement: '8/12 tutorials',
      progress: 67,
      rarity: 'uncommon'
    },
    {
      id: 10,
      name: 'Security Expert',
      description: 'Scan and fix 50 security vulnerabilities',
      icon: Shield,
      color: 'bg-emerald-500',
      requirement: '12/50 vulnerabilities',
      progress: 24,
      rarity: 'epic'
    }
  ];

  const categories = [
    { name: 'Building', icon: Code, count: 15 },
    { name: 'Collaboration', icon: Users, count: 8 },
    { name: 'Learning', icon: BookOpen, count: 12 },
    { name: 'Achievement', icon: Trophy, count: 20 },
    { name: 'Special', icon: Star, count: 5 }
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'uncommon': return 'bg-green-100 text-green-800 border-green-300';
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'legendary': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const BadgeCard = ({ badge, isEarned = false }: { badge: any; isEarned?: boolean }) => {
    const IconComponent = badge.icon;
    
    return (
      <Card className={`relative overflow-hidden ${!isEarned ? 'opacity-75' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${badge.color} ${!isEarned ? 'grayscale' : ''}`}>
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">{badge.name}</h3>
                <Badge className={`text-xs border ${getRarityColor(badge.rarity)}`}>
                  {badge.rarity}
                </Badge>
              </div>
              
              <p className="text-muted-foreground text-sm mb-3">
                {badge.description}
              </p>
              
              {isEarned ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Earned on {new Date(badge.earnedDate).toLocaleDateString()}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{badge.requirement}</span>
                    <span className="font-medium">{badge.progress}%</span>
                  </div>
                  <Progress value={badge.progress} className="h-2" />
                </div>
              )}
            </div>
          </div>
          
          {!isEarned && (
            <div className="absolute top-2 right-2">
              <Lock className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Badges & Achievements</h1>
            <p className="text-muted-foreground">Track your progress and celebrate milestones</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share Progress
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <Trophy className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{earnedBadges.length}</p>
                  <p className="text-sm text-muted-foreground">Badges Earned</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{availableBadges.length}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Star className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">1,250</p>
                  <p className="text-sm text-muted-foreground">Total Points</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="earned">Earned ({earnedBadges.length})</TabsTrigger>
            <TabsTrigger value="available">Available ({availableBadges.length})</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="earned" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {earnedBadges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} isEarned={true} />
              ))}
            </div>
            
            {earnedBadges.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Medal className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No badges earned yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start creating projects and engaging with the community to earn your first badge!
                  </p>
                  <Button onClick={() => setActiveTab('available')}>
                    View Available Badges
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="available" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableBadges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} isEarned={false} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-semibold">{category.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {category.count} badges available
                      </p>
                      <Progress value={Math.random() * 100} className="h-2" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription>Top badge collectors this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { rank: 1, name: 'Alex Chen', badges: 47, avatar: 'AC' },
                    { rank: 2, name: 'Sarah Johnson', badges: 42, avatar: 'SJ' },
                    { rank: 3, name: 'Mike Rodriguez', badges: 38, avatar: 'MR' },
                    { rank: 4, name: 'Emily Davis', badges: 35, avatar: 'ED' },
                    { rank: 5, name: 'You', badges: 4, avatar: 'A' }
                  ].map((user) => (
                    <div key={user.rank} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-6 text-center font-medium">#{user.rank}</div>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{user.avatar}</AvatarFallback>
                        </Avatar>
                        <span className={`font-medium ${user.name === 'You' ? 'text-primary' : ''}`}>
                          {user.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{user.badges}</span>
                      </div>
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