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
import { safePath } from '../utils/safe-path';
import { storage } from '../storage';

const logger = createLogger('shell-router');
const router = Router();

// SECURITY FIX C-03: Shell session limits and idle timeout
const MAX_SESSIONS_PER_USER = 5;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes idle timeout (was 24 hours)
const SESSION_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes (was 1 hour)

interface ShellSession {
  id: string;
  userId: number;
  process: ChildProcess;
  cwd: string;
  created: Date;
  lastActivity: Date; // SECURITY FIX T-02: Track last activity for idle timeout
}

const shellSessions = new Map<string, ShellSession>();
const projectSyncCache = new Map<string, number>(); // projectId -> last sync timestamp
const SHELL_SYNC_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// WebSocket server for shell connections (noServer mode)
let shellWss: WebSocketServer | null = null;

// SECURITY FIX T-02: Clean up idle sessions more aggressively (30 min idle, check every 5 min)
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(shellSessions.entries());
  for (const [sessionId, session] of entries) {
    const idleTime = now - session.lastActivity.getTime();
    if (idleTime > SESSION_IDLE_TIMEOUT_MS) {
      logger.info(`[Shell] Closing idle session ${sessionId} (idle ${Math.round(idleTime / 1000)}s)`);
      session.process.kill();
      shellSessions.delete(sessionId);
    }
  }
}, SESSION_CLEANUP_INTERVAL_MS);

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
    const projectId = url.searchParams.get('projectId');
    
    // SECURITY FIX #20: Get authenticated userId from request, not query params
    // The userId must come from authenticated session, not client-supplied params
    const authenticatedUser = (req as any).user;
    const userId = authenticatedUser?.id;
    
    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }

    // SECURITY FIX #20: Require authenticated user
    if (!userId || !Number.isInteger(userId) || userId < 0) {
      ws.close(1008, 'Authentication required');
      return;
    }

    // SECURITY FIX T-01: Enforce per-user session limit
    const userSessionCount = Array.from(shellSessions.values()).filter(s => s.userId === userId).length;
    if (userSessionCount >= MAX_SESSIONS_PER_USER) {
      ws.close(1008, `Too many shell sessions (max ${MAX_SESSIONS_PER_USER}). Close an existing session first.`);
      return;
    }

    // SECURITY FIX #20: Validate project ownership if projectId provided
    if (projectId) {
      try {
        const { storage } = await import('../storage');
        const project = await storage.getProject(projectId);
        if (!project || project.ownerId !== userId) {
          ws.close(1008, 'Access denied: You do not own this project');
          return;
        }
      } catch (error) {
        logger.error('Failed to validate project ownership:', error);
        ws.close(1008, 'Project validation failed');
        return;
      }
    }

    // Create shell home directory for user with path traversal protection
    const shellsBaseDir = path.join(os.homedir(), 'ecode-shells');
    const userHome = safePath(shellsBaseDir, `user-${userId}`);
    
    if (!userHome) {
      ws.close(1008, 'Invalid path');
      return;
    }
    
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
export PS1='\\[\\033[1;34m\\]\\w\\[\\033[0m\\]$ '
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

    // Determine the working directory: sync project files from DB to /tmp
    let shellCwd = userHome;
    if (projectId) {
      const baseDir = path.join(os.tmpdir(), 'e-code-terminals');
      const projectDir = path.join(baseDir, `project-${projectId}`);
      try {
        await fs.mkdir(projectDir, { recursive: true });
        const lastSync = projectSyncCache.get(String(projectId)) || 0;
        const now = Date.now();
        if (now - lastSync >= SHELL_SYNC_CACHE_TTL_MS) {
          const projectFiles = await storage.getFilesByProjectId(String(projectId));
          if (projectFiles && projectFiles.length > 0) {
            for (const file of projectFiles) {
              const filePath = path.join(projectDir, (file as any).path || (file as any).name || '');
              if (!filePath.startsWith(projectDir)) continue;
              const fileDir = path.dirname(filePath);
              if ((file as any).isDirectory) {
                await fs.mkdir(filePath, { recursive: true });
              } else {
                await fs.mkdir(fileDir, { recursive: true });
                await fs.writeFile(filePath, (file as any).content || '', 'utf8');
              }
            }
            projectSyncCache.set(String(projectId), Date.now());
            logger.info(`[Shell] Synced ${projectFiles.length} files for project ${projectId}`);
          }
        } else {
          logger.info(`[Shell] Skipping sync for project ${projectId} (cached ${Math.round((now - lastSync) / 1000)}s ago)`);
        }
        shellCwd = projectDir;
      } catch (syncErr) {
        logger.warn(`[Shell] Could not sync project files, using userHome: ${syncErr}`);
      }
    }

    // SECURITY FIX C-03/S-07: Spawn bash with MINIMAL safe environment
    // CRITICAL: Do NOT spread process.env — it exposes DATABASE_URL, JWT_SECRET,
    // STRIPE_SECRET_KEY, and all server secrets to the user shell.
    // Only include safe, non-sensitive variables needed for shell operation.
    const safeEnv: Record<string, string> = {
      HOME: shellCwd,
      USER: `user${userId}`,
      SHELL: '/bin/bash',
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      // Provide a safe PATH with only standard system directories
      PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      // Node.js and common runtimes (if installed)
      NODE_PATH: '/usr/local/lib/node_modules',
      // Prevent npm/node from leaking host info
      npm_config_prefix: path.join(shellCwd, '.npm-global'),
      TMPDIR: path.join(shellCwd, 'tmp'),
      // Identify this as an E-Code sandbox shell
      ECODE_SHELL: '1',
      ECODE_USER_ID: String(userId),
      ECODE_PROJECT_ID: projectId || '',
    };

    const shell = spawn('bash', ['--login'], {
      cwd: shellCwd,
      env: safeEnv,
      shell: false,
    });

    const now = new Date();
    const session: ShellSession = {
      id: sessionId,
      userId,
      process: shell,
      cwd: shellCwd,
      created: now,
      lastActivity: now, // SECURITY FIX T-02: Initialize last activity
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
      // SECURITY FIX T-02: Update last activity timestamp on every input
      session.lastActivity = new Date();
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
      model: 'gpt-4.1-nano',
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
