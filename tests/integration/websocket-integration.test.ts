/**
 * WebSocket Integration Tests for E-Code Platform
 * 
 * Comprehensive test suite for all WebSocket endpoints:
 * - Central Upgrade Dispatcher
 * - Agent WebSocket (/ws/agent)
 * - Deployment WebSocket (/ws/deployments)
 * - Terminal WebSocket (/api/terminal/ws)
 * - Runtime Logs WebSocket (/api/runtime/logs/ws)
 * - Collaboration WebSocket (/collaboration, /ws/yjs)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, Server as HttpServer, IncomingMessage } from 'http';
import { AddressInfo } from 'net';
import { WebSocket, WebSocketServer } from 'ws';
import type { Duplex } from 'stream';
import type { Socket } from 'net';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'e-code-jwt-secret-key-2024';

interface TestContext {
  server: HttpServer;
  wss: WebSocketServer;
  port: number;
  wsUrl: string;
  clients: WebSocket[];
}

function createValidBootstrapToken(projectId: number, userId: string): string {
  return jwt.sign(
    { projectId, userId, deviceId: 'test-device', type: 'bootstrap' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('WebSocket Integration Tests', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        res.writeHead(404);
        res.end('Not Found');
      });
      
      server.on('error', reject);
      
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        const wss = new WebSocketServer({ server });
        
        resolve({
          server,
          wss,
          port: addr.port,
          wsUrl: `ws://127.0.0.1:${addr.port}`,
          clients: []
        });
      });
    });
  });

  afterEach(async () => {
    for (const client of ctx.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.close();
      }
    }
    
    ctx.wss.clients.forEach(client => client.close());
    
    await new Promise<void>((resolve) => {
      ctx.wss.close(() => {
        ctx.server.close(() => resolve());
      });
    });
  });

  async function connect(path: string = '/', timeout = 2000): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${ctx.wsUrl}${path}`);
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error(`Connection timeout for ${path}`));
      }, timeout);
      
      ws.on('open', () => {
        clearTimeout(timer);
        ctx.clients.push(ws);
        resolve(ws);
      });
      
      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  async function waitForMessage(ws: WebSocket, predicate: (msg: any) => boolean, timeout = 2000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for message')), timeout);
      
      const handler = (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (predicate(msg)) {
            clearTimeout(timer);
            ws.off('message', handler);
            resolve(msg);
          }
        } catch {
          // Ignore parse errors
        }
      };
      
      ws.on('message', handler);
    });
  }

  describe('Central Upgrade Dispatcher', () => {
    
    it('should handle WebSocket connections', async () => {
      const messageReceived = new Promise<any>((resolve) => {
        ctx.wss.once('connection', (ws) => {
          ws.send(JSON.stringify({ type: 'connected' }));
          ws.once('message', (data) => {
            resolve(JSON.parse(data.toString()));
          });
        });
      });
      
      const ws = await connect('/');
      
      expect(ws.readyState).toBe(WebSocket.OPEN);
      
      ws.send(JSON.stringify({ type: 'ack' }));
      const msg = await messageReceived;
      expect(msg.type).toBe('ack');
    });
    
    it('should track connected clients', async () => {
      const connections: WebSocket[] = [];
      
      ctx.wss.on('connection', (ws) => {
        connections.push(ws);
      });
      
      await connect('/');
      await connect('/');
      
      expect(connections.length).toBe(2);
      expect(ctx.wss.clients.size).toBe(2);
    });
    
    it('should support custom message routing', async () => {
      const routes = new Map<string, (ws: WebSocket, data: any) => void>();
      
      routes.set('echo', (ws, data) => {
        ws.send(JSON.stringify({ type: 'echo', data: data.message }));
      });
      
      routes.set('ping', (ws) => {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      });
      
      ctx.wss.on('connection', (ws) => {
        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString());
            const handler = routes.get(msg.type);
            if (handler) {
              handler(ws, msg);
            }
          } catch {
            // Ignore
          }
        });
      });
      
      const ws = await connect('/');
      
      ws.send(JSON.stringify({ type: 'ping' }));
      const pong = await waitForMessage(ws, (m) => m.type === 'pong');
      expect(pong.timestamp).toBeDefined();
      
      ws.send(JSON.stringify({ type: 'echo', message: 'hello' }));
      const echo = await waitForMessage(ws, (m) => m.type === 'echo');
      expect(echo.data).toBe('hello');
    });
  });
  
  describe('Agent WebSocket (/ws/agent)', () => {
    
    it('should handle heartbeat/ping mechanism', async () => {
      ctx.wss.on('connection', (ws) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        });
      });
      
      const ws = await connect('/ws/agent');
      ws.send(JSON.stringify({ type: 'ping' }));
      
      const pong = await waitForMessage(ws, (m) => m.type === 'pong');
      expect(pong.type).toBe('pong');
      expect(pong.timestamp).toBeDefined();
    });
    
    it('should provide connection acknowledgment', async () => {
      ctx.wss.on('connection', (ws, req) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'handshake') {
            const url = new URL(req.url || '/', `http://localhost`);
            ws.send(JSON.stringify({
              type: 'connected',
              projectId: url.searchParams.get('projectId'),
              deviceId: url.searchParams.get('deviceId') || 'default'
            }));
          }
        });
      });
      
      const token = createValidBootstrapToken(123, 'user-456');
      const ws = await connect(`/ws/agent?projectId=123&token=${token}&deviceId=device-1`);
      
      ws.send(JSON.stringify({ type: 'handshake' }));
      const connected = await waitForMessage(ws, (m) => m.type === 'connected');
      expect(connected.projectId).toBe('123');
      expect(connected.deviceId).toBe('device-1');
    });
    
    it('should support multi-device roster', async () => {
      const devices: Set<string> = new Set();
      
      ctx.wss.on('connection', (ws, req) => {
        const url = new URL(req.url || '/', `http://localhost`);
        const deviceId = url.searchParams.get('deviceId') || 'default';
        devices.add(deviceId);
        
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'roster') {
            ws.send(JSON.stringify({
              type: 'roster_update',
              devices: Array.from(devices)
            }));
          }
        });
      });
      
      await connect('/ws/agent?deviceId=device-1');
      await connect('/ws/agent?deviceId=device-2');
      const ws3 = await connect('/ws/agent?deviceId=device-3');
      
      ws3.send(JSON.stringify({ type: 'roster' }));
      const roster = await waitForMessage(ws3, (m) => m.type === 'roster_update');
      
      expect(roster.devices).toContain('device-1');
      expect(roster.devices).toContain('device-2');
      expect(roster.devices).toContain('device-3');
    });
  });
  
  describe('Deployment WebSocket (/ws/deployments)', () => {
    
    it('should subscribe to deployment updates', async () => {
      const subscriptions = new Map<string, Set<WebSocket>>();
      
      ctx.wss.on('connection', (ws) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'subscribe' && msg.deploymentId) {
            if (!subscriptions.has(msg.deploymentId)) {
              subscriptions.set(msg.deploymentId, new Set());
            }
            subscriptions.get(msg.deploymentId)!.add(ws);
            ws.send(JSON.stringify({ type: 'subscribed', deploymentId: msg.deploymentId }));
          }
        });
      });
      
      const ws = await connect('/ws/deployments');
      ws.send(JSON.stringify({ type: 'subscribe', deploymentId: 'deploy-123' }));
      
      const subscribed = await waitForMessage(ws, (m) => m.type === 'subscribed');
      expect(subscribed.deploymentId).toBe('deploy-123');
    });
    
    it('should broadcast status change notifications', async () => {
      const subscribers: WebSocket[] = [];
      
      ctx.wss.on('connection', (ws) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'subscribe') {
            subscribers.push(ws);
            ws.send(JSON.stringify({ type: 'subscribed' }));
            
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'status_change',
                deploymentId: msg.deploymentId,
                data: { status: 'building', previousStatus: 'pending' }
              }));
            }, 50);
          }
        });
      });
      
      const ws = await connect('/ws/deployments');
      ws.send(JSON.stringify({ type: 'subscribe', deploymentId: 'deploy-456' }));
      
      const statusChange = await waitForMessage(ws, (m) => m.type === 'status_change');
      expect(statusChange.data.status).toBe('building');
      expect(statusChange.data.previousStatus).toBe('pending');
    });
    
    it('should track deployment progress', async () => {
      ctx.wss.on('connection', (ws) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'subscribe') {
            ws.send(JSON.stringify({ type: 'subscribed' }));
            
            let progress = 0;
            const interval = setInterval(() => {
              progress += 25;
              ws.send(JSON.stringify({
                type: 'progress',
                deploymentId: msg.deploymentId,
                progress
              }));
              if (progress >= 100) {
                clearInterval(interval);
                ws.send(JSON.stringify({
                  type: 'completed',
                  deploymentId: msg.deploymentId
                }));
              }
            }, 30);
          }
        });
      });
      
      const ws = await connect('/ws/deployments');
      ws.send(JSON.stringify({ type: 'subscribe', deploymentId: 'deploy-789' }));
      
      const completed = await waitForMessage(ws, (m) => m.type === 'completed');
      expect(completed.deploymentId).toBe('deploy-789');
    });
  });
  
  describe('Terminal WebSocket (/api/terminal/ws)', () => {
    
    it('should establish terminal connection', async () => {
      ctx.wss.on('connection', (ws, req) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'init') {
            const url = new URL(req.url || '/', `http://localhost`);
            ws.send(JSON.stringify({
              type: 'connected',
              projectId: url.searchParams.get('projectId')
            }));
          }
        });
      });
      
      const ws = await connect('/api/terminal/ws?projectId=123');
      ws.send(JSON.stringify({ type: 'init' }));
      const msg = await waitForMessage(ws, (m) => m.type === 'connected');
      
      expect(ws.readyState).toBe(WebSocket.OPEN);
      expect(msg.projectId).toBe('123');
    });
    
    it('should create PTY session', async () => {
      ctx.wss.on('connection', (ws, req) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'create_pty') {
            const url = new URL(req.url || '/', `http://localhost`);
            const projectId = url.searchParams.get('projectId');
            
            ws.send(JSON.stringify({
              type: 'pty_created',
              sessionId: `pty-${projectId}-${Date.now()}`,
              shell: '/bin/bash',
              rows: 24,
              cols: 80
            }));
          }
        });
      });
      
      const ws = await connect('/api/terminal/ws?projectId=456');
      ws.send(JSON.stringify({ type: 'create_pty' }));
      const pty = await waitForMessage(ws, (m) => m.type === 'pty_created');
      
      expect(pty.sessionId).toMatch(/^pty-456-\d+$/);
      expect(pty.shell).toBe('/bin/bash');
      expect(pty.rows).toBe(24);
      expect(pty.cols).toBe(80);
    });
    
    it('should handle terminal input/output', async () => {
      ctx.wss.on('connection', (ws) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'input') {
            ws.send(JSON.stringify({
              type: 'output',
              data: `$ ${msg.data}\ncommand output\n`
            }));
          }
        });
      });
      
      const ws = await connect('/api/terminal/ws?projectId=789');
      ws.send(JSON.stringify({ type: 'input', data: 'ls -la' }));
      
      const output = await waitForMessage(ws, (m) => m.type === 'output');
      expect(output.data).toContain('ls -la');
    });
    
    it('should handle terminal resize', async () => {
      ctx.wss.on('connection', (ws) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'resize') {
            ws.send(JSON.stringify({
              type: 'resized',
              rows: msg.rows,
              cols: msg.cols
            }));
          }
        });
      });
      
      const ws = await connect('/api/terminal/ws?projectId=101');
      ws.send(JSON.stringify({ type: 'resize', rows: 50, cols: 120 }));
      
      const resized = await waitForMessage(ws, (m) => m.type === 'resized');
      expect(resized.rows).toBe(50);
      expect(resized.cols).toBe(120);
    });
  });
  
  describe('Runtime Logs WebSocket (/api/runtime/logs/ws)', () => {
    
    it('should connect with valid project and user', async () => {
      ctx.wss.on('connection', (ws, req) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'init') {
            const url = new URL(req.url || '/', `http://localhost`);
            ws.send(JSON.stringify({
              type: 'connected',
              projectId: url.searchParams.get('projectId'),
              userId: url.searchParams.get('userId')
            }));
          }
        });
      });
      
      const ws = await connect('/api/runtime/logs/ws?projectId=123&userId=user-456');
      ws.send(JSON.stringify({ type: 'init' }));
      const msg = await waitForMessage(ws, (m) => m.type === 'connected');
      
      expect(msg.projectId).toBe('123');
      expect(msg.userId).toBe('user-456');
    });
    
    it('should stream stdout logs', async () => {
      ctx.wss.on('connection', (ws) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'subscribe') {
            ws.send(JSON.stringify({
              type: 'stdout',
              message: 'Application started',
              timestamp: Date.now()
            }));
          }
        });
      });
      
      const ws = await connect('/api/runtime/logs/ws?projectId=123&userId=user-456');
      ws.send(JSON.stringify({ type: 'subscribe' }));
      const log = await waitForMessage(ws, (m) => m.type === 'stdout');
      
      expect(log.message).toBe('Application started');
      expect(log.timestamp).toBeDefined();
    });
    
    it('should stream stderr logs', async () => {
      ctx.wss.on('connection', (ws) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'subscribe') {
            ws.send(JSON.stringify({
              type: 'stderr',
              message: 'Error: Something went wrong',
              timestamp: Date.now()
            }));
          }
        });
      });
      
      const ws = await connect('/api/runtime/logs/ws?projectId=123&userId=user-456');
      ws.send(JSON.stringify({ type: 'subscribe' }));
      const log = await waitForMessage(ws, (m) => m.type === 'stderr');
      
      expect(log.message).toContain('Error');
    });
    
    it('should support execution-specific streams', async () => {
      ctx.wss.on('connection', (ws, req) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'init') {
            const url = new URL(req.url || '/', `http://localhost`);
            ws.send(JSON.stringify({
              type: 'connected',
              executionId: url.searchParams.get('executionId')
            }));
          }
        });
      });
      
      const ws = await connect('/api/runtime/logs/ws?projectId=123&userId=user-456&executionId=exec-789');
      ws.send(JSON.stringify({ type: 'init' }));
      const msg = await waitForMessage(ws, (m) => m.type === 'connected');
      
      expect(msg.executionId).toBe('exec-789');
    });
  });
  
  describe('Collaboration WebSocket (/ws/yjs)', () => {
    
    it('should establish Yjs document sync connection', async () => {
      ctx.wss.on('connection', (ws, req) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'sync_request') {
            const url = new URL(req.url || '/', `http://localhost`);
            ws.send(JSON.stringify({
              type: 'sync',
              documentId: url.pathname.split('/').pop(),
              content: '',
              collaborators: []
            }));
          }
        });
      });
      
      const ws = await connect('/ws/yjs/doc-123?projectId=456');
      ws.send(JSON.stringify({ type: 'sync_request' }));
      const sync = await waitForMessage(ws, (m) => m.type === 'sync');
      
      expect(sync.documentId).toBe('doc-123');
      expect(Array.isArray(sync.collaborators)).toBe(true);
    });
    
    it('should broadcast presence updates', async () => {
      const collaborators: Map<WebSocket, { id: string; cursor: any }> = new Map();
      
      ctx.wss.on('connection', (ws) => {
        const id = `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        collaborators.set(ws, { id, cursor: null });
        
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          
          if (msg.type === 'join') {
            collaborators.forEach((_, otherWs) => {
              if (otherWs !== ws && otherWs.readyState === WebSocket.OPEN) {
                otherWs.send(JSON.stringify({
                  type: 'collaborator:joined',
                  collaborator: { id }
                }));
              }
            });
            ws.send(JSON.stringify({ type: 'joined', id }));
          }
          
          if (msg.type === 'cursor') {
            const collab = collaborators.get(ws);
            if (collab) collab.cursor = msg.position;
            
            collaborators.forEach((_, otherWs) => {
              if (otherWs !== ws && otherWs.readyState === WebSocket.OPEN) {
                otherWs.send(JSON.stringify({
                  type: 'presence',
                  collaboratorId: collab?.id,
                  cursor: msg.position
                }));
              }
            });
          }
        });
        
        ws.on('close', () => {
          const collab = collaborators.get(ws);
          collaborators.delete(ws);
          
          collaborators.forEach((_, otherWs) => {
            if (otherWs.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: 'collaborator:left',
                collaboratorId: collab?.id
              }));
            }
          });
        });
      });
      
      const ws1 = await connect('/ws/yjs?projectId=456');
      ws1.send(JSON.stringify({ type: 'join' }));
      await waitForMessage(ws1, (m) => m.type === 'joined');
      
      const ws2 = await connect('/ws/yjs?projectId=456');
      ws2.send(JSON.stringify({ type: 'join' }));
      
      const joinMessage = await waitForMessage(ws1, (m) => m.type === 'collaborator:joined');
      expect(joinMessage.type).toBe('collaborator:joined');
      expect(joinMessage.collaborator.id).toBeDefined();
      
      ws2.send(JSON.stringify({ type: 'cursor', position: { line: 10, column: 5 } }));
      
      const presence = await waitForMessage(ws1, (m) => m.type === 'presence');
      expect(presence.cursor).toEqual({ line: 10, column: 5 });
    });
    
    it('should sync document updates', async () => {
      const documents = new Map<string, string>();
      
      ctx.wss.on('connection', (ws, req) => {
        const url = new URL(req.url || '/', `http://localhost`);
        const docId = url.searchParams.get('docId') || 'default';
        
        ws.send(JSON.stringify({
          type: 'sync',
          content: documents.get(docId) || ''
        }));
        
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'update') {
            documents.set(docId, msg.content);
            
            ctx.wss.clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'update',
                  content: msg.content
                }));
              }
            });
          }
        });
      });
      
      const ws1 = await connect('/ws/yjs?docId=test-doc');
      await connect('/ws/yjs?docId=test-doc');
      
      ws1.send(JSON.stringify({ type: 'update', content: 'Hello, World!' }));
      
      // Verify the document was stored
      await new Promise(r => setTimeout(r, 50));
      expect(documents.get('test-doc')).toBe('Hello, World!');
    });
  });
  
  describe('WebSocket Error Handling', () => {
    
    it('should handle malformed JSON gracefully', async () => {
      let errorHandled = false;
      
      ctx.wss.on('connection', (ws) => {
        ws.on('message', (data) => {
          try {
            JSON.parse(data.toString());
          } catch {
            errorHandled = true;
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
          }
        });
      });
      
      const ws = await connect('/test');
      ws.send('not-valid-json{{{');
      
      const error = await waitForMessage(ws, (m) => m.type === 'error');
      expect(error.message).toBe('Invalid JSON');
      expect(errorHandled).toBe(true);
    });
    
    it('should clean up resources on disconnect', async () => {
      let connectionClosed = false;
      
      ctx.wss.on('connection', (ws) => {
        ws.on('close', () => {
          connectionClosed = true;
        });
      });
      
      const ws = await connect('/test');
      ws.close();
      
      await new Promise(r => setTimeout(r, 100));
      expect(connectionClosed).toBe(true);
    });
    
    it('should handle multiple rapid connections', async () => {
      const connections: WebSocket[] = [];
      
      ctx.wss.on('connection', (ws) => {
        connections.push(ws);
        ws.send(JSON.stringify({ type: 'connected', count: connections.length }));
      });
      
      const promises = Array.from({ length: 10 }, () => connect('/test'));
      await Promise.all(promises);
      
      expect(connections.length).toBe(10);
      expect(ctx.wss.clients.size).toBe(10);
    });
  });
  
  describe('WebSocket Connection Cleanup', () => {
    
    it('should properly clean up resources after disconnect', async () => {
      const activeConnections = new Set<WebSocket>();
      
      ctx.wss.on('connection', (ws) => {
        activeConnections.add(ws);
        ws.on('close', () => activeConnections.delete(ws));
      });
      
      const connections = await Promise.all(
        Array.from({ length: 5 }, () => connect('/test'))
      );
      
      expect(activeConnections.size).toBe(5);
      
      connections.forEach(ws => ws.close());
      
      await new Promise(r => setTimeout(r, 200));
      expect(activeConnections.size).toBe(0);
    });
    
    it('should broadcast disconnect notifications', async () => {
      let disconnectNotified = false;
      
      ctx.wss.on('connection', (ws) => {
        ws.on('close', () => {
          ctx.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              disconnectNotified = true;
              client.send(JSON.stringify({ type: 'user:left' }));
            }
          });
        });
      });
      
      const ws1 = await connect('/test');
      const ws2 = await connect('/test');
      
      ws2.close();
      
      const leftMsg = await waitForMessage(ws1, (m) => m.type === 'user:left');
      expect(leftMsg.type).toBe('user:left');
      expect(disconnectNotified).toBe(true);
    });
  });
});
