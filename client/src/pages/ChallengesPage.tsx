import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Code, Clock, Star, Zap, Target, Users, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Challenge {
  id: number;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  points: number;
  tags: string[];
  submissionCount: number;
  successRate: number;
  createdAt: string;
  estimatedTime: number;
}

interface Submission {
  id: number;
  challengeId: number;
  challengeTitle: string;
  status: 'pending' | 'accepted' | 'rejected';
  score: number;
  submittedAt: string;
  executionTime: number;
}

export default function ChallengesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch challenges
  const { data: challenges, isLoading: challengesLoading } = useQuery({
    queryKey: ["/api/challenges", filter, difficulty, category, searchQuery],
    queryFn: () => apiRequest(`/api/challenges?filter=${filter}&difficulty=${difficulty}&category=${category}&search=${searchQuery}`)
  });

  // Fetch user submissions
  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/challenges/submissions"],
    queryFn: () => apiRequest("/api/challenges/submissions")
  });

  // Fetch leaderboard
  const { data: leaderboard } = useQuery({
    queryKey: ["/api/challenges/leaderboard"],
    queryFn: () => apiRequest("/api/challenges/leaderboard")
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/challenges/stats"],
    queryFn: () => apiRequest("/api/challenges/stats")
  });

  // Submit solution mutation
  const submitSolutionMutation = useMutation({
    mutationFn: (data: { challengeId: number; code: string }) =>
      apiRequest("/api/challenges/submit", { method: "POST", body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges/submissions"] });
      toast({
        title: "Solution Submitted",
        description: "Your solution has been submitted for evaluation."
      });
    }
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-orange-100 text-orange-800';
      case 'expert':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return <Star className="h-4 w-4" />;
      case 'intermediate':
        return <Target className="h-4 w-4" />;
      case 'advanced':
        return <Zap className="h-4 w-4" />;
      case 'expert':
        return <Trophy className="h-4 w-4" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

  if (challengesLoading || submissionsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Coding Challenges</h1>
            <p className="text-gray-600 mt-2">
              Sharpen your skills with programming challenges and compete with developers worldwide
            </p>
          </div>
          <Button>
            <Code className="h-4 w-4 mr-2" />
            Create Challenge
          </Button>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="text-sm text-gray-600">Challenges Solved</p>
                    <p className="text-2xl font-bold">{stats.challengesSolved || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Target className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold">{stats.successRate || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Rank</p>
                    <p className="text-2xl font-bold">#{stats.rank || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Points</p>
                    <p className="text-2xl font-bold">{stats.totalPoints || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="challenges" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="my-submissions">My Submissions</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="challenges" className="space-y-6">
            {/* Filters */}
            <div className="flex gap-4 items-center flex-wrap">
              <Input
                placeholder="Search challenges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="algorithms">Algorithms</SelectItem>
                  <SelectItem value="data-structures">Data Structures</SelectItem>
                  <SelectItem value="math">Mathematics</SelectItem>
                  <SelectItem value="strings">Strings</SelectItem>
                  <SelectItem value="dynamic-programming">Dynamic Programming</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Challenges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {challenges?.map((challenge: Challenge) => (
                <Card key={challenge.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{challenge.title}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getDifficultyColor(challenge.difficulty)}>
                            {getDifficultyIcon(challenge.difficulty)}
                            <span className="ml-1 capitalize">{challenge.difficulty}</span>
                          </Badge>
                          <Badge variant="outline">{challenge.category}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Trophy className="h-4 w-4" />
                          <span className="font-semibold">{challenge.points}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600 line-clamp-3">{challenge.description}</p>
                    
                    <div className="flex flex-wrap gap-1">
                      {challenge.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {challenge.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{challenge.tags.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {challenge.submissionCount} solved
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        ~{challenge.estimatedTime}min
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Success Rate</span>
                        <span>{challenge.successRate}%</span>
                      </div>
                      <Progress value={challenge.successRate} className="h-2" />
                    </div>

                    <Button className="w-full">
                      <Code className="h-4 w-4 mr-2" />
                      Solve Challenge
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {!challenges?.length && (
              <div className="text-center py-12">
                <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges found</h3>
                <p className="text-gray-500">
                  Try adjusting your search criteria or filters.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-submissions" className="space-y-6">
            <div className="space-y-4">
              {submissions?.map((submission: Submission) => (
                <Card key={submission.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{submission.challengeTitle}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>Submitted {new Date(submission.submittedAt).toLocaleDateString()}</span>
                          <span>Score: {submission.score}/100</span>
                          <span>Time: {submission.executionTime}ms</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={
                          submission.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {submission.status}
                        </Badge>
                        <Button variant="outline" size="sm">
                          View Solution
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!submissions?.length && (
                <div className="text-center py-12">
                  <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
                  <p className="text-gray-500 mb-4">
                    Start solving challenges to see your submissions here.
                  </p>
                  <Button>
                    <Code className="h-4 w-4 mr-2" />
                    Browse Challenges
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Global Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaderboard?.slice(0, 10).map((user: any, index: number) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-gray-600">{user.challengesSolved} challenges solved</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">{user.totalPoints} pts</p>
                        <p className="text-sm text-gray-600">{user.successRate}% success rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {['Algorithms', 'Data Structures', 'Mathematics', 'Strings', 'Dynamic Programming', 'Graphs'].map(category => (
                <Card key={category} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Code className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold mb-2">{category}</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Master {category.toLowerCase()} with hands-on challenges
                    </p>
                    <Button variant="outline" className="w-full">
                      Explore {category}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}