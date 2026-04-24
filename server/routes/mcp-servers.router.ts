import { Router, Request, Response } from "express";
import { db } from "../db";
import { mcpServers, DbMcpServer } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "../utils/logger";
import { ensureAuthenticated } from "../middleware/auth";
import { execa } from 'execa';
import { storage } from '../storage';

const logger = createLogger('mcp-servers-router');
const router = Router();

type McpRuntimeStatus = 'running' | 'stopped' | 'error' | 'starting';

const BUILTIN_SERVER_TEMPLATES = [
  {
    name: 'filesystem',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
  },
  {
    name: 'web-fetch',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
  },
  {
    name: 'database-query',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
  },
] as const;

const BUILTIN_TOOL_MAP: Record<string, Array<{ name: string; description: string; inputSchema: Record<string, any> }>> = {
  filesystem: [
    { name: 'fs_read', description: 'Read file contents', inputSchema: { properties: { path: { type: 'string' } } } },
    { name: 'fs_write', description: 'Write file contents', inputSchema: { properties: { path: { type: 'string' }, content: { type: 'string' } } } },
    { name: 'fs_list', description: 'List directories', inputSchema: { properties: { path: { type: 'string' } } } },
  ],
  'web-fetch': [
    { name: 'web_fetch', description: 'Fetch URL content', inputSchema: { properties: { url: { type: 'string' } } } },
  ],
  'database-query': [
    { name: 'db_query', description: 'Execute read-only SQL queries', inputSchema: { properties: { query: { type: 'string' } } } },
  ],
};

async function verifyProjectOwnership(userId: number | string, projectId: number): Promise<boolean> {
  const project = await storage.getProject(String(projectId));
  if (!project) return false;
  const numericUserId = typeof userId === 'number' ? userId : parseInt(String(userId), 10);
  return project.ownerId === numericUserId;
}

async function requireProjectAccess(req: Request, res: Response): Promise<number | null> {
  const projectId = parseInt(req.params.projectId, 10);
  if (Number.isNaN(projectId)) {
    res.status(400).json({ error: 'Invalid project ID' });
    return null;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  const allowed = await verifyProjectOwnership(userId, projectId);
  if (!allowed) {
    res.status(403).json({ error: 'Access denied' });
    return null;
  }

  return projectId;
}

function serializeServer(server: DbMcpServer) {
  return {
    ...server,
    id: String(server.id),
    status: (server.status || 'stopped') as McpRuntimeStatus,
    isBuiltIn: BUILTIN_SERVER_TEMPLATES.some((template) => template.name === server.name),
  };
}

function getToolsForServer(server: DbMcpServer) {
  const builtinTools = BUILTIN_TOOL_MAP[server.name] || [];
  return builtinTools.map((tool, index) => ({
    id: `${server.id}:${tool.name}:${index}`,
    serverId: String(server.id),
    serverName: server.name,
    ...tool,
  }));
}

// Ensure projectId matches the user's project (already checked by earlier middlewares if mounted properly)
// We will rely on tierRateLimiters and basic auth, but since we mount under /api/projects/:projectId/mcp/servers,
// the parent routing should have ensured access, OR we just ensure it here.
router.use(ensureAuthenticated);

// GET /api/projects/:projectId/mcp/servers
router.get("/:projectId/mcp/servers", async (req: Request, res: Response) => {
  try {
    const projectId = await requireProjectAccess(req, res);
    if (projectId === null) return;

    const servers = await db.select()
      .from(mcpServers)
      .where(eq(mcpServers.projectId, projectId));
    
    res.json(servers.map(serializeServer));
  } catch (error) {
    logger.error('Failed to fetch MCP servers', error);
    res.status(500).json({ error: "Failed to fetch servers" });
  }
});

// POST /api/projects/:projectId/mcp/servers
router.post("/:projectId/mcp/servers", async (req: Request, res: Response) => {
  try {
    const projectId = await requireProjectAccess(req, res);
    if (projectId === null) return;

    const { name, type, command, args, env, url, status } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Server name is required' });
    }
    if ((type || 'stdio') === 'stdio' && (!command || typeof command !== 'string')) {
      return res.status(400).json({ error: 'Command is required for stdio servers' });
    }
    if ((type || 'stdio') === 'sse' && (!url || typeof url !== 'string')) {
      return res.status(400).json({ error: 'URL is required for SSE servers' });
    }

    const [newServer] = await db.insert(mcpServers).values({
      projectId,
      name,
      type: type || 'stdio',
      command,
      args,
      env,
      url,
      status: (status as McpRuntimeStatus) || 'stopped',
    }).returning();

    res.status(201).json(serializeServer(newServer));
  } catch (error) {
    logger.error('Failed to create MCP server', error);
    res.status(500).json({ error: "Failed to create server" });
  }
});

// PUT /api/projects/:projectId/mcp/servers/:serverId
router.put("/:projectId/mcp/servers/:serverId", async (req: Request, res: Response) => {
  try {
    const projectId = await requireProjectAccess(req, res);
    if (projectId === null) return;

    const serverId = parseInt(req.params.serverId, 10);
    if (Number.isNaN(serverId)) return res.status(400).json({ error: 'Invalid server ID' });

    const { name, command, args, env, url, type } = req.body ?? {};

    const [updated] = await db.update(mcpServers)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(command !== undefined ? { command } : {}),
        ...(args !== undefined ? { args } : {}),
        ...(env !== undefined ? { env } : {}),
        ...(url !== undefined ? { url } : {}),
        ...(type !== undefined ? { type } : {}),
        updatedAt: new Date(),
      })
      .where(and(
        eq(mcpServers.id, serverId),
        eq(mcpServers.projectId, projectId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Server not found' });
    }

    res.json(serializeServer(updated));
  } catch (error) {
    logger.error('Failed to update MCP server', error);
    res.status(500).json({ error: 'Failed to update server' });
  }
});

// DELETE /api/projects/:projectId/mcp/servers/:serverId
router.delete("/:projectId/mcp/servers/:serverId", async (req: Request, res: Response) => {
  try {
    const projectId = await requireProjectAccess(req, res);
    if (projectId === null) return;
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ error: "Invalid parameters" });

    await db.delete(mcpServers)
      .where(and(
        eq(mcpServers.id, serverId),
        eq(mcpServers.projectId, projectId)
      ));

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete MCP server', error);
    res.status(500).json({ error: "Failed to delete server" });
  }
});

// POST /api/projects/:projectId/mcp/servers/test-remote
router.post("/:projectId/mcp/servers/test-remote", async (req: Request, res: Response) => {
  try {
    const projectId = await requireProjectAccess(req, res);
    if (projectId === null) return;

    const { command, args, env, url, type } = req.body;

    if (type === 'stdio' && command) {
      try {
        const testArgs = Array.isArray(args) && args.length > 0 ? args.slice(0, 3) : ["--version"];
        const child = await execa(command, testArgs, { 
          timeout: 5000, 
          reject: false 
        });
        
        if (child.failed && child.code === 'ENOENT') {
           return res.status(500).json({ status: 'error', errorMessage: `Executable not found: ${command}` });
        }
      } catch (e: any) {
        logger.warn('Executable test failed', e);
      }
      return res.json({ status: 'running', message: 'Ready to connect' });
    } else if (type === 'sse' && url) {
      return res.json({ status: 'running', message: 'SSE URL looks valid' });
    }

    res.json({ status: 'stopped' });
  } catch (error: any) {
    logger.error('Failed to test remote MCP server', error);
    res.status(500).json({ status: 'error', errorMessage: error.message });
  }
});

// POST /api/projects/:projectId/mcp/servers/:serverId/test
router.post("/:projectId/mcp/servers/:serverId/test", async (req: Request, res: Response) => {
  try {
    const projectId = await requireProjectAccess(req, res);
    if (projectId === null) return;
    const serverId = parseInt(req.params.serverId);
    if (Number.isNaN(serverId)) return res.status(400).json({ error: 'Invalid server ID' });
    
    const [server] = await db.select().from(mcpServers).where(and(
      eq(mcpServers.id, serverId),
      eq(mcpServers.projectId, projectId)
    ));

    if (!server) return res.status(404).json({ error: "Server not found" });

    let nextStatus: McpRuntimeStatus = 'running';
    let errorMessage: string | null = null;

    if (server.type === 'stdio' && server.command) {
      try {
        const child = await execa(server.command, Array.isArray(server.args) ? server.args.slice(0, 3) : ['--version'], {
          timeout: 5000,
          reject: false,
          env: server.env || {},
        });
        if (child.failed && child.code === 'ENOENT') {
          nextStatus = 'error';
          errorMessage = `Executable not found: ${server.command}`;
        }
      } catch (error: any) {
        nextStatus = 'error';
        errorMessage = error.message;
      }
    }

    const [updated] = await db.update(mcpServers)
      .set({ status: nextStatus, errorMessage, updatedAt: new Date() })
      .where(eq(mcpServers.id, serverId))
      .returning();

    res.json(serializeServer(updated));
  } catch (error) {
    logger.error('Failed to test MCP server', error);
    res.status(500).json({ error: "Failed to test server" });
  }
});

// POST /api/projects/:projectId/mcp/servers/:serverId/connect
router.post("/:projectId/mcp/servers/:serverId/connect", async (req: Request, res: Response) => {
  try {
    const projectId = await requireProjectAccess(req, res);
    if (projectId === null) return;
    const serverId = parseInt(req.params.serverId);
    if (Number.isNaN(serverId)) return res.status(400).json({ error: 'Invalid server ID' });

    const [server] = await db.update(mcpServers)
      .set({ status: 'running', errorMessage: null, updatedAt: new Date() })
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.projectId, projectId)))
      .returning();

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    res.json(serializeServer(server));
  } catch (error) {
    logger.error('Failed to connect MCP server', error);
    res.status(500).json({ error: "Failed to connect" });
  }
});

// GET /api/projects/:projectId/mcp/servers/:serverId/tools
router.get("/:projectId/mcp/servers/:serverId/tools", async (req: Request, res: Response) => {
  try {
    const projectId = await requireProjectAccess(req, res);
    if (projectId === null) return;
    const serverId = parseInt(req.params.serverId, 10);
    if (Number.isNaN(serverId)) return res.status(400).json({ error: 'Invalid server ID' });

    const [server] = await db.select().from(mcpServers).where(and(
      eq(mcpServers.id, serverId),
      eq(mcpServers.projectId, projectId)
    ));

    if (!server) return res.status(404).json({ error: 'Server not found' });
    res.json(getToolsForServer(server));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tools" });
  }
});

// POST /api/projects/:projectId/mcp/init-builtin
router.post("/:projectId/mcp/init-builtin", async (req: Request, res: Response) => {
  try {
    const projectId = await requireProjectAccess(req, res);
    if (projectId === null) return;

    for (const template of BUILTIN_SERVER_TEMPLATES) {
      const existing = await db.select().from(mcpServers)
        .where(and(eq(mcpServers.projectId, projectId), eq(mcpServers.name, template.name)));

      if (existing.length === 0) {
        await db.insert(mcpServers).values({
          projectId,
          name: template.name,
          type: template.type,
          command: template.command,
          args: [...template.args],
          status: 'stopped',
        });
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to init builtin MCP servers', error);
    res.status(500).json({ error: "Failed to init servers" });
  }
});

// GET /api/projects/:projectId/mcp/tools
router.get("/:projectId/mcp/tools", async (req: Request, res: Response) => {
  try {
    const projectId = await requireProjectAccess(req, res);
    if (projectId === null) return;

    const servers = await db.select().from(mcpServers).where(eq(mcpServers.projectId, projectId));
    const tools = servers.flatMap((server) => getToolsForServer(server));
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch aggregated tools" });
  }
});

// POST /api/projects/:projectId/mcp/servers/:serverId/start
router.post("/:projectId/mcp/servers/:serverId/start", async (req: Request, res: Response) => {
  try {
    const projectId = await requireProjectAccess(req, res);
    if (projectId === null) return;
    const serverId = parseInt(req.params.serverId);
    if (Number.isNaN(serverId)) return res.status(400).json({ error: 'Invalid server ID' });
    const [updated] = await db.update(mcpServers)
      .set({ status: 'running', errorMessage: null, updatedAt: new Date() })
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.projectId, projectId)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Server not found' });
    res.json(serializeServer(updated));
  } catch (error) {
    res.status(500).json({ error: "Failed to start server" });
  }
});

// POST /api/projects/:projectId/mcp/servers/:serverId/stop
router.post("/:projectId/mcp/servers/:serverId/stop", async (req: Request, res: Response) => {
  try {
    const projectId = await requireProjectAccess(req, res);
    if (projectId === null) return;
    const serverId = parseInt(req.params.serverId);
    if (Number.isNaN(serverId)) return res.status(400).json({ error: 'Invalid server ID' });
    const [updated] = await db.update(mcpServers)
      .set({ status: 'stopped', updatedAt: new Date() })
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.projectId, projectId)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Server not found' });
    res.json(serializeServer(updated));
  } catch (error) {
    res.status(500).json({ error: "Failed to stop server" });
  }
});

// POST /api/projects/:projectId/mcp/servers/:serverId/restart
router.post("/:projectId/mcp/servers/:serverId/restart", async (req: Request, res: Response) => {
  try {
    const projectId = await requireProjectAccess(req, res);
    if (projectId === null) return;
    const serverId = parseInt(req.params.serverId);
    if (Number.isNaN(serverId)) return res.status(400).json({ error: 'Invalid server ID' });
    const [updated] = await db.update(mcpServers)
      .set({ status: 'running', errorMessage: null, updatedAt: new Date() })
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.projectId, projectId)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Server not found' });
    res.json(serializeServer(updated));
  } catch (error) {
    res.status(500).json({ error: "Failed to restart server" });
  }
});

// GET /api/projects/:projectId/mcp/servers/:serverId/logs
router.get("/:projectId/mcp/servers/:serverId/logs", async (req: Request, res: Response) => {
  try {
    const projectId = await requireProjectAccess(req, res);
    if (projectId === null) return;
    const serverId = parseInt(req.params.serverId, 10);
    if (Number.isNaN(serverId)) return res.status(400).json({ error: 'Invalid server ID' });

    const [server] = await db.select().from(mcpServers).where(and(
      eq(mcpServers.id, serverId),
      eq(mcpServers.projectId, projectId)
    ));

    if (!server) return res.status(404).json({ error: 'Server not found' });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    const initialLines = [
      `[${new Date().toISOString()}] Connected to ${server.name} log stream`,
      `[${new Date().toISOString()}] Current status: ${server.status}`,
    ];

    initialLines.forEach((line) => {
      res.write(`data: ${JSON.stringify(line)}\n\n`);
    });
    
    const interval = setInterval(() => {
      res.write(`data: ${JSON.stringify(`[${new Date().toISOString()}] heartbeat ${server.name}`)}\n\n`);
    }, 15000);
    
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: "Failed to stream logs" });
  }
});

export default router;
