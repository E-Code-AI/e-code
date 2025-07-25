import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, Star, MessageSquare, Users, Code, Heart, 
  Share2, Bookmark, MoreHorizontal, Calendar, Award,
  Filter, ChevronRight, Clock, Zap, Trophy, Target, Plus
} from 'lucide-react';
import { Link } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ECodeLoading } from '@/components/ECodeLoading';

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    reputation: number;
  };
  category: string;
  tags: string[];
  likes: number;
  comments: number;
  views: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
  projectUrl?: string;
  imageUrl?: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  participants: number;
  submissions: number;
  prize?: string;
  deadline: string;
  status: 'active' | 'upcoming' | 'ended';
}

interface LeaderboardUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  score: number;
  rank: number;
  badges: string[];
  streakDays: number;
}

const CATEGORIES = [
  { id: 'all', name: 'All Posts', icon: TrendingUp },
  { id: 'showcase', name: 'Showcase', icon: Star },
  { id: 'help', name: 'Help', icon: MessageSquare },
  { id: 'tutorials', name: 'Tutorials', icon: Code },
  { id: 'challenges', name: 'Challenges', icon: Trophy },
  { id: 'discussions', name: 'Discussions', icon: Users },
];

const MOCK_POSTS: CommunityPost[] = [
  {
    id: '1',
    title: 'Built a Real-Time Collaboration Editor with WebSockets',
    content: 'Check out my latest project! I created a collaborative code editor that supports real-time editing with multiple users...',
    author: {
      id: '1',
      username: 'sarah_dev',
      displayName: 'Sarah Chen',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
      reputation: 2456,
    },
    category: 'showcase',
    tags: ['websockets', 'react', 'collaboration'],
    likes: 234,
    comments: 45,
    views: 1234,
    isLiked: true,
    isBookmarked: false,
    createdAt: '2 hours ago',
    projectUrl: '/project/123',
    imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=project1',
  },
  {
    id: '2',
    title: 'How to optimize React performance in large applications',
    content: 'I\'ve been working on performance optimization and wanted to share some tips that helped me reduce rendering time by 60%...',
    author: {
      id: '2',
      username: 'alex_code',
      displayName: 'Alex Rodriguez',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
      reputation: 3890,
    },
    category: 'tutorials',
    tags: ['react', 'performance', 'optimization'],
    likes: 567,
    comments: 89,
    views: 4567,
    isLiked: false,
    isBookmarked: true,
    createdAt: '5 hours ago',
  },
  {
    id: '3',
    title: 'Need help with TypeScript generics',
    content: 'I\'m trying to create a generic function that can work with different types but I\'m getting type errors...',
    author: {
      id: '3',
      username: 'dev_newbie',
      displayName: 'Jordan Lee',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jordan',
      reputation: 234,
    },
    category: 'help',
    tags: ['typescript', 'generics', 'help'],
    likes: 12,
    comments: 23,
    views: 156,
    isLiked: false,
    isBookmarked: false,
    createdAt: '1 day ago',
  },
];

const MOCK_CHALLENGES: Challenge[] = [
  {
    id: '1',
    title: 'Build a Weather Dashboard',
    description: 'Create an interactive weather dashboard using any API and framework of your choice',
    difficulty: 'medium',
    category: 'frontend',
    participants: 234,
    submissions: 45,
    prize: '$500 in credits',
    deadline: '2024-02-15',
    status: 'active',
  },
  {
    id: '2',
    title: 'Algorithm Challenge: Pathfinding',
    description: 'Implement an efficient pathfinding algorithm for a grid-based game',
    difficulty: 'hard',
    category: 'algorithms',
    participants: 156,
    submissions: 23,
    deadline: '2024-02-20',
    status: 'active',
  },
  {
    id: '3',
    title: 'Create a CLI Tool',
    description: 'Build a useful command-line tool that solves a real problem',
    difficulty: 'easy',
    category: 'tools',
    participants: 567,
    submissions: 234,
    prize: 'Featured project',
    deadline: '2024-03-01',
    status: 'upcoming',
  },
];

const MOCK_LEADERBOARD: LeaderboardUser[] = [
  {
    id: '1',
    username: 'code_master',
    displayName: 'Emily Zhang',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emily',
    score: 12450,
    rank: 1,
    badges: ['top-contributor', 'challenge-winner', 'mentor'],
    streakDays: 45,
  },
  {
    id: '2',
    username: 'dev_wizard',
    displayName: 'Marcus Johnson',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus',
    score: 11234,
    rank: 2,
    badges: ['top-contributor', 'helpful'],
    streakDays: 32,
  },
  {
    id: '3',
    username: 'tech_guru',
    displayName: 'Priya Patel',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya',
    score: 10890,
    rank: 3,
    badges: ['challenge-winner', 'mentor'],
    streakDays: 28,
  },
];

export default function Community() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch community posts
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['/api/community/posts', activeCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeCategory !== 'all') params.append('category', activeCategory);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`/api/community/posts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      return response.json();
    },
  });

  // Fetch challenges
  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ['/api/community/challenges'],
    queryFn: async () => {
      const response = await fetch('/api/community/challenges');
      if (!response.ok) throw new Error('Failed to fetch challenges');
      return response.json();
    },
  });

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery<LeaderboardUser[]>({
    queryKey: ['/api/community/leaderboard'],
    queryFn: async () => {
      const response = await fetch('/api/community/leaderboard');
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json();
    },
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await apiRequest('POST', `/api/community/posts/${postId}/like`);
      if (!res.ok) throw new Error('Failed to like post');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
    },
  });

  // Bookmark post mutation
  const bookmarkPostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await apiRequest('POST', `/api/community/posts/${postId}/bookmark`);
      if (!res.ok) throw new Error('Failed to bookmark post');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
      toast({
        title: "Post bookmarked",
        description: "Added to your bookmarks",
      });
    },
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'hard': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return '';
    }
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'top-contributor': return <Trophy className="h-4 w-4" />;
      case 'challenge-winner': return <Award className="h-4 w-4" />;
      case 'mentor': return <Users className="h-4 w-4" />;
      case 'helpful': return <Heart className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-auto">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Community</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Share your projects, get help, and connect with other creators
            </p>
          </div>
          <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center gap-3">
            <Input
              placeholder="Search community..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[280px] md:w-[320px]"
            />
            <Link href="/community/new">
              <Button className="w-full sm:w-auto whitespace-nowrap">
                <Plus className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Posts Section */}
          <div className="lg:col-span-3 space-y-6">
            {/* Category Tabs */}
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <ScrollArea className="w-full">
                <TabsList className="inline-flex h-auto p-1 bg-muted rounded-lg">
                  <div className="flex space-x-1">
                    {CATEGORIES.map(category => (
                      <TabsTrigger 
                        key={category.id} 
                        value={category.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                      >
                        <category.icon className="h-4 w-4" />
                        <span className="text-sm">{category.name}</span>
                      </TabsTrigger>
                    ))}
                  </div>
                </TabsList>
              </ScrollArea>
              
              <TabsContent value={activeCategory} className="mt-6 space-y-4">
                {postsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <ECodeLoading size="lg" text="Loading community posts..." />
                  </div>
                ) : posts.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                      <p className="text-muted-foreground">
                        Be the first to share something with the community!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  posts.map((post: CommunityPost) => (
                    <Card key={post.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={post.author.avatarUrl} />
                                <AvatarFallback>
                                  {post.author.displayName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <Link href={`/user/${post.author.username}`}>
                                    <span className="font-semibold hover:underline">
                                      {post.author.displayName}
                                    </span>
                                  </Link>
                                  <Badge variant="secondary" className="text-xs">
                                    {post.author.reputation} rep
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {post.createdAt}
                                </p>
                              </div>
                            </div>

                            <Link href={`/community/post/${post.id}`}>
                              <h3 className="text-xl font-semibold mb-2 hover:text-primary">
                                {post.title}
                              </h3>
                            </Link>

                            <p className="text-muted-foreground mb-4 line-clamp-2">
                              {post.content}
                            </p>

                            {post.imageUrl && (
                              <div className="mb-4 rounded-lg overflow-hidden bg-muted aspect-video">
                                <img 
                                  src={post.imageUrl} 
                                  alt={post.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            <div className="flex items-center gap-4 mb-3">
                              {post.tags.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "gap-2",
                                    post.isLiked && "text-red-500"
                                  )}
                                  onClick={() => likePostMutation.mutate(post.id)}
                                >
                                  <Heart className={cn(
                                    "h-4 w-4",
                                    post.isLiked && "fill-current"
                                  )} />
                                  {post.likes}
                                </Button>
                                <Button variant="ghost" size="sm" className="gap-2">
                                  <MessageSquare className="h-4 w-4" />
                                  {post.comments}
                                </Button>
                                <Button variant="ghost" size="sm" className="gap-2">
                                  <Share2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "gap-2",
                                    post.isBookmarked && "text-blue-500"
                                  )}
                                  onClick={() => bookmarkPostMutation.mutate(post.id)}
                                >
                                  <Bookmark className={cn(
                                    "h-4 w-4",
                                    post.isBookmarked && "fill-current"
                                  )} />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{post.views} views</span>
                                {post.projectUrl && (
                                  <>
                                    <span>•</span>
                                    <Link href={post.projectUrl}>
                                      <Button variant="link" size="sm" className="h-auto p-0">
                                        View Project
                                        <ChevronRight className="h-3 w-3 ml-1" />
                                      </Button>
                                    </Link>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Active Challenges */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Active Challenges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {challenges.filter((c: Challenge) => c.status === 'active').slice(0, 3).map((challenge: Challenge) => (
                  <div key={challenge.id} className="space-y-2">
                    <Link href={`/community/challenge/${challenge.id}`}>
                      <h4 className="font-semibold hover:text-primary">
                        {challenge.title}
                      </h4>
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {challenge.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getDifficultyColor(challenge.difficulty))}
                      >
                        {challenge.difficulty}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {challenge.participants} participants
                      </span>
                    </div>
                    {challenge.prize && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <Zap className="h-3 w-3" />
                        {challenge.prize}
                      </div>
                    )}
                  </div>
                ))}
                <Separator />
                <Link href="/community/challenges">
                  <Button variant="ghost" className="w-full" size="sm">
                    View all challenges
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Contributors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {leaderboard.map((user: LeaderboardUser, index: number) => (
                  <div key={user.id} className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 && "bg-yellow-500/20 text-yellow-500",
                      index === 1 && "bg-gray-500/20 text-gray-500",
                      index === 2 && "bg-orange-500/20 text-orange-500",
                      index > 2 && "bg-muted text-muted-foreground"
                    )}>
                      {user.rank}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback>
                        {user.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Link href={`/user/${user.username}`}>
                        <p className="font-medium text-sm hover:underline">
                          {user.displayName}
                        </p>
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {user.score.toLocaleString()} points
                        </span>
                        {user.streakDays > 0 && (
                          <Badge variant="secondary" className="text-xs h-5">
                            <Target className="h-3 w-3 mr-1" />
                            {user.streakDays} day streak
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {user.badges.slice(0, 2).map((badge: string) => (
                        <div
                          key={badge}
                          className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center"
                          title={badge}
                        >
                          {getBadgeIcon(badge)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <Separator />
                <Link href="/community/leaderboard">
                  <Button variant="ghost" className="w-full" size="sm">
                    View full leaderboard
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Community Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Community Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">12.5K</p>
                    <p className="text-sm text-muted-foreground">Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">3.2K</p>
                    <p className="text-sm text-muted-foreground">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">892</p>
                    <p className="text-sm text-muted-foreground">Active Now</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">45</p>
                    <p className="text-sm text-muted-foreground">Challenges</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}