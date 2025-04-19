import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useParams } from "wouter";
import Sidebar from "@/components/Sidebar";
import FileExplorer from "@/components/FileExplorer";
import TopNavbar from "@/components/TopNavbar";
import EditorContainer from "@/components/EditorContainer";
import BottomPanel from "@/components/BottomPanel";
import { Project, File } from "@/lib/types";
import { ContextMenu } from "@/components/ContextMenu";

export default function Editor() {
  const { id } = useParams();
  const { toast } = useToast();
  const [openFiles, setOpenFiles] = useState<File[]>([]);
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    type: 'file' | 'folder' | 'workspace';
    targetId?: number;
  }>({
    show: false,
    x: 0,
    y: 0,
    type: 'workspace'
  });

  // Get project data
  const { data: project, isLoading: isProjectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${id}`],
  });

  // Get project files
  const { data: files, isLoading: isFilesLoading } = useQuery<File[]>({
    queryKey: [`/api/projects/${id}/files`],
  });

  // Save file content mutation
  const saveFileMutation = useMutation({
    mutationFn: async ({ fileId, content }: { fileId: number, content: string }) => {
      const res = await apiRequest('PATCH', `/api/files/${fileId}`, { content });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/files`] });
      toast({
        title: "File saved",
        description: "Your changes have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save file",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create file mutation
  const createFileMutation = useMutation({
    mutationFn: async ({ name, content, parentId }: { name: string, content: string, parentId?: number }) => {
      const res = await apiRequest('POST', `/api/projects/${id}/files`, { 
        name, content, parentId, isFolder: false 
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/files`] });
      toast({
        title: "File created",
        description: `${data.name} has been created.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create file",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async ({ name, parentId }: { name: string, parentId?: number }) => {
      const res = await apiRequest('POST', `/api/projects/${id}/files`, { 
        name, content: '', parentId, isFolder: true 
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/files`] });
      toast({
        title: "Folder created",
        description: `${data.name} has been created.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create folder",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete file/folder mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const res = await apiRequest('DELETE', `/api/files/${fileId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/files`] });
      toast({
        title: "Deleted successfully",
        description: "The item has been deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle file open
  const handleFileOpen = (file: File) => {
    if (file.isFolder) return;
    
    // Check if file is already open
    if (!openFiles.find(f => f.id === file.id)) {
      setOpenFiles([...openFiles, file]);
    }
    
    setActiveFileId(file.id);
  };

  // Handle file close
  const handleFileClose = (fileId: number) => {
    const newOpenFiles = openFiles.filter(f => f.id !== fileId);
    setOpenFiles(newOpenFiles);
    
    // If we closed the active file, set another one as active or null
    if (fileId === activeFileId) {
      setActiveFileId(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1].id : null);
    }
  };

  // Handle file content change
  const handleFileChange = (fileId: number, content: string) => {
    // Update the content in the openFiles array
    const newOpenFiles = openFiles.map(f => 
      f.id === fileId ? { ...f, content } : f
    );
    setOpenFiles(newOpenFiles);
  };

  // Handle file save
  const handleFileSave = (fileId: number) => {
    const file = openFiles.find(f => f.id === fileId);
    if (file) {
      saveFileMutation.mutate({ fileId, content: file.content });
    }
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, type: 'file' | 'folder' | 'workspace', id?: number) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      type,
      targetId: id
    });
  };

  // Handle create file/folder from context menu
  const handleCreate = (type: 'file' | 'folder', name: string) => {
    const parentId = contextMenu.type === 'workspace' ? undefined : contextMenu.targetId;
    
    if (type === 'file') {
      createFileMutation.mutate({ 
        name, 
        content: '', 
        parentId 
      });
    } else {
      createFolderMutation.mutate({ 
        name, 
        parentId 
      });
    }
    
    setContextMenu({ ...contextMenu, show: false });
  };

  // Handle delete file/folder from context menu
  const handleDelete = () => {
    if (contextMenu.targetId) {
      deleteFileMutation.mutate(contextMenu.targetId);
      
      // If the file is open, close it
      if (openFiles.find(f => f.id === contextMenu.targetId)) {
        handleFileClose(contextMenu.targetId);
      }
      
      setContextMenu({ ...contextMenu, show: false });
    }
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.show) {
        setContextMenu({ ...contextMenu, show: false });
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  // Open a file automatically when files are loaded and none are open
  useEffect(() => {
    if (files && files.length > 0 && openFiles.length === 0) {
      // Find the first non-folder file
      const firstFile = files.find(file => !file.isFolder);
      if (firstFile) {
        handleFileOpen(firstFile);
      }
    }
  }, [files, openFiles]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-dark text-white">
      <Sidebar />
      <FileExplorer 
        files={files || []} 
        isLoading={isFilesLoading} 
        onFileOpen={handleFileOpen}
        onContextMenu={handleContextMenu}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavbar 
          project={project} 
          activeFile={openFiles.find(f => f.id === activeFileId)}
          isLoading={isProjectLoading}
        />
        
        <EditorContainer 
          openFiles={openFiles}
          activeFileId={activeFileId}
          onFileClose={handleFileClose}
          onFileSelect={setActiveFileId}
          onFileChange={handleFileChange}
          onFileSave={handleFileSave}
        />
        
        <BottomPanel activeFile={openFiles.find(f => f.id === activeFileId)} />
      </div>
      
      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          onCreateFile={(name) => handleCreate('file', name)}
          onCreateFolder={(name) => handleCreate('folder', name)}
          onDelete={handleDelete}
          onClose={() => setContextMenu({ ...contextMenu, show: false })}
        />
      )}
    </div>
  );
}
