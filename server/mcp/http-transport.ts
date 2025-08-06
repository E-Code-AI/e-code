/**
 * HTTP Transport for MCP Server
 * Enables MCP server to work over HTTP instead of STDIO
 */

import { Express, Request, Response } from "express";
import { Server as MCPServer } from "@modelcontextprotocol/sdk/server/index.js";
import { EventEmitter } from "events";
import * as crypto from "crypto";

const uuidv4 = () => crypto.randomUUID();

interface Session {
  id: string;
  transport: HttpServerTransport;
  lastActivity: Date;
}

class HttpServerTransport extends EventEmitter {
  private messageQueue: any[] = [];
  private responseCallbacks: Map<string, (response: any) => void> = new Map();
  
  constructor(public sessionId: string) {
    super();
  }
  
  send(message: any) {
    if (message.id && this.responseCallbacks.has(message.id)) {
      const callback = this.responseCallbacks.get(message.id)!;
      this.responseCallbacks.delete(message.id);
      callback(message);
    } else {
      this.messageQueue.push(message);
      this.emit("message", message);
    }
  }
  
  receive(message: any): Promise<any> {
    return new Promise((resolve) => {
      const messageId = message.id || uuidv4();
      this.responseCallbacks.set(messageId, resolve);
      this.emit("message", { ...message, id: messageId });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.responseCallbacks.has(messageId)) {
          this.responseCallbacks.delete(messageId);
          resolve({ 
            jsonrpc: "2.0",
            id: messageId,
            error: { 
              code: -32000, 
              message: "Request timeout" 
            }
          });
        }
      }, 30000);
    });
  }
  
  getMessages(): any[] {
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    return messages;
  }
  
  close() {
    this.removeAllListeners();
    this.responseCallbacks.clear();
    this.messageQueue = [];
  }
}

export class MCPHttpServer {
  private sessions: Map<string, Session> = new Map();
  private mcpServer: MCPServer | null = null;
  
  constructor(private app: Express) {
    this.setupRoutes();
    this.startCleanupInterval();
  }
  
  private setupRoutes() {
    // Connect endpoint - establishes a new session
    this.app.post("/mcp/connect", async (req: Request, res: Response) => {
      const sessionId = req.body.sessionId || uuidv4();
      
      if (!this.sessions.has(sessionId)) {
        const transport = new HttpServerTransport(sessionId);
        const session: Session = {
          id: sessionId,
          transport,
          lastActivity: new Date(),
        };
        
        this.sessions.set(sessionId, session);
        
        // Connect MCP server to this transport
        if (this.mcpServer) {
          await this.mcpServer.connect(transport as any);
        }
      }
      
      res.json({ 
        sessionId, 
        status: "connected",
        capabilities: {
          tools: true,
          resources: true,
          prompts: true,
        }
      });
    });
    
    // Message endpoint - send messages to MCP server
    this.app.post("/mcp/message", async (req: Request, res: Response) => {
      const sessionId = req.headers["x-session-id"] as string;
      
      if (!sessionId || !this.sessions.has(sessionId)) {
        return res.status(401).json({ error: "Invalid session" });
      }
      
      const session = this.sessions.get(sessionId)!;
      session.lastActivity = new Date();
      
      try {
        const response = await session.transport.receive(req.body);
        res.json(response);
      } catch (error: any) {
        res.status(500).json({ 
          error: "Failed to process message",
          details: error.message 
        });
      }
    });
    
    // Events endpoint - Server-Sent Events for notifications
    this.app.get("/mcp/events", (req: Request, res: Response) => {
      const sessionId = req.headers["x-session-id"] as string;
      
      if (!sessionId || !this.sessions.has(sessionId)) {
        return res.status(401).json({ error: "Invalid session" });
      }
      
      const session = this.sessions.get(sessionId)!;
      session.lastActivity = new Date();
      
      // Set up SSE
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });
      
      // Send initial ping
      res.write("data: {\"type\":\"ping\"}\n\n");
      
      // Set up message listener
      const messageHandler = (message: any) => {
        res.write(`data: ${JSON.stringify(message)}\n\n`);
      };
      
      session.transport.on("message", messageHandler);
      
      // Clean up on disconnect
      req.on("close", () => {
        session.transport.off("message", messageHandler);
      });
      
      // Keep connection alive
      const pingInterval = setInterval(() => {
        res.write("data: {\"type\":\"ping\"}\n\n");
      }, 30000);
      
      req.on("close", () => {
        clearInterval(pingInterval);
      });
    });
    
    // Disconnect endpoint
    this.app.post("/mcp/disconnect", (req: Request, res: Response) => {
      const sessionId = req.headers["x-session-id"] as string;
      
      if (sessionId && this.sessions.has(sessionId)) {
        const session = this.sessions.get(sessionId)!;
        session.transport.close();
        this.sessions.delete(sessionId);
      }
      
      res.json({ status: "disconnected" });
    });
    
    // List available tools
    this.app.get("/mcp/tools", async (req: Request, res: Response) => {
      const sessionId = req.headers["x-session-id"] as string;
      
      if (!sessionId || !this.sessions.has(sessionId)) {
        // Return public tool list without session
        return res.json({
          tools: [
            "fs_read", "fs_write", "fs_delete", "fs_list",
            "exec_command", "exec_spawn",
            "db_query", "db_migrate",
            "api_request", "api_graphql",
            "system_info", "git_status",
            "ai_complete"
          ]
        });
      }
      
      const session = this.sessions.get(sessionId)!;
      const response = await session.transport.receive({
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
      });
      
      res.json(response.result);
    });
    
    // List available resources
    this.app.get("/mcp/resources", async (req: Request, res: Response) => {
      const sessionId = req.headers["x-session-id"] as string;
      
      if (!sessionId || !this.sessions.has(sessionId)) {
        return res.status(401).json({ error: "Session required" });
      }
      
      const session = this.sessions.get(sessionId)!;
      const response = await session.transport.receive({
        jsonrpc: "2.0",
        method: "resources/list",
        params: {},
      });
      
      res.json(response.result);
    });
  }
  
  setMCPServer(server: MCPServer) {
    this.mcpServer = server;
  }
  
  private startCleanupInterval() {
    // Clean up inactive sessions every 5 minutes
    setInterval(() => {
      const now = new Date();
      const timeout = 30 * 60 * 1000; // 30 minutes
      
      const sessionsToDelete: string[] = [];
      this.sessions.forEach((session, sessionId) => {
        if (now.getTime() - session.lastActivity.getTime() > timeout) {
          session.transport.close();
          sessionsToDelete.push(sessionId);
          console.log(`Cleaned up inactive session: ${sessionId}`);
        }
      });
      
      sessionsToDelete.forEach(id => this.sessions.delete(id));
    }, 5 * 60 * 1000);
  }
  
  async shutdown() {
    this.sessions.forEach(session => {
      session.transport.close();
    });
    this.sessions.clear();
    
    if (this.mcpServer) {
      await this.mcpServer.close();
    }
  }
}

export default MCPHttpServer;