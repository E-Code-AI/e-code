import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ECodeLoading } from '@/components/ECodeLoading';
import { 
  GitBranch, GitCommit, GitMerge, GitPullRequest,
  Plus, RefreshCw, Upload, Download, Search,
  ChevronDown, AlertCircle, CheckCircle, Clock,
  User, FileText, Copy, ExternalLink, Terminal,
  GitFork, Trash2, Settings, Filter, X
} from 'lucide-react';

export default function Git() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('repositories');
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch repositories
  const { data: repositories, isLoading: reposLoading } = useQuery({
    queryKey: ['/api/git/repositories'],
    enabled: true
  });

  // Fetch repository details if selected
  const { data: repoDetails, isLoading: detailsLoading } = useQuery({
    queryKey: [`/api/git/repositories/${selectedRepo?.id}`],
    enabled: !!selectedRepo
  });

  // Clone repository mutation
  const cloneRepoMutation = useMutation({
    mutationFn: async (data: { url: string, name: string }) => {
      return await apiRequest('/api/git/clone', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Repository cloned",
        description: "Your repository has been cloned successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/git/repositories'] });
      setShowCloneDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Clone failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Create repository mutation
  const createRepoMutation = useMutation({
    mutationFn: async (data: { name: string, description: string, private: boolean }) => {
      return await apiRequest('/api/git/create', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Repository created",
        description: "Your new repository has been created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/git/repositories'] });
      setShowCreateDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });



  const displayRepos = repositories || [];
  const displayDetails = repoDetails;

  const filteredRepos = Array.isArray(displayRepos) ? displayRepos.filter((repo: any) => 
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      'JavaScript': 'bg-yellow-500',
      'TypeScript': 'bg-blue-500',
      'Python': 'bg-green-500',
      'Java': 'bg-orange-500',
      'Go': 'bg-cyan-500',
      'Rust': 'bg-red-500',
      'C++': 'bg-purple-500',
      'Ruby': 'bg-pink-500',
    };
    return colors[language] || 'bg-gray-500';
  };

  if (reposLoading) {
    return <ECodeLoading fullScreen text="Loading repositories..." />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GitBranch className="h-8 w-8 text-primary" />
            Git Version Control
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your repositories, branches, and commits
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCloneDialog(true)}>
            <Download className="mr-2 h-4 w-4" />
            Clone Repository
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Repository
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="repositories">Repositories</TabsTrigger>
          <TabsTrigger value="commits" disabled={!selectedRepo}>Commits</TabsTrigger>
          <TabsTrigger value="branches" disabled={!selectedRepo}>Branches</TabsTrigger>
          <TabsTrigger value="pull-requests" disabled={!selectedRepo}>Pull Requests</TabsTrigger>
        </TabsList>

        {/* Repositories Tab */}
        <TabsContent value="repositories" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search repositories..."
                className="pl-9"
              />
            </div>
            <Select defaultValue="updated">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Recently updated</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="stars">Stars</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {filteredRepos.map((repo: any) => (
              <Card 
                key={repo.id} 
                className={`cursor-pointer transition-all ${selectedRepo?.id === repo.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                onClick={() => {
                  setSelectedRepo(repo);
                  setActiveTab('commits');
                }}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold">{repo.name}</h3>
                        <Badge variant={repo.visibility === 'public' ? 'default' : 'secondary'}>
                          {repo.visibility}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{repo.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <div className={`h-3 w-3 rounded-full ${getLanguageColor(repo.language)}`} />
                          {repo.language}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="h-3 w-3" />
                          {repo.forks}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {repo.lastUpdated}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={repo.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Commits Tab */}
        <TabsContent value="commits" className="space-y-4">
          {selectedRepo && (
            <>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{selectedRepo.name}</h2>
                  <ChevronDown className="h-4 w-4" />
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(displayDetails.branches || []).map((branch: string) => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button>
                  <GitCommit className="mr-2 h-4 w-4" />
                  New Commit
                </Button>
              </div>

              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {(displayDetails.commits || []).map((commit: any) => (
                    <Card key={commit.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-medium">{commit.message}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {commit.author}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {commit.date}
                              </span>
                              <span className="text-green-600">
                                +{commit.changes.additions}
                              </span>
                              <span className="text-red-600">
                                -{commit.changes.deletions}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {commit.id}
                            </code>
                            <Button variant="ghost" size="icon">
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches" className="space-y-4">
          {selectedRepo && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Branches</h2>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Branch
                </Button>
              </div>

              <div className="grid gap-2">
                {(displayDetails.branches || []).map((branch: string) => (
                  <Card key={branch}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          <span className="font-medium">{branch}</span>
                          {branch === selectedRepo.defaultBranch && (
                            <Badge variant="default" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <GitMerge className="mr-2 h-4 w-4" />
                            Merge
                          </Button>
                          {branch !== selectedRepo.defaultBranch && (
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Pull Requests Tab */}
        <TabsContent value="pull-requests" className="space-y-4">
          {selectedRepo && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Pull Requests</h2>
                <Button>
                  <GitPullRequest className="mr-2 h-4 w-4" />
                  New Pull Request
                </Button>
              </div>

              <div className="grid gap-2">
                {(displayDetails.pullRequests || []).map((pr: any) => (
                  <Card key={pr.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <GitPullRequest className={`h-4 w-4 ${pr.status === 'open' ? 'text-green-600' : 'text-purple-600'}`} />
                            <span className="font-medium">{pr.title}</span>
                            <Badge variant={pr.status === 'open' ? 'default' : 'secondary'}>
                              {pr.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>#{pr.id} opened by {pr.author}</span>
                            <span>{pr.created}</span>
                            <span>{pr.comments} comments</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Clone Repository Dialog */}
      <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Repository</DialogTitle>
            <DialogDescription>
              Enter the repository URL to clone it to your workspace
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            cloneRepoMutation.mutate({
              url: formData.get('url') as string,
              name: formData.get('name') as string
            });
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="url">Repository URL</Label>
                <Input
                  id="url"
                  name="url"
                  placeholder="https://github.com/username/repository.git"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Local Name (optional)</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="my-local-repo"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCloneDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={cloneRepoMutation.isPending}>
                {cloneRepoMutation.isPending ? 'Cloning...' : 'Clone Repository'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Repository Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Repository</DialogTitle>
            <DialogDescription>
              Create a new Git repository in your workspace
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createRepoMutation.mutate({
              name: formData.get('name') as string,
              description: formData.get('description') as string,
              private: formData.get('visibility') === 'private'
            });
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="repo-name">Repository Name</Label>
                <Input
                  id="repo-name"
                  name="name"
                  placeholder="my-awesome-project"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="A brief description of your repository"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select name="visibility" defaultValue="public">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Public</Badge>
                        <span className="text-sm">Anyone can see this repository</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Private</Badge>
                        <span className="text-sm">Only you can see this repository</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRepoMutation.isPending}>
                {createRepoMutation.isPending ? 'Creating...' : 'Create Repository'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}