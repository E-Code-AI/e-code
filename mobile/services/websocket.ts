// Mobile WebSocket Client Service
import io from 'socket.io-client';

const WS_BASE = 'ws://localhost:5000';

class MobileWebSocketService {
  private terminalSocket: any = null;
  private aiSocket: any = null;
  private collaborationSocket: any = null;

  // Connect to terminal WebSocket
  connectTerminal(projectId: string, onOutput: (data: any) => void) {
    this.terminalSocket = io(`${WS_BASE}/terminal`);
    
    this.terminalSocket.on('connect', () => {
      console.log('[Terminal] Connected to WebSocket');
    });
    
    this.terminalSocket.on('output', onOutput);
    
    this.terminalSocket.on('error', (error: any) => {
      console.error('[Terminal] WebSocket error:', error);
    });
    
    return this.terminalSocket;
  }

  // Send terminal command
  sendCommand(command: string, projectId: string) {
    if (this.terminalSocket) {
      this.terminalSocket.emit('command', { command, projectId });
    }
  }

  // Connect to AI assistant WebSocket
  connectAI(projectId: string, onMessage: (data: any) => void) {
    this.aiSocket = io(`${WS_BASE}/ai`);
    
    this.aiSocket.on('connect', () => {
      console.log('[AI] Connected to WebSocket');
    });
    
    this.aiSocket.on('ai-streaming', onMessage);
    this.aiSocket.on('ai-response', onMessage);
    
    return this.aiSocket;
  }

  // Send AI message
  sendAIMessage(message: string, projectId: string) {
    if (this.aiSocket) {
      this.aiSocket.emit('message', { message, projectId });
    }
  }

  // Connect to collaboration WebSocket
  connectCollaboration(projectId: string, callbacks: {
    onUserJoined?: (data: any) => void;
    onCodeUpdate?: (data: any) => void;
    onCursorUpdate?: (data: any) => void;
  }) {
    this.collaborationSocket = io(`${WS_BASE}/collaboration`);
    
    this.collaborationSocket.on('connect', () => {
      console.log('[Collaboration] Connected to WebSocket');
      this.collaborationSocket.emit('join-project', projectId);
    });
    
    if (callbacks.onUserJoined) {
      this.collaborationSocket.on('user-joined', callbacks.onUserJoined);
    }
    if (callbacks.onCodeUpdate) {
      this.collaborationSocket.on('code-update', callbacks.onCodeUpdate);
    }
    if (callbacks.onCursorUpdate) {
      this.collaborationSocket.on('cursor-update', callbacks.onCursorUpdate);
    }
    
    return this.collaborationSocket;
  }

  // Send code change
  sendCodeChange(projectId: string, data: any) {
    if (this.collaborationSocket) {
      this.collaborationSocket.emit('code-change', { projectId, ...data });
    }
  }

  // Send cursor position
  sendCursorPosition(projectId: string, position: any) {
    if (this.collaborationSocket) {
      this.collaborationSocket.emit('cursor-move', { projectId, position });
    }
  }

  // Disconnect all sockets
  disconnectAll() {
    if (this.terminalSocket) {
      this.terminalSocket.disconnect();
      this.terminalSocket = null;
    }
    if (this.aiSocket) {
      this.aiSocket.disconnect();
      this.aiSocket = null;
    }
    if (this.collaborationSocket) {
      this.collaborationSocket.disconnect();
      this.collaborationSocket = null;
    }
  }
}

export const websocketService = new MobileWebSocketService();
export default websocketService;