import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  History,
  GitCommit,
  RotateCcw,
  Eye,
  Download,
  ChevronDown,
  ChevronRight,
  Clock,
  Save,
  AlertCircle,
  CheckCircle,
  FileText,
  Plus,
  Minus,
  Edit
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

export function ReplitHistoryPanel({ projectId }: { projectId?: string }) {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>(null);
  const [expandedCheckpoints, setExpandedCheckpoints] = useState<Set<string>>(new Set());
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Checkpoint | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

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
    console.log('Restoring to checkpoint:', restoreTarget);
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
    switch (type) {
      case 'auto':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'manual':
        return <Save className="h-4 w-4 text-blue-500" />;
      case 'deploy':
        return <GitCommit className="h-4 w-4 text-green-500" />;
      default:
        return <History className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return 'text-green-600';
      case 'modified':
        return 'text-blue-600';
      case 'deleted':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">History</h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
          >
            <Save className="h-3 w-3 mr-1" />
            Save Checkpoint
          </Button>
        </div>

        {/* Auto-save Status */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <div className="flex items-center gap-2">
            {autoSaveEnabled ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
            <span className="text-sm text-gray-700">
              Auto-save {autoSaveEnabled ? 'enabled' : 'disabled'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
          >
            {autoSaveEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
      </div>

      {/* Checkpoints List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Timeline */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

            {checkpoints.map((checkpoint, index) => (
              <div key={checkpoint.id} className="relative mb-4">
                {/* Timeline dot */}
                <div className="absolute left-3.5 w-3 h-3 bg-white border-2 border-gray-300 rounded-full" />

                <div className="ml-10">
                  <div
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-all",
                      selectedCheckpoint === checkpoint.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                    onClick={() => {
                      setSelectedCheckpoint(checkpoint.id);
                      if (checkpoint.files) {
                        toggleCheckpointExpansion(checkpoint.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {getCheckpointIcon(checkpoint.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-gray-900">
                              {checkpoint.title}
                            </h4>
                            {checkpoint.type === 'auto' && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                Auto
                              </Badge>
                            )}
                            {index === 0 && (
                              <Badge className="text-xs px-1 py-0 bg-yellow-100 text-yellow-700">
                                Current
                              </Badge>
                            )}
                          </div>
                          {checkpoint.description && (
                            <p className="text-xs text-gray-600 mt-0.5">
                              {checkpoint.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{checkpoint.author}</span>
                            <span>•</span>
                            <span>{getTimeAgo(checkpoint.timestamp)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-600 text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">+{checkpoint.changes.additions}</span>
                            <span className="text-red-600">-{checkpoint.changes.deletions}</span>
                          </div>
                          <div className="text-gray-500 mt-0.5">
                            {checkpoint.changes.files} file{checkpoint.changes.files !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* File Changes */}
                    {checkpoint.files && expandedCheckpoints.has(checkpoint.id) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="space-y-1">
                          {checkpoint.files.map((file, fileIndex) => (
                            <div
                              key={fileIndex}
                              className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3 text-gray-400" />
                                <span className={getStatusColor(file.status)}>
                                  {file.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-green-600">+{file.additions}</span>
                                <span className="text-red-600">-{file.deletions}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {index > 0 && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(checkpoint);
                          }}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Diff
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Checkpoint</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore to "{restoreTarget?.title}"? This will replace your current workspace with the selected checkpoint.
            </DialogDescription>
          </DialogHeader>
          
          {restoreTarget && (
            <div className="py-3">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Warning</p>
                    <p className="text-yellow-700 mt-1">
                      Your current unsaved changes will be lost. Consider saving a checkpoint first.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRestore}>
              Restore Checkpoint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}