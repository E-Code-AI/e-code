import { useState, useEffect, useRef } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { File } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface PreviewProps {
  openFiles: File[];
  projectId?: number;
}

const Preview = ({ openFiles, projectId }: PreviewProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Function to get HTML file content
  const getHtmlFile = () => {
    return openFiles.find(file => file.name.endsWith('.html'));
  };
  
  // Function to refresh the preview
  const refreshPreview = () => {
    const htmlFile = getHtmlFile();
    
    if (htmlFile) {
      setIsLoading(true);
      
      // Create a data URL from the HTML content
      const htmlContent = htmlFile.content || '';
      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
      
      setPreviewUrl(dataUrl);
      
      // Reset loading state after a short delay
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  };
  
  // Initialize and update preview when HTML file changes
  useEffect(() => {
    refreshPreview();
  }, [openFiles]);
  
  // Handle iframe load event
  const handleIframeLoad = () => {
    setIsLoading(false);
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-2 flex items-center justify-between">
        <h2 className="text-sm font-medium">Preview</h2>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={refreshPreview}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        {previewUrl ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              onLoad={handleIframeLoad}
            ></iframe>
          </>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 text-sm text-muted-foreground">
              <p>No HTML file found to preview.</p>
              <p className="mt-2">Create an HTML file to see it rendered here.</p>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default Preview;