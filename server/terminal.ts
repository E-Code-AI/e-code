import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { storage } from './storage';
import { File } from '@shared/schema';
import readline from 'readline';
import { createLogger } from './utils/logger';
import { ContainerExecutor } from './execution/container-executor';
import { terminalScalabilityManager } from './terminal/scalability-manager';
import { websocketHeartbeatManager } from './terminal/websocket-heartbeat';
import { redisSessionManager, TerminalSession as RedisTerminalSession } from './terminal/redis-session-manager';

// Create a logger for the terminal module
const logger = createLogger('terminal');

// Initialize container executor
const containerExecutor = new ContainerExecutor();
containerExecutor.init().catch(err => {
  logger.error('Failed to initialize container executor:', err);
});

// Map to store terminal sessions by projectId
const terminalSessions = new Map<string, {
  sessionId: string;
  clients: Set<WebSocket>;
  commandHistory: string[];
  autocompleteSuggestions: string[];
  columns?: number;
  rows?: number;
  currentDirectory: string;
  outputBuffer: string;
}>();

// Setup the terminal WebSocket server
export function setupTerminalWebsocket(server: Server) {
  const wss = new WebSocketServer({
    server,
    path: '/api/terminal/ws'
  });
  
  logger.info('Setting up terminal WebSocket server');
  
  wss.on('connection', async (ws, req) => {
    try {
      // Get the project ID from query params
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const projectId = url.searchParams.get('projectId') || '';

      if (!projectId) {
        ws.close(1008, 'Missing or invalid projectId');
        return;
      }

      logger.info(`Terminal connection established for project ${projectId}`);

      // FORTUNE 500 SCALABILITY + PERSISTENCE: Check if we can create a new session
      if (!terminalSessions.has(projectId)) {
        // Use stable sessionId for Redis persistence (not timestamp-based)
        const sessionId = `terminal-${projectId}`;
        
        // Try to restore session from Redis first
        const existingSession = await redisSessionManager.getSession(sessionId);
        
        if (existingSession) {
          logger.info(`Restored session from Redis: ${sessionId}`);
        }
        
        // Register with scalability manager
        if (!terminalScalabilityManager.registerSession(sessionId)) {
          ws.close(1008, 'Server at capacity - maximum terminal sessions reached. Please try again later.');
          return;
        }

        // Check backpressure
        if (terminalScalabilityManager.isUnderBackpressure()) {
          logger.warn(`System under backpressure - ${terminalScalabilityManager.getMetrics().utilizationPercent.toFixed(1)}% capacity`);
        }

        const newSession = {
          sessionId,
          clients: new Set<WebSocket>(),
          commandHistory: existingSession?.commandHistory || [],
          autocompleteSuggestions: [
            'ls', 'cd', 'mkdir', 'touch', 'cat', 'grep', 'find', 'echo',
            'npm', 'node', 'python', 'python3', 'git', 'curl', 'wget',
            'yarn', 'clear', 'exit', 'kill', 'ps', 'cp', 'mv', 'rm'
          ],
          currentDirectory: existingSession?.currentDirectory || `/project/${projectId}`,
          outputBuffer: ''
        };

        terminalSessions.set(projectId, newSession);
        
        // Persist to Redis
        await redisSessionManager.saveSession({
          sessionId,
          projectId,
          commandHistory: newSession.commandHistory,
          currentDirectory: newSession.currentDirectory,
          columns: existingSession?.columns,
          rows: existingSession?.rows,
          createdAt: existingSession?.createdAt || Date.now(),
          lastActivity: Date.now()
        });
      }

      const terminalSession = terminalSessions.get(projectId)!;
      terminalSession.clients.add(ws);
      
      // FORTUNE 500 MONITORING: Register for heartbeat monitoring
      websocketHeartbeatManager.registerClient(ws, terminalSession.sessionId);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'output',
        data: `Welcome to E-Code Terminal\r\nProject: ${projectId}\r\n\r\n$ `
      }));
      
      // Handle messages from the client
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'replace_line') {
            // Atomic replace: clear current line and set new command (prevents race conditions)
            const newCommand = data.command || '';
            const currentBufferLength = terminalSession.outputBuffer.length;
            
            // Clear current buffer
            terminalSession.outputBuffer = '';
            
            // Echo backspaces to clear the visual line
            if (currentBufferLength > 0) {
              const clearSequence = '\b \b'.repeat(currentBufferLength);
              broadcast(projectId, JSON.stringify({
                type: 'output',
                data: clearSequence
              }));
            }
            
            // Set new command in buffer
            terminalSession.outputBuffer = newCommand;
            
            // Echo new command to terminal
            if (newCommand) {
              broadcast(projectId, JSON.stringify({
                type: 'output',
                data: newCommand
              }));
            }
          } else if (data.type === 'input') {
            const input = data.data;
            
            // Process each character in the input
            for (const char of input) {
              // Handle backspace/delete (0x7F)
              if (char === '\x7F' || char === '\b') {
                if (terminalSession.outputBuffer.length > 0) {
                  terminalSession.outputBuffer = terminalSession.outputBuffer.slice(0, -1);
                  // Echo backspace sequence to terminal (move back, space, move back)
                  broadcast(projectId, JSON.stringify({
                    type: 'output',
                    data: '\b \b'
                  }));
                }
              }
              // Handle Enter key
              else if (char === '\r' || char === '\n') {
                const command = terminalSession.outputBuffer.trim();
                terminalSession.outputBuffer = '';
                
                // Echo newline
                broadcast(projectId, JSON.stringify({
                  type: 'output',
                  data: '\r\n'
                }));
                
                if (command) {
                  // Add to history (avoid duplicates)
                  if (terminalSession.commandHistory[terminalSession.commandHistory.length - 1] !== command) {
                    terminalSession.commandHistory.push(command);
                    if (terminalSession.commandHistory.length > 100) {
                      terminalSession.commandHistory.shift();
                    }
                  }
                  
                  // FORTUNE 500 SCALABILITY: Queue command execution via scalability manager
                  await terminalScalabilityManager.queueCommand(
                    terminalSession.sessionId,
                    command,
                    async () => executeCommand(projectId, command)
                  );
                  
                  // Persist session activity to Redis
                  const session = terminalSessions.get(projectId);
                  if (session) {
                    await redisSessionManager.touchSession(session.sessionId);
                  }
                } else {
                  // Empty command, just show prompt
                  broadcast(projectId, JSON.stringify({
                    type: 'output',
                    data: '$ '
                  }));
                }
              }
              // Handle regular printable characters
              else if (char >= ' ' && char <= '~') {
                terminalSession.outputBuffer += char;
                // Echo the character back to terminal
                broadcast(projectId, JSON.stringify({
                  type: 'output',
                  data: char
                }));
              }
            }
          } else if (data.type === 'resize') {
            // Store the terminal dimensions for future reference
            const { cols, rows } = data;
            if (cols && rows) {
              logger.info(`Terminal resize: ${cols}x${rows} for project ${projectId}`);
              
              // Store dimensions in terminal session for potential reconnects
              terminalSession.columns = cols;
              terminalSession.rows = rows;
            }
          } else if (data.type === 'history_up' || data.type === 'history_down') {
            // Send command history to the client
            const index = data.index || 0;
            let historyCommand = '';
            
            if (data.type === 'history_up' && index < terminalSession.commandHistory.length) {
              historyCommand = terminalSession.commandHistory[terminalSession.commandHistory.length - 1 - index];
            } else if (data.type === 'history_down' && index > 0) {
              historyCommand = terminalSession.commandHistory[terminalSession.commandHistory.length - index];
            }
            
            if (historyCommand) {
              ws.send(JSON.stringify({
                type: 'history',
                data: historyCommand,
                index: index
              }));
            }
          } else if (data.type === 'autocomplete') {
            // Handle tab completion
            const currentInput = data.text || '';
            const suggestions = terminalSession.autocompleteSuggestions
              .filter(suggestion => suggestion.startsWith(currentInput))
              .slice(0, 10); // Limit to 10 suggestions
            
            if (suggestions.length > 0) {
              ws.send(JSON.stringify({
                type: 'autocomplete_suggestions',
                data: suggestions
              }));
            }
          }
        } catch (error) {
          logger.error(`Error handling terminal message: ${error}`);
        }
      });
      
      // Handle client disconnect
      ws.on('close', async () => {
        logger.info(`Terminal client disconnected for project ${projectId}`);
        
        const session = terminalSessions.get(projectId);
        if (session) {
          session.clients.delete(ws);
          
          // FORTUNE 500 SCALABILITY + PERSISTENCE: Clean up session if no clients left
          if (session.clients.size === 0) {
            logger.info(`No clients left for project ${projectId}, cleaning up session`);
            
            // Unregister from scalability manager
            terminalScalabilityManager.unregisterSession(session.sessionId);
            
            // Unregister from heartbeat manager
            websocketHeartbeatManager.unregisterClient(ws);
            
            // Delete from Redis (session ended)
            await redisSessionManager.deleteSession(session.sessionId);
            
            terminalSessions.delete(projectId);
          }
        }
      });
      
      // Send initial connection message
      ws.send(JSON.stringify({
        type: 'connected',
        data: `Connected to terminal for project ${projectId}`
      }));
      
    } catch (error) {
      logger.error(`Error setting up terminal WebSocket: ${error}`);
      ws.close(1011, 'Internal error');
    }
  });
  
  return wss;
}

// Start a terminal process for a project
async function startProcess(projectId: string, terminalInfo: { 
  process: ChildProcess | null, 
  clients: Set<WebSocket>,
  commandHistory: string[],
  autocompleteSuggestions: string[],
  columns?: number,
  rows?: number
}) {
  try {
    // Get project details
    const project = await storage.getProject(projectId);
    
    if (!project) {
      broadcastToClients(terminalInfo.clients, {
        type: 'error',
        data: 'Project not found'
      });
      return;
    }
    
    // Get project files to determine the working directory
    const files = await storage.getFilesByProjectId(projectId);
    
    // Create a temporary directory for the project
    const projectDir = await createProjectDir(project, files);
    
    logger.info(`Starting terminal process for project ${projectId} in ${projectDir}`);
    
    // Determine which shell to use based on OS
    const shell = os.platform() === 'win32' ? 'cmd.exe' : 'bash';
    const args = os.platform() === 'win32' ? ['/K', 'cd', projectDir] : [];
    
    // Spawn the process
    const termProcess = spawn(shell, args, {
      cwd: projectDir,
      env: { ...process.env, TERM: 'xterm-256color' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Store the process
    terminalInfo.process = termProcess;
    
    // Apply terminal dimensions if they were previously set
    if (terminalInfo.columns && terminalInfo.rows && termProcess.stdin) {
      try {
        const sttyCommand = `stty cols ${terminalInfo.columns} rows ${terminalInfo.rows}\n`;
        termProcess.stdin.write(sttyCommand);
      } catch (err) {
        logger.error(`Failed to apply terminal dimensions on start: ${err}`);
      }
    }
    
    // Handle process output
    termProcess.stdout.on('data', (data: Buffer) => {
      broadcastToClients(terminalInfo.clients, {
        type: 'output',
        data: data.toString()
      });
    });
    
    termProcess.stderr.on('data', (data: Buffer) => {
      broadcastToClients(terminalInfo.clients, {
        type: 'output',
        data: data.toString()
      });
    });
    
    // Handle process exit
    termProcess.on('exit', (code: number | null) => {
      logger.info(`Terminal process exited with code ${code} for project ${projectId}`);
      
      broadcastToClients(terminalInfo.clients, {
        type: 'exit',
        data: `Process exited with code ${code}`
      });
      
      terminalInfo.process = null;
    });
    
    // Notify clients that the process has started
    broadcastToClients(terminalInfo.clients, {
      type: 'started',
      data: `Terminal started in ${projectDir}`
    });
    
  } catch (error) {
    logger.error(`Error starting terminal process: ${error}`);
    
    broadcastToClients(terminalInfo.clients, {
      type: 'error',
      data: `Failed to start terminal: ${error}`
    });
    
    terminalInfo.process = null;
  }
}

// Stop a terminal process
function stopProcess(projectId: string, terminalInfo: { 
  process: ChildProcess | null, 
  clients: Set<WebSocket>,
  commandHistory: string[],
  autocompleteSuggestions: string[],
  columns?: number,
  rows?: number
}) {
  if (terminalInfo.process) {
    logger.info(`Stopping terminal process for project ${projectId}`);
    
    // Kill the process
    terminalInfo.process.kill();
    terminalInfo.process = null;
    
    // Notify clients
    broadcastToClients(terminalInfo.clients, {
      type: 'stopped',
      data: 'Terminal stopped'
    });
  }
}

// Message types
interface TerminalMessage {
  type: 'output' | 'connected' | 'error' | 'exit' | 'started' | 'stopped' | 'history' | 'autocomplete_suggestions';
  data: string | string[];
  index?: number;
}

// Broadcast a message to all connected clients
function broadcastToClients(clients: Set<WebSocket>, message: TerminalMessage): void {
  const messageStr = JSON.stringify(message);
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Create a temporary project directory with all project files
async function createProjectDir(project: { id: number | string }, files: File[]): Promise<string> {
  const projectDir = path.join(os.tmpdir(), `plot-terminal-${project.id}`);
  
  try {
    // Create directory if it doesn't exist
    await fs.promises.mkdir(projectDir, { recursive: true });
    
    // Write all files to the directory
    for (const file of files) {
      if (file.isDirectory) {
        await fs.promises.mkdir(path.join(projectDir, file.name), { recursive: true });
      } else {
        await fs.promises.writeFile(
          path.join(projectDir, file.name),
          file.content || '',
          'utf8'
        );
      }
    }
    
    return projectDir;
  } catch (error) {
    logger.error(`Error creating project directory: ${error}`);
    throw error;
  }
}

// Execute a command using the container executor
async function executeCommand(projectId: string, command: string) {
  const session = terminalSessions.get(projectId);
  if (!session) return;
  
  logger.info(`Executing command for project ${projectId}: ${command}`);
  
  try {
    // Handle built-in commands
    if (command === 'clear') {
      broadcast(projectId, JSON.stringify({
        type: 'clear'
      }));
      broadcast(projectId, JSON.stringify({
        type: 'output',
        data: '$ '
      }));
      return;
    }
    
    if (command.startsWith('cd ')) {
      const newDir = command.substring(3).trim();
      if (newDir === '..') {
        const parts = session.currentDirectory.split('/');
        if (parts.length > 2) {
          parts.pop();
          session.currentDirectory = parts.join('/');
        }
      } else if (newDir.startsWith('/')) {
        session.currentDirectory = newDir;
      } else {
        session.currentDirectory = path.join(session.currentDirectory, newDir);
      }
      broadcast(projectId, JSON.stringify({
        type: 'output',
        data: `$ `
      }));
      return;
    }
    
    // Get project info for language detection
    const project = await storage.getProject(projectId);
    const language = project?.language || 'nodejs';
    
    // Execute command in container
    const result = await containerExecutor.execute({
      language,
      code: command,
      timeout: 30000 // 30 second timeout
    });
    
    // Send output
    if (result.stdout) {
      broadcast(projectId, JSON.stringify({
        type: 'output',
        data: result.stdout
      }));
    }
    
    if (result.stderr) {
      broadcast(projectId, JSON.stringify({
        type: 'output',
        data: result.stderr
      }));
    }
    
    // Send prompt
    broadcast(projectId, JSON.stringify({
      type: 'output',
      data: '\r\n$ '
    }));
    
  } catch (error) {
    logger.error(`Failed to execute command for project ${projectId}:`, error);
    broadcast(projectId, JSON.stringify({
      type: 'output',
      data: `\r\nError: ${error}\r\n$ `
    }));
  }
}

// Broadcast message to all connected clients for a project
function broadcast(projectId: string, message: string) {
  const session = terminalSessions.get(projectId);
  if (!session) return;
  
  session.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}