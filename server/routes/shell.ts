import { parse as parseCookie } from 'cookie';
import * as signature from 'cookie-signature';
import { Router } from 'express';
import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import type { IncomingMessage } from 'http';
import * as os from 'os';
import * as path from 'path';
import type { Duplex } from 'stream';
import { WebSocket,WebSocketServer } from 'ws';
import { ensureAuthenticated } from '../middleware/auth';
import { sessionStore,storage } from '../storage';
import { createLogger } from '../utils/logger';
import { bulkSyncProjectFiles,ensureProjectDirectory,getProjectWorkspacePath } from '../utils/project-fs-sync';
import { safePath } from '../utils/safe-path';
import { centralUpgradeDispatcher } from '../websocket/central-upgrade-dispatcher';

const logger = createLogger('shell-router');
const router = Router();

function resolveShellBinary(): string {
  if (process.platform === 'win32') {
    return process.env.COMSPEC || 'powershell.exe';
  }

  const isReplitVm = Boolean(process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT);
  if (isReplitVm) {
    return '/bin/sh';
  }

  const candidateShells = [
    '/nix/store/d6mad4dkf6akii90k26dinhrg8a3xia8-replit-runtime-path/bin/bash',
    '/bin/bash',
    '/bin/sh',
    process.env.SHELL,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidateShells) {
    try {
      if (candidate.startsWith('/') && fsSync.existsSync(candidate)) {
        return candidate;
      }
      if (!candidate.startsWith('/')) {
        return candidate;
      }
    } catch {
      // Ignore and continue to the next candidate.
    }
  }

  return '/bin/sh';
}

function getInteractiveShellArgs(shellBinary: string): string[] {
  const shellName = path.basename(shellBinary).toLowerCase();

  if (shellName.includes('bash')) {
    return ['--noprofile', '--norc', '-i'];
  }

  if (shellName.includes('zsh')) {
    return ['-f', '-i'];
  }

  return ['-i'];
}

function buildShellEnv(userHome: string, userId: number, shellBinary: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
    HOME: userHome,
    PWD: userHome,
    SHELL: shellBinary,
    USER: `user${userId}`,
    LOGNAME: `user${userId}`,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
    TMPDIR: '/tmp',
  };
}

interface ShellSession {
  id: string;
  userId: number;
  process: any;
  cwd: string;
  created: Date;
}

const shellSessions = new Map<string, ShellSession>();
let ptyModule: typeof import('node-pty') | null = null;

export function handleShellClientMessage(
  raw: string,
  shell: { write: (data: string) => void; resize: (cols: number, rows: number) => void }
): 'input' | 'resize' | 'raw' {
  try {
    const message = JSON.parse(raw);

    if (message.type === 'input' && typeof message.data === 'string') {
      shell.write(message.data);
      return 'input';
    }

    if (message.type === 'resize' && Number.isFinite(message.cols) && Number.isFinite(message.rows)) {
      shell.resize(
        Math.max(1, Number(message.cols)),
        Math.max(1, Number(message.rows))
      );
      return 'resize';
    }
  } catch {
    // Fall back to raw writes for legacy clients.
  }

  shell.write(raw);
  return 'raw';
}

async function getPty(): Promise<typeof import('node-pty')> {
  if (!ptyModule) {
    ptyModule = await import('node-pty');
  }
  return ptyModule;
}

async function getAuthenticatedUserIdFromUpgrade(req: IncomingMessage): Promise<number | null> {
  const requestUser = (req as any).user;
  if (Number.isInteger(requestUser?.id)) {
    return requestUser.id;
  }

  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const bootstrapToken = requestUrl.searchParams.get('bootstrap') || requestUrl.searchParams.get('bootstrapToken');
    if (bootstrapToken) {
      const jwt = await import('jsonwebtoken');
      const { getJwtSecret } = await import('../utils/secrets-manager');
      const decoded = jwt.default.verify(bootstrapToken, getJwtSecret()) as {
        type?: string;
        userId?: number;
      };

      if (decoded?.type === 'agent_bootstrap' && Number.isInteger(decoded.userId)) {
        return decoded.userId!;
      }
    }
  } catch (error) {
    logger.debug('Shell bootstrap token validation failed:', error);
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  try {
    const cookies = parseCookie(cookieHeader);
    const rawSessionCookie = cookies['ecode.sid'] || cookies['connect.sid'];
    if (!rawSessionCookie) {
      return null;
    }

    const sessionSecret = process.env.SESSION_SECRET || 'development-secret';
    let sessionId: string | null = null;

    if (rawSessionCookie.startsWith('s:')) {
      const unsigned = signature.unsign(rawSessionCookie.slice(2), sessionSecret);
      if (unsigned !== false) {
        sessionId = unsigned;
      }
    } else {
      sessionId = rawSessionCookie;
    }

    if (!sessionId) {
      return null;
    }

    return await new Promise<number | null>((resolve) => {
      sessionStore.get(sessionId!, (err: any, session: any) => {
        if (err || !session?.passport?.user) {
          resolve(null);
          return;
        }
        const userId = Number(session.passport.user);
        resolve(Number.isInteger(userId) ? userId : null);
      });
    });
  } catch (error) {
    logger.error('Failed to authenticate shell upgrade request:', error);
    return null;
  }
}

async function ensureSpawnCwd(preferredCwd: string, fallbackCwd: string): Promise<string> {
  try {
    await fs.mkdir(preferredCwd, { recursive: true });
    return preferredCwd;
  } catch (error) {
    logger.warn(`Failed to ensure shell cwd ${preferredCwd}, falling back to ${fallbackCwd}: ${error}`);
    await fs.mkdir(fallbackCwd, { recursive: true });
    return fallbackCwd;
  }
}

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
    const projectId = url.searchParams.get('projectId');
    
    // SECURITY FIX #20: Get authenticated userId from request, not query params
    // The userId must come from authenticated session, not client-supplied params
    const userId = await getAuthenticatedUserIdFromUpgrade(req);
    
    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }

    // SECURITY FIX #20: Require authenticated user
    if (!userId || !Number.isInteger(userId) || userId < 0) {
      ws.close(1008, 'Authentication required');
      return;
    }
    
    // SECURITY FIX #20: Validate project access if projectId provided
    if (projectId) {
      try {
        const { storage } = await import('../storage');
        const project = await storage.getProject(projectId);
        const hasAccess = !!project && (
          project.ownerId === userId ||
          await storage.isProjectCollaborator(projectId, userId)
        );
        if (!hasAccess) {
          ws.close(1008, 'Access denied: You do not have access to this project');
          return;
        }
      } catch (error) {
        logger.error('Failed to validate project access:', error);
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
export PS1='Workspace: '
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

    // Determine the working directory: use the canonical project workspace
    let shellCwd = userHome;
    if (projectId) {
      try {
        const projectDir = getProjectWorkspacePath(projectId);
        await ensureProjectDirectory(projectId);
        let shouldBootstrapWorkspace = false;
        try {
          const entries = await fs.readdir(projectDir);
          shouldBootstrapWorkspace = entries.length === 0;
        } catch {
          shouldBootstrapWorkspace = true;
        }

        if (shouldBootstrapWorkspace) {
          const projectFiles = await storage.getFilesByProjectId(String(projectId));
          if (projectFiles && projectFiles.length > 0) {
            await bulkSyncProjectFiles(projectId, projectFiles as any);
            logger.info(`[Shell] Synced ${projectFiles.length} files for project ${projectId}`);
          }
        }
        shellCwd = projectDir;
      } catch (syncErr) {
        logger.warn(`[Shell] Could not sync project files, using userHome: ${syncErr}`);
      }
    }

    shellCwd = await ensureSpawnCwd(shellCwd, userHome);

    const pty = await getPty();
    const shellBinary = resolveShellBinary();
    const shell = pty.spawn(shellBinary, getInteractiveShellArgs(shellBinary), {
      name: 'xterm-256color',
      cwd: shellCwd,
      cols: 120,
      rows: 30,
      env: buildShellEnv(userHome, userId, shellBinary),
    });

    const session: ShellSession = {
      id: sessionId,
      userId,
      process: shell,
      cwd: shellCwd,
      created: new Date(),
    };

    shellSessions.set(sessionId, session);

    shell.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    shell.onExit(({ exitCode }: { exitCode: number }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(`\r\n\x1b[31mShell exited with code ${exitCode}\x1b[0m\r\n`);
        ws.close();
      }
      shellSessions.delete(sessionId);
    });

    // Handle WebSocket messages from xterm.js.
    ws.on('message', (data) => {
      handleShellClientMessage(data.toString(), shell);
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
