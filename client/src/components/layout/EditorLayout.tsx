import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

interface EditorLayoutProps {
  editor: ReactNode;
  fileExplorer: ReactNode;
  preview?: ReactNode;
  bottomPanel?: ReactNode;
}

export default function EditorLayout({
  editor,
  fileExplorer,
  preview,
  bottomPanel
}: EditorLayoutProps) {
  const [sidebarSize, setSidebarSize] = useState(20);
  const [editorSize, setEditorSize] = useState(50);
  const [previewSize, setPreviewSize] = useState(30);
  const [bottomPanelSize, setBottomPanelSize] = useState(30);
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(true);

  const handleSidebarResize = (sizes: number[]) => {
    setSidebarSize(sizes[0]);
    const remainingSize = 100 - sizes[0];
    setEditorSize((editorSize / (editorSize + previewSize)) * remainingSize);
    setPreviewSize((previewSize / (editorSize + previewSize)) * remainingSize);
  };

  const handleEditorResize = (sizes: number[]) => {
    setEditorSize(sizes[0]);
    setPreviewSize(sizes[1]);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main horizontal split */}
        <ResizablePanelGroup
          direction="horizontal"
          className="flex-1 h-full"
          onLayout={handleSidebarResize}
        >
          {/* File explorer */}
          <ResizablePanel
            defaultSize={sidebarSize}
            minSize={15}
            maxSize={25}
            className="border-r"
          >
            <div className="h-full overflow-auto">
              {fileExplorer}
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Editor and preview */}
          <ResizablePanel defaultSize={100 - sidebarSize}>
            <ResizablePanelGroup
              direction="horizontal"
              onLayout={handleEditorResize}
              className="h-full"
            >
              {/* Editor */}
              <ResizablePanel defaultSize={editorSize} minSize={30}>
                <div className="h-full overflow-hidden">
                  {editor}
                </div>
              </ResizablePanel>
              
              {preview && (
                <>
                  <ResizableHandle withHandle />
                  
                  {/* Preview */}
                  <ResizablePanel defaultSize={previewSize} minSize={20}>
                    <div className="h-full overflow-hidden">
                      {preview}
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Bottom panel (console, etc.) */}
        {bottomPanel && (
          <div 
            className={cn(
              "border-t transition-all",
              bottomPanelCollapsed ? "h-10" : "h-1/3"
            )}
          >
            <div className="border-b flex items-center justify-between px-2 h-9">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBottomPanelCollapsed(!bottomPanelCollapsed)}
                  className="p-1 hover:bg-accent rounded-sm"
                >
                  {bottomPanelCollapsed ? "Show Console" : "Hide Console"}
                </button>
              </div>
            </div>
            
            {!bottomPanelCollapsed && (
              <div className="h-[calc(100%-36px)] overflow-auto p-2">
                {bottomPanel}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}