import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { 
  Clock, 
  GitBranch, 
  FileEdit, 
  FolderPlus, 
  Package,
  RefreshCw,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  PlayCircle,
  ChevronRight
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface HistoryEntry {
  id: number;
  projectId: number;
  type: 'file_created' | 'file_updated' | 'file_deleted' | 'dependency_added' | 
         'deployment' | 'execution' | 'rollback';
  title: string;
  description?: string;
  userId: number;
  username: string;
  timestamp: string;
  details?: Record<string, any>;
  snapshot?: {
    files: { path: string; content: string }[];
    dependencies: Record<string, string>;
  };
}

interface Checkpoint {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  automatic: boolean;
  timestamp: string;
  snapshot: {
    files: { path: string; content: string }[];
    dependencies: Record<string, string>;
    environmentVariables: Record<string, string>;
  };
}

interface HistoryTimelineProps {
  projectId: number;
}

export function HistoryTimeline({ projectId }: HistoryTimelineProps) {
  const queryClient = useQueryClient();
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareEntries, setCompareEntries] = useState<[number?, number?]>([]);
  const [timeRange, setTimeRange] = useState([0, 100]);

  // Fetch history
  const { data: history = [] } = useQuery<HistoryEntry[]>({
    queryKey: ['/api/projects', projectId, 'history'],
    queryFn: () => apiRequest(`/api/projects/${projectId}/history`)
  });

  // Fetch checkpoints
  const { data: checkpoints = [] } = useQuery<Checkpoint[]>({
    queryKey: ['/api/projects', projectId, 'checkpoints'],
    queryFn: () => apiRequest(`/api/projects/${projectId}/checkpoints`)
  });

  // Create checkpoint mutation
  const createCheckpointMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiRequest(`/api/projects/${projectId}/checkpoints`, {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'checkpoints'] });
      toast({
        title: "Checkpoint created",
        description: "Your project state has been saved"
      });
    }
  });

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: (entryId: number) =>
      apiRequest(`/api/projects/${projectId}/rollback/${entryId}`, {
        method: 'POST'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      toast({
        title: "Rollback successful",
        description: "Your project has been restored to the selected state"
      });
      setSelectedEntry(null);
    }
  });

  // Filter history by time range
  const filteredHistory = history.filter((entry, index) => {
    const position = (index / Math.max(history.length - 1, 1)) * 100;
    return position >= timeRange[0] && position <= timeRange[1];
  });

  const getEntryIcon = (type: HistoryEntry['type']) => {
    switch (type) {
      case 'file_created': return <FolderPlus className="h-4 w-4" />;
      case 'file_updated': return <FileEdit className="h-4 w-4" />;
      case 'file_deleted': return <XCircle className="h-4 w-4" />;
      case 'dependency_added': return <Package className="h-4 w-4" />;
      case 'deployment': return <GitBranch className="h-4 w-4" />;
      case 'execution': return <PlayCircle className="h-4 w-4" />;
      case 'rollback': return <RefreshCw className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getEntryColor = (type: HistoryEntry['type']) => {
    switch (type) {
      case 'file_created': return 'text-green-600';
      case 'file_updated': return 'text-blue-600';
      case 'file_deleted': return 'text-red-600';
      case 'dependency_added': return 'text-purple-600';
      case 'deployment': return 'text-orange-600';
      case 'execution': return 'text-cyan-600';
      case 'rollback': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const handleCompareSelect = (entryId: number) => {
    if (!compareMode) return;
    
    if (!compareEntries[0]) {
      setCompareEntries([entryId]);
    } else if (!compareEntries[1] && compareEntries[0] !== entryId) {
      setCompareEntries([compareEntries[0], entryId]);
    } else {
      setCompareEntries([entryId]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Project History</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={compareMode ? "default" : "outline"}
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareEntries([]);
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              Compare
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const name = `Checkpoint ${new Date().toLocaleString()}`;
                createCheckpointMutation.mutate({ name });
              }}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Create Checkpoint
            </Button>
          </div>
        </div>

        {/* Time range slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Time Range</span>
            <span>{filteredHistory.length} of {history.length} entries</span>
          </div>
          <Slider
            value={timeRange}
            onValueChange={setTimeRange}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      </div>

      <Tabs defaultValue="timeline" className="flex-1">
        <TabsList className="w-full">
          <TabsTrigger value="timeline" className="flex-1">
            Timeline
          </TabsTrigger>
          <TabsTrigger value="checkpoints" className="flex-1">
            Checkpoints ({checkpoints.length})
          </TabsTrigger>
          <TabsTrigger value="visual" className="flex-1">
            Visual History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="flex-1">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="p-4 space-y-2">
              {filteredHistory.map((entry, index) => (
                <Card 
                  key={entry.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-accent",
                    selectedEntry?.id === entry.id && "ring-2 ring-primary",
                    compareMode && compareEntries.includes(entry.id) && "bg-blue-50 dark:bg-blue-950"
                  )}
                  onClick={() => {
                    if (compareMode) {
                      handleCompareSelect(entry.id);
                    } else {
                      setSelectedEntry(entry);
                    }
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-1 p-1.5 rounded-full bg-background border",
                        getEntryColor(entry.type)
                      )}>
                        {getEntryIcon(entry.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium text-sm truncate">
                            {entry.title}
                          </h4>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(entry.timestamp)}
                          </span>
                        </div>
                        {entry.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {entry.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {entry.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {entry.username}
                          </span>
                          {entry.details?.filesChanged && (
                            <Badge variant="secondary" className="text-xs">
                              {entry.details.filesChanged} files
                            </Badge>
                          )}
                        </div>
                      </div>
                      {index < filteredHistory.length - 1 && (
                        <div className="absolute left-7 top-12 w-0.5 h-20 bg-border" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Selected entry details */}
          {selectedEntry && !compareMode && (
            <div className="p-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Entry Details</h4>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => rollbackMutation.mutate(selectedEntry.id)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Rollback to This Point
                </Button>
              </div>
              {selectedEntry.details && (
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(selectedEntry.details, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Compare mode */}
          {compareMode && compareEntries.length === 2 && (
            <div className="p-4 border-t">
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  // Open comparison view
                  console.log('Compare', compareEntries);
                }}
              >
                Compare Selected Entries
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="checkpoints" className="flex-1 p-4">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-3">
              {checkpoints.map(checkpoint => (
                <Card key={checkpoint.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {checkpoint.name}
                          {checkpoint.automatic && (
                            <Badge variant="secondary" className="text-xs">
                              Auto
                            </Badge>
                          )}
                        </CardTitle>
                        {checkpoint.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {checkpoint.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(checkpoint.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rollbackMutation.mutate(checkpoint.id)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="visual" className="flex-1 p-4">
          <div className="h-[calc(100vh-300px)] flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="mx-auto w-48 h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Clock className="h-24 w-24 text-white" />
              </div>
              <h3 className="text-lg font-semibold">Visual Timeline</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Interactive visual representation of your project's history with 
                branching paths, merge points, and key milestones
              </p>
              <Button>
                <ChevronRight className="h-4 w-4 mr-2" />
                Launch Visual Explorer
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}