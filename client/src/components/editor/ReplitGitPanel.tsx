import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  GitBranch, 
  GitCommit, 
  Plus, 
  Minus,
  Upload,
  Download,
  FileCode,
  FolderGit2,
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

interface GitDiff {
  filePath: string;
  diff: string;
  staged: boolean;
}

export function ReplitGitPanel({ projectId }: { projectId?: string }) {
  const { toast } = useToast();
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileStaged, setSelectedFileStaged] = useState<boolean>(false);

  const { data: status, refetch: refetchStatus, isLoading } = useQuery<GitStatus>({
    queryKey: ['/api/git/status'],
  });

  const { data: diff } = useQuery<GitDiff>({
    queryKey: ['/api/git/diff', selectedFile, selectedFileStaged],
    queryFn: async () => {
      if (!selectedFile) throw new Error('No file selected');
      const stagedParam = selectedFileStaged ? '?staged=true' : '';
      const res = await fetch(`/api/git/diff/${encodeURIComponent(selectedFile)}${stagedParam}`);
      if (!res.ok) throw new Error('Failed to fetch diff');
      return res.json();
    },
    enabled: !!selectedFile,
  });

  const stageMutation = useMutation({
    mutationFn: async (files: string[]) => {
      return apiRequest('/api/git/stage', 'POST', { files });
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
      return apiRequest('/api/git/unstage', 'POST', { files });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      toast({ description: 'Files unstaged successfully' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to unstage files', variant: 'destructive' });
    },
  });

  const commitMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest('/api/git/commit', 'POST', { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      setCommitMessage('');
      toast({ description: 'Changes committed successfully' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to commit changes', variant: 'destructive' });
    },
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/git/push', 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      toast({ description: 'Changes pushed successfully' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to push changes', variant: 'destructive' });
    },
  });

  const pullMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/git/pull', 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/git/status'] });
      toast({ description: 'Changes pulled successfully' });
    },
    onError: (error: any) => {
      toast({ description: error.message || 'Failed to pull changes', variant: 'destructive' });
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
      toast({ description: 'Commit message is required', variant: 'destructive' });
      return;
    }
    commitMutation.mutate(commitMessage);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--ecode-text-muted)]">
        <p className="text-sm font-[family-name:var(--ecode-font-sans)]">Loading git status...</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--ecode-text-muted)] p-4">
        <FolderGit2 className="h-12 w-12 mb-4 text-[var(--ecode-text-muted)]" />
        <p className="text-sm font-[family-name:var(--ecode-font-sans)] text-center">
          Initializing git repository...
        </p>
        <p className="text-xs text-center mt-2 opacity-75">
          Git will be initialized on first use
        </p>
      </div>
    );
  }

  const allChanges = [...status.staged, ...status.unstaged, ...status.untracked];

  return (
    <div className="flex flex-col h-full bg-[var(--ecode-surface)]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--ecode-border)]">
        <div className="flex items-center gap-2">
          <FolderGit2 className="h-4 w-4 text-[var(--ecode-accent)]" />
          <span className="text-sm font-[family-name:var(--ecode-font-sans)] font-semibold text-[var(--ecode-text)]">
            Git
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => pullMutation.mutate(undefined)}
            disabled={pullMutation.isPending}
            className="h-7 px-2"
            data-testid="button-git-pull"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => pushMutation.mutate(undefined)}
            disabled={pushMutation.isPending}
            className="h-7 px-2"
            data-testid="button-git-push"
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Branch Info */}
      <div className="px-3 py-2 bg-[var(--ecode-surface-hover)] border-b border-[var(--ecode-border)]">
        <div className="flex items-center gap-2">
          <GitBranch className="h-3.5 w-3.5 text-[var(--ecode-text-muted)]" />
          <span className="text-xs font-[family-name:var(--ecode-font-mono)] text-[var(--ecode-text)]">
            {status.branch}
          </span>
          {status.ahead > 0 && (
            <span className="text-xs text-green-500">↑{status.ahead}</span>
          )}
          {status.behind > 0 && (
            <span className="text-xs text-orange-500">↓{status.behind}</span>
          )}
        </div>
      </div>

      {/* Changes List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Staged Changes */}
          {status.staged.length > 0 && (
            <>
              <div className="text-xs font-semibold text-[var(--ecode-text-muted)] px-2 py-1 uppercase font-[family-name:var(--ecode-font-sans)]">
                Staged ({status.staged.length})
              </div>
              {status.staged.map((file) => (
                <div
                  key={`staged-${file}`}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded hover:bg-[var(--ecode-surface-hover)] cursor-pointer group",
                    selectedFile === file && "bg-[var(--ecode-surface-hover)]"
                  )}
                  onClick={() => {
                    setSelectedFile(file);
                    setSelectedFileStaged(true);
                  }}
                  data-testid={`item-staged-${file}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileCode className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    <span className="text-xs font-[family-name:var(--ecode-font-mono)] truncate text-[var(--ecode-text)]">
                      {file}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnstage(file);
                    }}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    data-testid={`button-unstage-${file}`}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Separator className="my-2" />
            </>
          )}

          {/* Unstaged Changes */}
          {status.unstaged.length > 0 && (
            <>
              <div className="text-xs font-semibold text-[var(--ecode-text-muted)] px-2 py-1 uppercase font-[family-name:var(--ecode-font-sans)]">
                Changes ({status.unstaged.length})
              </div>
              {status.unstaged.map((file) => (
                <div
                  key={`unstaged-${file}`}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded hover:bg-[var(--ecode-surface-hover)] cursor-pointer group",
                    selectedFile === file && "bg-[var(--ecode-surface-hover)]"
                  )}
                  onClick={() => {
                    setSelectedFile(file);
                    setSelectedFileStaged(false);
                  }}
                  data-testid={`item-unstaged-${file}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileCode className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                    <span className="text-xs font-[family-name:var(--ecode-font-mono)] truncate text-[var(--ecode-text)]">
                      {file}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStage(file);
                    }}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    data-testid={`button-stage-${file}`}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Separator className="my-2" />
            </>
          )}

          {/* Untracked Files */}
          {status.untracked.length > 0 && (
            <>
              <div className="text-xs font-semibold text-[var(--ecode-text-muted)] px-2 py-1 uppercase font-[family-name:var(--ecode-font-sans)]">
                Untracked ({status.untracked.length})
              </div>
              {status.untracked.map((file) => (
                <div
                  key={`untracked-${file}`}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded hover:bg-[var(--ecode-surface-hover)] cursor-pointer group",
                    selectedFile === file && "bg-[var(--ecode-surface-hover)]"
                  )}
                  onClick={() => {
                    setSelectedFile(file);
                    setSelectedFileStaged(false);
                  }}
                  data-testid={`item-untracked-${file}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileCode className="h-3.5 w-3.5 text-[var(--ecode-text-muted)] flex-shrink-0" />
                    <span className="text-xs font-[family-name:var(--ecode-font-mono)] truncate text-[var(--ecode-text)]">
                      {file}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStage(file);
                    }}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    data-testid={`button-stage-untracked-${file}`}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </>
          )}

          {allChanges.length === 0 && (
            <div className="flex items-center justify-center py-8 text-[var(--ecode-text-muted)]">
              <p className="text-sm font-[family-name:var(--ecode-font-sans)]">No changes</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Diff Viewer */}
      {selectedFile && diff && (
        <div className="border-t border-[var(--ecode-border)] bg-[var(--ecode-editor-bg)]">
          <div className="px-3 py-2 border-b border-[var(--ecode-border)] bg-[var(--ecode-surface)]">
            <span className="text-xs font-[family-name:var(--ecode-font-mono)] text-[var(--ecode-text-muted)]">
              {selectedFile}
            </span>
          </div>
          <ScrollArea className="h-48">
            <pre className="p-3 text-xs font-[family-name:var(--ecode-font-mono)] text-[var(--ecode-text)] whitespace-pre-wrap break-words">
              {diff.diff || 'No changes to display'}
            </pre>
          </ScrollArea>
        </div>
      )}

      {/* Commit Section */}
      {status.staged.length > 0 && (
        <div className="border-t border-[var(--ecode-border)] p-3 space-y-2 bg-[var(--ecode-surface)]">
          <Input
            placeholder="Commit message"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && commitMessage.trim()) {
                handleCommit();
              }
            }}
            className="h-8 text-xs font-[family-name:var(--ecode-font-mono)]"
            data-testid="input-commit-message"
          />
          <Button
            size="sm"
            onClick={handleCommit}
            disabled={!commitMessage.trim() || commitMutation.isPending}
            className="w-full h-7"
            data-testid="button-commit"
          >
            <GitCommit className="h-3.5 w-3.5 mr-2" />
            Commit
          </Button>
        </div>
      )}
    </div>
  );
}
