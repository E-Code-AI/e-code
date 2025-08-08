import { Router, Express } from 'express';
import githubRoutes from '../mcp/api/github';
import postgresRoutes from '../mcp/api/postgres';
import memoryRoutes from '../mcp/api/memory';
import MCPServer from '../mcp/server';
import { MCPClient } from '../mcp/client';
import { SimpleHttpTransport } from '../mcp/simple-http-transport';

const router = Router();

// Global MCP instances
let mcpServerInstance: MCPServer | null = null;
let httpTransport: SimpleHttpTransport | null = null;
let mcpClient: MCPClient | null = null;

// Mount MCP API routes
router.use('/github', githubRoutes);
router.use('/postgres', postgresRoutes);
router.use('/memory', memoryRoutes);

// MCP Server info endpoint
router.get('/servers', (req, res) => {
  res.json({
    servers: [
      {
        id: 'github',
        name: 'GitHub MCP',
        status: 'active',
        endpoints: [
          '/api/mcp/github/repositories',
          '/api/mcp/github/issues',
          '/api/mcp/github/pull-requests'
        ]
      },
      {
        id: 'postgres',
        name: 'PostgreSQL MCP',
        status: 'active',
        endpoints: [
          '/api/mcp/postgres/tables',
          '/api/mcp/postgres/schema/:table',
          '/api/mcp/postgres/query',
          '/api/mcp/postgres/backup'
        ]
      },
      {
        id: 'memory',
        name: 'Memory MCP',
        status: 'active',
        endpoints: [
          '/api/mcp/memory/search',
          '/api/mcp/memory/conversations',
          '/api/mcp/memory/nodes',
          '/api/mcp/memory/edges'
        ]
      }
    ]
  });
});

// MCP Tools endpoint - list all available MCP tools
router.get('/tools', async (req, res) => {
  try {
    if (!mcpClient) {
      res.status(503).json({ error: 'MCP client not initialized' });
      return;
    }
    
    const tools = await mcpClient.listTools();
    res.json(tools);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Call MCP tool endpoint
router.post('/tools/:name', async (req, res) => {
  try {
    if (!mcpClient) {
      res.status(503).json({ error: 'MCP client not initialized' });
      return;
    }
    
    const result = await mcpClient.callTool(req.params.name, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize MCP server with HTTP transport
export function initializeMCPServer(app: Express) {
  try {
    // Create MCP server instance
    mcpServerInstance = new MCPServer();
    
    // Create simple HTTP transport that actually works
    httpTransport = new SimpleHttpTransport(app);
    
    // Connect MCP server to HTTP transport
    if (mcpServerInstance && httpTransport) {
      httpTransport.setMCPServer(mcpServerInstance.getServer());
    }
    
    // Initialize MCP client to connect to standalone MCP server on port 3200
    mcpClient = new MCPClient('http://localhost:3200');
    
    // Auto-connect the client after a short delay
    setTimeout(async () => {
      try {
        await mcpClient?.connect();
        console.log('[MCP] Client connected to server successfully');
      } catch (error) {
        console.error('[MCP] Failed to connect client:', error);
      }
    }, 1000);
    
    console.log('[MCP] ✅ Server fully initialized with HTTP transport on /mcp/*');
    console.log('[MCP] Available tools: fs_read, fs_write, exec_command, db_query, ai_complete, and 70+ more');
    console.log('[MCP] AI Agent can now use MCP for all operations');
    
    return true;
  } catch (error) {
    console.error('[MCP] ❌ Failed to initialize server:', error);
    return false;
  }
}

// Get MCP client instance for use by AI agent
export function getMCPClient(): MCPClient | null {
  return mcpClient;
}

// Get MCP servers with full metadata for UI
export function getMCPServers() {
  return [
    {
      id: 'core',
      name: 'Core MCP Server',
      status: 'active',
      description: 'Main MCP server with file, command, and database tools',
      tools: [
        { name: 'fs_read', description: 'Read file contents' },
        { name: 'fs_write', description: 'Write file contents' },
        { name: 'fs_mkdir', description: 'Create directory' },
        { name: 'exec_command', description: 'Execute shell command' },
        { name: 'db_query', description: 'Execute database query' },
        { name: 'ai_complete', description: 'Get AI completion' }
      ],
      endpoints: [
        '/mcp/connect',
        '/mcp/message',
        '/mcp/disconnect'
      ]
    },
    {
      id: 'github',
      name: 'GitHub MCP',
      status: 'active',
      description: 'GitHub integration for repository management',
      tools: [
        { name: 'github_repos', description: 'List repositories' },
        { name: 'github_issues', description: 'Manage issues' },
        { name: 'github_pr', description: 'Handle pull requests' }
      ],
      endpoints: [
        '/api/mcp/github/repositories',
        '/api/mcp/github/issues',
        '/api/mcp/github/pull-requests'
      ]
    },
    {
      id: 'postgres',
      name: 'PostgreSQL MCP',
      status: 'active',
      description: 'Database management and queries',
      tools: [
        { name: 'postgres_tables', description: 'List database tables' },
        { name: 'postgres_query', description: 'Execute SQL queries' },
        { name: 'postgres_backup', description: 'Database backup' }
      ],
      endpoints: [
        '/api/mcp/postgres/tables',
        '/api/mcp/postgres/schema/:table',
        '/api/mcp/postgres/query',
        '/api/mcp/postgres/backup'
      ]
    },
    {
      id: 'memory',
      name: 'Memory MCP',
      status: 'active',
      description: 'Knowledge graph and memory management',
      tools: [
        { name: 'memory_search', description: 'Search memory' },
        { name: 'memory_store', description: 'Store information' },
        { name: 'memory_retrieve', description: 'Retrieve context' }
      ],
      endpoints: [
        '/api/mcp/memory/search',
        '/api/mcp/memory/conversations',
        '/api/mcp/memory/nodes',
        '/api/mcp/memory/edges'
      ]
    }
  ];
}

export default router;