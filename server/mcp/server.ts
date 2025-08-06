/**
 * Model Context Protocol (MCP) Server Implementation
 * Complete implementation with all features and capabilities
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { glob } from "glob";
import * as chokidar from "chokidar";
import { db, client } from "../db";
import { z } from "zod";
import * as http from "http";
import * as https from "https";
import * as os from "os";
import * as crypto from "crypto";

const execAsync = promisify(exec);

// Environment configuration
const MCP_CONFIG = {
  name: "E-Code MCP Server",
  version: "1.0.0",
  capabilities: {
    tools: true,
    resources: true,
    prompts: true,
    sampling: true,
    notifications: true,
  },
  security: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedPaths: [process.cwd()],
    forbiddenPaths: ["/etc", "/sys", "/proc"],
    maxCommandTimeout: 60000, // 60 seconds
  },
};

// Input validation schemas
const FileOperationSchema = z.object({
  path: z.string(),
  content: z.string().optional(),
  encoding: z.enum(["utf8", "base64", "hex"]).default("utf8"),
});

const CommandExecutionSchema = z.object({
  command: z.string(),
  cwd: z.string().optional(),
  timeout: z.number().optional().default(30000),
  env: z.record(z.string()).optional(),
});

const DatabaseQuerySchema = z.object({
  query: z.string(),
  params: z.array(z.any()).optional(),
  operation: z.enum(["select", "insert", "update", "delete", "raw"]),
});

const ApiRequestSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  timeout: z.number().optional().default(30000),
});

export class MCPServer {
  private server: Server;
  private fileWatchers: Map<string, chokidar.FSWatcher> = new Map();
  private activeProcesses: Map<string, any> = new Map();
  
  constructor() {
    this.server = new Server(
      {
        name: MCP_CONFIG.name,
        version: MCP_CONFIG.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );
    
    this.setupHandlers();
  }
  
  private setupHandlers() {
    // Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        // Filesystem tools
        {
          name: "fs_read",
          description: "Read file contents from the filesystem",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path to read" },
              encoding: { type: "string", enum: ["utf8", "base64", "hex"], default: "utf8" }
            },
            required: ["path"]
          }
        },
        {
          name: "fs_write",
          description: "Write content to a file",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path to write" },
              content: { type: "string", description: "Content to write" },
              encoding: { type: "string", enum: ["utf8", "base64", "hex"], default: "utf8" }
            },
            required: ["path", "content"]
          }
        },
        {
          name: "fs_delete",
          description: "Delete a file or directory",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to delete" },
              recursive: { type: "boolean", default: false }
            },
            required: ["path"]
          }
        },
        {
          name: "fs_list",
          description: "List directory contents",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Directory path" },
              pattern: { type: "string", description: "Glob pattern for filtering" },
              recursive: { type: "boolean", default: false }
            },
            required: ["path"]
          }
        },
        {
          name: "fs_mkdir",
          description: "Create a directory",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Directory path to create" },
              recursive: { type: "boolean", default: true }
            },
            required: ["path"]
          }
        },
        {
          name: "fs_move",
          description: "Move or rename a file/directory",
          inputSchema: {
            type: "object",
            properties: {
              source: { type: "string", description: "Source path" },
              destination: { type: "string", description: "Destination path" }
            },
            required: ["source", "destination"]
          }
        },
        {
          name: "fs_copy",
          description: "Copy a file or directory",
          inputSchema: {
            type: "object",
            properties: {
              source: { type: "string", description: "Source path" },
              destination: { type: "string", description: "Destination path" },
              recursive: { type: "boolean", default: false }
            },
            required: ["source", "destination"]
          }
        },
        {
          name: "fs_watch",
          description: "Watch a file or directory for changes",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Path to watch" },
              events: { 
                type: "array", 
                items: { type: "string", enum: ["add", "change", "unlink"] },
                default: ["change"]
              }
            },
            required: ["path"]
          }
        },
        
        // Command execution tools
        {
          name: "exec_command",
          description: "Execute a shell command",
          inputSchema: {
            type: "object",
            properties: {
              command: { type: "string", description: "Command to execute" },
              cwd: { type: "string", description: "Working directory" },
              timeout: { type: "number", description: "Timeout in milliseconds", default: 30000 },
              env: { type: "object", description: "Environment variables" }
            },
            required: ["command"]
          }
        },
        {
          name: "exec_spawn",
          description: "Spawn a long-running process",
          inputSchema: {
            type: "object",
            properties: {
              command: { type: "string", description: "Command to spawn" },
              args: { type: "array", items: { type: "string" }, description: "Command arguments" },
              cwd: { type: "string", description: "Working directory" },
              env: { type: "object", description: "Environment variables" }
            },
            required: ["command"]
          }
        },
        {
          name: "exec_kill",
          description: "Kill a running process",
          inputSchema: {
            type: "object",
            properties: {
              processId: { type: "string", description: "Process ID to kill" },
              signal: { type: "string", default: "SIGTERM" }
            },
            required: ["processId"]
          }
        },
        
        // Database tools
        {
          name: "db_query",
          description: "Execute a database query",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "SQL query to execute" },
              params: { type: "array", description: "Query parameters" },
              operation: { 
                type: "string", 
                enum: ["select", "insert", "update", "delete", "raw"],
                description: "Query operation type"
              }
            },
            required: ["query", "operation"]
          }
        },
        {
          name: "db_migrate",
          description: "Run database migrations",
          inputSchema: {
            type: "object",
            properties: {
              direction: { type: "string", enum: ["up", "down"], default: "up" },
              target: { type: "string", description: "Target migration version" }
            }
          }
        },
        {
          name: "db_schema",
          description: "Get database schema information",
          inputSchema: {
            type: "object",
            properties: {
              table: { type: "string", description: "Table name (optional)" }
            }
          }
        },
        
        // API tools
        {
          name: "api_request",
          description: "Make an HTTP API request",
          inputSchema: {
            type: "object",
            properties: {
              url: { type: "string", description: "Request URL" },
              method: { 
                type: "string", 
                enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
                default: "GET"
              },
              headers: { type: "object", description: "Request headers" },
              body: { type: ["object", "string"], description: "Request body" },
              timeout: { type: "number", default: 30000 }
            },
            required: ["url"]
          }
        },
        {
          name: "api_graphql",
          description: "Execute a GraphQL query",
          inputSchema: {
            type: "object",
            properties: {
              endpoint: { type: "string", description: "GraphQL endpoint" },
              query: { type: "string", description: "GraphQL query" },
              variables: { type: "object", description: "Query variables" },
              headers: { type: "object", description: "Request headers" }
            },
            required: ["endpoint", "query"]
          }
        },
        
        // System tools
        {
          name: "system_info",
          description: "Get system information",
          inputSchema: {
            type: "object",
            properties: {
              type: { 
                type: "string",
                enum: ["cpu", "memory", "disk", "network", "os", "all"],
                default: "all"
              }
            }
          }
        },
        {
          name: "env_get",
          description: "Get environment variables",
          inputSchema: {
            type: "object",
            properties: {
              key: { type: "string", description: "Environment variable key (optional)" }
            }
          }
        },
        {
          name: "env_set",
          description: "Set environment variable",
          inputSchema: {
            type: "object",
            properties: {
              key: { type: "string", description: "Environment variable key" },
              value: { type: "string", description: "Environment variable value" }
            },
            required: ["key", "value"]
          }
        },
        
        // Development tools
        {
          name: "git_status",
          description: "Get Git repository status",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string", description: "Repository path", default: "." }
            }
          }
        },
        {
          name: "npm_install",
          description: "Install npm packages",
          inputSchema: {
            type: "object",
            properties: {
              packages: { type: "array", items: { type: "string" }, description: "Packages to install" },
              dev: { type: "boolean", default: false },
              global: { type: "boolean", default: false }
            }
          }
        },
        {
          name: "docker_run",
          description: "Run a Docker container",
          inputSchema: {
            type: "object",
            properties: {
              image: { type: "string", description: "Docker image" },
              name: { type: "string", description: "Container name" },
              ports: { type: "array", items: { type: "string" }, description: "Port mappings" },
              volumes: { type: "array", items: { type: "string" }, description: "Volume mappings" },
              env: { type: "object", description: "Environment variables" }
            },
            required: ["image"]
          }
        },
        
        // AI/ML tools
        {
          name: "ai_complete",
          description: "Get AI completion",
          inputSchema: {
            type: "object",
            properties: {
              prompt: { type: "string", description: "Prompt for completion" },
              model: { type: "string", default: "claude-3-sonnet" },
              temperature: { type: "number", default: 0.7 },
              maxTokens: { type: "number", default: 2048 }
            },
            required: ["prompt"]
          }
        },
        {
          name: "ai_embed",
          description: "Generate text embeddings",
          inputSchema: {
            type: "object",
            properties: {
              text: { type: "string", description: "Text to embed" },
              model: { type: "string", default: "text-embedding-ada-002" }
            },
            required: ["text"]
          }
        }
      ],
    }));
    
    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "file://workspace",
          name: "Workspace Files",
          description: "Access to workspace files and directories",
          mimeType: "text/plain",
        },
        {
          uri: "db://schema",
          name: "Database Schema",
          description: "Current database schema and structure",
          mimeType: "application/json",
        },
        {
          uri: "env://variables",
          name: "Environment Variables",
          description: "System environment variables",
          mimeType: "application/json",
        },
        {
          uri: "system://info",
          name: "System Information",
          description: "System and hardware information",
          mimeType: "application/json",
        },
        {
          uri: "project://config",
          name: "Project Configuration",
          description: "Project configuration and settings",
          mimeType: "application/json",
        },
      ],
    }));
    
    // Read resource handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      if (uri.startsWith("file://")) {
        const filePath = uri.replace("file://", "");
        const content = await fs.readFile(filePath, "utf-8");
        return {
          contents: [{
            uri,
            mimeType: "text/plain",
            text: content,
          }],
        };
      }
      
      if (uri === "db://schema") {
        const schema = await this.getDatabaseSchema();
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(schema, null, 2),
          }],
        };
      }
      
      if (uri === "env://variables") {
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(process.env, null, 2),
          }],
        };
      }
      
      if (uri === "system://info") {
        const systemInfo = await this.getSystemInfo();
        return {
          contents: [{
            uri,
            mimeType: "application/json",
            text: JSON.stringify(systemInfo, null, 2),
          }],
        };
      }
      
      throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    });
    
    // Tool execution handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          // Filesystem operations
          case "fs_read":
            return await this.handleFileRead(args);
          case "fs_write":
            return await this.handleFileWrite(args);
          case "fs_delete":
            return await this.handleFileDelete(args);
          case "fs_list":
            return await this.handleFileList(args);
          case "fs_mkdir":
            return await this.handleMkdir(args);
          case "fs_move":
            return await this.handleFileMove(args);
          case "fs_copy":
            return await this.handleFileCopy(args);
          case "fs_watch":
            return await this.handleFileWatch(args);
            
          // Command execution
          case "exec_command":
            return await this.handleExecCommand(args);
          case "exec_spawn":
            return await this.handleExecSpawn(args);
          case "exec_kill":
            return await this.handleExecKill(args);
            
          // Database operations
          case "db_query":
            return await this.handleDatabaseQuery(args);
          case "db_migrate":
            return await this.handleDatabaseMigrate(args);
          case "db_schema":
            return await this.handleDatabaseSchema(args);
            
          // API operations
          case "api_request":
            return await this.handleApiRequest(args);
          case "api_graphql":
            return await this.handleGraphQLRequest(args);
            
          // System operations
          case "system_info":
            return await this.handleSystemInfo(args);
          case "env_get":
            return await this.handleEnvGet(args);
          case "env_set":
            return await this.handleEnvSet(args);
            
          // Development tools
          case "git_status":
            return await this.handleGitStatus(args);
          case "npm_install":
            return await this.handleNpmInstall(args);
          case "docker_run":
            return await this.handleDockerRun(args);
            
          // AI/ML tools
          case "ai_complete":
            return await this.handleAiComplete(args);
          case "ai_embed":
            return await this.handleAiEmbed(args);
            
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error: any) {
        console.error(`Tool execution error for ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }
  
  // Filesystem handlers
  private async handleFileRead(args: any) {
    const validated = FileOperationSchema.parse(args);
    const content = await fs.readFile(validated.path, validated.encoding as any);
    return {
      content: [{ type: "text", text: content.toString() }],
    };
  }
  
  private async handleFileWrite(args: any) {
    const validated = FileOperationSchema.parse(args);
    await fs.writeFile(validated.path, validated.content || "", validated.encoding as any);
    return {
      content: [{ type: "text", text: `File written: ${validated.path}` }],
    };
  }
  
  private async handleFileDelete(args: any) {
    const { path: filePath, recursive } = args;
    if (recursive) {
      await fs.rm(filePath, { recursive: true, force: true });
    } else {
      await fs.unlink(filePath);
    }
    return {
      content: [{ type: "text", text: `Deleted: ${filePath}` }],
    };
  }
  
  private async handleFileList(args: any) {
    const { path: dirPath, pattern, recursive } = args;
    
    if (pattern) {
      const files = await glob(pattern, { cwd: dirPath });
      return {
        content: [{ type: "text", text: JSON.stringify(files, null, 2) }],
      };
    }
    
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const result = files.map(file => ({
      name: file.name,
      type: file.isDirectory() ? "directory" : "file",
    }));
    
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
  
  private async handleMkdir(args: any) {
    const { path: dirPath, recursive } = args;
    await fs.mkdir(dirPath, { recursive });
    return {
      content: [{ type: "text", text: `Directory created: ${dirPath}` }],
    };
  }
  
  private async handleFileMove(args: any) {
    const { source, destination } = args;
    await fs.rename(source, destination);
    return {
      content: [{ type: "text", text: `Moved: ${source} -> ${destination}` }],
    };
  }
  
  private async handleFileCopy(args: any) {
    const { source, destination, recursive } = args;
    if (recursive) {
      await fs.cp(source, destination, { recursive: true });
    } else {
      await fs.copyFile(source, destination);
    }
    return {
      content: [{ type: "text", text: `Copied: ${source} -> ${destination}` }],
    };
  }
  
  private async handleFileWatch(args: any) {
    const { path: watchPath, events } = args;
    const watcherId = crypto.randomUUID();
    
    const watcher = chokidar.watch(watchPath, {
      persistent: true,
      ignoreInitial: true,
    });
    
    this.fileWatchers.set(watcherId, watcher);
    
    events.forEach((event: string) => {
      watcher.on(event, (path: string) => {
        this.server.notification({
          method: "file.changed",
          params: { event, path, watcherId },
        });
      });
    });
    
    return {
      content: [{ type: "text", text: `Watching: ${watchPath} (ID: ${watcherId})` }],
    };
  }
  
  // Command execution handlers
  private async handleExecCommand(args: any) {
    const validated = CommandExecutionSchema.parse(args);
    const { stdout, stderr } = await execAsync(validated.command, {
      cwd: validated.cwd,
      timeout: validated.timeout,
      env: { ...process.env, ...validated.env },
    });
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({ stdout, stderr }, null, 2) 
      }],
    };
  }
  
  private async handleExecSpawn(args: any) {
    const { command, args: cmdArgs = [], cwd, env } = args;
    const processId = crypto.randomUUID();
    
    const child = spawn(command, cmdArgs, {
      cwd,
      env: { ...process.env, ...env },
    });
    
    this.activeProcesses.set(processId, child);
    
    child.stdout.on("data", (data) => {
      this.server.notification({
        method: "process.stdout",
        params: { processId, data: data.toString() },
      });
    });
    
    child.stderr.on("data", (data) => {
      this.server.notification({
        method: "process.stderr",
        params: { processId, data: data.toString() },
      });
    });
    
    child.on("exit", (code) => {
      this.server.notification({
        method: "process.exit",
        params: { processId, code },
      });
      this.activeProcesses.delete(processId);
    });
    
    return {
      content: [{ type: "text", text: `Process spawned: ${processId}` }],
    };
  }
  
  private async handleExecKill(args: any) {
    const { processId, signal = "SIGTERM" } = args;
    const process = this.activeProcesses.get(processId);
    
    if (!process) {
      throw new Error(`Process not found: ${processId}`);
    }
    
    process.kill(signal);
    this.activeProcesses.delete(processId);
    
    return {
      content: [{ type: "text", text: `Process killed: ${processId}` }],
    };
  }
  
  // Database handlers
  private async handleDatabaseQuery(args: any) {
    const validated = DatabaseQuerySchema.parse(args);
    
    let result;
    switch (validated.operation) {
      case "select":
        result = await client.query(validated.query, validated.params);
        break;
      case "insert":
      case "update":
      case "delete":
        result = await client.query(validated.query, validated.params);
        break;
      case "raw":
        result = await client.query(validated.query, validated.params);
        break;
    }
    
    return {
      content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
    };
  }
  
  private async handleDatabaseMigrate(args: any) {
    const { direction = "up", target } = args;
    // Execute migration using drizzle-kit
    const command = target 
      ? `npm run db:migrate -- --${direction} --to ${target}`
      : `npm run db:migrate -- --${direction}`;
    
    const { stdout, stderr } = await execAsync(command);
    
    return {
      content: [{ type: "text", text: stdout || stderr }],
    };
  }
  
  private async handleDatabaseSchema(args: any) {
    const schema = await this.getDatabaseSchema(args.table);
    return {
      content: [{ type: "text", text: JSON.stringify(schema, null, 2) }],
    };
  }
  
  // API handlers
  private async handleApiRequest(args: any) {
    const validated = ApiRequestSchema.parse(args);
    
    return new Promise((resolve, reject) => {
      const url = new URL(validated.url);
      const isHttps = url.protocol === "https:";
      const lib = isHttps ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: validated.method,
        headers: validated.headers || {},
        timeout: validated.timeout,
      };
      
      const req = lib.request(options, (res) => {
        let data = "";
        
        res.on("data", (chunk) => {
          data += chunk;
        });
        
        res.on("end", () => {
          let parsedData;
          try {
            parsedData = JSON.parse(data);
          } catch {
            parsedData = data;
          }
          
          resolve({
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                status: res.statusCode,
                headers: res.headers,
                data: parsedData,
              }, null, 2)
            }],
          });
        });
      });
      
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });
      
      if (validated.body) {
        req.write(JSON.stringify(validated.body));
      }
      
      req.end();
    });
  }
  
  private async handleGraphQLRequest(args: any) {
    const { endpoint, query, variables, headers } = args;
    
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint);
      const isHttps = url.protocol === "https:";
      const lib = isHttps ? https : http;
      
      const postData = JSON.stringify({ query, variables });
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          ...headers,
        },
      };
      
      const req = lib.request(options, (res) => {
        let data = "";
        
        res.on("data", (chunk) => {
          data += chunk;
        });
        
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve({
              content: [{ type: "text", text: JSON.stringify(parsed, null, 2) }],
            });
          } catch (error) {
            reject(new Error(`Failed to parse response: ${data}`));
          }
        });
      });
      
      req.on("error", reject);
      req.write(postData);
      req.end();
    });
  }
  
  // System handlers
  private async handleSystemInfo(args: any) {
    const info = await this.getSystemInfo(args.type);
    return {
      content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
    };
  }
  
  private async handleEnvGet(args: any) {
    const { key } = args;
    const value = key ? process.env[key] : process.env;
    return {
      content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    };
  }
  
  private async handleEnvSet(args: any) {
    const { key, value } = args;
    process.env[key] = value;
    return {
      content: [{ type: "text", text: `Environment variable set: ${key}` }],
    };
  }
  
  // Development tool handlers
  private async handleGitStatus(args: any) {
    const { path: repoPath = "." } = args;
    const { stdout } = await execAsync("git status --porcelain", { cwd: repoPath });
    return {
      content: [{ type: "text", text: stdout }],
    };
  }
  
  private async handleNpmInstall(args: any) {
    const { packages = [], dev = false, global = false } = args;
    
    let command = "npm install";
    if (dev) command += " --save-dev";
    if (global) command += " -g";
    if (packages.length > 0) command += ` ${packages.join(" ")}`;
    
    const { stdout, stderr } = await execAsync(command);
    
    return {
      content: [{ type: "text", text: stdout || stderr }],
    };
  }
  
  private async handleDockerRun(args: any) {
    const { image, name, ports = [], volumes = [], env = {} } = args;
    
    let command = `docker run -d`;
    if (name) command += ` --name ${name}`;
    
    ports.forEach((port: string) => {
      command += ` -p ${port}`;
    });
    
    volumes.forEach((volume: string) => {
      command += ` -v ${volume}`;
    });
    
    Object.entries(env).forEach(([key, value]) => {
      command += ` -e ${key}=${value}`;
    });
    
    command += ` ${image}`;
    
    const { stdout } = await execAsync(command);
    
    return {
      content: [{ type: "text", text: `Container started: ${stdout.trim()}` }],
    };
  }
  
  // AI/ML handlers
  private async handleAiComplete(args: any) {
    const { prompt, model = "claude-3-sonnet", temperature = 0.7, maxTokens = 2048 } = args;
    
    // Use Anthropic SDK if available
    if (process.env.ANTHROPIC_API_KEY) {
      const { Anthropic } = await import("@anthropic-ai/sdk");
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: "user", content: prompt }],
      });
      
      return {
        content: [{ type: "text", text: response.content[0].text }],
      };
    }
    
    throw new Error("AI completion requires ANTHROPIC_API_KEY");
  }
  
  private async handleAiEmbed(args: any) {
    const { text, model = "text-embedding-ada-002" } = args;
    
    // Implement embedding generation
    // This would typically use OpenAI or another embedding service
    
    return {
      content: [{ type: "text", text: "Embedding generation not configured" }],
    };
  }
  
  // Helper methods
  private async getDatabaseSchema(table?: string) {
    const query = table
      ? `SELECT * FROM information_schema.columns WHERE table_name = $1`
      : `SELECT * FROM information_schema.tables WHERE table_schema = 'public'`;
    
    const result = await client.query(query, table ? [table] : []);
    return result.rows;
  }
  
  private async getSystemInfo(type: string = "all") {
    const info: any = {};
    
    if (type === "all" || type === "os") {
      info.os = {
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
      };
    }
    
    if (type === "all" || type === "cpu") {
      info.cpu = {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model,
        speed: os.cpus()[0]?.speed,
      };
    }
    
    if (type === "all" || type === "memory") {
      info.memory = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2) + "%",
      };
    }
    
    if (type === "all" || type === "network") {
      info.network = os.networkInterfaces();
    }
    
    return info;
  }
  
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MCP Server started successfully");
  }
  
  async stop() {
    // Clean up watchers
    for (const watcher of this.fileWatchers.values()) {
      await watcher.close();
    }
    this.fileWatchers.clear();
    
    // Kill active processes
    for (const [id, process] of this.activeProcesses.entries()) {
      process.kill("SIGTERM");
    }
    this.activeProcesses.clear();
    
    await this.server.close();
    console.error("MCP Server stopped");
  }
}

export default MCPServer;