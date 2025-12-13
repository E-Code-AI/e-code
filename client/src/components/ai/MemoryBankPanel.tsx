import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Database,
  Brain,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Save,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Clock,
  Edit3,
  X
} from 'lucide-react';

interface MemoryBankFile {
  name: string;
  content: string;
  lastUpdated: string;
  size: number;
}

interface MemoryBank {
  projectId: number;
  files: MemoryBankFile[];
  totalSize: number;
  initialized: boolean;
  lastUpdated: string;
}

interface MemoryBankStatus {
  initialized: boolean;
}

interface MemoryBankPanelProps {
  projectId: number | string;
  className?: string;
  compact?: boolean;
}

export function useMemoryBankStatus(projectId: number | string) {
  return useQuery<MemoryBankStatus>({
    queryKey: ['/api/memory-bank', projectId, 'status'],
    enabled: !!projectId,
    staleTime: 30000,
  });
}

export function useMemoryBank(projectId: number | string) {
  return useQuery<MemoryBank>({
    queryKey: ['/api/memory-bank', projectId],
    enabled: !!projectId,
    staleTime: 10000,
    retry: 1,
  });
}

export function MemoryBankStatusBadge({ 
  initialized, 
  className 
}: { 
  initialized: boolean; 
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={initialized ? "default" : "outline"}
            className={cn(
              "gap-1",
              initialized ? "bg-green-600 hover:bg-green-700" : "text-muted-foreground border-muted",
              className
            )}
            data-testid="badge-memory-bank-status"
          >
            <Brain className="h-3 w-3" />
            {initialized ? "Memory Active" : "Memory N/A"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {initialized 
            ? "Memory Bank is active - project context persists across AI sessions"
            : "Memory Bank not initialized - AI may forget project context between sessions"
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function MemoryBankPanel({ projectId, className, compact = false }: MemoryBankPanelProps) {
  const [isOpen, setIsOpen] = useState(!compact);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  
  const { data: memoryBank, isLoading, error, refetch } = useMemoryBank(projectId);
  const { data: status } = useMemoryBankStatus(projectId);
  
  const initializeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/memory-bank/${projectId}/initialize`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/memory-bank', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/memory-bank', projectId, 'status'] });
    },
  });
  
  const updateFileMutation = useMutation({
    mutationFn: async ({ filename, content }: { filename: string; content: string }) => {
      return apiRequest('PUT', `/api/memory-bank/${projectId}/files/${filename}`, { content });
    },
    onSuccess: () => {
      setEditingFile(null);
      setEditContent('');
      queryClient.invalidateQueries({ queryKey: ['/api/memory-bank', projectId] });
    },
  });
  
  const handleStartEdit = (file: MemoryBankFile) => {
    setEditingFile(file.name);
    setEditContent(file.content);
  };
  
  const handleSaveEdit = () => {
    if (editingFile) {
      updateFileMutation.mutate({ filename: editingFile, content: editContent });
    }
  };
  
  const handleCancelEdit = () => {
    setEditingFile(null);
    setEditContent('');
  };

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className={cn("w-full justify-between p-2", className)}
            data-testid="button-memory-bank-toggle"
          >
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span>Memory Bank</span>
            </div>
            <div className="flex items-center gap-2">
              {status?.initialized && (
                <Badge variant="secondary" className="text-xs">
                  {memoryBank?.files?.length || 0} files
                </Badge>
              )}
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <MemoryBankContent 
            projectId={projectId}
            memoryBank={memoryBank}
            isLoading={isLoading}
            error={error}
            editingFile={editingFile}
            editContent={editContent}
            setEditContent={setEditContent}
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onInitialize={() => initializeMutation.mutate()}
            onRefetch={() => refetch()}
            isInitializing={initializeMutation.isPending}
            isSaving={updateFileMutation.isPending}
          />
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Memory Bank</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {status?.initialized && (
              <MemoryBankStatusBadge initialized={true} />
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => refetch()}
                    data-testid="button-memory-bank-refresh"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh memory bank</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <CardDescription>
          Persistent project context that prevents AI amnesia between sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MemoryBankContent 
          projectId={projectId}
          memoryBank={memoryBank}
          isLoading={isLoading}
          error={error}
          editingFile={editingFile}
          editContent={editContent}
          setEditContent={setEditContent}
          onStartEdit={handleStartEdit}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          onInitialize={() => initializeMutation.mutate()}
          onRefetch={() => refetch()}
          isInitializing={initializeMutation.isPending}
          isSaving={updateFileMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}

interface MemoryBankContentProps {
  projectId: number | string;
  memoryBank: MemoryBank | undefined;
  isLoading: boolean;
  error: Error | null;
  editingFile: string | null;
  editContent: string;
  setEditContent: (content: string) => void;
  onStartEdit: (file: MemoryBankFile) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onInitialize: () => void;
  onRefetch: () => void;
  isInitializing: boolean;
  isSaving: boolean;
}

function MemoryBankContent({
  memoryBank,
  isLoading,
  error,
  editingFile,
  editContent,
  setEditContent,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onInitialize,
  isInitializing,
  isSaving,
}: MemoryBankContentProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const toggleFile = (filename: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error || !memoryBank?.initialized) {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-muted">
            <Database className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        <div>
          <h4 className="font-medium">Memory Bank Not Initialized</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Initialize the memory bank to give AI persistent context about your project
          </p>
        </div>
        <Button 
          onClick={onInitialize}
          disabled={isInitializing}
          className="gap-2"
          data-testid="button-initialize-memory-bank"
        >
          {isInitializing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Initialize Memory Bank
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[250px] sm:max-h-[300px] md:max-h-[400px]">
      <div className="space-y-2">
        {memoryBank.files.map((file) => (
          <Collapsible
            key={file.name}
            open={expandedFiles.has(file.name) || editingFile === file.name}
            onOpenChange={() => toggleFile(file.name)}
          >
            <div className="border rounded-lg">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-3 h-auto"
                  data-testid={`button-memory-file-${file.name}`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                    <span className="hidden sm:inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(file.lastUpdated).toLocaleDateString()}</span>
                      <span className="text-muted-foreground/50">•</span>
                    </span>
                    <span>{formatBytes(file.size)}</span>
                    {expandedFiles.has(file.name) ? (
                      <ChevronDown className="h-4 w-4 ml-1" />
                    ) : (
                      <ChevronRight className="h-4 w-4 ml-1" />
                    )}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3">
                  {editingFile === file.name ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[200px] font-mono text-sm"
                        data-testid={`textarea-memory-file-${file.name}`}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onCancelEdit}
                          disabled={isSaving}
                          data-testid="button-cancel-edit"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={onSaveEdit}
                          disabled={isSaving}
                          data-testid="button-save-memory-file"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-1" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {file.content.substring(0, 1000)}
                        {file.content.length > 1000 && '...'}
                      </pre>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartEdit(file);
                          }}
                          data-testid={`button-edit-memory-file-${file.name}`}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
        
        {memoryBank.files.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No memory bank files yet</p>
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex justify-between">
        <span>Total: {memoryBank.files.length} files</span>
        <span>{formatBytes(memoryBank.totalSize)}</span>
      </div>
    </ScrollArea>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default MemoryBankPanel;
