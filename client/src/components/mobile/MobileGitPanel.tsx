import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
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
} from 'lucide-react';
import { SiGithub, SiBitbucket, SiGitlab } from 'react-icons/si';
import { cn } from '@/lib/utils';

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
  message: string;
  author: string;
  email: string;
  date: string;
  pushed: boolean;
}

interface GitBranchInfo {
  name: string;
  current: boolean;
  remote: boolean;
  lastCommit?: string;
  author?: string;
  date?: string;
}

interface MobileGitPanelProps {
  projectId: string;
  className?: string;
}

type ViewMode = 'main' | 'settings' | 'branches';

export function MobileGitPanel({ projectId, className }: MobileGitPanelProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [showConnections, setShowConnections] = useState(true);
  const [remoteUrl, setRemoteUrl] = useState('');

  const { data: status, refetch: refetchStatus, isLoading } = useQuery<GitStatus>({
    queryKey: ['/api/git/status'],
  });

  const { data: remotesData } = useQuery<{ remotes: { name: string; url: string; type: 'fetch' | 'push' }[] }>({
    queryKey: ['/api/git/remotes'],
    enabled: !!status,
  });

  const { data: commitsData } = useQuery<{ commits: GitCommitInfo[] }>({
    queryKey: ['/api/git/log'],
    enabled: !!status,
  });
  const commits = commitsData?.commits;

  const { data: branches } = useQuery<GitBranchInfo[]>({
    queryKey: ['/api/git/branches'],
    enabled: !!status,
  });

  const originRemote = remotesData?.remotes?.find(r => r.name === 'origin' && r.type === 'fetch');
  const repoName = originRemote?.url?.split('/').slice(-2).join('/').replace('.git', '') || '';

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
      toast({ description: error.message || 'Failed to fetch', variant: 'destructive' });
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
      toast({ description: 'Switched branch successfully' });
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
      toast({ description: 'Remote connected successfully' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to connect remote', variant: 'destructive' });
    },
  });

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
  const unpushedCommits = commits?.filter(c => !c.pushed) || [];

  // Filter branches by search
  const filteredBranches = branches?.filter(b => 
    b.name.toLowerCase().includes(branchSearch.toLowerCase())
  ) || [];

  // Categorize branches
  const importantBranches = filteredBranches.filter(b => b.name === 'main' || b.name === 'master');
  const activeBranches = filteredBranches.filter(b => !b.remote && b.name !== 'main' && b.name !== 'master');
  const staleBranches = filteredBranches.filter(b => b.remote);

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
      <div className={cn("flex flex-col h-full bg-white dark:bg-[#1c2333]", className)} data-testid="mobile-git-settings">
        {/* Settings Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[#d4d8dd] dark:border-[#3d4452]">
          <button
            onClick={() => setViewMode('main')}
            className="p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#2b3245] rounded"
            data-testid="back-from-settings"
          >
            <ChevronLeft className="w-5 h-5 text-[#5c6670]" />
          </button>
          <span className="text-sm font-medium text-[#0e1525] dark:text-white">Settings</span>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Remote Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#0e1525] dark:text-white">Remote</h3>
              <div className="flex gap-2">
                <Input
                  value={remoteUrl || originRemote?.url || ''}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  placeholder="https://github.com/username/repo.git"
                  className="flex-1 h-10 bg-white dark:bg-[#1c2333] border-[#d4d8dd] dark:border-[#3d4452] text-[#0e1525] dark:text-white"
                  data-testid="input-remote-url"
                />
                <Button
                  variant="outline"
                  onClick={() => remoteUrl && connectRemoteMutation.mutate(remoteUrl)}
                  disabled={!remoteUrl || connectRemoteMutation.isPending}
                  className="h-10 px-4 border-[#d4d8dd] dark:border-[#3d4452] text-[#0e1525] dark:text-white"
                  data-testid="button-create-remote"
                >
                  Create Remote
                </Button>
              </div>
            </div>

            {/* Connections Section */}
            <div className="space-y-3">
              <button
                onClick={() => setShowConnections(!showConnections)}
                className="flex items-center justify-between w-full p-3 bg-white dark:bg-[#242b3d] border border-[#d4d8dd] dark:border-[#3d4452] rounded-lg"
                data-testid="toggle-connections"
              >
                <span className="text-sm font-medium text-[#0e1525] dark:text-white">Connections</span>
                {showConnections ? (
                  <ChevronUp className="w-5 h-5 text-[#5c6670]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#5c6670]" />
                )}
              </button>

              <AnimatePresence>
                {showConnections && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2">
                      {/* GitHub */}
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-[#242b3d] border border-[#d4d8dd] dark:border-[#3d4452] rounded-lg">
                        <div className="flex items-center gap-3">
                          <SiGithub className="w-5 h-5 text-[#0e1525] dark:text-white" />
                          <span className="text-sm text-[#0e1525] dark:text-white">GitHub</span>
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full" />
                            Active
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          data-testid="button-delete-github"
                        >
                          Delete
                        </Button>
                      </div>

                      {/* Bitbucket */}
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-[#242b3d] border border-[#d4d8dd] dark:border-[#3d4452] rounded-lg">
                        <div className="flex items-center gap-3">
                          <SiBitbucket className="w-5 h-5 text-[#2684FF]" />
                          <span className="text-sm text-[#0e1525] dark:text-white">Bitbucket</span>
                          <span className="flex items-center gap-1 text-xs text-[#5c6670]">
                            <span className="w-2 h-2 bg-[#5c6670] rounded-full" />
                            Disconnected
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#d4d8dd] dark:border-[#3d4452]"
                          data-testid="button-signin-bitbucket"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Sign in
                        </Button>
                      </div>

                      {/* GitLab */}
                      <div className="flex items-center justify-between p-3 bg-white dark:bg-[#242b3d] border border-[#d4d8dd] dark:border-[#3d4452] rounded-lg">
                        <div className="flex items-center gap-3">
                          <SiGitlab className="w-5 h-5 text-[#FC6D26]" />
                          <span className="text-sm text-[#0e1525] dark:text-white">GitLab</span>
                          <span className="flex items-center gap-1 text-xs text-[#5c6670]">
                            <span className="w-2 h-2 bg-[#5c6670] rounded-full" />
                            Disconnected
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#d4d8dd] dark:border-[#3d4452]"
                          data-testid="button-signin-gitlab"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Sign in
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Commit Author Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-[#0e1525] dark:text-white">Commit author</h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-[#242b3d] border border-[#d4d8dd] dark:border-[#3d4452] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#e5e7eb] dark:bg-[#3d4452] rounded-full flex items-center justify-center text-sm font-medium text-[#5c6670]">
                      HB
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#0e1525] dark:text-white">henri45</span>
                        <span className="text-xs text-[#5c6670]">Default Profile</span>
                      </div>
                      <span className="text-xs text-[#5c6670]">Henri Ben &lt;user@example.com&gt;</span>
                    </div>
                  </div>
                  <div className="w-5 h-5 border-2 border-[#d4d8dd] dark:border-[#3d4452] rounded-full" />
                </div>

                <div className="flex items-center justify-between p-3 bg-white dark:bg-[#242b3d] border-2 border-[#0079f2] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0079f2] rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#0e1525] dark:text-white">openaxcloud</span>
                        <a href="#" className="text-xs text-[#0079f2] flex items-center gap-1">
                          GitHub Settings <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <span className="text-xs text-[#5c6670]">openaxcloud &lt;simon@openax.com&gt;</span>
                    </div>
                  </div>
                  <div className="w-5 h-5 bg-[#0079f2] rounded-full flex items-center justify-center">
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

  // Main Git View
  return (
    <div className={cn("flex flex-col h-full bg-white dark:bg-[#1c2333]", className)} data-testid="mobile-git-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#d4d8dd] dark:border-[#3d4452]">
        <button
          onClick={() => setShowBranchDropdown(!showBranchDropdown)}
          className="flex items-center gap-2 hover:bg-[#f5f5f5] dark:hover:bg-[#2b3245] rounded px-2 py-1"
          data-testid="branch-selector"
        >
          <GitBranch className="w-4 h-4 text-[#5c6670]" />
          <span className="text-sm font-medium text-[#0e1525] dark:text-white">{status?.branch || 'main'}</span>
          <ChevronDown className="w-4 h-4 text-[#5c6670]" />
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('settings')}
            className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#2b3245] rounded"
            data-testid="git-settings-button"
          >
            <Settings className="w-5 h-5 text-[#5c6670]" />
          </button>
          <button
            onClick={() => refetchStatus()}
            className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#2b3245] rounded"
            data-testid="git-refresh-button"
          >
            <RefreshCw className="w-5 h-5 text-[#5c6670]" />
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
            className="absolute top-14 left-4 right-4 z-50 bg-white dark:bg-[#242b3d] border border-[#d4d8dd] dark:border-[#3d4452] rounded-lg shadow-lg overflow-hidden"
          >
            <div className="p-3 border-b border-[#d4d8dd] dark:border-[#3d4452]">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#f5f5f5] dark:bg-[#1c2333] rounded border border-[#d4d8dd] dark:border-[#3d4452]">
                <Search className="w-4 h-4 text-[#5c6670]" />
                <input
                  type="text"
                  value={branchSearch}
                  onChange={(e) => setBranchSearch(e.target.value)}
                  placeholder="Find or create a branch..."
                  className="flex-1 bg-transparent text-sm outline-none text-[#0e1525] dark:text-white placeholder:text-[#5c6670]"
                  data-testid="input-branch-search"
                />
              </div>
            </div>

            <ScrollArea className="max-h-64">
              <div className="p-2">
                {/* Important Branches */}
                {importantBranches.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-xs font-medium text-[#5c6670] uppercase">Important</div>
                    {importantBranches.map(branch => (
                      <button
                        key={branch.name}
                        onClick={() => checkoutMutation.mutate(branch.name)}
                        className="w-full flex items-center gap-2 px-2 py-2 hover:bg-[#f5f5f5] dark:hover:bg-[#2b3245] rounded"
                        data-testid={`branch-${branch.name}`}
                      >
                        <span className={cn("w-2 h-2 rounded-full", branch.current ? "bg-[#0079f2]" : "bg-green-500")} />
                        <span className="text-sm text-[#0e1525] dark:text-white flex-1 text-left">{branch.name}</span>
                        {branch.current && <Check className="w-4 h-4 text-[#0079f2]" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* Active Branches */}
                {activeBranches.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-xs font-medium text-[#5c6670] uppercase">Active</div>
                    {activeBranches.map(branch => (
                      <button
                        key={branch.name}
                        onClick={() => checkoutMutation.mutate(branch.name)}
                        className="w-full flex items-center gap-2 px-2 py-2 hover:bg-[#f5f5f5] dark:hover:bg-[#2b3245] rounded"
                        data-testid={`branch-${branch.name}`}
                      >
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        <div className="flex-1 text-left">
                          <span className="text-sm text-[#0e1525] dark:text-white">{branch.name}</span>
                          {branch.author && (
                            <span className="text-xs text-[#5c6670] ml-2">{branch.author} • {branch.date}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Stale/Remote Branches */}
                {staleBranches.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-xs font-medium text-[#5c6670] uppercase">Stale</div>
                    {staleBranches.slice(0, 5).map(branch => (
                      <button
                        key={branch.name}
                        onClick={() => checkoutMutation.mutate(branch.name)}
                        className="w-full flex items-center gap-2 px-2 py-2 hover:bg-[#f5f5f5] dark:hover:bg-[#2b3245] rounded"
                        data-testid={`branch-${branch.name}`}
                      >
                        <User className="w-4 h-4 text-[#5c6670]" />
                        <div className="flex-1 text-left">
                          <span className="text-sm text-[#0e1525] dark:text-white truncate">{branch.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Remote Updates Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#5c6670]">Remote Updates</span>
              {repoName && (
                <a
                  href={`https://github.com/${repoName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-[#0e1525] dark:text-white hover:text-[#0079f2]"
                  data-testid="link-github-repo"
                >
                  <SiGithub className="w-4 h-4" />
                  {repoName}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-[#5c6670]">
                <span className="font-medium text-[#0e1525] dark:text-white">origin/{status?.branch}</span>
                <span>•</span>
                <span>upstream</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5c6670]">last fetched 1 hour ago</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchMutation.mutate(undefined)}
                  disabled={fetchMutation.isPending}
                  className="h-7 px-2 text-[#5c6670] hover:text-[#0e1525]"
                  data-testid="button-fetch"
                >
                  {fetchMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Fetch
                    </>
                  )}
                </Button>
              </div>
            </div>

            {(status?.ahead || 0) > 0 && (
              <p className="text-sm text-[#5c6670]">{status?.ahead} commits to push</p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  pullMutation.mutate(undefined);
                  pushMutation.mutate(undefined);
                }}
                className="flex-1 h-10 border-[#d4d8dd] dark:border-[#3d4452] text-[#0e1525] dark:text-white"
                data-testid="button-sync"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync with Remote
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pullMutation.mutate(undefined)}
                disabled={pullMutation.isPending}
                className="h-10 px-4 border-[#d4d8dd] dark:border-[#3d4452] text-[#0e1525] dark:text-white"
                data-testid="button-pull"
              >
                <ArrowDown className="w-4 h-4 mr-1" />
                Pull
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pushMutation.mutate(undefined)}
                disabled={pushMutation.isPending}
                className="h-10 px-4 border-[#d4d8dd] dark:border-[#3d4452] text-[#0e1525] dark:text-white"
                data-testid="button-push"
              >
                <ArrowUp className="w-4 h-4 mr-1" />
                Push
              </Button>
            </div>
          </div>

          {/* Commit Section */}
          <div className="space-y-3 pt-4 border-t border-[#d4d8dd] dark:border-[#3d4452]">
            <h3 className="text-base font-semibold text-[#0e1525] dark:text-white">Commit</h3>
            
            {hasChanges ? (
              <div className="space-y-3">
                <Input
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message..."
                  className="h-10 bg-white dark:bg-[#1c2333] border-[#d4d8dd] dark:border-[#3d4452]"
                  data-testid="input-commit-message"
                />
                <Button
                  onClick={() => commitMutation.mutate(commitMessage)}
                  disabled={!commitMessage.trim() || commitMutation.isPending}
                  className="w-full h-10 bg-[#0079f2] hover:bg-[#0066cc] text-white"
                  data-testid="button-commit"
                >
                  {commitMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <GitCommit className="w-4 h-4 mr-2" />
                  )}
                  Commit {status?.staged.length || 0} staged changes
                </Button>
              </div>
            ) : (
              <p className="text-sm text-[#5c6670]">There are no changes to commit.</p>
            )}
          </div>

          {/* Commit History */}
          {commits && commits.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[#d4d8dd] dark:border-[#3d4452]">
              {unpushedCommits.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-[#5c6670]">
                  <ArrowDown className="w-4 h-4" />
                  <span>Not pushed to remote</span>
                </div>
              )}

              <div className="space-y-1">
                {commits.slice(0, 10).map((commit, idx) => (
                  <div
                    key={commit.hash}
                    className="flex items-start gap-3 py-2"
                    data-testid={`commit-${commit.hash}`}
                  >
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "w-2 h-2 rounded-full mt-1.5",
                        commit.pushed ? "bg-[#5c6670]" : "bg-green-500"
                      )} />
                      {idx < commits.length - 1 && (
                        <div className="w-0.5 h-full bg-[#d4d8dd] dark:bg-[#3d4452] mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0e1525] dark:text-white truncate">
                        {commit.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#5c6670]">
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
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
