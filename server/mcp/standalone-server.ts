/**
 * Standalone MCP Server that runs on port 3200
 * This provides the actual MCP functionality for AI operations
 */

import express from 'express';
import cors from 'cors';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { db } from '../db';
import fetch from 'node-fetch';

const execAsync = promisify(exec);
const app = express();
const PORT = 3200;

// Enable CORS for all origins
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[MCP-3200] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'MCP Server', port: PORT });
});

// List available tools
app.get('/tools', (req, res) => {
  const tools = [
    { name: 'fs_read', description: 'Read file contents', category: 'filesystem' },
    { name: 'fs_write', description: 'Write file contents', category: 'filesystem' },
    { name: 'fs_delete', description: 'Delete file', category: 'filesystem' },
    { name: 'fs_list', description: 'List directory contents', category: 'filesystem' },
    { name: 'fs_mkdir', description: 'Create directory', category: 'filesystem' },
    { name: 'fs_move', description: 'Move file or directory', category: 'filesystem' },
    { name: 'fs_copy', description: 'Copy file or directory', category: 'filesystem' },
    { name: 'fs_search', description: 'Search for files', category: 'filesystem' },
    { name: 'exec_command', description: 'Execute shell command', category: 'execution' },
    { name: 'exec_spawn', description: 'Spawn new process', category: 'execution' },
    { name: 'process_kill', description: 'Kill process by PID', category: 'execution' },
    { name: 'db_query', description: 'Execute database query', category: 'database' },
    { name: 'db_schema', description: 'Get database schema', category: 'database' },
    { name: 'db_backup', description: 'Backup database', category: 'database' },
    { name: 'npm_install', description: 'Install npm package', category: 'package' },
    { name: 'npm_uninstall', description: 'Uninstall npm package', category: 'package' },
    { name: 'npm_list', description: 'List installed packages', category: 'package' },
    { name: 'ai_complete', description: 'Get AI completion', category: 'ai' },
    { name: 'api_request', description: 'Make HTTP request', category: 'network' },
  ];
  res.json(tools);
});

// Execute tool
app.post('/tools/:toolName', async (req, res) => {
  const { toolName } = req.params;
  const args = req.body;
  
  console.log(`[MCP-3200] Executing tool: ${toolName}`, args);
  
  try {
    let result: any;
    
    switch (toolName) {
      // File System Operations
      case 'fs_read':
        result = await fs.readFile(args.path, 'utf8');
        res.json({ content: [{ type: 'text', text: result }] });
        break;
        
      case 'fs_write':
        await fs.writeFile(args.path, args.content, 'utf8');
        res.json({ content: [{ type: 'text', text: `File written: ${args.path}` }] });
        break;
        
      case 'fs_delete':
        await fs.unlink(args.path);
        res.json({ content: [{ type: 'text', text: `File deleted: ${args.path}` }] });
        break;
        
      case 'fs_list':
        const files = await fs.readdir(args.path || '.');
        res.json({ content: [{ type: 'text', text: JSON.stringify(files) }] });
        break;
        
      case 'fs_mkdir':
        await fs.mkdir(args.path, { recursive: true });
        res.json({ content: [{ type: 'text', text: `Directory created: ${args.path}` }] });
        break;
        
      case 'fs_move':
        await fs.rename(args.source, args.destination);
        res.json({ content: [{ type: 'text', text: `Moved ${args.source} to ${args.destination}` }] });
        break;
        
      case 'fs_copy':
        const content = await fs.readFile(args.source);
        await fs.writeFile(args.destination, content);
        res.json({ content: [{ type: 'text', text: `Copied ${args.source} to ${args.destination}` }] });
        break;
        
      case 'fs_search':
        const searchDir = args.path || '.';
        const searchPattern = args.pattern || '*';
        const { stdout } = await execAsync(`find ${searchDir} -name "${searchPattern}" -type f`);
        const foundFiles = stdout.split('\n').filter(Boolean);
        res.json({ content: [{ type: 'text', text: JSON.stringify(foundFiles) }] });
        break;
        
      // Command Execution
      case 'exec_command':
        const { stdout: cmdOut, stderr: cmdErr } = await execAsync(args.command, { 
          cwd: args.cwd || process.cwd(),
          timeout: args.timeout || 30000
        });
        res.json({ 
          content: [{ 
            type: 'text', 
            text: cmdOut || cmdErr || 'Command executed successfully' 
          }] 
        });
        break;
        
      case 'exec_spawn':
        const child = spawn(args.command, args.args || [], {
          cwd: args.cwd || process.cwd(),
          detached: true
        });
        child.unref();
        res.json({ 
          content: [{ 
            type: 'text', 
            text: `Process spawned with PID: ${child.pid}`,
            data: { pid: child.pid }
          }] 
        });
        break;
        
      case 'process_kill':
        process.kill(args.pid);
        res.json({ content: [{ type: 'text', text: `Process ${args.pid} killed` }] });
        break;
        
      // Database Operations
      case 'db_query':
        try {
          const dbResult = await db.execute(args.query);
          res.json({ content: [{ type: 'text', text: JSON.stringify(dbResult) }] });
        } catch (dbError: any) {
          res.json({ 
            content: [{ type: 'text', text: `Database error: ${dbError.message}` }],
            isError: true
          });
        }
        break;
        
      case 'db_schema':
        const schema = await db.execute(`
          SELECT table_name, column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public'
          ORDER BY table_name, ordinal_position
        `);
        res.json({ content: [{ type: 'text', text: JSON.stringify(schema) }] });
        break;
        
      // Package Management
      case 'npm_install':
        const { stdout: npmOut } = await execAsync(`npm install ${args.package}`, {
          cwd: args.cwd || process.cwd()
        });
        res.json({ content: [{ type: 'text', text: npmOut }] });
        break;
        
      case 'npm_uninstall':
        const { stdout: npmUnOut } = await execAsync(`npm uninstall ${args.package}`, {
          cwd: args.cwd || process.cwd()
        });
        res.json({ content: [{ type: 'text', text: npmUnOut }] });
        break;
        
      case 'npm_list':
        const { stdout: npmListOut } = await execAsync('npm list --depth=0', {
          cwd: args.cwd || process.cwd()
        });
        res.json({ content: [{ type: 'text', text: npmListOut }] });
        break;
        
      // AI Operations
      case 'ai_complete':
        // Forward to OpenAI API if available
        if (process.env.OPENAI_API_KEY) {
          const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: args.model || 'gpt-4o-mini',
              messages: args.messages || [{ role: 'user', content: args.prompt }],
              temperature: args.temperature || 0.7,
            }),
          });
          const aiData = await aiResponse.json();
          res.json({ 
            content: [{ 
              type: 'text', 
              text: aiData.choices?.[0]?.message?.content || 'No response' 
            }] 
          });
        } else {
          res.json({ 
            content: [{ type: 'text', text: 'AI service not configured' }],
            isError: true
          });
        }
        break;
        
      // HTTP Requests
      case 'api_request':
        const apiResponse = await fetch(args.url, {
          method: args.method || 'GET',
          headers: args.headers || {},
          body: args.body ? JSON.stringify(args.body) : undefined,
        });
        const apiData = await apiResponse.text();
        res.json({ content: [{ type: 'text', text: apiData }] });
        break;
        
      default:
        res.status(404).json({ 
          error: `Tool not found: ${toolName}`,
          content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
          isError: true
        });
    }
  } catch (error: any) {
    console.error(`[MCP-3200] Error executing tool ${toolName}:`, error);
    res.status(500).json({ 
      error: error.message,
      content: [{ type: 'text', text: error.message }],
      isError: true
    });
  }
});

// Start server
export function startMCPStandaloneServer() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MCP] ✅ Standalone MCP Server running on port ${PORT}`);
    console.log(`[MCP] Available at: http://localhost:${PORT}`);
    console.log(`[MCP] Tools endpoint: http://localhost:${PORT}/tools`);
    console.log(`[MCP] Ready for AI agent operations`);
  });
}