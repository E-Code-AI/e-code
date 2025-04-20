import { useState } from "react";
import { Folder, File as FileIcon, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { File } from "@shared/schema";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FileExplorerProps {
  files: File[];
  isLoading: boolean;
  onFileOpen: (file: File) => void;
  onContextMenu: (e: React.MouseEvent, type: 'file' | 'folder' | 'workspace', id?: number) => void;
}

const FileExplorer = ({ files, isLoading, onFileOpen, onContextMenu }: FileExplorerProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({});
  
  const toggleFolder = (folderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };
  
  const getFileIcon = (file: File) => {
    if (file.isFolder) {
      return expandedFolders[file.id] ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />;
    } else {
      const ext = file.name.split('.').pop()?.toLowerCase();
      
      // Return appropriate icon based on file extension
      switch (ext) {
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
          return <FileIcon className="h-4 w-4 mr-1 text-yellow-400" />;
        case 'css':
        case 'scss':
        case 'sass':
          return <FileIcon className="h-4 w-4 mr-1 text-blue-400" />;
        case 'html':
          return <FileIcon className="h-4 w-4 mr-1 text-orange-400" />;
        case 'json':
          return <FileIcon className="h-4 w-4 mr-1 text-green-400" />;
        case 'md':
          return <FileIcon className="h-4 w-4 mr-1 text-gray-400" />;
        default:
          return <FileIcon className="h-4 w-4 mr-1" />;
      }
    }
  };
  
  const renderFile = (file: File, depth = 0) => {
    const isExpanded = expandedFolders[file.id] || false;
    
    return (
      <div key={file.id}>
        <div
          className={cn(
            "flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-accent rounded-md",
            file.isFolder ? "font-medium" : "font-normal"
          )}
          style={{ paddingLeft: `${(depth * 12) + 8}px` }}
          onClick={(e) => {
            if (file.isFolder) {
              toggleFolder(file.id, e);
            } else {
              onFileOpen(file);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e, file.isFolder ? 'folder' : 'file', file.id);
          }}
        >
          <div className="flex items-center">
            {file.isFolder ? (
              <Folder className={cn("h-4 w-4 mr-1", isExpanded ? "text-blue-400" : "text-gray-400")} />
            ) : (
              getFileIcon(file)
            )}
            <span className="truncate">{file.name}</span>
          </div>
        </div>
        
        {file.isFolder && isExpanded && (
          <div>
            {files
              .filter(f => f.parentId === file.id)
              .sort((a, b) => {
                // Sort folders first, then by name
                if (a.isFolder && !b.isFolder) return -1;
                if (!a.isFolder && b.isFolder) return 1;
                return a.name.localeCompare(b.name);
              })
              .map(childFile => renderFile(childFile, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Get root level files (no parent)
  const rootFiles = files
    .filter(file => !file.parentId)
    .sort((a, b) => {
      // Sort folders first, then by name
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
  
  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-2 flex items-center justify-between">
        <h2 className="text-sm font-medium">Files</h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div 
          className="p-2"
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e, 'workspace');
          }}
        >
          {rootFiles.length > 0 ? (
            rootFiles.map(file => renderFile(file))
          ) : (
            <div className="text-sm text-muted-foreground p-2">
              No files yet. Right-click to create one.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FileExplorer;