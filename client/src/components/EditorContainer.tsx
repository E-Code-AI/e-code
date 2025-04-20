import React, { useState, useEffect } from "react";
import { File } from "@shared/schema";
import CodeEditor from "./CodeEditor";
import { X, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  onFileSave,
}: EditorContainerProps) => {
  const [isDragging, setIsDragging] = useState(false);
  
  // Handle keyboard shortcuts for saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save current file
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && activeFileId) {
        e.preventDefault();
        onFileSave(activeFileId);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFileId, onFileSave]);
  
  // Make tabs draggable (for future implementation)
  const handleDragStart = () => {
    setIsDragging(true);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  const activeFile = openFiles.find(file => file.id === activeFileId);
  
  const handleContentChange = (content: string) => {
    if (activeFileId) {
      onFileChange(activeFileId, content);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* File tabs */}
      <div className="flex border-b bg-muted/30">
        <ScrollArea orientation="horizontal" className="flex-1">
          <div className="flex">
            {openFiles.map(file => (
              <div
                key={file.id}
                className={cn(
                  "flex items-center px-3 py-1.5 text-sm border-r cursor-pointer group",
                  activeFileId === file.id ? "bg-background text-foreground" : "text-muted-foreground hover:bg-muted/50"
                )}
                onClick={() => onFileSelect(file.id)}
                draggable
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <span className="truncate max-w-[120px]">{file.name}</span>
                <CircleDot className={cn(
                  "ml-2 h-2 w-2 opacity-0",
                  activeFileId === file.id && "opacity-100 text-primary"
                )} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-1 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileClose(file.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      {/* Editor area */}
      <div className="flex-1 overflow-hidden">
        {activeFile ? (
          <CodeEditor
            file={activeFile}
            onChange={handleContentChange}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>No file selected</p>
              <p className="text-sm mt-2">Open a file from the explorer to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorContainer;