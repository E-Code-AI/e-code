import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Terminal as TerminalIcon, 
  Plus, 
  X, 
  Maximize2, 
  Minimize2,
  Copy,
  Trash2,
  Settings,
  Search,
  Download,
  ChevronDown,
  Sparkles,
  Square,
  Loader2,
  FolderOpen,
  Package,
  Code,
  HelpCircle,
  Command
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

const themes = {
  default: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
  },
  monokai: {
    background: '#272822',
    foreground: '#f8f8f2',
  },
  light: {
    background: '#ffffff',
    foreground: '#1e1e1e',
  }
};

interface ShellTab {
  id: string;
  name: string;
  cwd: string;
  output: string[];
}

interface ReplitDesktopShellProps {
  projectId: number;
  isFullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
}

export function ReplitDesktopShell({ 
  projectId, 
  isFullscreen = false,
  onFullscreenChange 
}: ReplitDesktopShellProps) {
  const { toast } = useToast();
  
  const [tabs, setTabs] = useState<ShellTab[]>([
    { id: 'shell-1', name: 'Main Shell', cwd: '~/workspace', output: [] }
  ]);
  const [activeTabId, setActiveTabId] = useState('shell-1');
  const [selectedTheme, setSelectedTheme] = useState<'default' | 'monokai' | 'light'>('default');
  const [fontSize, setFontSize] = useState(14);
  const [isFindMode, setIsFindMode] = useState(false);
  const [isGenerateMode, setIsGenerateMode] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const theme = themes[selectedTheme];

  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/terminal/ws?projectId=${projectId}`;
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      setIsConnected(true);
      updateTabOutput(activeTabId, '\x1b[32m● Connected to E-Code Shell\x1b[0m\r\n');
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'output') {
          updateTabOutput(activeTabId, message.data);
        } else if (message.type === 'connected') {
          updateTabOutput(activeTabId, `\x1b[90m${message.data}\x1b[0m\r\n`);
        }
      } catch {
        updateTabOutput(activeTabId, event.data);
      }
    };
    
    socket.onclose = () => {
      setIsConnected(false);
      updateTabOutput(activeTabId, '\r\n\x1b[31m● Disconnected\x1b[0m\r\n');
    };
    
    socket.onerror = () => {
      setIsConnected(false);
    };
    
    setWs(socket);
    return socket;
  }, [projectId, activeTabId]);

  const updateTabOutput = (tabId: string, data: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId 
        ? { ...tab, output: [...tab.output, data] }
        : tab
    ));
  };

  useEffect(() => {
    const socket = connectWebSocket();
    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [tabs]);

  const sendCommand = useCallback((command: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      toast({
        title: 'Not connected',
        description: 'Reconnecting to shell...',
        variant: 'destructive'
      });
      connectWebSocket();
      return;
    }
    
    ws.send(JSON.stringify({ type: 'input', data: command + '\r' }));
    setCurrentCommand('');
  }, [ws, toast, connectWebSocket]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentCommand.trim()) {
      sendCommand(currentCommand);
    }
  };

  const createNewTab = () => {
    const newId = `shell-${Date.now()}`;
    const newTab: ShellTab = {
      id: newId,
      name: `Shell ${tabs.length + 1}`,
      cwd: '~/workspace',
      output: []
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length <= 1) return;
    const remaining = tabs.filter(t => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[0].id);
    }
  };

  const clearTerminal = () => {
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? { ...tab, output: [] } : tab
    ));
  };

  const copyTerminalContent = () => {
    const content = activeTab.output.join('').replace(/\x1b\[[0-9;]*m/g, '');
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied to clipboard' });
  };

  const downloadLog = () => {
    const content = activeTab.output.join('').replace(/\x1b\[[0-9;]*m/g, '');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shell-${activeTab.name}-${new Date().toISOString()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateCommandMutation = useMutation({
    mutationFn: async (prompt: string) => {
      return await apiRequest('POST', '/api/shell/generate-command', { prompt, projectId });
    },
    onSuccess: (data: any) => {
      if (data.command) {
        setCurrentCommand(data.command);
        setIsGenerateMode(false);
        setGeneratePrompt('');
        inputRef.current?.focus();
        toast({ title: 'Command generated', description: data.command });
      }
    },
    onError: () => {
      toast({ title: 'Generation failed', variant: 'destructive' });
    }
  });

  const stopExecution = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data: '\x03' }));
      setIsExecuting(false);
    }
  };

  const parseAnsiToHtml = (text: string): string => {
    return text
      .replace(/\x1b\[32m/g, '<span class="text-green-500">')
      .replace(/\x1b\[31m/g, '<span class="text-red-500">')
      .replace(/\x1b\[33m/g, '<span class="text-yellow-500">')
      .replace(/\x1b\[34m/g, '<span class="text-blue-500">')
      .replace(/\x1b\[35m/g, '<span class="text-purple-500">')
      .replace(/\x1b\[36m/g, '<span class="text-cyan-500">')
      .replace(/\x1b\[90m/g, '<span class="text-muted-foreground">')
      .replace(/\x1b\[0m/g, '</span>')
      .replace(/\x1b\[\d+m/g, '')
      .replace(/\r\n/g, '<br/>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div 
      className={`flex flex-col bg-background ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}
      style={{ 
        '--terminal-bg': theme.background,
        '--terminal-fg': theme.foreground 
      } as React.CSSProperties}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TerminalIcon className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Shell</h1>
          </div>

          <Tabs value={activeTabId} onValueChange={setActiveTabId}>
            <TabsList className="h-8 bg-muted">
              {tabs.map(tab => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="text-xs px-3 py-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <span className="max-w-[100px] truncate">{tab.name}</span>
                  {tabs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </TabsTrigger>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-1"
                onClick={createNewTab}
                data-testid="shell-new-tab"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFindMode(!isFindMode)}
            className="h-8 w-8"
            data-testid="desktop-shell-search"
          >
            <Search className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={copyTerminalContent}
            className="h-8 w-8"
          >
            <Copy className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={clearTerminal}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={downloadLog}>
                <Download className="h-4 w-4 mr-2" />
                Download Log
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <div className="px-2 py-1.5">
                <label className="text-sm font-medium">Theme</label>
                <Select value={selectedTheme} onValueChange={(v) => setSelectedTheme(v as any)}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (Dark)</SelectItem>
                    <SelectItem value="monokai">Monokai</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="px-2 py-1.5">
                <label className="text-sm font-medium">Font Size</label>
                <Select value={fontSize.toString()} onValueChange={(v) => setFontSize(parseInt(v))}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12px</SelectItem>
                    <SelectItem value="14">14px</SelectItem>
                    <SelectItem value="16">16px</SelectItem>
                    <SelectItem value="18">18px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onFullscreenChange?.(!isFullscreen)}
            className="h-8 w-8"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-1.5 border-b bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-3 w-3" />
            <span>{activeTab.cwd}</span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="h-3 w-3" />
            <span>Node.js 20</span>
          </div>
          <div className="flex items-center gap-2">
            <Code className="h-3 w-3" />
            <span>Bash</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs gap-1"
            onClick={() => setIsGenerateMode(!isGenerateMode)}
          >
            <Sparkles className="h-3 w-3" />
            Generate
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
            <HelpCircle className="h-3 w-3" />
            Help
          </Button>
        </div>
      </div>

      {isFindMode && (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50">
          <Input
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            placeholder="Find in shell..."
            className="h-8 text-sm flex-1 max-w-xs"
            autoFocus
          />
          <Button variant="outline" size="sm" className="h-8">Next</Button>
          <Button variant="outline" size="sm" className="h-8">Previous</Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8"
            onClick={() => {
              setIsFindMode(false);
              setFindQuery('');
            }}
          >
            Close
          </Button>
        </div>
      )}

      {isGenerateMode && (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary" />
          <Input
            value={generatePrompt}
            onChange={(e) => setGeneratePrompt(e.target.value)}
            placeholder="Describe the command you want..."
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && generatePrompt.trim()) {
                generateCommandMutation.mutate(generatePrompt);
              } else if (e.key === 'Escape') {
                setIsGenerateMode(false);
                setGeneratePrompt('');
              }
            }}
            autoFocus
          />
          <Button 
            size="sm" 
            className="h-8 gap-1"
            onClick={() => generateCommandMutation.mutate(generatePrompt)}
            disabled={!generatePrompt.trim() || generateCommandMutation.isPending}
          >
            {generateCommandMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Generate
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8"
            onClick={() => {
              setIsGenerateMode(false);
              setGeneratePrompt('');
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      <div 
        ref={terminalRef}
        className="flex-1 overflow-auto p-4 font-mono"
        style={{ 
          backgroundColor: theme.background,
          color: theme.foreground,
          fontSize: `${fontSize}px`,
          minHeight: '300px'
        }}
        onClick={() => inputRef.current?.focus()}
        data-testid="desktop-shell-output"
      >
        <div 
          dangerouslySetInnerHTML={{ 
            __html: parseAnsiToHtml(activeTab.output.join('')) 
          }} 
        />
        
        <div className="flex items-start gap-1 mt-1">
          <span style={{ color: '#4ade80' }}>{activeTab.cwd}$</span>
          <span>{currentCommand}</span>
          <span className="animate-pulse">▊</span>
        </div>
      </div>

      <div className="border-t bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant={isExecuting ? "destructive" : "secondary"}
            size="icon"
            className="h-8 w-8"
            onClick={stopExecution}
            disabled={!isExecuting}
          >
            <Square className="h-3 w-3" />
          </Button>
          
          <span className="text-primary text-sm font-mono">{activeTab.cwd}$</span>
          <Input
            ref={inputRef}
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className="h-8 text-sm font-mono flex-1 bg-transparent border-none focus-visible:ring-0"
            data-testid="desktop-shell-input"
          />
        </div>
      </div>

      <div className="border-t bg-muted/30 px-4 py-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            <span>•</span>
            <span>UTF-8</span>
            <span>•</span>
            <span>LF</span>
          </div>
          <div className="flex items-center gap-2">
            <Command className="h-3 w-3" />
            <span>Ctrl+C to interrupt</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReplitDesktopShell;
