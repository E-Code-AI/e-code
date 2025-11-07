import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { motion } from 'framer-motion';
import { 
  Copy, Clipboard, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  CornerDownLeft, Delete, X as Escape, Command, Keyboard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTerminalHistoryPersistence } from '@/hooks/use-mobile-persistence';
import 'xterm/css/xterm.css';

interface MobileTerminalProps {
  projectId: string | number; // Support both UUID strings and numeric IDs
  sessionId?: string;
  className?: string;
}

export function MobileTerminal({ 
  projectId, 
  sessionId,
  className 
}: MobileTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const commandBufferRef = useRef<string>(''); // Shared command buffer
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [canPaste, setCanPaste] = useState(false);
  const [currentLine, setCurrentLine] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const { toast } = useToast();
  
  // Persistent terminal history
  const { history, addToHistory } = useTerminalHistoryPersistence(projectId);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance with mobile-optimized settings
    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13, // Slightly larger for mobile
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      lineHeight: 1.4,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      scrollback: 1000,
      convertEol: true,
      disableStdin: false,
      allowProposedApi: true,
    });

    // Fit addon for responsive sizing
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    
    // Open terminal
    terminal.open(terminalRef.current);
    fitAddon.fit();

    // Store refs
    termInstanceRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Connect to WebSocket backend
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/terminal/ws?projectId=${projectId}`;
    let ws: WebSocket;
    
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('[MobileTerminal] WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'output') {
            terminal.write(message.data);
          } else if (message.type === 'error') {
            terminal.writeln(`\r\n\x1b[31mError: ${message.error}\x1b[0m\r\n$ `);
          }
        } catch (error) {
          console.error('[MobileTerminal] Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[MobileTerminal] WebSocket error:', error);
        terminal.writeln('\r\n\x1b[31mTerminal connection error. Please refresh.\x1b[0m\r\n');
      };
      
      ws.onclose = () => {
        console.log('[MobileTerminal] WebSocket disconnected');
        terminal.writeln('\r\n\x1b[33mTerminal disconnected. Please refresh.\x1b[0m\r\n');
      };
      
    } catch (error) {
      console.error('[MobileTerminal] Failed to create WebSocket:', error);
      terminal.writeln('\x1b[31mFailed to connect to terminal.\x1b[0m\r\n');
      terminal.writeln('Type commands below (local mode - commands will not execute).\r\n$ ');
    }

    // Handle terminal input with WebSocket
    terminal.onData((data) => {
      // Auto-scroll to bottom on input
      terminal.scrollToBottom();
      
      // Send input to WebSocket backend
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'input',
          data
        }));
      }
      
      // Handle enter key locally for history tracking
      if (data === '\r') {
        // Add non-empty commands to history
        if (commandBufferRef.current.trim()) {
          addToHistory(commandBufferRef.current.trim());
        }
        
        // Reset for next command
        commandBufferRef.current = '';
        setHistoryIndex(-1);
        return;
      }
      
      // Handle backspace
      if (data === '\x7F') {
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1);
        }
        return;
      }
      
      // Handle regular characters
      if (data >= ' ' && data <= '~') {
        commandBufferRef.current += data;
      }
    });

    // Send terminal resize to backend
    const handleResize = () => {
      fitAddon.fit();
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        const { cols, rows } = terminal;
        ws.send(JSON.stringify({
          type: 'resize',
          cols,
          rows
        }));
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      terminal.dispose();
    };
  }, [projectId, sessionId, addToHistory]);

  // Keyboard toolbar actions - Use paste() to trigger onData event
  const sendToTerminal = (text: string) => {
    termInstanceRef.current?.paste(text);
    termInstanceRef.current?.scrollToBottom();
  };

  const handleTab = () => sendToTerminal('\t');
  const handleEnter = () => sendToTerminal('\r');
  const handleEscape = () => sendToTerminal('\x1B');
  const handleBackspace = () => sendToTerminal('\x7F');
  
  // Navigate backward in command history
  const handleArrowUp = () => {
    if (history.length > 0) {
      const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
      if (newIndex >= 0 && newIndex < history.length) {
        setHistoryIndex(newIndex);
        const command = history[history.length - 1 - newIndex];
        
        // Clear current input buffer
        const clearLength = commandBufferRef.current.length;
        for (let i = 0; i < clearLength; i++) {
          sendToTerminal('\x7F'); // Send backspace for each character
        }
        
        // Update command buffer
        commandBufferRef.current = command;
        setCurrentLine(command);
        
        // Send recalled command characters through terminal (triggers WebSocket)
        sendToTerminal(command);
      }
    }
  };
  
  // Navigate forward in command history
  const handleArrowDown = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const command = history[history.length - 1 - newIndex];
      
      // Clear current input buffer
      const clearLength = commandBufferRef.current.length;
      for (let i = 0; i < clearLength; i++) {
        sendToTerminal('\x7F'); // Send backspace for each character
      }
      
      // Update command buffer
      commandBufferRef.current = command;
      setCurrentLine(command);
      
      // Send recalled command characters through terminal (triggers WebSocket)
      sendToTerminal(command);
    } else if (historyIndex === 0) {
      // Back to empty line
      setHistoryIndex(-1);
      
      // Clear current input buffer
      const clearLength = commandBufferRef.current.length;
      for (let i = 0; i < clearLength; i++) {
        sendToTerminal('\x7F'); // Send backspace for each character
      }
      
      // Update command buffer
      commandBufferRef.current = '';
      setCurrentLine('');
    }
  };
  
  const handleArrowLeft = () => sendToTerminal('\x1B[D');
  const handleArrowRight = () => sendToTerminal('\x1B[C');
  
  const handleCtrlC = () => sendToTerminal('\x03'); // Ctrl+C
  const handleCtrlD = () => sendToTerminal('\x04'); // Ctrl+D

  // Copy selected text
  const handleCopy = async () => {
    const selection = termInstanceRef.current?.getSelection();
    if (selection) {
      try {
        await navigator.clipboard.writeText(selection);
        toast({
          title: 'Copied',
          description: 'Terminal output copied to clipboard',
        });
      } catch (error) {
        toast({
          title: 'Copy failed',
          description: 'Failed to copy to clipboard',
          variant: 'destructive',
        });
      }
    }
  };

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      sendToTerminal(text);
      toast({
        title: 'Pasted',
        description: 'Text pasted into terminal',
      });
    } catch (error) {
      toast({
        title: 'Paste failed',
        description: 'Failed to read from clipboard',
        variant: 'destructive',
      });
    }
  };

  // Check clipboard permissions
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const permission = await navigator.permissions.query({ 
          name: 'clipboard-read' as PermissionName 
        });
        setCanPaste(permission.state === 'granted' || permission.state === 'prompt');
      } catch {
        // Fallback: assume paste is available
        setCanPaste(true);
      }
    };
    checkClipboard();
  }, []);

  // Clear terminal
  const handleClear = () => {
    termInstanceRef.current?.clear();
    termInstanceRef.current?.write('$ ');
  };

  return (
    <div className={cn('flex flex-col h-full bg-[#1e1e1e]', className)}>
      {/* Mobile Terminal Keyboard Toolbar */}
      {showKeyboard && (
        <div 
          className="flex-shrink-0 border-b border-[#3e3e42] bg-[#252526] overflow-x-auto mobile-hide-scrollbar"
          data-testid="mobile-terminal-keyboard-toolbar"
        >
          <div className="flex items-center gap-1 p-2 min-w-max">
            {/* Control Keys */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-xs font-mono hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
              onClick={handleTab}
              data-testid="mobile-terminal-tab"
            >
              Tab
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-xs font-mono hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
              onClick={handleEscape}
              data-testid="mobile-terminal-esc"
            >
              Esc
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-xs font-mono hover:bg-[#3e3e42] active:scale-95 touch-manipulation flex items-center gap-1"
              onClick={handleCtrlC}
              data-testid="mobile-terminal-ctrl-c"
            >
              <Command className="h-3 w-3" />
              <span>C</span>
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-xs font-mono hover:bg-[#3e3e42] active:scale-95 touch-manipulation flex items-center gap-1"
              onClick={handleCtrlD}
              data-testid="mobile-terminal-ctrl-d"
            >
              <Command className="h-3 w-3" />
              <span>D</span>
            </Button>

            <div className="w-px h-6 bg-[#3e3e42]" />

            {/* Arrow Keys */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
              onClick={handleArrowUp}
              data-testid="mobile-terminal-arrow-up"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
              onClick={handleArrowDown}
              data-testid="mobile-terminal-arrow-down"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
              onClick={handleArrowLeft}
              data-testid="mobile-terminal-arrow-left"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
              onClick={handleArrowRight}
              data-testid="mobile-terminal-arrow-right"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-[#3e3e42]" />

            {/* Text Operations */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
              onClick={handleEnter}
              data-testid="mobile-terminal-enter"
            >
              <CornerDownLeft className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
              onClick={handleBackspace}
              data-testid="mobile-terminal-backspace"
            >
              <Delete className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-[#3e3e42]" />

            {/* Clipboard */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
              onClick={handleCopy}
              data-testid="mobile-terminal-copy"
            >
              <Copy className="h-4 w-4" />
            </Button>
            
            {canPaste && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
                onClick={handlePaste}
                data-testid="mobile-terminal-paste"
              >
                <Clipboard className="h-4 w-4" />
              </Button>
            )}

            <div className="w-px h-6 bg-[#3e3e42]" />

            {/* Clear */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-3 text-xs hover:bg-[#3e3e42] active:scale-95 touch-manipulation"
              onClick={handleClear}
              data-testid="mobile-terminal-clear"
            >
              Clear
            </Button>

            {/* Hide toolbar */}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-[#3e3e42] active:scale-95 touch-manipulation ml-auto"
              onClick={() => setShowKeyboard(false)}
              data-testid="mobile-terminal-hide-toolbar"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Show toolbar floating button when hidden */}
      {!showKeyboard && (
        <motion.div
          className="absolute top-2 right-2 z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <Button
            size="sm"
            variant="default"
            className="h-9 w-9 rounded-full shadow-lg bg-[#F26207] hover:bg-[#F26207]/90 active:scale-95 touch-manipulation"
            onClick={() => setShowKeyboard(true)}
            data-testid="mobile-terminal-show-toolbar"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Terminal Container */}
      <div 
        ref={terminalRef} 
        className="flex-1 min-h-0 p-2 overflow-auto"
        data-testid="mobile-terminal-container"
      />
    </div>
  );
}
