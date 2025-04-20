import { useState, useEffect, useRef } from "react";
import { 
  File, 
  FolderPlus, 
  FilePlus, 
  Trash2,
  Edit,
  Copy, 
  DownloadCloud 
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ContextMenuProps {
  x: number;
  y: number;
  type: 'file' | 'folder' | 'workspace';
  onCreateFile: (name: string) => void;
  onCreateFolder: (name: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const ContextMenu = ({ 
  x, 
  y, 
  type, 
  onCreateFile, 
  onCreateFolder, 
  onDelete, 
  onClose 
}: ContextMenuProps) => {
  const [isCreateFileDialogOpen, setIsCreateFileDialogOpen] = useState(false);
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Position the context menu and handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);
  
  // Handle create file
  const handleCreateFile = () => {
    if (newFileName.trim()) {
      onCreateFile(newFileName.trim());
      setNewFileName("");
      setIsCreateFileDialogOpen(false);
    }
  };
  
  // Handle create folder
  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setIsCreateFolderDialogOpen(false);
    }
  };
  
  // Handle delete confirmation
  const handleDelete = () => {
    onDelete();
    setIsDeleteDialogOpen(false);
  };
  
  // Position adjustment to keep menu within viewport
  const getMenuStyle = () => {
    const style: React.CSSProperties = { 
      position: "fixed", 
      left: `${x}px`, 
      top: `${y}px`, 
      zIndex: 50 
    };
    
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (x + rect.width > viewportWidth) {
        style.left = `${viewportWidth - rect.width - 10}px`;
      }
      
      if (y + rect.height > viewportHeight) {
        style.top = `${viewportHeight - rect.height - 10}px`;
      }
    }
    
    return style;
  };
  
  return (
    <>
      <div 
        ref={menuRef}
        className="bg-popover border rounded-md shadow-md py-1 min-w-[180px]"
        style={getMenuStyle()}
      >
        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
          {type === 'file' ? 'File' : type === 'folder' ? 'Folder' : 'Workspace'}
        </div>
        
        <div className="h-px bg-border my-1" />
        
        {/* New file option */}
        <button
          className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          onClick={() => setIsCreateFileDialogOpen(true)}
        >
          <FilePlus className="h-4 w-4 mr-2" />
          New file
        </button>
        
        {/* New folder option */}
        <button
          className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
          onClick={() => setIsCreateFolderDialogOpen(true)}
        >
          <FolderPlus className="h-4 w-4 mr-2" />
          New folder
        </button>
        
        {type !== 'workspace' && (
          <>
            <div className="h-px bg-border my-1" />
            
            {/* Copy option */}
            <button
              className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </button>
            
            {/* Rename option */}
            <button
              className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </button>
            
            {/* Download option */}
            <button
              className="flex items-center w-full px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <DownloadCloud className="h-4 w-4 mr-2" />
              Download
            </button>
            
            <div className="h-px bg-border my-1" />
            
            {/* Delete option */}
            <button
              className="flex items-center w-full px-3 py-1.5 text-sm text-red-500 hover:bg-red-500 hover:text-white"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </>
        )}
      </div>
      
      {/* Create file dialog */}
      <Dialog open={isCreateFileDialogOpen} onOpenChange={setIsCreateFileDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create new file</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="filename">File name</Label>
            <Input
              id="filename"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="mt-2"
              placeholder="e.g. index.js"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFile();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFileDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create folder dialog */}
      <Dialog open={isCreateFolderDialogOpen} onOpenChange={setIsCreateFolderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create new folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="foldername">Folder name</Label>
            <Input
              id="foldername"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="mt-2"
              placeholder="e.g. src"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolder();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Delete {type === 'file' ? 'file' : 'folder'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this {type === 'file' ? 'file' : 'folder'}? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};