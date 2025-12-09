import { useState } from 'react';
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
import { motion } from 'framer-motion';

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

function SkeletonShimmer({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("rounded-lg", className)}
      style={{ background: 'linear-gradient(90deg, #242b3d 0%, #3d4452 50%, #242b3d 100%)', backgroundSize: '200% 100%' }}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-3 space-y-3" data-testid="history-loading-skeleton">
      {[1, 2, 3].map((i) => (
        <div key={i} className="ml-10 p-3 rounded-lg" style={{ backgroundColor: '#242b3d' }}>
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
        className="w-12 h-12 mb-4" 
        style={{ color: '#5c6670', opacity: 0.4 }}
      />
      <h3 
        className="text-[17px] font-medium leading-tight mb-2"
        style={{ color: '#ffffff' }}
      >
        No History Yet
      </h3>
      <p 
        className="text-[15px] leading-[20px] max-w-[240px]"
        style={{ color: '#9da2a6' }}
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
  const [isLoading] = useState(false);

  const checkpoints: Checkpoint[] = [
    {
      id: '1',
      title: 'Current changes',
      description: 'Unsaved changes in your workspace',
      timestamp: new Date(),
      author: 'You',
      type: 'manual',
      changes: { additions: 23, deletions: 5, files: 3 },
      files: [
        { name: 'src/components/Header.tsx', status: 'modified', additions: 12, deletions: 3 },
        { name: 'src/styles.css', status: 'modified', additions: 8, deletions: 2 },
        { name: 'src/utils/new.ts', status: 'added', additions: 3, deletions: 0 }
      ]
    },
    {
      id: '2',
      title: 'Auto-save',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      author: 'System',
      type: 'auto',
      changes: { additions: 45, deletions: 12, files: 5 }
    },
    {
      id: '3',
      title: 'Deploy to production',
      description: 'v1.2.0 release',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      author: 'John Doe',
      type: 'deploy',
      changes: { additions: 234, deletions: 89, files: 15 },
      files: [
        { name: 'package.json', status: 'modified', additions: 2, deletions: 1 },
        { name: 'src/api/auth.ts', status: 'modified', additions: 45, deletions: 20 },
        { name: 'src/components/Login.tsx', status: 'added', additions: 187, deletions: 0 }
      ]
    },
    {
      id: '4',
      title: 'Feature: User authentication',
      description: 'Added login and registration',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      author: 'Jane Smith',
      type: 'manual',
      changes: { additions: 567, deletions: 23, files: 12 }
    },
    {
      id: '5',
      title: 'Auto-save',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      author: 'System',
      type: 'auto',
      changes: { additions: 12, deletions: 3, files: 2 }
    },
    {
      id: '6',
      title: 'Initial commit',
      description: 'Project setup',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      author: 'John Doe',
      type: 'manual',
      changes: { additions: 1234, deletions: 0, files: 45 }
    }
  ];

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
    setShowRestoreDialog(false);
    setRestoreTarget(null);
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
        return <Clock className={iconClass} style={{ color: '#9da2a6' }} />;
      case 'manual':
        return <Save className={iconClass} style={{ color: '#0079f2' }} />;
      case 'deploy':
        return <GitCommit className={iconClass} style={{ color: '#22c55e' }} />;
      default:
        return <History className={iconClass} style={{ color: '#9da2a6' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return '#22c55e';
      case 'modified':
        return '#0079f2';
      case 'deleted':
        return '#ef4444';
      default:
        return '#9da2a6';
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col" style={{ backgroundColor: '#0e1525' }} data-testid="history-panel">
        <div className="p-3 min-h-[48px] flex items-center" style={{ borderBottom: '1px solid #3d4452' }}>
          <div className="flex items-center gap-2">
            <History className="w-[18px] h-[18px]" style={{ color: '#9da2a6' }} />
            <h3 className="text-[17px] font-medium leading-tight" style={{ color: '#ffffff' }}>
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
      <div className="h-full flex flex-col" style={{ backgroundColor: '#0e1525' }} data-testid="history-panel">
        <div className="p-3 min-h-[48px] flex items-center" style={{ borderBottom: '1px solid #3d4452' }}>
          <div className="flex items-center gap-2">
            <History className="w-[18px] h-[18px]" style={{ color: '#9da2a6' }} />
            <h3 className="text-[17px] font-medium leading-tight" style={{ color: '#ffffff' }}>
              History
            </h3>
          </div>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#0e1525' }} data-testid="history-panel">
      {/* Header */}
      <div className="p-3 min-h-[48px]" style={{ borderBottom: '1px solid #3d4452' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-[18px] h-[18px]" style={{ color: '#9da2a6' }} />
            <h3 className="text-[17px] font-medium leading-tight" style={{ color: '#ffffff' }}>
              History
            </h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-[13px]"
            style={{ 
              borderColor: '#3d4452',
              color: '#d4d8dd',
              backgroundColor: 'transparent'
            }}
            data-testid="button-save-checkpoint"
          >
            <Save className="w-[18px] h-[18px] mr-1.5" />
            Save Checkpoint
          </Button>
        </div>

        {/* Auto-save Status */}
        <div 
          className="flex items-center justify-between p-2 rounded-lg"
          style={{ backgroundColor: '#1c2333' }}
        >
          <div className="flex items-center gap-2">
            {autoSaveEnabled ? (
              <CheckCircle className="w-[18px] h-[18px]" style={{ color: '#22c55e' }} />
            ) : (
              <AlertCircle className="w-[18px] h-[18px]" style={{ color: '#f59e0b' }} />
            )}
            <span className="text-[15px] leading-[20px]" style={{ color: '#ffffff' }}>
              Auto-save {autoSaveEnabled ? 'enabled' : 'disabled'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg text-[13px]"
            style={{ color: '#0079f2' }}
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
              className="absolute left-5 top-0 bottom-0 w-px" 
              style={{ backgroundColor: '#3d4452' }} 
            />

            {checkpoints.map((checkpoint, index) => (
              <div key={checkpoint.id} className="relative mb-3" data-testid={`checkpoint-item-${checkpoint.id}`}>
                {/* Timeline dot */}
                <div 
                  className="absolute left-3.5 w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: '#0e1525',
                    border: '2px solid #3d4452'
                  }} 
                />

                <div className="ml-10">
                  <div
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all"
                    )}
                    style={{
                      backgroundColor: selectedCheckpoint === checkpoint.id ? '#242b3d' : '#1c2333',
                      border: `1px solid ${selectedCheckpoint === checkpoint.id ? '#0079f2' : '#3d4452'}`
                    }}
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
                              className="text-[15px] font-medium leading-[20px]"
                              style={{ color: '#ffffff' }}
                            >
                              {checkpoint.title}
                            </h4>
                            {checkpoint.type === 'auto' && (
                              <Badge 
                                variant="outline" 
                                className="text-[11px] uppercase tracking-wider px-1.5 py-0 rounded"
                                style={{ 
                                  borderColor: '#3d4452',
                                  color: '#9da2a6'
                                }}
                              >
                                Auto
                              </Badge>
                            )}
                            {index === 0 && (
                              <Badge 
                                className="text-[11px] uppercase tracking-wider px-1.5 py-0 rounded"
                                style={{ 
                                  backgroundColor: '#2B3245',
                                  color: '#f59e0b'
                                }}
                              >
                                Current
                              </Badge>
                            )}
                          </div>
                          {checkpoint.description && (
                            <p 
                              className="text-[13px] mt-0.5"
                              style={{ color: '#9da2a6' }}
                            >
                              {checkpoint.description}
                            </p>
                          )}
                          <div 
                            className="flex items-center gap-3 mt-1 text-[13px]"
                            style={{ color: '#5c6670' }}
                          >
                            <span>{checkpoint.author}</span>
                            <span>•</span>
                            <span>{getTimeAgo(checkpoint.timestamp)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[13px] text-right ml-2">
                        <div className="flex items-center gap-2">
                          <span style={{ color: '#22c55e' }}>+{checkpoint.changes.additions}</span>
                          <span style={{ color: '#ef4444' }}>-{checkpoint.changes.deletions}</span>
                        </div>
                        <div className="mt-0.5" style={{ color: '#5c6670' }}>
                          {checkpoint.changes.files} file{checkpoint.changes.files !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {/* File Changes */}
                    {checkpoint.files && expandedCheckpoints.has(checkpoint.id) && (
                      <motion.div 
                        className="mt-3 pt-3 space-y-1"
                        style={{ borderTop: '1px solid #3d4452' }}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {checkpoint.files.map((file, fileIndex) => (
                          <div
                            key={fileIndex}
                            className="flex items-center justify-between py-1 px-2 rounded-lg text-[13px]"
                            style={{ backgroundColor: '#242b3d' }}
                            data-testid={`file-change-${checkpoint.id}-${fileIndex}`}
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-[18px] h-[18px]" style={{ color: '#9da2a6' }} />
                              <span style={{ color: getStatusColor(file.status) }}>
                                {file.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[13px]">
                              <span style={{ color: '#22c55e' }}>+{file.additions}</span>
                              <span style={{ color: '#ef4444' }}>-{file.deletions}</span>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {/* Actions */}
                    {index > 0 && (
                      <div 
                        className="flex gap-2 mt-3 pt-3"
                        style={{ borderTop: '1px solid #3d4452' }}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg text-[13px]"
                          style={{ 
                            borderColor: '#3d4452',
                            color: '#d4d8dd',
                            backgroundColor: 'transparent'
                          }}
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
                          className="h-8 rounded-lg text-[13px]"
                          style={{ color: '#9da2a6' }}
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
                          className="h-8 rounded-lg text-[13px]"
                          style={{ color: '#9da2a6' }}
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
          style={{ 
            backgroundColor: '#1c2333',
            border: '1px solid #3d4452'
          }}
        >
          <DialogHeader>
            <DialogTitle 
              className="text-[17px] font-medium leading-tight"
              style={{ color: '#ffffff' }}
            >
              Restore Checkpoint
            </DialogTitle>
            <DialogDescription 
              className="text-[15px] leading-[20px]"
              style={{ color: '#9da2a6' }}
            >
              Are you sure you want to restore to "{restoreTarget?.title}"? This will replace your current workspace with the selected checkpoint.
            </DialogDescription>
          </DialogHeader>
          
          {restoreTarget && (
            <div className="py-3">
              <div 
                className="p-3 rounded-lg"
                style={{ 
                  backgroundColor: '#2B3245',
                  border: '1px solid #f59e0b'
                }}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-[18px] h-[18px] mt-0.5" style={{ color: '#f59e0b' }} />
                  <div>
                    <p 
                      className="text-[15px] font-medium leading-[20px]"
                      style={{ color: '#f59e0b' }}
                    >
                      Warning
                    </p>
                    <p 
                      className="text-[13px] mt-1"
                      style={{ color: '#f59e0b' }}
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
              className="h-8 rounded-lg text-[13px]"
              style={{ 
                borderColor: '#3d4452',
                color: '#d4d8dd',
                backgroundColor: 'transparent'
              }}
              onClick={() => setShowRestoreDialog(false)}
              data-testid="button-cancel-restore"
            >
              Cancel
            </Button>
            <Button 
              className="h-8 rounded-lg text-[13px]"
              style={{ 
                backgroundColor: '#0079f2',
                color: '#ffffff'
              }}
              onClick={confirmRestore}
              data-testid="button-confirm-restore"
            >
              Restore Checkpoint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
