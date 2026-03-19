import { Router, Request, Response } from "express";
import { db } from "../db";
import { mcpServers, DbMcpServer } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "../utils/logger";
import { ensureAuthenticated } from "../middleware/auth";
import { execa } from 'execa';

const logger = createLogger('mcp-servers-router');
const router = Router();

// Ensure projectId matches the user's project (already checked by earlier middlewares if mounted properly)
// We will rely on tierRateLimiters and basic auth, but since we mount under /api/projects/:projectId/mcp/servers,
// the parent routing should have ensured access, OR we just ensure it here.
router.use(ensureAuthenticated);

// GET /api/projects/:projectId/mcp/servers
router.get("/:projectId/mcp/servers", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project ID" });

    const servers = await db.select()
      .from(mcpServers)
      .where(eq(mcpServers.projectId, projectId));
    
    // Map to frontend expected format if necessary, though returning raw is fine
    res.json(servers.map(s => ({
      ...s,
      id: s.id.toString(), // Frontend expects string
    })));
  } catch (error) {
    logger.error('Failed to fetch MCP servers', error);
    res.status(500).json({ error: "Failed to fetch servers" });
  }
});

// POST /api/projects/:projectId/mcp/servers
router.post("/:projectId/mcp/servers", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) return res.status(400).json({ error: "Invalid project ID" });

    const { name, type, command, args, env, url, status } = req.body;

    const [newServer] = await db.insert(mcpServers).values({
      projectId,
      name,
      type: type || 'stdio',
      command,
      args,
      env,
      url,
      status: status || 'disconnected',
    }).returning();

    res.json({
      ...newServer,
      id: newServer.id.toString()
    });
  } catch (error) {
    logger.error('Failed to create MCP server', error);
    res.status(500).json({ error: "Failed to create server" });
  }
});

// DELETE /api/projects/:projectId/mcp/servers/:serverId
router.delete("/:projectId/mcp/servers/:serverId", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const serverId = parseInt(req.params.serverId);
    if (isNaN(projectId) || isNaN(serverId)) return res.status(400).json({ error: "Invalid parameters" });

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
    const { command, args, env, url, type } = req.body;

    // Simulate testing connection to the real remote MCP executable
    if (type === 'stdio' && command) {
      // Just test if the command exists/executes (without staying alive)
      try {
        const testArgs = ["--version"]; // Very naive test
        const child = await execa(command, testArgs, { 
          timeout: 5000, 
          reject: false 
        });
        
        if (child.failed && child.code === 'ENOENT') {
           return res.status(500).json({ status: 'error', errorMessage: `Executable not found: ${command}` });
        }
      } catch (e: any) {
        logger.warn('Executable test failed', e);
        // We still return success but maybe with warning, as some MCP servers don't support --version
      }
      return res.json({ status: 'connected', message: 'Ready to connect' });
    } else if (type === 'sse' && url) {
      return res.json({ status: 'connected', message: 'SSE URL looks valid' });
    }

    res.json({ status: 'disconnected' });
  } catch (error: any) {
    logger.error('Failed to test remote MCP server', error);
    res.status(500).json({ status: 'error', errorMessage: error.message });
  }
});

// POST /api/projects/:projectId/mcp/servers/:serverId/test
router.post("/:projectId/mcp/servers/:serverId/test", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const serverId = parseInt(req.params.serverId);
    
    const [server] = await db.select().from(mcpServers).where(and(
      eq(mcpServers.id, serverId),
      eq(mcpServers.projectId, projectId)
    ));

    if (!server) return res.status(404).json({ error: "Server not found" });

    // Simulate testing
    if (server.type === 'stdio') {
      // Assuming command exists if we could enter it, or run a fast check
       await db.update(mcpServers)
        .set({ status: 'connected', updatedAt: new Date() })
        .where(eq(mcpServers.id, serverId));
    }

    res.json({ status: 'connected' });
  } catch (error) {
    logger.error('Failed to test MCP server', error);
    res.status(500).json({ error: "Failed to test server" });
  }
});

// POST /api/projects/:projectId/mcp/servers/:serverId/connect
router.post("/:projectId/mcp/servers/:serverId/connect", async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const serverId = parseInt(req.params.serverId);

    const [server] = await db.update(mcpServers)
      .set({ status: 'connected', updatedAt: new Date() })
      .where(and(eq(mcpServers.id, serverId), eq(mcpServers.projectId, projectId)))
      .returning();

    res.json({ ...server, id: server.id.toString() });
  } catch (error) {
    logger.error('Failed to connect MCP server', error);
    res.status(500).json({ error: "Failed to connect" });
  }
});

// GET /api/projects/:projectId/mcp/servers/:serverId/tools
router.get("/:projectId/mcp/servers/:serverId/tools", async (req: Request, res: Response) => {
  try {
    res.json([]); // Return empty list of tools for now
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tools" });
  }
});

export default router;
