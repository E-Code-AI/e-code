import { useState } from "react";
import { getFileIcon } from "@/lib/utils/file-icons";
import { File } from "@/lib/types";
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

  // Get top-level files (no parent)
  const rootFiles = files.filter(file => !file.parentId);

  // Group files by parentId for nested structure
  const getChildFiles = (parentId: number) => {
    return files.filter(file => file.parentId === parentId);
  };

  // Render file or folder item with their children
  const renderFileTree = (fileList: File[], level = 0) => {
    return fileList.map(file => (
      <div key={file.id}>
        <div 
          className={`flex items-center px-4 py-1 hover:bg-dark-700 cursor-pointer ${level > 0 ? `pl-${4 + level * 4}` : ''}`}
          onClick={() => file.isFolder ? toggleFolder(file.id) : onFileOpen(file)}
          onContextMenu={(e) => onContextMenu(e, file.isFolder ? 'folder' : 'file', file.id)}
        >
          <i className={`${getFileIcon(file)} mr-2`}></i>
          <span>{file.name}</span>
        </div>
        
        {file.isFolder && expandedFolders[file.id] && (
          <div className={`pl-${level === 0 ? 8 : 8 + level * 4}`}>
            {renderFileTree(getChildFiles(file.id), level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="w-56 h-full bg-dark-800 border-r border-dark-600 flex flex-col">
      <div className="px-4 py-3 border-b border-dark-600 flex items-center justify-between">
        <div className="text-sm font-medium">Files</div>
        <div className="flex items-center">
          <button 
            className="text-white opacity-70 hover:opacity-100 w-6 h-6 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(e, 'workspace');
            }}
          >
            <i className="ri-add-line"></i>
          </button>
          <button className="text-white opacity-70 hover:opacity-100 w-6 h-6 flex items-center justify-center ml-1">
            <i className="ri-more-2-fill"></i>
          </button>
        </div>
      </div>
      
      <div className="overflow-y-auto flex-grow">
        {isLoading ? (
          <div className="py-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-4 py-1">
                <Skeleton className="h-6 bg-dark-700" />
              </div>
            ))}
          </div>
        ) : files.length > 0 ? (
          <div className="py-2 text-sm" onContextMenu={(e) => onContextMenu(e, 'workspace')}>
            {renderFileTree(rootFiles)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-sm text-gray-400">
            <i className="ri-folder-open-line text-3xl mb-2"></i>
            <p>No files yet</p>
            <button 
              className="mt-2 text-primary hover:underline"
              onClick={(e) => onContextMenu(e, 'workspace')}
            >
              Create a file
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
