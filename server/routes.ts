import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertProjectSchema, insertFileSchema, insertProjectCollaboratorSchema, insertDeploymentSchema } from "@shared/schema";
import * as z from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { 
  generateCompletion, 
  generateExplanation, 
  convertCode, 
  generateDocumentation, 
  generateTests 
} from "./ai";
import { setupTerminalWebsocket } from "./terminal";

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
  
  // Create HTTP server and WebSocket servers
  const httpServer = createServer(app);
  
  // WebSocket for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // WebSocket for terminal connections
  setupTerminalWebsocket(httpServer);
  
  // Handle WebSocket connections for real-time collaboration
  const clients = new Map(); // Map to store clients and their project/file info
  
  wss.on("connection", (ws) => {
    let clientInfo = {
      userId: null,
      username: null,
      projectId: null,
      fileId: null
    };
    
    // Handle incoming messages from clients
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Update client info for the first message
        if (data.userId && !clientInfo.userId) {
          clientInfo = {
            userId: data.userId,
            username: data.username,
            projectId: data.projectId,
            fileId: data.fileId
          };
          
          // Store client info for broadcasting to specific rooms
          clients.set(ws, clientInfo);
        }
        
        // Broadcast to all clients in the same project except sender
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            const info = clients.get(client);
            // Only send to clients in the same project
            if (info && info.projectId === data.projectId) {
              client.send(JSON.stringify(data));
            }
          }
        });
        
        // Log collaboration events (excluding cursor movements to reduce noise)
        if (data.type !== 'cursor_move') {
          console.log(`Collaboration event: ${data.type} in project ${data.projectId} from ${data.username}`);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    
    // Handle disconnection
    ws.on("close", () => {
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
        
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            const info = clients.get(client);
            // Only send to clients in the same project
            if (info && info.projectId === clientInfo.projectId) {
              client.send(JSON.stringify(leaveMessage));
            }
          }
        });
        
        // Remove from clients map
        clients.delete(ws);
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

  return httpServer;
}
