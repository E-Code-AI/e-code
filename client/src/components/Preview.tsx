import { useEffect, useRef, useState } from "react";
import { File } from "@/lib/types";

interface PreviewProps {
  openFiles: File[];
}

const Preview = ({ openFiles }: PreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Function to generate HTML content
  const generatePreviewContent = () => {
    // Find HTML file
    const htmlFile = openFiles.find(file => file.name.endsWith('.html'));
    
    if (!htmlFile) {
      return `
        <html>
          <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: white; color: #333; text-align: center;">
            <div>
              <h2>No HTML file found</h2>
              <p>Create an HTML file to see a preview.</p>
            </div>
          </body>
        </html>
      `;
    }
    
    // Find CSS and JS files
    const cssFiles = openFiles.filter(file => file.name.endsWith('.css'));
    const jsFiles = openFiles.filter(file => file.name.endsWith('.js'));
    
    // Parse HTML content
    let htmlContent = htmlFile.content;
    
    // If HTML doesn't have a proper structure, add it
    if (!htmlContent.includes('<!DOCTYPE html>')) {
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Preview</title>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `;
    }
    
    // Insert CSS files into the head
    let headEndPosition = htmlContent.indexOf('</head>');
    if (headEndPosition !== -1) {
      const cssStyleTags = cssFiles.map(css => 
        `<style>${css.content}</style>`
      ).join('');
      
      htmlContent = htmlContent.slice(0, headEndPosition) + cssStyleTags + htmlContent.slice(headEndPosition);
    }
    
    // Insert JS files at the end of body
    let bodyEndPosition = htmlContent.indexOf('</body>');
    if (bodyEndPosition !== -1) {
      const jsScriptTags = jsFiles.map(js => 
        `<script>${js.content}</script>`
      ).join('');
      
      htmlContent = htmlContent.slice(0, bodyEndPosition) + jsScriptTags + htmlContent.slice(bodyEndPosition);
    }
    
    return htmlContent;
  };
  
  // Update iframe content when files change
  useEffect(() => {
    if (iframeRef.current) {
      setIsLoading(true);
      
      const content = generatePreviewContent();
      const iframe = iframeRef.current;
      
      // Write content to iframe
      iframe.srcdoc = content;
      
      // Show iframe when loaded
      iframe.onload = () => {
        setIsLoading(false);
      };
    }
  }, [openFiles]);
  
  return (
    <div className="flex-1 bg-white overflow-auto relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <div className="text-gray-500">
            <i className="ri-loader-2-line animate-spin text-2xl"></i>
          </div>
        </div>
      )}
      <iframe 
        ref={iframeRef}
        className="w-full h-full border-0"
        title="Preview"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </div>
  );
};

export default Preview;
