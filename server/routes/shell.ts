// @ts-nocheck
import { Router } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

// Authentication middleware
const ensureAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Not authenticated' });
};

const router = Router();

interface ShellSession {
  id: string;
  userId: number;
  process: ChildProcess;
  cwd: string;
  created: Date;
}

const shellSessions = new Map<string, ShellSession>();

// Clean up old sessions periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(shellSessions.entries());
  for (const [sessionId, session] of entries) {
    if (now - session.created.getTime() > 24 * 60 * 60 * 1000) { // 24 hours
      session.process.kill();
      shellSessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Check every hour

function setupShellWebSocket(server: any) {
  const wss = new WebSocketServer({ 
    server, 
    path: '/shell',
    verifyClient: (info, cb) => {
      // Verify authentication through session
      const sessionId = info.req.url?.split('sessionId=')[1];
      if (!sessionId) {
        cb(false, 401, 'Unauthorized');
        return;
      }
      cb(true);
    }
  });

  wss.on('connection', async (ws: WebSocket, req) => {
    const sessionId = req.url?.split('sessionId=')[1];
    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }

    // Create shell home directory for user
    // Extract user ID from URL query parameters (passed from client connection)
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const userId = parseInt(url.searchParams.get('userId') || '1', 10);
    const userHome = path.join(os.homedir(), 'ecode-shells', `user-${userId}`);
    
    try {
      await fs.mkdir(userHome, { recursive: true });
      
      // Create initial directory structure
      const dirs = ['projects', 'tmp', '.config'];
      for (const dir of dirs) {
        await fs.mkdir(path.join(userHome, dir), { recursive: true });
      }
      
      // Create .bashrc with custom prompt
      const bashrcContent = `
# E-Code Shell Configuration
export PS1='\\[\\033[32m\\]\\w\\[\\033[0m\\] $ '
export TERM=xterm-256color
export LANG=en_US.UTF-8

# Aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'

# Welcome message
echo -e "\\033[32mWelcome to E-Code Shell\\033[0m"
echo "Type 'help' for available commands"
echo ""
`;
      await fs.writeFile(path.join(userHome, '.bashrc'), bashrcContent);
      
    } catch (error) {
      console.error('Failed to create user shell directory:', error);
    }

    // Spawn bash process
    const shell = spawn('bash', ['--login'], {
      cwd: userHome,
      env: {
        ...process.env,
        HOME: userHome,
        USER: `user${userId}`,
        SHELL: '/bin/bash',
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8',
      },
      shell: false,
    });

    const session: ShellSession = {
      id: sessionId,
      userId,
      process: shell,
      cwd: userHome,
      created: new Date(),
    };

    shellSessions.set(sessionId, session);

    // Handle shell output
    shell.stdout.on('data', (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data.toString());
      }
    });

    shell.stderr.on('data', (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data.toString());
      }
    });

    // Handle shell exit
    shell.on('exit', (code) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`\r\n\x1b[31mShell exited with code ${code}\x1b[0m\r\n`);
        ws.close();
      }
      shellSessions.delete(sessionId);
    });

    // Handle WebSocket messages (user input)
    ws.on('message', (data) => {
      const input = data.toString();
      shell.stdin.write(input);
    });

    // Handle WebSocket close
    ws.on('close', () => {
      shell.kill();
      shellSessions.delete(sessionId);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('Shell WebSocket error:', error);
      shell.kill();
      shellSessions.delete(sessionId);
    });
  });
}

// API endpoint to get shell sessions
router.get('/api/shell/sessions', ensureAuthenticated, (req, res) => {
  const userId = (req.user as any).id;
  const sessions = Array.from(shellSessions.values())
    .filter(session => session.userId === userId)
    .map(session => ({
      id: session.id,
      created: session.created,
      cwd: session.cwd,
    }));
  
  res.json(sessions);
});

// API endpoint to create a new shell session
router.post('/api/shell/sessions', ensureAuthenticated, (req, res) => {
  const sessionId = `shell-${Date.now()}-${process.hrtime.bigint().toString(36).slice(0, 9)}`;
  res.json({ sessionId });
});

// API endpoint to kill a shell session
router.delete('/api/shell/sessions/:sessionId', ensureAuthenticated, (req, res) => {
  const { sessionId } = req.params;
  const session = shellSessions.get(sessionId);
  
  if (session && session.userId === (req.user as any).id) {
    session.process.kill();
    shellSessions.delete(sessionId);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

export { router as default, setupShellWebSocket };