/**
 * MCP API Routes
 * Provides endpoints for MCP operations
 */

import { Router, Request, Response } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { getMCPClient } from "../mcp/client";
import { MCPHttpServer } from "../mcp/http-transport";
import MCPServer from "../mcp/server";
import { startMCPStandaloneServer } from "../mcp/standalone-server";
import { 
  authenticateMCP, 
  oauthAuthorize, 
  oauthToken, 
  getAuthInfo 
} from "../mcp/auth";
import { 
  mcpCorsOptions, 
  mcpSecurityHeaders, 
  mcpRateLimitOptions 
} from "../mcp/cors";

const router = Router();

// Apply simpler CORS for development
router.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Apply security headers
router.use(mcpSecurityHeaders());

// Apply rate limiting
const limiter = rateLimit(mcpRateLimitOptions);
router.use(limiter);

// Initialize MCP HTTP server
let mcpHttpServer: MCPHttpServer | null = null;
let mcpServer: MCPServer | null = null;

export function initializeMCPServer(app: any) {
  // Create MCP server instance
  mcpServer = new MCPServer();
  
  // Create HTTP transport server
  mcpHttpServer = new MCPHttpServer(app);
  
  // Connect them
  mcpHttpServer.setMCPServer(mcpServer as any);
  
  // OAuth endpoints (no authentication required)
  app.get('/mcp/oauth/authorize', oauthAuthorize);
  app.post('/mcp/oauth/token', oauthToken);
  
  // Authentication info endpoint
  app.get('/mcp/auth/info', (req: Request, res: Response) => {
    const authInfo = getAuthInfo();
    res.json({
      ...authInfo,
      serverUrl: process.env.MCP_SERVER_URL || `https://${req.hostname}`,
      documentation: 'https://modelcontextprotocol.io/docs',
      version: '1.0.0',
      status: 'active'
    });
  });
  
  // Health check endpoint (no auth required)
  app.get('/mcp/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      capabilities: {
        tools: true,
        resources: true,
        prompts: true,
        oauth: true,
        apiKey: true
      }
    });
  });
  
  // Start the standalone MCP server on port 3200
  startMCPStandaloneServer();
  
  console.log("[MCP] MCP Server initialized with HTTP transport and standalone server");
  console.log("[MCP] OAuth endpoint: /mcp/oauth/authorize");
  console.log("[MCP] API endpoint: /mcp/connect (requires API key or OAuth token)");
}

// Get available MCP tools (protected with authentication for external access)
router.get("/tools", authenticateMCP, async (req: Request, res: Response) => {
  try {
    const client = getMCPClient();
    await client.connect();
    const tools = await client.listTools();
    res.json(tools);
  } catch (error: any) {
    console.error("[MCP] Failed to list tools:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get available MCP resources (protected with authentication for external access)
router.get("/resources", authenticateMCP, async (req: Request, res: Response) => {
  try {
    const client = getMCPClient();
    await client.connect();
    const resources = await client.listResources();
    res.json(resources);
  } catch (error: any) {
    console.error("[MCP] Failed to list resources:", error);
    res.status(500).json({ error: error.message });
  }
});

// GitHub MCP endpoints
router.get("/github/repos/:username", authenticateMCP, async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const client = getMCPClient();
    await client.connect();
    const result = await client.callTool("github_list_repos", { username });
    res.json(result);
  } catch (error: any) {
    console.error("[MCP] GitHub list repos failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/github/repos", authenticateMCP, async (req: Request, res: Response) => {
  try {
    const client = getMCPClient();
    await client.connect();
    const result = await client.callTool("github_create_repo", req.body);
    res.json(result);
  } catch (error: any) {
    console.error("[MCP] GitHub create repo failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/github/issues", authenticateMCP, async (req: Request, res: Response) => {
  try {
    const client = getMCPClient();
    await client.connect();
    const result = await client.callTool("github_create_issue", req.body);
    res.json(result);
  } catch (error: any) {
    console.error("[MCP] GitHub create issue failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// PostgreSQL MCP endpoints
router.get("/postgres/tables", authenticateMCP, async (req: Request, res: Response) => {
  try {
    const { schema = "public" } = req.query;
    const client = getMCPClient();
    await client.connect();
    const result = await client.callTool("postgres_list_tables", { schema });
    res.json(result);
  } catch (error: any) {
    console.error("[MCP] PostgreSQL list tables failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/postgres/query", authenticateMCP, async (req: Request, res: Response) => {
  try {
    const client = getMCPClient();
    await client.connect();
    const result = await client.callTool("postgres_query", req.body);
    res.json(result);
  } catch (error: any) {
    console.error("[MCP] PostgreSQL query failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Export a function to get servers data
export function getMCPServers() {
  return [
    {
      id: 'github',
      name: 'GitHub MCP',
      description: 'GitHub integration for repository management',
      status: process.env.GITHUB_TOKEN ? 'active' : 'inactive',
      tools: ['github_list_repos', 'github_create_repo', 'github_create_issue', 'github_create_pr']
    },
    {
      id: 'postgres',
      name: 'PostgreSQL MCP',
      description: 'Database operations and management',
      status: process.env.DATABASE_URL ? 'active' : 'inactive',
      tools: ['postgres_list_tables', 'postgres_get_schema', 'postgres_query', 'postgres_backup']
    },
    {
      id: 'memory',
      name: 'Memory MCP',
      description: 'Knowledge graph and conversation history',
      status: 'active',
      tools: ['memory_create_node', 'memory_search', 'memory_create_edge', 'memory_save_conversation', 'memory_get_history']
    },
    {
      id: 'slack',
      name: 'Slack MCP',
      description: 'Slack messaging and collaboration',
      status: process.env.SLACK_BOT_TOKEN ? 'active' : 'inactive',
      tools: ['slack_send_message', 'slack_list_channels', 'slack_list_users', 'slack_search_messages', 'slack_upload_file']
    },
    {
      id: 'google-drive',
      name: 'Google Drive MCP',
      description: 'Google Drive file management',
      status: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ? 'active' : 'inactive',
      tools: ['gdrive_list_files', 'gdrive_get_file', 'gdrive_create_file', 'gdrive_update_file', 'gdrive_delete_file', 'gdrive_search_files']
    },
    {
      id: 'figma',
      name: 'Figma MCP',
      description: 'Figma design collaboration',
      status: process.env.FIGMA_API_KEY ? 'active' : 'inactive',
      tools: ['figma_get_file', 'figma_get_nodes', 'figma_get_images', 'figma_get_team_projects', 'figma_get_project_files', 'figma_get_comments', 'figma_post_comment']
    }
  ];
}

// Get list of all MCP servers and their status
router.get("/servers", (req: Request, res: Response) => {
  console.log("[MCP] Getting servers list...");
  try {
    const servers = getMCPServers();
    
    const response = {
      servers,
      totalServers: servers.length,
      activeServers: servers.filter(s => s.status === 'active').length,
      totalTools: servers.reduce((acc, s) => acc + s.tools.length, 0)
    };
    
    console.log("[MCP] Sending servers response:", response);
    res.json(response);
  } catch (error: any) {
    console.error("[MCP] Failed to get servers list:", error);
    console.error("[MCP] Error stack:", error.stack);
    res.status(500).json({ error: error.message || 'Unknown error occurred' });
  }
});

// Memory MCP endpoints
router.post("/memory/node", authenticateMCP, async (req: Request, res: Response) => {
  try {
    const client = getMCPClient();
    await client.connect();
    const result = await client.callTool("memory_create_node", req.body);
    res.json(result);
  } catch (error: any) {
    console.error("[MCP] Memory create node failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/memory/search", authenticateMCP, async (req: Request, res: Response) => {
  try {
    const { query, type, limit = 10 } = req.query;
    const client = getMCPClient();
    await client.connect();
    const result = await client.callTool("memory_search", { 
      query, 
      type, 
      limit: Number(limit) 
    });
    res.json(result);
  } catch (error: any) {
    console.error("[MCP] Memory search failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/memory/conversation", authenticateMCP, async (req: Request, res: Response) => {
  try {
    const client = getMCPClient();
    await client.connect();
    const result = await client.callTool("memory_save_conversation", req.body);
    res.json(result);
  } catch (error: any) {
    console.error("[MCP] Memory save conversation failed:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/memory/history/:userId", authenticateMCP, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { sessionId, limit = 50 } = req.query;
    const client = getMCPClient();
    await client.connect();
    const result = await client.callTool("memory_get_history", { 
      userId, 
      sessionId, 
      limit: Number(limit) 
    });
    res.json(result);
  } catch (error: any) {
    console.error("[MCP] Memory get history failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Execute MCP tool (protected with authentication for external access)
router.post("/tools/:name", authenticateMCP, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const args = req.body;
    
    const client = getMCPClient();
    await client.connect();
    const result = await client.callTool(name, args);
    
    res.json(result);
  } catch (error: any) {
    console.error(`[MCP] Failed to execute tool ${req.params.name}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Read MCP resource
router.get("/resources/:uri", async (req: Request, res: Response) => {
  try {
    const { uri } = req.params;
    
    const client = getMCPClient();
    await client.connect();
    const resource = await client.readResource(uri);
    
    res.json(resource);
  } catch (error: any) {
    console.error(`[MCP] Failed to read resource ${req.params.uri}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// File operations
router.post("/files/read", async (req: Request, res: Response) => {
  try {
    const { path } = req.body;
    
    const client = getMCPClient();
    await client.connect();
    const content = await client.readFile(path);
    
    res.json({ content });
  } catch (error: any) {
    console.error("[MCP] Failed to read file:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/files/write", async (req: Request, res: Response) => {
  try {
    const { path, content } = req.body;
    
    const client = getMCPClient();
    await client.connect();
    await client.writeFile(path, content);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("[MCP] Failed to write file:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/files/list", async (req: Request, res: Response) => {
  try {
    const { path, pattern } = req.body;
    
    const client = getMCPClient();
    await client.connect();
    const files = await client.listFiles(path, pattern);
    
    res.json({ files });
  } catch (error: any) {
    console.error("[MCP] Failed to list files:", error);
    res.status(500).json({ error: error.message });
  }
});

// Command execution
router.post("/exec", async (req: Request, res: Response) => {
  try {
    const { command, cwd, timeout, env } = req.body;
    
    const client = getMCPClient();
    await client.connect();
    const result = await client.executeCommand(command, { cwd, timeout, env });
    
    res.json(result);
  } catch (error: any) {
    console.error("[MCP] Failed to execute command:", error);
    res.status(500).json({ error: error.message });
  }
});

// Database operations
router.post("/database/query", async (req: Request, res: Response) => {
  try {
    const { query, params } = req.body;
    
    const client = getMCPClient();
    await client.connect();
    const results = await client.queryDatabase(query, params);
    
    res.json({ results });
  } catch (error: any) {
    console.error("[MCP] Failed to execute database query:", error);
    res.status(500).json({ error: error.message });
  }
});

// API request proxy
router.post("/api-request", async (req: Request, res: Response) => {
  try {
    const { url, method, headers, body, timeout } = req.body;
    
    const client = getMCPClient();
    await client.connect();
    const response = await client.makeApiRequest(url, { method, headers, body, timeout });
    
    res.json(response);
  } catch (error: any) {
    console.error("[MCP] Failed to make API request:", error);
    res.status(500).json({ error: error.message });
  }
});

// System information
router.get("/system-info", async (req: Request, res: Response) => {
  try {
    const client = getMCPClient();
    await client.connect();
    const info = await client.getSystemInfo();
    
    res.json(info);
  } catch (error: any) {
    console.error("[MCP] Failed to get system info:", error);
    res.status(500).json({ error: error.message });
  }
});

// AI completion
router.post("/ai/complete", async (req: Request, res: Response) => {
  try {
    const { prompt, model, temperature, maxTokens } = req.body;
    
    const client = getMCPClient();
    await client.connect();
    const completion = await client.generateAICompletion(prompt, {
      model,
      temperature,
      maxTokens
    });
    
    res.json({ completion });
  } catch (error: any) {
    console.error("[MCP] Failed to generate AI completion:", error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
router.get("/health", async (req: Request, res: Response) => {
  try {
    const client = getMCPClient();
    await client.connect();
    
    res.json({ 
      status: "healthy",
      server: mcpServer ? "running" : "stopped",
      transport: mcpHttpServer ? "active" : "inactive"
    });
  } catch (error: any) {
    res.status(503).json({ 
      status: "unhealthy",
      error: error.message 
    });
  }
});

export default router;