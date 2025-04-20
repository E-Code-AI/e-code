import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { File } from "@shared/schema";
import CodeEditor from "./CodeEditor";

interface EditorContainerProps {
  openFiles: File[];
  activeFileId: number | null;
  onFileClose: (id: number) => void;
  onFileSelect: (id: number) => void;
  onFileChange: (id: number, content: string) => void;
  onFileSave: (id: number) => void;
}

const EditorContainer = ({
  openFiles,
  activeFileId,
  onFileClose,
  onFileSelect,
  onFileChange,
  onFileSave
}: EditorContainerProps) => {
  const [unsavedFiles, setUnsavedFiles] = useState<Record<number, boolean>>({});
  
  const handleContentChange = (fileId: number, content: string) => {
    onFileChange(fileId, content);
    
    // Mark file as unsaved
    setUnsavedFiles(prev => ({
      ...prev,
      [fileId]: true
    }));
  };
  
  const handleSave = (fileId: number) => {
    onFileSave(fileId);
    
    // Mark file as saved
    setUnsavedFiles(prev => ({
      ...prev,
      [fileId]: false
    }));
  };
  
  // Setup keyboard shortcut for saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFileId) {
          handleSave(activeFileId);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFileId]);
  
  if (openFiles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        No files open
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <ScrollArea orientation="horizontal" className="border-b">
        <div className="flex">
          {openFiles.map(file => (
            <div
              key={file.id}
              className={cn(
                "flex items-center gap-1 px-3 py-2 text-sm border-r cursor-pointer group",
                activeFileId === file.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              )}
              onClick={() => onFileSelect(file.id)}
            >
              <span className="truncate max-w-[120px]">
                {file.name}
              </span>
              {unsavedFiles[file.id] && (
                <span className="h-2 w-2 rounded-full bg-blue-500" />
              )}
              <div className="flex items-center ml-1">
                {unsavedFiles[file.id] && (
                  <button
                    className="p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-background focus:outline-none focus:bg-background"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSave(file.id);
                    }}
                    title="Save"
                  >
                    <Save className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  className="p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-background focus:outline-none focus:bg-background"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileClose(file.id);
                  }}
                  title="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {openFiles.map(file => (
          <div
            key={file.id}
            className={cn(
              "h-full",
              activeFileId === file.id ? "block" : "hidden"
            )}
          >
            <CodeEditor
              file={file}
              onChange={(content) => handleContentChange(file.id, content)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default EditorContainer;