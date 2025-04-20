import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertProjectSchema, insertFileSchema, insertProjectCollaboratorSchema, insertDeploymentSchema } from "@shared/schema";
import * as z from "zod";
import { devAuthBypass, setupAuthBypass } from "./dev-auth-bypass";
import { WebSocketServer, WebSocket } from "ws";
import * as os from 'os';
import { 
  generateCompletion, 
  generateExplanation, 
  convertCode, 
  generateDocumentation, 
  generateTests 
} from "./ai";
import { setupTerminalWebsocket } from "./terminal";
import { startProject, stopProject, getProjectStatus, attachToProjectLogs, checkRuntimeDependencies } from "./runtime";
import { setupLogsWebsocket } from "./logs";
import { deployProject, stopDeployment, getDeploymentStatus, getDeploymentLogs } from "./deployment";
import { 
  initRepo, 
  isGitRepo, 
  getRepoStatus, 
  addFiles, 
  commit, 
  addRemote, 
  push, 
  pull, 
  cloneRepo, 
  getCommitHistory 
} from "./git";
import {
  getRuntimeDependencies,
  startProjectRuntime,
  stopProjectRuntime,
  getProjectRuntimeStatus,
  executeProjectCommand,
  getProjectRuntimeLogs,
  getLanguageRecommendations
} from "./runtimes/api";
import * as runtimeHealth from "./runtimes/runtime-health";

// Middleware to ensure a user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  console.log('ensureAuthenticated check, isAuthenticated:', req.isAuthenticated());
  console.log('session user:', req.user);
  console.log('session ID:', req.sessionID);
  console.log('cookies:', req.headers.cookie);
  
  if (req.isAuthenticated()) {
    return next();
  }
  
  console.log('Authentication failed in ensureAuthenticated middleware');
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to ensure a user has access to a project
const ensureProjectAccess = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const userId = req.user!.id;
  const projectId = parseInt(req.params.projectId || req.params.id);
  
  // Get the project
  const project = await storage.getProject(projectId);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }
  
  // Check if user is owner
  if (project.ownerId === userId) {
    return next();
  }
  
  // Check if user is collaborator
  const collaborators = await storage.getProjectCollaborators(projectId);
  const isCollaborator = collaborators.some(c => c.userId === userId);
  
  if (isCollaborator) {
    return next();
  }
  
  res.status(403).json({ message: "You don't have access to this project" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Add debug middleware for all API routes
  app.use('/api', (req, res, next) => {
    console.log(`[Auth Debug] Request to ${req.path}, isAuthenticated: ${req.isAuthenticated()}`);
    console.log(`[Auth Debug] Session ID: ${req.sessionID}, user ID: ${req.user?.id || 'not logged in'}`);
    next();
  });
  
  // Create HTTP server and WebSocket servers
  const httpServer = createServer(app);
  
  // WebSocket for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // WebSocket for terminal connections
  const terminalWss = setupTerminalWebsocket(httpServer);
  
  // WebSocket for project logs
  const logsWss = setupLogsWebsocket(httpServer);
  
  // Define WebSocket client interface for collaboration
  interface CollaborationClient extends WebSocket {
    userId?: number;
    username?: string;
    projectId?: number;
    fileId?: number;
    color?: string;
    isAlive: boolean;
  }
  
  // Message types for collaboration
  type CollaborationMessage = {
    type: 'cursor_move' | 'edit' | 'user_joined' | 'user_left' | 'chat_message' | 'pong';
    data: any;
    userId: number;
    username: string;
    projectId: number;
    fileId: number;
    timestamp: number;
  };
  
  // Handle WebSocket connections for real-time collaboration
  const clients = new Map<WebSocket, any>(); // Map to store clients and their project/file info
  const projectClients = new Map<number, Set<WebSocket>>(); // Map projects to connected clients
  
  // Set up ping interval to keep connections alive
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const collaborationWs = ws as CollaborationClient;
      
      if (collaborationWs.isAlive === false) {
        collaborationWs.terminate();
        return;
      }
      
      collaborationWs.isAlive = false;
      collaborationWs.send(JSON.stringify({ type: 'ping' }));
    });
  }, 30000);
  
  wss.on('close', () => {
    clearInterval(pingInterval);
  });
  
  wss.on("connection", (ws: WebSocket) => {
    const collaborationWs = ws as CollaborationClient;
    collaborationWs.isAlive = true;
    
    let clientInfo = {
      userId: null,
      username: null,
      projectId: null,
      fileId: null,
      color: null
    };
    
    // Handle incoming messages from clients
    collaborationWs.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle pong responses
        if (data.type === 'pong') {
          collaborationWs.isAlive = true;
          return;
        }
        
        // Update client info for the first message
        if (data.userId && !clientInfo.userId) {
          clientInfo = {
            userId: data.userId,
            username: data.username,
            projectId: data.projectId,
            fileId: data.fileId,
            color: data.data?.color || null
          };
          
          // Store client info for broadcasting to specific rooms
          clients.set(collaborationWs, clientInfo);
          
          // Add to project clients map
          if (!projectClients.has(data.projectId)) {
            projectClients.set(data.projectId, new Set());
          }
          projectClients.get(data.projectId)?.add(collaborationWs);
          
          // If first join, send list of current collaborators
          if (data.type === 'user_joined') {
            // Send current collaborators to new user
            const currentCollaborators = [];
            
            for (const [client, info] of clients.entries()) {
              if (client !== collaborationWs && info.projectId === data.projectId) {
                currentCollaborators.push({
                  userId: info.userId,
                  username: info.username,
                  color: info.color
                });
              }
            }
            
            if (currentCollaborators.length > 0) {
              collaborationWs.send(JSON.stringify({
                type: 'current_collaborators',
                data: { collaborators: currentCollaborators },
                userId: 0, // System message
                username: 'System',
                projectId: data.projectId,
                fileId: data.fileId,
                timestamp: Date.now()
              }));
            }
          }
        }
        
        // For chat messages, add timestamp if not present
        if (data.type === 'chat_message' && !data.data.timestamp) {
          data.data.timestamp = Date.now();
        }
        
        // Broadcast to all clients in the same project except sender
        const projectId = data.projectId;
        const projectWsClients = projectClients.get(projectId);
        
        if (projectWsClients) {
          projectWsClients.forEach((client) => {
            if (client !== collaborationWs && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(data));
            }
          });
        }
        
        // Log collaboration events (excluding cursor movements to reduce noise)
        if (data.type !== 'cursor_move') {
          console.log(`Collaboration event: ${data.type} in project ${data.projectId} from ${data.username}`);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    
    // Handle ping/pong to keep connection alive
    collaborationWs.on('pong', () => {
      collaborationWs.isAlive = true;
    });
    
    // Handle disconnection
    collaborationWs.on("close", () => {
      if (clientInfo.userId) {
        // Broadcast user left message to others in the same project
        const leaveMessage = {
          type: 'user_left',
          userId: clientInfo.userId,
          username: clientInfo.username,
          projectId: clientInfo.projectId,
          fileId: clientInfo.fileId,
          timestamp: Date.now(),
          data: {}
        };
        
        const projectId = clientInfo.projectId;
        const projectWsClients = projectClients.get(projectId);
        
        if (projectWsClients) {
          projectWsClients.forEach((client) => {
            if (client !== collaborationWs && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(leaveMessage));
            }
          });
          
          // Remove client from project set
          projectWsClients.delete(collaborationWs);
          
          // If no clients left, remove project from map
          if (projectWsClients.size === 0) {
            projectClients.delete(projectId);
          }
        }
        
        // Remove from clients map
        clients.delete(collaborationWs);
        console.log(`User ${clientInfo.username} disconnected from project ${clientInfo.projectId}`);
      }
    });
  });
  
  // Debug middleware to trace session and auth info
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') && req.path !== '/api/user') {
      console.log(`[Auth Debug] Request to ${req.path}, isAuthenticated: ${req.isAuthenticated()}`);
      console.log(`[Auth Debug] Session ID: ${req.sessionID}, user ID: ${req.user?.id || 'not logged in'}`);
    }
    next();
  });

  // prefix all routes with /api
  const apiRouter = app.use('/api', (req, res, next) => {
    next();
  });

  // Get all projects for the authenticated user
  app.get('/api/projects', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const projects = await storage.getProjectsByUser(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  // Get a project by ID
  app.get('/api/projects/:id', ensureProjectAccess, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }

      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: 'Failed to fetch project' });
    }
  });

  // Create a new project
  app.post('/api/projects', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const validation = insertProjectSchema.safeParse({
        ...req.body,
        ownerId: userId
      });
      
      if (!validation.success) {
        return res.status(400).json({ message: 'Invalid project data', errors: validation.error.format() });
      }

      const project = await storage.createProject(validation.data);
      
      // Create default files for the project
      const htmlFile = await storage.createFile({
        name: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My First PLOT Project</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>Welcome to PLOT</h1>
    <p>Your coding journey starts here</p>
  </header>
  
  <main>
    <p>This is a simple HTML page to get you started.</p>
    <button id="myButton">Click Me!</button>
  </main>
  
  <script src="script.js"></script>
</body>
</html>`,
        isFolder: false,
        projectId: project.id,
        parentId: null,
      });
      
      const cssFile = await storage.createFile({
        name: 'styles.css',
        content: `body {
  font-family: Arial, sans-serif;
  line-height: 1.6;
  margin: 0;
  padding: 20px;
  color: #333;
}

header {
  text-align: center;
  margin-bottom: 30px;
}

h1 {
  color: #0070F3;
}

button {
  background-color: #0070F3;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #005cc5;
}`,
        isFolder: false,
        projectId: project.id,
        parentId: null,
      });
      
      const jsFile = await storage.createFile({
        name: 'script.js',
        content: `// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Get the button element
  const button = document.getElementById('myButton');
  
  // Add a click event listener
  button.addEventListener('click', function() {
    alert('Hello from PLOT! Your JavaScript is working!');
  });
});`,
        isFolder: false,
        projectId: project.id,
        parentId: null,
      });

      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create project' });
    }
  });

  // Get all files for a project
  app.get('/api/projects/:id/files', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }

      const files = await storage.getFilesByProject(projectId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: 'Failed to fetch files' });
    }
  });

  // Create a new file or folder
  app.post('/api/projects/:id/files', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }

      // Validate with a schema that doesn't require projectId
      const fileDataSchema = z.object({
        name: z.string().min(1).max(255),
        content: z.string().optional().default(''),
        isFolder: z.boolean().default(false),
        parentId: z.number().nullable().optional(),
      });

      const validation = fileDataSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: 'Invalid file data', errors: validation.error.format() });
      }

      // Add the projectId to the validated data
      const fileData = {
        ...validation.data,
        projectId,
      };

      const file = await storage.createFile(fileData);
      res.status(201).json(file);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create file' });
    }
  });

  // Get a specific file
  app.get('/api/files/:id', ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid file ID' });
      }

      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Check if user has access to this file's project
      const userId = req.user!.id;
      const project = await storage.getProject(file.projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user is owner
      if (project.ownerId !== userId) {
        // Check if user is collaborator
        const collaborators = await storage.getProjectCollaborators(file.projectId);
        const isCollaborator = collaborators.some(c => c.userId === userId);
        
        if (!isCollaborator) {
          return res.status(403).json({ message: "You don't have access to this file" });
        }
      }

      res.json(file);
    } catch (error) {
      console.error("Error fetching file:", error);
      res.status(500).json({ message: 'Failed to fetch file' });
    }
  });

  // Update a file
  app.patch('/api/files/:id', ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid file ID' });
      }

      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Check if user has access to this file's project
      const userId = req.user!.id;
      const project = await storage.getProject(file.projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user is owner
      if (project.ownerId !== userId) {
        // Check if user is collaborator
        const collaborators = await storage.getProjectCollaborators(file.projectId);
        const isCollaborator = collaborators.some(c => c.userId === userId);
        
        if (!isCollaborator) {
          return res.status(403).json({ message: "You don't have access to this file" });
        }
      }

      // Simplified validation for update
      const updateSchema = z.object({
        content: z.string().optional(),
        name: z.string().min(1).max(255).optional(),
      });

      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: 'Invalid update data', errors: validation.error.format() });
      }

      const updatedFile = await storage.updateFile(id, validation.data);
      res.json(updatedFile);
    } catch (error) {
      console.error("Error updating file:", error);
      res.status(500).json({ message: 'Failed to update file' });
    }
  });

  // Delete a file
  app.delete('/api/files/:id', ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid file ID' });
      }

      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Check if user has access to this file's project
      const userId = req.user!.id;
      const project = await storage.getProject(file.projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user is owner
      if (project.ownerId !== userId) {
        // Check if user is collaborator
        const collaborators = await storage.getProjectCollaborators(file.projectId);
        const isCollaborator = collaborators.some(c => c.userId === userId);
        
        if (!isCollaborator) {
          return res.status(403).json({ message: "You don't have access to this file" });
        }
      }

      await storage.deleteFile(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: 'Failed to delete file' });
    }
  });
  
  // AI Routes
  
  // Generate code completion
  app.post('/api/ai/completion', ensureAuthenticated, generateCompletion);
  
  // Generate code explanation
  app.post('/api/ai/explanation', ensureAuthenticated, generateExplanation);
  
  // Convert code between languages
  app.post('/api/ai/convert', ensureAuthenticated, convertCode);
  
  // Generate documentation
  app.post('/api/ai/document', ensureAuthenticated, generateDocumentation);
  
  // Generate tests
  app.post('/api/ai/tests', ensureAuthenticated, generateTests);
  
  // Runtime API Routes
  
  // Get runtime dependencies status (Docker, Nix, etc.)
  app.get('/api/runtime/dependencies', getRuntimeDependencies);
  
  // Project runtime routes
  
  // Start a project (legacy route - keeping for backward compatibility)
  app.post('/api/projects/:id/start', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const result = await startProject(projectId);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error || 'Failed to start project' });
      }
      
      res.json({
        status: 'running',
        url: result.url
      });
    } catch (error) {
      console.error("Error starting project:", error);
      res.status(500).json({ message: 'Failed to start project' });
    }
  });
  
  // Stop a project (legacy route - keeping for backward compatibility)
  app.post('/api/projects/:id/stop', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const result = await stopProject(projectId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error || 'Failed to stop project' });
      }
      
      res.json({ status: 'stopped' });
    } catch (error) {
      console.error("Error stopping project:", error);
      res.status(500).json({ message: 'Failed to stop project' });
    }
  });
  
  // Get project status (legacy route - keeping for backward compatibility)
  app.get('/api/projects/:id/status', ensureProjectAccess, (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const status = getProjectStatus(projectId);
      res.json(status);
    } catch (error) {
      console.error("Error getting project status:", error);
      res.status(500).json({ message: 'Failed to get project status' });
    }
  });
  
  // New runtime API routes with enhanced functionality
  
  // Start a project runtime with advanced options
  app.post('/api/projects/:id/runtime/start', ensureProjectAccess, startProjectRuntime);
  
  // Stop a project runtime
  app.post('/api/projects/:id/runtime/stop', ensureProjectAccess, stopProjectRuntime);
  
  // Get project runtime status
  app.get('/api/projects/:id/runtime', ensureProjectAccess, getProjectRuntimeStatus);
  
  // Execute command in project runtime
  app.post('/api/projects/:id/runtime/execute', ensureProjectAccess, executeProjectCommand);
  
  // Get project runtime logs
  app.get('/api/projects/:id/runtime/logs', ensureProjectAccess, getProjectRuntimeLogs);
  
  // Public endpoint to get runtime dependencies - no auth required
  app.get('/api/runtime/dependencies', getRuntimeDependencies);
  
  // Runtime dashboard route for health status and diagnostics
  app.get('/api/runtime/dashboard', async (req, res) => {
    try {
      // Get system dependencies
      const dependencies = await runtimeHealth.checkSystemDependencies();
      
      // Get active projects/containers
      const activeProjects: Array<{id: number, name: string, status: any}> = [];
      const projectStatuses: Record<string, any> = {};
      
      // Get all projects user has access to
      const projects = req.isAuthenticated() 
        ? await storage.getProjectsByUser(req.user!.id)
        : [];
      
      // Get runtime status for each project
      for (const project of projects) {
        const status = getProjectStatus(project.id);
        if (status.isRunning) {
          activeProjects.push({
            id: project.id,
            name: project.name,
            status: status
          });
        }
        projectStatuses[project.id.toString()] = status;
      }
      
      // System resource usage
      const cpuUsage = os.loadavg()[0]; // 1 minute load average
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = ((totalMemory - freeMemory) / totalMemory * 100).toFixed(2);
      
      res.json({
        status: 'success',
        timestamp: new Date().toISOString(),
        systemHealth: {
          cpuUsage,
          memoryUsage: `${memoryUsage}%`,
          uptime: os.uptime(),
          platform: os.platform(),
          arch: os.arch()
        },
        runtimeEnvironments: dependencies,
        activeProjects,
        projectStatuses,
        recommendations: getLanguageRecommendations(dependencies)
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error getting runtime dashboard: ${errorMessage}`);
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to get runtime dashboard information',
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Deployment routes
  
  // Get all deployments for a project
  app.get('/api/projects/:id/deployments', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const deployments = await storage.getDeployments(projectId);
      res.json(deployments);
    } catch (error) {
      console.error("Error fetching deployments:", error);
      res.status(500).json({ message: 'Failed to fetch deployments' });
    }
  });
  
  // Deploy a project
  app.post('/api/projects/:id/deploy', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const result = await deployProject(projectId);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error || 'Failed to deploy project' });
      }
      
      res.json({
        deploymentId: result.deploymentId,
        url: result.url,
        status: 'deploying'
      });
    } catch (error) {
      console.error("Error deploying project:", error);
      res.status(500).json({ message: 'Failed to deploy project' });
    }
  });
  
  // Stop a deployment
  app.post('/api/deployments/:id/stop', ensureAuthenticated, async (req, res) => {
    try {
      const deploymentId = parseInt(req.params.id);
      if (isNaN(deploymentId)) {
        return res.status(400).json({ message: 'Invalid deployment ID' });
      }
      
      // Get the deployment to check access
      const deployments = await storage.getDeployments(null);
      const deployment = deployments.find(d => d.id === deploymentId);
      
      if (!deployment) {
        return res.status(404).json({ message: 'Deployment not found' });
      }
      
      // Check project access
      const project = await storage.getProject(deployment.projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user is owner or collaborator
      const userId = req.user!.id;
      if (project.ownerId !== userId) {
        const collaborators = await storage.getProjectCollaborators(project.id);
        const isCollaborator = collaborators.some(c => c.userId === userId);
        if (!isCollaborator) {
          return res.status(403).json({ message: "You don't have access to this deployment" });
        }
      }
      
      const result = await stopDeployment(deploymentId);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error || 'Failed to stop deployment' });
      }
      
      res.json({ status: 'stopped' });
    } catch (error) {
      console.error("Error stopping deployment:", error);
      res.status(500).json({ message: 'Failed to stop deployment' });
    }
  });
  
  // Get deployment status
  app.get('/api/deployments/:id/status', ensureAuthenticated, async (req, res) => {
    try {
      const deploymentId = parseInt(req.params.id);
      if (isNaN(deploymentId)) {
        return res.status(400).json({ message: 'Invalid deployment ID' });
      }
      
      // Get the deployment to check access
      const deployments = await storage.getDeployments(null);
      const deployment = deployments.find(d => d.id === deploymentId);
      
      if (!deployment) {
        return res.status(404).json({ message: 'Deployment not found' });
      }
      
      // Check project access
      const project = await storage.getProject(deployment.projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user is owner or collaborator
      const userId = req.user!.id;
      if (project.ownerId !== userId) {
        const collaborators = await storage.getProjectCollaborators(project.id);
        const isCollaborator = collaborators.some(c => c.userId === userId);
        if (!isCollaborator) {
          return res.status(403).json({ message: "You don't have access to this deployment" });
        }
      }
      
      const status = getDeploymentStatus(deploymentId);
      
      // If deployment is not active, return database status
      if (!status.isActive) {
        return res.json({
          status: deployment.status,
          url: deployment.url,
          isActive: false
        });
      }
      
      // Return active deployment status
      res.json({
        status: status.status,
        url: status.url,
        port: status.port,
        isActive: true
      });
    } catch (error) {
      console.error("Error getting deployment status:", error);
      res.status(500).json({ message: 'Failed to get deployment status' });
    }
  });
  
  // Get deployment logs
  app.get('/api/deployments/:id/logs', ensureAuthenticated, async (req, res) => {
    try {
      const deploymentId = parseInt(req.params.id);
      if (isNaN(deploymentId)) {
        return res.status(400).json({ message: 'Invalid deployment ID' });
      }
      
      // Get the deployment to check access
      const deployments = await storage.getDeployments(null);
      const deployment = deployments.find(d => d.id === deploymentId);
      
      if (!deployment) {
        return res.status(404).json({ message: 'Deployment not found' });
      }
      
      // Check project access
      const project = await storage.getProject(deployment.projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user is owner or collaborator
      const userId = req.user!.id;
      if (project.ownerId !== userId) {
        const collaborators = await storage.getProjectCollaborators(project.id);
        const isCollaborator = collaborators.some(c => c.userId === userId);
        if (!isCollaborator) {
          return res.status(403).json({ message: "You don't have access to this deployment" });
        }
      }
      
      const logs = getDeploymentLogs(deploymentId);
      
      res.json({ logs });
    } catch (error) {
      console.error("Error getting deployment logs:", error);
      res.status(500).json({ message: 'Failed to get deployment logs' });
    }
  });
  
  // Git integration routes
  
  // Check if a project is a Git repository
  app.get('/api/projects/:id/git/status', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const result = await getRepoStatus(projectId);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      
      res.json(result.data);
    } catch (error) {
      console.error("Error getting git status:", error);
      res.status(500).json({ message: 'Failed to get git status' });
    }
  });
  
  // Initialize a Git repository
  app.post('/api/projects/:id/git/init', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const result = await initRepo(projectId);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("Error initializing git repository:", error);
      res.status(500).json({ message: 'Failed to initialize git repository' });
    }
  });
  
  // Add files to staging area
  app.post('/api/projects/:id/git/add', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const { files } = req.body;
      
      if (!Array.isArray(files)) {
        return res.status(400).json({ message: 'Files must be an array' });
      }
      
      const result = await addFiles(projectId, files);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("Error adding files:", error);
      res.status(500).json({ message: 'Failed to add files' });
    }
  });
  
  // Commit changes
  app.post('/api/projects/:id/git/commit', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const { message, author } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: 'Commit message is required' });
      }
      
      // If author not provided, use user information
      let commitAuthor;
      if (!author) {
        const user = req.user!;
        commitAuthor = {
          name: user.username,
          email: user.email || `${user.username}@plot.local`
        };
      } else {
        commitAuthor = author;
      }
      
      const result = await commit(projectId, message, commitAuthor);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("Error committing changes:", error);
      res.status(500).json({ message: 'Failed to commit changes' });
    }
  });
  
  // Add remote repository
  app.post('/api/projects/:id/git/remote', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const { name, url } = req.body;
      
      if (!name || !url) {
        return res.status(400).json({ message: 'Remote name and URL are required' });
      }
      
      const result = await addRemote(projectId, name, url);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("Error adding remote:", error);
      res.status(500).json({ message: 'Failed to add remote' });
    }
  });
  
  // Push to remote repository
  app.post('/api/projects/:id/git/push', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const { remote, branch, credentials } = req.body;
      
      const result = await push(
        projectId, 
        remote || 'origin', 
        branch || 'main', 
        credentials
      );
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("Error pushing changes:", error);
      res.status(500).json({ message: 'Failed to push changes' });
    }
  });
  
  // Pull from remote repository
  app.post('/api/projects/:id/git/pull', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const { remote, branch, credentials } = req.body;
      
      const result = await pull(
        projectId, 
        remote || 'origin', 
        branch || 'main', 
        credentials
      );
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("Error pulling changes:", error);
      res.status(500).json({ message: 'Failed to pull changes' });
    }
  });
  
  // Clone repository
  app.post('/api/projects/:id/git/clone', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const { url, credentials } = req.body;
      
      if (!url) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }
      
      const result = await cloneRepo(projectId, url, credentials);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      
      res.json({ message: result.message });
    } catch (error) {
      console.error("Error cloning repository:", error);
      res.status(500).json({ message: 'Failed to clone repository' });
    }
  });
  
  // Get commit history
  app.get('/api/projects/:id/git/history', ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      
      const result = await getCommitHistory(projectId, limit);
      
      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }
      
      res.json(result.data);
    } catch (error) {
      console.error("Error getting commit history:", error);
      res.status(500).json({ message: 'Failed to get commit history' });
    }
  });

  return httpServer;
}
