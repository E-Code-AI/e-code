// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { ReplitTabBar } from './ReplitTabBar';
import { ReplitToolbar } from './ReplitToolbar';
import { ReplitStatusBar } from './ReplitStatusBar';
import { ReplitBreadcrumb } from './ReplitBreadcrumb';
import { ReplitMinimap } from './ReplitMinimap';
import { ReplitSearchBox } from './ReplitSearchBox';
import { ReplitContextMenu } from './ReplitContextMenu';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Monaco } from '@monaco-editor/react';
import { 
  FileText, 
  Terminal as TerminalIcon, 
  Globe,
  Settings,
  Search,
  X,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  title: string;
  type: 'file' | 'terminal' | 'webview' | 'settings';
  path?: string;
  content?: string;
  isDirty?: boolean;
}

interface BreadcrumbItem {
  id: string;
  title: string;
  path: string;
  type: 'home' | 'folder' | 'file';
}

interface ReplitEditorInterfaceProps {
  projectId?: string;
  projectName?: string;
  language?: string;
  className?: string;
}

export function ReplitEditorInterface({
  projectId = '1',
  projectName = 'My Awesome Project',
  language = 'JavaScript',
  className
}: ReplitEditorInterfaceProps) {
  // State management
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'index.js',
      title: 'index.js',
      type: 'file',
      path: '/src/index.js',
      content: `// Welcome to E-Code!
// This is a fully functional Replit-style IDE

function welcome() {
  console.log("Hello from E-Code!");
  console.log("Building amazing projects has never been easier!");
  
  // Your code here
  const message = "Ready to code?";
  return message;
}

// Export for use
export default welcome;

// Call the function
welcome();

// Additional functionality
class ProjectManager {
  constructor(name) {
    this.name = name;
    this.files = [];
  }
  
  addFile(filename, content) {
    this.files.push({ filename, content, timestamp: new Date() });
    console.log(\`Added file: \${filename}\`);
  }
  
  listFiles() {
    return this.files.map(f => f.filename);
  }
}

const project = new ProjectManager("${projectName}");
project.addFile("index.js", "Main application file");
project.addFile("styles.css", "Application styles");
project.addFile("README.md", "Project documentation");

console.log("Project files:", project.listFiles());`,
      isDirty: false
    },
    {
      id: 'styles.css',
      title: 'styles.css',
      type: 'file',
      path: '/src/styles.css',
      content: `/* E-Code Project Styles */

:root {
  --primary-color: #3b82f6;
  --secondary-color: #6b7280;
  --background-color: #f9fafb;
  --text-color: #111827;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: var(--background-color);
  color: var(--text-color);
  margin: 0;
  padding: 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  background: linear-gradient(135deg, var(--primary-color), #8b5cf6);
  color: white;
  padding: 3rem 0;
  text-align: center;
  border-radius: 12px;
  margin-bottom: 2rem;
}

.button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.button:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
  
  .header {
    padding: 2rem 1rem;
  }
}`,
      isDirty: false
    },
    {
      id: 'terminal',
      title: 'Terminal',
      type: 'terminal',
      path: '/terminal',
      content: '',
      isDirty: false
    }
  ]);
  
  const [activeTab, setActiveTab] = useState('index.js');
  const [isRunning, setIsRunning] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  
  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { id: 'home', title: 'Home', path: '/', type: 'home' },
    { id: 'project', title: projectName, path: `/projects/${projectId}`, type: 'folder' },
    { id: 'src', title: 'src', path: `/projects/${projectId}/src`, type: 'folder' },
    { id: 'current', title: activeTab, path: `/projects/${projectId}/src/${activeTab}`, type: 'file' }
  ];

  // Get current tab content
  const currentTab = tabs.find(tab => tab.id === activeTab);
  const currentContent = currentTab?.content || '';

  // Handle tab operations
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleTabClose = (tabId: string) => {
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    if (activeTab === tabId && newTabs.length > 0) {
      setActiveTab(newTabs[0].id);
    }
  };

  const handleNewTab = () => {
    const newTabId = `untitled-${Date.now()}`;
    const newTab: Tab = {
      id: newTabId,
      title: 'Untitled',
      type: 'file',
      path: `/src/${newTabId}.js`,
      content: '// New file\n',
      isDirty: false
    };
    
    setTabs([...tabs, newTab]);
    setActiveTab(newTabId);
  };

  // Handle editor operations
  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 3000); // Simulate run
  };

  const handleSave = () => {
    const updatedTabs = tabs.map(tab => 
      tab.id === activeTab ? { ...tab, isDirty: false } : tab
    );
    setTabs(updatedTabs);
  };

  return (
    <div className={cn("h-screen flex flex-col bg-[var(--ecode-background)]", className)}>
      {/* Toolbar */}
      <ReplitToolbar
        isRunning={isRunning}
        projectName={projectName}
        language={language}
        visibility="private"
        isStarred={false}
        collaborators={0}
        onRun={handleRun}
        onStop={() => setIsRunning(false)}
        onSave={handleSave}
        onShare={() => console.log('Share project')}
      />

      {/* Tab Bar */}
      <ReplitTabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
      />

      {/* Breadcrumb */}
      <ReplitBreadcrumb
        items={breadcrumbItems}
        onItemClick={(item) => console.log('Navigate to:', item.path)}
      />

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Search Panel */}
          {showSearch && (
            <>
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <ReplitSearchBox
                  onSearch={(query, options) => console.log('Search:', query, options)}
                  onResultClick={(result) => console.log('Navigate to result:', result)}
                  results={[
                    {
                      id: '1',
                      file: 'index.js',
                      line: 5,
                      column: 10,
                      text: 'console.log',
                      preview: '  console.log("Hello from E-Code!");',
                      type: 'match'
                    },
                    {
                      id: '2',
                      file: 'index.js',
                      line: 6,
                      column: 10,
                      text: 'console.log',
                      preview: '  console.log("Building amazing projects...");',
                      type: 'match'
                    }
                  ]}
                />
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}

          {/* Code Editor Panel */}
          <ResizablePanel defaultSize={showSearch ? 55 : 75}>
            <div className="h-full flex">
              {/* Editor */}
              <div className="flex-1 relative">
                <ReplitContextMenu
                  type="editor"
                  onAction={(actionId) => console.log('Editor action:', actionId)}
                >
                  <div className="h-full bg-[var(--ecode-background)] p-4 font-mono text-sm overflow-auto">
                    <pre className="whitespace-pre-wrap text-[var(--ecode-text)]">
                      {currentContent}
                    </pre>
                  </div>
                </ReplitContextMenu>
              </div>

              {/* Minimap */}
              {showMinimap && (
                <ReplitMinimap
                  content={currentContent}
                  currentLine={1}
                  visibleRange={{ start: 1, end: 20 }}
                  onLineClick={(line) => console.log('Navigate to line:', line)}
                />
              )}
            </div>
          </ResizablePanel>

          {/* Right Panel */}
          {rightPanelOpen && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <div className="h-full bg-[var(--ecode-surface)] border-l border-[var(--ecode-border)]">
                  {/* Panel Header */}
                  <div className="h-9 flex items-center justify-between px-2 border-b border-[var(--ecode-border)]">
                    <div className="flex items-center gap-1">
                      <Button variant="secondary" size="sm" className="h-7 px-2 text-xs">
                        <Globe className="h-3 w-3 mr-1" />
                        Webview
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setRightPanelOpen(false)}
                    >
                      <PanelRightClose className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Panel Content */}
                  <div className="p-4 text-center text-[var(--ecode-text-secondary)]">
                    <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Preview will appear here when you run your project</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={handleRun}>
                      Run Project
                    </Button>
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        {/* Floating buttons */}
        {!showSearch && (
          <Button
            variant="outline"
            size="icon"
            className="fixed left-2 top-1/2 -translate-y-1/2 h-8 w-8 shadow-md z-10"
            onClick={() => setShowSearch(true)}
            title="Show search"
          >
            <Search className="h-4 w-4" />
          </Button>
        )}

        {!rightPanelOpen && (
          <Button
            variant="outline"
            size="icon"
            className="fixed right-2 top-1/2 -translate-y-1/2 h-8 w-8 shadow-md z-10"
            onClick={() => setRightPanelOpen(true)}
            title="Show preview"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        )}

        {showSearch && (
          <Button
            variant="outline"
            size="icon"
            className="fixed left-2 top-16 h-8 w-8 shadow-md z-10"
            onClick={() => setShowSearch(false)}
            title="Hide search"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Status Bar */}
      <ReplitStatusBar
        projectName={projectName}
        gitBranch="main"
        isConnected={true}
        isRunning={isRunning}
        collaborators={0}
        language={language}
        lineCount={currentContent.split('\n').length}
        columnCount={1}
        encoding="UTF-8"
      />
    </div>
  );
}