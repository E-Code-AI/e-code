import { useState, useEffect, useRef } from "react";
import { File } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ExternalLink, Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewProps {
  openFiles: File[];
  projectId?: number;
}

const Preview = ({ openFiles, projectId }: PreviewProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    // Simulate a delay for loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Function to refresh the iframe
  const refreshPreview = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = iframeRef.current.src;
      
      // Reset loading state after iframe loads
      iframeRef.current.onload = () => {
        setIsLoading(false);
      };
    }
  };
  
  // Generate preview HTML from files
  const generatePreviewHtml = () => {
    // Find index.html file
    const indexHtml = openFiles.find(file => file.name === "index.html");
    
    if (indexHtml) {
      return indexHtml.content;
    }
    
    // If no index.html, create a basic HTML with JavaScript and CSS files
    const htmlFiles = openFiles.filter(file => file.name.endsWith(".html"));
    const cssFiles = openFiles.filter(file => file.name.endsWith(".css"));
    const jsFiles = openFiles.filter(file => file.name.endsWith(".js"));
    
    if (htmlFiles.length > 0) {
      // Use the first HTML file as the main one
      return htmlFiles[0].content;
    }
    
    // Create a basic HTML structure
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview</title>
        ${cssFiles.map(file => `<style>${file.content}</style>`).join("")}
      </head>
      <body>
        <div id="app">
          <h1>PLOT Preview</h1>
          <p>Preview for project: ${projectId || "Unknown"}</p>
        </div>
        ${jsFiles.map(file => `<script>${file.content}</script>`).join("")}
      </body>
      </html>
    `;
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // Create a data URL from the HTML
  const previewUrl = `data:text/html;charset=utf-8,${encodeURIComponent(generatePreviewHtml())}`;
  
  return (
    <div className={cn(
      "flex flex-col h-full bg-background",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      <div className="flex items-center justify-between p-2 border-b">
        <span className="text-sm font-medium">Preview</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={refreshPreview}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => window.open(previewUrl, "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {isFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 relative">
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
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
};

export default Preview;