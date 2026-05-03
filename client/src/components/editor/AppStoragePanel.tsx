import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
ContextMenu,
ContextMenuContent,
ContextMenuItem,
ContextMenuSeparator,
ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
Dialog,
DialogContent,
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, getCSRFToken, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useMutation,useQuery } from '@tanstack/react-query';
import {
AlertCircle,
Check,
ChevronDown,
ChevronRight,
Copy,
Download,
File,
FileAudio,
FileCode,
FileText,
FileVideo,
Folder,
FolderOpen,
FolderPlus,
HardDrive,
Image,
Link,
Globe,
Lock,
Loader2,
Pencil,
RefreshCw,
Trash2,
Upload,
X,
} from 'lucide-react';
import { useCallback,useEffect,useMemo,useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useParams } from 'wouter';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  contentType?: string;
  lastModified?: string;
  isPublic?: boolean;
  children?: TreeNode[];
}

interface StorageStats {
  totalSize: number;
  totalSizeFormatted: string;
  fileCount: number;
  maxStorage: number;
  maxStorageFormatted: string;
  usagePercent: number;
}

interface StorageResponse {
  files: TreeNode[];
  stats: StorageStats;
}

interface AppStoragePanelProps {
  projectId?: string | number;
  className?: string;
}

function getFileIcon(contentType?: string, name?: string) {
  if (!contentType && name) {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <Image className="w-4 h-4 text-purple-500" />;
    }
    if (['mp4', 'webm', 'mov'].includes(ext || '')) {
      return <FileVideo className="w-4 h-4 text-red-500" />;
    }
    if (['mp3', 'wav', 'ogg'].includes(ext || '')) {
      return <FileAudio className="w-4 h-4 text-yellow-500" />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css'].includes(ext || '')) {
      return <FileCode className="w-4 h-4 text-blue-500" />;
    }
    if (['txt', 'md', 'pdf'].includes(ext || '')) {
      return <FileText className="w-4 h-4 text-gray-500" />;
    }
  }
  
  if (contentType?.startsWith('image/')) {
    return <Image className="w-4 h-4 text-purple-500" />;
  }
  if (contentType?.startsWith('video/')) {
    return <FileVideo className="w-4 h-4 text-red-500" />;
  }
  if (contentType?.startsWith('audio/')) {
    return <FileAudio className="w-4 h-4 text-yellow-500" />;
  }
  if (contentType?.includes('javascript') || contentType?.includes('json')) {
    return <FileCode className="w-4 h-4 text-blue-500" />;
  }
  if (contentType?.includes('text')) {
    return <FileText className="w-4 h-4 text-gray-500" />;
  }
  
  return <File className="w-4 h-4 text-muted-foreground" />;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function isImageFile(contentType?: string, name?: string): boolean {
  if (contentType?.startsWith('image/')) return true;
  const ext = name?.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
}

interface FileTreeItemProps {
  node: TreeNode;
  projectId: string | number;
  depth: number;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  selectedFile: string | null;
  setSelectedFile: (path: string | null) => void;
  onDownload: (path: string, name: string) => void;
  onDelete: (path: string) => void;
  onDeleteFolder: (path: string, name: string) => void;
  onCopyUrl: (path: string) => void;
  onRename: (path: string, name: string) => void;
  onRenameFolder: (path: string, name: string) => void;
  onCopyFile: (path: string, name: string) => void;
}

function FileTreeItem({
  node,
  projectId,
  depth,
  expandedFolders,
  toggleFolder,
  selectedFile,
  setSelectedFile,
  onDownload,
  onDelete,
  onDeleteFolder,
  onCopyUrl,
  onRename,
  onRenameFolder,
  onCopyFile,
}: FileTreeItemProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFile === node.path;

  if (node.name === '.placeholder') return null;

  const handleClick = () => {
    if (node.type === 'folder') {
      toggleFolder(node.path);
    } else {
      setSelectedFile(node.path);
    }
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-accent/50 transition-colors",
              isSelected && "bg-accent"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={handleClick}
            data-testid={`storage-item-${node.path}`}
          >
            {node.type === 'folder' ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-yellow-500 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-yellow-500 shrink-0" />
                )}
              </>
            ) : (
              <>
                <span className="w-4" />
                {getFileIcon(node.contentType, node.name)}
              </>
            )}
            <span className="text-[13px] truncate flex-1" data-testid={`text-filename-${node.name}`}>
              {node.name}
            </span>
            {node.type === 'file' && node.size && (
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatSize(node.size)}
              </span>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {node.type === 'file' ? (
            <>
              <ContextMenuItem onClick={() => onDownload(node.path, node.name)} data-testid={`menu-download-${node.name}`}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCopyUrl(node.path)} data-testid={`menu-copy-url-${node.name}`}>
                <Link className="w-4 h-4 mr-2" />
                Copy URL
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCopyFile(node.path, node.name)} data-testid={`menu-copy-${node.name}`}>
                <Copy className="w-4 h-4 mr-2" />
                Copy / Duplicate
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onRename(node.path, node.name)} data-testid={`menu-rename-${node.name}`}>
                <Pencil className="w-4 h-4 mr-2" />
                Rename
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => onDelete(node.path)}
                className="text-destructive"
                data-testid={`menu-delete-${node.name}`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </ContextMenuItem>
            </>
          ) : (
            <>
              <ContextMenuItem onClick={() => onRenameFolder(node.path, node.name)} data-testid={`menu-rename-folder-${node.name}`}>
                <Pencil className="w-4 h-4 mr-2" />
                Rename Folder
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => onDeleteFolder(node.path, node.name)}
                className="text-destructive"
                data-testid={`menu-delete-folder-${node.name}`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Folder
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              projectId={projectId}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              onDownload={onDownload}
              onDelete={onDelete}
              onDeleteFolder={onDeleteFolder}
              onCopyUrl={onCopyUrl}
              onRename={onRename}
              onRenameFolder={onRenameFolder}
              onCopyFile={onCopyFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AppStoragePanel({ projectId, className }: AppStoragePanelProps) {
  const params = useParams<{ id?: string; projectId?: string }>();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Rename dialog state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ path: string; name: string } | null>(null);
  const [renameTo, setRenameTo] = useState('');

  // Copy/duplicate dialog state
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copySource, setCopySource] = useState<{ path: string; name: string } | null>(null);
  const [copyDest, setCopyDest] = useState('');

  // Per-file public/private visibility (optimistic local state)
  const [publicFiles, setPublicFiles] = useState<Set<string>>(new Set());

  const { toast } = useToast();
  const resolvedProjectId = projectId ?? params.projectId ?? params.id ?? new URLSearchParams(window.location.search).get('projectId') ?? undefined;

  const queryKey = ['/api/projects', resolvedProjectId, 'storage'];

  const { data: storageData, isLoading, error, refetch } = useQuery<StorageResponse>({
    queryKey,
    queryFn: async () => {
      if (!resolvedProjectId) throw new Error('Project ID required');
      return apiRequest<StorageResponse>('GET', `/api/projects/${resolvedProjectId}/storage`);
    },
    enabled: !!resolvedProjectId,
    staleTime: 30000,
  });

  // Hydrate public-file state from backend truth on every list refresh
  useEffect(() => {
    if (!storageData?.files) return;
    const collectPublic = (nodes: TreeNode[]): string[] => {
      const acc: string[] = [];
      for (const n of nodes) {
        if (n.type === 'file' && n.isPublic) acc.push(n.path);
        if (n.children) acc.push(...collectPublic(n.children));
      }
      return acc;
    };
    setPublicFiles(new Set(collectPublic(storageData.files)));
  }, [storageData]);

  const [fileUploadProgress, setFileUploadProgress] = useState<Record<string, number>>({});

  const uploadMutation = useMutation({
    mutationFn: async ({ file, folderPath }: { file: File; folderPath: string }) => {
      const csrfToken = await getCSRFToken();
      const formData = new FormData();
      formData.append('file', file);
      // Send the target folder path so the backend places the file in the right prefix
      if (folderPath) formData.append('path', folderPath);

      return new Promise<unknown>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true;

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setFileUploadProgress(prev => ({ ...prev, [file.name]: pct }));
          }
        };

        xhr.onload = () => {
          setFileUploadProgress(prev => { const n = { ...prev }; delete n[file.name]; return n; });
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); }
          } else {
            try {
              const body = JSON.parse(xhr.responseText);
              reject(new Error(body.message || body.error || `Upload failed: ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => {
          setFileUploadProgress(prev => { const n = { ...prev }; delete n[file.name]; return n; });
          reject(new Error('Network error during upload'));
        };

        xhr.open('POST', `/api/projects/${resolvedProjectId}/storage/upload`);
        xhr.setRequestHeader('X-CSRF-Token', csrfToken);
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', resolvedProjectId, 'storage'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest('POST', `/api/projects/${resolvedProjectId}/storage/folder`, { name });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Folder created' });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', resolvedProjectId, 'storage'] });
      setShowNewFolderDialog(false);
      setNewFolderName('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create folder',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (path: string) => {
      return apiRequest('DELETE', `/api/projects/${resolvedProjectId}/storage/${encodeURIComponent(path)}`);
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'File deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', resolvedProjectId, 'storage'] });
      setSelectedFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete file',
        variant: 'destructive',
      });
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ sourcePath, destination, isFolder }: { sourcePath: string; destination: string; isFolder?: boolean }) => {
      return apiRequest(
        'POST',
        `/api/projects/${resolvedProjectId}/storage/${encodeURIComponent(sourcePath)}/move`,
        { destination, isFolder: isFolder ?? false }
      );
    },
    onSuccess: (_data, { sourcePath }) => {
      toast({ title: 'Renamed', description: 'File renamed successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', resolvedProjectId, 'storage'] });
      if (selectedFile === sourcePath) setSelectedFile(null);
      setShowRenameDialog(false);
      setRenameTarget(null);
      setRenameTo('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Rename failed',
        description: error.message || 'Could not rename file',
        variant: 'destructive',
      });
    },
  });

  const copyMutation = useMutation({
    mutationFn: async ({ sourcePath, destination }: { sourcePath: string; destination: string }) => {
      return apiRequest(
        'POST',
        `/api/projects/${resolvedProjectId}/storage/${encodeURIComponent(sourcePath)}/copy`,
        { destination }
      );
    },
    onSuccess: () => {
      toast({ title: 'Copied', description: 'File duplicated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', resolvedProjectId, 'storage'] });
      setShowCopyDialog(false);
      setCopySource(null);
      setCopyDest('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Copy failed',
        description: error.message || 'Could not copy file',
        variant: 'destructive',
      });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderPath: string) => {
      return apiRequest('DELETE', `/api/projects/${resolvedProjectId}/storage/folder/${encodeURIComponent(folderPath)}`);
    },
    onSuccess: (_data, folderPath) => {
      toast({ title: 'Folder deleted', description: 'All contents removed' });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', resolvedProjectId, 'storage'] });
      if (selectedFile?.startsWith(folderPath + '/') || selectedFile === folderPath) {
        setSelectedFile(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete folder failed',
        description: error.message || 'Could not delete folder',
        variant: 'destructive',
      });
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: async ({ filePath, isPublic }: { filePath: string; isPublic: boolean }) => {
      return apiRequest<{ path: string; public: boolean; publicUrl: string | null }>(
        'PATCH',
        `/api/projects/${resolvedProjectId}/storage/${encodeURIComponent(filePath)}/visibility`,
        { public: isPublic }
      );
    },
    onSuccess: (data, { filePath, isPublic }) => {
      setPublicFiles(prev => {
        const next = new Set(prev);
        if (isPublic) {
          next.add(filePath);
        } else {
          next.delete(filePath);
        }
        return next;
      });
      toast({
        title: isPublic ? 'File is now public' : 'File is now private',
        description: isPublic
          ? 'Anyone with the link can access this file.'
          : 'File is only accessible by authenticated users.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Visibility update failed',
        description: error.message || 'Could not change file visibility',
        variant: 'destructive',
      });
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Derive the target folder from the currently selected file (if any).
    // If a file inside a folder is selected, upload siblings into that folder.
    // Otherwise upload to the bucket root.
    const folderPath = selectedFile && selectedFile.includes('/')
      ? selectedFile.substring(0, selectedFile.lastIndexOf('/'))
      : '';
    for (const file of acceptedFiles) {
      setUploadingFiles(prev => [...prev, file.name]);
      try {
        await uploadMutation.mutateAsync({ file, folderPath });
        toast({ title: 'Success', description: `Uploaded ${file.name}` });
      } finally {
        setUploadingFiles(prev => prev.filter(f => f !== file.name));
      }
    }
  }, [uploadMutation, toast, selectedFile]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  });

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleDownload = useCallback((path: string, name: string) => {
    const url = `/api/projects/${resolvedProjectId}/storage/${encodeURIComponent(path)}/download`;
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [resolvedProjectId]);

  const handleDelete = useCallback((path: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      deleteMutation.mutate(path);
    }
  }, [deleteMutation]);

  const handleCopyUrl = useCallback(async (path: string) => {
    try {
      const response = await apiRequest<{ url: string; expiresIn: number }>(
        'GET',
        `/api/projects/${resolvedProjectId}/storage/${encodeURIComponent(path)}/url`
      );
      if (!response?.url) throw new Error('Storage backend did not return a signed URL');
      await navigator.clipboard.writeText(response.url);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
      toast({ title: 'Copied', description: 'Signed URL copied (valid for 1 hour)' });
    } catch (err: unknown) {
      toast({
        title: 'Failed to copy signed URL',
        description: err instanceof Error ? err.message : 'Could not generate a time-limited URL for this file',
        variant: 'destructive',
      });
    }
  }, [resolvedProjectId, toast]);

  const handleDeleteFolder = useCallback((folderPath: string, name: string) => {
    if (confirm(`Delete folder "${name}" and all its contents? This cannot be undone.`)) {
      deleteFolderMutation.mutate(folderPath);
    }
  }, [deleteFolderMutation]);

  const handleRename = useCallback((path: string, name: string) => {
    setRenameTarget({ path, name });
    setRenameTo(name);
    setShowRenameDialog(true);
  }, []);

  const handleRenameFolder = useCallback((path: string, name: string) => {
    setRenameTarget({ path, name });
    setRenameTo(name);
    setShowRenameDialog(true);
  }, []);

  const handleCopyFile = useCallback((path: string, name: string) => {
    const dir = path.includes('/') ? path.substring(0, path.lastIndexOf('/') + 1) : '';
    const ext = name.includes('.') ? name.substring(name.lastIndexOf('.')) : '';
    const base = name.includes('.') ? name.substring(0, name.lastIndexOf('.')) : name;
    setCopySource({ path, name });
    setCopyDest(`${dir}${base}_copy${ext}`);
    setShowCopyDialog(true);
  }, []);

  const submitRename = useCallback(() => {
    if (!renameTarget || !renameTo.trim() || renameTo.trim() === renameTarget.name) return;
    const dir = renameTarget.path.includes('/')
      ? renameTarget.path.substring(0, renameTarget.path.lastIndexOf('/') + 1)
      : '';
    const newPath = `${dir}${renameTo.trim()}`;
    // Detect whether this is a folder rename by looking at the tree
    const isFolder = storageData?.files
      ? (() => {
          const find = (nodes: TreeNode[], p: string): TreeNode | null => {
            for (const n of nodes) {
              if (n.path === p) return n;
              if (n.children) { const f = find(n.children, p); if (f) return f; }
            }
            return null;
          };
          return find(storageData.files, renameTarget.path)?.type === 'folder';
        })()
      : false;
    moveMutation.mutate({ sourcePath: renameTarget.path, destination: newPath, isFolder });
  }, [renameTarget, renameTo, moveMutation, storageData]);

  const submitCopy = useCallback(() => {
    if (!copySource || !copyDest.trim()) return;
    copyMutation.mutate({ sourcePath: copySource.path, destination: copyDest.trim() });
  }, [copySource, copyDest, copyMutation]);

  const selectedFileData = useMemo(() => {
    if (!selectedFile || !storageData?.files) return null;
    
    const findFile = (nodes: TreeNode[], path: string): TreeNode | null => {
      for (const node of nodes) {
        if (node.path === path) return node;
        if (node.children) {
          const found = findFile(node.children, path);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findFile(storageData.files, selectedFile);
  }, [selectedFile, storageData?.files]);

  if (!resolvedProjectId) {
    return (
      <div 
        className={cn("h-full flex flex-col items-center justify-center p-3 bg-background", className)}
        data-testid="storage-panel-no-project"
      >
        <HardDrive className="w-12 h-12 mb-4 text-muted-foreground opacity-40" />
        <p className="text-[13px] text-muted-foreground">Select a project to manage storage</p>
      </div>
    );
  }

  return (
    <div 
      className={cn("h-full flex flex-col bg-[var(--ecode-surface)]", className)}
      data-testid="app-storage-panel"
      {...getRootProps()}
    >
      <input {...getInputProps()} data-testid="input-file-upload" />
      
      <div className="h-9 px-2.5 flex items-center justify-between border-b border-[var(--ecode-border)] shrink-0">
        <div className="flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-[var(--ecode-text-muted)]" />
          <span className="text-xs font-medium text-[var(--ecode-text)]" data-testid="text-storage-title">Storage</span>
          {storageData?.stats && (
            <Badge className="h-4 px-1 text-[9px] bg-[var(--ecode-sidebar-hover)] text-[var(--ecode-text-muted)] rounded" data-testid="text-file-count">
              {storageData.stats.fileCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-storage"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]"
            onClick={() => setShowNewFolderDialog(true)}
            data-testid="button-new-folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md text-[hsl(142,72%,42%)] hover:bg-[hsl(142,72%,42%)]/10"
            onClick={open}
            disabled={uploadingFiles.length > 0}
            data-testid="button-upload"
          >
            <Upload className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {storageData?.stats && (
        <div className="px-2.5 py-1 border-b border-[var(--ecode-border)] shrink-0">
          <div className="flex items-center justify-between text-[9px] text-[var(--ecode-text-muted)]">
            <span data-testid="text-storage-used">{storageData.stats.totalSizeFormatted}</span>
            <span data-testid="text-storage-max">{storageData.stats.maxStorageFormatted}</span>
          </div>
          <Progress 
            value={storageData.stats.usagePercent} 
            className="h-1 mt-1"
            data-testid="progress-storage-usage"
          />
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <ScrollArea className="flex-1 lg:w-1/2 border-r border-border">
          <div className="p-2">
            {isDragActive && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg">
                <div className="text-center">
                  <Upload className="w-12 h-12 mx-auto mb-2 text-primary" />
                  <p className="text-[13px] font-medium">Drop files here to upload</p>
                </div>
              </div>
            )}

            {uploadingFiles.length > 0 && (
              <div className="mb-2 p-2 bg-muted rounded-lg space-y-2">
                {uploadingFiles.map(fileName => {
                  const pct = fileUploadProgress[fileName] ?? 0;
                  return (
                    <div key={fileName} className="space-y-1">
                      <div className="flex items-center gap-2 text-[13px]">
                        <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                        <span className="truncate flex-1">{fileName}</span>
                        <span className="text-muted-foreground tabular-nums">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1" />
                    </div>
                  );
                })}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-8 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-12 h-12 mb-3 text-destructive opacity-40" />
                <p className="text-[13px] text-muted-foreground">Failed to load storage</p>
                <Button variant="link" className="mt-2" onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            ) : !storageData?.files.length ? (
              <div 
                className="flex flex-col items-center justify-center py-12 text-center cursor-pointer"
                onClick={open}
              >
                <HardDrive className="w-12 h-12 mb-4 text-muted-foreground opacity-40" />
                <h4 className="text-base font-medium mb-2">No files uploaded</h4>
                <p className="text-[13px] text-muted-foreground mb-4">
                  Drag & drop files or click to upload
                </p>
                <Button onClick={open} data-testid="button-upload-empty">
                  <Upload className="w-4 h-4 mr-1" />
                  Upload files
                </Button>
              </div>
            ) : (
              storageData.files.map((node) => (
                <FileTreeItem
                  key={node.path}
                  node={node}
                  projectId={resolvedProjectId}
                  depth={0}
                  expandedFolders={expandedFolders}
                  toggleFolder={toggleFolder}
                  selectedFile={selectedFile}
                  setSelectedFile={setSelectedFile}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  onDeleteFolder={handleDeleteFolder}
                  onCopyUrl={handleCopyUrl}
                  onRename={handleRename}
                  onRenameFolder={handleRenameFolder}
                  onCopyFile={handleCopyFile}
                />
              ))
            )}
          </div>
        </ScrollArea>

        <div className="hidden lg:flex lg:w-1/2 flex-col">
          {selectedFileData ? (
            <div className="flex-1 flex flex-col p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium truncate" data-testid="text-selected-filename">
                  {selectedFileData.name}
                </h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {isImageFile(selectedFileData.contentType, selectedFileData.name) && (
                <div className="flex-1 flex items-center justify-center bg-muted rounded-lg mb-4 overflow-hidden">
                  <img
                    src={`/api/projects/${resolvedProjectId}/storage/${encodeURIComponent(selectedFileData.path)}/download`}
                    alt={selectedFileData.name}
                    className="max-w-full max-h-[300px] object-contain"
                    data-testid="img-preview"
                  />
                </div>
              )}

              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span data-testid="text-file-size">{formatSize(selectedFileData.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span data-testid="text-file-type">{selectedFileData.contentType || 'Unknown'}</span>
                </div>
                {selectedFileData.lastModified && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Modified</span>
                    <span data-testid="text-file-modified">
                      {new Date(selectedFileData.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedFileData.path, selectedFileData.name)}
                  data-testid="button-download-selected"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyUrl(selectedFileData.path)}
                  data-testid="button-copy-url-selected"
                >
                  {copiedPath === selectedFileData.path ? (
                    <Check className="w-4 h-4 mr-1 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1" />
                  )}
                  Copy URL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRename(selectedFileData.path, selectedFileData.name)}
                  data-testid="button-rename-selected"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Rename
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyFile(selectedFileData.path, selectedFileData.name)}
                  data-testid="button-copy-selected"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(selectedFileData.path)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-selected"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1" />
                  )}
                  Delete
                </Button>
                <Button
                  variant={publicFiles.has(selectedFileData.path) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() =>
                    visibilityMutation.mutate({
                      filePath: selectedFileData.path,
                      isPublic: !publicFiles.has(selectedFileData.path),
                    })
                  }
                  disabled={visibilityMutation.isPending}
                  data-testid="button-toggle-visibility"
                  title={publicFiles.has(selectedFileData.path) ? 'Make private' : 'Make public'}
                >
                  {visibilityMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : publicFiles.has(selectedFileData.path) ? (
                    <Globe className="w-4 h-4 mr-1" />
                  ) : (
                    <Lock className="w-4 h-4 mr-1" />
                  )}
                  {publicFiles.has(selectedFileData.path) ? 'Public' : 'Private'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
              <File className="w-12 h-12 mb-4 opacity-40" />
              <p className="text-[13px]">Select a file to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              data-testid="input-folder-name"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) {
                  createFolderMutation.mutate(newFolderName.trim());
                }
              }}
            />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createFolderMutation.mutate(newFolderName.trim())}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              data-testid="button-create-folder"
            >
              {createFolderMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Creating...</>
              ) : (
                <><FolderPlus className="w-4 h-4 mr-1" /> Create</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={(open) => { setShowRenameDialog(open); if (!open) { setRenameTarget(null); setRenameTo(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>
              Enter a new name for <strong>{renameTarget?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-input" className="mb-2 block text-sm">New name</Label>
            <Input
              id="rename-input"
              value={renameTo}
              onChange={(e) => setRenameTo(e.target.value)}
              placeholder="New name"
              data-testid="input-rename"
              onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); }}
              autoFocus
            />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitRename}
              disabled={!renameTo.trim() || renameTo.trim() === renameTarget?.name || moveMutation.isPending}
              data-testid="button-confirm-rename"
            >
              {moveMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Renaming...</>
              ) : (
                <><Pencil className="w-4 h-4 mr-1" /> Rename</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy / Duplicate Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={(open) => { setShowCopyDialog(open); if (!open) { setCopySource(null); setCopyDest(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate File</DialogTitle>
            <DialogDescription>
              Choose a destination path for the copy of <strong>{copySource?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="copy-dest-input" className="mb-2 block text-sm">Destination path</Label>
            <Input
              id="copy-dest-input"
              value={copyDest}
              onChange={(e) => setCopyDest(e.target.value)}
              placeholder="path/to/copy.ext"
              data-testid="input-copy-dest"
              onKeyDown={(e) => { if (e.key === 'Enter') submitCopy(); }}
              autoFocus
            />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitCopy}
              disabled={!copyDest.trim() || copyDest.trim() === copySource?.path || copyMutation.isPending}
              data-testid="button-confirm-copy"
            >
              {copyMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Copying...</>
              ) : (
                <><Copy className="w-4 h-4 mr-1" /> Duplicate</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AppStoragePanel;
