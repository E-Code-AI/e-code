import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { spawn, ChildProcess } from 'child_process';
import { log } from './vite';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { storage } from './storage';
import { File } from '@shared/schema';

// Map to store terminal processes by projectId
const terminalProcesses = new Map<number, {
  process: ChildProcess | null;
  clients: Set<WebSocket>;
}>();

// Setup the terminal WebSocket server
export function setupTerminalWebsocket(server: Server) {
  const wss = new WebSocketServer({
    server,
    path: '/terminal'
  });
  
  log('Setting up terminal WebSocket server', 'terminal');
  
  wss.on('connection', async (ws, req) => {
    try {
      // Get the project ID from query params
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const projectId = parseInt(url.searchParams.get('projectId') || '');
      
      if (isNaN(projectId)) {
        ws.close(1008, 'Missing or invalid projectId');
        return;
      }
      
      log(`Terminal connection established for project ${projectId}`, 'terminal');
      
      // Create terminal info entry if it doesn't exist
      if (!terminalProcesses.has(projectId)) {
        terminalProcesses.set(projectId, {
          process: null,
          clients: new Set()
        });
      }
      
      const terminalInfo = terminalProcesses.get(projectId)!;
      terminalInfo.clients.add(ws);
      
      // Start the process if it's not already running
      if (!terminalInfo.process) {
        startProcess(projectId, terminalInfo);
      }
      
      // Handle messages from the client
      ws.on('message', (message) => {
        try {
          if (!terminalInfo.process) {
            // Try to restart the process if it's not running
            startProcess(projectId, terminalInfo);
            return;
          }
          
          const data = JSON.parse(message.toString());
          
          if (data.type === 'input') {
            // Send input to the terminal process
            terminalInfo.process.stdin?.write(data.data);
          } else if (data.type === 'resize') {
            // Handle terminal resize
            if (terminalInfo.process && terminalInfo.process.stdin) {
              // Note: The actual resize handling would be implemented here
              // For pty.js or node-pty, you would use something like:
              // terminalInfo.process.resize(data.cols, data.rows);
              // This requires a proper PTY implementation
            }
          }
        } catch (error) {
          log(`Error handling terminal message: ${error}`, 'terminal');
        }
      });
      
      // Handle client disconnect
      ws.on('close', () => {
        log(`Terminal client disconnected for project ${projectId}`, 'terminal');
        
        if (terminalInfo.clients) {
          terminalInfo.clients.delete(ws);
          
          // If no clients left, terminate the process
          if (terminalInfo.clients.size === 0) {
            stopProcess(projectId, terminalInfo);
          }
        }
      });
      
      // Send initial connection message
      ws.send(JSON.stringify({
        type: 'connected',
        data: `Connected to terminal for project ${projectId}`
      }));
      
    } catch (error) {
      log(`Error setting up terminal WebSocket: ${error}`, 'terminal');
      ws.close(1011, 'Internal error');
    }
  });
  
  return wss;
}

// Start a terminal process for a project
async function startProcess(projectId: number, terminalInfo: { process: ChildProcess | null, clients: Set<WebSocket> }) {
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
    const files = await storage.getFilesByProject(projectId);
    
    // Create a temporary directory for the project
    const projectDir = await createProjectDir(project, files);
    
    log(`Starting terminal process for project ${projectId} in ${projectDir}`, 'terminal');
    
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
      log(`Terminal process exited with code ${code} for project ${projectId}`, 'terminal');
      
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
    log(`Error starting terminal process: ${error}`, 'terminal');
    
    broadcastToClients(terminalInfo.clients, {
      type: 'error',
      data: `Failed to start terminal: ${error}`
    });
    
    terminalInfo.process = null;
  }
}

// Stop a terminal process
function stopProcess(projectId: number, terminalInfo: { process: ChildProcess | null, clients: Set<WebSocket> }) {
  if (terminalInfo.process) {
    log(`Stopping terminal process for project ${projectId}`, 'terminal');
    
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
  type: 'output' | 'connected' | 'error' | 'exit' | 'started' | 'stopped';
  data: string;
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
async function createProjectDir(project: { id: number }, files: File[]): Promise<string> {
  const projectDir = path.join(os.tmpdir(), `plot-terminal-${project.id}`);
  
  try {
    // Create directory if it doesn't exist
    await fs.promises.mkdir(projectDir, { recursive: true });
    
    // Write all files to the directory
    for (const file of files) {
      if (file.isFolder) {
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
    log(`Error creating project directory: ${error}`, 'terminal');
    throw error;
  }
}