import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trophy, 
  Star, 
  Target, 
  Zap,
  Award,
  TrendingUp,
  Users,
  Calendar,
  Flame,
  Gift,
  Crown,
  Medal
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface UserStats {
  level: number;
  experience: number;
  experienceToNextLevel: number;
  streak: number;
  totalPoints: number;
  rank: string;
  percentile: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'coding' | 'collaboration' | 'learning' | 'community' | 'special';
  points: number;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  earnedAt?: Date;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface Leaderboard {
  userId: number;
  username: string;
  level: number;
  points: number;
  streak: number;
  rank: number;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  points: number;
  progress: number;
  target: number;
  expiresAt: Date;
}

interface GamificationProps {
  userId?: number;
}

export function Gamification({ userId }: GamificationProps) {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch user stats
  const { data: userStats } = useQuery<UserStats>({
    queryKey: ['/api/gamification/stats', userId],
    queryFn: () => apiRequest(`/api/gamification/stats${userId ? `?userId=${userId}` : ''}`),
    initialData: {
      level: 42,
      experience: 8750,
      experienceToNextLevel: 10000,
      streak: 15,
      totalPoints: 125000,
      rank: 'Code Master',
      percentile: 95
    }
  });

  // Fetch achievements
  const { data: achievements = [] } = useQuery<Achievement[]>({
    queryKey: ['/api/gamification/achievements', userId],
    queryFn: () => apiRequest(`/api/gamification/achievements${userId ? `?userId=${userId}` : ''}`),
    initialData: [
      {
        id: 'first-project',
        name: 'Hello World',
        description: 'Create your first project',
        icon: <Star className="h-5 w-5" />,
        category: 'coding',
        points: 100,
        unlockedAt: new Date('2024-01-15'),
        rarity: 'common'
      },
      {
        id: 'speed-coder',
        name: 'Speed Coder',
        description: 'Complete 10 projects in a week',
        icon: <Zap className="h-5 w-5" />,
        category: 'coding',
        points: 500,
        progress: 7,
        maxProgress: 10,
        rarity: 'rare'
      },
      {
        id: 'team-player',
        name: 'Team Player',
        description: 'Collaborate on 5 team projects',
        icon: <Users className="h-5 w-5" />,
        category: 'collaboration',
        points: 300,
        unlockedAt: new Date('2024-02-20'),
        rarity: 'rare'
      },
      {
        id: 'knowledge-seeker',
        name: 'Knowledge Seeker',
        description: 'Complete 20 tutorials',
        icon: <Award className="h-5 w-5" />,
        category: 'learning',
        points: 250,
        progress: 18,
        maxProgress: 20,
        rarity: 'common'
      }
    ]
  });

  // Fetch badges
  const { data: badges = [] } = useQuery<Badge[]>({
    queryKey: ['/api/gamification/badges', userId],
    queryFn: () => apiRequest(`/api/gamification/badges${userId ? `?userId=${userId}` : ''}`),
    initialData: [
      {
        id: 'python-master',
        name: 'Python Master',
        description: 'Master Python programming',
        icon: <Medal className="h-5 w-5" />,
        earnedAt: new Date('2024-03-10'),
        level: 'gold'
      },
      {
        id: 'react-wizard',
        name: 'React Wizard',
        description: 'Build 10 React applications',
        icon: <Crown className="h-5 w-5" />,
        earnedAt: new Date('2024-04-05'),
        level: 'silver'
      }
    ]
  });

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery<Leaderboard[]>({
    queryKey: ['/api/gamification/leaderboard'],
    queryFn: () => apiRequest('/api/gamification/leaderboard'),
    initialData: [
      { userId: 1, username: 'admin', level: 42, points: 125000, streak: 15, rank: 1 },
      { userId: 2, username: 'coder123', level: 38, points: 98500, streak: 22, rank: 2 },
      { userId: 3, username: 'devmaster', level: 35, points: 87000, streak: 10, rank: 3 }
    ]
  });

  // Fetch challenges
  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ['/api/gamification/challenges'],
    queryFn: () => apiRequest('/api/gamification/challenges'),
    initialData: [
      {
        id: 'daily-code',
        name: 'Daily Coder',
        description: 'Write code for 30 minutes',
        type: 'daily',
        points: 50,
        progress: 15,
        target: 30,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
      },
      {
        id: 'weekly-deploy',
        name: 'Deployment Week',
        description: 'Deploy 3 projects this week',
        type: 'weekly',
        points: 200,
        progress: 2,
        target: 3,
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      }
    ]
  });

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'text-gray-600';
      case 'rare': return 'text-blue-600';
      case 'epic': return 'text-purple-600';
      case 'legendary': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getLevelColor = (level: Badge['level']) => {
    switch (level) {
      case 'bronze': return 'bg-orange-700';
      case 'silver': return 'bg-gray-400';
      case 'gold': return 'bg-yellow-500';
      case 'platinum': return 'bg-gray-200';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* User Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{userStats?.level}</span>
              <Badge variant="secondary">{userStats?.rank}</Badge>
            </div>
            <Progress 
              value={(userStats?.experience || 0) / (userStats?.experienceToNextLevel || 1) * 100} 
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {userStats?.experience} / {userStats?.experienceToNextLevel} XP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Current Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Flame className="h-8 w-8 text-orange-500" />
              <span className="text-3xl font-bold">{userStats?.streak}</span>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Star className="h-8 w-8 text-yellow-500" />
              <span className="text-3xl font-bold">
                {userStats?.totalPoints.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Global Rank</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">Top {userStats?.percentile}%</p>
                <p className="text-xs text-muted-foreground">
                  Better than {100 - (userStats?.percentile || 0)}% of users
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements
                  .filter(a => a.unlockedAt)
                  .sort((a, b) => (b.unlockedAt?.getTime() || 0) - (a.unlockedAt?.getTime() || 0))
                  .slice(0, 4)
                  .map(achievement => (
                    <div key={achievement.id} className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full bg-background",
                        getRarityColor(achievement.rarity)
                      )}>
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{achievement.name}</p>
                        <p className="text-xs text-muted-foreground">
                          +{achievement.points} points • {achievement.unlockedAt?.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Badges Showcase */}
          <Card>
            <CardHeader>
              <CardTitle>Your Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {badges.map(badge => (
                  <div key={badge.id} className="text-center">
                    <div className={cn(
                      "mx-auto w-16 h-16 rounded-full flex items-center justify-center",
                      getLevelColor(badge.level)
                    )}>
                      {badge.icon}
                    </div>
                    <p className="text-sm font-medium mt-2">{badge.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{badge.level}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          {['coding', 'collaboration', 'learning', 'community', 'special'].map(category => {
            const categoryAchievements = achievements.filter(a => a.category === category);
            if (categoryAchievements.length === 0) return null;

            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">{category} Achievements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryAchievements.map(achievement => (
                      <div 
                        key={achievement.id}
                        className={cn(
                          "p-4 rounded-lg border",
                          achievement.unlockedAt ? "bg-background" : "bg-muted/30"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-full",
                            achievement.unlockedAt ? getRarityColor(achievement.rarity) : "text-muted-foreground"
                          )}>
                            {achievement.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{achievement.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {achievement.description}
                            </p>
                            <div className="mt-2">
                              {achievement.progress !== undefined && achievement.maxProgress ? (
                                <div className="space-y-1">
                                  <Progress 
                                    value={(achievement.progress / achievement.maxProgress) * 100} 
                                    className="h-2"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    {achievement.progress} / {achievement.maxProgress}
                                  </p>
                                </div>
                              ) : achievement.unlockedAt ? (
                                <Badge variant="secondary" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Unlocked
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Locked
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            +{achievement.points}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Leaderboard</CardTitle>
              <CardDescription>Top performers this month</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {leaderboard.map((user, index) => (
                    <Card key={user.userId} className={cn(
                      "p-4",
                      index < 3 && "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-bold",
                            index === 0 && "bg-yellow-500 text-white",
                            index === 1 && "bg-gray-400 text-white",
                            index === 2 && "bg-orange-700 text-white",
                            index > 2 && "bg-muted"
                          )}>
                            {user.rank}
                          </div>
                          <Avatar>
                            <AvatarFallback>
                              {user.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-muted-foreground">
                              Level {user.level}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{user.points.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <Flame className="h-3 w-3" />
                            {user.streak} day streak
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="challenges" className="space-y-4">
          {['daily', 'weekly', 'monthly'].map(type => {
            const typeChallenges = challenges.filter(c => c.type === type);
            if (typeChallenges.length === 0) return null;

            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="capitalize">{type} Challenges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {typeChallenges.map(challenge => {
                      const hoursLeft = Math.floor((challenge.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));
                      
                      return (
                        <Card key={challenge.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-medium">{challenge.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {challenge.description}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge variant="secondary">
                                  +{challenge.points} pts
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {hoursLeft}h left
                                </p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Progress 
                                value={(challenge.progress / challenge.target) * 100} 
                              />
                              <p className="text-xs text-muted-foreground">
                                {challenge.progress} / {challenge.target} completed
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}