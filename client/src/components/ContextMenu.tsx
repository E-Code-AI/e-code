import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [showInput, setShowInput] = useState<'file' | 'folder' | null>(null);
  const [inputValue, setInputValue] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Position the menu within viewport bounds
  const getPosition = () => {
    if (!menuRef.current) return { top: y, left: x };
    
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = x;
    let top = y;
    
    // Adjust horizontal position if menu would go beyond right edge
    if (x + menuRect.width > viewportWidth) {
      left = viewportWidth - menuRect.width - 5;
    }
    
    // Adjust vertical position if menu would go beyond bottom edge
    if (y + menuRect.height > viewportHeight) {
      top = viewportHeight - menuRect.height - 5;
    }
    
    return { top, left };
  };
  
  // Focus input when it appears
  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);
  
  // Handle input submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!inputValue.trim()) return;
    
    if (showInput === 'file') {
      onCreateFile(inputValue);
    } else if (showInput === 'folder') {
      onCreateFolder(inputValue);
    }
    
    setShowInput(null);
    setInputValue("");
  };
  
  // Render create input form
  const renderCreateInput = () => {
    return (
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <div className="px-3 py-2">
          <Input 
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`New ${showInput} name...`}
            className="bg-dark border-dark-600 text-sm h-8"
          />
          <div className="flex gap-2 mt-2">
            <Button 
              size="sm" 
              className="h-7 text-xs"
              type="submit"
            >
              Create
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs border-dark-600"
              onClick={(e) => {
                e.stopPropagation();
                setShowInput(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    );
  };
  
  const position = getPosition();
  
  return (
    <div 
      ref={menuRef}
      className="absolute bg-dark-800 shadow-lg rounded-md border border-dark-600 py-1 w-48 z-50"
      style={{ top: position.top, left: position.left }}
      onClick={(e) => e.stopPropagation()}
    >
      {showInput ? (
        renderCreateInput()
      ) : (
        <>
          <button 
            className="w-full text-left px-3 py-1 text-sm hover:bg-dark-700 flex items-center"
            onClick={() => setShowInput('file')}
          >
            <i className="ri-file-add-line mr-2"></i> New File
          </button>
          
          <button 
            className="w-full text-left px-3 py-1 text-sm hover:bg-dark-700 flex items-center"
            onClick={() => setShowInput('folder')}
          >
            <i className="ri-folder-add-line mr-2"></i> New Folder
          </button>
          
          {type !== 'workspace' && (
            <>
              <hr className="border-dark-600 my-1" />
              
              <button 
                className="w-full text-left px-3 py-1 text-sm hover:bg-dark-700 flex items-center"
              >
                <i className="ri-file-copy-line mr-2"></i> Copy
              </button>
              
              <button 
                className="w-full text-left px-3 py-1 text-sm hover:bg-dark-700 flex items-center"
              >
                <i className="ri-scissors-cut-line mr-2"></i> Cut
              </button>
              
              <button 
                className="w-full text-left px-3 py-1 text-sm hover:bg-dark-700 flex items-center text-error"
                onClick={onDelete}
              >
                <i className="ri-delete-bin-line mr-2"></i> Delete
              </button>
            </>
          )}
          
          <hr className="border-dark-600 my-1" />
          
          <button 
            className="w-full text-left px-3 py-1 text-sm hover:bg-dark-700 flex items-center"
            onClick={onClose}
          >
            <i className="ri-refresh-line mr-2"></i> Refresh
          </button>
        </>
      )}
    </div>
  );
};
