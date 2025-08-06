import { Router } from 'express';
import githubRoutes from '../mcp/api/github';
import postgresRoutes from '../mcp/api/postgres';
import memoryRoutes from '../mcp/api/memory';

const router = Router();

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

// Initialize MCP server (placeholder for compatibility)
export function initializeMCPServer() {
  console.log('[MCP] Server routes initialized');
}

// Get MCP servers (placeholder for compatibility)
export function getMCPServers() {
  return ['github', 'postgres', 'memory'];
}

export default router;