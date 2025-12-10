import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ChevronLeft, 
  MoreVertical, 
  Search, 
  Trash2, 
  X, 
  ChevronDown,
  Plus,
  Square,
  Sparkles,
  ChevronRight,
  Shell as ShellIcon,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface ShellTab {
  id: string;
  name: string;
  cwd: string;
}

interface ReplitMobileShellProps {
  projectId: number;
  onClose?: () => void;
  onBack?: () => void;
}

export function ReplitMobileShell({ projectId, onClose, onBack }: ReplitMobileShellProps) {
  const { toast } = useToast();
  
  const [tabs, setTabs] = useState<ShellTab[]>([
    { id: 'shell-1', name: 'bash', cwd: '~/workspace' }
  ]);
  const [activeTabId, setActiveTabId] = useState('shell-1');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFindMode, setIsFindMode] = useState(false);
  const [isGenerateMode, setIsGenerateMode] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const generateInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/terminal/ws?projectId=${projectId}`;
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      setIsConnected(true);
      setTerminalOutput(prev => [...prev, '\x1b[32m● Connected to shell\x1b[0m\r\n']);
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'output') {
          setTerminalOutput(prev => [...prev, message.data]);
        } else if (message.type === 'connected') {
          setTerminalOutput(prev => [...prev, `\x1b[90m${message.data}\x1b[0m\r\n`]);
        }
      } catch {
        setTerminalOutput(prev => [...prev, event.data]);
      }
    };
    
    socket.onclose = () => {
      setIsConnected(false);
      setTerminalOutput(prev => [...prev, '\r\n\x1b[31m● Disconnected\x1b[0m\r\n']);
    };
    
    socket.onerror = () => {
      setIsConnected(false);
    };
    
    setWs(socket);
    
    return socket;
  }, [projectId]);

  useEffect(() => {
    const socket = connectWebSocket();
    return () => {
      socket.close();
    };
  }, [connectWebSocket]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const sendCommand = useCallback((command: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      toast({
        title: 'Not connected',
        description: 'Shell is not connected. Reconnecting...',
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

  const clearShell = () => {
    setTerminalOutput([]);
    setIsMenuOpen(false);
    toast({ title: 'Shell cleared' });
  };

  const openFindInShell = () => {
    setIsFindMode(true);
    setIsMenuOpen(false);
    setTimeout(() => findInputRef.current?.focus(), 100);
  };

  const closeFindMode = () => {
    setIsFindMode(false);
    setFindQuery('');
  };

  const openGenerateMode = () => {
    setIsGenerateMode(true);
    setTimeout(() => generateInputRef.current?.focus(), 100);
  };

  const closeGenerateMode = () => {
    setIsGenerateMode(false);
    setGeneratePrompt('');
  };

  const generateCommandMutation = useMutation({
    mutationFn: async (prompt: string) => {
      return await apiRequest('POST', '/api/shell/generate-command', { prompt, projectId });
    },
    onSuccess: (data: any) => {
      if (data.command) {
        setCurrentCommand(data.command);
        closeGenerateMode();
        inputRef.current?.focus();
        toast({ title: 'Command generated', description: data.command });
      }
    },
    onError: () => {
      toast({ title: 'Generation failed', variant: 'destructive' });
    }
  });

  const handleGenerateSubmit = () => {
    if (generatePrompt.trim()) {
      generateCommandMutation.mutate(generatePrompt);
    }
  };

  const handleGenerateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGenerateSubmit();
    } else if (e.key === 'Escape') {
      closeGenerateMode();
    }
  };

  const stopExecution = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data: '\x03' }));
      setIsExecuting(false);
    }
  };

  const createNewTab = () => {
    const newId = `shell-${Date.now()}`;
    setTabs(prev => [...prev, { id: newId, name: 'bash', cwd: '~/workspace' }]);
    setActiveTabId(newId);
  };

  const closeTab = () => {
    if (tabs.length <= 1) {
      onClose?.();
      return;
    }
    const remainingTabs = tabs.filter(t => t.id !== activeTabId);
    setTabs(remainingTabs);
    setActiveTabId(remainingTabs[0].id);
    setIsMenuOpen(false);
  };

  const findNext = () => {
    if (!findQuery) return;
    const output = terminalOutput.join('');
    const index = output.toLowerCase().indexOf(findQuery.toLowerCase());
    if (index !== -1) {
      toast({ title: 'Found match' });
    } else {
      toast({ title: 'No matches found' });
    }
  };

  const findPrevious = () => {
    if (!findQuery) return;
    const output = terminalOutput.join('');
    const index = output.toLowerCase().lastIndexOf(findQuery.toLowerCase());
    if (index !== -1) {
      toast({ title: 'Found match' });
    } else {
      toast({ title: 'No matches found' });
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
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-card">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={onBack}
          data-testid="shell-back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <ShellIcon className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Shell</span>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={() => setIsMenuOpen(true)}
          data-testid="shell-menu-button"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/30 text-xs">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs font-normal gap-1"
              data-testid="shell-tab-dropdown"
            >
              <ChevronDown className="h-3 w-3" />
              <span className="text-primary">{activeTab.cwd}:</span>
              <span className="text-muted-foreground">{activeTab.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {tabs.map(tab => (
              <DropdownMenuItem 
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className="text-xs"
              >
                {tab.cwd}: {tab.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={createNewTab} className="text-xs gap-2">
              <Plus className="h-3 w-3" />
              New Shell
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={openFindInShell}
            data-testid="shell-search-button"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={clearShell}
            data-testid="shell-clear-button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={closeTab}
            data-testid="shell-close-tab-button"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={openGenerateMode}
            data-testid="shell-generate-button"
          >
            Generate
          </Button>
        </div>
      </div>

      {isFindMode && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/50">
          <Input
            ref={findInputRef}
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            placeholder="Find"
            className="h-7 text-xs flex-1"
            data-testid="shell-find-input"
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={findNext}
          >
            Next
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs"
            onClick={findPrevious}
          >
            Previous
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs"
            onClick={closeFindMode}
          >
            Exit
          </Button>
        </div>
      )}

      <div 
        ref={terminalRef}
        className="flex-1 overflow-auto p-3 font-mono text-xs bg-background"
        onClick={() => inputRef.current?.focus()}
        data-testid="shell-terminal-output"
      >
        <div 
          dangerouslySetInnerHTML={{ 
            __html: parseAnsiToHtml(terminalOutput.join('')) 
          }} 
        />
        
        <div className="flex items-start gap-1 mt-1">
          <span className="text-primary font-semibold">{activeTab.cwd}$</span>
          <span className="text-foreground">{currentCommand}</span>
          <span className="animate-pulse">▊</span>
        </div>
      </div>

      {isGenerateMode && (
        <div className="border-t bg-card p-3">
          <div className="relative">
            <Input
              ref={generateInputRef}
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              onKeyDown={handleGenerateKeyDown}
              placeholder="Enter a prompt to generate a shell command"
              className="h-9 text-sm pr-10"
              data-testid="shell-generate-input"
            />
            <Button
              size="icon"
              className="absolute right-1 top-1 h-7 w-7"
              onClick={handleGenerateSubmit}
              disabled={generateCommandMutation.isPending}
            >
              {generateCommandMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>Generate with Assistant</span>
            </div>
            <span>Esc to close, Enter to submit</span>
          </div>
        </div>
      )}

      {!isGenerateMode && (
        <div className="border-t bg-card p-2">
          <div className="flex items-center gap-2">
            <span className="text-primary text-xs font-mono">{activeTab.cwd}$</span>
            <Input
              ref={inputRef}
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter command..."
              className="h-8 text-xs font-mono flex-1 bg-transparent border-none focus-visible:ring-0"
              data-testid="shell-command-input"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 py-3 border-t bg-card safe-area-bottom">
        <Button
          variant={isExecuting ? "destructive" : "secondary"}
          size="icon"
          className="h-11 w-11 rounded-lg"
          onClick={stopExecution}
          disabled={!isExecuting}
          data-testid="shell-stop-button"
        >
          <Square className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center bg-muted rounded-full px-1 py-1 gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="6" cy="6" r="2" />
              <circle cx="12" cy="6" r="2" />
              <circle cx="18" cy="6" r="2" />
              <circle cx="6" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="18" cy="12" r="2" />
              <circle cx="6" cy="18" r="2" />
              <circle cx="12" cy="18" r="2" />
              <circle cx="18" cy="18" r="2" />
            </svg>
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </Button>
          <Button 
            variant="default" 
            size="icon" 
            className="h-9 w-9 rounded-full bg-primary"
            data-testid="shell-nav-active"
          >
            <ShellIcon className="h-4 w-4" />
          </Button>
        </div>
        
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-lg"
          data-testid="shell-split-button"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="12" y1="3" x2="12" y2="21" />
          </svg>
        </Button>
      </div>

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2">
              <ShellIcon className="h-4 w-4" />
              <SheetTitle className="text-base">Shell</SheetTitle>
            </div>
            <SheetDescription>
              Directly access your App through a command line interface (CLI).
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-4 space-y-1">
            <Button 
              variant="ghost" 
              className="w-full justify-between h-12"
              onClick={clearShell}
              data-testid="menu-clear-shell"
            >
              <span>Clear Shell</span>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-between h-12"
              onClick={openFindInShell}
              data-testid="menu-find-shell"
            >
              <span>Find in Shell</span>
              <Search className="h-4 w-4 text-muted-foreground" />
            </Button>
            
            <div className="border-t my-2" />
            
            <Button 
              variant="ghost" 
              className="w-full justify-between h-12"
              onClick={closeTab}
              data-testid="menu-close-tab"
            >
              <span>Close tab</span>
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default ReplitMobileShell;
