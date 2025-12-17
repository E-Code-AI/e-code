import { Router } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { ensureAuthenticated } from '../middleware/auth';
import { centralUpgradeDispatcher } from '../websocket/central-upgrade-dispatcher';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { createLogger } from '../utils/logger';

const logger = createLogger('shell-router');
const router = Router();

interface ShellSession {
  id: string;
  userId: number;
  process: ChildProcess;
  cwd: string;
  created: Date;
}

const shellSessions = new Map<string, ShellSession>();

// WebSocket server for shell connections (noServer mode)
let shellWss: WebSocketServer | null = null;

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

/**
 * Initialize shell WebSocket with central dispatcher
 * Uses noServer mode for integration with central upgrade handler
 */
function initializeShellWebSocket() {
  if (shellWss) return;
  
  shellWss = new WebSocketServer({ noServer: true });
  
  // Handle new connections
  shellWss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    const userId = parseInt(url.searchParams.get('userId') || '1', 10);
    
    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }

    // Create shell home directory for user
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
export PS1='\\[\\033[34m\\]~/workspace\\[\\033[0m\\] $ '
export TERM=xterm-256color
export LANG=en_US.UTF-8

# Aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'

# Welcome message
echo -e "\\033[32m● Connected to E-Code Shell\\033[0m"
echo ""
`;
      await fs.writeFile(path.join(userHome, '.bashrc'), bashrcContent);
      
    } catch (error) {
      logger.error('Failed to create user shell directory:', error);
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
      logger.error('Shell WebSocket error:', error);
      shell.kill();
      shellSessions.delete(sessionId);
    });
  });
  
  // Register with central upgrade dispatcher
  centralUpgradeDispatcher.register(
    '/shell',
    (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      shellWss!.handleUpgrade(req, socket, head, (ws) => {
        shellWss!.emit('connection', ws, req);
      });
    },
    { pathMatch: 'exact', priority: 35 }
  );
  
  logger.info('[Shell] WebSocket service initialized at /shell');
}

// Initialize immediately when module loads
initializeShellWebSocket();

// API endpoint to get shell sessions
router.get('/sessions', ensureAuthenticated, (req, res) => {
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
router.post('/sessions', ensureAuthenticated, (req, res) => {
  const sessionId = `shell-${Date.now()}-${process.hrtime.bigint().toString(36).slice(0, 9)}`;
  res.json({ sessionId });
});

// API endpoint to kill a shell session
router.delete('/sessions/:sessionId', ensureAuthenticated, (req, res) => {
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

// API endpoint to generate shell command with AI
router.post('/generate-command', ensureAuthenticated, async (req, res) => {
  try {
    const { prompt, projectId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Use OpenAI to generate shell command
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a shell command generator. Given a natural language description, output ONLY the shell command that accomplishes the task. No explanations, no markdown, just the raw command. The command should work in a bash shell on Linux. Be concise and accurate.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    const command = completion.choices[0]?.message?.content?.trim() || '';
    
    res.json({ command, prompt });
  } catch (error) {
    logger.error('Shell command generation error:', error);
    res.status(500).json({ error: 'Failed to generate command' });
  }
});

// API endpoint to clear shell output (reset session buffer)
router.post('/clear', ensureAuthenticated, (req, res) => {
  const { sessionId } = req.body;
  // Clear is handled client-side, just acknowledge
  res.json({ success: true, sessionId });
});

export default router;
