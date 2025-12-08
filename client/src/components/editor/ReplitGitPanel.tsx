import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  GitCommit,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Settings,
  RefreshCw,
  ExternalLink,
  Search,
  ArrowDown,
  ArrowUp,
  Check,
  X,
  Loader2,
  User,
  Plus,
  Minus,
  FileCode,
  LogOut,
  Eye,
} from 'lucide-react';
import { SiGithub, SiBitbucket, SiGitlab } from 'react-icons/si';
import { cn } from '@/lib/utils';

interface GitHubStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
}

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

interface GitCommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

interface GitBranchInfo {
  name: string;
  current: boolean;
  isRemote: boolean;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
  ahead: number;
  behind: number;
  trackingBranch?: string;
}

interface ReplitGitPanelProps {
  projectId?: string;
  className?: string;
  mode?: 'desktop' | 'tablet' | 'mobile';
}

interface GitDiffResponse {
  filePath: string;
  diff: string;
  staged: boolean;
  truncated?: boolean;
}

type ViewMode = 'main' | 'settings';

function DiffViewer({ diff, isLoading }: { diff: string; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8" data-testid="diff-loading">
        <Loader2 className="w-6 h-6 animate-spin text-[#5c6670]" />
      </div>
    );
  }

  if (!diff || diff.trim() === '') {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="diff-empty">
        <FileCode className="w-12 h-12 text-[#5c6670]/40 mb-2" />
        <p className="text-[13px] text-[#5c6670]">No changes to display</p>
      </div>
    );
  }

  const lines = diff.split('\n');

  return (
    <ScrollArea className="h-[400px]" data-testid="diff-content">
      <pre className="font-mono text-[12px] leading-relaxed p-3">
        {lines.map((line, idx) => {
          let className = 'text-[#5c6670]';
          let bgClassName = '';
          
          if (line.startsWith('+') && !line.startsWith('+++')) {
            className = 'text-[#00a67e]';
            bgClassName = 'bg-[#00a67e]/10';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            className = 'text-[#e5484d]';
            bgClassName = 'bg-[#e5484d]/10';
          } else if (line.startsWith('@@')) {
            className = 'text-[#0079f2]';
            bgClassName = 'bg-[#0079f2]/10';
          } else if (line.startsWith('diff') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++')) {
            className = 'text-[#0e1525] dark:text-white font-medium';
          }

          return (
            <div
              key={idx}
              className={cn('px-2 -mx-2', bgClassName)}
              data-testid={`diff-line-${idx}`}
            >
              <span className={className}>{line}</span>
            </div>
          );
        })}
      </pre>
    </ScrollArea>
  );
}

function ShimmerBar({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-[#d4d8dd]/30 dark:bg-[#3d4452] rounded", className)}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

function CommitSkeleton() {
  return (
    <div className="space-y-3" data-testid="commit-skeleton">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-2 py-1.5">
          <div className="flex flex-col items-center pt-1">
            <ShimmerBar className="w-2 h-2 rounded-full" />
            <ShimmerBar className="w-0.5 flex-1 mt-1 min-h-[24px]" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <ShimmerBar className="h-3 w-3/4" />
            <div className="flex items-center gap-2">
              <ShimmerBar className="w-4 h-4 rounded-full" />
              <ShimmerBar className="h-2 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NoChangesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center" data-testid="no-changes-empty-state">
      <div className="w-12 h-12 flex items-center justify-center mb-3">
        <GitBranch className="w-12 h-12 text-[#5c6670]/40" />
      </div>
      <h3 className="text-[15px] font-medium leading-tight text-[#0e1525] dark:text-white mb-1">
        No uncommitted changes
      </h3>
      <p className="text-[13px] text-[#5c6670]">
        Your working directory is clean. Make some changes to see them here.
      </p>
    </div>
  );
}

export function ReplitGitPanel({ projectId, className, mode = 'desktop' }: ReplitGitPanelProps & { mode?: 'desktop' | 'tablet' | 'mobile' }) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  
  const isTablet = mode === 'tablet';
  const isMobile = mode === 'mobile';
  const touchMode = isTablet || isMobile;
  const [commitMessage, setCommitMessage] = useState('');
  const [showConnections, setShowConnections] = useState(true);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileStaged, setSelectedFileStaged] = useState(false);

  const { data: status, refetch: refetchStatus, isLoading } = useQuery<GitStatus>({
    queryKey: ['/api/git/status'],
  });

  const { data: remotesData } = useQuery<{ remotes: { name: string; url: string; type: 'fetch' | 'push' }[] }>({
    queryKey: ['/api/git/remotes'],
    enabled: !!status,
  });

  const { data: commitsData, isLoading: isLoadingCommits } = useQuery<{ commits: GitCommitInfo[] }>({
    queryKey: ['/api/git/log'],
    enabled: !!status,
  });
  const commits = commitsData?.commits;

  const { data: branchesData } = useQuery<{ branches: GitBranchInfo[] }>({
    queryKey: ['/api/git/branches'],
    enabled: !!status,
  });
  const branches = branchesData?.branches || [];

  const { data: githubStatus, isLoading: isLoadingGitHub, refetch: refetchGitHubStatus } = useQuery<GitHubStatus>({
    queryKey: ['/api/git/github/status'],
  });

  const { data: diffData, isLoading: isLoadingDiff } = useQuery<GitDiffResponse>({
    queryKey: ['/api/git/diff', selectedFile, selectedFileStaged],
    queryFn: () => apiRequest(`/api/git/diff/${encodeURIComponent(selectedFile!)}${selectedFileStaged ? '?staged=true' : ''}`, 'GET'),
    enabled: !!selectedFile,
  });

  const originRemote = remotesData?.remotes?.find(r => r.name === 'origin' && r.type === 'fetch');
  const repoName = originRemote?.url?.split('/').slice(-2).join('/').replace('.git', '') || '';

  const stageMutation = useMutation({
    mutationFn: async (files: string[]) => apiRequest('/api/git/stage', 'POST', { files }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      toast({ description: 'Files staged' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to stage files', variant: 'destructive' });
    },
  });

  const unstageMutation = useMutation({
    mutationFn: async (files: string[]) => apiRequest('/api/git/unstage', 'POST', { files }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      toast({ description: 'Files unstaged' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to unstage files', variant: 'destructive' });
    },
  });

  const pullMutation = useMutation({
    mutationFn: async () => apiRequest('/api/git/pull', 'POST', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/git/log'] });
      toast({ description: 'Changes pulled successfully' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to pull changes', variant: 'destructive' });
    },
  });

  const pushMutation = useMutation({
    mutationFn: async () => apiRequest('/api/git/push', 'POST', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/git/log'] });
      toast({ description: 'Changes pushed successfully' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to push changes', variant: 'destructive' });
    },
  });

  const fetchMutation = useMutation({
    mutationFn: async () => apiRequest('/api/git/fetch', 'POST', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      toast({ description: 'Fetched latest from remote' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to fetch from remote', variant: 'destructive' });
    },
  });

  const commitMutation = useMutation({
    mutationFn: async (message: string) => apiRequest('/api/git/commit', 'POST', { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/git/log'] });
      setCommitMessage('');
      toast({ description: 'Changes committed successfully' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to commit', variant: 'destructive' });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (branch: string) => apiRequest('/api/git/checkout', 'POST', { branch }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/git/branches'] });
      setShowBranchDropdown(false);
      toast({ description: 'Switched branch' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to switch branch', variant: 'destructive' });
    },
  });

  const connectRemoteMutation = useMutation({
    mutationFn: async (url: string) => apiRequest('/api/git/remotes', 'POST', { url, name: 'origin' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/remotes'] });
      setRemoteUrl('');
      toast({ description: 'Remote connected' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to connect remote', variant: 'destructive' });
    },
  });

  const disconnectGitHubMutation = useMutation({
    mutationFn: async () => apiRequest('/api/git/github/disconnect', 'POST', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/github/status'] });
      toast({ description: 'GitHub disconnected successfully' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to disconnect GitHub', variant: 'destructive' });
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: async (name: string) => apiRequest('/api/git/branches', 'POST', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/branches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      toast({ description: 'Branch created successfully' });
      setShowBranchDropdown(false);
      setBranchSearch('');
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to create branch', variant: 'destructive' });
    },
  });

  const handleConnectGitHub = async () => {
    try {
      const response = await apiRequest('/api/git/github/connect', 'GET');
      if (response.authUrl) {
        window.open(response.authUrl, '_blank', 'width=600,height=700');
      }
    } catch (error: any) {
      toast({ description: error.message || 'Failed to connect to GitHub', variant: 'destructive' });
    }
  };

  const handleFileClick = (file: string, staged: boolean = false) => {
    setSelectedFile(file);
    setSelectedFileStaged(staged);
  };

  const closeDiffModal = () => {
    setSelectedFile(null);
    setSelectedFileStaged(false);
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const hasChanges = status && (status.staged.length > 0 || status.unstaged.length > 0 || status.untracked.length > 0);
  const unpushedCount = status?.ahead || 0;
  const unpushedCommits = commits?.slice(0, unpushedCount) || [];

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(branchSearch.toLowerCase())
  );

  const importantBranches = filteredBranches.filter(b => b.name === 'main' || b.name === 'master');
  const activeBranches = filteredBranches.filter(b => !b.isRemote && b.name !== 'main' && b.name !== 'master');
  const staleBranches = filteredBranches.filter(b => b.isRemote);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-white dark:bg-[#1c2333]", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-[#5c6670]" />
      </div>
    );
  }

  // Settings View
  if (viewMode === 'settings') {
    return (
      <div className={cn("flex flex-col h-full bg-white dark:bg-[#1c2333]", className)} data-testid="git-settings">
        <div className={cn(
          "flex items-center gap-3 border-b border-[#d4d8dd] dark:border-[#3d4452]",
          touchMode ? "px-4 min-h-[56px]" : "px-3 min-h-[48px]"
        )}>
          <button
            onClick={() => setViewMode('main')}
            className={cn(
              "hover:bg-[#d4d8dd]/30 dark:hover:bg-[#3d4452] rounded-lg touch-manipulation",
              touchMode ? "p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center" : "p-1.5"
            )}
            data-testid="back-from-settings"
          >
            <ChevronLeft className={cn(touchMode ? "w-5 h-5" : "w-[18px] h-[18px]", "text-[#5c6670]")} />
          </button>
          <span className={cn(
            "font-medium leading-tight text-[#0e1525] dark:text-white",
            touchMode ? "text-base" : "text-[15px]"
          )}>Settings</span>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-6">
            {/* Remote */}
            <div className="space-y-2">
              <h3 className="text-[15px] font-medium leading-tight text-[#0e1525] dark:text-white">Remote</h3>
              <div className="flex gap-2">
                <Input
                  value={remoteUrl || originRemote?.url || ''}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="https://github.com/username/repo.git"
                  className="flex-1 h-8 bg-white dark:bg-[#1c2333] border-[#d4d8dd] dark:border-[#3d4452] rounded-lg"
                  data-testid="input-remote-url"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => remoteUrl && connectRemoteMutation.mutate(remoteUrl)}
                  disabled={!remoteUrl || connectRemoteMutation.isPending}
                  className="h-8 border-[#d4d8dd] dark:border-[#3d4452] rounded-lg"
                  data-testid="button-create-remote"
                >
                  Create Remote
                </Button>
              </div>
            </div>

            {/* Connections */}
            <div className="space-y-2">
              <button
                onClick={() => setShowConnections(!showConnections)}
                className="flex items-center justify-between w-full p-3 bg-white dark:bg-[#242b3d] border border-[#d4d8dd] dark:border-[#3d4452] rounded-lg"
              >
                <span className="text-[15px] font-medium leading-tight text-[#0e1525] dark:text-white">Connections</span>
                {showConnections ? <ChevronUp className="w-[18px] h-[18px] text-[#5c6670]" /> : <ChevronDown className="w-[18px] h-[18px] text-[#5c6670]" />}
              </button>

              <AnimatePresence>
                {showConnections && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2"
                  >
                    {/* GitHub */}
                    <div 
                      className="flex items-center justify-between p-3 bg-white dark:bg-[#242b3d] border border-[#d4d8dd] dark:border-[#3d4452] rounded-lg"
                      data-testid="github-connection-section"
                    >
                      {isLoadingGitHub ? (
                        <div className="flex items-center gap-3">
                          <SiGithub className="w-[18px] h-[18px]" />
                          <span className="text-[15px] text-[#0e1525] dark:text-white">GitHub</span>
                          <Loader2 className="w-4 h-4 animate-spin text-[#5c6670]" data-testid="github-status-loading" />
                        </div>
                      ) : githubStatus?.connected ? (
                        <>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-6 h-6" data-testid="github-avatar">
                              <AvatarImage src={githubStatus.avatarUrl} alt={githubStatus.username} />
                              <AvatarFallback>
                                <SiGithub className="w-4 h-4" />
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[15px] text-[#0e1525] dark:text-white" data-testid="github-username">
                              {githubStatus.username}
                            </span>
                            <span className="flex items-center gap-1 text-[13px] text-green-600">
                              <span className="w-2 h-2 bg-green-500 rounded-full" />
                              Connected
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                            onClick={() => disconnectGitHubMutation.mutate(undefined)}
                            disabled={disconnectGitHubMutation.isPending}
                            data-testid="button-disconnect-github"
                          >
                            {disconnectGitHubMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <LogOut className="w-4 h-4 mr-1" />
                            )}
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <SiGithub className="w-[18px] h-[18px]" />
                            <span className="text-[15px] text-[#0e1525] dark:text-white">GitHub</span>
                            <span className="flex items-center gap-1 text-[13px] text-[#5c6670]">
                              <span className="w-2 h-2 bg-[#5c6670] rounded-full" />
                              Disconnected
                            </span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 border-[#d4d8dd] dark:border-[#3d4452] rounded-lg"
                            onClick={handleConnectGitHub}
                            data-testid="button-connect-github"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Connect
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Bitbucket */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-[#242b3d] border border-[#d4d8dd] dark:border-[#3d4452] rounded-lg">
                      <div className="flex items-center gap-3">
                        <SiBitbucket className="w-[18px] h-[18px] text-[#2684FF]" />
                        <span className="text-[15px] text-[#0e1525] dark:text-white">Bitbucket</span>
                        <span className="flex items-center gap-1 text-[13px] text-[#5c6670]">
                          <span className="w-2 h-2 bg-[#5c6670] rounded-full" />
                          Disconnected
                        </span>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 border-[#d4d8dd] rounded-lg">
                        <ExternalLink className="w-3 h-3 mr-1" />Sign in
                      </Button>
                    </div>

                    {/* GitLab */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-[#242b3d] border border-[#d4d8dd] dark:border-[#3d4452] rounded-lg">
                      <div className="flex items-center gap-3">
                        <SiGitlab className="w-[18px] h-[18px] text-[#FC6D26]" />
                        <span className="text-[15px] text-[#0e1525] dark:text-white">GitLab</span>
                        <span className="flex items-center gap-1 text-[13px] text-[#5c6670]">
                          <span className="w-2 h-2 bg-[#5c6670] rounded-full" />
                          Disconnected
                        </span>
                      </div>
                      <Button variant="outline" size="sm" className="h-8 border-[#d4d8dd] rounded-lg">
                        <ExternalLink className="w-3 h-3 mr-1" />Sign in
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Commit Author */}
            <div className="space-y-2">
              <h3 className="text-[15px] font-medium leading-tight text-[#0e1525] dark:text-white">Commit author</h3>
              <div className="p-3 bg-white dark:bg-[#242b3d] border-2 border-[#0079f2] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0079f2] rounded-full flex items-center justify-center">
                    <User className="w-[18px] h-[18px] text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-medium leading-tight text-[#0e1525] dark:text-white">developer</span>
                      <a href="#" className="text-[13px] text-[#0079f2] flex items-center gap-1">
                        GitHub Settings <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <span className="text-[13px] text-[#5c6670]">developer@example.com</span>
                  </div>
                  <div className="w-[18px] h-[18px] bg-[#0079f2] rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Main View
  return (
    <div className={cn("flex flex-col h-full bg-white dark:bg-[#1c2333] relative", className)} data-testid="git-panel">
      {/* Header - tablet-responsive with proper touch targets */}
      <div className={cn(
        "flex items-center justify-between border-b border-[#d4d8dd] dark:border-[#3d4452]",
        touchMode ? "px-4 min-h-[56px]" : "px-3 min-h-[48px]"
      )}>
        <button
          onClick={() => setShowBranchDropdown(!showBranchDropdown)}
          className={cn(
            "flex items-center gap-2 hover:bg-[#d4d8dd]/30 dark:hover:bg-[#3d4452] rounded-lg touch-manipulation",
            touchMode ? "px-3 py-2.5 min-h-[44px]" : "px-2 py-1"
          )}
          data-testid="branch-selector"
        >
          <GitBranch className={cn(touchMode ? "w-5 h-5" : "w-[18px] h-[18px]", "text-[#5c6670]")} />
          <span className={cn(
            "font-medium leading-tight text-[#0e1525] dark:text-white",
            touchMode ? "text-base" : "text-[15px]"
          )}>{status?.branch || 'main'}</span>
          <ChevronDown className={cn(touchMode ? "w-5 h-5" : "w-[18px] h-[18px]", "text-[#5c6670]")} />
        </button>
        
        <div className={cn("flex items-center", touchMode ? "gap-2" : "gap-1")}>
          <button
            onClick={() => setViewMode('settings')}
            className={cn(
              "hover:bg-[#d4d8dd]/30 dark:hover:bg-[#3d4452] rounded-lg touch-manipulation",
              touchMode ? "p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center" : "p-1.5"
            )}
            data-testid="git-settings-button"
          >
            <Settings className={cn(touchMode ? "w-5 h-5" : "w-[18px] h-[18px]", "text-[#5c6670]")} />
          </button>
          <button
            onClick={() => refetchStatus()}
            className={cn(
              "hover:bg-[#d4d8dd]/30 dark:hover:bg-[#3d4452] rounded-lg touch-manipulation",
              touchMode ? "p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center" : "p-1.5"
            )}
            data-testid="git-refresh-button"
          >
            <RefreshCw className={cn(touchMode ? "w-5 h-5" : "w-[18px] h-[18px]", "text-[#5c6670]")} />
          </button>
        </div>
      </div>

      {/* Branch Dropdown */}
      <AnimatePresence>
        {showBranchDropdown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="absolute top-12 left-2 right-2 z-50 bg-white dark:bg-[#242b3d] border border-[#d4d8dd] dark:border-[#3d4452] rounded-lg shadow-lg overflow-hidden"
          >
            <div className="p-2 border-b border-[#d4d8dd] dark:border-[#3d4452]">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-[#d4d8dd]/20 dark:bg-[#1c2333] rounded-lg border border-[#d4d8dd] dark:border-[#3d4452]">
                <Search className="w-[18px] h-[18px] text-[#5c6670]" />
                <input
                  type="text"
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  placeholder="Find or create a branch..."
                  className="flex-1 bg-inherit text-[15px] outline-none text-[#0e1525] dark:text-white placeholder:text-[#5c6670]"
                  data-testid="input-branch-search"
                />
              </div>
            </div>

            <ScrollArea className="max-h-48">
              <div className="p-1">
                {importantBranches.length > 0 && (
                  <div className="mb-1">
                    <div className="px-2 py-1 text-[11px] font-medium text-[#5c6670] uppercase tracking-wider">Important</div>
                    {importantBranches.map(branch => (
                      <button
                        key={branch.name}
                        onClick={() => checkoutMutation.mutate(branch.name)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#d4d8dd]/30 dark:hover:bg-[#3d4452] rounded-lg text-left"
                        data-testid={`branch-${branch.name}`}
                      >
                        <span className={cn("w-2 h-2 rounded-full", branch.current ? "bg-[#0079f2]" : "bg-green-500")} />
                        <span className="text-[15px] text-[#0e1525] dark:text-white flex-1">{branch.name}</span>
                        {branch.current && <Check className="w-[18px] h-[18px] text-[#0079f2]" />}
                      </button>
                    ))}
                  </div>
                )}

                {activeBranches.length > 0 && (
                  <div className="mb-1">
                    <div className="px-2 py-1 text-[11px] font-medium text-[#5c6670] uppercase tracking-wider">Active</div>
                    {activeBranches.map(branch => (
                      <button
                        key={branch.name}
                        onClick={() => checkoutMutation.mutate(branch.name)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#d4d8dd]/30 dark:hover:bg-[#3d4452] rounded-lg text-left"
                        data-testid={`branch-${branch.name}`}
                      >
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-[15px] text-[#0e1525] dark:text-white">{branch.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {staleBranches.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[11px] font-medium text-[#5c6670] uppercase tracking-wider">Stale</div>
                    {staleBranches.slice(0, 5).map(branch => (
                      <button
                        key={branch.name}
                        onClick={() => checkoutMutation.mutate(branch.name)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#d4d8dd]/30 dark:hover:bg-[#3d4452] rounded-lg text-left"
                        data-testid={`branch-${branch.name}`}
                      >
                        <User className="w-[18px] h-[18px] text-[#5c6670]" />
                        <span className="text-[15px] text-[#0e1525] dark:text-white truncate">{branch.name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {branchSearch.trim() && !branches.some(b => b.name.toLowerCase() === branchSearch.trim().toLowerCase()) && (
                  <div className="border-t border-[#d4d8dd] dark:border-[#3d4452] mt-1 pt-1">
                    <button
                      onClick={() => createBranchMutation.mutate(branchSearch.trim())}
                      disabled={createBranchMutation.isPending}
                      className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#d4d8dd]/30 dark:hover:bg-[#3d4452] rounded-lg text-left"
                      data-testid="button-create-branch"
                    >
                      {createBranchMutation.isPending ? (
                        <Loader2 className="w-[18px] h-[18px] text-[#0079f2] animate-spin" />
                      ) : (
                        <Plus className="w-[18px] h-[18px] text-[#0079f2]" />
                      )}
                      <span className="text-[15px] text-[#0079f2]">
                        Create branch: <span className="font-medium">{branchSearch.trim()}</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollArea className="flex-1">
        <div className={cn("space-y-2", touchMode ? "p-4" : "p-3")}>
          {/* Remote Updates */}
          <div className={cn("space-y-2", touchMode && "space-y-3")}>
            <div className="flex items-center justify-between">
              <span className={cn("font-medium text-[#5c6670] uppercase", touchMode ? "text-sm" : "text-xs")}>Remote Updates</span>
              {repoName && (
                <a
                  href={`https://github.com/${repoName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[13px] text-[#0e1525] dark:text-white hover:text-[#0079f2]"
                  data-testid="link-github-repo"
                >
                  <SiGithub className="w-3 h-3" />
                  {repoName}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-1 text-[#5c6670]">
                <span className="font-medium text-[#0e1525] dark:text-white">origin/{status?.branch}</span>
                <span>•</span>
                <span>upstream</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#5c6670]">last fetched 1h ago</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchMutation.mutate(undefined)}
                  disabled={fetchMutation.isPending}
                  className="h-6 px-2 text-[13px] text-[#5c6670] rounded-lg"
                  data-testid="button-fetch"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Fetch
                </Button>
              </div>
            </div>

            {(status?.ahead || 0) > 0 && (
              <p className="text-[13px] text-[#5c6670]">{status?.ahead} commits to push</p>
            )}

            {/* Action Buttons - tablet-responsive with proper touch targets */}
            <div className={cn("flex", touchMode ? "gap-3 flex-wrap" : "gap-2")}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  pullMutation.mutate(undefined);
                  pushMutation.mutate(undefined);
                }}
                className={cn(
                  "flex-1 border-[#d4d8dd] dark:border-[#3d4452] rounded-lg touch-manipulation",
                  touchMode ? "h-11 text-sm min-w-[120px]" : "h-8 text-[13px]"
                )}
                data-testid="button-sync"
              >
                <RefreshCw className={cn(touchMode ? "w-4 h-4 mr-2" : "w-3 h-3 mr-1")} />
                Sync with Remote
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pullMutation.mutate(undefined)}
                disabled={pullMutation.isPending}
                className={cn(
                  "border-[#d4d8dd] dark:border-[#3d4452] rounded-lg touch-manipulation",
                  touchMode ? "h-11 px-4 text-sm" : "h-8 px-3 text-[13px]"
                )}
                data-testid="button-pull"
              >
                <ArrowDown className={cn(touchMode ? "w-4 h-4 mr-2" : "w-3 h-3 mr-1")} />
                Pull
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pushMutation.mutate(undefined)}
                disabled={pushMutation.isPending}
                className={cn(
                  "border-[#d4d8dd] dark:border-[#3d4452] rounded-lg touch-manipulation",
                  touchMode ? "h-11 px-4 text-sm" : "h-8 px-3 text-[13px]"
                )}
                data-testid="button-push"
              >
                <ArrowUp className={cn(touchMode ? "w-4 h-4 mr-2" : "w-3 h-3 mr-1")} />
                Push
              </Button>
            </div>
          </div>

          {/* Commit Section */}
          <div className={cn("border-t border-[#d4d8dd] dark:border-[#3d4452]", touchMode ? "space-y-3 pt-4" : "space-y-2 pt-3")}>
            <h3 className={cn(
              "font-medium leading-tight text-[#0e1525] dark:text-white",
              touchMode ? "text-base" : "text-[15px]"
            )}>Commit</h3>
            
            {hasChanges ? (
              <div className="space-y-2">
                {/* Staged Files */}
                {status?.staged && status.staged.length > 0 && (
                  <div className={cn("space-y-1", touchMode && "space-y-0.5")}>
                    <div className={cn("font-medium text-[#5c6670] uppercase", touchMode ? "text-sm" : "text-xs")}>Staged ({status.staged.length})</div>
                    {status.staged.map(file => (
                      <div key={file} className={cn(
                        "flex items-center justify-between rounded-lg hover:bg-[#d4d8dd]/30 dark:hover:bg-[#3d4452] group touch-manipulation",
                        touchMode ? "px-3 py-2.5 min-h-[44px]" : "px-2 py-1"
                      )}>
                        <button
                          onClick={() => handleFileClick(file, true)}
                          className={cn(
                            "flex items-center flex-1 min-w-0 text-left touch-manipulation",
                            touchMode ? "gap-3" : "gap-2"
                          )}
                          data-testid={`view-diff-staged-${file}`}
                        >
                          <FileCode className={cn(touchMode ? "w-4 h-4" : "w-3 h-3", "text-green-500 shrink-0")} />
                          <span className={cn(
                            "text-[#0e1525] dark:text-white truncate hover:underline",
                            touchMode ? "text-sm" : "text-[13px]"
                          )}>{file}</span>
                          <Eye className={cn(touchMode ? "w-4 h-4" : "w-3 h-3", "text-[#5c6670]", !touchMode && "opacity-0 group-hover:opacity-100")} />
                        </button>
                        <button
                          onClick={() => unstageMutation.mutate([file])}
                          className={cn(
                            "hover:bg-[#e5e7eb] dark:hover:bg-[#3d4452] rounded-lg touch-manipulation",
                            touchMode ? "p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" : "p-1 opacity-0 group-hover:opacity-100"
                          )}
                          data-testid={`unstage-${file}`}
                        >
                          <Minus className={cn(touchMode ? "w-4 h-4" : "w-3 h-3", "text-[#5c6670]")} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Unstaged Files */}
                {status?.unstaged && status.unstaged.length > 0 && (
                  <div className={cn("space-y-1", touchMode && "space-y-0.5")}>
                    <div className={cn("font-medium text-[#5c6670] uppercase", touchMode ? "text-sm" : "text-xs")}>Changes ({status.unstaged.length})</div>
                    {status.unstaged.map(file => (
                      <div key={file} className={cn(
                        "flex items-center justify-between rounded-lg hover:bg-[#d4d8dd]/30 dark:hover:bg-[#3d4452] group touch-manipulation",
                        touchMode ? "px-3 py-2.5 min-h-[44px]" : "px-2 py-1"
                      )}>
                        <button
                          onClick={() => handleFileClick(file, false)}
                          className={cn(
                            "flex items-center flex-1 min-w-0 text-left touch-manipulation",
                            touchMode ? "gap-3" : "gap-2"
                          )}
                          data-testid={`view-diff-unstaged-${file}`}
                        >
                          <FileCode className={cn(touchMode ? "w-4 h-4" : "w-3 h-3", "text-yellow-500 shrink-0")} />
                          <span className={cn(
                            "text-[#0e1525] dark:text-white truncate hover:underline",
                            touchMode ? "text-sm" : "text-[13px]"
                          )}>{file}</span>
                          <Eye className={cn(touchMode ? "w-4 h-4" : "w-3 h-3", "text-[#5c6670]", !touchMode && "opacity-0 group-hover:opacity-100")} />
                        </button>
                        <button
                          onClick={() => stageMutation.mutate([file])}
                          className={cn(
                            "hover:bg-[#e5e7eb] dark:hover:bg-[#3d4452] rounded-lg touch-manipulation",
                            touchMode ? "p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" : "p-1 opacity-0 group-hover:opacity-100"
                          )}
                          data-testid={`stage-${file}`}
                        >
                          <Plus className={cn(touchMode ? "w-4 h-4" : "w-3 h-3", "text-[#5c6670]")} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Untracked Files */}
                {status?.untracked && status.untracked.length > 0 && (
                  <div className={cn("space-y-1", touchMode && "space-y-0.5")}>
                    <div className={cn("font-medium text-[#5c6670] uppercase", touchMode ? "text-sm" : "text-xs")}>Untracked ({status.untracked.length})</div>
                    {status.untracked.map(file => (
                      <div key={file} className={cn(
                        "flex items-center justify-between rounded-lg hover:bg-[#d4d8dd]/30 dark:hover:bg-[#3d4452] group touch-manipulation",
                        touchMode ? "px-3 py-2.5 min-h-[44px]" : "px-2 py-1"
                      )}>
                        <button
                          onClick={() => handleFileClick(file, false)}
                          className={cn(
                            "flex items-center flex-1 min-w-0 text-left touch-manipulation",
                            touchMode ? "gap-3" : "gap-2"
                          )}
                          data-testid={`view-diff-untracked-${file}`}
                        >
                          <FileCode className={cn(touchMode ? "w-4 h-4" : "w-3 h-3", "text-[#5c6670] shrink-0")} />
                          <span className={cn(
                            "text-[#0e1525] dark:text-white truncate hover:underline",
                            touchMode ? "text-sm" : "text-[13px]"
                          )}>{file}</span>
                          <Eye className={cn(touchMode ? "w-4 h-4" : "w-3 h-3", "text-[#5c6670]", !touchMode && "opacity-0 group-hover:opacity-100")} />
                        </button>
                        <button
                          onClick={() => stageMutation.mutate([file])}
                          className={cn(
                            "hover:bg-[#e5e7eb] dark:hover:bg-[#3d4452] rounded-lg touch-manipulation",
                            touchMode ? "p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" : "p-1 opacity-0 group-hover:opacity-100"
                          )}
                          data-testid={`stage-${file}`}
                        >
                          <Plus className={cn(touchMode ? "w-4 h-4" : "w-3 h-3", "text-[#5c6670]")} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <Input
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message..."
                  className={cn(
                    "bg-white dark:bg-[#1c2333] border-[#d4d8dd] dark:border-[#3d4452] rounded-lg",
                    touchMode ? "h-11 text-base" : "h-8 text-[15px]"
                  )}
                  data-testid="input-commit-message"
                />
                <Button
                  onClick={() => commitMutation.mutate(commitMessage)}
                  disabled={!commitMessage.trim() || commitMutation.isPending || !status?.staged?.length}
                  className={cn(
                    "w-full bg-[#0079f2] hover:bg-[#0066cc] text-white rounded-lg touch-manipulation",
                    touchMode ? "h-11 text-sm" : "h-8 text-[13px]"
                  )}
                  data-testid="button-commit"
                >
                  <GitCommit className={cn(touchMode ? "w-4 h-4 mr-2" : "w-3 h-3 mr-1")} />
                  Commit {status?.staged?.length || 0} staged
                </Button>
              </div>
            ) : (
              <NoChangesEmptyState />
            )}
          </div>

          {/* Commit History */}
          {isLoadingCommits ? (
            <div className="space-y-2 pt-3 border-t border-[#d4d8dd] dark:border-[#3d4452]">
              <CommitSkeleton />
            </div>
          ) : commits && commits.length > 0 ? (
            <div className="space-y-2 pt-3 border-t border-[#d4d8dd] dark:border-[#3d4452]">
              {unpushedCommits.length > 0 && (
                <div className="flex items-center gap-1 text-[13px] text-[#5c6670]">
                  <ArrowDown className="w-3 h-3" />
                  <span>Not pushed to remote</span>
                </div>
              )}

              <div className="space-y-0.5">
                {commits.slice(0, 8).map((commit, idx) => (
                  <div
                    key={commit.hash}
                    className="flex items-start gap-2 py-1.5"
                    data-testid={`commit-${commit.hash}`}
                  >
                    <div className="flex flex-col items-center pt-1">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        idx >= unpushedCount ? "bg-[#5c6670]" : "bg-green-500"
                      )} />
                      {idx < commits.length - 1 && (
                        <div className="w-0.5 flex-1 bg-[#d4d8dd] dark:bg-[#3d4452] mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#0e1525] dark:text-white truncate">
                        {commit.message}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-[#5c6670]">
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-[8px] text-white font-medium">
                          {commit.author?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <span>{commit.author}</span>
                        <span>{formatTimeAgo(commit.date)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </ScrollArea>

      {/* Diff Viewer Modal */}
      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && closeDiffModal()}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden" data-testid="diff-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <FileCode className="w-4 h-4" />
              <span className="truncate" data-testid="diff-modal-filename">{selectedFile}</span>
              {selectedFileStaged && (
                <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                  Staged
                </span>
              )}
              {diffData?.truncated && (
                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded">
                  Truncated
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="border border-[#d4d8dd] dark:border-[#3d4452] rounded-lg bg-[#fafafa] dark:bg-[#1c2333] overflow-hidden">
            <DiffViewer diff={diffData?.diff || ''} isLoading={isLoadingDiff} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={closeDiffModal}
              className="h-8 border-[#d4d8dd] dark:border-[#3d4452] rounded-lg"
              data-testid="button-close-diff"
            >
              <X className="w-3 h-3 mr-1" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
