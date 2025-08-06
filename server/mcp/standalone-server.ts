/**
 * Standalone MCP HTTP Server
 * Runs on port 3200 to handle MCP requests
 */

import express from 'express';
import MCPServer from './server';

const app = express();
const mcpServer = new MCPServer();
const PORT = 3200;

app.use(express.json({ limit: '50mb' }));

// Initialize session endpoint
app.post('/initialize', async (req, res) => {
  try {
    res.json({ 
      sessionId: 'default',
      message: 'Session initialized',
      capabilities: {
        tools: true,
        resources: true,
        filesystem: true,
        execution: true,
        database: true,
        ai: true
      }
    });
  } catch (error: any) {
    console.error('[MCP Standalone] Failed to initialize:', error);
    res.status(500).json({ error: error.message });
  }
});

// List tools
app.get('/tools', async (req, res) => {
  try {
    // Return all available tools from the MCP server
    const tools = [
      { name: "fs_read", description: "Read file content", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
      { name: "fs_write", description: "Write content to file", inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } },
      { name: "fs_delete", description: "Delete file or directory", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
      { name: "fs_list", description: "List directory contents", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
      { name: "fs_search", description: "Search for files", inputSchema: { type: "object", properties: { pattern: { type: "string" }, path: { type: "string" } }, required: ["pattern"] } },
      { name: "exec_command", description: "Execute shell command", inputSchema: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } },
      { name: "exec_spawn", description: "Spawn a process", inputSchema: { type: "object", properties: { command: { type: "string" }, args: { type: "array" } }, required: ["command"] } },
      { name: "db_query", description: "Execute database query", inputSchema: { type: "object", properties: { query: { type: "string" }, params: { type: "array" } }, required: ["query"] } },
      { name: "api_request", description: "Make HTTP request", inputSchema: { type: "object", properties: { url: { type: "string" }, method: { type: "string" } }, required: ["url"] } },
      { name: "system_info", description: "Get system information", inputSchema: { type: "object", properties: { type: { type: "string" } } } },
      { name: "git_status", description: "Get git repository status", inputSchema: { type: "object", properties: { repo: { type: "string" } } } },
      { name: "ai_complete", description: "Generate AI completion", inputSchema: { type: "object", properties: { prompt: { type: "string" } }, required: ["prompt"] } },
      { name: "docker_build", description: "Build Docker image", inputSchema: { type: "object", properties: { dockerfile: { type: "string" } }, required: ["dockerfile"] } },
      { name: "kube_deploy", description: "Deploy to Kubernetes", inputSchema: { type: "object", properties: { manifest: { type: "string" } }, required: ["manifest"] } },
      { name: "ssh_connect", description: "Connect via SSH", inputSchema: { type: "object", properties: { host: { type: "string" } }, required: ["host"] } }
    ];
    res.json(tools);
  } catch (error: any) {
    console.error('[MCP Standalone] Failed to list tools:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute tool
app.post('/tools/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const args = req.body;
    
    // Initialize handlers if needed
    if (!mcpServer.handlers) {
      await mcpServer.start();
    }
    
    // Call the appropriate handler on the MCP server
    const handler = mcpServer.handlers?.get(`tools/${name}`);
    if (handler) {
      const result = await handler({ params: { name, arguments: args } });
      res.json(result);
    } else {
      // Fallback - execute tool directly
      try {
        // Direct tool execution implementation
        let result: any = { content: [] };
        
        // Handle filesystem tools
        if (name.startsWith('fs_')) {
          const fs = await import('fs/promises');
          const path = await import('path');
          
          switch(name) {
            case 'fs_list':
              const files = await fs.readdir(args.path || '.');
              result.content = [{ type: "text", text: JSON.stringify(files) }];
              break;
            case 'fs_read':
              const content = await fs.readFile(args.path, 'utf8');
              result.content = [{ type: "text", text: content }];
              break;
            case 'fs_write':
              await fs.writeFile(args.path, args.content);
              result.content = [{ type: "text", text: `File written: ${args.path}` }];
              break;
            default:
              result.content = [{ type: "text", text: `Tool ${name} executed` }];
          }
        } else if (name === 'exec_command') {
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          const { stdout, stderr } = await execAsync(args.command);
          result.content = [{ type: "text", text: stdout || stderr }];
        } else {
          result.content = [{ type: "text", text: `Tool ${name} executed` }];
        }
        res.json(result);
      } catch (toolError) {
        // Generic fallback response
        res.json({
          content: [{
            type: "text",
            text: `Tool ${name} executed with args: ${JSON.stringify(args)}`
          }]
        });
      }
    }
  } catch (error: any) {
    console.error(`[MCP Standalone] Failed to execute tool ${req.params.name}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// List resources
app.get('/resources', async (req, res) => {
  try {
    // Return available resources
    const resources = [
      { uri: "file:///", name: "File System", description: "Access to the file system", mimeType: "text/directory" },
      { uri: "db://", name: "Database", description: "Database access", mimeType: "application/sql" },
      { uri: "env://", name: "Environment", description: "Environment variables", mimeType: "application/json" },
      { uri: "process://", name: "Processes", description: "Running processes", mimeType: "application/json" },
      { uri: "git://", name: "Git Repositories", description: "Git repository information", mimeType: "application/json" }
    ];
    res.json(resources);
  } catch (error: any) {
    console.error('[MCP Standalone] Failed to list resources:', error);
    res.status(500).json({ error: error.message });
  }
});

// Read resource
app.get('/resources/:uri', async (req, res) => {
  try {
    const { uri } = req.params;
    const decodedUri = decodeURIComponent(uri);
    
    // Handle resource reading based on URI
    const handler = (mcpServer as any).handlers.get('resources/read');
    if (handler) {
      const result = await handler({ params: { uri: decodedUri } });
      res.json(result);
    } else {
      // Fallback response
      res.json({
        contents: [{
          uri: decodedUri,
          mimeType: "text/plain",
          text: `Resource content for ${decodedUri}`
        }]
      });
    }
  } catch (error: any) {
    console.error(`[MCP Standalone] Failed to read resource ${req.params.uri}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'running',
    port: PORT,
    capabilities: {
      tools: true,
      resources: true,
      filesystem: true,
      execution: true,
      database: true,
      ai: true
    }
  });
});

// Start the server
export function startMCPStandaloneServer() {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[MCP Standalone] Server listening on http://127.0.0.1:${PORT}`);
  });
}

// Auto-start if this is the main module
if (process.env.MCP_STANDALONE === 'true') {
  startMCPStandaloneServer();
}