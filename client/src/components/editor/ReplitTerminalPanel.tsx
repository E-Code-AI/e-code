import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import {
  Terminal,
  X,
  RotateCcw,
  Copy,
  Maximize2,
  Minimize2,
  Plus,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TerminalMetricsIndicator } from '@/components/terminal/TerminalMetricsIndicator';

interface ReplitTerminalPanelProps {
  projectId?: string;
  className?: string;
}

export function ReplitTerminalPanel({ projectId, className }: ReplitTerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    // Initialize xterm.js
    const term = new XTerm({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
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
        brightWhite: '#e5e5e5'
      },
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      convertEol: true
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();

    // Store refs
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Write welcome message
    term.writeln('\x1b[1;32m🚀 Replit Terminal\x1b[0m');
    term.writeln('');
    term.writeln('Welcome to your project terminal. Type commands to interact with your environment.');
    term.writeln('');
    term.write('$ ');

    // Handle input
    let currentLine = '';
    term.onKey(({ key, domEvent }) => {
      const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;

      if (domEvent.keyCode === 13) { // Enter
        term.write('\r\n');
        if (currentLine.trim()) {
          // Simulate command execution
          simulateCommand(term, currentLine.trim());
        }
        currentLine = '';
        term.write('$ ');
      } else if (domEvent.keyCode === 8) { // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          term.write('\b \b');
        }
      } else if (printable) {
        currentLine += key;
        term.write(key);
      }
    });

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  const simulateCommand = (term: XTerm, command: string) => {
    // Simulate some common commands
    switch (command) {
      case 'ls':
        term.writeln('README.md  package.json  src/  node_modules/  public/');
        break;
      case 'pwd':
        term.writeln('/home/runner/project');
        break;
      case 'git status':
        term.writeln('On branch main');
        term.writeln('Your branch is up to date with \'origin/main\'.');
        term.writeln('');
        term.writeln('nothing to commit, working tree clean');
        break;
      case 'npm run dev':
        term.writeln('> project@1.0.0 dev');
        term.writeln('> vite');
        term.writeln('');
        term.writeln('  VITE v5.0.0  ready in 320 ms');
        term.writeln('');
        term.writeln('  ➜  Local:   \x1b[36mhttp://localhost:5173/\x1b[0m');
        term.writeln('  ➜  Network: use --host to expose');
        break;
      case 'clear':
        term.clear();
        break;
      case 'help':
        term.writeln('Available commands:');
        term.writeln('  ls         - List files and directories');
        term.writeln('  pwd        - Print working directory');
        term.writeln('  git status - Show git status');
        term.writeln('  npm run dev - Start development server');
        term.writeln('  clear      - Clear terminal');
        term.writeln('  help       - Show this help message');
        break;
      default:
        if (command.startsWith('echo ')) {
          term.writeln(command.slice(5));
        } else {
          term.writeln(`bash: ${command}: command not found`);
        }
    }
  };

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.write('$ ');
    }
  };

  const handleReset = () => {
    if (xtermRef.current) {
      xtermRef.current.reset();
      xtermRef.current.writeln('\x1b[1;32m🚀 Replit Terminal\x1b[0m');
      xtermRef.current.writeln('');
      xtermRef.current.write('$ ');
    }
  };

  const handleCopy = () => {
    if (xtermRef.current) {
      const selection = xtermRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
  };

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Header */}
      <div className="h-10 px-3 flex items-center justify-between bg-muted border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Shell</span>
          {/* Fortune 500 Terminal Metrics */}
          <TerminalMetricsIndicator compact data-testid="replit-terminal-panel-metrics" />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={handleCopy}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={handleClear}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={handleReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Terminal */}
      <div
        ref={terminalRef}
        className="flex-1 p-2 bg-background"
      />
    </div>
  );
}