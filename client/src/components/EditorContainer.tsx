import { useState, useEffect, useRef } from "react";
import CodeEditor from "./CodeEditor";
import Preview from "./Preview";
import { File } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getFileIcon } from "@/lib/utils/file-icons";

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
  const [showPreview, setShowPreview] = useState(true);
  const [editorWidth, setEditorWidth] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const activeFile = openFiles.find(f => f.id === activeFileId);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFileId) {
          onFileSave(activeFileId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeFileId, onFileSave]);

  // Set up resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      const container = containerRef.current;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const deltaX = e.clientX - startXRef.current;
      const newWidth = Math.min(
        Math.max(20, (startWidthRef.current + deltaX) / containerRect.width * 100),
        80
      );
      
      setEditorWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    if (isDraggingRef.current) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = (containerRef.current?.getBoundingClientRect().width || 0) * (editorWidth / 100);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="bg-dark-800 border-b border-dark-600 flex items-center">
        {openFiles.length === 0 ? (
          <div className="px-4 py-2 text-sm text-gray-400">
            No open files
          </div>
        ) : (
          openFiles.map(file => (
            <div 
              key={file.id}
              className={cn(
                "px-4 py-2 text-sm flex items-center space-x-2",
                activeFileId === file.id 
                  ? "tab-active bg-dark text-white" 
                  : "text-gray-400 hover:text-white"
              )}
              onClick={() => onFileSelect(file.id)}
            >
              <i className={getFileIcon(file)}></i>
              <span>{file.name}</span>
              <button 
                className="ml-2 text-gray-500 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileClose(file.id);
                }}
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
          ))
        )}
      </div>
      
      {/* Editor area with split view */}
      <div 
        className="flex-1 flex flex-col md:flex-row overflow-hidden" 
        ref={containerRef}
      >
        {/* Code editor */}
        <div 
          className="flex-1 overflow-hidden flex flex-col" 
          style={{ width: showPreview ? `${editorWidth}%` : '100%' }}
        >
          {activeFile ? (
            <CodeEditor 
              file={activeFile}
              onChange={(content) => onFileChange(activeFile.id, content)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-dark text-gray-400">
              {openFiles.length === 0 ? "Open a file to start editing" : "Select a file to edit"}
            </div>
          )}
        </div>
        
        {/* Resize handle */}
        {showPreview && (
          <div 
            className="w-1 bg-dark-600 cursor-col-resize hover:bg-primary"
            onMouseDown={startResize}
          />
        )}
        
        {/* Preview panel */}
        {showPreview && (
          <div 
            className="h-2/5 md:h-auto flex flex-col border-t md:border-t-0 md:border-l border-dark-600"
            style={{ width: `${100 - editorWidth}%` }}
          >
            <div className="bg-dark-800 px-4 py-2 border-b border-dark-600 flex items-center justify-between">
              <div className="text-sm font-medium">Output</div>
              <div className="flex items-center space-x-2">
                <button 
                  className="text-sm text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-dark-700"
                  onClick={() => setShowPreview(false)}
                >
                  <i className="ri-close-line"></i>
                </button>
                <button className="text-sm text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-dark-700">
                  <i className="ri-refresh-line"></i>
                </button>
                <button className="text-sm text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-dark-700">
                  <i className="ri-external-link-line"></i>
                </button>
              </div>
            </div>
            
            <Preview openFiles={openFiles} />
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorContainer;
