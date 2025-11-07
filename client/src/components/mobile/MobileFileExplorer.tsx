import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  X, Search, Folder, File, ChevronRight, ChevronDown, Plus,
  FileText, FileCode, Image, Film, Music, Archive, Database,
  Edit2, Trash2, Copy, FolderPlus, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { usePullToRefresh } from '@/hooks/use-mobile-gestures';
import { VirtualFileTree } from './VirtualFileTree';
import { useFileBrowserPersistence } from '@/hooks/use-mobile-persistence';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FileItem {
  id: number;
  name: string;
  type: 'file' | 'folder';
  path: string;
  parentId: number | null;
  content?: string;
  size?: number;
  lastModified?: Date;
  children?: FileItem[];
  extension?: string;
  isHidden?: boolean;
}

interface MobileFileExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | number; // Support both UUID strings and numeric IDs
  onFileSelect?: (file: FileItem) => void;
  currentFileId?: number;
}

// Get appropriate icon for file type
function getFileIcon(extension?: string) {
  if (!extension) return FileText;
  
  const iconMap: Record<string, React.ElementType> = {
    'js': FileCode,
    'jsx': FileCode,
    'ts': FileCode,
    'tsx': FileCode,
    'css': FileCode,
    'html': FileCode,
    'json': FileCode,
    'md': FileText,
    'txt': FileText,
    'png': Image,
    'jpg': Image,
    'jpeg': Image,
    'gif': Image,
    'svg': Image,
    'mp4': Film,
    'avi': Film,
    'mov': Film,
    'mp3': Music,
    'wav': Music,
    'zip': Archive,
    'rar': Archive,
    'tar': Archive,
    'db': Database,
    'sql': Database,
  };
  
  return iconMap[extension.toLowerCase()] || FileText;
}

// Format file size
function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Format last modified date
function formatDate(date?: Date): string {
  if (!date) return '';
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;
  return new Date(date).toLocaleDateString();
}

// File tree item component
function FileTreeItem({ 
  item, 
  level = 0, 
  onSelect,
  currentFileId,
  onLongPress 
}: { 
  item: FileItem;
  level?: number;
  onSelect: (item: FileItem) => void;
  currentFileId?: number;
  onLongPress?: (item: FileItem) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  const isActive = currentFileId === item.id;
  const extension = item.name.includes('.') ? item.name.split('.').pop() : undefined;
  const Icon = item.type === 'folder' ? Folder : getFileIcon(extension);
  
  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      onLongPress?.(item);
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500);
    setLongPressTimer(timer);
  };
  
  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };
  
  const handleClick = () => {
    if (item.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onSelect(item);
    }
  };
  
  return (
    <>
      <motion.div
        className={cn(
          'flex items-center px-3 py-3 mobile-touch-target cursor-pointer',
          'hover:bg-accent/50 active:bg-accent',
          isActive && 'bg-[#F26207]/10 border-l-2 border-[#F26207]'
        )}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        whileTap={{ scale: 0.98 }}
      >
        {item.type === 'folder' && (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="mr-1"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        )}
        
        <Icon className={cn(
          'h-4 w-4 mr-2',
          item.type === 'folder' 
            ? 'text-amber-500' 
            : 'text-muted-foreground'
        )} />
        
        <span className={cn(
          'flex-1 text-sm truncate',
          isActive && 'font-medium text-[#F26207]'
        )}>
          {item.name}
        </span>
        
        {item.type === 'file' && item.size && (
          <span className="text-xs text-muted-foreground">
            {formatFileSize(item.size)}
          </span>
        )}
      </motion.div>
      
      <AnimatePresence>
        {item.type === 'folder' && isExpanded && item.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            {item.children.map((child) => (
              <FileTreeItem
                key={child.id}
                item={child}
                level={level + 1}
                onSelect={onSelect}
                currentFileId={currentFileId}
                onLongPress={onLongPress}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function MobileFileExplorer({
  isOpen,
  onClose,
  projectId,
  onFileSelect,
  currentFileId
}: MobileFileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [renameDialog, setRenameDialog] = useState<{ file: FileItem; newName: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FileItem | null>(null);
  const [newItemDialog, setNewItemDialog] = useState<{ type: 'file' | 'folder'; name: string } | null>(null);
  
  // Persistent expanded folders
  const { expandedFolders, setExpandedFolders } = useFileBrowserPersistence(projectId);
  
  const { toast } = useToast();
  
  // Fetch files from backend
  const { data: files = [], isLoading, refetch } = useQuery<FileItem[]>({
    queryKey: [`/api/files/${projectId}`],
    enabled: !!projectId && isOpen,
  });
  
  // Pull-to-refresh functionality
  const { isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([10, 10, 10]);
      }
    },
    threshold: 80,
    enabled: isOpen && !isLoading,
  });
  
  // Note: Swipe-to-close is handled by the existing handleDragEnd (horizontal swipe)
  
  // Create file/folder mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; isFolder: boolean; parentId: number | null }) =>
      apiRequest('POST', `/api/files`, { ...data, projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/files/${projectId}`] });
      toast({ title: 'Success', description: `${newItemDialog?.type === 'folder' ? 'Folder' : 'File'} created` });
      setNewItemDialog(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create item', variant: 'destructive' });
    },
  });
  
  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) =>
      apiRequest('PATCH', `/api/files/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/files/${projectId}`] });
      toast({ title: 'Success', description: 'File renamed' });
      setRenameDialog(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to rename', variant: 'destructive' });
    },
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      apiRequest('DELETE', `/api/files/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/files/${projectId}`] });
      toast({ title: 'Success', description: 'File deleted' });
      setDeleteConfirm(null);
      setShowContextMenu(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    },
  });
  
  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (file: FileItem) =>
      apiRequest('POST', `/api/files`, {
        projectId,
        name: `${file.name} (copy)`,
        isFolder: file.type === 'folder',
        parentId: file.parentId,
        content: file.content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/files/${projectId}`] });
      toast({ title: 'Success', description: 'File duplicated' });
      setShowContextMenu(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to duplicate', variant: 'destructive' });
    },
  });
  
  // Handle swipe to close
  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.x < -100) {
      onClose();
    }
  };
  
  const handleLongPress = (item: FileItem) => {
    setSelectedItem(item);
    setShowContextMenu(true);
  };
  
  const handleFileSelect = (file: FileItem) => {
    if (file.type === 'file') {
      onFileSelect?.(file);
      onClose();
    }
  };
  
  const handleToggleFolder = (folderId: number) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };
  
  // Filter files based on search
  const filterFiles = (items: FileItem[], query: string): FileItem[] => {
    if (!query) return items;
    
    return items.reduce((acc: FileItem[], item) => {
      if (item.name.toLowerCase().includes(query.toLowerCase())) {
        acc.push(item);
      } else if (item.children) {
        const filteredChildren = filterFiles(item.children, query);
        if (filteredChildren.length > 0) {
          acc.push({ ...item, children: filteredChildren });
        }
      }
      return acc;
    }, []);
  };
  
  const filteredFiles = filterFiles(files, searchQuery);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40 md:hidden"
            onClick={onClose}
          />
          
          {/* File Explorer Panel */}
          <motion.div
            className="fixed top-0 left-0 bottom-0 w-[85%] max-w-sm bg-background z-50 md:hidden shadow-2xl flex flex-col"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 500 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
              <h2 className="text-lg font-semibold">Files</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 touch-manipulation"
                data-testid="mobile-file-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Search Bar */}
            <div className="px-4 py-2 border-b bg-background/95">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm touch-manipulation"
                  data-testid="mobile-file-search"
                />
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2 px-4 py-2 border-b">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 touch-manipulation"
                onClick={() => setNewItemDialog({ type: 'file', name: '' })}
                data-testid="mobile-file-new-file-btn"
              >
                <Plus className="h-3 w-3 mr-1" />
                New File
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 touch-manipulation"
                onClick={() => setNewItemDialog({ type: 'folder', name: '' })}
                data-testid="mobile-file-new-folder-btn"
              >
                <FolderPlus className="h-3 w-3 mr-1" />
                New Folder
              </Button>
            </div>
            
            {/* File Tree */}
            <div className="flex-1 relative overflow-hidden">
              {/* Pull-to-Refresh Indicator */}
              <AnimatePresence>
                {pullDistance > 0 && (
                  <motion.div
                    className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ 
                      height: Math.min(pullDistance, 80), 
                      opacity: pullDistance > 20 ? 1 : pullDistance / 20 
                    }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ paddingTop: `${Math.min(pullDistance * 0.3, 24)}px` }}
                    data-testid="mobile-file-pull-refresh"
                  >
                    <RefreshCw 
                      className={cn(
                        'h-5 w-5 text-[#F26207]',
                        isRefreshing && 'animate-spin'
                      )} 
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm" data-testid="mobile-file-loading">
                  Loading files...
                </div>
              ) : filteredFiles.length > 0 ? (
                <div 
                  className="h-full" 
                  style={{ transform: `translateY(${Math.min(pullDistance, 60)}px)` }}
                >
                  <VirtualFileTree
                    files={filteredFiles}
                    onFileSelect={handleFileSelect}
                    onLongPress={handleLongPress}
                    expandedFolders={expandedFolders}
                    onToggleFolder={handleToggleFolder}
                    currentFileId={currentFileId}
                    className="h-full"
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm" data-testid="mobile-file-empty">
                  {searchQuery ? 'No files found' : 'No files yet'}
                </div>
              )}
            </div>
            
            {/* Context Menu */}
            <AnimatePresence>
              {showContextMenu && selectedItem && (
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  className="absolute bottom-0 left-0 right-0 bg-card border-t p-4 rounded-t-2xl shadow-2xl mobile-safe-bottom"
                >
                  <div className="mb-2">
                    <p className="text-sm font-medium">{selectedItem.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedItem.type === 'folder' ? 'Folder' : `File · ${selectedItem.size}`}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start touch-manipulation" 
                      size="sm"
                      onClick={() => {
                        setRenameDialog({ file: selectedItem, newName: selectedItem.name });
                        setShowContextMenu(false);
                      }}
                      data-testid="mobile-file-rename"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Rename
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start touch-manipulation" 
                      size="sm"
                      onClick={() => duplicateMutation.mutate(selectedItem)}
                      disabled={duplicateMutation.isPending}
                      data-testid="mobile-file-duplicate"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full justify-start touch-manipulation" 
                      size="sm"
                      onClick={() => {
                        setDeleteConfirm(selectedItem);
                        setShowContextMenu(false);
                      }}
                      data-testid="mobile-file-delete"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full touch-manipulation"
                      size="sm"
                      onClick={() => setShowContextMenu(false)}
                      data-testid="mobile-file-cancel"
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Rename Dialog */}
            <Dialog open={!!renameDialog} onOpenChange={(open) => !open && setRenameDialog(null)}>
              <DialogContent className="max-w-[90%]">
                <DialogHeader>
                  <DialogTitle>Rename {renameDialog?.file.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
                  <DialogDescription>Enter a new name for {renameDialog?.file.name}</DialogDescription>
                </DialogHeader>
                <Input
                  value={renameDialog?.newName || ''}
                  onChange={(e) => setRenameDialog(prev => prev ? { ...prev, newName: e.target.value } : null)}
                  placeholder="New name"
                  className="touch-manipulation"
                  data-testid="mobile-file-rename-input"
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRenameDialog(null)} data-testid="mobile-file-rename-cancel">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (renameDialog) {
                        renameMutation.mutate({ id: renameDialog.file.id, name: renameDialog.newName });
                      }
                    }}
                    disabled={!renameDialog?.newName || renameMutation.isPending}
                    data-testid="mobile-file-rename-confirm"
                  >
                    Rename
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* Delete Confirmation */}
            <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
              <DialogContent className="max-w-[90%]">
                <DialogHeader>
                  <DialogTitle>Delete {deleteConfirm?.type === 'folder' ? 'Folder' : 'File'}?</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteConfirm(null)} data-testid="mobile-file-delete-cancel">
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (deleteConfirm) {
                        deleteMutation.mutate(deleteConfirm.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    data-testid="mobile-file-delete-confirm"
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            {/* New File/Folder Dialog */}
            <Dialog open={!!newItemDialog} onOpenChange={(open) => !open && setNewItemDialog(null)}>
              <DialogContent className="max-w-[90%]">
                <DialogHeader>
                  <DialogTitle>New {newItemDialog?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle>
                  <DialogDescription>Enter a name for the new {newItemDialog?.type}</DialogDescription>
                </DialogHeader>
                <Input
                  value={newItemDialog?.name || ''}
                  onChange={(e) => setNewItemDialog(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder={newItemDialog?.type === 'folder' ? 'Folder name' : 'File name'}
                  className="touch-manipulation"
                  data-testid="mobile-file-new-input"
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewItemDialog(null)} data-testid="mobile-file-new-cancel">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (newItemDialog) {
                        createMutation.mutate({
                          name: newItemDialog.name,
                          isFolder: newItemDialog.type === 'folder',
                          parentId: null,
                        });
                      }
                    }}
                    disabled={!newItemDialog?.name || createMutation.isPending}
                    data-testid="mobile-file-new-confirm"
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}