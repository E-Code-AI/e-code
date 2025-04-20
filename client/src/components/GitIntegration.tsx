import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  TooltipProvider, 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Project } from "@shared/schema";
import { 
  GitBranch, 
  GitFork, 
  GitPullRequest, 
  Github, 
  GitMerge, 
  GitCommit, 
  Plus, 
  UploadCloud, 
  DownloadCloud, 
  AlertTriangle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GitIntegrationProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export function GitIntegration({ project, isOpen, onClose }: GitIntegrationProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  
  // Mock repository state for UI demonstration
  const [repoState, setRepoState] = useState({
    connected: false,
    repoUrl: "",
    branch: "main",
    commits: [] as { hash: string, message: string, author: string, date: string }[],
    changes: 3,
    untracked: 2,
  });
  
  const handleConnect = () => {
    // Mock successful repo connection
    setRepoState({
      ...repoState,
      connected: true,
      repoUrl: "https://github.com/user/repo",
      commits: [
        { 
          hash: "a1b2c3d", 
          message: "Initial commit", 
          author: "Demo User", 
          date: "2025-04-19" 
        },
        { 
          hash: "e4f5g6h", 
          message: "Update README.md", 
          author: "Demo User", 
          date: "2025-04-20" 
        },
      ]
    });
    
    toast({
      title: "Repository connected",
      description: "Successfully connected to GitHub repository.",
    });
  };
  
  const handlePush = () => {
    toast({
      title: "Changes pushed",
      description: "Your changes have been pushed to the repository.",
    });
  };
  
  const handlePull = () => {
    toast({
      title: "Repository pulled",
      description: "Latest changes have been pulled from the repository.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Git Integration
          </DialogTitle>
          <DialogDescription>
            Connect your project to a Git repository for version control.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="commits">Commits</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 py-4">
            {!repoState.connected ? (
              <Card>
                <CardHeader>
                  <CardTitle>Connect to a repository</CardTitle>
                  <CardDescription>
                    Link this project to a Git repository to enable version control.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid w-full items-center gap-3">
                    <Label htmlFor="repo-url">Repository URL</Label>
                    <Input
                      id="repo-url"
                      placeholder="https://github.com/username/repository.git"
                      value={repoState.repoUrl}
                      onChange={(e) => setRepoState({...repoState, repoUrl: e.target.value})}
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleConnect}>Connect Repository</Button>
                </CardFooter>
              </Card>
            ) : (
              <>
                <Alert>
                  <Github className="h-4 w-4" />
                  <AlertTitle>Connected to GitHub</AlertTitle>
                  <AlertDescription>
                    This project is linked to <strong>{repoState.repoUrl}</strong>
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-1">
                        <GitBranch className="h-4 w-4" />
                        Current Branch
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="px-3 py-1 text-sm">
                          {repoState.branch}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <GitFork className="h-4 w-4 mr-1" /> Switch
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-1">
                        <GitCommit className="h-4 w-4" />
                        Changes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-muted-foreground">Modified:</span>{" "}
                          <Badge>{repoState.changes}</Badge>
                          <span className="text-sm text-muted-foreground ml-2">Untracked:</span>{" "}
                          <Badge variant="outline">{repoState.untracked}</Badge>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Plus className="h-4 w-4 mr-1" /> Commit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-between mt-6">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" onClick={handlePull}>
                          <DownloadCloud className="h-4 w-4 mr-2" /> Pull
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Pull changes from remote repository</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={handlePush}>
                          <UploadCloud className="h-4 w-4 mr-2" /> Push
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Push local commits to remote repository</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="commits" className="space-y-4 py-4">
            {!repoState.connected ? (
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">
                  Connect to a repository first to view commits.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Recent Commits</h3>
                {repoState.commits.map((commit, index) => (
                  <div key={commit.hash} className="border rounded-md p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{commit.message}</p>
                        <p className="text-sm text-muted-foreground">
                          {commit.author} • {commit.date}
                        </p>
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {commit.hash}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="branches" className="space-y-4 py-4">
            {!repoState.connected ? (
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">
                  Connect to a repository first to view branches.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Branches</h3>
                  <Button variant="outline" size="sm">
                    <GitBranch className="h-4 w-4 mr-2" /> New Branch
                  </Button>
                </div>
                
                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Badge className="mr-2">Current</Badge>
                      <span className="font-medium">main</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Updated 2 hours ago
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <span className="font-medium">dev</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Updated 1 day ago
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}