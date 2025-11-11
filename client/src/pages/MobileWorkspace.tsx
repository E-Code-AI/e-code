import { useState } from 'react';
import { ReplitBottomTabs } from '@/components/mobile/ReplitBottomTabs';
import { ReplitToolsSheet } from '@/components/mobile/ReplitToolsSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  RefreshCw, 
  Share2, 
  MoreVertical,
  Paperclip,
  Mic,
  Settings,
  Send,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type MobileTab = 'files' | 'code' | 'terminal' | 'preview' | 'more';

export default function MobileWorkspace() {
  const [activeTab, setActiveTab] = useState<MobileTab>('preview');
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'working' | 'done'>('working');
  const [agentInput, setAgentInput] = useState('');

  const handleTabChange = (tabId: MobileTab) => {
    setActiveTab(tabId);
  };

  const handleToolSelect = (toolId: string) => {
    // Tool selection handled by parent component or global state
    // Mobile workspace can implement custom tool handling as needed
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'files':
        return (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-muted-foreground">Files panel - Coming soon</p>
          </div>
        );
      
      case 'code':
        return (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-muted-foreground">Code editor - Coming soon</p>
          </div>
        );
      
      case 'terminal':
        return (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-muted-foreground">Terminal - Coming soon</p>
          </div>
        );
      
      case 'preview':
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-muted/30">
            <div className="w-full max-w-md space-y-4">
              <div className="aspect-[9/16] bg-background border-2 border-border rounded-lg flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Preview loading...</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Open in browser
                </Button>
              </div>
            </div>
          </div>
        );
      
      case 'more':
        return (
          <div className="flex-1 flex flex-col bg-background">
            {/* Agent Output Area */}
            <div className="flex-1 flex items-center justify-center p-6">
              {agentStatus === 'working' && (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse delay-75" />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse delay-150" />
                    </div>
                    <span className="font-medium">Working..</span>
                  </div>
                </div>
              )}
              {agentStatus === 'idle' && (
                <p className="text-sm text-muted-foreground text-center">
                  Agent is ready. Type a command below to get started.
                </p>
              )}
            </div>

            {/* Agent Input (Fixed at bottom, above tabs) */}
            <div className="border-t bg-background p-4 pb-20 space-y-3">
              {/* Status indicator */}
              {agentStatus === 'working' && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span>Working..</span>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="relative">
                <Input
                  placeholder="Make, test, iterate..."
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  className="pr-32 py-6 text-base"
                  data-testid="input-agent-prompt"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    data-testid="button-attach"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    data-testid="button-voice"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    data-testid="button-settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    className="h-8 w-8 bg-primary hover:bg-primary/90"
                    disabled={!agentInput.trim()}
                    data-testid="button-send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Build Button */}
              <Button
                variant="outline"
                className="w-full gap-2"
                data-testid="button-build"
              >
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded border border-current flex items-center justify-center">
                    <span className="text-[10px] font-bold">B</span>
                  </div>
                  <span>Build</span>
                </div>
                <span className="ml-auto text-muted-foreground">▼</span>
              </Button>
            </div>
          </div>
        );


      default:
        return (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-muted-foreground">Tab: {activeTab}</p>
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background md:hidden">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between h-14 px-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <button 
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button 
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-md">
            <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
            <span className="text-sm font-medium">Agent 3</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-share"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button 
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-more"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Tab Content Area */}
      {renderTabContent()}

      {/* Bottom Tab Navigation (Replit Style) */}
      <ReplitBottomTabs
        activeTab={activeTab}
        onTabChange={(tab) => handleTabChange(tab as MobileTab)}
      />

      {/* Tools Sheet */}
      <ReplitToolsSheet
        open={toolsSheetOpen}
        onOpenChange={setToolsSheetOpen}
        onToolSelect={handleToolSelect}
      />
    </div>
  );
}
