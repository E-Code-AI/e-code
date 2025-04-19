import { useState } from "react";
import { File } from "@/lib/types";

interface BottomPanelProps {
  activeFile: File | undefined;
}

const BottomPanel = ({ activeFile }: BottomPanelProps) => {
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  
  // Get file type
  const getFileType = () => {
    if (!activeFile) return '';
    
    const ext = activeFile.name.split('.').pop()?.toUpperCase() || '';
    return ext;
  };
  
  // Determine file language for display
  const getLanguageDisplay = () => {
    if (!activeFile) return '';
    
    const fileExtMap: Record<string, string> = {
      'js': 'JavaScript',
      'jsx': 'React JSX',
      'ts': 'TypeScript',
      'tsx': 'React TSX',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'json': 'JSON',
      'md': 'Markdown',
      'py': 'Python',
    };
    
    const ext = activeFile.name.split('.').pop()?.toLowerCase() || '';
    return fileExtMap[ext] || ext.toUpperCase() || '';
  };
  
  return (
    <div className="h-10 bg-dark-800 border-t border-dark-600 flex items-center px-4 justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <button className="text-gray-400 hover:text-white text-sm flex items-center">
            <i className="ri-terminal-box-line mr-1"></i>
            <span>Console</span>
          </button>
          
          <button className="text-gray-400 hover:text-white text-sm flex items-center">
            <i className="ri-error-warning-line mr-1"></i>
            <span>0 errors</span>
          </button>
        </div>
      </div>
      
      <div className="flex items-center text-sm text-gray-400">
        <span>{getLanguageDisplay()}</span>
        <span className="mx-2">|</span>
        <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
      </div>
    </div>
  );
};

export default BottomPanel;
