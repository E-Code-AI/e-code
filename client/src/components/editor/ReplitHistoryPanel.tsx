import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  History,
  GitCommit,
  RotateCcw,
  Eye,
  Download,
  Clock,
  Save,
  AlertCircle,
  CheckCircle,
  FileText,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LazyMotionDiv } from '@/lib/motion';
import { useToast } from '@/hooks/use-toast';

interface APICheckpoint {
  id: number;
  name: string;
  description?: string;
  type: 'manual' | 'automatic' | 'before_action' | 'error_recovery';
  createdAt: string;
  userId: number;
  projectId: number;
  filesSnapshot?: Record<string, any>;
  changedFiles?: string[];
  parentCheckpointId?: number;
}

interface Checkpoint {
  id: string;
  title: string;
  description?: string;
  timestamp: Date;
  author: string;
  type: 'auto' | 'manual' | 'deploy';
  changes: {
    additions: number;
    deletions: number;
    files: number;
  };
  files?: Array<{
    name: string;
    status: 'added' | 'modified' | 'deleted';
    additions: number;
    deletions: number;
  }>;
}

interface CheckpointsAPIResponse {
  success: boolean;
  checkpoints: APICheckpoint[];
  count: number;
}

function mapAPICheckpointToUI(checkpoint: APICheckpoint): Checkpoint {
  const changedFilesCount = checkpoint.changedFiles?.length || 0;
  const filesSnapshot = checkpoint.filesSnapshot as Record<string, any> | undefined;
  
  return {
    id: String(checkpoint.id),
    title: checkpoint.name,
    description: checkpoint.description,
    timestamp: new Date(checkpoint.createdAt),
    author: 'User',
    type: checkpoint.type === 'automatic' ? 'auto' : checkpoint.type === 'manual' ? 'manual' : 'manual',
    changes: {
      additions: 0,
      deletions: 0,
      files: changedFilesCount || (filesSnapshot ? Object.keys(filesSnapshot).length : 0),
    },
    files: checkpoint.changedFiles?.map((fileName) => ({
      name: fileName,
      status: 'modified' as const,
      additions: 0,
      deletions: 0,
    })),
  };
}

function SkeletonShimmer({ className }: { className?: string }) {
  return (
    <LazyMotionDiv
      className={cn("rounded-lg bg-gray-200 dark:bg-[#242b3d]", className)}
      animate={{
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-3 space-y-3" data-testid="history-loading-skeleton">
      {[1, 2, 3].map((i) => (
        <div key={i} className="ml-10 p-3 rounded-lg bg-gray-100 dark:bg-[#242b3d]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1">
              <SkeletonShimmer className="w-[18px] h-[18px] rounded" />
              <div className="flex-1 space-y-2">
                <SkeletonShimmer className="h-4 w-32" />
                <SkeletonShimmer className="h-3 w-48" />
                <SkeletonShimmer className="h-3 w-24" />
              </div>
            </div>
            <div className="space-y-2">
              <SkeletonShimmer className="h-3 w-16" />
              <SkeletonShimmer className="h-3 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center" data-testid="history-empty-state">
      <History 
        className="w-12 h-12 mb-4 text-gray-400 dark:text-[#5c6670] opacity-40"
      />
      <h3 
        className="text-[17px] font-medium leading-tight mb-2 text-gray-900 dark:text-white"
      >
        No History Yet
      </h3>
      <p 
        className="text-[15px] leading-[20px] max-w-[240px] text-gray-600 dark:text-[#9da2a6]"
      >
        Your project checkpoints and version history will appear here as you work.
      </p>
    </div>
  );
}

export function ReplitHistoryPanel({ projectId }: { projectId?: string }) {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>(null);
  const [expandedCheckpoints, setExpandedCheckpoints] = useState<Set<string>>(new Set());
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Checkpoint | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const { toast } = useToast();

  const numericProjectId = projectId ? parseInt(projectId, 10) : null;

  const { data, isLoading, error } = useQuery<CheckpointsAPIResponse>({
    queryKey: ['/api/projects', numericProjectId, 'checkpoints'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${numericProjectId}/checkpoints`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch checkpoints');
      }
      return response.json();
    },
    enabled: !!numericProjectId,
  });

  const checkpoints: Checkpoint[] = data?.checkpoints?.map(mapAPICheckpointToUI) || [];

  const createCheckpointMutation = useMutation({
    mutationFn: async (checkpointData: { name: string; description?: string }) => {
      return apiRequest<{ success: boolean; checkpoint: APICheckpoint }>('POST', '/api/checkpoints', {
        projectId: numericProjectId,
        name: checkpointData.name,
        description: checkpointData.description,
        type: 'manual',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', numericProjectId, 'checkpoints'] });
      toast({
        title: 'Checkpoint saved',
        description: 'Your manual checkpoint has been created successfully.',
      });
    },
    onError: (err) => {
      toast({
        title: 'Failed to save checkpoint',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const restoreCheckpointMutation = useMutation({
    mutationFn: async (checkpointId: number) => {
      return apiRequest<{ success: boolean; message: string }>('POST', `/api/checkpoints/${checkpointId}/restore`, {
        restoreFiles: true,
        restoreDatabase: true,
        restoreEnvironment: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', numericProjectId, 'checkpoints'] });
      toast({
        title: 'Checkpoint restored',
        description: 'Your workspace has been restored to the selected checkpoint.',
      });
      setShowRestoreDialog(false);
      setRestoreTarget(null);
    },
    onError: (err) => {
      toast({
        title: 'Failed to restore checkpoint',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const handleSaveCheckpoint = () => {
    createCheckpointMutation.mutate({
      name: `Manual checkpoint - ${new Date().toLocaleString()}`,
      description: 'Saved manually by user',
    });
  };

  const toggleCheckpointExpansion = (checkpointId: string) => {
    const newExpanded = new Set(expandedCheckpoints);
    if (newExpanded.has(checkpointId)) {
      newExpanded.delete(checkpointId);
    } else {
      newExpanded.add(checkpointId);
    }
    setExpandedCheckpoints(newExpanded);
  };

  const handleRestore = (checkpoint: Checkpoint) => {
    setRestoreTarget(checkpoint);
    setShowRestoreDialog(true);
  };

  const confirmRestore = () => {
    if (restoreTarget) {
      restoreCheckpointMutation.mutate(parseInt(restoreTarget.id, 10));
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getCheckpointIcon = (type: string) => {
    const iconClass = "w-[18px] h-[18px]";
    switch (type) {
      case 'auto':
        return <Clock className={cn(iconClass, "text-gray-500 dark:text-[#9da2a6]")} />;
      case 'manual':
        return <Save className={cn(iconClass, "text-blue-600 dark:text-[#0079f2]")} />;
      case 'deploy':
        return <GitCommit className={cn(iconClass, "text-green-500")} />;
      default:
        return <History className={cn(iconClass, "text-gray-500 dark:text-[#9da2a6]")} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return 'text-green-500';
      case 'modified':
        return 'text-blue-600 dark:text-[#0079f2]';
      case 'deleted':
        return 'text-red-500';
      default:
        return 'text-gray-500 dark:text-[#9da2a6]';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-[#0e1525]" data-testid="history-panel">
        <div className="p-3 min-h-[48px] flex items-center border-b border-gray-200 dark:border-[#3d4452]">
          <div className="flex items-center gap-2">
            <History className="w-[18px] h-[18px] text-gray-500 dark:text-[#9da2a6]" />
            <h3 className="text-[17px] font-medium leading-tight text-gray-900 dark:text-white">
              History
            </h3>
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (checkpoints.length === 0) {
    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-[#0e1525]" data-testid="history-panel">
        <div className="p-3 min-h-[48px] flex items-center border-b border-gray-200 dark:border-[#3d4452]">
          <div className="flex items-center gap-2">
            <History className="w-[18px] h-[18px] text-gray-500 dark:text-[#9da2a6]" />
            <h3 className="text-[17px] font-medium leading-tight text-gray-900 dark:text-white">
              History
            </h3>
          </div>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-[#0e1525]" data-testid="history-panel">
      {/* Header */}
      <div className="p-3 min-h-[48px] border-b border-gray-200 dark:border-[#3d4452]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-[18px] h-[18px] text-gray-500 dark:text-[#9da2a6]" />
            <h3 className="text-[17px] font-medium leading-tight text-gray-900 dark:text-white">
              History
            </h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-[13px] border-gray-300 dark:border-[#3d4452] text-gray-700 dark:text-[#d4d8dd] bg-transparent hover:bg-gray-100 dark:hover:bg-[#242b3d]"
            data-testid="button-save-checkpoint"
            onClick={handleSaveCheckpoint}
            disabled={createCheckpointMutation.isPending || !numericProjectId}
          >
            {createCheckpointMutation.isPending ? (
              <Loader2 className="w-[18px] h-[18px] mr-1.5 animate-spin" />
            ) : (
              <Save className="w-[18px] h-[18px] mr-1.5" />
            )}
            {createCheckpointMutation.isPending ? 'Saving...' : 'Save Checkpoint'}
          </Button>
        </div>

        {/* Auto-save Status */}
        <div 
          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#1c2333]"
        >
          <div className="flex items-center gap-2">
            {autoSaveEnabled ? (
              <CheckCircle className="w-[18px] h-[18px] text-green-500" />
            ) : (
              <AlertCircle className="w-[18px] h-[18px] text-amber-500" />
            )}
            <span className="text-[15px] leading-[20px] text-gray-900 dark:text-white">
              Auto-save {autoSaveEnabled ? 'enabled' : 'disabled'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg text-[13px] text-blue-600 dark:text-[#0079f2]"
            onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
            data-testid="button-toggle-autosave"
          >
            {autoSaveEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>

      {/* Checkpoints List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Timeline */}
          <div className="relative">
            {/* Timeline line */}
            <div 
              className="absolute left-5 top-0 bottom-0 w-px bg-gray-300 dark:bg-[#3d4452]" 
            />

            {checkpoints.map((checkpoint, index) => (
              <div key={checkpoint.id} className="relative mb-3" data-testid={`checkpoint-item-${checkpoint.id}`}>
                {/* Timeline dot */}
                <div 
                  className="absolute left-3.5 w-3 h-3 rounded-full bg-gray-50 dark:bg-[#0e1525] border-2 border-gray-300 dark:border-[#3d4452]"
                />

                <div className="ml-10">
                  <div
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all",
                      selectedCheckpoint === checkpoint.id 
                        ? "bg-gray-100 dark:bg-[#242b3d] border border-blue-500 dark:border-[#0079f2]"
                        : "bg-white dark:bg-[#1c2333] border border-gray-200 dark:border-[#3d4452]"
                    )}
                    onClick={() => {
                      setSelectedCheckpoint(checkpoint.id);
                      if (checkpoint.files) {
                        toggleCheckpointExpansion(checkpoint.id);
                      }
                    }}
                    data-testid={`checkpoint-card-${checkpoint.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {getCheckpointIcon(checkpoint.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 
                              className="text-[15px] font-medium leading-[20px] text-gray-900 dark:text-white"
                            >
                              {checkpoint.title}
                            </h4>
                            {checkpoint.type === 'auto' && (
                              <Badge 
                                variant="outline" 
                                className="text-[11px] uppercase tracking-wider px-1.5 py-0 rounded border-gray-300 dark:border-[#3d4452] text-gray-500 dark:text-[#9da2a6]"
                              >
                                Auto
                              </Badge>
                            )}
                            {index === 0 && (
                              <Badge 
                                className="text-[11px] uppercase tracking-wider px-1.5 py-0 rounded bg-amber-100 dark:bg-[#2B3245] text-amber-600 dark:text-[#f59e0b]"
                              >
                                Current
                              </Badge>
                            )}
                          </div>
                          {checkpoint.description && (
                            <p 
                              className="text-[13px] mt-0.5 text-gray-600 dark:text-[#9da2a6]"
                            >
                              {checkpoint.description}
                            </p>
                          )}
                          <div 
                            className="flex items-center gap-3 mt-1 text-[13px] text-gray-500 dark:text-[#5c6670]"
                          >
                            <span>{checkpoint.author}</span>
                            <span>•</span>
                            <span>{getTimeAgo(checkpoint.timestamp)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[13px] text-right ml-2">
                        <div className="flex items-center gap-2">
                          <span className="text-green-500">+{checkpoint.changes.additions}</span>
                          <span className="text-red-500">-{checkpoint.changes.deletions}</span>
                        </div>
                        <div className="mt-0.5 text-gray-500 dark:text-[#5c6670]">
                          {checkpoint.changes.files} file{checkpoint.changes.files !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {/* File Changes */}
                    {checkpoint.files && (
                      <div 
                        className={`collapsible-content ${expandedCheckpoints.has(checkpoint.id) ? 'expanded' : ''}`}
                      >
                        <div className="mt-3 pt-3 space-y-1 border-t border-gray-200 dark:border-[#3d4452]">
                          {checkpoint.files.map((file, fileIndex) => (
                            <div
                              key={fileIndex}
                              className="flex items-center justify-between py-1 px-2 rounded-lg text-[13px] bg-gray-100 dark:bg-[#242b3d]"
                              data-testid={`file-change-${checkpoint.id}-${fileIndex}`}
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="w-[18px] h-[18px] text-gray-500 dark:text-[#9da2a6]" />
                                <span className={getStatusColor(file.status)}>
                                  {file.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[13px]">
                                <span className="text-green-500">+{file.additions}</span>
                                <span className="text-red-500">-{file.deletions}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {index > 0 && (
                      <div 
                        className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-[#3d4452]"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg text-[13px] border-gray-300 dark:border-[#3d4452] text-gray-700 dark:text-[#d4d8dd] bg-transparent hover:bg-gray-100 dark:hover:bg-[#242b3d]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(checkpoint);
                          }}
                          data-testid={`button-restore-${checkpoint.id}`}
                        >
                          <RotateCcw className="w-[18px] h-[18px] mr-1.5" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-lg text-[13px] text-gray-500 dark:text-[#9da2a6] hover:text-gray-700 dark:hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          data-testid={`button-view-diff-${checkpoint.id}`}
                        >
                          <Eye className="w-[18px] h-[18px] mr-1.5" />
                          View Diff
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-lg text-[13px] text-gray-500 dark:text-[#9da2a6] hover:text-gray-700 dark:hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          data-testid={`button-download-${checkpoint.id}`}
                        >
                          <Download className="w-[18px] h-[18px] mr-1.5" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent 
          className="bg-white dark:bg-[#1c2333] border border-gray-200 dark:border-[#3d4452]"
        >
          <DialogHeader>
            <DialogTitle 
              className="text-[17px] font-medium leading-tight text-gray-900 dark:text-white"
            >
              Restore Checkpoint
            </DialogTitle>
            <DialogDescription 
              className="text-[15px] leading-[20px] text-gray-600 dark:text-[#9da2a6]"
            >
              Are you sure you want to restore to "{restoreTarget?.title}"? This will replace your current workspace with the selected checkpoint.
            </DialogDescription>
          </DialogHeader>
          
          {restoreTarget && (
            <div className="py-3">
              <div 
                className="p-3 rounded-lg bg-amber-50 dark:bg-[#2B3245] border border-amber-500"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-[18px] h-[18px] mt-0.5 text-amber-500" />
                  <div>
                    <p 
                      className="text-[15px] font-medium leading-[20px] text-amber-600 dark:text-[#f59e0b]"
                    >
                      Warning
                    </p>
                    <p 
                      className="text-[13px] mt-1 text-amber-600 dark:text-[#f59e0b]"
                    >
                      Your current unsaved changes will be lost. Consider saving a checkpoint first.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              className="h-8 rounded-lg text-[13px] border-gray-300 dark:border-[#3d4452] text-gray-700 dark:text-[#d4d8dd] bg-transparent hover:bg-gray-100 dark:hover:bg-[#242b3d]"
              onClick={() => setShowRestoreDialog(false)}
              data-testid="button-cancel-restore"
            >
              Cancel
            </Button>
            <Button 
              className="h-8 rounded-lg text-[13px] bg-blue-600 hover:bg-blue-700 text-white"
              onClick={confirmRestore}
              data-testid="button-confirm-restore"
              disabled={restoreCheckpointMutation.isPending}
            >
              {restoreCheckpointMutation.isPending ? (
                <>
                  <Loader2 className="w-[18px] h-[18px] mr-1.5 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore Checkpoint'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
