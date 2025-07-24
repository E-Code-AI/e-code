import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  DollarSign, Trophy, Code, Clock, Users, 
  ChevronRight, Filter, Search, Star, TrendingUp,
  Calendar, AlertCircle, CheckCircle, XCircle
} from 'lucide-react';

export default function Bounties() {
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

  const bounties = [
    {
      id: 1,
      title: 'Build a Discord Bot with AI Integration',
      description: 'Create a Discord bot that uses OpenAI to respond to user messages intelligently. Must include command handling and proper error management.',
      reward: 500,
      status: 'open',
      difficulty: 'intermediate',
      submissions: 12,
      deadline: '2024-02-15',
      tags: ['Python', 'Discord.py', 'OpenAI', 'Bot'],
      author: {
        name: 'TechStartup Inc',
        avatar: '🏢',
        verified: true
      }
    },
    {
      id: 2,
      title: 'React Native Mobile App - Weather Tracker',
      description: 'Develop a mobile weather tracking app using React Native. Must include location services, weather API integration, and offline support.',
      reward: 750,
      status: 'open',
      difficulty: 'advanced',
      submissions: 8,
      deadline: '2024-02-20',
      tags: ['React Native', 'Mobile', 'API', 'TypeScript'],
      author: {
        name: 'MobileFirst',
        avatar: '📱',
        verified: true
      }
    },
    {
      id: 3,
      title: 'Fix Memory Leak in Node.js Application',
      description: 'Identify and fix a memory leak in our production Node.js application. Must provide detailed analysis and solution.',
      reward: 300,
      status: 'in-progress',
      difficulty: 'intermediate',
      submissions: 5,
      deadline: '2024-02-10',
      tags: ['Node.js', 'Performance', 'Debugging'],
      author: {
        name: 'DevOps Team',
        avatar: '🔧',
        verified: false
      }
    },
    {
      id: 4,
      title: 'Create Educational Python Tutorial Series',
      description: 'Write a 5-part tutorial series teaching Python basics to beginners. Include code examples and exercises.',
      reward: 400,
      status: 'completed',
      difficulty: 'beginner',
      submissions: 25,
      deadline: '2024-01-30',
      tags: ['Python', 'Tutorial', 'Education', 'Writing'],
      author: {
        name: 'EduTech',
        avatar: '🎓',
        verified: true
      },
      winner: 'user123'
    }
  ];

  const myBounties = [
    {
      id: 5,
      title: 'Implement Authentication System',
      description: 'Add JWT-based authentication to existing Express API',
      reward: 250,
      status: 'submitted',
      submittedAt: '2024-01-28',
      feedback: 'Under review'
    },
    {
      id: 6,
      title: 'Data Visualization Dashboard',
      description: 'Create interactive charts using D3.js',
      reward: 600,
      status: 'accepted',
      submittedAt: '2024-01-25',
      feedback: 'Great work! Payment processing.'
    }
  ];

  const handleApplyToBounty = (bountyId: number) => {
    toast({
      title: "Application submitted",
      description: "You've successfully applied to this bounty. Good luck!"
    });
  };

  const handleCreateBounty = () => {
    toast({
      title: "Bounty created",
      description: "Your bounty has been posted and is now visible to the community."
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'in-progress': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'submitted': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'accepted': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          Bounties
        </h1>
        <p className="text-muted-foreground mt-2">
          Solve problems, build projects, and earn rewards
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">$1,250</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">87%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse">Browse Bounties</TabsTrigger>
          <TabsTrigger value="my-bounties">My Bounties</TabsTrigger>
          <TabsTrigger value="create">Create Bounty</TabsTrigger>
        </TabsList>

        {/* Browse Bounties Tab */}
        <TabsContent value="browse" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search bounties..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Bounties</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="reward-high">Highest Reward</SelectItem>
                    <SelectItem value="reward-low">Lowest Reward</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Bounty List */}
          <div className="space-y-4">
            {bounties.map((bounty) => (
              <Card key={bounty.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(bounty.status)}
                        <h3 className="text-lg font-semibold">{bounty.title}</h3>
                        <Badge className={getDifficultyColor(bounty.difficulty)}>
                          {bounty.difficulty}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">
                        {bounty.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {bounty.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Due {bounty.deadline}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{bounty.submissions} submissions</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{bounty.author.avatar}</span>
                            <span>{bounty.author.name}</span>
                            {bounty.author.verified && (
                              <Badge variant="secondary" className="h-5">
                                <CheckCircle className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-green-600">${bounty.reward}</p>
                      <p className="text-sm text-muted-foreground mb-2">reward</p>
                      {bounty.status === 'open' ? (
                        <Button 
                          size="sm"
                          onClick={() => handleApplyToBounty(bounty.id)}
                        >
                          Apply
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      ) : bounty.status === 'completed' && bounty.winner ? (
                        <Badge variant="secondary">
                          Won by @{bounty.winner}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {bounty.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* My Bounties Tab */}
        <TabsContent value="my-bounties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Submissions</CardTitle>
              <CardDescription>
                Track the status of your bounty submissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {myBounties.map((bounty) => (
                <Card key={bounty.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(bounty.status)}
                          <h4 className="font-semibold">{bounty.title}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {bounty.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Submitted {bounty.submittedAt}
                          </span>
                          <Badge variant={bounty.status === 'accepted' ? 'default' : 'secondary'}>
                            {bounty.feedback}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">${bounty.reward}</p>
                        {bounty.status === 'accepted' && (
                          <Button size="sm" variant="outline" className="mt-2">
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Bounty Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create a New Bounty</CardTitle>
              <CardDescription>
                Post a bounty to get help from the community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Bounty Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Build a REST API with Node.js"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    className="w-full min-h-[150px] px-3 py-2 text-sm rounded-md border bg-background"
                    placeholder="Describe what you need built, including requirements and deliverables..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reward">Reward ($)</Label>
                    <Input
                      id="reward"
                      type="number"
                      placeholder="500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select>
                      <SelectTrigger id="difficulty">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    placeholder="React, TypeScript, API, Frontend"
                  />
                </div>

                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-semibold mb-2">Bounty Preview</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Reward:</strong> $500</p>
                    <p><strong>Platform Fee (10%):</strong> $50</p>
                    <p><strong>You'll Pay:</strong> $550</p>
                  </div>
                </div>

                <Button onClick={handleCreateBounty} className="w-full">
                  Create Bounty
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}