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



export default function Community() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch community posts
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: activeCategory !== 'all' || searchQuery 
      ? [`/api/community/posts?${new URLSearchParams(
          Object.assign(
            activeCategory !== 'all' ? { category: activeCategory } : {},
            searchQuery ? { search: searchQuery } : {}
          )
        )}`]
      : ['/api/community/posts']
  });

  // Fetch challenges
  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ['/api/community/challenges']
  });

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery<LeaderboardUser[]>({
    queryKey: ['/api/community/leaderboard']
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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col space-y-3 sm:space-y-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Community</h1>
            <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
              Share your projects, get help, and connect with other creators
            </p>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:gap-3">
            <Input
              placeholder="Search community..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[240px] md:w-[280px] lg:w-[320px]"
            />
            <Link href="/community/new">
              <Button className="w-full sm:w-auto whitespace-nowrap">
                <Plus className="h-4 w-4 mr-2" />
                <span className="sm:inline">New Post</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 lg:gap-6">
          {/* Posts Section */}
          <div className="xl:col-span-3 space-y-4 sm:space-y-6">
            {/* Category Tabs */}
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <ScrollArea className="w-full -mx-3 sm:-mx-0 px-3 sm:px-0">
                <TabsList className="inline-flex h-auto p-1 bg-muted rounded-lg">
                  <div className="flex space-x-1">
                    {CATEGORIES.map(category => (
                      <TabsTrigger 
                        key={category.id} 
                        value={category.id}
                        className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-xs sm:text-sm"
                      >
                        <category.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>{category.name}</span>
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
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 sm:gap-3 mb-3">
                              <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                                <AvatarImage src={post.author.avatarUrl} />
                                <AvatarFallback className="text-xs sm:text-sm">
                                  {post.author.displayName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Link href={`/user/${post.author.username}`}>
                                    <span className="font-semibold hover:underline text-sm sm:text-base truncate block">
                                      {post.author.displayName}
                                    </span>
                                  </Link>
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    {post.author.reputation} rep
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {post.createdAt}
                                </p>
                              </div>
                            </div>

                            <Link href={`/community/post/${post.id}`}>
                              <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-2 hover:text-primary line-clamp-2">
                                {post.title}
                              </h3>
                            </Link>

                            <p className="text-muted-foreground mb-3 sm:mb-4 line-clamp-2 text-sm sm:text-base">
                              {post.content}
                            </p>

                            {post.imageUrl && (
                              <div className="mb-3 sm:mb-4 rounded-lg overflow-hidden bg-muted aspect-video">
                                <img 
                                  src={post.imageUrl} 
                                  alt={post.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 sm:gap-2 mb-3 flex-wrap">
                              {post.tags.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-xs px-2 py-0.5">
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-0.5 sm:gap-1 -ml-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "gap-1 sm:gap-1.5 px-2 sm:px-3 h-8 sm:h-9",
                                    post.isLiked && "text-red-500"
                                  )}
                                  onClick={() => likePostMutation.mutate(post.id)}
                                >
                                  <Heart className={cn(
                                    "h-3.5 w-3.5 sm:h-4 sm:w-4",
                                    post.isLiked && "fill-current"
                                  )} />
                                  <span className="text-xs sm:text-sm">{post.likes}</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="gap-1 sm:gap-1.5 px-2 sm:px-3 h-8 sm:h-9">
                                  <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  <span className="text-xs sm:text-sm">{post.comments}</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="px-2 sm:px-3 h-8 sm:h-9">
                                  <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    "px-2 sm:px-3 h-8 sm:h-9",
                                    post.isBookmarked && "text-blue-500"
                                  )}
                                  onClick={() => bookmarkPostMutation.mutate(post.id)}
                                >
                                  <Bookmark className={cn(
                                    "h-3.5 w-3.5 sm:h-4 sm:w-4",
                                    post.isBookmarked && "fill-current"
                                  )} />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                <span>{post.views} views</span>
                                {post.projectUrl && (
                                  <>
                                    <span>•</span>
                                    <Link href={post.projectUrl}>
                                      <Button variant="link" size="sm" className="h-auto p-0 text-xs sm:text-sm">
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
          <div className="space-y-4 lg:space-y-6">
            {/* Active Challenges */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                  Active Challenges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                {challenges.filter((c: Challenge) => c.status === 'active').slice(0, 3).map((challenge: Challenge) => (
                  <div key={challenge.id} className="space-y-1.5 sm:space-y-2">
                    <Link href={`/community/challenge/${challenge.id}`}>
                      <h4 className="font-semibold hover:text-primary text-sm sm:text-base line-clamp-2">
                        {challenge.title}
                      </h4>
                    </Link>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                      {challenge.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs px-2 py-0.5", getDifficultyColor(challenge.difficulty))}
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
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  Top Contributors
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                {leaderboard.map((user: LeaderboardUser, index: number) => (
                  <div key={user.id} className="flex items-center gap-2 sm:gap-3">
                    <div className={cn(
                      "w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0",
                      index === 0 && "bg-yellow-500/20 text-yellow-500",
                      index === 1 && "bg-gray-500/20 text-gray-500",
                      index === 2 && "bg-orange-500/20 text-orange-500",
                      index > 2 && "bg-muted text-muted-foreground"
                    )}>
                      {user.rank}
                    </div>
                    <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback className="text-xs sm:text-sm">
                        {user.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <Link href={`/user/${user.username}`}>
                        <p className="font-medium text-xs sm:text-sm hover:underline truncate">
                          {user.displayName}
                        </p>
                      </Link>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <span className="text-xs text-muted-foreground">
                          {user.score.toLocaleString()} pts
                        </span>
                        {user.streakDays > 0 && (
                          <Badge variant="secondary" className="text-xs h-4 sm:h-5 px-1.5 sm:px-2">
                            <Target className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                            {user.streakDays}d
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-0.5 sm:gap-1 shrink-0">
                      {user.badges.slice(0, 2).map((badge: string) => (
                        <div
                          key={badge}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center"
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
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Community Stats</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold">12.5K</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold">3.2K</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold">892</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Active Now</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold">45</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Challenges</p>
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