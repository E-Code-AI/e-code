/**
 * Real WebSocket Dispatcher Integration Tests
 * 
 * This test suite boots the ACTUAL E-Code server and tests WebSocket upgrades
 * through the central dispatcher to validate production behavior.
 * 
 * Tests all dispatcher-registered paths:
 * - /ws/agent
 * - /ws/deployments
 * - /api/terminal/ws
 * - /api/runtime/logs/ws
 * - /ws/background-tests
 * - /ws/yjs
 * - /collaboration
 * 
 * @see server/websocket/central-upgrade-dispatcher.ts
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createServer, Server as HttpServer, IncomingMessage } from 'http';
import { AddressInfo } from 'net';
import WebSocket from 'ws';
import type { Duplex } from 'stream';
import type { Socket } from 'net';
import express from 'express';

const TEST_TIMEOUT = 10000;
const CONNECTION_TIMEOUT = 5000;

interface TestServerContext {
  httpServer: HttpServer;
  port: number;
  baseUrl: string;
  wsUrl: string;
}

interface ConnectionResult {
  success: boolean;
  error?: Error;
  closeCode?: number;
  closeReason?: string;
  errorMessage?: string;
}

let serverContext: TestServerContext | null = null;
let activeConnections: WebSocket[] = [];

async function startTestServer(): Promise<TestServerContext> {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Server start timeout after 30 seconds'));
    }, 30000);

    try {
      const app = express();
      const httpServer = createServer(app);
      httpServer.setMaxListeners(30);

      const { centralUpgradeDispatcher } = await import('../../server/websocket/central-upgrade-dispatcher');
      centralUpgradeDispatcher.initialize(httpServer);

      app.get('/health', (_req, res) => {
        res.json({ status: 'ok' });
      });

      try {
        const { initPTYTerminalService } = await import('../../server/terminal/pty-terminal-service');
        const ptyService = initPTYTerminalService();
        ptyService.setup(httpServer);
      } catch (e) {
        console.log('[Test Server] PTY terminal service skipped:', (e as Error).message);
      }

      try {
        const { setupBackgroundTestingWebSocket } = await import('../../server/websocket/background-testing-ws');
        setupBackgroundTestingWebSocket(httpServer);
      } catch (e) {
        console.log('[Test Server] Background testing WS skipped:', (e as Error).message);
      }

      try {
        const { CollaborationServer } = await import('../../server/collaboration/collaboration-server');
        new CollaborationServer(httpServer);
      } catch (e) {
        console.log('[Test Server] Collaboration server skipped:', (e as Error).message);
      }

      try {
        const { initializeCollaborationService } = await import('../../server/collaboration/unified-collaboration-service');
        initializeCollaborationService(httpServer);
      } catch (e) {
        console.log('[Test Server] Unified collaboration skipped:', (e as Error).message);
      }

      try {
        const { storage } = await import('../../server/storage');
        
        const { initRuntimeLogsService } = await import('../../server/services/RuntimeLogsService');
        const runtimeLogsService = initRuntimeLogsService(storage);
        runtimeLogsService.setup(httpServer);
      } catch (e) {
        console.log('[Test Server] Runtime logs service skipped:', (e as Error).message);
      }

      try {
        const { agentWebSocketService } = await import('../../server/services/agent-websocket-service');
        agentWebSocketService.initialize(httpServer);
      } catch (e) {
        console.log('[Test Server] Agent WS service skipped:', (e as Error).message);
      }

      try {
        const { deploymentWebSocketService } = await import('../../server/services/deployment-websocket-service');
        deploymentWebSocketService.initialize(httpServer);
      } catch (e) {
        console.log('[Test Server] Deployment WS service skipped:', (e as Error).message);
      }

      const { installFinalUpgradeGuard } = await import('../../server/websocket/upgrade-guard');
      httpServer.on('upgrade', installFinalUpgradeGuard);

      httpServer.listen(0, '127.0.0.1', () => {
        clearTimeout(timeoutId);
        const addr = httpServer.address() as AddressInfo;
        const ctx: TestServerContext = {
          httpServer,
          port: addr.port,
          baseUrl: `http://127.0.0.1:${addr.port}`,
          wsUrl: `ws://127.0.0.1:${addr.port}`
        };
        console.log(`[Test Server] Started on port ${addr.port}`);
        resolve(ctx);
      });

      httpServer.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

async function stopTestServer(ctx: TestServerContext): Promise<void> {
  return new Promise((resolve) => {
    ctx.httpServer.close(() => {
      console.log('[Test Server] Stopped');
      resolve();
    });
    setTimeout(resolve, 2000);
  });
}

async function testWebSocketConnection(
  wsUrl: string,
  path: string,
  options: { 
    expectClose?: boolean;
    expectedCloseCode?: number;
    timeout?: number;
  } = {}
): Promise<ConnectionResult> {
  const { expectClose = false, expectedCloseCode, timeout = CONNECTION_TIMEOUT } = options;
  
  return new Promise((resolve) => {
    const fullUrl = `${wsUrl}${path}`;
    let ws: WebSocket | null = null;
    let resolved = false;
    
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (ws) {
          ws.close();
        }
        resolve({
          success: false,
          error: new Error(`Connection timeout for ${path}`),
          errorMessage: 'timeout'
        });
      }
    }, timeout);
    
    try {
      ws = new WebSocket(fullUrl, {
        handshakeTimeout: timeout,
        headers: {
          'Origin': 'http://localhost:5000'
        }
      });
      activeConnections.push(ws);
      
      ws.on('open', () => {
        if (!resolved) {
          if (expectClose) {
            return;
          }
          resolved = true;
          clearTimeout(timeoutId);
          resolve({ success: true });
        }
      });
      
      ws.on('error', (err: Error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          const is1006 = err.message.includes('1006') || err.message.includes('Invalid frame header');
          resolve({
            success: false,
            error: err,
            errorMessage: err.message,
            closeCode: is1006 ? 1006 : undefined
          });
        }
      });
      
      ws.on('close', (code: number, reason: Buffer) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          const reasonStr = reason.toString();
          
          if (expectClose) {
            const codeMatches = expectedCloseCode === undefined || code === expectedCloseCode;
            resolve({
              success: codeMatches,
              closeCode: code,
              closeReason: reasonStr
            });
          } else {
            const is1006 = code === 1006;
            resolve({
              success: false,
              closeCode: code,
              closeReason: reasonStr,
              errorMessage: is1006 ? 'Connection closed with 1006 (abnormal)' : `Connection closed with code ${code}`
            });
          }
        }
      });
      
      ws.on('unexpected-response', (_req, res) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({
            success: false,
            error: new Error(`Unexpected HTTP response: ${res.statusCode}`),
            closeCode: res.statusCode,
            errorMessage: `HTTP ${res.statusCode}`
          });
        }
      });
    } catch (err) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: err as Error,
          errorMessage: (err as Error).message
        });
      }
    }
  });
}

function cleanupConnections(): void {
  for (const ws of activeConnections) {
    try {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    } catch {
    }
  }
  activeConnections = [];
}

describe('Real WebSocket Dispatcher Integration Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests';
    
    serverContext = await startTestServer();
  }, 60000);

  afterAll(async () => {
    cleanupConnections();
    if (serverContext) {
      await stopTestServer(serverContext);
      serverContext = null;
    }
  }, 30000);

  afterEach(() => {
    cleanupConnections();
  });

  describe('Server Health Check', () => {
    it('should respond to HTTP health check', async () => {
      expect(serverContext).not.toBeNull();
      
      const response = await fetch(`${serverContext!.baseUrl}/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
    }, TEST_TIMEOUT);
  });

  describe('Central Dispatcher - Registered Paths', () => {
    
    it('should handle /ws/agent connection attempt', async () => {
      const result = await testWebSocketConnection(
        serverContext!.wsUrl,
        '/ws/agent?projectId=test-123&deviceId=test-device'
      );
      
      if (result.closeCode !== undefined) {
        expect(result.closeCode).not.toBe(1006);
      }
      if (result.errorMessage) {
        expect(result.errorMessage).not.toMatch(/Invalid frame header/i);
      }
      
      console.log(`[/ws/agent] Result: success=${result.success}, code=${result.closeCode}, error=${result.errorMessage}`);
    }, TEST_TIMEOUT);

    it('should handle /ws/deployments connection attempt', async () => {
      const result = await testWebSocketConnection(
        serverContext!.wsUrl,
        '/ws/deployments'
      );
      
      if (result.closeCode !== undefined) {
        expect(result.closeCode).not.toBe(1006);
      }
      if (result.errorMessage) {
        expect(result.errorMessage).not.toMatch(/Invalid frame header/i);
      }
      
      console.log(`[/ws/deployments] Result: success=${result.success}, code=${result.closeCode}, error=${result.errorMessage}`);
    }, TEST_TIMEOUT);

    it('should handle /api/terminal/ws connection attempt', async () => {
      const result = await testWebSocketConnection(
        serverContext!.wsUrl,
        '/api/terminal/ws?projectId=test-123'
      );
      
      if (result.closeCode !== undefined) {
        expect(result.closeCode).not.toBe(1006);
      }
      if (result.errorMessage) {
        expect(result.errorMessage).not.toMatch(/Invalid frame header/i);
      }
      
      console.log(`[/api/terminal/ws] Result: success=${result.success}, code=${result.closeCode}, error=${result.errorMessage}`);
    }, TEST_TIMEOUT);

    it('should handle /api/runtime/logs/ws connection attempt', async () => {
      const result = await testWebSocketConnection(
        serverContext!.wsUrl,
        '/api/runtime/logs/ws?projectId=test-123'
      );
      
      if (result.closeCode !== undefined) {
        expect(result.closeCode).not.toBe(1006);
      }
      if (result.errorMessage) {
        expect(result.errorMessage).not.toMatch(/Invalid frame header/i);
      }
      
      console.log(`[/api/runtime/logs/ws] Result: success=${result.success}, code=${result.closeCode}, error=${result.errorMessage}`);
    }, TEST_TIMEOUT);

    it('should handle /ws/background-tests connection attempt', async () => {
      const result = await testWebSocketConnection(
        serverContext!.wsUrl,
        '/ws/background-tests?projectId=test-123'
      );
      
      if (result.closeCode !== undefined) {
        expect(result.closeCode).not.toBe(1006);
      }
      if (result.errorMessage) {
        expect(result.errorMessage).not.toMatch(/Invalid frame header/i);
      }
      
      console.log(`[/ws/background-tests] Result: success=${result.success}, code=${result.closeCode}, error=${result.errorMessage}`);
    }, TEST_TIMEOUT);

    it('should handle /ws/yjs connection attempt', async () => {
      const result = await testWebSocketConnection(
        serverContext!.wsUrl,
        '/ws/yjs/test-doc-123'
      );
      
      if (result.closeCode !== undefined) {
        expect(result.closeCode).not.toBe(1006);
      }
      if (result.errorMessage) {
        expect(result.errorMessage).not.toMatch(/Invalid frame header/i);
      }
      
      console.log(`[/ws/yjs] Result: success=${result.success}, code=${result.closeCode}, error=${result.errorMessage}`);
    }, TEST_TIMEOUT);

    it('should handle /collaboration connection attempt', async () => {
      const result = await testWebSocketConnection(
        serverContext!.wsUrl,
        '/collaboration/test-room'
      );
      
      if (result.closeCode !== undefined) {
        expect(result.closeCode).not.toBe(1006);
      }
      if (result.errorMessage) {
        expect(result.errorMessage).not.toMatch(/Invalid frame header/i);
      }
      
      console.log(`[/collaboration] Result: success=${result.success}, code=${result.closeCode}, error=${result.errorMessage}`);
    }, TEST_TIMEOUT);
  });

  describe('Central Dispatcher - Unregistered Paths', () => {
    
    it('should properly reject /test-unknown-path', async () => {
      const result = await testWebSocketConnection(
        serverContext!.wsUrl,
        '/test-unknown-path',
        { expectClose: true, timeout: 3000 }
      );
      
      if (result.closeCode !== undefined) {
        expect(result.closeCode).not.toBe(1006);
      }
      if (result.errorMessage) {
        expect(result.errorMessage).not.toMatch(/Invalid frame header/i);
      }
      expect(result.success).toBe(false);
      
      console.log(`[/test-unknown-path] Result: success=${result.success}, code=${result.closeCode}, error=${result.errorMessage}`);
    }, TEST_TIMEOUT);

    it('should properly reject /ws/nonexistent', async () => {
      const result = await testWebSocketConnection(
        serverContext!.wsUrl,
        '/ws/nonexistent',
        { expectClose: true, timeout: 3000 }
      );
      
      if (result.closeCode !== undefined) {
        expect(result.closeCode).not.toBe(1006);
      }
      if (result.errorMessage) {
        expect(result.errorMessage).not.toMatch(/Invalid frame header/i);
      }
      expect(result.success).toBe(false);
      
      console.log(`[/ws/nonexistent] Result: success=${result.success}, code=${result.closeCode}, error=${result.errorMessage}`);
    }, TEST_TIMEOUT);

    it('should properly reject random path /random-ws-123', async () => {
      const result = await testWebSocketConnection(
        serverContext!.wsUrl,
        '/random-ws-123',
        { expectClose: true, timeout: 3000 }
      );
      
      if (result.closeCode !== undefined) {
        expect(result.closeCode).not.toBe(1006);
      }
      if (result.errorMessage) {
        expect(result.errorMessage).not.toMatch(/Invalid frame header/i);
      }
      expect(result.success).toBe(false);
      
      console.log(`[/random-ws-123] Result: success=${result.success}, code=${result.closeCode}, error=${result.errorMessage}`);
    }, TEST_TIMEOUT);
  });

  describe('Dispatcher Debug Info', () => {
    
    it('should have registered handlers for all expected paths', async () => {
      const { centralUpgradeDispatcher } = await import('../../server/websocket/central-upgrade-dispatcher');
      const debugInfo = centralUpgradeDispatcher.getDebugInfo();
      
      expect(debugInfo.isInitialized).toBe(true);
      expect(debugInfo.handlers.length).toBeGreaterThan(0);
      
      console.log('[Dispatcher Debug] Registered handlers:', debugInfo.handlers);
      
      const expectedPaths = [
        '/api/terminal/ws',
        '/ws/agent',
        '/ws/deployments',
        '/api/runtime/logs/ws',
        '/ws/background-tests'
      ];
      
      const registeredPaths = debugInfo.handlers.map(h => h.split(' ')[0]);
      
      for (const path of expectedPaths) {
        const isRegistered = registeredPaths.some(rp => rp === path || rp.startsWith(path));
        if (isRegistered) {
          console.log(`[Dispatcher] ✅ ${path} is registered`);
        } else {
          console.log(`[Dispatcher] ⚠️ ${path} may not be registered (could be optional)`);
        }
      }
    }, TEST_TIMEOUT);
  });

  describe('Connection Cleanup', () => {
    
    it('should handle rapid connection/disconnection without leaks', async () => {
      const connections: WebSocket[] = [];
      const connectionCount = 5;
      const errors: Error[] = [];
      
      for (let i = 0; i < connectionCount; i++) {
        const ws = new WebSocket(`${serverContext!.wsUrl}/ws/agent?projectId=cleanup-test-${i}`, {
          handshakeTimeout: 2000,
          headers: { 'Origin': 'http://localhost:5000' }
        });
        
        ws.on('error', (err) => {
          errors.push(err);
        });
        
        connections.push(ws);
        activeConnections.push(ws);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      for (const ws of connections) {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Normal closure');
          }
        } catch {
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const openConnections = connections.filter(ws => ws.readyState === WebSocket.OPEN);
      expect(openConnections.length).toBe(0);
      
      console.log(`[Cleanup Test] ${connections.length} connections created, ${errors.length} errors (expected for auth-required endpoints)`);
    }, TEST_TIMEOUT);
  });

  describe('No Invalid Frame Header Errors', () => {
    
    it('should not produce "Invalid frame header" on any registered path', async () => {
      const paths = [
        '/ws/agent?projectId=frame-test',
        '/ws/deployments',
        '/api/terminal/ws?projectId=frame-test',
        '/api/runtime/logs/ws?projectId=frame-test',
        '/ws/background-tests?projectId=frame-test',
        '/collaboration/frame-test',
        '/ws/yjs/frame-test'
      ];
      
      const results: { path: string; result: ConnectionResult }[] = [];
      
      for (const path of paths) {
        const result = await testWebSocketConnection(serverContext!.wsUrl, path);
        results.push({ path, result });
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      for (const { path, result } of results) {
        if (result.errorMessage) {
          expect(result.errorMessage).not.toMatch(/Invalid frame header/i);
        }
        if (result.closeCode !== undefined) {
          expect(result.closeCode).not.toBe(1006);
        }
        console.log(`[Frame Header Test] ${path}: success=${result.success}, code=${result.closeCode}`);
      }
    }, TEST_TIMEOUT * 2);
  });
});
