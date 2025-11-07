/**
 * TabletDrawerContent Component
 * Enhanced drawer content with Files and Tools tabs for tablet interface
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Wrench, 
  Bot, 
  Settings, 
  Terminal as TerminalIcon,
  Rocket,
  Code2,
  GitBranch,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileFileExplorer } from '@/components/mobile/MobileFileExplorer';

interface TabletDrawerContentProps {
  projectId: string | number; // Support both UUID strings and numeric IDs
  onFileSelect: (file: { id: number }) => void;
  onClose: () => void;
  // Tool action callbacks
  onOpenAIAgent?: () => void;
  onOpenDeploy?: () => void;
  onOpenGit?: () => void;
  onOpenTerminal?: () => void;
  onOpenPackages?: () => void;
  onOpenDebugger?: () => void;
  onOpenSettings?: () => void;
}

type DrawerTab = 'files' | 'tools';

export function TabletDrawerContent({ 
  projectId, 
  onFileSelect,
  onClose,
  onOpenAIAgent,
  onOpenDeploy,
  onOpenGit,
  onOpenTerminal,
  onOpenPackages,
  onOpenDebugger,
  onOpenSettings
}: TabletDrawerContentProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('files');

  // Haptic feedback helper
  const vibrate = () => {
    if ('vibrate' in navigator) navigator.vibrate(10);
  };

  const handleTabSwitch = (tab: DrawerTab) => {
    setActiveTab(tab);
    vibrate();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tab Switcher */}
      <div className="flex items-center border-b border-border bg-muted/50">
        <Button
          variant={activeTab === 'files' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleTabSwitch('files')}
          className="flex-1 rounded-none h-12 touch-manipulation"
          data-testid="tab-drawer-files"
        >
          <FileText className="h-5 w-5 mr-2" />
          Files
        </Button>
        <Button
          variant={activeTab === 'tools' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleTabSwitch('tools')}
          className="flex-1 rounded-none h-12 touch-manipulation"
          data-testid="tab-drawer-tools"
        >
          <Wrench className="h-5 w-5 mr-2" />
          Tools
        </Button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'files' ? (
          <MobileFileExplorer
            isOpen={true}
            onClose={onClose}
            projectId={projectId}
            onFileSelect={onFileSelect}
          />
        ) : (
          <ToolsPanel
            onOpenAIAgent={onOpenAIAgent}
            onOpenDeploy={onOpenDeploy}
            onOpenGit={onOpenGit}
            onOpenTerminal={onOpenTerminal}
            onOpenPackages={onOpenPackages}
            onOpenDebugger={onOpenDebugger}
            onOpenSettings={onOpenSettings}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Tools Panel - Quick access to common IDE tools
 */
interface ToolsPanelProps {
  onOpenAIAgent?: () => void;
  onOpenDeploy?: () => void;
  onOpenGit?: () => void;
  onOpenTerminal?: () => void;
  onOpenPackages?: () => void;
  onOpenDebugger?: () => void;
  onOpenSettings?: () => void;
}

function ToolsPanel({
  onOpenAIAgent,
  onOpenDeploy,
  onOpenGit,
  onOpenTerminal,
  onOpenPackages,
  onOpenDebugger,
  onOpenSettings
}: ToolsPanelProps) {
  const tools = [
    {
      id: 'ai-agent',
      name: 'AI Agent',
      icon: Bot,
      description: 'Chat with AI to generate code',
      action: onOpenAIAgent || (() => console.warn('AI Agent handler not provided')),
    },
    {
      id: 'deploy',
      name: 'Deploy',
      icon: Rocket,
      description: 'Publish your application',
      action: onOpenDeploy || (() => console.warn('Deploy handler not provided')),
    },
    {
      id: 'git',
      name: 'Source Control',
      icon: GitBranch,
      description: 'Manage version control',
      action: onOpenGit || (() => console.warn('Git handler not provided')),
    },
    {
      id: 'terminal',
      name: 'Terminal',
      icon: TerminalIcon,
      description: 'Run shell commands',
      action: onOpenTerminal || (() => console.warn('Terminal handler not provided')),
    },
    {
      id: 'packages',
      name: 'Packages',
      icon: Package,
      description: 'Manage dependencies',
      action: onOpenPackages || (() => console.warn('Packages handler not provided')),
    },
    {
      id: 'debugger',
      name: 'Debugger',
      icon: Code2,
      description: 'Debug your application',
      action: onOpenDebugger || (() => console.warn('Debugger handler not provided')),
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: Settings,
      description: 'Configure workspace',
      action: onOpenSettings || (() => console.warn('Settings handler not provided')),
    },
  ];

  const vibrate = () => {
    if ('vibrate' in navigator) navigator.vibrate(10);
  };

  const handleToolClick = (tool: typeof tools[0]) => {
    vibrate();
    tool.action();
  };

  return (
    <div className="p-2 space-y-1">
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Quick Access
      </div>
      
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool)}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-md",
              "hover:bg-accent hover:text-accent-foreground",
              "transition-colors touch-manipulation",
              "text-left min-h-[60px]"
            )}
            data-testid={`tool-${tool.id}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{tool.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {tool.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
