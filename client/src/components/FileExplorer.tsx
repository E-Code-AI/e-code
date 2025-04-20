import { useState } from "react";
import { File } from "@shared/schema";
import { File as FileIcon, Folder, ChevronRight, ChevronDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface FileExplorerProps {
  files: File[];
  isLoading: boolean;
  onFileOpen: (file: File) => void;
  onContextMenu: (e: React.MouseEvent, type: 'file' | 'folder' | 'workspace', id?: number) => void;
}

const FileExplorer = ({ files, isLoading, onFileOpen, onContextMenu }: FileExplorerProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<number, boolean>>({});

  const toggleFolder = (folderId: number) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Organize files into a tree structure
  const getRootFiles = () => {
    return files.filter(file => file.parentId === null);
  };

  const getChildFiles = (parentId: number) => {
    return files.filter(file => file.parentId === parentId);
  };

  const renderFile = (file: File) => {
    const isFolder = file.isFolder;
    const isExpanded = expandedFolders[file.id];
    const children = isFolder ? getChildFiles(file.id) : [];
    
    return (
      <div key={file.id} className="select-none">
        <div 
          className="flex items-center py-1 px-2 rounded-md hover:bg-accent cursor-pointer group"
          onClick={() => isFolder ? toggleFolder(file.id) : onFileOpen(file)}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e, isFolder ? 'folder' : 'file', file.id);
          }}
        >
          <div className="flex items-center flex-1 gap-1 overflow-hidden">
            {isFolder && (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(file.id);
                }}
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
            )}
            {isFolder ? (
              <Folder className="h-4 w-4 text-blue-500" />
            ) : (
              <FileIcon className="h-4 w-4 text-gray-500" />
            )}
            <span className="ml-1 text-sm truncate">{file.name}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(e, isFolder ? 'folder' : 'file', file.id);
            }}
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>
        {isFolder && isExpanded && children.length > 0 && (
          <div className="pl-4 mt-1">
            {children.map(child => renderFile(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="py-2 px-3 border-b">
        <h2 className="text-sm font-semibold">Files</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div
                className="py-1 px-2 rounded-md hover:bg-accent cursor-pointer mb-1"
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu(e, 'workspace');
                }}
              >
                <div className="flex items-center gap-1">
                  <Folder className="h-4 w-4 text-blue-500" />
                  <span className="ml-1 text-sm font-medium">Project</span>
                </div>
              </div>
              <div className="pl-2">
                {getRootFiles().map(file => renderFile(file))}
                {getRootFiles().length === 0 && (
                  <div className="text-sm text-muted-foreground py-2 px-2">
                    No files found
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FileExplorer;