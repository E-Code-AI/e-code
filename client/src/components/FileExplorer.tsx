import { useState } from "react";
import { File } from "@shared/schema";
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Plus, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface FileExplorerProps {
  files: File[];
  isLoading: boolean;
  onFileOpen: (file: File) => void;
  onContextMenu: (e: React.MouseEvent, type: 'file' | 'folder' | 'workspace', id?: number) => void;
}

const FileExplorer = ({ files, isLoading, onFileOpen, onContextMenu }: FileExplorerProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({});
  
  // Toggle folder expanded state
  const toggleFolder = (id: number) => {
    setExpandedFolders(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // Get file icon based on file type or extension
  const getFileIcon = (file: File) => {
    if (file.isFolder) {
      return expandedFolders[file.id] ? <FolderOpen className="h-4 w-4 shrink-0" /> : <Folder className="h-4 w-4 shrink-0" />;
    }
    
    return <FileText className="h-4 w-4 shrink-0" />;
  };
  
  // Recursive function to render file tree
  const renderFile = (file: File, depth = 0) => {
    const childFiles = files.filter(f => f.parentId === file.id);
    const isExpanded = expandedFolders[file.id];
    const hasChildren = childFiles.length > 0;
    
    return (
      <div key={file.id}>
        <div
          className={cn(
            "flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
            "group"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => file.isFolder ? toggleFolder(file.id) : onFileOpen(file)}
          onContextMenu={(e) => onContextMenu(e, file.isFolder ? 'folder' : 'file', file.id)}
        >
          <div className="flex items-center flex-1 min-w-0">
            {file.isFolder && hasChildren && (
              <button className="mr-1 h-4 w-4 flex items-center justify-center">
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            )}
            {file.isFolder && !hasChildren && <div className="mr-1 w-4" />}
            <span className="mr-2">{getFileIcon(file)}</span>
            <span className="truncate">{file.name}</span>
          </div>
          <button
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background hover:text-foreground rounded-sm"
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(e, file.isFolder ? 'folder' : 'file', file.id);
            }}
          >
            <MoreVertical className="h-3 w-3" />
          </button>
        </div>
        
        {file.isFolder && isExpanded && (
          <div>
            {childFiles
              .sort((a, b) => {
                // Folders first, then files
                if (a.isFolder && !b.isFolder) return -1;
                if (!a.isFolder && b.isFolder) return 1;
                
                // Alphabetical by name
                return a.name.localeCompare(b.name);
              })
              .map(childFile => renderFile(childFile, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  
  // Get root level files (no parent)
  const rootFiles = files.filter(f => f.parentId === null);
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="text-sm font-semibold">Files</h3>
        <button
          className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm"
          onClick={(e) => onContextMenu(e, 'workspace')}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      
      {/* File Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex justify-center items-center h-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rootFiles.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center p-4">
              No files yet. Add a file to get started.
            </div>
          ) : (
            rootFiles
              .sort((a, b) => {
                // Folders first, then files
                if (a.isFolder && !b.isFolder) return -1;
                if (!a.isFolder && b.isFolder) return 1;
                
                // Alphabetical by name
                return a.name.localeCompare(b.name);
              })
              .map(file => renderFile(file))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FileExplorer;