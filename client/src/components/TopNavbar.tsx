import { useState } from "react";
import { Project, File } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface TopNavbarProps {
  project: Project | undefined;
  activeFile: File | undefined;
  isLoading: boolean;
}

const TopNavbar = ({ project, activeFile, isLoading }: TopNavbarProps) => {
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = () => {
    setIsRunning(true);
    // Simulate a run action (in a real app this would trigger a build/run)
    setTimeout(() => setIsRunning(false), 1000);
  };

  return (
    <div className="h-12 bg-dark border-b border-dark-600 flex items-center px-4 justify-between">
      <div className="flex items-center">
        {isLoading ? (
          <Skeleton className="h-6 w-40 bg-dark-700" />
        ) : (
          <div className="mr-4 flex items-center">
            <span className="font-semibold text-sm">{project?.name || 'Project'}</span>
            {activeFile && (
              <>
                <span className="mx-2 text-dark-600">/</span>
                <span className="text-sm text-gray-400">{activeFile.name}</span>
              </>
            )}
          </div>
        )}
        
        <div className="flex items-center space-x-3 text-sm">
          <button className="flex items-center text-gray-400 hover:text-white">
            <i className="ri-git-branch-line mr-1"></i>
            <span>main</span>
          </button>
          
          <Button 
            size="sm" 
            variant="outline" 
            className="px-2 py-1 rounded hover:bg-dark-700 text-white border-dark-600"
            onClick={handleRun}
            disabled={isRunning}
          >
            <i className={`${isRunning ? 'ri-loader-2-line animate-spin' : 'ri-play-circle-line text-success'} mr-1`}></i>
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </Button>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <button className="text-gray-400 hover:text-white">
          <i className="ri-share-line"></i>
        </button>
        
        <Button size="sm" className="px-3 py-1">
          Invite
        </Button>
      </div>
    </div>
  );
};

export default TopNavbar;
