import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { spawn, ChildProcess } from 'child_process';
import { log } from './vite';

// Store active terminal processes
const terminalProcesses = new Map<number, {
  process: ChildProcess | null;
  clients: Set<WebSocket>;
}>();

export function setupTerminalWebsocket(server: Server) {
  const wss = new WebSocketServer({ 
    server, 
    path: '/terminal'
  });
  
  wss.on('connection', (ws, req) => {
    // Extract project ID from URL path
    const match = req.url?.match(/\/terminal\/(\d+)/);
    const projectId = match ? parseInt(match[1]) : null;
    
    if (!projectId) {
      ws.close(1008, 'Invalid project ID');
      return;
    }
    
    // Get or create terminal info for this project
    let terminalInfo = terminalProcesses.get(projectId);
    
    if (!terminalInfo) {
      terminalInfo = {
        process: null,
        clients: new Set()
      };
      terminalProcesses.set(projectId, terminalInfo);
    }
    
    // Add this client to the set
    terminalInfo.clients.add(ws);
    
    // Send status update to client
    ws.send(JSON.stringify({
      type: 'status',
      running: !!terminalInfo.process
    }));
    
    log(`Terminal client connected for project ${projectId}`);
    
    // Handle messages from client
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'input' && terminalInfo?.process && terminalInfo.process.stdin) {
          // Send input to the running process
          terminalInfo.process.stdin.write(data.content);
        }
        else if (data.type === 'command' && terminalInfo) {
          // Handle commands
          if (data.action === 'run') {
            startProcess(projectId, terminalInfo);
          }
          else if (data.action === 'stop') {
            stopProcess(projectId, terminalInfo);
          }
        }
      } catch (error) {
        log(`Error processing terminal message: ${error}`, 'terminal');
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      if (terminalInfo) {
        terminalInfo.clients.delete(ws);
        
        // If no clients left, stop the process
        if (terminalInfo.clients.size === 0 && terminalInfo.process) {
          stopProcess(projectId, terminalInfo);
        }
      }
      log(`Terminal client disconnected for project ${projectId}`);
    });
  });
  
  return wss;
}

// Start a new process for the project
function startProcess(projectId: number, terminalInfo: { process: ChildProcess | null, clients: Set<WebSocket> }) {
  // Kill existing process if any
  if (terminalInfo.process) {
    stopProcess(projectId, terminalInfo);
  }
  
  try {
    // Spawn a new shell process
    const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';
    const args = process.platform === 'win32' ? ['/C'] : [];
    
    const proc = spawn(shell, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color'
      },
      shell: true
    });
    
    terminalInfo.process = proc;
    
    // Notify all clients that process is running
    broadcastToClients(terminalInfo.clients, {
      type: 'status',
      running: true
    });
    
    // Forward process output to all clients
    proc.stdout.on('data', (data) => {
      broadcastToClients(terminalInfo.clients, {
        type: 'output',
        content: data.toString()
      });
    });
    
    proc.stderr.on('data', (data) => {
      broadcastToClients(terminalInfo.clients, {
        type: 'output',
        content: data.toString()
      });
    });
    
    // Handle process exit
    proc.on('exit', (code) => {
      broadcastToClients(terminalInfo.clients, {
        type: 'output',
        content: `\r\n\x1b[1;31mProcess exited with code ${code}\x1b[0m\r\n`
      });
      
      broadcastToClients(terminalInfo.clients, {
        type: 'status',
        running: false
      });
      
      terminalInfo.process = null;
    });
    
    log(`Started terminal process for project ${projectId}`, 'terminal');
  } catch (error) {
    broadcastToClients(terminalInfo.clients, {
      type: 'output',
      content: `\r\n\x1b[1;31mFailed to start process: ${error}\x1b[0m\r\n`
    });
    log(`Failed to start terminal process: ${error}`, 'terminal');
  }
}

// Stop the process for a project
function stopProcess(projectId: number, terminalInfo: { process: ChildProcess | null, clients: Set<WebSocket> }) {
  if (!terminalInfo.process) return;
  
  try {
    // Send SIGTERM to the process group
    if (process.platform === 'win32') {
      terminalInfo.process.kill();
    } else {
      // On Unix-like systems, kill the entire process group if pid exists
      if (terminalInfo.process.pid) {
        process.kill(-terminalInfo.process.pid, 'SIGTERM');
      }
    }
    
    // Force kill after a timeout if it didn't exit
    setTimeout(() => {
      if (terminalInfo.process) {
        terminalInfo.process.kill('SIGKILL');
      }
    }, 3000);
    
    log(`Stopped terminal process for project ${projectId}`, 'terminal');
  } catch (error) {
    log(`Error stopping terminal process: ${error}`, 'terminal');
  }
}

// Broadcast a message to all clients
function broadcastToClients(clients: Set<WebSocket>, message: any) {
  const messageStr = JSON.stringify(message);
  
  // Convert set to array to avoid the Set iteration error
  Array.from(clients).forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}