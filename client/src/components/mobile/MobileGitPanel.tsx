import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  GitBranch, 
  GitCommit, 
  Plus, 
  Minus,
  Upload,
  Download,
  FileCode,
  RefreshCw,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

interface MobileGitPanelProps {
  projectId: string;
  className?: string;
}

export function MobileGitPanel({ projectId, className }: MobileGitPanelProps) {
  const { toast } = useToast();
  const [commitMessage, setCommitMessage] = useState('');

  const { data: status, refetch: refetchStatus, isLoading } = useQuery<GitStatus>({
    queryKey: ['/api/git/status'],
    initialData: {
      branch: 'main',
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: ['src/App.tsx', 'src/components/Header.tsx'],
      untracked: ['src/utils/helper.ts']
    }
  });

  const stageMutation = useMutation({
    mutationFn: async (files: string[]) => {
      return apiRequest('POST', '/api/git/stage', { files });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      toast({ description: 'Files staged successfully' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to stage files', variant: 'destructive' });
    },
  });

  const unstageMutation = useMutation({
    mutationFn: async (files: string[]) => {
      return apiRequest('POST', '/api/git/unstage', { files });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      toast({ description: 'Files unstaged successfully' });
    },
  });

  const commitMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest('POST', '/api/git/commit', { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      setCommitMessage('');
      toast({ description: 'Changes committed successfully' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to commit', variant: 'destructive' });
    },
  });

  const pushMutation = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      return apiRequest('POST', '/api/git/push', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      toast({ description: 'Changes pushed successfully' });
    },
  });

  const pullMutation = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      return apiRequest('POST', '/api/git/pull', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      toast({ description: 'Changes pulled successfully' });
    },
  });

  const handleStage = (filePath: string) => {
    stageMutation.mutate([filePath]);
  };

  const handleUnstage = (filePath: string) => {
    unstageMutation.mutate([filePath]);
  };

  const handleCommit = () => {
    if (!commitMessage.trim()) {
      toast({ description: 'Please enter a commit message', variant: 'destructive' });
      return;
    }
    commitMutation.mutate(commitMessage);
  };

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Git</h3>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => refetchStatus()}
            data-testid="button-refresh-git"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Branch Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {status?.branch || 'main'}
            </Badge>
            {status && status.ahead > 0 && (
              <Badge variant="secondary" className="text-xs">
                ↑{status.ahead}
              </Badge>
            )}
            {status && status.behind > 0 && (
              <Badge variant="secondary" className="text-xs">
                ↓{status.behind}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* File Changes */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Staged Files */}
          {status && status.staged.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Staged Changes ({status.staged.length})
              </h4>
              <div className="space-y-1">
                {status.staged.map((file) => (
                  <div 
                    key={file}
                    className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/20 rounded-lg"
                    data-testid={`staged-file-${file}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm truncate font-mono">{file}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnstage(file)}
                      data-testid={`button-unstage-${file}`}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unstaged Files */}
          {status && status.unstaged.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileCode className="h-4 w-4 text-orange-500" />
                Changes ({status.unstaged.length})
              </h4>
              <div className="space-y-1">
                {status.unstaged.map((file) => (
                  <div 
                    key={file}
                    className="flex items-center justify-between p-2 bg-card border border-border rounded-lg"
                    data-testid={`unstaged-file-${file}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <span className="text-sm truncate font-mono">{file}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStage(file)}
                      data-testid={`button-stage-${file}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Untracked Files */}
          {status && status.untracked.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileCode className="h-4 w-4 text-muted-foreground" />
                Untracked ({status.untracked.length})
              </h4>
              <div className="space-y-1">
                {status.untracked.map((file) => (
                  <div 
                    key={file}
                    className="flex items-center justify-between p-2 bg-card border border-border rounded-lg"
                    data-testid={`untracked-file-${file}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate font-mono">{file}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStage(file)}
                      data-testid={`button-stage-${file}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status && status.staged.length === 0 && status.unstaged.length === 0 && status.untracked.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No changes</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Commit Section */}
      {status && status.staged.length > 0 && (
        <div className="p-4 border-t border-border bg-card space-y-2">
          <Input
            placeholder="Commit message..."
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="font-mono text-sm"
            data-testid="input-commit-message"
          />
          <Button 
            className="w-full"
            onClick={handleCommit}
            disabled={!commitMessage.trim() || commitMutation.isPending}
            data-testid="button-commit"
          >
            <GitCommit className="h-4 w-4 mr-2" />
            {commitMutation.isPending ? 'Committing...' : 'Commit'}
          </Button>
        </div>
      )}

      {/* Sync Actions */}
      <div className="p-4 border-t border-border bg-card flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => pullMutation.mutate()}
          disabled={pullMutation.isPending}
          data-testid="button-pull"
        >
          <Download className="h-4 w-4 mr-2" />
          Pull
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1"
          onClick={() => pushMutation.mutate()}
          disabled={pushMutation.isPending || (status?.ahead || 0) === 0}
          data-testid="button-push"
        >
          <Upload className="h-4 w-4 mr-2" />
          Push
        </Button>
      </div>
    </div>
  );
}
