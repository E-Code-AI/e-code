import { ReplitFileExplorer } from '@/components/editor/ReplitFileExplorer';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  children?: FileNode[];
}

interface FileExplorerPanelProps {
  files: FileNode[];
  selectedFile: FileNode | null;
  onFileSelect: (file: FileNode) => void;
  onClose: () => void;
  projectId: string;
}

export function FileExplorerPanel({
  files,
  selectedFile,
  onFileSelect,
  onClose,
  projectId
}: FileExplorerPanelProps) {
  // Convert string ID to number for ReplitFileExplorer
  const projectIdNum = parseInt(projectId, 10);
  const selectedFileId = selectedFile ? parseInt(selectedFile.id, 10) : undefined;
  
  return (
    <div className="h-full flex flex-col border-l">
      {/* Header */}
      <div className="h-10 border-b flex items-center justify-between px-3">
        <h3 className="font-semibold text-sm">Files</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0"
          data-testid="button-close-explorer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* File Explorer */}
      <ReplitFileExplorer
        projectId={projectIdNum}
        onFileSelect={(file) => {
          // Convert back to our FileNode format
          const fileNode: FileNode = {
            id: file.id.toString(),
            name: file.name,
            type: file.type,
            path: file.path,
            content: file.content,
            children: []
          };
          onFileSelect(fileNode);
        }}
        selectedFileId={selectedFileId}
      />
    </div>
  );
}
