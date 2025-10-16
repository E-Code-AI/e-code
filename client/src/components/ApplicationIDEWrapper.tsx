import { ReactNode, useState } from 'react';
import { ReplitHeader } from '@/components/layout/ReplitHeader';
import { ReplitSidebar } from '@/components/layout/ReplitSidebar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import FileExplorer from '@/components/FileExplorer';
import CodeEditor from '@/components/CodeEditor';
import { ReplitAgentChat } from '@/components/ReplitAgentChat';
import Terminal from '@/components/Terminal';
import { File } from '@shared/schema';
import { 
  FileCode,
  Terminal as TerminalIcon,
  Bot,
  X,
  PanelLeft,
  PanelLeftClose
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApplicationIDEWrapperProps {
  projectName: string;
  projectDescription: string;
  appComponent: ReactNode;
  projectId?: number;
}

export function ApplicationIDEWrapper({
  projectName,
  projectDescription,
  appComponent,
  projectId = 1
}: ApplicationIDEWrapperProps) {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAIChat, setShowAIChat] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  // Mock file structure for the application
  const mockFiles: File[] = [
    { 
      id: 1, 
      name: 'src', 
      path: '/src',
      content: null,
      projectId: projectId,
      isDirectory: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    { 
      id: 2, 
      name: 'App.tsx', 
      path: '/src/App.tsx',
      content: '// Main application component\nimport React from "react";\n\nexport default function App() {\n  return <div>Application</div>;\n}',
      projectId: projectId,
      isDirectory: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    { 
      id: 3, 
      name: 'components', 
      path: '/src/components',
      content: null,
      projectId: projectId,
      isDirectory: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    { 
      id: 4, 
      name: 'styles.css', 
      path: '/src/styles.css',
      content: '/* Application styles */\n* {\n  box-sizing: border-box;\n}',
      projectId: projectId,
      isDirectory: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    { 
      id: 5, 
      name: 'package.json', 
      path: '/package.json',
      content: JSON.stringify({
        name: projectName.toLowerCase().replace(/\s+/g, '-'),
        version: "1.0.0",
        dependencies: {}
      }, null, 2),
      projectId: projectId,
      isDirectory: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    { 
      id: 6, 
      name: 'README.md', 
      path: '/README.md',
      content: `# ${projectName}\n\n${projectDescription}`,
      projectId: projectId,
      isDirectory: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const [selectedFile, setSelectedFile] = useState<File | undefined>(mockFiles[1]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Replit Header */}
      <ReplitHeader
        projectName={projectName}
        language="TypeScript"
        projectId={projectId}
        showMenu={true}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <ReplitSidebar 
            onNavigate={() => {}} 
            currentPath={`/projects/${projectId}`}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* File Explorer Panel */}
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
              <div className="h-full flex flex-col border-r">
                <div className="p-3 border-b flex items-center justify-between">
                  <h3 className="text-sm font-medium">Files</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowSidebar(!showSidebar)}
                  >
                    {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex-1 overflow-auto p-2">
                  <FileExplorer
                    files={mockFiles}
                    projectId={projectId}
                    onFileSelect={(file) => {
                      setSelectedFile(file);
                      setActiveTab('code');
                    }}
                  />
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* Editor/Preview Panel */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full flex flex-col">
                <div className="border-b">
                  <div className="flex">
                    <button
                      className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                        activeTab === 'preview' 
                          ? "border-primary text-primary" 
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setActiveTab('preview')}
                    >
                      Preview
                    </button>
                    <button
                      className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                        activeTab === 'code' 
                          ? "border-primary text-primary" 
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setActiveTab('code')}
                    >
                      Code
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {activeTab === 'preview' ? (
                    <div className="h-full w-full">
                      {appComponent}
                    </div>
                  ) : (
                    <CodeEditor
                      file={selectedFile || mockFiles[1]}
                      onSave={(fileId, content) => {
                        console.log('Saving file', fileId, content);
                      }}
                    />
                  )}
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle />

            {/* AI Chat Panel */}
            {showAIChat && (
              <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                <div className="h-full flex flex-col border-l">
                  <div className="p-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      <h3 className="text-sm font-medium">AI Assistant</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowAIChat(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ReplitAgentChat
                      projectId={projectId}
                      selectedCode=""
                    />
                  </div>
                </div>
              </ResizablePanel>
            )}
          </ResizablePanelGroup>

          {/* Terminal */}
          {showTerminal && (
            <div className="h-64 border-t">
              <div className="h-full flex flex-col">
                <div className="p-2 border-b flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-2">
                    <TerminalIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">Terminal</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowTerminal(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1">
                  <Terminal projectId={projectId} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          {!showAIChat && (
            <Button
              size="icon"
              onClick={() => setShowAIChat(true)}
              className="shadow-lg"
            >
              <Bot className="h-4 w-4" />
            </Button>
          )}
          {!showTerminal && (
            <Button
              size="icon"
              variant="outline"
              onClick={() => setShowTerminal(true)}
              className="shadow-lg"
            >
              <TerminalIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}