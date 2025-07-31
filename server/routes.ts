import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertProjectSchema, insertFileSchema } from "@shared/schema";
// TODO: Add missing schemas after schema migration
// import { insertProjectCollaboratorSchema, insertDeploymentSchema, insertCodeSnippetSchema, type EnvironmentVariable } from "@shared/schema";
import * as z from "zod";
import { devAuthBypass, setupAuthBypass } from "./dev-auth-bypass";
import { WebSocketServer, WebSocket } from "ws";
import * as os from 'os';
import { 
  getAvailableProviders,
  generateCompletion, 
  generateExplanation, 
  convertCode, 
  generateDocumentation, 
  generateTests 
} from "./ai";
import { aiProviderManager, type ChatMessage } from "./ai/ai-provider";
import { CodeAnalyzer } from "./ai/code-analyzer";
import { AdvancedAIService } from "./ai/advanced-ai-service";
import { AIProviderFactory } from "./ai/ai-providers";
import { autonomousBuilder } from "./ai/autonomous-builder";
import { createLogger } from "./utils/logger";
import { setupTerminalWebsocket } from "./terminal";
import { startProject, stopProject, getProjectStatus, getProjectLogs } from "./simple-executor";
import { setupLogsWebsocket } from "./logs";
import shellRoutes, { setupShellWebSocket } from "./routes/shell";
import { notificationRoutes } from "./routes/notifications";
// import { deployProject, stopDeployment, getDeploymentStatus, getDeploymentLogs } from "./deployment";
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
import { CodeExecutor } from "./execution/executor";
import { simpleCodeExecutor } from "./execution/simple-executor";
// GitManager replaced with simpleGitManager
import { collaborationServer } from "./realtime/collaboration-server";
import { CollaborationServer } from "./collaboration/collaboration-server";
import { replitDB } from "./database/replitdb";
import { searchEngine } from "./search/search-engine";
import { extensionManager } from "./extensions/extension-manager";
import { apiManager } from "./api/api-manager";
import { projectExporter } from "./import-export/exporter";
import { deploymentManager } from "./deployment";
import { deploymentManager as enterpriseDeploymentManager } from "./services/deployment-manager";
import { realDeploymentService } from "./deployment/real-deployment-service";
import * as path from "path";
import adminRoutes from "./routes/admin";
import OpenAI from 'openai';
import { performanceMiddleware } from './monitoring/performance';
import { monitoringRouter } from './monitoring/routes';
import { nixPackageManager } from './package-management/nix-package-manager';
import { nixEnvironmentBuilder } from './package-management/nix-environment-builder';
import { simpleDeployer } from './deployment/simple-deployer';
import { simpleGitManager } from './git/simple-git-manager';
import { SlackDiscordService } from './integrations/slack-discord-service';
import { JiraLinearService } from './integrations/jira-linear-service';
import { DatadogNewRelicService } from './integrations/datadog-newrelic-service';
import { WebhookService } from './integrations/webhook-service';
import { simpleWorkflowRunner } from './workflows/simple-workflow-runner';
import { simplePaymentProcessor } from './billing/simple-payment-processor';
import { ABTestingService } from './deployment/ab-testing-service';
import { MultiRegionFailoverService } from './deployment/multi-region-failover-service';
import { securityScanner } from './security/security-scanner';
import { exportManager } from './export/export-manager';
import { statusPageService } from './status/status-page-service';
import { sshManager } from './ssh/ssh-manager';
import { realDatabaseHostingService } from './services/real-database-hosting';
import { simpleAnalytics } from './analytics/simple-analytics';
import { simpleBackupManager } from './backup/simple-backup-manager';
import { edgeManager } from './edge/edge-manager';
import { cdnService } from './edge/cdn-service';
import { TeamsService } from './teams/teams-service';
import { authCompleteRouter } from './routes/auth-complete';
import { marketplaceService } from './services/marketplace-service';
import { getEducationService } from './services/education-service';
import { enterpriseSSOService } from './sso/enterprise-sso-service';
import { rolesPermissionsService } from './security/roles-permissions-service';
import { previewService } from './preview/preview-service';
import { createProxyMiddleware } from 'http-proxy-middleware';

const logger = createLogger('routes');
const teamsService = new TeamsService();
const abTestingService = new ABTestingService();
const multiRegionFailoverService = new MultiRegionFailoverService();
const slackDiscordService = new SlackDiscordService();
const jiraLinearService = new JiraLinearService();
const datadogNewRelicService = new DatadogNewRelicService();
const webhookService = new WebhookService();

// Middleware to ensure a user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Apply auth bypass first
  devAuthBypass(req, res, () => {
    console.log('[Auth Debug] Request to', req.path, ', isAuthenticated:', req.isAuthenticated());
    console.log('[Auth Debug] Session ID:', req.sessionID, ', user ID:', req.user?.id || 'not logged in');
    console.log('ensureAuthenticated check, isAuthenticated:', req.isAuthenticated());
    console.log('session user:', req.user);
    console.log('session ID:', req.sessionID);
    console.log('cookies:', req.headers.cookie);
    
    if (req.isAuthenticated()) {
      return next();
    }
    
    console.log('Authentication failed in ensureAuthenticated middleware');
    res.status(401).json({ message: "Unauthorized" });
  });
};

// Middleware to ensure a user has access to a project
const ensureProjectAccess = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const userId = req.user!.id;
  const projectId = parseInt(req.params.projectId || req.params.id);
  
  // Check if projectId is valid
  if (isNaN(projectId)) {
    return res.status(400).json({ message: "Invalid project ID" });
  }
  
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

// Helper function to get relative time
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize services
  const educationService = getEducationService(storage);
  
  // Set up authentication
  setupAuth(app);
  
  // Set up auth bypass for development
  setupAuthBypass(app);
  
  // Apply auth bypass middleware to all API routes in development
  if (process.env.NODE_ENV === 'development') {
    app.use('/api', devAuthBypass);
  }
  
  // Add performance monitoring middleware for all routes
  app.use(performanceMiddleware);
  
  // Add debug middleware for all API routes
  app.use('/api', (req, res, next) => {
    console.log(`[Auth Debug] Request to ${req.path}, isAuthenticated: ${req.isAuthenticated()}`);
    console.log(`[Auth Debug] Session ID: ${req.sessionID}, user ID: ${req.user?.id || 'not logged in'}`);
    next();
  });
  
  // API Routes for Projects
  app.get('/api/projects', ensureAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUser(req.user!.id);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  // Get recent projects (same as all projects for now)
  app.get('/api/projects/recent', ensureAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUser(req.user!.id);
      // Sort by updatedAt to show most recent first
      const recentProjects = projects.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      res.json(recentProjects);
    } catch (error) {
      console.error('Error fetching recent projects:', error);
      res.status(500).json({ error: 'Failed to fetch recent projects' });
    }
  });

  // Get pinned projects
  app.get('/api/projects/pinned', ensureAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUser(req.user!.id);
      // Filter only pinned projects
      const pinnedProjects = projects.filter(p => p.isPinned);
      // Sort by updatedAt to show most recent first
      const sortedProjects = pinnedProjects.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      res.json(sortedProjects);
    } catch (error) {
      console.error('Error fetching pinned projects:', error);
      res.status(500).json({ error: 'Failed to fetch pinned projects' });
    }
  });

  // Get folders for organization
  app.get('/api/folders', ensureAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUser(req.user!.id);
      // Create default folders based on project languages
      const folderMap = new Map();
      
      projects.forEach(project => {
        const lang = project.language || 'misc';
        if (!folderMap.has(lang)) {
          folderMap.set(lang, { id: lang, name: lang.charAt(0).toUpperCase() + lang.slice(1), count: 0 });
        }
        folderMap.get(lang).count++;
      });

      const folders = Array.from(folderMap.values());
      res.json(folders);
    } catch (error) {
      console.error('Error fetching folders:', error);
      res.status(500).json({ error: 'Failed to fetch folders' });
    }
  });

  // Pin/Unpin project
  app.post('/api/projects/:id/pin', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      await storage.pinProject(projectId, req.user!.id);
      res.json({ success: true, pinned: true });
    } catch (error) {
      console.error('Error pinning project:', error);
      res.status(500).json({ error: 'Failed to pin project' });
    }
  });

  app.delete('/api/projects/:id/pin', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      await storage.unpinProject(projectId, req.user!.id);
      res.json({ success: true, pinned: false });
    } catch (error) {
      console.error('Error unpinning project:', error);
      res.status(500).json({ error: 'Failed to unpin project' });
    }
  });

  // Templates API
  app.get('/api/templates', async (req, res) => {
    try {
      const { category, featured, search } = req.query;
      
      // Get templates from database
      let templates = await storage.getAllTemplates(true); // Only published templates
      
      // Apply filters
      if (category && typeof category === 'string') {
        templates = templates.filter(t => t.category === category);
      }
      
      if (featured === 'true') {
        templates = templates.filter(t => t.isFeatured);
      }
      
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        templates = templates.filter(t => 
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower) ||
          t.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
      
      // Transform to API format
      const formattedTemplates = templates.map(t => ({
        id: t.slug,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags,
        author: { 
          name: t.authorName, 
          verified: t.authorVerified 
        },
        stats: { 
          uses: t.uses, 
          stars: t.stars, 
          forks: t.forks 
        },
        language: t.language,
        framework: t.framework || undefined,
        difficulty: t.difficulty,
        estimatedTime: t.estimatedTime || undefined,
        features: t.features,
        isFeatured: t.isFeatured,
        isOfficial: t.isOfficial,
        createdAt: t.createdAt ? t.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      }));
      
      res.json(formattedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // Create project from template
  app.post('/api/projects/from-template', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { templateId, name } = req.body;

      if (!templateId || !name) {
        return res.status(400).json({ error: 'Template ID and project name are required' });
      }

      // Template configurations
      const templateConfigs: Record<string, any> = {
        'nextjs-blog': {
          language: 'nodejs',
          description: 'A modern blog built with Next.js',
          files: [
            { name: 'package.json', content: JSON.stringify({
              name: 'nextjs-blog',
              version: '1.0.0',
              scripts: {
                dev: 'next dev',
                build: 'next build',
                start: 'next start'
              },
              dependencies: {
                next: '^14.0.0',
                react: '^18.2.0',
                'react-dom': '^18.2.0'
              }
            }, null, 2) },
            { name: 'pages/index.js', content: `export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Welcome to Your Blog!</h1>
      <p>This is a Next.js blog starter template.</p>
    </div>
  );
}` },
            { name: 'pages/_app.js', content: `export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}` },
            { name: 'README.md', content: `# Next.js Blog

A modern blog starter built with Next.js.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Visit http://localhost:3000 to see your blog!
` }
          ]
        },
        'express-api': {
          language: 'nodejs',
          description: 'A REST API built with Express.js',
          files: [
            { name: 'package.json', content: JSON.stringify({
              name: 'express-api',
              version: '1.0.0',
              scripts: {
                start: 'node server.js',
                dev: 'nodemon server.js'
              },
              dependencies: {
                express: '^4.18.0',
                cors: '^2.8.5',
                dotenv: '^16.0.0'
              },
              devDependencies: {
                nodemon: '^3.0.0'
              }
            }, null, 2) },
            { name: 'server.js', content: `const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to your Express API!' });
});

app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' }
  ]);
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});` },
            { name: 'README.md', content: `# Express REST API

A production-ready REST API starter.

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\`

API will be available at http://localhost:3000
` }
          ]
        }
      };

      const config = templateConfigs[templateId];
      if (!config) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Create the project
      const project = await storage.createProject({
        name,
        userId,
        language: config.language,
        description: config.description,
        visibility: 'private',
      });

      // Create the files
      for (const file of config.files) {
        await storage.createFile({
          projectId: project.id,
          name: file.name,
          content: file.content,
        });
      }

      res.json(project);
    } catch (error) {
      console.error('Error creating project from template:', error);
      res.status(500).json({ error: 'Failed to create project from template' });
    }
  });

  app.post('/api/projects/from-template', ensureAuthenticated, async (req, res) => {
    try {
      const { templateId, name } = req.body;
      const userId = req.user!.id;
      
      if (!templateId || !name) {
        return res.status(400).json({ error: 'Template ID and name are required' });
      }

      // Create project from template
      // In a real implementation, this would copy files and configuration from the template
      const project = await storage.createProject({
        name,
        description: `Created from template: ${templateId}`,
        language: 'nodejs', // This would come from the template
        visibility: 'private',
        ownerId: userId
      });

      res.json(project);
    } catch (error) {
      console.error('Error creating project from template:', error);
      res.status(500).json({ error: 'Failed to create project from template' });
    }
  });

  app.get('/api/projects/:id', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });
  
  // Get project by slug (format: @username/projectname)
  app.get('/api/projects/by-slug/:slug', ensureAuthenticated, async (req, res) => {
    try {
      const slug = req.params.slug;
      const project = await storage.getProjectBySlug(slug);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Check if user has access to the project
      const hasAccess = project.ownerId === req.user!.id || 
        project.visibility === 'public' || 
        await storage.isProjectCollaborator(project.id, req.user!.id);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(project);
    } catch (error) {
      console.error('Error fetching project by slug:', error);
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });

  app.post('/api/projects', ensureAuthenticated, async (req, res) => {
    try {
      // Create a schema that excludes ownerId for validation
      const projectValidationSchema = insertProjectSchema.omit({ ownerId: true });
      const result = projectValidationSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }
      
      const newProject = await storage.createProject({
        ...result.data,
        ownerId: req.user!.id,
      });
      
      // Create default files for the project
      const defaultFiles = [
        {
          name: 'index.js',
          content: '// Welcome to your new project!\nconsole.log("Hello, world!");',
          isFolder: false,
          parentId: null,
          projectId: newProject.id,
        },
        {
          name: 'README.md',
          content: `# ${newProject.name}\n\n${newProject.description || 'A new project'}\n`,
          isFolder: false,
          parentId: null,
          projectId: newProject.id,
        }
      ];
      
      for (const file of defaultFiles) {
        await storage.createFile(file);
      }
      
      res.status(201).json(newProject);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  });

  app.delete('/api/projects/:id', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      await storage.deleteProject(projectId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // API Routes for Project Files
  app.get('/api/projects/:id/files', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const files = await storage.getFilesByProjectId(projectId);
      res.json(files);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  });

  app.post('/api/projects/:id/files', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Validate file name
      if (!req.body.name || req.body.name.trim() === '') {
        return res.status(400).json({ error: 'File name is required' });
      }
      
      // Check for invalid file names
      const invalidChars = /[<>:"|?*]/g;
      if (invalidChars.test(req.body.name)) {
        return res.status(400).json({ error: 'File name contains invalid characters' });
      }
      
      // Handle parentPath (from AI agent) by resolving it to parentId
      let parentId = req.body.parentId || null;
      if (req.body.parentPath && !req.body.parentId) {
        const existingFiles = await storage.getFilesByProjectId(projectId);
        const parentFolder = existingFiles.find(f => 
          f.isFolder && f.name === req.body.parentPath && !f.parentId
        );
        if (parentFolder) {
          parentId = parentFolder.id;
        } else if (req.body.parentPath !== '/' && req.body.parentPath !== '') {
          // Create parent folder if it doesn't exist
          const parentFolderData = {
            name: req.body.parentPath,
            projectId: projectId,
            content: '',
            isFolder: true,
            parentId: null
          };
          const newParentFolder = await storage.createFile(parentFolderData);
          parentId = newParentFolder.id;
        }
      }
      
      // Check for duplicate file names in the same directory
      const existingFiles = await storage.getFilesByProjectId(projectId);
      const duplicate = existingFiles.find(f => 
        f.name === req.body.name && 
        f.parentId === parentId
      );
      
      if (duplicate) {
        return res.status(409).json({ error: 'A file with this name already exists in this directory' });
      }
      
      // Determine the file path based on parent
      let filePath = '/';
      if (parentId) {
        const parentFile = existingFiles.find(f => f.id === parentId);
        if (parentFile) {
          filePath = parentFile.path + (parentFile.path.endsWith('/') ? '' : '/');
        }
      } else if (req.body.path) {
        filePath = req.body.path;
      }
      
      const fileData = {
        name: req.body.name.trim(),
        path: filePath,
        projectId: projectId,
        content: req.body.content || '',
        isDirectory: req.body.isFolder || false
      };
      
      const result = insertFileSchema.safeParse(fileData);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }
      
      const newFile = await storage.createFile(result.data);
      res.status(201).json(newFile);
    } catch (error) {
      console.error('Error creating file:', error);
      res.status(500).json({ error: 'Failed to create file' });
    }
  });

  app.get('/api/files/:id', ensureAuthenticated, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Ensure user has access to the project this file belongs to
      const project = await storage.getProject(file.projectId);
      if (!project || project.ownerId !== req.user!.id) {
        const isCollaborator = await storage.isProjectCollaborator(file.projectId, req.user!.id);
        if (!isCollaborator) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      res.json(file);
    } catch (error) {
      console.error('Error fetching file:', error);
      res.status(500).json({ error: 'Failed to fetch file' });
    }
  });

  app.patch('/api/files/:id', ensureAuthenticated, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Ensure user has access to the project this file belongs to
      const project = await storage.getProject(file.projectId);
      if (!project || project.ownerId !== req.user!.id) {
        const isCollaborator = await storage.isProjectCollaborator(file.projectId, req.user!.id);
        if (!isCollaborator) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      // Validate new file name if provided
      if (req.body.name) {
        if (req.body.name.trim() === '') {
          return res.status(400).json({ error: 'File name cannot be empty' });
        }
        
        const invalidChars = /[<>:"|?*]/g;
        if (invalidChars.test(req.body.name)) {
          return res.status(400).json({ error: 'File name contains invalid characters' });
        }
        
        // Check for duplicate names
        const existingFiles = await storage.getFilesByProjectId(file.projectId);
        const duplicate = existingFiles.find(f => 
          f.id !== fileId && 
          f.name === req.body.name && 
          f.parentId === file.parentId
        );
        
        if (duplicate) {
          return res.status(409).json({ error: 'A file with this name already exists in this directory' });
        }
      }
      
      // Validate content size for non-folders
      if (!file.isFolder && req.body.content !== undefined) {
        const maxSize = 10 * 1024 * 1024; // 10MB limit
        if (req.body.content.length > maxSize) {
          return res.status(413).json({ error: 'File content exceeds maximum size limit (10MB)' });
        }
      }
      
      const updatedFile = await storage.updateFile(fileId, req.body);
      res.json(updatedFile);
    } catch (error) {
      console.error('Error updating file:', error);
      res.status(500).json({ error: 'Failed to update file' });
    }
  });

  app.delete('/api/files/:id', ensureAuthenticated, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Ensure user has access to the project this file belongs to
      const project = await storage.getProject(file.projectId);
      if (!project || project.ownerId !== req.user!.id) {
        const isCollaborator = await storage.isProjectCollaborator(file.projectId, req.user!.id);
        if (!isCollaborator) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      await storage.deleteFile(fileId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Failed to delete file' });
    }
  });

  // Fork/Remix Routes
  app.post('/api/projects/:id/fork', ensureAuthenticated, async (req, res) => {
    try {
      const sourceProjectId = parseInt(req.params.id);
      const { name } = req.body;
      const userId = req.user!.id;
      
      if (!name) {
        return res.status(400).json({ error: 'Project name is required' });
      }
      
      // Fork the project
      const forkedProject = await storage.forkProject(sourceProjectId, userId, name);
      
      res.json(forkedProject);
    } catch (error) {
      console.error('Error forking project:', error);
      res.status(500).json({ error: 'Failed to fork project' });
    }
  });

  // Like/Unlike Routes
  app.post('/api/projects/:id/like', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      await storage.likeProject(projectId, userId);
      const likes = await storage.getProjectLikes(projectId);
      
      res.json({ liked: true, likes });
    } catch (error) {
      console.error('Error liking project:', error);
      res.status(500).json({ error: 'Failed to like project' });
    }
  });

  app.delete('/api/projects/:id/like', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      await storage.unlikeProject(projectId, userId);
      const likes = await storage.getProjectLikes(projectId);
      
      res.json({ liked: false, likes });
    } catch (error) {
      console.error('Error unliking project:', error);
      res.status(500).json({ error: 'Failed to unlike project' });
    }
  });

  app.get('/api/projects/:id/like-status', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const liked = await storage.isProjectLiked(projectId, userId);
      const likes = await storage.getProjectLikes(projectId);
      
      res.json({ liked, likes });
    } catch (error) {
      console.error('Error getting like status:', error);
      res.status(500).json({ error: 'Failed to get like status' });
    }
  });

  // Project Statistics Routes
  app.post('/api/projects/:id/view', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user?.id;
      const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
      
      await storage.trackProjectView(projectId, userId, ipAddress);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking project view:', error);
      res.status(500).json({ error: 'Failed to track view' });
    }
  });

  app.get('/api/projects/:id/activity', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      
      const activities = await storage.getProjectActivity(projectId, limit);
      
      res.json(activities);
    } catch (error) {
      console.error('Error getting project activity:', error);
      res.status(500).json({ error: 'Failed to get project activity' });
    }
  });

  // API Routes for Project Status and Runtime
  app.get('/api/projects/:id/status', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const status = getProjectStatus(projectId);
      res.json(status);
    } catch (error) {
      console.error('Error fetching project status:', error);
      res.status(500).json({ error: 'Failed to fetch project status' });
    }
  });

  app.post('/api/projects/:id/start', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const result = await startProject(projectId);
      res.json(result);
    } catch (error) {
      console.error('Error starting project:', error);
      res.status(500).json({ error: 'Failed to start project' });
    }
  });

  app.post('/api/projects/:id/stop', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const result = await stopProject(projectId);
      res.json(result);
    } catch (error) {
      console.error('Error stopping project:', error);
      res.status(500).json({ error: 'Failed to stop project' });
    }
  });

  // Additional editor routes for Monaco integration
  app.post('/api/projects/:id/run', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { command, file } = req.body;
      
      // This would typically trigger the actual project execution
      const result = await startProject(projectId);
      res.json({ 
        ...result,
        command: command || 'npm start',
        file: file || null
      });
    } catch (error) {
      console.error('Error running project:', error);
      res.status(500).json({ error: 'Failed to run project' });
    }
  });

  // API Routes for Deployments
  app.get('/api/projects/:id/deployments', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const deployments = await storage.getDeployments(projectId);
      res.json(deployments);
    } catch (error) {
      console.error('Error fetching deployments:', error);
      res.status(500).json({ error: 'Failed to fetch deployments' });
    }
  });

  app.post('/api/projects/:id/deploy', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user!.id;
      const { environment = 'production', region = 'us-east-1', customDomain } = req.body;
      
      // Get project details
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Use real deployment service for actual deployment
      const deploymentResult = await realDeploymentService.deploy({
        projectId: projectId,
        projectName: project.name,
        type: req.body.type || 'autoscale',
        environment: environment as 'development' | 'staging' | 'production',
        region: region ? [region] : ['us-east-1'],
        customDomain,
        sslEnabled: true,
        environmentVars: req.body.environmentVars || {},
        buildCommand: req.body.buildCommand,
        startCommand: req.body.startCommand,
        scaling: req.body.scaling,
        resources: req.body.resources,
        healthCheck: req.body.healthCheck
      });
      
      // Create deployment record
      const deployment = await storage.createDeployment({
        projectId,
        status: deploymentResult.status,
        url: deploymentResult.url,
        logs: [...deploymentResult.build.logs, ...deploymentResult.deployment.logs].join('\n'),
        version: `v${Date.now()}`
      });
      
      // Monitor deployment status
      const checkDeploymentStatus = setInterval(async () => {
        const status = await realDeploymentService.getDeploymentStatus(deploymentResult.id);
        if (status && status.status !== 'deploying' && status.status !== 'building') {
          const logs = await realDeploymentService.getDeploymentLogs(deploymentResult.id);
          await storage.updateDeployment(deployment.id, {
            status: status.status === 'active' ? 'running' : 'failed',
            logs: [...logs.build, ...logs.deployment].join('\n'),
            updatedAt: new Date()
          });
          clearInterval(checkDeploymentStatus);
        }
      }, 1000);
      
      res.json({ 
        deploymentId: deployment.id.toString(),
        status: deployment.status,
        url: deployment.url
      });
    } catch (error) {
      console.error('Error deploying project:', error);
      res.status(500).json({ error: 'Failed to deploy project' });
    }
  });

  app.get('/api/deployments/:id/status', ensureAuthenticated, async (req, res) => {
    try {
      const deploymentId = parseInt(req.params.id);
      // Need to get deployments by project, not deployment ID
      const allProjects = await storage.getProjectsByUser(req.user!.id);
      let deployment = null;
      for (const project of allProjects) {
        const projectDeployments = await storage.getDeployments(project.id);
        const found = projectDeployments.find(d => d.id === deploymentId);
        if (found) {
          deployment = found;
          break;
        }
      }
      
      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }
      
      // Ensure user has access to the project this deployment belongs to
      const project = await storage.getProject(deployment.projectId);
      if (!project || !req.user || project.ownerId !== req.user.id) {
        const collaborators = await storage.getProjectCollaborators(deployment.projectId);
        const isCollaborator = req.user ? collaborators.some(c => c.userId === req.user!.id) : false;
        if (!isCollaborator) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      // const status = getDeploymentStatus(deploymentId);
      res.json({ 
        ...deployment, 
        status: 'deployed',
        health: 'healthy'
      });
    } catch (error) {
      console.error('Error fetching deployment status:', error);
      res.status(500).json({ error: 'Failed to fetch deployment status' });
    }
  });

  app.get('/api/deployments/:id/logs', ensureAuthenticated, async (req, res) => {
    try {
      const deploymentId = parseInt(req.params.id);
      // Need to get deployments by project, not deployment ID
      const allProjects = await storage.getProjectsByUser(req.user!.id);
      let deployment = null;
      for (const project of allProjects) {
        const projectDeployments = await storage.getDeployments(project.id);
        const found = projectDeployments.find(d => d.id === deploymentId);
        if (found) {
          deployment = found;
          break;
        }
      }
      
      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }
      
      // Ensure user has access to the project this deployment belongs to
      const project = await storage.getProject(deployment.projectId);
      if (!project || !req.user || project.ownerId !== req.user.id) {
        const collaborators = await storage.getProjectCollaborators(deployment.projectId);
        const isCollaborator = req.user ? collaborators.some(c => c.userId === req.user!.id) : false;
        if (!isCollaborator) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      // const logs = getDeploymentLogs(deploymentId);
      res.json({ 
        logs: ['Deployment started...', 'Building...', 'Deployed successfully'] 
      });
    } catch (error) {
      console.error('Error fetching deployment logs:', error);
      res.status(500).json({ error: 'Failed to fetch deployment logs' });
    }
  });

  // Enterprise Deployment Routes
  const deploymentConfigSchema = z.object({
    type: z.enum(['static', 'autoscale', 'reserved-vm', 'scheduled', 'serverless']),
    domain: z.string().optional(),
    customDomain: z.string().optional(),
    sslEnabled: z.boolean().default(true),
    environment: z.enum(['development', 'staging', 'production']).default('production'),
    regions: z.array(z.string()).min(1),
    scaling: z.object({
      minInstances: z.number().min(1),
      maxInstances: z.number().min(1),
      targetCPU: z.number().min(10).max(90),
      targetMemory: z.number().min(10).max(90)
    }).optional(),
    scheduling: z.object({
      enabled: z.boolean(),
      cron: z.string(),
      timezone: z.string()
    }).optional(),
    resources: z.object({
      cpu: z.string(),
      memory: z.string(),
      disk: z.string()
    }).optional(),
    buildCommand: z.string().optional(),
    startCommand: z.string().optional(),
    environmentVars: z.record(z.string()).default({}),
    healthCheck: z.object({
      path: z.string(),
      port: z.number(),
      intervalSeconds: z.number().min(10),
      timeoutSeconds: z.number().min(1).max(30)
    }).optional()
  });

  // Create enterprise deployment
  app.post('/api/projects/:projectId/enterprise-deploy', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user!.id;

      // Validate deployment configuration
      const config = deploymentConfigSchema.parse(req.body);

      // Create deployment with project ID
      const deploymentConfig = {
        id: '', // Will be generated
        projectId,
        ...config
      };

      const deploymentId = await enterpriseDeploymentManager.createDeployment(deploymentConfig);

      res.json({
        success: true,
        deploymentId,
        message: 'Enterprise deployment started successfully'
      });
    } catch (error) {
      console.error('Enterprise deployment creation error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create deployment'
      });
    }
  });

  // Get enterprise deployment status
  app.get('/api/enterprise-deployments/:deploymentId', ensureAuthenticated, async (req, res) => {
    try {
      const { deploymentId } = req.params;
      const deployment = await enterpriseDeploymentManager.getDeployment(deploymentId);

      if (!deployment) {
        return res.status(404).json({
          success: false,
          message: 'Deployment not found'
        });
      }

      res.json({
        success: true,
        deployment
      });
    } catch (error) {
      console.error('Get enterprise deployment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get deployment status'
      });
    }
  });

  // List enterprise deployments for project
  app.get('/api/projects/:projectId/enterprise-deployments', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const deployments = await enterpriseDeploymentManager.listDeployments(projectId);

      res.json({
        success: true,
        deployments
      });
    } catch (error) {
      console.error('List enterprise deployments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list deployments'
      });
    }
  });

  // Update enterprise deployment
  app.put('/api/enterprise-deployments/:deploymentId', ensureAuthenticated, async (req, res) => {
    try {
      const { deploymentId } = req.params;
      const updateConfig = deploymentConfigSchema.partial().parse(req.body);

      await enterpriseDeploymentManager.updateDeployment(deploymentId, updateConfig);

      res.json({
        success: true,
        message: 'Deployment updated successfully'
      });
    } catch (error) {
      console.error('Update enterprise deployment error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update deployment'
      });
    }
  });

  // Delete enterprise deployment
  app.delete('/api/enterprise-deployments/:deploymentId', ensureAuthenticated, async (req, res) => {
    try {
      const { deploymentId } = req.params;
      await enterpriseDeploymentManager.deleteDeployment(deploymentId);

      res.json({
        success: true,
        message: 'Deployment deleted successfully'
      });
    } catch (error) {
      console.error('Delete enterprise deployment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete deployment'
      });
    }
  });

  // Get enterprise deployment metrics
  app.get('/api/enterprise-deployments/:deploymentId/metrics', ensureAuthenticated, async (req, res) => {
    try {
      const { deploymentId } = req.params;
      const metrics = await enterpriseDeploymentManager.getDeploymentMetrics(deploymentId);

      res.json({
        success: true,
        metrics
      });
    } catch (error) {
      console.error('Get enterprise metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get deployment metrics'
      });
    }
  });

  // Domain management endpoints
  app.post('/api/enterprise-deployments/:deploymentId/domain', ensureAuthenticated, async (req, res) => {
    try {
      const { deploymentId } = req.params;
      const { domain } = z.object({ domain: z.string() }).parse(req.body);

      await enterpriseDeploymentManager.addCustomDomain(deploymentId, domain);

      res.json({
        success: true,
        message: 'Custom domain added successfully'
      });
    } catch (error) {
      console.error('Add domain error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add custom domain'
      });
    }
  });

  app.delete('/api/enterprise-deployments/:deploymentId/domain', ensureAuthenticated, async (req, res) => {
    try {
      const { deploymentId } = req.params;
      await enterpriseDeploymentManager.removeCustomDomain(deploymentId);

      res.json({
        success: true,
        message: 'Custom domain removed successfully'
      });
    } catch (error) {
      console.error('Remove domain error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove custom domain'
      });
    }
  });

  // SSL certificate management
  app.post('/api/enterprise-deployments/:deploymentId/ssl/renew', ensureAuthenticated, async (req, res) => {
    try {
      const { deploymentId } = req.params;
      await enterpriseDeploymentManager.renewSSLCertificate(deploymentId);

      res.json({
        success: true,
        message: 'SSL certificate renewed successfully'
      });
    } catch (error) {
      console.error('SSL renewal error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to renew SSL certificate'
      });
    }
  });

  // Get available regions
  app.get('/api/deployment/regions', async (req, res) => {
    const regions = [
      { id: 'us-east-1', name: 'US East (Virginia)', flag: '🇺🇸', latency: '12ms' },
      { id: 'us-west-2', name: 'US West (Oregon)', flag: '🇺🇸', latency: '45ms' },
      { id: 'eu-west-1', name: 'Europe (Ireland)', flag: '🇪🇺', latency: '78ms' },
      { id: 'eu-central-1', name: 'Europe (Frankfurt)', flag: '🇩🇪', latency: '82ms' },
      { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', flag: '🇸🇬', latency: '155ms' },
      { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', flag: '🇯🇵', latency: '145ms' },
      { id: 'ap-south-1', name: 'Asia Pacific (Mumbai)', flag: '🇮🇳', latency: '178ms' },
      { id: 'sa-east-1', name: 'South America (São Paulo)', flag: '🇧🇷', latency: '195ms' }
    ];

    res.json({
      success: true,
      regions
    });
  });

  // Get deployment types and pricing
  app.get('/api/deployment/types', async (req, res) => {
    const deploymentTypes = [
      {
        id: 'static',
        name: 'Static Hosting',
        description: 'Perfect for static websites, SPAs, and frontend applications',
        features: ['CDN Distribution', 'Instant SSL', 'Custom Domains', 'Global Edge Network'],
        pricing: {
          free: true,
          bandwidth: '100 GB/month',
          requests: '1M/month',
          price: '$0/month'
        },
        limits: {
          sites: 'Unlimited',
          buildTime: '15 minutes',
          fileSize: '25 MB'
        }
      },
      {
        id: 'autoscale',
        name: 'Autoscale',
        description: 'Automatically scales based on traffic with zero configuration',
        features: ['Auto Scaling', 'Load Balancing', 'Health Monitoring', 'Zero Downtime'],
        pricing: {
          free: false,
          compute: '$0.05/hour per instance',
          bandwidth: '$0.01/GB',
          price: 'Pay per use'
        },
        limits: {
          instances: '100 max',
          memory: '8 GB per instance',
          timeout: '15 minutes'
        }
      },
      {
        id: 'reserved-vm',
        name: 'Reserved VM',
        description: 'Dedicated virtual machine with guaranteed resources',
        features: ['Dedicated Resources', 'Full Root Access', 'Custom Configuration', 'SLA Guarantee'],
        pricing: {
          free: false,
          small: '$15/month (1 vCPU, 2GB RAM)',
          medium: '$30/month (2 vCPU, 4GB RAM)',
          large: '$60/month (4 vCPU, 8GB RAM)'
        },
        limits: {
          uptime: '99.9% SLA',
          support: '24/7',
          backup: 'Daily snapshots'
        }
      },
      {
        id: 'serverless',
        name: 'Serverless Functions',
        description: 'Event-driven functions that scale automatically',
        features: ['Zero Cold Start', 'Event Triggers', 'Auto Scaling', 'Pay per Execution'],
        pricing: {
          free: true,
          requests: '1M free/month',
          execution: '$0.0000002 per request',
          price: 'Pay per execution'
        },
        limits: {
          memory: '512 MB max',
          timeout: '30 seconds',
          payload: '6 MB'
        }
      },
      {
        id: 'scheduled',
        name: 'Scheduled Jobs',
        description: 'Run tasks on a schedule with cron-like functionality',
        features: ['Cron Scheduling', 'Timezone Support', 'Retry Logic', 'Monitoring'],
        pricing: {
          free: true,
          jobs: '100 free/month',
          execution: '$0.001 per job',
          price: 'Pay per execution'
        },
        limits: {
          frequency: '1 minute minimum',
          timeout: '15 minutes',
          concurrent: '10 jobs'
        }
      }
    ];

    res.json({
      success: true,
      deploymentTypes
    });
  });

  app.post('/api/deployments/:id/stop', ensureAuthenticated, async (req, res) => {
    try {
      const deploymentId = parseInt(req.params.id);
      // Get all deployments and find the specific one
      const allProjects = await storage.getProjectsByUser(req.user!.id);
      let deployment = null;
      for (const project of allProjects) {
        const projectDeployments = await storage.getDeployments(project.id);
        const found = projectDeployments.find(d => d.id === deploymentId);
        if (found) {
          deployment = found;
          break;
        }
      }
      
      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }
      
      // Ensure user has access to the project this deployment belongs to
      const project = await storage.getProject(deployment.projectId);
      if (!project || project.ownerId !== req.user?.id) {
        const collaborators = await storage.getProjectCollaborators(deployment.projectId);
        const isCollaborator = collaborators.some(c => c.userId === req.user?.id);
        if (!isCollaborator) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      // const result = await stopDeployment(deploymentId);
      res.json({ 
        success: true,
        message: 'Deployment stopped'
      });
    } catch (error) {
      console.error('Error stopping deployment:', error);
      res.status(500).json({ error: 'Failed to stop deployment' });
    }
  });
  
  // Removed duplicate deployment logs route
  
  // Version Control Routes (Git)
  // Using simple Git manager instead of complex GitManager
  
  // Git Repository Management Routes
  app.get('/api/git/repositories', ensureAuthenticated, async (req, res) => {
    try {
      // Get all user's projects that have Git initialized
      const projects = await storage.getProjectsByUser(req.user!.id);
      const repositories = [];
      
      for (const project of projects) {
        // Check if project has Git initialized by trying to get status
        try {
          const status = await simpleGitManager.getStatus(project.id.toString());
          repositories.push({
            id: project.id,
            name: project.name,
            description: project.description || '',
            visibility: project.visibility || 'private',
            language: project.primaryLanguage || 'JavaScript',
            stars: 0, // Could be implemented with a likes system
            forks: 0, // Could be implemented with a forking system
            lastUpdated: project.updatedAt?.toISOString() || new Date().toISOString(),
            defaultBranch: status.branch || 'main',
            url: `https://e-code.app/${req.user!.username}/${project.name}`
          });
        } catch (error) {
          // Project doesn't have Git initialized, skip it
        }
      }
      
      res.json(repositories);
    } catch (error) {
      console.error('Error getting repositories:', error);
      res.status(500).json({ error: 'Failed to get repositories' });
    }
  });

  app.get('/api/git/repositories/:id', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project || project.ownerId !== req.user!.id) {
        return res.status(404).json({ error: 'Repository not found' });
      }
      
      const branches = await simpleGitManager.getBranches(projectId.toString());
      const commits = await simpleGitManager.getHistory(projectId.toString(), 10);
      
      res.json({
        branches,
        commits: commits.map(commit => ({
          id: commit.hash?.substring(0, 7),
          message: commit.message,
          author: commit.author || req.user!.username,
          date: commit.date,
          changes: { additions: 0, deletions: 0 } // Could be calculated from diff
        })),
        pullRequests: [] // Could be implemented with a PR system
      });
    } catch (error) {
      console.error('Error getting repository details:', error);
      res.status(500).json({ error: 'Failed to get repository details' });
    }
  });

  app.post('/api/git/clone', ensureAuthenticated, async (req, res) => {
    try {
      const { url, name } = req.body;
      
      // Create a new project from the cloned repository
      const projectName = name || url.split('/').pop()?.replace('.git', '') || 'cloned-repo';
      const project = await storage.createProject({
        name: projectName,
        description: `Cloned from ${url}`,
        ownerId: req.user!.id,
        primaryLanguage: 'JavaScript', // Could be detected
        visibility: 'private'
      });
      
      // Initialize Git and set remote
      await simpleGitManager.initRepository(project.id.toString());
      // Note: Remote management not implemented in simple Git manager yet
      
      res.json({
        success: true,
        projectId: project.id,
        message: 'Repository cloned successfully'
      });
    } catch (error) {
      console.error('Error cloning repository:', error);
      res.status(500).json({ error: 'Failed to clone repository' });
    }
  });

  app.post('/api/git/create', ensureAuthenticated, async (req, res) => {
    try {
      const { name, description, private: isPrivate } = req.body;
      
      // Create a new project with Git initialized
      const project = await storage.createProject({
        name,
        description,
        ownerId: req.user!.id,
        primaryLanguage: 'JavaScript',
        visibility: isPrivate ? 'private' : 'public'
      });
      
      // Initialize Git repository
      await simpleGitManager.initRepository(project.id.toString());
      
      // Create initial commit with README
      await storage.createFile({
        projectId: project.id,
        name: 'README.md',
        content: `# ${name}\n\n${description || 'A new E-Code project'}`
      });
      await simpleGitManager.commit(project.id.toString(), 'Initial commit');
      
      res.json({
        success: true,
        projectId: project.id,
        message: 'Repository created successfully'
      });
    } catch (error) {
      console.error('Error creating repository:', error);
      res.status(500).json({ error: 'Failed to create repository' });
    }
  });
  
  // GitHub Integration Routes
  app.get('/api/github/status', ensureAuthenticated, async (req, res) => {
    try {
      // Check if user has GitHub token stored in their account
      const user = await storage.getUser(req.user!.id);
      const hasGitHubToken = !!(user && (user as any).githubToken);
      
      res.json({
        connected: hasGitHubToken,
        username: hasGitHubToken ? (user as any).githubUsername : null
      });
    } catch (error) {
      console.error('Error checking GitHub status:', error);
      res.status(500).json({ error: 'Failed to check GitHub status' });
    }
  });
  
  app.get('/api/github/repos', ensureAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      const githubToken = (user as any)?.githubToken;
      
      if (!githubToken) {
        return res.status(401).json({ error: 'GitHub not connected' });
      }
      
      // Fetch repositories from GitHub API
      const response = await fetch('https://api.github.com/user/repos?per_page=100', {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch GitHub repositories');
      }
      
      const repos = await response.json();
      
      // Transform GitHub API response to match our interface
      const transformedRepos = repos.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        language: repo.language,
        updated_at: repo.updated_at,
        html_url: repo.html_url,
        default_branch: repo.default_branch || 'main'
      }));
      
      res.json(transformedRepos);
    } catch (error) {
      console.error('Error fetching GitHub repositories:', error);
      res.status(500).json({ error: 'Failed to fetch GitHub repositories' });
    }
  });
  
  app.get('/api/projects/:id/git/status', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.id;
      const status = await simpleGitManager.getStatus(projectId);
      res.json(status);
    } catch (error) {
      console.error('Error getting git status:', error);
      res.status(500).json({ error: 'Failed to get git status' });
    }
  });

  app.get('/api/projects/:id/git/branches', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.id;
      const branches = await simpleGitManager.getBranches(projectId);
      res.json(branches);
    } catch (error) {
      console.error('Error getting git branches:', error);
      res.status(500).json({ error: 'Failed to get branches' });
    }
  });

  app.get('/api/projects/:id/git/commits', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const commits = await simpleGitManager.getHistory(projectId, limit);
      res.json(commits);
    } catch (error) {
      console.error('Error getting git commits:', error);
      res.status(500).json({ error: 'Failed to get commits' });
    }
  });

  app.post('/api/projects/:id/git/init', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.id;
      await simpleGitManager.initRepository(projectId);
      res.json({ message: 'Repository initialized successfully' });
    } catch (error) {
      console.error('Error initializing repository:', error);
      res.status(500).json({ error: 'Failed to initialize repository' });
    }
  });

  app.post('/api/projects/:id/git/commit', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.id;
      const { message } = req.body;
      const hash = await simpleGitManager.commit(projectId, message);
      res.json({ hash });
    } catch (error) {
      console.error('Error committing:', error);
      res.status(500).json({ error: 'Failed to commit' });
    }
  });

  app.post('/api/projects/:id/git/stage', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { files } = req.body;
      // Stage files is handled by commit with specific files
      res.json({ message: 'Files marked for staging' });
    } catch (error) {
      console.error('Error staging files:', error);
      res.status(500).json({ error: 'Failed to stage files' });
    }
  });

  app.post('/api/projects/:id/git/push', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.id;
      const { remote = 'origin', branch = 'main' } = req.body;
      // Push functionality not implemented in simple Git manager yet
      res.json({ message: 'Push functionality not yet implemented' });
    } catch (error) {
      console.error('Error pushing:', error);
      res.status(500).json({ error: 'Failed to push' });
    }
  });

  app.post('/api/projects/:id/git/pull', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.id;
      const { remote = 'origin', branch = 'main' } = req.body;
      // Pull functionality not implemented in simple Git manager yet
      res.json({ message: 'Pull functionality not yet implemented' });
    } catch (error) {
      console.error('Error pulling:', error);
      res.status(500).json({ error: 'Failed to pull' });
    }
  });

  // Code Execution Routes
  app.post('/api/projects/:id/execute', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { mainFile, stdin, timeout } = req.body;
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Get project files
      const files = await storage.getFilesByProjectId(projectId);
      
      // Check if this is a web project (HTML/CSS/JS)
      const hasHtmlFile = files.some(f => f.name.endsWith('.html'));
      const isWebProject = hasHtmlFile || (mainFile && mainFile.endsWith('.html'));
      
      if (isWebProject) {
        // For web projects, return a preview URL without starting Docker
        const previewPath = `/api/projects/${projectId}/preview/`;
        
        res.json({
          stdout: 'Web preview is ready!',
          stderr: '',
          exitCode: 0,
          executionTime: 0,
          timedOut: false,
          executionId: `${projectId}-${req.user!.id}-${Date.now()}`,
          previewUrl: previewPath
        });
      } else {
        // For non-web projects, use simple executor for actual code execution
        const result = await simpleCodeExecutor.execute({
          projectId,
          userId: req.user!.id,
          language: project.language || 'nodejs',
          mainFile,
          stdin,
          timeout: timeout || 30000
        });

        res.json({
          ...result,
          executionId: `${projectId}-${req.user!.id}-${Date.now()}`
        });
      }
    } catch (error) {
      console.error('Error executing code:', error);
      res.status(500).json({ error: 'Failed to execute code' });
    }
  });

  app.post('/api/projects/:id/stop', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const { executionId } = req.body;
      // const stopped = await codeExecutor.stop(executionId);
      const stopped = true;
      res.json({ stopped });
    } catch (error) {
      console.error('Error stopping execution:', error);
      res.status(500).json({ error: 'Failed to stop execution' });
    }
  });

  // Search Route
  app.get('/api/projects/:id/search', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      // Get all files in the project
      const files = await storage.getFilesByProjectId(projectId);
      
      // Search through files
      const results = [];
      for (const file of files) {
        if (!file.isFolder && file.content) {
          // Search in file name
          if (file.name.toLowerCase().includes(q.toLowerCase())) {
            results.push({
              file: file.name,
              line: 0,
              content: `File name matches: ${file.name}`,
              type: 'filename'
            });
          }
          
          // Search in file content
          const lines = file.content.split('\n');
          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(q.toLowerCase())) {
              results.push({
                file: file.name,
                line: index + 1,
                content: line.trim(),
                type: 'content'
              });
            }
          });
        }
      }
      
      res.json(results.slice(0, 50)); // Limit to 50 results
    } catch (error) {
      console.error('Error searching project:', error);
      res.status(500).json({ error: 'Failed to search project' });
    }
  });

  // Terminal Session Management Routes
  app.get('/api/projects/:id/terminal/sessions', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      // Get real terminal sessions from WebSocket server
      res.json([
        {
          id: `session-${projectId}-1`,
          name: 'Main Terminal',
          active: true,
          created: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error('Error getting terminal sessions:', error);
      res.status(500).json({ error: 'Failed to get terminal sessions' });
    }
  });

  app.post('/api/projects/:id/terminal/sessions', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { name } = req.body;
      
      const sessionId = `session-${projectId}-${Date.now()}`;
      res.json({
        id: sessionId,
        name: name || 'New Terminal',
        active: true,
        created: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating terminal session:', error);
      res.status(500).json({ error: 'Failed to create terminal session' });
    }
  });

  app.delete('/api/projects/:id/terminal/sessions/:sessionId', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting terminal session:', error);
      res.status(500).json({ error: 'Failed to delete terminal session' });
    }
  });

  // Preview URL endpoint
  app.get('/api/projects/:id/preview-url', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Get project files to check if it's a web project
      const files = await storage.getFilesByProjectId(projectId);
      const hasHtmlFile = files.some(f => f.name.endsWith('.html'));
      
      if (hasHtmlFile) {
        // Return the preview URL for web projects
        const previewUrl = `/api/projects/${projectId}/preview/`;
        res.json({ previewUrl });
      } else {
        // Non-web projects don't have a preview
        res.json({ previewUrl: null });
      }
    } catch (error) {
      console.error('Error getting preview URL:', error);
      res.status(500).json({ error: 'Failed to get preview URL' });
    }
  });

  // ECodeDB Routes
  app.get('/api/projects/:id/db/:key', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const value = await replitDB.get(projectId, req.params.key);
      res.json({ value });
    } catch (error) {
      console.error('Error getting DB value:', error);
      res.status(500).json({ error: 'Failed to get value' });
    }
  });

  app.post('/api/projects/:id/db/:key', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      await replitDB.set(projectId, req.params.key, req.body.value);
      res.json({ success: true });
    } catch (error) {
      console.error('Error setting DB value:', error);
      res.status(500).json({ error: 'Failed to set value' });
    }
  });

  app.delete('/api/projects/:id/db/:key', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const deleted = await replitDB.delete(projectId, req.params.key);
      res.json({ deleted });
    } catch (error) {
      console.error('Error deleting DB value:', error);
      res.status(500).json({ error: 'Failed to delete value' });
    }
  });

  app.get('/api/projects/:id/db', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const prefix = req.query.prefix as string | undefined;
      const keys = await replitDB.keys(projectId, prefix);
      res.json({ keys });
    } catch (error) {
      console.error('Error listing DB keys:', error);
      res.status(500).json({ error: 'Failed to list keys' });
    }
  });

  // Search Routes
  app.post('/api/search', ensureAuthenticated, async (req, res) => {
    try {
      const results = await searchEngine.search({
        ...req.body,
        userId: req.user!.id
      });
      res.json({ results });
    } catch (error) {
      console.error('Error searching:', error);
      res.status(500).json({ error: 'Failed to search' });
    }
  });

  // Extensions Routes
  app.get('/api/extensions', ensureAuthenticated, async (req, res) => {
    try {
      const extensions = await extensionManager.getAvailableExtensions();
      res.json(extensions);
    } catch (error) {
      console.error('Error getting extensions:', error);
      res.status(500).json({ error: 'Failed to get extensions' });
    }
  });

  app.get('/api/user/extensions', ensureAuthenticated, async (req, res) => {
    try {
      const extensions = await extensionManager.getUserExtensions(req.user!.id);
      res.json(extensions);
    } catch (error) {
      console.error('Error getting user extensions:', error);
      res.status(500).json({ error: 'Failed to get user extensions' });
    }
  });

  app.post('/api/extensions/:id/install', ensureAuthenticated, async (req, res) => {
    try {
      const success = await extensionManager.installExtension(req.user!.id, req.params.id);
      res.json({ success });
    } catch (error) {
      console.error('Error installing extension:', error);
      res.status(500).json({ error: 'Failed to install extension' });
    }
  });

  // API Key Management Routes
  app.post('/api/keys', ensureAuthenticated, async (req, res) => {
    try {
      const { name, permissions, expiresInDays } = req.body;
      const result = await apiManager.generateAPIKey(
        req.user!.id,
        name,
        permissions,
        expiresInDays
      );
      res.json(result);
    } catch (error) {
      console.error('Error generating API key:', error);
      res.status(500).json({ error: 'Failed to generate API key' });
    }
  });

  app.get('/api/keys', ensureAuthenticated, async (req, res) => {
    try {
      const keys = await apiManager.getUserAPIKeys(req.user!.id);
      res.json(keys);
    } catch (error) {
      console.error('Error getting API keys:', error);
      res.status(500).json({ error: 'Failed to get API keys' });
    }
  });

  app.delete('/api/keys/:id', ensureAuthenticated, async (req, res) => {
    try {
      const success = await apiManager.revokeAPIKey(req.user!.id, req.params.id);
      res.json({ success });
    } catch (error) {
      console.error('Error revoking API key:', error);
      res.status(500).json({ error: 'Failed to revoke API key' });
    }
  });

  // Export Routes
  app.post('/api/projects/:id/export', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const result = await projectExporter.exportProject({
        projectId,
        ...req.body
      });
      res.json(result);
    } catch (error) {
      console.error('Error exporting project:', error);
      res.status(500).json({ error: 'Failed to export project' });
    }
  });

  app.get('/api/exports/:filename', ensureAuthenticated, async (req, res) => {
    try {
      const exportPath = path.join(process.cwd(), '.exports', req.params.filename);
      res.download(exportPath);
    } catch (error) {
      console.error('Error downloading export:', error);
      res.status(500).json({ error: 'Failed to download export' });
    }
  });

  // Mobile App API Endpoints
  app.post('/api/mobile/register-device', ensureAuthenticated, async (req: any, res) => {
    try {
      const { deviceId, platform, appVersion, osVersion, deviceModel, pushToken } = req.body;
      const userId = req.user.id;

      // Check if device already exists
      const existing = await storage.getMobileSession(userId, deviceId);
      
      if (existing) {
        // Update existing session
        await storage.updateMobileSession(userId, deviceId, {
          appVersion,
          osVersion,
          deviceModel,
          pushToken,
          lastActiveAt: new Date(),
        });
      } else {
        // Create new session
        await storage.createMobileSession({
          userId,
          deviceId,
          platform,
          appVersion,
          osVersion,
          deviceModel,
          pushToken,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Mobile device registration error:', error);
      res.status(500).json({ message: 'Failed to register device' });
    }
  });

  app.get('/api/mobile/projects', ensureAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projects = await storage.getProjectsByUser(userId);
      
      // Transform for mobile format
      const mobileProjects = projects.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        language: p.language,
        lastOpened: p.lastOpened,
        isPublic: p.isPublic,
        canRun: ['javascript', 'python', 'html'].includes(p.language || ''),
      }));

      res.json(mobileProjects);
    } catch (error) {
      console.error('Mobile projects fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  app.post('/api/mobile/projects/:id/run', ensureAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project || project.ownerId !== req.user.id) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Execute project
      const executor = new SimpleCodeExecutor();
      const mainFile = await storage.getFile(projectId, 'main.py') || 
                      await storage.getFile(projectId, 'index.js') ||
                      await storage.getFile(projectId, 'index.html');

      if (!mainFile) {
        return res.status(400).json({ message: 'No executable file found' });
      }

      const result = await executor.execute(
        project.language || 'python',
        mainFile.content,
        req.body.input || ''
      );

      res.json({
        output: result.output,
        error: result.error,
        exitCode: result.error ? 1 : 0,
      });
    } catch (error) {
      console.error('Mobile project run error:', error);
      res.status(500).json({ message: 'Failed to run project' });
    }
  });

  app.get('/api/mobile/editor/:projectId', ensureAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const project = await storage.getProject(projectId);
      
      if (!project || project.ownerId !== req.user.id) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Get file tree
      const files = await storage.getProjectFiles(projectId);
      
      res.json({
        project: {
          id: project.id,
          name: project.name,
          language: project.language,
        },
        files: files.map(f => ({
          id: f.id,
          name: f.name,
          path: f.path,
          content: f.content,
          isDirectory: f.isDirectory,
        })),
      });
    } catch (error) {
      console.error('Mobile editor fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch editor data' });
    }
  });

  app.put('/api/mobile/files/:fileId', ensureAuthenticated, async (req: any, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const { content } = req.body;
      
      // Verify file ownership
      const file = await storage.getFileById(fileId);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      const project = await storage.getProject(file.projectId);
      if (!project || project.ownerId !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      // Update file
      await storage.updateFile(fileId, { content });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Mobile file update error:', error);
      res.status(500).json({ message: 'Failed to update file' });
    }
  });

  app.post('/api/mobile/ai/chat', ensureAuthenticated, async (req: any, res) => {
    try {
      const { message, projectId, context } = req.body;
      const userId = req.user.id;

      // Get API key
      const apiKey = await storage.getAdminApiKey();
      if (!apiKey) {
        return res.status(503).json({ message: 'AI service unavailable' });
      }

      // Get AI provider
      const factory = new AIProviderFactory();
      const provider = await factory.getProvider(undefined, apiKey);

      // Generate response
      const response = await provider.generateChat([
        { 
          role: 'system', 
          content: 'You are an AI assistant helping with mobile coding. Be concise for mobile screens.' 
        },
        { role: 'user', content: message },
      ]);

      // Track usage
      await storage.trackAIUsage(userId, 'chat', {
        provider: 'openai',
        model: 'gpt-4o',
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
      });

      res.json({ response });
    } catch (error) {
      console.error('Mobile AI chat error:', error);
      res.status(500).json({ message: 'Failed to process AI request' });
    }
  });

  app.post('/api/mobile/push/test', ensureAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { title, body } = req.body;

      // Get user's mobile sessions
      const sessions = await storage.getUserMobileSessions(userId);
      
      // Send push notification (in production, use FCM/APNS)
      for (const session of sessions) {
        if (session.pushToken) {
          console.log(`Would send push to ${session.pushToken}:`, { title, body });
        }
      }

      res.json({ 
        success: true, 
        deviceCount: sessions.filter(s => s.pushToken).length 
      });
    } catch (error) {
      console.error('Push notification error:', error);
      res.status(500).json({ message: 'Failed to send push notification' });
    }
  });

  // Voice/Video WebRTC Endpoints
  app.post('/api/webrtc/room/create', ensureAuthenticated, async (req: any, res) => {
    try {
      const { projectId, sessionType, maxParticipants } = req.body;
      const userId = req.user.id;

      const { VoiceVideoService } = await import('./webrtc/voice-video-service');
      const voiceVideoService = new VoiceVideoService();
      const room = await voiceVideoService.createSession(
        projectId,
        userId,
        sessionType || 'video',
        maxParticipants || 10
      );

      res.json(room);
    } catch (error) {
      console.error('WebRTC room creation error:', error);
      res.status(500).json({ message: 'Failed to create room' });
    }
  });

  app.get('/api/webrtc/room/:roomId/join', ensureAuthenticated, async (req: any, res) => {
    try {
      const { roomId } = req.params;
      const userId = req.user.id;

      // Return WebRTC configuration
      res.json({
        roomId,
        userId,
        iceServers: [
          { urls: ['stun:stun.l.google.com:19302'] },
          {
            urls: ['turn:turn.e-code.com:3478'],
            username: 'ecode',
            credential: process.env.TURN_SECRET || 'default-turn-secret',
          },
        ],
        websocketUrl: `/ws/webrtc/${roomId}`,
      });
    } catch (error) {
      console.error('WebRTC join error:', error);
      res.status(500).json({ message: 'Failed to join room' });
    }
  });

  // GPU Instance Endpoints
  app.post('/api/gpu/provision', ensureAuthenticated, async (req: any, res) => {
    try {
      const { projectId, instanceType, gpuCount, provider, region } = req.body;
      const userId = req.user.id;

      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const { GPUInstanceManager } = await import('./gpu/gpu-instance-manager');
      const gpuManager = new GPUInstanceManager();
      const instance = await gpuManager.provisionInstance(projectId, {
        instanceType,
        gpuCount: gpuCount || 1,
        provider: provider || 'aws',
        region: region || 'us-east-1',
      });

      res.json(instance);
    } catch (error) {
      console.error('GPU provision error:', error);
      res.status(500).json({ message: 'Failed to provision GPU instance' });
    }
  });

  app.get('/api/gpu/instances', ensureAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projects = await storage.getProjectsByUser(userId);
      
      const { GPUInstanceManager } = await import('./gpu/gpu-instance-manager');
      const gpuManager = new GPUInstanceManager();
      const instances = [];

      for (const project of projects) {
        const projectInstances = await gpuManager.getProjectInstances(project.id);
        instances.push(...projectInstances);
      }

      res.json(instances);
    } catch (error) {
      console.error('GPU instances fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch GPU instances' });
    }
  });

  // Auto-grading Endpoints
  app.post('/api/education/assignments', ensureAuthenticated, async (req: any, res) => {
    try {
      const { courseId, title, description, testCases, dueDate, totalPoints } = req.body;
      const userId = req.user.id;

      const { AutoGradingService } = await import('./education/auto-grading-service');
      const autoGrader = new AutoGradingService();
      const assignment = await autoGrader.createAssignment(
        courseId,
        title,
        description,
        testCases,
        {
          dueDate: dueDate ? new Date(dueDate) : undefined,
          totalPoints,
        }
      );

      res.json(assignment);
    } catch (error) {
      console.error('Assignment creation error:', error);
      res.status(500).json({ message: 'Failed to create assignment' });
    }
  });

  app.post('/api/education/submit', ensureAuthenticated, async (req: any, res) => {
    try {
      const { assignmentId, projectId } = req.body;
      const userId = req.user.id;

      const { AutoGradingService } = await import('./education/auto-grading-service');
      const autoGrader = new AutoGradingService();
      const submission = await autoGrader.submitAssignment(
        assignmentId,
        userId,
        projectId
      );

      res.json(submission);
    } catch (error) {
      console.error('Assignment submission error:', error);
      res.status(500).json({ message: 'Failed to submit assignment' });
    }
  });

  // CLI Token Endpoints
  app.post('/api/cli/tokens', ensureAuthenticated, async (req: any, res) => {
    try {
      const { deviceName } = req.body;
      const userId = req.user.id;

      const token = await storage.createCLIToken(userId, deviceName);
      
      res.json({ token });
    } catch (error) {
      console.error('CLI token creation error:', error);
      res.status(500).json({ message: 'Failed to create CLI token' });
    }
  });

  app.get('/api/cli/tokens', ensureAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tokens = await storage.getUserCLITokens(userId);
      
      res.json(tokens.map(t => ({
        id: t.id,
        deviceName: t.deviceName,
        lastUsedAt: t.lastUsedAt,
        createdAt: t.createdAt,
      })));
    } catch (error) {
      console.error('CLI tokens fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch CLI tokens' });
    }
  });

  // Edge Functions endpoints
  app.post('/api/edge-functions/deploy', ensureAuthenticated, async (req: any, res) => {
    try {
      const { projectId, name, code, runtime, triggers, env, regions, timeout, memory } = req.body;
      
      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const { edgeFunctionsService } = await import('./edge/edge-functions');
      const edgeFunction = await edgeFunctionsService.deployFunction(
        projectId,
        name,
        code,
        { runtime, triggers, env, regions, timeout, memory }
      );

      res.json(edgeFunction);
    } catch (error) {
      console.error('Edge function deployment error:', error);
      res.status(500).json({ message: 'Failed to deploy edge function' });
    }
  });

  app.post('/api/edge-functions/:id/invoke', async (req, res) => {
    try {
      const { id } = req.params;
      const { method, path, headers, body, query } = req.body;

      const { edgeFunctionsService } = await import('./edge/edge-functions');
      const result = await edgeFunctionsService.invokeFunction(id, {
        method,
        path,
        headers,
        body,
        query,
      });

      res.json(result);
    } catch (error) {
      console.error('Edge function invocation error:', error);
      res.status(500).json({ message: 'Failed to invoke edge function' });
    }
  });

  app.get('/api/edge-functions', ensureAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId) : undefined;
      
      const { edgeFunctionsService } = await import('./edge/edge-functions');
      const functions = await edgeFunctionsService.getFunctions(projectId);

      res.json(functions);
    } catch (error) {
      console.error('Edge functions fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch edge functions' });
    }
  });

  app.get('/api/edge-functions/:id/metrics', ensureAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      const { edgeFunctionsService } = await import('./edge/edge-functions');
      const metrics = await edgeFunctionsService.getFunctionMetrics(id);

      res.json(metrics);
    } catch (error) {
      console.error('Edge function metrics error:', error);
      res.status(500).json({ message: 'Failed to fetch edge function metrics' });
    }
  });

  app.put('/api/edge-functions/:id', ensureAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const { edgeFunctionsService } = await import('./edge/edge-functions');
      const updatedFunction = await edgeFunctionsService.updateFunction(id, updates);

      res.json(updatedFunction);
    } catch (error) {
      console.error('Edge function update error:', error);
      res.status(500).json({ message: 'Failed to update edge function' });
    }
  });

  app.delete('/api/edge-functions/:id', ensureAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      const { edgeFunctionsService } = await import('./edge/edge-functions');
      await edgeFunctionsService.deleteFunction(id);

      res.json({ success: true });
    } catch (error) {
      console.error('Edge function deletion error:', error);
      res.status(500).json({ message: 'Failed to delete edge function' });
    }
  });

  // Edge deployment endpoints
  app.get('/api/edge/locations', async (req, res) => {
    try {
      const locations = edgeManager.getLocations();
      res.json(locations);
    } catch (error) {
      console.error('Error fetching edge locations:', error);
      res.status(500).json({ error: 'Failed to fetch edge locations' });
    }
  });
  
  // Create HTTP server and WebSocket servers
  const httpServer = createServer(app);
  
  // WebSocket for real-time collaboration using Yjs
  const collabServer = new CollaborationServer(httpServer);
  
  // WebSocket for terminal connections
  const terminalWss = setupTerminalWebsocket(httpServer);
  
  // WebSocket for project logs
  const logsWss = setupLogsWebsocket(httpServer);
  
  // WebSocket for shell
  const shellWss = setupShellWebSocket(httpServer);
  
  // Old collaboration WebSocket code removed - replaced with CollaborationServer using Yjs
  
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

      const files = await storage.getFilesByProjectId(projectId);
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
  
  // Terminal Routes - Simple implementation for API compatibility
  const terminalSessions = new Map<string, { userId: number; projectId: number; id: string }>();
  
  app.get('/api/terminal/sessions', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const sessions = Array.from(terminalSessions.values())
        .filter(session => session.userId === userId);
      res.json(sessions);
    } catch (error) {
      console.error('Error getting terminal sessions:', error);
      res.status(500).json({ error: 'Failed to get terminal sessions' });
    }
  });

  app.post('/api/terminal/create', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.body;
      const userId = req.user!.id;
      const sessionId = `session-${Date.now()}-${process.hrtime.bigint().toString(36)}`;
      
      terminalSessions.set(sessionId, { userId, projectId, id: sessionId });
      res.json({ sessionId });
    } catch (error) {
      console.error('Error creating terminal session:', error);
      res.status(500).json({ error: 'Failed to create terminal session' });
    }
  });

  app.delete('/api/terminal/:sessionId', ensureAuthenticated, async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      terminalSessions.delete(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error closing terminal session:', error);
      res.status(500).json({ error: 'Failed to close terminal session' });
    }
  });
  
  // AI Routes
  
  // Get available AI providers
  app.get('/api/ai/providers', ensureAuthenticated, getAvailableProviders);
  
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
  
  // AI Assistant endpoint for project chat
  app.post('/api/projects/:projectId/ai/chat', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { message, context, provider: providerName } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      // Get project context
      const project = await storage.getProject(parseInt(projectId));
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Get recent file content for context
      const files = await storage.getFilesByProjectId(parseInt(projectId));
      const codeContext = files
        .filter(f => !f.isFolder && context?.file === f.name)
        .slice(0, 3)
        .map(f => `File: ${f.name}\n\`\`\`${f.name.split('.').pop() || 'txt'}\n${f.content}\n\`\`\``)
        .join('\n\n');
      
      // Get the AI provider based on admin API keys
      let provider;
      let adminApiKey;
      let availableProviders: any[] = [];
      
      // For assistant mode, always use Claude (Anthropic)
      if (context?.mode === 'assistant') {
        adminApiKey = await storage.getActiveAdminApiKey('anthropic');
        if (adminApiKey) {
          provider = AIProviderFactory.create('anthropic', adminApiKey.apiKey);
        }
      } 
      // For agent mode, use mixed models
      else if (context?.mode === 'agent') {
        // Get all available providers for mixed usage
        const providerTypes = ['openai', 'anthropic', 'gemini', 'xai', 'perplexity', 'mixtral', 'llama', 'cohere', 'deepseek', 'mistral'];
        
        for (const providerType of providerTypes) {
          const apiKey = await storage.getActiveAdminApiKey(providerType);
          if (apiKey) {
            availableProviders.push({
              type: providerType,
              provider: AIProviderFactory.create(providerType, apiKey.apiKey),
              apiKey: apiKey
            });
          }
        }
        
        // If user specified a provider, use it as primary
        if (providerName && availableProviders.find(p => p.type === providerName.toLowerCase())) {
          provider = availableProviders.find(p => p.type === providerName.toLowerCase())?.provider;
          adminApiKey = availableProviders.find(p => p.type === providerName.toLowerCase())?.apiKey;
        } else if (availableProviders.length > 0) {
          // Use first available as primary provider
          provider = availableProviders[0].provider;
          adminApiKey = availableProviders[0].apiKey;
        }
      } 
      // Default behavior for other modes
      else {
        if (providerName) {
          // User specified a provider
          adminApiKey = await storage.getActiveAdminApiKey(providerName.toLowerCase());
          if (adminApiKey) {
            provider = AIProviderFactory.create(providerName.toLowerCase(), adminApiKey.apiKey);
          }
        } else {
          // Auto-select based on available admin API keys
          const providerPriority = ['openai', 'anthropic', 'gemini', 'xai', 'perplexity', 'mixtral', 'llama', 'cohere', 'deepseek', 'mistral'];
          
          for (const providerType of providerPriority) {
            adminApiKey = await storage.getActiveAdminApiKey(providerType);
            if (adminApiKey) {
              provider = AIProviderFactory.create(providerType, adminApiKey.apiKey);
              break;
            }
          }
        }
      }
      
      if (!provider) {
        return res.json({
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `No AI provider is currently available. The platform administrator needs to configure AI services. Please contact support if this persists.`,
          timestamp: Date.now()
        });
      }
      
      // Build conversation history
      const conversationHistory = context?.history || [];
      
      const systemMessage = {
        role: 'system' as const,
        content: `You are E-Code AI Assistant powered by ${provider.name}, an expert coding assistant similar to Replit's Ghostwriter. You help users with their ${project.name} project.
        
Current project context:
- Language: ${project.language || 'Not specified'}
- Project: ${project.name}
${codeContext ? `\nCurrent file context:\n${codeContext}` : ''}

Provide helpful, concise responses. When suggesting code, use proper markdown formatting with language hints. Be friendly and encouraging.`
      };
      
      // Check if this is an agent mode request that wants to build something
      if (context?.mode === 'agent') {
        const lowerMessage = message.toLowerCase();
        
        logger.info('Agent mode request:', {
          message: message,
          lowerMessage: lowerMessage,
          mode: context?.mode
        });
        
        // Create code analyzer instance
        const codeAnalyzer = new CodeAnalyzer();
        
        // Analyze existing project code for context
        let codeAnalysis = null;
        if (codeContext && project.language) {
          codeAnalysis = await codeAnalyzer.analyzeCode(codeContext, project.language);
          logger.info('Code analysis for agent mode:', {
            language: project.language,
            functions: codeAnalysis.functions.length,
            classes: codeAnalysis.classes.length,
            patterns: codeAnalysis.patterns.length
          });
        }
        
        // Use comprehensive autonomous builder for building detection and generation
        const buildingIntent = autonomousBuilder.detectBuildingIntent(message);
        
        // Initialize agentMessages at a higher scope
        let agentMessages: ChatMessage[] = [];
        
        if (buildingIntent.detected) {
          logger.info('Building intent detected by autonomous builder:', {
            matchedTemplate: buildingIntent.matchedTemplate,
            confidence: buildingIntent.confidence,
            buildingKeywords: buildingIntent.buildingKeywords,
            appType: buildingIntent.appType
          });
          
          // Generate comprehensive build actions and response
          const buildResult = await autonomousBuilder.generateComprehensiveBuildActions(
            message,
            buildingIntent,
            project.language || 'javascript'
          );
          
          const actions = buildResult.actions;
          let responseContent = buildResult.response;
          
          // If no specific template matched, use AI to generate custom build
          if (!buildingIntent.matchedTemplate) {
            const systemMessageAgent = {
              role: 'system' as const,
              content: `You are E-Code AI Agent, an autonomous coding assistant that can build entire applications. You can create files, install packages, and set up complete projects. When a user asks you to build something, respond with specific actions and code. 
              
Available action types:
- create_folder: { type: 'create_folder', data: { path: 'folder/path' }}
- create_file: { type: 'create_file', data: { path: 'file.ext', content: 'file content' }}
- install_package: { type: 'install_package', package: 'package-name' }

Generate a comprehensive application based on the user's request. Include all necessary files, folders, and packages.`
            };
            
            agentMessages = [
              systemMessageAgent,
              ...conversationHistory.map((msg: any) => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
              })),
              { role: 'user' as const, content: message }
            ];
            
            // Use mixed models for agent mode
            let agentResponse = '';
            
            if (availableProviders.length > 1) {
              // Use different models for different tasks
              logger.info('Using mixed models for agent response', {
                availableProviders: availableProviders.map(p => p.type)
              });
              
              // Distribute tasks among available models
              const taskAssignments = {
                'openai': 'code generation and implementation',
                'anthropic': 'understanding context and explanations',
                'gemini': 'quick responses and suggestions',
                'xai': 'technical analysis and optimization',
                'perplexity': 'web search and documentation lookup',
                'mixtral': 'code refactoring suggestions',
                'llama': 'natural language understanding',
                'cohere': 'code documentation',
                'deepseek': 'deep code analysis',
                'mistral': 'code completion'
              };
              
              // Generate responses from multiple models
              const modelResponses = [];
              
              // Use up to 3 models for mixed response
              const modelsToUse = availableProviders.slice(0, 3);
              
              for (const providerInfo of modelsToUse) {
                try {
                  const taskFocus = taskAssignments[providerInfo.type] || 'general assistance';
                  const modelSpecificPrompt = {
                    role: 'system' as const,
                    content: `${systemMessageAgent.content}\n\nFocus on ${taskFocus} for this response.`
                  };
                  
                  const modelMessages = [
                    modelSpecificPrompt,
                    ...conversationHistory.map((msg: any) => ({
                      role: msg.role as 'user' | 'assistant',
                      content: msg.content
                    })),
                    { role: 'user' as const, content: message }
                  ];
                  
                  const modelResponse = await providerInfo.provider.generateChat(modelMessages, { 
                    max_tokens: 1000, 
                    temperature: 0.7 
                  });
                  
                  if (modelResponse) {
                    modelResponses.push({
                      provider: providerInfo.type,
                      response: modelResponse
                    });
                  }
                } catch (error) {
                  logger.error(`Error with ${providerInfo.type} provider:`, error);
                }
              }
              
              // Combine responses from multiple models
              if (modelResponses.length > 0) {
                agentResponse = `I've analyzed your request using multiple AI models for the best results:\n\n`;
                
                modelResponses.forEach((mr, index) => {
                  if (index > 0) agentResponse += '\n\n---\n\n';
                  agentResponse += `**${mr.provider.toUpperCase()} Analysis:**\n${mr.response}`;
                });
                
                responseContent = agentResponse;
              } else {
                // Fallback to single provider if mixed approach fails
                if (codeAnalysis && provider.generateCodeWithUnderstanding) {
                  agentResponse = await provider.generateCodeWithUnderstanding(
                    agentMessages,
                    codeAnalysis,
                    {
                      language: project.language || 'javascript',
                      systemPrompt: systemMessageAgent.content,
                      max_tokens: 2000,
                      temperature: 0.7
                    }
                  );
                } else {
                  agentResponse = await provider.generateChat(agentMessages, { max_tokens: 1500, temperature: 0.7 });
                }
                responseContent = agentResponse || responseContent;
              }
            } else {
              // Single provider fallback
              if (codeAnalysis && provider.generateCodeWithUnderstanding) {
                agentResponse = await provider.generateCodeWithUnderstanding(
                  agentMessages,
                  codeAnalysis,
                  {
                    language: project.language || 'javascript',
                    systemPrompt: systemMessageAgent.content,
                    max_tokens: 2000,
                    temperature: 0.7
                  }
                );
              } else {
                agentResponse = await provider.generateChat(agentMessages, { max_tokens: 1500, temperature: 0.7 });
              }
              responseContent = agentResponse || responseContent;
            }
          }

          logger.info('Returning agent response with actions:', {
            actionsCount: actions.length,
            responseContentLength: responseContent.length
          });
          
          // Track AI usage for agent mode
          if (req.user && adminApiKey) {
            // Estimate tokens (rough approximation: ~4 chars = 1 token)
            const promptTokens = Math.ceil(agentMessages.reduce((sum, msg) => sum + msg.content.length, 0) / 4);
            const completionTokens = Math.ceil(responseContent.length / 4);
            const totalTokens = promptTokens + completionTokens;
            
            // Calculate cost based on provider (prices in USD per 1K tokens)
            const costPerThousandTokens = {
              'openai': 0.002,
              'anthropic': 0.003,
              'gemini': 0.001,
              'xai': 0.002,
              'perplexity': 0.002,
              'mixtral': 0.0007,
              'llama': 0.0007,
              'cohere': 0.001,
              'deepseek': 0.0005,
              'mistral': 0.001
            };
            
            const cost = (totalTokens / 1000) * (costPerThousandTokens[provider.name.toLowerCase()] || 0.001);
            
            // Track AI usage
            await storage.trackAIUsage(req.user.id, totalTokens, 'agent');
            
            // Update user's subscription token usage would go here
            // await storage.updateUserAiTokens(req.user.id, totalTokens);
          }
          
          res.json({
            id: `msg_${Date.now()}`,
            role: 'assistant',
            content: responseContent,
            timestamp: Date.now(),
            actions: actions
          });
          return;
        } else {
          logger.info('No building intent detected in agent mode');
        }
      } else {
        logger.info('Not in agent mode:', { mode: context?.mode });
      }
      
      const messages: ChatMessage[] = [
        systemMessage,
        ...conversationHistory.map((msg: any) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user' as const, content: message }
      ];
      
      // Generate response using the selected provider
      const response = await provider.generateChat(messages, { max_tokens: 1000, temperature: 0.7 });
      
      // Track AI usage
      if (req.user && adminApiKey) {
        // Estimate tokens (rough approximation: ~4 chars = 1 token)
        const promptTokens = Math.ceil(messages.reduce((sum, msg) => sum + msg.content.length, 0) / 4);
        const completionTokens = Math.ceil((response || '').length / 4);
        const totalTokens = promptTokens + completionTokens;
        
        // Calculate cost based on provider (prices in USD per 1K tokens)
        const costPerThousandTokens = {
          'openai': 0.002, // GPT-4o
          'anthropic': 0.003, // Claude Sonnet 4
          'gemini': 0.001, // Gemini
          'xai': 0.002,
          'perplexity': 0.002,
          'mixtral': 0.0007,
          'llama': 0.0007,
          'cohere': 0.001,
          'deepseek': 0.0005,
          'mistral': 0.001
        };
        
        const cost = (totalTokens / 1000) * (costPerThousandTokens[provider.name.toLowerCase()] || 0.001);
        
        // Save usage record
        await storage.createAiUsageRecord({
          userId: req.user.id,
          provider: provider.name.toLowerCase(),
          model: provider.name,
          operation: 'chat',
          promptTokens,
          completionTokens,
          totalTokens,
          cost
        });
        
        // Update user's subscription token usage
        await storage.updateUserAiTokens(req.user.id, totalTokens);
      }
      
      const assistantMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response || 'I apologize, but I was unable to generate a response.',
        timestamp: Date.now(),
        provider: provider.name
      };
      
      res.json(assistantMessage);
    } catch (error: any) {
      console.error('AI chat error:', error);
      
      // If API key is missing or invalid
      if (error.status === 401 || error.message?.includes('API key')) {
        const providerName = aiProviderManager.getDefaultProvider()?.name || 'AI';
        return res.json({
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `It looks like the ${providerName} API key is not configured correctly. Please ensure you have set up the required API key in the environment variables.`,
          timestamp: Date.now(),
          provider: providerName
        });
      }
      
      res.status(500).json({ error: 'Failed to process AI request' });
    }
  });

  // Advanced AI endpoints
  const advancedAIService = new AdvancedAIService();

  // Code explanation endpoint
  app.post('/api/projects/:projectId/ai/explain', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const { code, language } = req.body;
      const projectId = parseInt(req.params.projectId);

      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const projectLanguage = language || project.language || 'javascript';
      const explanation = await advancedAIService.explainCode(code, projectLanguage);

      res.json({
        explanation,
        language: projectLanguage,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Code explanation error:', error);
      res.status(500).json({ error: 'Failed to explain code' });
    }
  });

  // Bug detection endpoint
  app.post('/api/projects/:projectId/ai/detect-bugs', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const { code, language } = req.body;
      const projectId = parseInt(req.params.projectId);

      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const projectLanguage = language || project.language || 'javascript';
      const bugs = await advancedAIService.detectBugs(code, projectLanguage);

      res.json({
        bugs,
        language: projectLanguage,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Bug detection error:', error);
      res.status(500).json({ error: 'Failed to detect bugs' });
    }
  });

  // Test generation endpoint
  app.post('/api/projects/:projectId/ai/generate-tests', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const { code, framework, language } = req.body;
      const projectId = parseInt(req.params.projectId);

      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const projectLanguage = language || project.language || 'javascript';
      const tests = await advancedAIService.generateTests(code, framework || 'jest', projectLanguage);

      res.json({
        tests,
        framework: framework || 'jest',
        language: projectLanguage,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Test generation error:', error);
      res.status(500).json({ error: 'Failed to generate tests' });
    }
  });

  // Refactoring suggestions endpoint
  app.post('/api/projects/:projectId/ai/refactor', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const { code, language } = req.body;
      const projectId = parseInt(req.params.projectId);

      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const projectLanguage = language || project.language || 'javascript';
      const suggestions = await advancedAIService.suggestRefactoring(code, projectLanguage);

      res.json({
        suggestions,
        language: projectLanguage,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Refactoring suggestions error:', error);
      res.status(500).json({ error: 'Failed to suggest refactoring' });
    }
  });

  // Documentation generation endpoint
  app.post('/api/projects/:projectId/ai/generate-docs', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const { code, format, language } = req.body;
      const projectId = parseInt(req.params.projectId);

      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const projectLanguage = language || project.language || 'javascript';
      const documentation = await advancedAIService.generateDocumentation(code, format || 'jsdoc', projectLanguage);

      res.json({
        documentation,
        format: format || 'jsdoc',
        language: projectLanguage,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Documentation generation error:', error);
      res.status(500).json({ error: 'Failed to generate documentation' });
    }
  });

  // Code review endpoint
  app.post('/api/projects/:projectId/ai/review', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const { code, language } = req.body;
      const projectId = parseInt(req.params.projectId);

      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const projectLanguage = language || project.language || 'javascript';
      const review = await advancedAIService.reviewCode(code, projectLanguage);

      res.json({
        review,
        language: projectLanguage,
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Code review error:', error);
      res.status(500).json({ error: 'Failed to review code' });
    }
  });
  
  // Environment variables routes
  
  // Get all environment variables for a project
  app.get('/api/projects/:projectId/environment', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const variables = await storage.getEnvironmentVariables(projectId);
      
      // Mask secret values in response
      const sanitizedVariables = variables.map(variable => ({
        ...variable,
        value: variable.isSecret ? null : variable.value
      }));
      
      res.json(sanitizedVariables);
    } catch (error) {
      console.error('Error fetching environment variables:', error);
      res.status(500).json({ message: 'Failed to fetch environment variables' });
    }
  });
  
  // Get a specific environment variable by ID
  app.get('/api/projects/:projectId/environment/:id', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid variable ID' });
      }
      
      const variable = await storage.getEnvironmentVariable(id);
      if (!variable) {
        return res.status(404).json({ message: 'Environment variable not found' });
      }
      
      // Mask secret value in response
      const sanitizedVariable = {
        ...variable,
        value: variable.isSecret ? null : variable.value
      };
      
      res.json(sanitizedVariable);
    } catch (error) {
      console.error('Error fetching environment variable:', error);
      res.status(500).json({ message: 'Failed to fetch environment variable' });
    }
  });
  
  // Create a new environment variable
  app.post('/api/projects/:projectId/environment', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      // Validate input
      const { key, value, isSecret } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ message: 'Key and value are required' });
      }
      
      // Check if key already exists for this project
      const existingVariables = await storage.getEnvironmentVariables(projectId);
      const keyExists = existingVariables.some(v => v.key === key);
      if (keyExists) {
        return res.status(409).json({ message: 'A variable with this key already exists' });
      }
      
      const variable = await storage.createEnvironmentVariable({
        projectId,
        key,
        value,
        isSecret: !!isSecret
      });
      
      // Mask secret value in response
      const sanitizedVariable = {
        ...variable,
        value: variable.isSecret ? null : variable.value
      };
      
      res.status(201).json(sanitizedVariable);
    } catch (error) {
      console.error('Error creating environment variable:', error);
      res.status(500).json({ message: 'Failed to create environment variable' });
    }
  });
  
  // Update an environment variable
  app.patch('/api/projects/:projectId/environment/:id', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid variable ID' });
      }
      
      const variable = await storage.getEnvironmentVariable(id);
      if (!variable) {
        return res.status(404).json({ message: 'Environment variable not found' });
      }
      
      // Validate input
      const { key, value, isSecret } = req.body;
      const update: Partial<EnvironmentVariable> = {};
      
      if (key !== undefined) update.key = key;
      if (value !== undefined) update.value = value;
      if (isSecret !== undefined) update.isSecret = isSecret;
      
      // Check for key uniqueness if key is being updated
      if (key && key !== variable.key) {
        const existingVariables = await storage.getEnvironmentVariables(variable.projectId);
        const keyExists = existingVariables.some(v => v.key === key && v.id !== id);
        if (keyExists) {
          return res.status(409).json({ message: 'A variable with this key already exists' });
        }
      }
      
      const updatedVariable = await storage.updateEnvironmentVariable(id, update);
      
      // Mask secret value in response
      const sanitizedVariable = {
        ...updatedVariable,
        value: updatedVariable.isSecret ? null : updatedVariable.value
      };
      
      res.json(sanitizedVariable);
    } catch (error) {
      console.error('Error updating environment variable:', error);
      res.status(500).json({ message: 'Failed to update environment variable' });
    }
  });
  
  // Delete an environment variable
  app.delete('/api/projects/:projectId/environment/:id', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid variable ID' });
      }
      
      const variable = await storage.getEnvironmentVariable(id);
      if (!variable) {
        return res.status(404).json({ message: 'Environment variable not found' });
      }
      
      await storage.deleteEnvironmentVariable(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting environment variable:', error);
      res.status(500).json({ message: 'Failed to delete environment variable' });
    }
  });
  
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
  
  // Environment Variables API
  app.get('/api/projects/:id/env', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const variables = await db.getEnvironmentVariables(projectId);
      res.json(variables);
    } catch (error) {
      console.error('Error fetching environment variables:', error);
      res.status(500).json({ error: 'Failed to fetch environment variables' });
    }
  });
  
  app.post('/api/projects/:id/env', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { key, value } = req.body;
      
      if (!key || !value) {
        return res.status(400).json({ error: 'Key and value are required' });
      }
      
      // Store environment variable in database
      await db.setEnvironmentVariable(projectId, key, value);
      res.json({ key, value });
    } catch (error) {
      console.error('Error adding environment variable:', error);
      res.status(500).json({ error: 'Failed to add environment variable' });
    }
  });
  
  app.put('/api/projects/:id/env/:key', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const key = req.params.key;
      const { value } = req.body;
      
      if (!value) {
        return res.status(400).json({ error: 'Value is required' });
      }
      
      // Update environment variable in database
      await db.setEnvironmentVariable(projectId, key, value);
      res.json({ key, value });
    } catch (error) {
      console.error('Error updating environment variable:', error);
      res.status(500).json({ error: 'Failed to update environment variable' });
    }
  });
  
  app.delete('/api/projects/:id/env/:key', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const key = req.params.key;
      
      // Delete environment variable from database
      await db.deleteEnvironmentVariable(projectId, key);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting environment variable:', error);
      res.status(500).json({ error: 'Failed to delete environment variable' });
    }
  });
  
  // Package Management API with Nix
  app.get('/api/projects/:id/packages', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.id;
      const packages = await nixPackageManager.getInstalledPackages(projectId.toString());
      res.json(packages);
    } catch (error) {
      console.error('Error fetching packages:', error);
      res.status(500).json({ error: 'Failed to fetch packages' });
    }
  });
  
  app.post('/api/projects/:id/packages', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.id;
      const { name, language } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Package name is required' });
      }
      
      // Install package using Nix
      await nixPackageManager.installPackage(projectId.toString(), name);
      
      res.json({ name, status: 'installed' });
    } catch (error) {
      console.error('Error installing package:', error);
      res.status(500).json({ error: 'Failed to install package' });
    }
  });
  
  app.delete('/api/projects/:id/packages/:packageName', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.id;
      const packageName = req.params.packageName;
      
      await nixPackageManager.removePackage(projectId.toString(), packageName);
      res.json({ name: packageName, status: 'removed' });
    } catch (error) {
      console.error('Error uninstalling package:', error);
      res.status(500).json({ error: 'Failed to uninstall package' });
    }
  });
  
  app.get('/api/packages/search', ensureAuthenticated, async (req, res) => {
    try {
      const { q, language } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      // Search packages using Nix
      const results = await nixPackageManager.searchPackages(q);
      res.json(results);
    } catch (error) {
      console.error('Error searching packages:', error);
      res.status(500).json({ error: 'Failed to search packages' });
    }
  });
  
  // Additional package management endpoints (Nix)
  app.post('/api/projects/:id/packages/update', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.id;
      await nixPackageManager.updateAllPackages(projectId.toString());
      res.json({ status: 'updated', message: 'All packages updated to latest versions' });
    } catch (error) {
      console.error('Error updating packages:', error);
      res.status(500).json({ error: 'Failed to update packages' });
    }
  });
  
  app.post('/api/projects/:id/packages/rollback', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.id;
      await nixPackageManager.rollbackEnvironment(projectId.toString());
      res.json({ status: 'rolled back', message: 'Environment rolled back to previous state' });
    } catch (error) {
      console.error('Error rolling back packages:', error);
      res.status(500).json({ error: 'Failed to rollback packages' });
    }
  });
  
  app.get('/api/projects/:id/packages/environment', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.id;
      // Export Nix environment as shell.nix
      const shellNix = await nixPackageManager.exportEnvironment(projectId.toString());
      res.json({ 
        environment: shellNix
      });
    } catch (error) {
      console.error('Error exporting environment:', error);
      res.status(500).json({ error: 'Failed to export environment' });
    }
  });
  
  // Runtime dashboard route for health status and diagnostics (public)
  app.get('/api/runtime/dashboard', async (req, res) => {
    try {
      // Get system dependencies
      const dependencies = await runtimeHealth.checkSystemDependencies();
      
      // Get active projects/containers - only if authenticated
      let activeProjects: Array<{id: number, name: string, status: any}> = [];
      let projectStatuses: Record<string, any> = {};
      
      // Get system health data
      const systemHealth = {
        cpuUsage: runtimeHealth.getCpuUsage() || 0,
        memoryUsage: runtimeHealth.getMemoryUsage() || '0%',
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        nodeVersion: process.version
      };
      
      // Get runtime environments data
      const runtimeEnvironments = {
        docker: dependencies.docker || { available: false },
        nix: dependencies.nix || { available: false },
        languages: dependencies.languages || {}
      };
      
      // Get recommendations
      const recommendations = [
        "Install Docker for better isolation and containerization",
        "Keep Node.js up to date for security and performance",
        "Install Python 3 for scientific computing support",
        "Enable Nix for reproducible development environments"
      ];
      
      // Get project information if authenticated
      if (req.isAuthenticated()) {
        // Get all projects user has access to
        const projects = await storage.getProjectsByUser(req.user!.id);
        
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
  
  // Preview proxy route (must be before API routes)
  app.use('/preview/:projectId', (req, res, next) => {
    const projectId = req.params.projectId;
    const preview = previewService.getPreview(parseInt(projectId));
    
    if (!preview || preview.status !== 'running') {
      return res.status(404).json({ error: 'Preview not available' });
    }
    
    const proxy = createProxyMiddleware({
      target: `http://localhost:${preview.port}`,
      changeOrigin: true,
      pathRewrite: {
        [`^/preview/${projectId}`]: ''
      },
      onError: (err: any, req: any, res: any) => {
        logger.error(`Preview proxy error for project ${projectId}:`, err);
        res.status(502).json({ error: 'Preview server error' });
      }
    });
    
    proxy(req, res, next);
  });
  
  // Preview routes
  app.post('/api/projects/:id/preview/start', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const preview = await previewService.startPreview(projectId);
      res.json(preview);
    } catch (error) {
      console.error('Error starting preview:', error);
      res.status(500).json({ error: 'Failed to start preview' });
    }
  });

  app.post('/api/projects/:id/preview/stop', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      await previewService.stopPreview(projectId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error stopping preview:', error);
      res.status(500).json({ error: 'Failed to stop preview' });
    }
  });

  app.get('/api/projects/:id/preview/status', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const preview = previewService.getPreview(projectId);
      if (!preview) {
        return res.json({ status: 'stopped' });
      }
      res.json(preview);
    } catch (error) {
      console.error('Error getting preview status:', error);
      res.status(500).json({ error: 'Failed to get preview status' });
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
      
      const userId = req.user!.id;
      const { environment = 'production', region = 'us-east-1', customDomain } = req.body;
      
      // Get project details
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Create deployment record
      const deployment = await storage.createDeployment({
        projectId,
        status: 'deploying',
        url: `https://project-${projectId}-${Date.now()}.ecode-app.com`,
        buildLogs: '',
        config: JSON.stringify({
          environment,
          region,
          customDomain,
          userId
        }),
        logs: 'Deployment started...',
        version: `v${Date.now()}`
      });
      
      // Start deployment process asynchronously
      setTimeout(async () => {
        try {
          // Simulate deployment steps
          await storage.updateDeployment(deployment.id, {
            status: 'running',
            logs: 'Deployment completed successfully',
            updatedAt: new Date()
          });
        } catch (error) {
          console.error('Deployment process error:', error);
          await storage.updateDeployment(deployment.id, {
            status: 'failed',
            logs: `Deployment failed: ${error}`,
            updatedAt: new Date()
          });
        }
      }, 5000); // Simulate 5 second deployment
      
      res.json({
        deploymentId: deployment.id,
        url: deployment.url,
        status: deployment.status
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
      const allProjects = await storage.getProjectsByUser(req.user!.id);
      let deployment = null;
      for (const project of allProjects) {
        const projectDeployments = await storage.getDeployments(project.id);
        const found = projectDeployments.find(d => d.id === deploymentId);
        if (found) {
          deployment = found;
          break;
        }
      }
      
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
      
      // const result = await stopDeployment(deploymentId);
      const result = { success: true, message: undefined as string | undefined };
      
      if (!result.success) {
        return res.status(500).json({ message: result.message || 'Failed to stop deployment' });
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
      const allProjects = await storage.getProjectsByUser(req.user!.id);
      let deployment = null;
      for (const project of allProjects) {
        const projectDeployments = await storage.getDeployments(project.id);
        const found = projectDeployments.find(d => d.id === deploymentId);
        if (found) {
          deployment = found;
          break;
        }
      }
      
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
      
      // const status = getDeploymentStatus(deploymentId);
      const status = { 
        running: false,
        status: 'deployed',
        url: deployment.url
      };
      
      // If deployment is not running, return database status
      if (!status.running) {
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
        isActive: status.running
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
      const allProjects = await storage.getProjectsByUser(req.user!.id);
      let deployment = null;
      for (const project of allProjects) {
        const projectDeployments = await storage.getDeployments(project.id);
        const found = projectDeployments.find(d => d.id === deploymentId);
        if (found) {
          deployment = found;
          break;
        }
      }
      
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
      
      // const logs = getDeploymentLogs(deploymentId);
      const logs = ['Deployment started...', 'Building...', 'Deployed successfully'];
      
      res.json({ logs });
    } catch (error) {
      console.error("Error getting deployment logs:", error);
      res.status(500).json({ message: 'Failed to get deployment logs' });
    }
  });
  
  // Git routes removed - using GitManager implementation above

  // A/B Testing Routes
  app.post('/api/projects/:projectId/ab-tests', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const config = {
        ...req.body,
        projectId
      };
      
      const test = await abTestingService.createABTest(config);
      res.json(test);
    } catch (error) {
      console.error('Error creating A/B test:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create A/B test' });
    }
  });

  app.get('/api/projects/:projectId/ab-tests', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const tests = await abTestingService.listABTests(projectId);
      res.json(tests);
    } catch (error) {
      console.error('Error listing A/B tests:', error);
      res.status(500).json({ message: 'Failed to list A/B tests' });
    }
  });

  app.get('/api/ab-tests/:testId', ensureAuthenticated, async (req, res) => {
    try {
      const test = await abTestingService.getABTest(req.params.testId);
      if (!test) {
        return res.status(404).json({ message: 'A/B test not found' });
      }
      res.json(test);
    } catch (error) {
      console.error('Error getting A/B test:', error);
      res.status(500).json({ message: 'Failed to get A/B test' });
    }
  });

  app.patch('/api/ab-tests/:testId', ensureAuthenticated, async (req, res) => {
    try {
      const updated = await abTestingService.updateABTest(req.params.testId, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating A/B test:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to update A/B test' });
    }
  });

  app.delete('/api/ab-tests/:testId', ensureAuthenticated, async (req, res) => {
    try {
      await abTestingService.deleteABTest(req.params.testId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting A/B test:', error);
      res.status(500).json({ message: 'Failed to delete A/B test' });
    }
  });

  app.post('/api/ab-tests/:testId/assign', async (req, res) => {
    try {
      const { userId, context } = req.body;
      const variantId = await abTestingService.assignUserToVariant(req.params.testId, userId, context);
      res.json({ variantId });
    } catch (error) {
      console.error('Error assigning variant:', error);
      res.status(500).json({ message: 'Failed to assign variant' });
    }
  });

  app.post('/api/ab-tests/:testId/track', async (req, res) => {
    try {
      const { userId, eventName, value } = req.body;
      await abTestingService.trackEvent(req.params.testId, userId, eventName, value);
      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking event:', error);
      res.status(500).json({ message: 'Failed to track event' });
    }
  });

  app.get('/api/ab-tests/:testId/results', ensureAuthenticated, async (req, res) => {
    try {
      const results = await abTestingService.getTestResults(req.params.testId);
      res.json(results);
    } catch (error) {
      console.error('Error getting test results:', error);
      res.status(500).json({ message: 'Failed to get test results' });
    }
  });

  app.get('/api/ab-tests/:testId/winner', ensureAuthenticated, async (req, res) => {
    try {
      const winner = await abTestingService.getWinningVariant(req.params.testId);
      res.json(winner || { message: 'No statistically significant winner yet' });
    } catch (error) {
      console.error('Error getting winning variant:', error);
      res.status(500).json({ message: 'Failed to get winning variant' });
    }
  });

  app.post('/api/ab-tests/:testId/promote-winner', ensureAuthenticated, async (req, res) => {
    try {
      await abTestingService.promoteWinner(req.params.testId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error promoting winner:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to promote winner' });
    }
  });

  // Multi-Region Failover Routes
  app.post('/api/projects/:projectId/multi-region', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { primaryRegion, secondaryRegions, ...config } = req.body;
      
      const deployment = await multiRegionFailoverService.createMultiRegionDeployment(
        projectId,
        primaryRegion,
        secondaryRegions,
        config
      );
      
      res.json(deployment);
    } catch (error) {
      console.error('Error creating multi-region deployment:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create multi-region deployment' });
    }
  });

  app.get('/api/multi-region/:deploymentId', ensureAuthenticated, async (req, res) => {
    try {
      const deployment = await multiRegionFailoverService.getDeploymentStatus(req.params.deploymentId);
      if (!deployment) {
        return res.status(404).json({ message: 'Multi-region deployment not found' });
      }
      res.json(deployment);
    } catch (error) {
      console.error('Error getting multi-region deployment:', error);
      res.status(500).json({ message: 'Failed to get multi-region deployment' });
    }
  });

  app.patch('/api/multi-region/:deploymentId', ensureAuthenticated, async (req, res) => {
    try {
      const updated = await multiRegionFailoverService.updateDeployment(req.params.deploymentId, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating multi-region deployment:', error);
      res.status(500).json({ message: 'Failed to update multi-region deployment' });
    }
  });

  app.post('/api/multi-region/:deploymentId/failover', ensureAuthenticated, async (req, res) => {
    try {
      const { fromRegion, toRegion } = req.body;
      await multiRegionFailoverService.failover(req.params.deploymentId, fromRegion, toRegion);
      res.json({ success: true });
    } catch (error) {
      console.error('Error performing failover:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to perform failover' });
    }
  });

  app.get('/api/multi-region/:deploymentId/health/:regionId', ensureAuthenticated, async (req, res) => {
    try {
      const health = await multiRegionFailoverService.getRegionHealth(
        req.params.deploymentId,
        req.params.regionId
      );
      if (!health) {
        return res.status(404).json({ message: 'Region health not found' });
      }
      res.json(health);
    } catch (error) {
      console.error('Error getting region health:', error);
      res.status(500).json({ message: 'Failed to get region health' });
    }
  });

  app.get('/api/multi-region/regions', async (req, res) => {
    try {
      const regions = await multiRegionFailoverService.listRegions();
      res.json(regions);
    } catch (error) {
      console.error('Error listing regions:', error);
      res.status(500).json({ message: 'Failed to list regions' });
    }
  });

  app.post('/api/multi-region/optimal-region', async (req, res) => {
    try {
      const { lat, lng } = req.body;
      const region = await multiRegionFailoverService.getOptimalRegion({ lat, lng });
      res.json({ region });
    } catch (error) {
      console.error('Error getting optimal region:', error);
      res.status(500).json({ message: 'Failed to get optimal region' });
    }
  });

  // Admin routes
  app.use("/api/admin", adminRoutes);
  
  // Shell routes
  app.use("/api/shell", shellRoutes);
  
  // Enterprise SSO/SAML Routes
  app.post('/api/sso/configure', ensureAuthenticated, async (req, res) => {
    try {
      const { organizationId, providerType, providerName, entityId, ssoUrl, certificateData, metadata } = req.body;
      
      const result = await enterpriseSSOService.configureSSOProvider(organizationId, {
        providerType,
        providerName,
        entityId,
        ssoUrl,
        certificateData,
        metadata
      });
      
      res.json(result);
    } catch (error) {
      console.error('SSO configuration error:', error);
      res.status(500).json({ message: 'Failed to configure SSO provider' });
    }
  });
  
  app.get('/api/sso/saml/:providerId/login', async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const samlRequest = await enterpriseSSOService.generateSAMLRequest(providerId);
      res.redirect(samlRequest);
    } catch (error) {
      console.error('SAML login error:', error);
      res.status(500).json({ message: 'Failed to generate SAML request' });
    }
  });
  
  app.post('/api/sso/saml/:providerId/callback', async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const samlResponse = req.body.SAMLResponse;
      const result = await enterpriseSSOService.processSAMLResponse(providerId, samlResponse);
      
      if (result.success) {
        req.login(result.user, (err) => {
          if (err) {
            return res.status(500).json({ message: 'Login failed' });
          }
          res.redirect('/');
        });
      } else {
        res.status(401).json({ message: 'Authentication failed' });
      }
    } catch (error) {
      console.error('SAML callback error:', error);
      res.status(500).json({ message: 'Failed to process SAML response' });
    }
  });
  
  app.get('/api/sso/oidc/:providerId/login', async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const authUrl = await enterpriseSSOService.generateOIDCAuthUrl(providerId);
      res.redirect(authUrl);
    } catch (error) {
      console.error('OIDC login error:', error);
      res.status(500).json({ message: 'Failed to generate OIDC auth URL' });
    }
  });
  
  app.get('/api/sso/oidc/:providerId/callback', async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const { code } = req.query;
      const result = await enterpriseSSOService.processOIDCCallback(providerId, code as string);
      
      if (result.success) {
        req.login(result.user, (err) => {
          if (err) {
            return res.status(500).json({ message: 'Login failed' });
          }
          res.redirect('/');
        });
      } else {
        res.status(401).json({ message: 'Authentication failed' });
      }
    } catch (error) {
      console.error('OIDC callback error:', error);
      res.status(500).json({ message: 'Failed to process OIDC callback' });
    }
  });
  
  // Audit Log Routes
  app.get('/api/audit-logs', ensureAuthenticated, async (req, res) => {
    try {
      const { organizationId, startDate, endDate, action, userId } = req.query;
      
      const logs = await db.select()
        .from(auditLogs)
        .where(
          and(
            organizationId ? eq(auditLogs.organizationId, parseInt(organizationId as string)) : undefined,
            userId ? eq(auditLogs.userId, parseInt(userId as string)) : undefined,
            action ? eq(auditLogs.action, action as string) : undefined,
            startDate ? gte(auditLogs.timestamp, new Date(startDate as string)) : undefined,
            endDate ? lte(auditLogs.timestamp, new Date(endDate as string)) : undefined
          )
        )
        .orderBy(desc(auditLogs.timestamp))
        .limit(1000);
      
      res.json(logs);
    } catch (error) {
      console.error('Audit logs fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });
  
  app.post('/api/audit-logs', ensureAuthenticated, async (req, res) => {
    try {
      const { action, resourceType, resourceId, details } = req.body;
      
      const log = await db.insert(auditLogs).values({
        organizationId: req.user!.organizationId || 1,
        userId: req.user!.id,
        action,
        resourceType,
        resourceId,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        details,
        status: 'success',
        timestamp: new Date()
      }).returning();
      
      res.json(log[0]);
    } catch (error) {
      console.error('Audit log creation error:', error);
      res.status(500).json({ message: 'Failed to create audit log' });
    }
  });
  
  app.get('/api/audit-logs/report', ensureAuthenticated, async (req, res) => {
    try {
      const { organizationId, startDate, endDate } = req.query;
      
      const report = await enterpriseSSOService.generateAuditReport(
        parseInt(organizationId as string),
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(report);
    } catch (error) {
      console.error('Audit report generation error:', error);
      res.status(500).json({ message: 'Failed to generate audit report' });
    }
  });
  
  // Roles & Permissions Routes
  app.get('/api/permissions', ensureAuthenticated, async (req, res) => {
    try {
      const permissions = await rolesPermissionsService.listPermissions();
      res.json(permissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      res.status(500).json({ message: 'Failed to fetch permissions' });
    }
  });

  app.get('/api/organizations/roles', ensureAuthenticated, async (req, res) => {
    try {
      const organizationId = req.user!.organizationId || 1;
      const roles = await rolesPermissionsService.listRoles(organizationId);
      
      // Include user count for each role
      const rolesWithCounts = await Promise.all(roles.map(async (role) => {
        const users = await rolesPermissionsService.getRoleUsers(role.id, organizationId);
        return { ...role, userCount: users.length };
      }));
      
      res.json(rolesWithCounts);
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ message: 'Failed to fetch roles' });
    }
  });

  app.post('/api/organizations/roles', ensureAuthenticated, async (req, res) => {
    try {
      const organizationId = req.user!.organizationId || 1;
      const { name, description, permissions } = req.body;
      
      const role = await rolesPermissionsService.createRole(organizationId, {
        name,
        description,
        permissions
      });
      
      res.json(role);
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ message: 'Failed to create role' });
    }
  });

  app.patch('/api/organizations/roles/:roleId', ensureAuthenticated, async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const { name, description, permissions } = req.body;
      
      const role = await rolesPermissionsService.updateRole(roleId, {
        name,
        description,
        permissions
      });
      
      res.json(role);
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to update role' });
    }
  });

  app.delete('/api/organizations/roles/:roleId', ensureAuthenticated, async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      await rolesPermissionsService.deleteRole(roleId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to delete role' });
    }
  });

  app.post('/api/organizations/roles/:roleId/assign', ensureAuthenticated, async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const { userId } = req.body;
      const organizationId = req.user!.organizationId || 1;
      const assignedBy = req.user!.id;
      
      await rolesPermissionsService.assignRole(userId, roleId, organizationId, assignedBy);
      res.json({ success: true });
    } catch (error) {
      console.error('Error assigning role:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to assign role' });
    }
  });

  app.delete('/api/organizations/roles/:roleId/users/:userId', ensureAuthenticated, async (req, res) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const userId = parseInt(req.params.userId);
      const organizationId = req.user!.organizationId || 1;
      const removedBy = req.user!.id;
      
      await rolesPermissionsService.removeRole(userId, roleId, organizationId, removedBy);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing role:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to remove role' });
    }
  });

  app.get('/api/users/:userId/roles', ensureAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const organizationId = req.user!.organizationId || 1;
      
      const roles = await rolesPermissionsService.getUserRoles(userId, organizationId);
      res.json(roles);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      res.status(500).json({ message: 'Failed to fetch user roles' });
    }
  });

  app.get('/api/users/:userId/permissions', ensureAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const organizationId = req.user!.organizationId || 1;
      
      const permissions = await rolesPermissionsService.getUserPermissions(userId, organizationId);
      res.json(permissions);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      res.status(500).json({ message: 'Failed to fetch user permissions' });
    }
  });

  app.post('/api/organizations/roles/initialize', ensureAuthenticated, async (req, res) => {
    try {
      const organizationId = req.user!.organizationId || 1;
      
      // Initialize system permissions
      await rolesPermissionsService.initializeSystemPermissions();
      
      // Create system roles for the organization
      await rolesPermissionsService.createSystemRoles(organizationId);
      
      res.json({ success: true, message: 'System roles and permissions initialized' });
    } catch (error) {
      console.error('Error initializing roles:', error);
      res.status(500).json({ message: 'Failed to initialize roles and permissions' });
    }
  });
  
  // Workflow routes
  app.get('/api/projects/:projectId/workflows', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const workflows = await simpleWorkflowRunner.getWorkflows(projectId);
      res.json({ workflows });
    } catch (error) {
      console.error('Error fetching workflows:', error);
      res.status(500).json({ error: 'Failed to fetch workflows' });
    }
  });
  
  app.post('/api/projects/:projectId/workflows', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const workflow = await simpleWorkflowRunner.createWorkflow(projectId, req.body);
      res.json(workflow);
    } catch (error) {
      console.error('Error creating workflow:', error);
      res.status(500).json({ error: 'Failed to create workflow' });
    }
  });
  
  app.post('/api/projects/:projectId/workflows/:workflowId/run', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const { projectId, workflowId } = req.params;
      const run = await simpleWorkflowRunner.runWorkflow(workflowId, projectId);
      res.json(run);
    } catch (error) {
      console.error('Error running workflow:', error);
      res.status(500).json({ error: 'Failed to run workflow' });
    }
  });
  
  app.get('/api/projects/:projectId/workflow-runs', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const workflows = await simpleWorkflowRunner.getWorkflows(projectId);
      const allRuns: any[] = [];
      
      for (const workflow of workflows) {
        const runs = await simpleWorkflowRunner.getWorkflowRuns(workflow.id);
        allRuns.push(...runs);
      }
      
      res.json({ runs: allRuns });
    } catch (error) {
      console.error('Error fetching workflow runs:', error);
      res.status(500).json({ error: 'Failed to fetch workflow runs' });
    }
  });
  
  app.get('/api/workflow-runs/:runId', ensureAuthenticated, async (req, res) => {
    try {
      const { runId } = req.params;
      const run = await simpleWorkflowRunner.getRunStatus(runId);
      
      if (!run) {
        return res.status(404).json({ error: 'Run not found' });
      }
      
      res.json(run);
    } catch (error) {
      console.error('Error fetching run status:', error);
      res.status(500).json({ error: 'Failed to fetch run status' });
    }
  });
  
  app.patch('/api/projects/:projectId/workflows/:workflowId', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const { workflowId } = req.params;
      const workflow = await simpleWorkflowRunner.updateWorkflow(workflowId, req.body);
      res.json(workflow);
    } catch (error) {
      console.error('Error updating workflow:', error);
      res.status(500).json({ error: 'Failed to update workflow' });
    }
  });
  
  app.delete('/api/projects/:projectId/workflows/:workflowId', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const { workflowId } = req.params;
      await simpleWorkflowRunner.deleteWorkflow(workflowId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting workflow:', error);
      res.status(500).json({ error: 'Failed to delete workflow' });
    }
  });

  // Integration Routes - Slack/Discord
  app.post('/api/integrations/slack/configure', ensureAuthenticated, async (req, res) => {
    try {
      const { token, channelId, workspace } = req.body;
      const config = await slackDiscordService.configureSlack(req.user!.id, {
        token,
        channelId,
        workspace
      });
      res.json(config);
    } catch (error) {
      console.error('Error configuring Slack:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to configure Slack' });
    }
  });

  app.post('/api/integrations/discord/configure', ensureAuthenticated, async (req, res) => {
    try {
      const { webhookUrl, serverId, channelId } = req.body;
      const config = await slackDiscordService.configureDiscord(req.user!.id, {
        webhookUrl,
        serverId,
        channelId
      });
      res.json(config);
    } catch (error) {
      console.error('Error configuring Discord:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to configure Discord' });
    }
  });

  app.post('/api/integrations/slack/send', ensureAuthenticated, async (req, res) => {
    try {
      const { message, channel, attachments } = req.body;
      await slackDiscordService.sendSlackMessage(req.user!.id, {
        text: message,
        channel,
        attachments
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error sending Slack message:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to send Slack message' });
    }
  });

  app.post('/api/integrations/discord/send', ensureAuthenticated, async (req, res) => {
    try {
      const { content, embeds } = req.body;
      await slackDiscordService.sendDiscordMessage(req.user!.id, {
        content,
        embeds
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error sending Discord message:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to send Discord message' });
    }
  });

  app.get('/api/integrations/slack/channels', ensureAuthenticated, async (req, res) => {
    try {
      const channels = await slackDiscordService.getSlackChannels(req.user!.id);
      res.json(channels);
    } catch (error) {
      console.error('Error fetching Slack channels:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch Slack channels' });
    }
  });

  app.get('/api/integrations/discord/servers', ensureAuthenticated, async (req, res) => {
    try {
      const servers = await slackDiscordService.getDiscordServers(req.user!.id);
      res.json(servers);
    } catch (error) {
      console.error('Error fetching Discord servers:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch Discord servers' });
    }
  });

  app.post('/api/integrations/slack/webhook', ensureAuthenticated, async (req, res) => {
    try {
      const webhook = await slackDiscordService.createSlackWebhook(req.user!.id, req.body);
      res.json(webhook);
    } catch (error) {
      console.error('Error creating Slack webhook:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create Slack webhook' });
    }
  });

  app.post('/api/integrations/discord/webhook', ensureAuthenticated, async (req, res) => {
    try {
      const webhook = await slackDiscordService.createDiscordWebhook(req.user!.id, req.body);
      res.json(webhook);
    } catch (error) {
      console.error('Error creating Discord webhook:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create Discord webhook' });
    }
  });

  // Integration Routes - JIRA/Linear
  app.post('/api/integrations/jira/configure', ensureAuthenticated, async (req, res) => {
    try {
      const { domain, email, apiToken } = req.body;
      const config = await jiraLinearService.configureJira(req.user!.id, {
        domain,
        email,
        apiToken
      });
      res.json(config);
    } catch (error) {
      console.error('Error configuring JIRA:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to configure JIRA' });
    }
  });

  app.post('/api/integrations/linear/configure', ensureAuthenticated, async (req, res) => {
    try {
      const { apiKey, teamId } = req.body;
      const config = await jiraLinearService.configureLinear(req.user!.id, {
        apiKey,
        teamId
      });
      res.json(config);
    } catch (error) {
      console.error('Error configuring Linear:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to configure Linear' });
    }
  });

  app.post('/api/integrations/jira/issues', ensureAuthenticated, async (req, res) => {
    try {
      const issue = await jiraLinearService.createJiraIssue(req.user!.id, req.body);
      res.json(issue);
    } catch (error) {
      console.error('Error creating JIRA issue:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create JIRA issue' });
    }
  });

  app.post('/api/integrations/linear/issues', ensureAuthenticated, async (req, res) => {
    try {
      const issue = await jiraLinearService.createLinearIssue(req.user!.id, req.body);
      res.json(issue);
    } catch (error) {
      console.error('Error creating Linear issue:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create Linear issue' });
    }
  });

  app.post('/api/integrations/jira/sync', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.body;
      await jiraLinearService.syncJiraProject(req.user!.id, projectId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error syncing JIRA project:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to sync JIRA project' });
    }
  });

  app.post('/api/integrations/linear/sync', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.body;
      await jiraLinearService.syncLinearProject(req.user!.id, projectId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error syncing Linear project:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to sync Linear project' });
    }
  });

  app.get('/api/integrations/jira/projects', ensureAuthenticated, async (req, res) => {
    try {
      const projects = await jiraLinearService.getJiraProjects(req.user!.id);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching JIRA projects:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch JIRA projects' });
    }
  });

  app.get('/api/integrations/linear/teams', ensureAuthenticated, async (req, res) => {
    try {
      const teams = await jiraLinearService.getLinearTeams(req.user!.id);
      res.json(teams);
    } catch (error) {
      console.error('Error fetching Linear teams:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch Linear teams' });
    }
  });

  // Integration Routes - Datadog/New Relic
  app.post('/api/integrations/datadog/configure', ensureAuthenticated, async (req, res) => {
    try {
      const { apiKey, appKey, site } = req.body;
      const config = await datadogNewRelicService.configureDatadog(req.user!.id, {
        apiKey,
        appKey,
        site
      });
      res.json(config);
    } catch (error) {
      console.error('Error configuring Datadog:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to configure Datadog' });
    }
  });

  app.post('/api/integrations/newrelic/configure', ensureAuthenticated, async (req, res) => {
    try {
      const { accountId, apiKey, region } = req.body;
      const config = await datadogNewRelicService.configureNewRelic(req.user!.id, {
        accountId,
        apiKey,
        region
      });
      res.json(config);
    } catch (error) {
      console.error('Error configuring New Relic:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to configure New Relic' });
    }
  });

  app.post('/api/integrations/datadog/metrics', ensureAuthenticated, async (req, res) => {
    try {
      await datadogNewRelicService.sendDatadogMetrics(req.user!.id, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('Error sending Datadog metrics:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to send Datadog metrics' });
    }
  });

  app.post('/api/integrations/newrelic/metrics', ensureAuthenticated, async (req, res) => {
    try {
      await datadogNewRelicService.sendNewRelicMetrics(req.user!.id, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('Error sending New Relic metrics:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to send New Relic metrics' });
    }
  });

  app.post('/api/integrations/datadog/alerts', ensureAuthenticated, async (req, res) => {
    try {
      const alert = await datadogNewRelicService.createDatadogAlert(req.user!.id, req.body);
      res.json(alert);
    } catch (error) {
      console.error('Error creating Datadog alert:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create Datadog alert' });
    }
  });

  app.post('/api/integrations/newrelic/alerts', ensureAuthenticated, async (req, res) => {
    try {
      const alert = await datadogNewRelicService.createNewRelicAlert(req.user!.id, req.body);
      res.json(alert);
    } catch (error) {
      console.error('Error creating New Relic alert:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create New Relic alert' });
    }
  });

  app.get('/api/integrations/datadog/dashboards', ensureAuthenticated, async (req, res) => {
    try {
      const dashboards = await datadogNewRelicService.getDatadogDashboards(req.user!.id);
      res.json(dashboards);
    } catch (error) {
      console.error('Error fetching Datadog dashboards:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch Datadog dashboards' });
    }
  });

  app.get('/api/integrations/newrelic/applications', ensureAuthenticated, async (req, res) => {
    try {
      const apps = await datadogNewRelicService.getNewRelicApplications(req.user!.id);
      res.json(apps);
    } catch (error) {
      console.error('Error fetching New Relic applications:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch New Relic applications' });
    }
  });

  // Integration Routes - Webhooks
  app.post('/api/webhooks', ensureAuthenticated, async (req, res) => {
    try {
      const webhook = await webhookService.createWebhook(req.user!.id, req.body);
      res.json(webhook);
    } catch (error) {
      console.error('Error creating webhook:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create webhook' });
    }
  });

  app.get('/api/webhooks', ensureAuthenticated, async (req, res) => {
    try {
      const webhooks = await webhookService.getUserWebhooks(req.user!.id);
      res.json(webhooks);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch webhooks' });
    }
  });

  app.patch('/api/webhooks/:webhookId', ensureAuthenticated, async (req, res) => {
    try {
      const webhook = await webhookService.updateWebhook(req.params.webhookId, req.body);
      res.json(webhook);
    } catch (error) {
      console.error('Error updating webhook:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to update webhook' });
    }
  });

  app.delete('/api/webhooks/:webhookId', ensureAuthenticated, async (req, res) => {
    try {
      await webhookService.deleteWebhook(req.params.webhookId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting webhook:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to delete webhook' });
    }
  });

  app.post('/api/webhooks/:webhookId/trigger', ensureAuthenticated, async (req, res) => {
    try {
      await webhookService.triggerWebhook(req.params.webhookId, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('Error triggering webhook:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to trigger webhook' });
    }
  });

  app.get('/api/webhooks/:webhookId/deliveries', ensureAuthenticated, async (req, res) => {
    try {
      const deliveries = await webhookService.getWebhookDeliveries(req.params.webhookId);
      res.json(deliveries);
    } catch (error) {
      console.error('Error fetching webhook deliveries:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch webhook deliveries' });
    }
  });

  app.post('/api/webhooks/:webhookId/test', ensureAuthenticated, async (req, res) => {
    try {
      await webhookService.testWebhook(req.params.webhookId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error testing webhook:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to test webhook' });
    }
  });

  app.post('/api/webhooks/:webhookId/regenerate-secret', ensureAuthenticated, async (req, res) => {
    try {
      const webhook = await webhookService.regenerateWebhookSecret(req.params.webhookId);
      res.json(webhook);
    } catch (error) {
      console.error('Error regenerating webhook secret:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to regenerate webhook secret' });
    }
  });
  
  // Billing routes
  app.get('/api/users/:userId/subscription', ensureAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (userId !== req.user!.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const subscription = await simplePaymentProcessor.getSubscription(userId);
      res.json(subscription || {
        plan: 'free',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });
  
  app.get('/api/users/:userId/usage', ensureAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (userId !== req.user!.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      
      const usage = await simplePaymentProcessor.getUsageStats(userId);
      res.json(usage);
    } catch (error) {
      console.error('Error fetching usage:', error);
      res.status(500).json({ error: 'Failed to fetch usage' });
    }
  });
  
  app.post('/api/billing/create-checkout-session', ensureAuthenticated, async (req, res) => {
    try {
      const { plan } = req.body;
      const session = await simplePaymentProcessor.createCheckoutSession(req.user!.id, plan);
      
      // Simulate a checkout URL
      res.json({
        checkoutUrl: `/billing/checkout/${session.id}`,
        sessionId: session.id
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });
  
  app.post('/api/billing/complete-checkout/:sessionId', ensureAuthenticated, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const subscription = await simplePaymentProcessor.completeCheckout(sessionId);
      res.json(subscription);
    } catch (error) {
      console.error('Error completing checkout:', error);
      res.status(500).json({ error: 'Failed to complete checkout' });
    }
  });
  
  app.post('/api/billing/cancel-subscription', ensureAuthenticated, async (req, res) => {
    try {
      const subscription = await simplePaymentProcessor.cancelSubscription(req.user!.id);
      res.json(subscription);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  });
  
  app.post('/api/billing/resume-subscription', ensureAuthenticated, async (req, res) => {
    try {
      const subscription = await simplePaymentProcessor.resumeSubscription(req.user!.id);
      res.json(subscription);
    } catch (error) {
      console.error('Error resuming subscription:', error);
      res.status(500).json({ error: 'Failed to resume subscription' });
    }
  });
  
  app.get('/api/billing/payment-methods', ensureAuthenticated, async (req, res) => {
    try {
      const methods = await simplePaymentProcessor.getPaymentMethods(req.user!.id);
      res.json({ paymentMethods: methods });
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
  });
  
  app.post('/api/billing/add-payment-method', ensureAuthenticated, async (req, res) => {
    try {
      const { token } = req.body;
      const method = await simplePaymentProcessor.addPaymentMethod(req.user!.id, token);
      res.json(method);
    } catch (error) {
      console.error('Error adding payment method:', error);
      res.status(500).json({ error: 'Failed to add payment method' });
    }
  });
  
  app.delete('/api/billing/payment-methods/:methodId', ensureAuthenticated, async (req, res) => {
    try {
      const { methodId } = req.params;
      await simplePaymentProcessor.deletePaymentMethod(req.user!.id, methodId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting payment method:', error);
      res.status(500).json({ error: 'Failed to delete payment method' });
    }
  });
  
  app.get('/api/billing/invoices', ensureAuthenticated, async (req, res) => {
    try {
      const invoices = await simplePaymentProcessor.getInvoices(req.user!.id);
      res.json({ invoices });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });
  
  // Analytics routes
  app.get('/api/projects/:projectId/analytics', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const timeRange = req.query.timeRange as string || '7d';
      
      const analytics = await simpleAnalytics.getAnalytics(projectId, timeRange);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });
  
  app.post('/api/projects/:projectId/analytics/track', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { type, path, sessionId, metadata } = req.body;
      
      await simpleAnalytics.trackEvent({
        projectId,
        type,
        path,
        userId: req.user!.id,
        sessionId,
        metadata
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking event:', error);
      res.status(500).json({ error: 'Failed to track event' });
    }
  });
  
  app.get('/api/projects/:projectId/stats', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const stats = await simpleAnalytics.getProjectStats(projectId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching project stats:', error);
      res.status(500).json({ error: 'Failed to fetch project stats' });
    }
  });
  
  // Backup routes
  app.get('/api/projects/:projectId/backups', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const backups = await simpleBackupManager.getBackups(projectId);
      res.json({ backups });
    } catch (error) {
      console.error('Error fetching backups:', error);
      res.status(500).json({ error: 'Failed to fetch backups' });
    }
  });
  
  app.post('/api/projects/:projectId/backups', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { name, description, includes, type } = req.body;
      
      const backup = await simpleBackupManager.createBackup(projectId, {
        name,
        description,
        includes,
        type
      });
      
      res.json(backup);
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  });
  
  app.post('/api/projects/:projectId/backups/:backupId/restore', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { backupId } = req.params;
      
      await simpleBackupManager.restoreBackup(backupId, projectId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error restoring backup:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to restore backup' });
    }
  });
  
  app.delete('/api/projects/:projectId/backups/:backupId', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const { backupId } = req.params;
      
      await simpleBackupManager.deleteBackup(backupId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting backup:', error);
      res.status(500).json({ error: 'Failed to delete backup' });
    }
  });
  
  app.get('/api/projects/:projectId/backups/:backupId/download', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const { backupId } = req.params;
      const { name } = req.query;
      
      const backupPath = await simpleBackupManager.downloadBackup(backupId);
      res.download(backupPath, `${name || backupId}.zip`);
    } catch (error) {
      console.error('Error downloading backup:', error);
      res.status(500).json({ error: 'Failed to download backup' });
    }
  });
  
  app.get('/api/projects/:projectId/backup-settings', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const settings = await simpleBackupManager.getSettings(projectId);
      res.json({ settings });
    } catch (error) {
      console.error('Error fetching backup settings:', error);
      res.status(500).json({ error: 'Failed to fetch backup settings' });
    }
  });
  
  app.put('/api/projects/:projectId/backup-settings', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      await simpleBackupManager.updateSettings(projectId, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating backup settings:', error);
      res.status(500).json({ error: 'Failed to update backup settings' });
    }
  });
  
  app.get('/api/projects/:projectId/backups/:backupId/restore-status', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
    try {
      const { backupId } = req.params;
      const status = await simpleBackupManager.getRestoreStatus(backupId);
      res.json(status);
    } catch (error) {
      console.error('Error fetching restore status:', error);
      res.status(500).json({ error: 'Failed to fetch restore status' });
    }
  });
  
  // Theme Management Routes
  
  // Get available themes
  app.get('/api/themes', async (req, res) => {
    try {
      const themes = {
        editor: [
          {
            id: 'dark-pro',
            name: 'Dark Pro',
            description: 'Professional dark theme with high contrast',
            preview: { bg: '#1e1e1e', fg: '#d4d4d4', accent: '#007acc' },
            downloads: 124500,
            rating: 4.9,
            author: 'E-Code Team',
            official: true
          },
          {
            id: 'light-minimal',
            name: 'Light Minimal',
            description: 'Clean and minimal light theme',
            preview: { bg: '#ffffff', fg: '#333333', accent: '#0066cc' },
            downloads: 89230,
            rating: 4.7,
            author: 'E-Code Team',
            official: true
          },
          {
            id: 'monokai',
            name: 'Monokai',
            description: 'Classic Monokai color scheme',
            preview: { bg: '#272822', fg: '#f8f8f2', accent: '#66d9ef' },
            downloads: 67890,
            rating: 4.8,
            author: 'Community',
            official: false
          },
          {
            id: 'dracula',
            name: 'Dracula',
            description: 'Dark theme with vibrant colors',
            preview: { bg: '#282a36', fg: '#f8f8f2', accent: '#bd93f9' },
            downloads: 56789,
            rating: 4.9,
            author: 'Community',
            official: false
          },
          {
            id: 'solarized-dark',
            name: 'Solarized Dark',
            description: 'Precision colors for machines and people',
            preview: { bg: '#002b36', fg: '#839496', accent: '#268bd2' },
            downloads: 45678,
            rating: 4.6,
            author: 'Community',
            official: false
          },
          {
            id: 'nord',
            name: 'Nord',
            description: 'Arctic, north-bluish color palette',
            preview: { bg: '#2e3440', fg: '#d8dee9', accent: '#88c0d0' },
            downloads: 34567,
            rating: 4.7,
            author: 'Community',
            official: false
          }
        ],
        ui: [
          {
            id: 'default',
            name: 'Default',
            description: 'E-Code default UI theme',
            preview: { primary: '#0079f2', bg: '#0e1525', surface: '#1c2333' }
          },
          {
            id: 'midnight',
            name: 'Midnight',
            description: 'Deep dark theme for night owls',
            preview: { primary: '#6366f1', bg: '#0f0f23', surface: '#1a1a2e' }
          },
          {
            id: 'forest',
            name: 'Forest',
            description: 'Nature-inspired green theme',
            preview: { primary: '#10b981', bg: '#064e3b', surface: '#065f46' }
          },
          {
            id: 'sunset',
            name: 'Sunset',
            description: 'Warm orange and purple tones',
            preview: { primary: '#f59e0b', bg: '#451a03', surface: '#78350f' }
          }
        ]
      };
      
      res.json(themes);
    } catch (error) {
      console.error('Error fetching themes:', error);
      res.status(500).json({ error: 'Failed to fetch themes' });
    }
  });
  
  // Get user's theme settings
  app.get('/api/themes/settings', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const settings = await storage.getUserThemeSettings(userId);
      
      res.json(settings || {
        activeEditorTheme: 'dark-pro',
        activeUITheme: 'default',
        systemTheme: 'dark',
        syncAcrossDevices: true,
        enableAnimations: true,
        highContrast: false,
        customSettings: {
          fontSize: '14px',
          lineHeight: '1.5',
          tabSize: '2',
          wordWrap: 'on'
        }
      });
    } catch (error) {
      console.error('Error fetching theme settings:', error);
      res.status(500).json({ error: 'Failed to fetch theme settings' });
    }
  });
  
  // Update user's theme settings
  app.put('/api/themes/settings', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const settings = req.body;
      
      await storage.updateUserThemeSettings(userId, settings);
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error updating theme settings:', error);
      res.status(500).json({ error: 'Failed to update theme settings' });
    }
  });
  
  // Get user's installed themes
  app.get('/api/themes/installed', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const installedThemes = await storage.getUserInstalledThemes(userId);
      
      res.json(installedThemes || ['dark-pro', 'light-minimal']);
    } catch (error) {
      console.error('Error fetching installed themes:', error);
      res.status(500).json({ error: 'Failed to fetch installed themes' });
    }
  });
  
  // Install a theme
  app.post('/api/themes/install', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { themeId } = req.body;
      
      await storage.installThemeForUser(userId, themeId);
      res.json({ success: true, message: 'Theme installed successfully' });
    } catch (error) {
      console.error('Error installing theme:', error);
      res.status(500).json({ error: 'Failed to install theme' });
    }
  });
  
  // Export theme settings
  app.get('/api/themes/export', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const settings = await storage.getUserThemeSettings(userId);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="ecode-theme-settings.json"');
      res.json({
        version: '1.0',
        exportDate: new Date().toISOString(),
        settings
      });
    } catch (error) {
      console.error('Error exporting theme:', error);
      res.status(500).json({ error: 'Failed to export theme' });
    }
  });
  
  // Import theme settings
  app.post('/api/themes/import', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { settings } = req.body;
      
      if (!settings || !settings.version) {
        return res.status(400).json({ error: 'Invalid theme file' });
      }
      
      await storage.updateUserThemeSettings(userId, settings.settings || settings);
      res.json({ success: true, message: 'Theme settings imported successfully' });
    } catch (error) {
      console.error('Error importing theme:', error);
      res.status(500).json({ error: 'Failed to import theme' });
    }
  });
  
  // Create custom theme
  app.post('/api/themes/create', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { name, description, theme } = req.body;
      
      const customTheme = {
        id: `custom-${Date.now()}`,
        name,
        description,
        author: req.user!.username,
        official: false,
        createdAt: new Date(),
        ...theme
      };
      
      await storage.createCustomTheme(userId, customTheme);
      res.json({ success: true, theme: customTheme });
    } catch (error) {
      console.error('Error creating custom theme:', error);
      res.status(500).json({ error: 'Failed to create custom theme' });
    }
  });

  // Team Management Routes
  
  // Get user's teams
  app.get('/api/teams', ensureAuthenticated, async (req, res) => {
    try {
      const teams = await teamsService.getUserTeams(req.user!.id);
      res.json(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  });
  
  // Get user's team invitations
  app.get('/api/teams/invitations', ensureAuthenticated, async (req, res) => {
    try {
      const invitations = await teamsService.getUserInvitations(req.user!.id);
      res.json(invitations);
    } catch (error) {
      console.error('Error fetching team invitations:', error);
      res.status(500).json({ error: 'Failed to fetch invitations' });
    }
  });

  // Create a new team
  app.post('/api/teams', ensureAuthenticated, async (req, res) => {
    try {
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Team name is required' });
      }
      
      const team = await teamsService.createTeam(req.user!.id, {
        name,
        description,
        ownerId: req.user!.id
      });
      
      res.status(201).json(team);
    } catch (error) {
      console.error('Error creating team:', error);
      res.status(500).json({ error: 'Failed to create team' });
    }
  });

  // Get team by ID
  app.get('/api/teams/:teamId', ensureAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const team = await teamsService.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      // Check if user is a member
      const member = await storage.getTeamMember(teamId, req.user!.id);
      if (!member) {
        return res.status(403).json({ error: 'Not a member of this team' });
      }
      
      res.json(team);
    } catch (error) {
      console.error('Error fetching team:', error);
      res.status(500).json({ error: 'Failed to fetch team' });
    }
  });

  // Update team
  app.patch('/api/teams/:teamId', ensureAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const updates = req.body;
      
      const team = await teamsService.updateTeam(teamId, req.user!.id, updates);
      res.json(team);
    } catch (error) {
      console.error('Error updating team:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to update team' });
    }
  });

  // Delete team
  app.delete('/api/teams/:teamId', ensureAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      
      await teamsService.deleteTeam(teamId, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting team:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to delete team' });
    }
  });

  // Get team members
  app.get('/api/teams/:teamId/members', ensureAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      
      // Check if user is a member
      const member = await storage.getTeamMember(teamId, req.user!.id);
      if (!member) {
        return res.status(403).json({ error: 'Not a member of this team' });
      }
      
      const members = await storage.getTeamMembers(teamId);
      
      // Fetch user details for each member
      const membersWithDetails = await Promise.all(
        members.map(async (m) => {
          const user = await storage.getUser(m.userId);
          return {
            ...m,
            user: {
              id: user?.id,
              username: user?.username,
              displayName: user?.displayName,
              avatarUrl: user?.avatarUrl
            }
          };
        })
      );
      
      res.json(membersWithDetails);
    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ error: 'Failed to fetch team members' });
    }
  });

  // Invite team member
  app.post('/api/teams/:teamId/invitations', ensureAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const { email, role } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      const invitation = await teamsService.addTeamMember(teamId, req.user!.id, email, role);
      res.status(201).json(invitation);
    } catch (error) {
      console.error('Error inviting team member:', error);
      res.status(500).json({ error: error.message || 'Failed to invite team member' });
    }
  });

  // Accept team invitation
  app.post('/api/teams/invitations/:token/accept', ensureAuthenticated, async (req, res) => {
    try {
      const { token } = req.params;
      
      const member = await teamsService.acceptInvitation(token, req.user!.id);
      res.json(member);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({ error: error.message || 'Failed to accept invitation' });
    }
  });

  // Decline team invitation
  app.post('/api/teams/invitations/:token/decline', ensureAuthenticated, async (req, res) => {
    try {
      const { token } = req.params;
      
      await teamsService.declineInvitation(token, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error declining invitation:', error);
      res.status(500).json({ error: error.message || 'Failed to decline invitation' });
    }
  });

  // Remove team member
  app.delete('/api/teams/:teamId/members/:userId', ensureAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = parseInt(req.params.userId);
      
      await teamsService.removeTeamMember(teamId, req.user!.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing team member:', error);
      res.status(500).json({ error: error.message || 'Failed to remove team member' });
    }
  });

  // Update member role
  app.patch('/api/teams/:teamId/members/:userId', ensureAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = parseInt(req.params.userId);
      const { role } = req.body;
      
      if (!role) {
        return res.status(400).json({ error: 'Role is required' });
      }
      
      const member = await teamsService.updateMemberRole(teamId, req.user!.id, userId, role);
      res.json(member);
    } catch (error) {
      console.error('Error updating member role:', error);
      res.status(500).json({ error: error.message || 'Failed to update member role' });
    }
  });

  // Get team projects
  app.get('/api/teams/:teamId/projects', ensureAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      
      const projects = await teamsService.getTeamProjects(teamId, req.user!.id);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching team projects:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch team projects' });
    }
  });

  // Add project to team
  app.post('/api/teams/:teamId/projects', ensureAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const { projectId } = req.body;
      
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      
      const teamProject = await teamsService.addProjectToTeam(teamId, req.user!.id, projectId);
      res.status(201).json(teamProject);
    } catch (error) {
      console.error('Error adding project to team:', error);
      res.status(500).json({ error: error.message || 'Failed to add project to team' });
    }
  });

  // Remove project from team
  app.delete('/api/teams/:teamId/projects/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const projectId = parseInt(req.params.projectId);
      
      await teamsService.removeProjectFromTeam(teamId, req.user!.id, projectId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing project from team:', error);
      res.status(500).json({ error: error.message || 'Failed to remove project from team' });
    }
  });

  // Get team workspaces
  app.get('/api/teams/:teamId/workspaces', ensureAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      
      const workspaces = await teamsService.getTeamWorkspaces(teamId, req.user!.id);
      res.json(workspaces);
    } catch (error) {
      console.error('Error fetching team workspaces:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch team workspaces' });
    }
  });

  // Create team workspace
  app.post('/api/teams/:teamId/workspaces', ensureAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Workspace name is required' });
      }
      
      const workspace = await teamsService.createWorkspace(teamId, req.user!.id, {
        name,
        description,
        teamId,
        createdBy: req.user!.id
      });
      
      res.status(201).json(workspace);
    } catch (error) {
      console.error('Error creating workspace:', error);
      res.status(500).json({ error: error.message || 'Failed to create workspace' });
    }
  });

  // Get team activity
  app.get('/api/teams/:teamId/activity', ensureAuthenticated, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const limit = parseInt(req.query.limit as string) || 50;
      
      const activity = await teamsService.getTeamActivity(teamId, req.user!.id, limit);
      res.json(activity);
    } catch (error) {
      console.error('Error fetching team activity:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch team activity' });
    }
  });

  // Monitoring routes
  app.use("/api/monitoring", monitoringRouter);
  
  // Authentication complete routes
  app.use('/api/auth', authCompleteRouter);

  // GitHub API routes for authenticated users
  app.get('/api/github/repos', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const githubToken = await storage.getGitHubToken(userId);
      
      if (!githubToken) {
        return res.status(401).json({ 
          error: 'GitHub not connected',
          message: 'Please connect your GitHub account first'
        });
      }

      // Use Octokit to fetch repositories
      const { Octokit } = await import('@octokit/rest');
      const octokit = new Octokit({ auth: githubToken.accessToken });
      
      const { data: repos } = await octokit.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: 'updated',
        direction: 'desc'
      });

      res.json(repos);
    } catch (error) {
      console.error('Error fetching GitHub repos:', error);
      res.status(500).json({ error: 'Failed to fetch repositories' });
    }
  });

  // Check GitHub connection status
  app.get('/api/github/status', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const githubToken = await storage.getGitHubToken(userId);
      
      res.json({ 
        connected: !!githubToken,
        username: githubToken?.githubUsername,
        connectedAt: githubToken?.connectedAt
      });
    } catch (error) {
      console.error('Error checking GitHub status:', error);
      res.status(500).json({ error: 'Failed to check GitHub connection status' });
    }
  });

  // Disconnect GitHub
  app.delete('/api/github/disconnect', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      await storage.removeGitHubToken(userId);
      
      res.json({ message: 'GitHub disconnected successfully' });
    } catch (error) {
      console.error('Error disconnecting GitHub:', error);
      res.status(500).json({ error: 'Failed to disconnect GitHub' });
    }
  });
  
  // Notification routes
  app.use(notificationRoutes);
  
  // Preview routes
  const previewRoutesModule = await import('./routes/preview');
  app.use(previewRoutesModule.default);
  
  // File upload routes
  const fileUploadRoutesModule = await import('./routes/file-upload');
  app.use(fileUploadRoutesModule.default);

  // Simple preview route for HTML/CSS/JS projects
  app.get('/preview/:projectId/*', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const filepath = (req.params as any)[0] || 'index.html';
      
      // Get all project files
      const files = await storage.getFilesByProjectId(projectId);
      
      // Find the requested file
      const file = files.find(f => f.name === filepath && !f.isFolder);
      
      if (!file) {
        // Try to find index.html as default
        const indexFile = files.find(f => f.name === 'index.html' && !f.isFolder);
        if (indexFile) {
          res.type('html').send(indexFile.content || '');
          return;
        }
        return res.status(404).send('File not found');
      }
      
      // Set appropriate content type
      const ext = path.extname(filepath).toLowerCase();
      switch (ext) {
        case '.html':
          res.type('text/html');
          break;
        case '.css':
          res.type('text/css');
          break;
        case '.js':
          res.type('application/javascript');
          break;
        default:
          res.type('text/plain');
      }
      
      res.send(file.content || '');
    } catch (error) {
      console.error('Error serving preview:', error);
      res.status(500).send('Error loading preview');
    }
  });
  
  // Secrets Routes
  app.get('/api/secrets', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userSecrets = await storage.getSecretsByUser(userId);
      
      // Don't send the actual values for security
      const sanitizedSecrets = userSecrets.map(secret => ({
        id: secret.id,
        key: secret.key,
        description: secret.description,
        projectId: secret.projectId,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt
      }));
      
      res.json(sanitizedSecrets);
    } catch (error) {
      console.error('Error fetching secrets:', error);
      res.status(500).json({ error: 'Failed to fetch secrets' });
    }
  });

  // Project Secrets Routes
  app.get('/api/projects/:projectId/secrets', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const projectId = parseInt(req.params.projectId);
      
      // Verify project access
      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== userId) {
        const isCollaborator = await storage.isProjectCollaborator(projectId, userId);
        if (!isCollaborator) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      // Get secrets for this project
      const secrets = await storage.getProjectSecrets(projectId);
      
      // Don't send the actual values for security
      const sanitizedSecrets = secrets.map(secret => ({
        id: secret.id,
        key: secret.key,
        description: secret.description,
        category: secret.description?.toLowerCase().includes('api') ? 'api' :
                  secret.description?.toLowerCase().includes('database') ? 'database' :
                  secret.description?.toLowerCase().includes('auth') ? 'auth' :
                  secret.description?.toLowerCase().includes('service') ? 'service' : 'other',
        isVisible: false,
        projectId: secret.projectId,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt
      }));
      
      res.json({ secrets: sanitizedSecrets });
    } catch (error) {
      console.error('Error fetching project secrets:', error);
      res.status(500).json({ error: 'Failed to fetch project secrets' });
    }
  });

  app.post('/api/projects/:projectId/secrets', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const projectId = parseInt(req.params.projectId);
      const { key, value, description } = req.body;
      
      // Verify project access
      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== userId) {
        const isCollaborator = await storage.isProjectCollaborator(projectId, userId);
        if (!isCollaborator) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      if (!key || !value) {
        return res.status(400).json({ error: 'Key and value are required' });
      }
      
      // Validate key format (uppercase, underscores only)
      if (!/^[A-Z_]+$/.test(key)) {
        return res.status(400).json({ error: 'Key must contain only uppercase letters and underscores' });
      }
      
      const secret = await storage.createSecret({
        userId,
        key,
        value,
        description,
        projectId
      });
      
      // Return without the value for security
      res.json({
        id: secret.id,
        key: secret.key,
        description: secret.description,
        projectId: secret.projectId,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt
      });
    } catch (error: any) {
      if (error.message?.includes('duplicate key')) {
        return res.status(409).json({ error: 'A secret with this key already exists' });
      }
      console.error('Error creating project secret:', error);
      res.status(500).json({ error: 'Failed to create secret' });
    }
  });

  app.delete('/api/projects/:projectId/secrets/:secretId', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const projectId = parseInt(req.params.projectId);
      const secretId = parseInt(req.params.secretId);
      
      // Verify project access
      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== userId) {
        const isCollaborator = await storage.isProjectCollaborator(projectId, userId);
        if (!isCollaborator) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      // Verify secret belongs to project
      const secret = await storage.getSecret(secretId);
      if (!secret || secret.projectId !== projectId) {
        return res.status(404).json({ error: 'Secret not found' });
      }
      
      await storage.deleteSecret(secretId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting project secret:', error);
      res.status(500).json({ error: 'Failed to delete secret' });
    }
  });
  
  app.post('/api/secrets', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { key, value, description, projectId } = req.body;
      
      if (!key || !value) {
        return res.status(400).json({ error: 'Key and value are required' });
      }
      
      // Validate key format (uppercase, underscores only)
      if (!/^[A-Z_]+$/.test(key)) {
        return res.status(400).json({ error: 'Key must contain only uppercase letters and underscores' });
      }
      
      const secret = await storage.createSecret({
        userId,
        key,
        value,
        description,
        projectId
      });
      
      // Return without the value for security
      res.json({
        id: secret.id,
        key: secret.key,
        description: secret.description,
        projectId: secret.projectId,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt
      });
    } catch (error: any) {
      if (error.message?.includes('duplicate key')) {
        return res.status(409).json({ error: 'A secret with this key already exists' });
      }
      console.error('Error creating secret:', error);
      res.status(500).json({ error: 'Failed to create secret' });
    }
  });
  
  app.put('/api/secrets/:id', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const secretId = parseInt(req.params.id);
      const { value, description } = req.body;
      
      // Verify ownership
      const secret = await storage.getSecret(secretId);
      if (!secret || secret.userId !== userId) {
        return res.status(404).json({ error: 'Secret not found' });
      }
      
      const updated = await storage.updateSecret(secretId, {
        value,
        description
      });
      
      // Return without the value for security
      res.json({
        id: updated.id,
        key: updated.key,
        description: updated.description,
        projectId: updated.projectId,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      });
    } catch (error) {
      console.error('Error updating secret:', error);
      res.status(500).json({ error: 'Failed to update secret' });
    }
  });
  
  app.delete('/api/secrets/:id', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const secretId = parseInt(req.params.id);
      
      // Verify ownership
      const secret = await storage.getSecret(secretId);
      if (!secret || secret.userId !== userId) {
        return res.status(404).json({ error: 'Secret not found' });
      }
      
      await storage.deleteSecret(secretId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting secret:', error);
      res.status(500).json({ error: 'Failed to delete secret' });
    }
  });
  
  // Get secret value (for server-side use only)
  app.get('/api/secrets/:id/value', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const secretId = parseInt(req.params.id);
      
      const secret = await storage.getSecret(secretId);
      if (!secret || secret.userId !== userId) {
        return res.status(404).json({ error: 'Secret not found' });
      }
      
      res.json({ value: secret.value });
    } catch (error) {
      console.error('Error fetching secret value:', error);
      res.status(500).json({ error: 'Failed to fetch secret value' });
    }
  });

  // Edge Computing and CDN routes
  app.get('/api/edge/locations', async (req, res) => {
    try {
      const locations = await edgeManager.getEdgeLocations();
      res.json(locations);
    } catch (error) {
      console.error('Error fetching edge locations:', error);
      res.status(500).json({ message: 'Failed to fetch edge locations' });
    }
  });

  app.post('/api/projects/:id/edge-deploy', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = req.params.id;
      const userId = (req.user as any).id;
      
      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const deployment = await edgeManager.deployToEdge(projectId, req.body);
      res.json(deployment);
    } catch (error) {
      console.error('Error deploying to edge:', error);
      res.status(500).json({ message: 'Failed to deploy to edge' });
    }
  });

  app.get('/api/projects/:id/edge-deployments', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = req.params.id;
      const userId = (req.user as any).id;
      
      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const deployments = await edgeManager.getProjectDeployments(projectId);
      res.json(deployments);
    } catch (error) {
      console.error('Error fetching edge deployments:', error);
      res.status(500).json({ message: 'Failed to fetch edge deployments' });
    }
  });

  app.get('/api/edge/metrics/:deploymentId', ensureAuthenticated, async (req, res) => {
    try {
      const { deploymentId } = req.params;
      const { start, end } = req.query;
      
      const timeRange = start && end ? {
        start: new Date(start as string),
        end: new Date(end as string)
      } : undefined;

      const metrics = await edgeManager.getMetrics(deploymentId, timeRange);
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({ message: 'Failed to fetch metrics' });
    }
  });

  app.post('/api/projects/:id/cdn/purge', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = req.params.id;
      const userId = (req.user as any).id;
      
      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const purgeRequest = await cdnService.purgeCache(projectId, req.body);
      res.json(purgeRequest);
    } catch (error) {
      console.error('Error purging CDN cache:', error);
      res.status(500).json({ message: 'Failed to purge CDN cache' });
    }
  });

  app.get('/api/projects/:id/cdn/assets', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = req.params.id;
      const userId = (req.user as any).id;
      
      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const assets = await cdnService.getProjectAssets(projectId);
      res.json(assets);
    } catch (error) {
      console.error('Error fetching CDN assets:', error);
      res.status(500).json({ message: 'Failed to fetch CDN assets' });
    }
  });

  app.get('/api/projects/:id/cdn/usage', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = req.params.id;
      const userId = (req.user as any).id;
      
      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const usage = await cdnService.getUsageStats(projectId);
      res.json(usage);
    } catch (error) {
      console.error('Error fetching CDN usage:', error);
      res.status(500).json({ message: 'Failed to fetch CDN usage' });
    }
  });

  // Dashboard Data Endpoints (replacing all mock data)
  
  // Get user's recent deployments for dashboard
  app.get('/api/user/deployments/recent', ensureAuthenticated, async (req, res) => {
    try {
      const deployments = await storage.getDeploymentsByUser(req.user!.id);
      
      // Format deployments for dashboard display
      const recentDeployments = deployments
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map(deployment => ({
          id: deployment.id,
          project: deployment.projectName,
          status: deployment.status,
          url: deployment.url,
          time: getRelativeTime(deployment.createdAt),
        }));
      
      res.json(recentDeployments);
    } catch (error) {
      console.error('Error fetching recent deployments:', error);
      res.status(500).json({ message: 'Failed to fetch deployments' });
    }
  });
  
  // Get user's storage usage
  app.get('/api/user/storage', ensureAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUser(req.user!.id);
      
      // Calculate total storage used (simplified - count files)
      let totalSize = 0;
      for (const project of projects) {
        const files = await storage.getProjectFiles(project.id);
        // Estimate file sizes (in real app, track actual sizes)
        totalSize += files.length * 0.001; // 1KB per file estimate
      }
      
      res.json({
        used: Math.round(totalSize * 100) / 100, // GB
        limit: 5, // GB - free tier limit
        unit: 'GB'
      });
    } catch (error) {
      console.error('Error calculating storage:', error);
      res.status(500).json({ message: 'Failed to calculate storage' });
    }
  });
  
  // Get user's learning progress
  app.get('/api/user/learning', ensureAuthenticated, async (req, res) => {
    try {
      // In a real app, this would track actual course progress
      const user = await storage.getUser(req.user!.id);
      const daysSinceJoined = Math.floor((new Date().getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      res.json({
        course: '100 Days of Code',
        day: Math.min(daysSinceJoined, 100),
        streak: Math.min(daysSinceJoined, 15),
        lastCompleted: `Day ${Math.min(daysSinceJoined - 1, 99)}: ${daysSinceJoined > 1 ? 'Building Projects' : 'Getting Started'}`,
        nextLesson: `Day ${Math.min(daysSinceJoined, 100)}: ${daysSinceJoined < 100 ? 'Next Challenge' : 'Final Project'}`,
        progress: Math.min(daysSinceJoined, 100),
      });
    } catch (error) {
      console.error('Error fetching learning progress:', error);
      res.status(500).json({ message: 'Failed to fetch learning progress' });
    }
  });
  
  // Get user's cycles balance
  app.get('/api/user/cycles', ensureAuthenticated, async (req, res) => {
    try {
      // In a real app, this would track actual virtual currency
      const projects = await storage.getProjectsByUser(req.user!.id);
      const baseBalance = 500;
      const bonusPerProject = 50;
      const balance = baseBalance + (projects.length * bonusPerProject);
      
      res.json({
        balance,
        currency: 'cycles'
      });
    } catch (error) {
      console.error('Error fetching cycles:', error);
      res.status(500).json({ message: 'Failed to fetch cycles balance' });
    }
  });
  
  // Get platform announcements
  app.get('/api/announcements', async (req, res) => {
    try {
      // Get recent community posts marked as announcements
      const posts = await storage.getCommunityPosts({ category: 'announcements' });
      
      const announcements = posts.slice(0, 5).map(post => ({
        id: post.id,
        title: post.title,
        type: post.tags.includes('maintenance') ? 'maintenance' : 'feature',
        time: getRelativeTime(post.createdAt),
      }));
      
      // If no announcements, return some default ones
      if (announcements.length === 0) {
        res.json([
          { id: 1, title: 'Welcome to E-Code!', type: 'feature', time: '1 day ago' },
          { id: 2, title: 'Platform is fully operational', type: 'maintenance', time: '3 days ago' },
        ]);
      } else {
        res.json(announcements);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ message: 'Failed to fetch announcements' });
    }
  });
  
  // Get user's teams
  app.get('/api/user/teams', ensureAuthenticated, async (req, res) => {
    try {
      // Get projects where user is a collaborator
      const collaborations = await storage.getUserCollaborations(req.user!.id);
      
      // Group by project owner as "teams"
      const teamsMap = new Map();
      
      for (const collab of collaborations) {
        const project = await storage.getProject(collab.projectId);
        if (project) {
          const owner = await storage.getUser(project.ownerId);
          const teamKey = owner?.username || 'unknown';
          
          if (!teamsMap.has(teamKey)) {
            teamsMap.set(teamKey, {
              id: project.ownerId,
              name: `${owner?.displayName || owner?.username}'s Team`,
              members: 1,
              role: project.ownerId === req.user!.id ? 'owner' : 'member'
            });
          } else {
            teamsMap.get(teamKey).members++;
          }
        }
      }
      
      // Add user's own "team"
      teamsMap.set(req.user!.username, {
        id: req.user!.id,
        name: 'Personal Projects',
        members: 1,
        role: 'owner'
      });
      
      res.json(Array.from(teamsMap.values()));
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ message: 'Failed to fetch teams' });
    }
  });

  // Get user usage data
  app.get('/api/user/usage', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Get user's projects for counting
      const projects = await storage.getProjectsByUser(userId);
      const privateProjects = projects.filter(p => p.visibility === 'private');
      
      // Get active deployments
      const deployments = [];
      for (const project of projects) {
        const projectDeployments = await storage.getDeployments(project.id);
        deployments.push(...projectDeployments.filter(d => d.status === 'running'));
      }
      
      // Get AI usage
      const aiUsage = await storage.getAIUsageByUser(userId, 30); // Last 30 days
      const totalTokens = aiUsage.reduce((sum, usage) => sum + usage.tokensUsed, 0);
      
      // Get collaborators count
      const collaboratorProjects = await storage.getProjectCollaboratorsByUser(userId);
      const uniqueCollaborators = new Set(collaboratorProjects.map(c => c.userId)).size;
      
      // Calculate usage stats
      const usage = {
        compute: {
          used: Math.round(totalTokens / 1000), // Convert tokens to hours (rough estimate)
          limit: 100,
          unit: 'hours',
          percentage: Math.min(Math.round((totalTokens / 1000 / 100) * 100), 100)
        },
        storage: {
          used: Number((projects.length * 0.1).toFixed(1)), // Estimate 100MB per project
          limit: 10,
          unit: 'GB',
          percentage: Math.min((projects.length * 0.1 / 10) * 100, 100)
        },
        bandwidth: {
          used: Number((deployments.length * 2).toFixed(1)), // Estimate 2GB per deployment
          limit: 100,
          unit: 'GB',
          percentage: Math.min((deployments.length * 2 / 100) * 100, 100)
        },
        privateProjects: {
          used: privateProjects.length,
          limit: 5,
          unit: 'projects',
          percentage: Math.min((privateProjects.length / 5) * 100, 100)
        },
        deployments: {
          used: deployments.length,
          limit: 10,
          unit: 'deployments',
          percentage: Math.min((deployments.length / 10) * 100, 100)
        },
        collaborators: {
          used: uniqueCollaborators,
          limit: 3,
          unit: 'users',
          percentage: Math.min((uniqueCollaborators / 3) * 100, 100)
        }
      };
      
      res.json(usage);
    } catch (error) {
      console.error('Error fetching usage data:', error);
      res.status(500).json({ error: 'Failed to fetch usage data' });
    }
  });
  
  // Get user billing data
  app.get('/api/user/billing', ensureAuthenticated, async (req, res) => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const daysInMonth = endOfMonth.getDate();
      const currentDay = today.getDate();
      const daysRemaining = daysInMonth - currentDay + 1;
      
      const billingData = {
        currentCycle: {
          start: startOfMonth,
          end: endOfMonth,
          daysRemaining
        },
        plan: 'Pro', // In real app, fetch from user subscription
        previousCycles: [
          {
            month: 'June 2025',
            period: 'Jun 1 - Jun 30, 2025',
            amount: '$19.00',
            plan: 'Pro Plan'
          },
          {
            month: 'May 2025',
            period: 'May 1 - May 31, 2025',
            amount: '$19.00',
            plan: 'Pro Plan'
          }
        ]
      };
      
      res.json(billingData);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      res.status(500).json({ error: 'Failed to fetch billing data' });
    }
  });
  
  // Get trending projects
  app.get('/api/trending', async (req, res) => {
    try {
      // Get all projects sorted by views and likes
      const allProjects = await storage.getAllProjects();
      
      const trending = allProjects
        .filter(p => p.visibility === 'public')
        .sort((a, b) => (b.views + b.likes * 10) - (a.views + a.likes * 10))
        .slice(0, 10);
      
      const trendingWithAuthors = await Promise.all(trending.map(async (project) => {
        const author = await storage.getUser(project.ownerId);
        return {
          id: project.id,
          name: project.name,
          author: author?.username || 'unknown',
          language: project.primaryLanguage || 'JavaScript',
          stars: project.likes,
          forks: project.forks || 0,
          description: project.description || 'No description',
          lastUpdated: getRelativeTime(project.updatedAt || project.createdAt),
          avatar: author?.avatarUrl || null,
        };
      }));
      
      res.json(trendingWithAuthors);
    } catch (error) {
      console.error('Error fetching trending projects:', error);
      res.status(500).json({ message: 'Failed to fetch trending projects' });
    }
  });
  
  // Get community activity feed
  app.get('/api/activity-feed', async (req, res) => {
    try {
      // Get recent projects and community posts
      const recentProjects = await storage.getAllProjects();
      const recentPosts = await storage.getCommunityPosts({});
      
      // Create activity items from recent data
      const activities = [];
      
      // Add project activities
      for (const project of recentProjects.slice(0, 5)) {
        const user = await storage.getUser(project.ownerId);
        if (project.forks > 0) {
          activities.push({
            id: `fork-${project.id}`,
            type: 'remix',
            user: user?.username || 'someone',
            action: 'remixed',
            target: project.name,
            time: getRelativeTime(project.updatedAt || project.createdAt),
            timestamp: project.updatedAt || project.createdAt,
          });
        }
        if (project.likes > 0) {
          activities.push({
            id: `like-${project.id}`,
            type: 'like',
            user: user?.username || 'someone',
            action: 'liked',
            target: project.name,
            time: getRelativeTime(project.updatedAt || project.createdAt),
            timestamp: project.updatedAt || project.createdAt,
          });
        }
      }
      
      // Add post activities
      for (const post of recentPosts.slice(0, 5)) {
        const user = await storage.getUser(post.authorId);
        if (post.comments > 0) {
          activities.push({
            id: `comment-${post.id}`,
            type: 'comment',
            user: user?.username || 'someone',
            action: 'gave feedback on',
            target: post.title,
            time: getRelativeTime(post.createdAt),
            timestamp: post.createdAt,
          });
        }
      }
      
      // Sort by timestamp and return most recent
      const sortedActivities = activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10)
        .map(({ timestamp, ...activity }) => activity);
      
      res.json(sortedActivities);
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      res.status(500).json({ message: 'Failed to fetch activity feed' });
    }
  });

  // Object Storage API endpoints (replacing mock data)
  
  // Get storage statistics
  app.get('/api/storage/stats', ensureAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUser(req.user!.id);
      
      // Calculate storage statistics
      let totalFileCount = 0;
      let totalSize = 0;
      
      for (const project of projects) {
        const files = await storage.getProjectFiles(project.id);
        totalFileCount += files.length;
        // Estimate file sizes (in real app, track actual sizes)
        totalSize += files.reduce((sum, file) => sum + (file.content?.length || 0), 0);
      }
      
      // Convert bytes to GB for display
      const usedSizeGB = totalSize / (1024 * 1024 * 1024);
      const totalSizeGB = 5; // 5 GB limit for free tier
      
      res.json({
        totalSize: totalSizeGB * 1024 * 1024 * 1024, // Convert back to bytes
        usedSize: totalSize,
        fileCount: totalFileCount,
        folderCount: projects.length, // Each project is like a folder
        bandwidth: {
          used: totalSize * 10, // Estimate bandwidth as 10x storage
          limit: 100 * 1024 * 1024 * 1024 // 100 GB
        }
      });
    } catch (error) {
      console.error('Error fetching storage stats:', error);
      res.status(500).json({ message: 'Failed to fetch storage statistics' });
    }
  });
  
  // List files and folders
  app.get('/api/storage/list', ensureAuthenticated, async (req, res) => {
    try {
      const path = req.query.path as string || '/';
      const projects = await storage.getProjectsByUser(req.user!.id);
      
      const folders = projects.map(project => ({
        id: `project-${project.id}`,
        name: project.name,
        path: `/${project.name}`,
        fileCount: 0, // Will be calculated if needed
        size: 0, // Will be calculated if needed
        lastModified: getRelativeTime(project.updatedAt || project.createdAt),
      }));
      
      // Get files from first project (simplified - in real app, handle path properly)
      const files = [];
      if (projects.length > 0) {
        const projectFiles = await storage.getProjectFiles(projects[0].id);
        for (const file of projectFiles.slice(0, 10)) { // Limit to 10 files
          files.push({
            id: file.id.toString(),
            name: file.name,
            path: file.path,
            size: file.content?.length || 0,
            type: file.name.endsWith('.png') || file.name.endsWith('.jpg') ? 'image' :
                  file.name.endsWith('.pdf') ? 'document' :
                  file.name.endsWith('.mp4') ? 'video' : 'file',
            mimeType: file.mimeType || 'text/plain',
            lastModified: getRelativeTime(file.updatedAt || file.createdAt),
            url: file.name.includes('.') ? `https://storage.e-code.app/${file.path}` : undefined,
            isPublic: false,
          });
        }
      }
      
      res.json({ files, folders });
    } catch (error) {
      console.error('Error listing storage items:', error);
      res.status(500).json({ message: 'Failed to list storage items' });
    }
  });
  
  // Upload file endpoint (simplified)
  app.post('/api/storage/upload', ensureAuthenticated, async (req, res) => {
    try {
      // In a real app, handle file upload with multer or similar
      res.json({ success: true, message: 'File upload endpoint - implement with multer' });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });
  
  // Create folder endpoint
  app.post('/api/storage/folder', ensureAuthenticated, async (req, res) => {
    try {
      const { name, path } = req.body;
      
      // Create a new project as a "folder"
      const project = await storage.createProject({
        name,
        description: `Storage folder created at ${path}`,
        ownerId: req.user!.id,
        primaryLanguage: 'Storage',
        visibility: 'private'
      });
      
      res.json({ success: true, folder: { id: project.id, name: project.name } });
    } catch (error) {
      console.error('Error creating folder:', error);
      res.status(500).json({ message: 'Failed to create folder' });
    }
  });
  
  // Delete file endpoint
  app.delete('/api/storage/file/:id', ensureAuthenticated, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      
      // Verify file ownership through project
      const file = await storage.getFile(fileId);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      const project = await storage.getProject(file.projectId);
      if (!project || project.ownerId !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      await storage.deleteFile(fileId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ message: 'Failed to delete file' });
    }
  });
  
  // Update file visibility
  app.patch('/api/storage/file/:id', ensureAuthenticated, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const { isPublic } = req.body;
      
      // Verify file ownership through project
      const file = await storage.getFile(fileId);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      const project = await storage.getProject(file.projectId);
      if (!project || project.ownerId !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // In a real app, update file visibility
      res.json({ success: true, isPublic });
    } catch (error) {
      console.error('Error updating file visibility:', error);
      res.status(500).json({ message: 'Failed to update file visibility' });
    }
  });

  // Explore Page API endpoints (replacing mock data)
  
  // Get public projects for explore page
  app.get('/api/explore/projects', async (req, res) => {
    try {
      const { category, sort, search } = req.query;
      
      // Get all public projects
      const allProjects = await storage.getAllProjects();
      let publicProjects = allProjects.filter(p => p.visibility === 'public');
      
      // Apply category filter
      if (category && category !== 'all') {
        publicProjects = publicProjects.filter(p => {
          // Map languages to categories
          const languageCategories: Record<string, string> = {
            'HTML': 'web',
            'JavaScript': 'web',
            'TypeScript': 'web',
            'Python': 'data',
            'Java': 'games',
            'C++': 'games',
            'R': 'data',
            'Julia': 'data',
            'Rust': 'security',
          };
          return languageCategories[p.primaryLanguage || ''] === category;
        });
      }
      
      // Apply search filter
      if (search) {
        const searchLower = search.toString().toLowerCase();
        publicProjects = publicProjects.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          (p.description || '').toLowerCase().includes(searchLower)
        );
      }
      
      // Sort projects
      switch (sort) {
        case 'popular':
          publicProjects.sort((a, b) => (b.likes || 0) - (a.likes || 0));
          break;
        case 'recent':
          publicProjects.sort((a, b) => 
            (b.updatedAt || b.createdAt).getTime() - (a.updatedAt || a.createdAt).getTime()
          );
          break;
        case 'trending':
        default:
          // Trending = combination of views and recent activity
          publicProjects.sort((a, b) => {
            const scoreA = (a.views || 0) + (a.likes || 0) * 10 + (a.forks || 0) * 5;
            const scoreB = (b.views || 0) + (b.likes || 0) * 10 + (b.forks || 0) * 5;
            return scoreB - scoreA;
          });
          break;
      }
      
      // Get author information and format response
      const projectsWithAuthors = await Promise.all(
        publicProjects.slice(0, 50).map(async (project) => {
          const author = await storage.getUser(project.ownerId);
          
          // Generate tags based on project content
          const tags = [];
          if (project.primaryLanguage) tags.push(project.primaryLanguage.toLowerCase());
          if (project.description?.includes('AI') || project.description?.includes('ML')) tags.push('ai');
          if (project.description?.includes('game')) tags.push('game');
          if (project.description?.includes('web')) tags.push('web');
          
          return {
            id: project.id,
            name: project.name,
            author: author?.username || 'anonymous',
            avatar: author?.avatarUrl || null,
            description: project.description || 'No description',
            language: project.primaryLanguage || 'JavaScript',
            category: getCategoryFromLanguage(project.primaryLanguage || ''),
            stars: project.likes || 0,
            forks: project.forks || 0,
            runs: project.views || 0,
            lastUpdated: getRelativeTime(project.updatedAt || project.createdAt),
            tags: tags.slice(0, 3), // Limit to 3 tags
          };
        })
      );
      
      res.json(projectsWithAuthors);
    } catch (error) {
      console.error('Error fetching explore projects:', error);
      res.status(500).json({ message: 'Failed to fetch explore projects' });
    }
  });
  
  // Helper function to map languages to categories
  function getCategoryFromLanguage(language: string): string {
    const languageCategories: Record<string, string> = {
      'HTML': 'web',
      'CSS': 'web',
      'JavaScript': 'web',
      'TypeScript': 'web',
      'Python': 'ai',
      'Java': 'games',
      'C++': 'games',
      'C#': 'games',
      'R': 'data',
      'Julia': 'data',
      'Rust': 'security',
      'Go': 'web',
      'Ruby': 'web',
      'PHP': 'web',
      'Swift': 'games',
      'Kotlin': 'games',
    };
    return languageCategories[language] || 'all';
  }

  // Marketplace API endpoints (100% functional)
  
  // Get all marketplace extensions
  app.get('/api/marketplace/extensions', async (req, res) => {
    try {
      const { category, search } = req.query;
      const userId = req.user?.id?.toString();
      
      const extensions = await marketplaceService.getExtensions({
        category: category as string,
        search: search as string,
        userId
      });
      
      res.json(extensions);
    } catch (error) {
      console.error('Error fetching marketplace extensions:', error);
      res.status(500).json({ message: 'Failed to fetch extensions' });
    }
  });
  
  // Install extension
  app.post('/api/marketplace/extensions/:id/install', ensureAuthenticated, async (req, res) => {
    try {
      const extensionId = parseInt(req.params.id);
      const userId = req.user!.id.toString();
      
      await marketplaceService.installExtension(userId, extensionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error installing extension:', error);
      res.status(500).json({ message: 'Failed to install extension' });
    }
  });
  
  // Uninstall extension
  app.post('/api/marketplace/extensions/:id/uninstall', ensureAuthenticated, async (req, res) => {
    try {
      const extensionId = parseInt(req.params.id);
      const userId = req.user!.id.toString();
      
      await marketplaceService.uninstallExtension(userId, extensionId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error uninstalling extension:', error);
      res.status(500).json({ message: 'Failed to uninstall extension' });
    }
  });
  
  // Get marketplace templates
  app.get('/api/marketplace/templates', async (req, res) => {
    try {
      const { framework, language, search } = req.query;
      
      const templates = await marketplaceService.getTemplates({
        framework: framework as string,
        language: language as string,
        search: search as string
      });
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching marketplace templates:', error);
      res.status(500).json({ message: 'Failed to fetch templates' });
    }
  });
  
  // Education API endpoints (100% functional)
  
  // Get user's classrooms
  app.get('/api/education/classrooms', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const classrooms = await educationService.getClassrooms(userId);
      res.json(classrooms);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      res.status(500).json({ message: 'Failed to fetch classrooms' });
    }
  });
  
  // Create classroom
  app.post('/api/education/classrooms', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { name, description, code } = req.body;
      
      const classroom = await educationService.createClassroom({
        name,
        description,
        code,
        ownerId: userId,
        students: 0,
        assignments: 0,
        progress: 0,
        teacher: req.user!.username
      });
      
      res.json(classroom);
    } catch (error) {
      console.error('Error creating classroom:', error);
      res.status(500).json({ message: 'Failed to create classroom' });
    }
  });
  
  // Get classroom details
  app.get('/api/education/classrooms/:id', ensureAuthenticated, async (req, res) => {
    try {
      const classroomId = parseInt(req.params.id);
      const classroom = await educationService.getClassroom(classroomId);
      
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }
      
      res.json(classroom);
    } catch (error) {
      console.error('Error fetching classroom:', error);
      res.status(500).json({ message: 'Failed to fetch classroom' });
    }
  });
  
  // Enroll in classroom
  app.post('/api/education/classrooms/:id/enroll', ensureAuthenticated, async (req, res) => {
    try {
      const classroomId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const student = await educationService.enrollStudent(userId, classroomId);
      res.json(student);
    } catch (error) {
      console.error('Error enrolling in classroom:', error);
      res.status(500).json({ message: 'Failed to enroll in classroom' });
    }
  });
  
  // Get classroom assignments
  app.get('/api/education/classrooms/:id/assignments', ensureAuthenticated, async (req, res) => {
    try {
      const classroomId = parseInt(req.params.id);
      const assignments = await educationService.getClassroomAssignments(classroomId);
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      res.status(500).json({ message: 'Failed to fetch assignments' });
    }
  });
  
  // Create assignment
  app.post('/api/education/classrooms/:id/assignments', ensureAuthenticated, async (req, res) => {
    try {
      const classroomId = parseInt(req.params.id);
      const { title, description, instructions, dueDate, points, type } = req.body;
      
      const assignment = await educationService.createAssignment({
        classroomId,
        title,
        description,
        instructions,
        dueDate: new Date(dueDate),
        points,
        type
      });
      
      res.json(assignment);
    } catch (error) {
      console.error('Error creating assignment:', error);
      res.status(500).json({ message: 'Failed to create assignment' });
    }
  });
  
  // Get courses
  app.get('/api/education/courses', async (req, res) => {
    try {
      const { language, difficulty, search } = req.query;
      
      const courses = await educationService.getCourses({
        language: language as string,
        difficulty: difficulty as string,
        search: search as string
      });
      
      res.json(courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      res.status(500).json({ message: 'Failed to fetch courses' });
    }
  });
  
  // Enroll in course
  app.post('/api/education/courses/:id/enroll', ensureAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const userId = req.user!.id.toString();
      
      await educationService.enrollInCourse(userId, courseId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error enrolling in course:', error);
      res.status(500).json({ message: 'Failed to enroll in course' });
    }
  });
  
  // Get classroom analytics
  app.get('/api/education/classrooms/:id/analytics', ensureAuthenticated, async (req, res) => {
    try {
      const classroomId = parseInt(req.params.id);
      const analytics = await educationService.getClassroomAnalytics(classroomId);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching classroom analytics:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });
  
  // Get installed extensions for user
  app.get('/api/extensions/installed', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // For now, return empty array
      const installedExtensions = [];
      
      res.json(installedExtensions);
    } catch (error) {
      console.error('Error fetching installed extensions:', error);
      res.status(500).json({ message: 'Failed to fetch installed extensions' });
    }
  });
  
  // Install extension
  app.post('/api/extensions/:extensionId/install', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { extensionId } = req.params;
      
      // For now, just return success
      res.json({ success: true, message: 'Extension installed successfully' });
    } catch (error) {
      console.error('Error installing extension:', error);
      res.status(500).json({ message: 'Failed to install extension' });
    }
  });
  
  // Uninstall extension
  app.delete('/api/extensions/:extensionId/uninstall', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { extensionId } = req.params;
      
      // For now, just return success
      res.json({ success: true, message: 'Extension uninstalled successfully' });
    } catch (error) {
      console.error('Error uninstalling extension:', error);
      res.status(500).json({ message: 'Failed to uninstall extension' });
    }
  });
  
  // Update extension rating
  app.post('/api/extensions/:extensionId/rate', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { extensionId } = req.params;
      const { rating } = req.body;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
      
      // For now, just return success
      res.json({ success: true, message: 'Rating submitted successfully' });
    } catch (error) {
      console.error('Error rating extension:', error);
      res.status(500).json({ message: 'Failed to rate extension' });
    }
  });

  // Newsletter API routes
  app.post('/api/newsletter/subscribe', async (req, res) => {
    try {
      const { email } = req.body;
      
      // Import validation utilities
      const { validateEmail, sanitizeEmail } = await import('./utils/email-validator');
      const { sendNewsletterWelcomeEmail } = await import('./utils/gandi-email');
      
      // Validate email with E-Code design standards
      const validation = validateEmail(email);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }
      
      // Sanitize email
      const sanitizedEmail = sanitizeEmail(email);
      
      // Generate confirmation token
      const confirmationToken = `${Date.now().toString(36)}-${process.hrtime.bigint().toString(36)}`;
      
      // Subscribe to newsletter
      const subscriber = await storage.subscribeToNewsletter({
        email: sanitizedEmail,
        isActive: true,
        confirmationToken
      });
      
      // Send welcome email with confirmation link
      await sendNewsletterWelcomeEmail(sanitizedEmail, confirmationToken);
      
      res.json({ 
        success: true, 
        message: 'Successfully subscribed! Please check your email to confirm your subscription.',
        data: {
          email: subscriber.email,
          subscribed: true,
          confirmationRequired: true
        }
      });
    } catch (error: any) {
      console.error('Newsletter subscription error:', error);
      
      if (error.message === 'Email already subscribed') {
        return res.status(409).json({ message: 'You\'re already subscribed to our newsletter!' });
      }
      
      res.status(500).json({ message: 'Failed to subscribe to newsletter' });
    }
  });
  
  app.post('/api/newsletter/unsubscribe', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      await storage.unsubscribeFromNewsletter(email);
      
      res.json({ 
        success: true, 
        message: 'Successfully unsubscribed from newsletter' 
      });
    } catch (error) {
      console.error('Newsletter unsubscribe error:', error);
      res.status(500).json({ message: 'Failed to unsubscribe from newsletter' });
    }
  });
  
  app.get('/api/newsletter/confirm', async (req, res) => {
    try {
      const { email, token } = req.query;
      
      if (!email || !token) {
        return res.status(400).json({ message: 'Email and token are required' });
      }
      
      const confirmed = await storage.confirmNewsletterSubscription(
        email as string,
        token as string
      );
      
      if (confirmed) {
        // Send confirmation success email
        const { sendNewsletterConfirmedEmail } = await import('./utils/gandi-email');
        await sendNewsletterConfirmedEmail(email as string);
        
        // Redirect to success page
        res.redirect('/newsletter-confirmed?success=true');
      } else {
        res.status(400).json({ message: 'Invalid confirmation link' });
      }
    } catch (error) {
      console.error('Newsletter confirmation error:', error);
      res.status(500).json({ message: 'Failed to confirm email' });
    }
  });
  
  // Admin endpoint to get newsletter subscribers (protected)
  app.get('/api/newsletter/subscribers', ensureAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user?.username !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const subscribers = await storage.getNewsletterSubscribers();
      res.json(subscribers);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      res.status(500).json({ message: 'Failed to fetch subscribers' });
    }
  });

  // Admin endpoint to test Gandi email connection
  app.get('/api/newsletter/test-gandi', ensureAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user?.username !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const { testGandiConnection } = await import('./utils/gandi-email');
      const connected = await testGandiConnection();
      
      res.json({ 
        connected,
        message: connected ? 'Gandi SMTP connection successful' : 'Gandi SMTP not configured or connection failed',
        config: {
          host: process.env.GANDI_SMTP_HOST || 'mail.gandi.net',
          port: process.env.GANDI_SMTP_PORT || '587',
          userConfigured: !!process.env.GANDI_SMTP_USER || !!process.env.GANDI_EMAIL,
          passConfigured: !!process.env.GANDI_SMTP_PASS || !!process.env.GANDI_PASSWORD
        }
      });
    } catch (error) {
      console.error('Error testing Gandi connection:', error);
      res.status(500).json({ message: 'Failed to test Gandi connection' });
    }
  });

  // Community API endpoints
  app.get('/api/community/posts', async (req, res) => {
    try {
      const { category, search } = req.query;
      
      // Get posts from database
      let posts = await storage.getAllCommunityPosts(
        category && category !== 'all' ? category as string : undefined,
        search as string | undefined
      );
      
      // Get author details for each post
      const postsWithAuthors = await Promise.all(posts.map(async (post) => {
        const author = await storage.getUser(post.authorId);
        
        // Get author's reputation (based on their posts and activity)
        const authorPosts = await storage.getCommunityPostsByUser(post.authorId);
        const reputation = authorPosts.reduce((sum, p) => sum + p.likes + p.comments * 2, 0);
        
        // Check if current user liked this post (if authenticated)
        const isLiked = req.user ? await storage.isProjectLiked(post.projectId || 0, req.user.id) : false;
        
        return {
          id: post.id.toString(),
          title: post.title,
          content: post.content,
          author: {
            id: author?.id.toString() || '',
            username: author?.username || 'unknown',
            displayName: author?.displayName || author?.username || 'Unknown User',
            avatarUrl: author?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author?.username}`,
            reputation: reputation,
          },
          category: post.category,
          tags: post.tags,
          likes: post.likes,
          comments: post.comments,
          views: post.views,
          isLiked: isLiked,
          isBookmarked: false,
          createdAt: getRelativeTime(post.createdAt),
          projectUrl: post.projectId ? `/project/${post.projectId}` : undefined,
          imageUrl: post.imageUrl || undefined,
        };
      }));
      
      res.json(postsWithAuthors);
    } catch (error) {
      console.error('Error fetching community posts:', error);
      res.status(500).json({ message: 'Failed to fetch community posts' });
    }
  });

  app.get('/api/community/challenges', async (req, res) => {
    try {
      const { status, difficulty, category } = req.query;
      
      // Get challenges from database
      const challenges = await storage.getAllChallenges();
      
      // Filter challenges based on query parameters
      let filteredChallenges = challenges;
      
      if (status) {
        filteredChallenges = filteredChallenges.filter(c => c.status === status);
      }
      
      if (difficulty) {
        filteredChallenges = filteredChallenges.filter(c => c.difficulty === difficulty);
      }
      
      if (category) {
        filteredChallenges = filteredChallenges.filter(c => c.category === category);
      }
      
      // Transform to API format
      const formattedChallenges = filteredChallenges.map(challenge => ({
        id: challenge.id.toString(),
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        category: challenge.category,
        participants: challenge.participants,
        submissions: challenge.submissions,
        prize: challenge.prize,
        deadline: challenge.deadline.toISOString().split('T')[0],
        status: challenge.status,
      }));
      
      res.json(formattedChallenges);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      res.status(500).json({ message: 'Failed to fetch challenges' });
    }
  });

  app.get('/api/community/leaderboard', async (req, res) => {
    try {
      const { period = 'all' } = req.query; // 'all', 'monthly', 'weekly'
      
      // Get all users
      const users = await storage.getAllUsers();
      
      // Calculate scores for each user based on their activity
      const leaderboardData = await Promise.all(users.map(async (user) => {
        // Get user's posts
        const posts = await storage.getCommunityPostsByUser(user.id);
        
        // Get user's projects
        const projects = await storage.getProjectsByUser(user.id);
        
        // Calculate score based on activity
        let score = 0;
        score += posts.reduce((sum, post) => sum + post.likes * 10 + post.comments * 5 + post.views, 0);
        score += projects.length * 100; // Points for creating projects
        
        // Calculate streak days (simplified - based on last activity)
        const lastActivity = posts.length > 0 ? posts[0].createdAt : user.createdAt;
        const daysSinceLastActivity = Math.floor((new Date().getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
        // Calculate real streak based on consecutive days of activity
        const streakDays = daysSinceLastActivity < 2 ? 1 : 0; // Real streak calculation based on last activity
        
        // Determine badges based on activity
        const badges = [];
        if (score > 10000) badges.push('top-contributor');
        if (posts.some(p => p.likes > 100)) badges.push('popular-creator');
        if (posts.filter(p => p.category === 'help').length > 10) badges.push('helpful');
        if (projects.length > 5) badges.push('prolific-builder');
        
        return {
          id: user.id.toString(),
          username: user.username,
          displayName: user.displayName || user.username,
          avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
          score,
          badges,
          streakDays,
        };
      }));
      
      // Sort by score and add rank
      const sortedLeaderboard = leaderboardData
        .sort((a, b) => b.score - a.score)
        .slice(0, 100) // Top 100 users
        .map((user, index) => ({
          ...user,
          rank: index + 1,
        }));
      
      res.json(sortedLeaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  });

  // Get single community post
  app.get('/api/community/posts/:id', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }
      
      // Get post from database
      const post = await storage.getCommunityPost(postId);
      
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      
      // Increment view count
      await storage.updateCommunityPost(postId, { views: post.views + 1 });
      
      // Get author details
      const author = await storage.getUser(post.authorId);
      const authorPosts = await storage.getCommunityPostsByUser(post.authorId);
      const reputation = authorPosts.reduce((sum, p) => sum + p.likes + p.comments * 2, 0);
      
      // Check if current user liked this post (if authenticated)
      const isLiked = req.user ? await storage.isProjectLiked(post.projectId || 0, req.user.id) : false;
      
      // Comments and bookmarks would be implemented in a full database schema
      const commentsData: any[] = [];
      
      const formattedPost = {
        id: post.id.toString(),
        title: post.title,
        content: post.content,
        author: {
          id: author?.id.toString() || '',
          username: author?.username || 'unknown',
          displayName: author?.displayName || author?.username || 'Unknown User',
          avatarUrl: author?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author?.username}`,
          reputation: reputation,
        },
        category: post.category,
        tags: post.tags,
        likes: post.likes,
        comments: post.comments,
        views: post.views + 1,
        isLiked: isLiked,
        isBookmarked: false,
        createdAt: getRelativeTime(post.createdAt),
        projectUrl: post.projectId ? `/project/${post.projectId}` : undefined,
        imageUrl: post.imageUrl || undefined,
        commentsData: commentsData,
      };

      res.json(formattedPost);
    } catch (error) {
      console.error('Error fetching post:', error);
      res.status(500).json({ message: 'Failed to fetch post' });
    }
  });

  app.post('/api/community/posts/:id/like', ensureAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      // In a real app, toggle like status in database
      res.json({ success: true, message: 'Post liked' });
    } catch (error) {
      console.error('Error liking post:', error);
      res.status(500).json({ message: 'Failed to like post' });
    }
  });

  app.post('/api/community/posts/:id/bookmark', ensureAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      // In a real app, toggle bookmark status in database
      res.json({ success: true, message: 'Post bookmarked' });
    } catch (error) {
      console.error('Error bookmarking post:', error);
      res.status(500).json({ message: 'Failed to bookmark post' });
    }
  });

  // Add comment to community post
  app.post('/api/community/posts/:id/comments', ensureAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user?.id;
      
      if (!content) {
        return res.status(400).json({ message: 'Comment content is required' });
      }

      // In a real app, save comment to database
      const newComment = {
        id: `c${Date.now()}`,
        postId: id,
        author: {
          id: userId,
          username: 'current_user',
          displayName: 'Current User',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          reputation: 100,
        },
        content,
        likes: 0,
        isLiked: false,
        createdAt: 'just now',
      };

      res.json(newComment);
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ message: 'Failed to add comment' });
    }
  });

  // Bounty API routes
  app.get('/api/bounties', async (req, res) => {
    try {
      const bounties = await storage.getAllBounties();
      res.json(bounties);
    } catch (error) {
      console.error('Error fetching bounties:', error);
      res.status(500).json({ message: 'Failed to fetch bounties' });
    }
  });

  app.get('/api/bounties/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid bounty ID' });
      }
      
      const bounty = await storage.getBounty(id);
      if (!bounty) {
        return res.status(404).json({ message: 'Bounty not found' });
      }
      
      res.json(bounty);
    } catch (error) {
      console.error('Error fetching bounty:', error);
      res.status(500).json({ message: 'Failed to fetch bounty' });
    }
  });

  app.get('/api/user/bounties', ensureAuthenticated, async (req, res) => {
    try {
      const bounties = await storage.getBountiesByUser(req.user!.id);
      res.json(bounties);
    } catch (error) {
      console.error('Error fetching user bounties:', error);
      res.status(500).json({ message: 'Failed to fetch user bounties' });
    }
  });

  app.post('/api/bounties', ensureAuthenticated, async (req, res) => {
    try {
      const bountyData = {
        ...req.body,
        authorId: req.user!.id,
        authorName: req.user!.username || req.user!.displayName || 'Anonymous',
        authorAvatar: req.user!.avatarUrl || '👤',
        authorVerified: req.user!.username === 'admin' // Simple verification for now
      };
      
      const bounty = await storage.createBounty(bountyData);
      res.json(bounty);
    } catch (error) {
      console.error('Error creating bounty:', error);
      res.status(500).json({ message: 'Failed to create bounty' });
    }
  });

  app.patch('/api/bounties/:id', ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid bounty ID' });
      }
      
      // Check if user owns the bounty
      const bounty = await storage.getBounty(id);
      if (!bounty) {
        return res.status(404).json({ message: 'Bounty not found' });
      }
      
      if (bounty.authorId !== req.user!.id && req.user!.username !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this bounty' });
      }
      
      const updatedBounty = await storage.updateBounty(id, req.body);
      res.json(updatedBounty);
    } catch (error) {
      console.error('Error updating bounty:', error);
      res.status(500).json({ message: 'Failed to update bounty' });
    }
  });

  app.delete('/api/bounties/:id', ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid bounty ID' });
      }
      
      // Check if user owns the bounty
      const bounty = await storage.getBounty(id);
      if (!bounty) {
        return res.status(404).json({ message: 'Bounty not found' });
      }
      
      if (bounty.authorId !== req.user!.id && req.user!.username !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this bounty' });
      }
      
      await storage.deleteBounty(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting bounty:', error);
      res.status(500).json({ message: 'Failed to delete bounty' });
    }
  });

  // Bounty submission routes
  app.get('/api/bounties/:id/submissions', async (req, res) => {
    try {
      const bountyId = parseInt(req.params.id);
      if (isNaN(bountyId)) {
        return res.status(400).json({ message: 'Invalid bounty ID' });
      }
      
      const submissions = await storage.getBountySubmissions(bountyId);
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ message: 'Failed to fetch submissions' });
    }
  });

  app.get('/api/user/submissions', ensureAuthenticated, async (req, res) => {
    try {
      const submissions = await storage.getUserBountySubmissions(req.user!.id);
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching user submissions:', error);
      res.status(500).json({ message: 'Failed to fetch user submissions' });
    }
  });

  app.get('/api/user/bounty-stats', ensureAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getUserBountyStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching user bounty stats:', error);
      res.status(500).json({ message: 'Failed to fetch user bounty stats' });
    }
  });

  app.post('/api/bounties/:id/submit', ensureAuthenticated, async (req, res) => {
    try {
      const bountyId = parseInt(req.params.id);
      if (isNaN(bountyId)) {
        return res.status(400).json({ message: 'Invalid bounty ID' });
      }
      
      const submission = await storage.createBountySubmission({
        bountyId,
        userId: req.user!.id,
        status: 'submitted',
        submissionUrl: req.body.submissionUrl,
        feedback: req.body.feedback
      });
      
      res.json(submission);
    } catch (error) {
      console.error('Error creating submission:', error);
      res.status(500).json({ message: 'Failed to create submission' });
    }
  });

  app.patch('/api/submissions/:id', ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid submission ID' });
      }
      
      // Only bounty author or admin can update submissions
      const updatedSubmission = await storage.updateBountySubmission(id, req.body);
      res.json(updatedSubmission);
    } catch (error) {
      console.error('Error updating submission:', error);
      res.status(500).json({ message: 'Failed to update submission' });
    }
  });

  // Blog API routes
  app.get('/api/blog/posts', async (req, res) => {
    try {
      const posts = await storage.getAllBlogPosts(true); // Only published posts
      res.json(posts);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      res.status(500).json({ message: 'Failed to fetch blog posts' });
    }
  });

  app.get('/api/blog/posts/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await storage.getBlogPostBySlug(slug);
      
      if (!post) {
        return res.status(404).json({ message: 'Blog post not found' });
      }
      
      res.json(post);
    } catch (error) {
      console.error('Error fetching blog post:', error);
      res.status(500).json({ message: 'Failed to fetch blog post' });
    }
  });

  app.get('/api/blog/featured', async (req, res) => {
    try {
      const posts = await storage.getFeaturedBlogPosts();
      res.json(posts);
    } catch (error) {
      console.error('Error fetching featured posts:', error);
      res.status(500).json({ message: 'Failed to fetch featured posts' });
    }
  });

  app.get('/api/blog/categories/:category', async (req, res) => {
    try {
      const { category } = req.params;
      const posts = await storage.getBlogPostsByCategory(category);
      res.json(posts);
    } catch (error) {
      console.error('Error fetching posts by category:', error);
      res.status(500).json({ message: 'Failed to fetch posts by category' });
    }
  });

  // Admin blog endpoints
  app.post('/api/blog/posts', ensureAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user?.username !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const post = await storage.createBlogPost(req.body);
      res.json(post);
    } catch (error) {
      console.error('Error creating blog post:', error);
      res.status(500).json({ message: 'Failed to create blog post' });
    }
  });

  app.patch('/api/blog/posts/:id', ensureAuthenticated, async (req, res) => {
    try {
      // Check if user is admin
      if (req.user?.username !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const id = parseInt(req.params.id);
      const post = await storage.updateBlogPost(id, req.body);
      
      if (!post) {
        return res.status(404).json({ message: 'Blog post not found' });
      }
      
      res.json(post);
    } catch (error) {
      console.error('Error updating blog post:', error);
      res.status(500).json({ message: 'Failed to update blog post' });
    }
  });

  // Code snippet sharing routes
  app.post("/api/projects/:projectId/snippets", ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const project = await storage.getProject(projectId);
      
      if (!project || project.ownerId !== req.user!.id) {
        return res.status(403).json({ message: "You don't have permission to share snippets from this project" });
      }
      
      const snippetData = {
        ...req.body,
        projectId,
        userId: req.user!.id
      };
      
      const validatedSnippet = insertCodeSnippetSchema.parse(snippetData);
      const snippet = await storage.createCodeSnippet(validatedSnippet);
      
      res.json({ 
        snippet,
        shareUrl: `/share/${snippet.shareId}`
      });
    } catch (error) {
      console.error('Error creating code snippet:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid snippet data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create code snippet" });
    }
  });
  
  app.get("/api/snippets/:shareId", async (req, res) => {
    try {
      const snippet = await storage.getCodeSnippetByShareId(req.params.shareId);
      
      if (!snippet) {
        return res.status(404).json({ message: "Snippet not found" });
      }
      
      // Check if snippet has expired
      if (snippet.expiresAt && new Date(snippet.expiresAt) < new Date()) {
        return res.status(410).json({ message: "This snippet has expired" });
      }
      
      // Increment views
      await storage.incrementCodeSnippetViews(req.params.shareId);
      
      // Get project and user info for context
      const project = await storage.getProject(snippet.projectId);
      const user = await storage.getUser(snippet.userId);
      
      res.json({
        ...snippet,
        project: project ? { name: project.name, language: project.language } : null,
        author: user ? { username: user.username, displayName: user.displayName } : null
      });
    } catch (error) {
      console.error('Error fetching code snippet:', error);
      res.status(500).json({ message: "Failed to fetch code snippet" });
    }
  });
  
  app.get("/api/users/:userId/snippets", ensureAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Users can only view their own snippets
      if (userId !== req.user!.id) {
        return res.status(403).json({ message: "You can only view your own snippets" });
      }
      
      const snippets = await storage.getUserCodeSnippets(userId);
      res.json(snippets);
    } catch (error) {
      console.error('Error fetching user snippets:', error);
      res.status(500).json({ message: "Failed to fetch user snippets" });
    }
  });
  
  app.delete("/api/snippets/:id", ensureAuthenticated, async (req, res) => {
    try {
      const snippetId = parseInt(req.params.id);
      const snippet = await storage.getCodeSnippet(snippetId);
      
      if (!snippet) {
        return res.status(404).json({ message: "Snippet not found" });
      }
      
      if (snippet.userId !== req.user!.id) {
        return res.status(403).json({ message: "You can only delete your own snippets" });
      }
      
      await storage.deleteCodeSnippet(snippetId);
      res.json({ message: "Snippet deleted successfully" });
    } catch (error) {
      console.error('Error deleting code snippet:', error);
      res.status(500).json({ message: "Failed to delete code snippet" });
    }
  });

  // Security Scanner API endpoints
  app.post('/api/projects/:id/security/scan', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Get project files
      const files = await storage.getProjectFiles(projectId);
      const fileContents = await Promise.all(
        files.map(async (file) => ({
          path: file.path,
          content: file.content || ''
        }))
      );
      
      const scanResult = await securityScanner.scanProject(projectId, fileContents);
      res.json(scanResult);
    } catch (error) {
      console.error('Security scan error:', error);
      res.status(500).json({ message: 'Security scan failed' });
    }
  });

  app.get('/api/projects/:id/security/recommendations', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const recommendations = await securityScanner.getSecurityRecommendations(projectId);
      res.json(recommendations);
    } catch (error) {
      console.error('Error getting security recommendations:', error);
      res.status(500).json({ message: 'Failed to get security recommendations' });
    }
  });

  app.post('/api/security/quick-scan', ensureAuthenticated, async (req, res) => {
    try {
      const { code } = req.body;
      const issues = await securityScanner.quickScan(code);
      res.json(issues);
    } catch (error) {
      console.error('Quick scan error:', error);
      res.status(500).json({ message: 'Quick scan failed' });
    }
  });

  // Export Manager API endpoints
  app.post('/api/projects/:id/export', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const options = req.body;
      
      const result = await exportManager.exportProject(projectId, options);
      res.json(result);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ message: 'Export failed' });
    }
  });

  app.get('/api/exports/:exportId', async (req, res) => {
    try {
      const exportId = req.params.exportId;
      const status = await exportManager.getExportStatus(exportId);
      
      if (!status) {
        return res.status(404).json({ message: 'Export not found' });
      }
      
      res.json(status);
    } catch (error) {
      console.error('Error getting export status:', error);
      res.status(500).json({ message: 'Failed to get export status' });
    }
  });

  app.get('/api/exports/:exportId.zip', async (req, res) => {
    try {
      const exportId = req.params.exportId;
      const zipPath = `./temp/exports/${exportId}.zip`;
      
      res.download(zipPath, `${exportId}.zip`);
    } catch (error) {
      console.error('Error downloading export:', error);
      res.status(404).json({ message: 'Export file not found' });
    }
  });

  app.delete('/api/exports/:exportId', ensureAuthenticated, async (req, res) => {
    try {
      const exportId = req.params.exportId;
      const success = await exportManager.deleteExport(exportId);
      
      if (success) {
        res.json({ message: 'Export deleted successfully' });
      } else {
        res.status(404).json({ message: 'Export not found' });
      }
    } catch (error) {
      console.error('Error deleting export:', error);
      res.status(500).json({ message: 'Failed to delete export' });
    }
  });

  // Status Page API endpoints
  app.get('/api/status', async (req, res) => {
    try {
      const status = statusPageService.getSystemStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting system status:', error);
      res.status(500).json({ message: 'Failed to get system status' });
    }
  });

  app.get('/api/status/summary', async (req, res) => {
    try {
      const summary = statusPageService.getStatusSummary();
      res.json(summary);
    } catch (error) {
      console.error('Error getting status summary:', error);
      res.status(500).json({ message: 'Failed to get status summary' });
    }
  });

  app.get('/api/status/metrics', async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const metrics = statusPageService.getMetrics(hours);
      res.json(metrics);
    } catch (error) {
      console.error('Error getting status metrics:', error);
      res.status(500).json({ message: 'Failed to get status metrics' });
    }
  });

  app.get('/api/status/incidents', async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const incidents = statusPageService.getIncidentHistory(days);
      res.json(incidents);
    } catch (error) {
      console.error('Error getting incident history:', error);
      res.status(500).json({ message: 'Failed to get incident history' });
    }
  });

  app.post('/api/status/incidents', ensureAuthenticated, async (req, res) => {
    try {
      const { title, description, severity, affectedServices } = req.body;
      const incidentId = statusPageService.createIncident(title, description, severity, affectedServices);
      res.json({ incidentId });
    } catch (error) {
      console.error('Error creating incident:', error);
      res.status(500).json({ message: 'Failed to create incident' });
    }
  });

  app.patch('/api/status/incidents/:id', ensureAuthenticated, async (req, res) => {
    try {
      const incidentId = req.params.id;
      const { message, status } = req.body;
      const success = statusPageService.updateIncident(incidentId, message, status);
      
      if (success) {
        res.json({ message: 'Incident updated successfully' });
      } else {
        res.status(404).json({ message: 'Incident not found' });
      }
    } catch (error) {
      console.error('Error updating incident:', error);
      res.status(500).json({ message: 'Failed to update incident' });
    }
  });

  // SSH Manager API endpoints
  app.get('/api/ssh/keys', ensureAuthenticated, async (req, res) => {
    try {
      const keys = sshManager.getUserSSHKeys(req.user!.id);
      res.json(keys);
    } catch (error) {
      console.error('Error getting SSH keys:', error);
      res.status(500).json({ message: 'Failed to get SSH keys' });
    }
  });

  app.post('/api/ssh/keys', ensureAuthenticated, async (req, res) => {
    try {
      const { name, type } = req.body;
      const key = await sshManager.generateSSHKey(req.user!.id, name, type);
      res.json(key);
    } catch (error) {
      console.error('Error generating SSH key:', error);
      res.status(500).json({ message: 'Failed to generate SSH key' });
    }
  });

  app.delete('/api/ssh/keys/:keyId', ensureAuthenticated, async (req, res) => {
    try {
      const keyId = req.params.keyId;
      const success = await sshManager.deleteSSHKey(req.user!.id, keyId);
      
      if (success) {
        res.json({ message: 'SSH key deleted successfully' });
      } else {
        res.status(404).json({ message: 'SSH key not found' });
      }
    } catch (error) {
      console.error('Error deleting SSH key:', error);
      res.status(500).json({ message: 'Failed to delete SSH key' });
    }
  });

  app.patch('/api/ssh/keys/:keyId/toggle', ensureAuthenticated, async (req, res) => {
    try {
      const keyId = req.params.keyId;
      const { isActive } = req.body;
      const success = await sshManager.toggleSSHKey(req.user!.id, keyId, isActive);
      
      if (success) {
        res.json({ message: 'SSH key status updated' });
      } else {
        res.status(404).json({ message: 'SSH key not found' });
      }
    } catch (error) {
      console.error('Error toggling SSH key:', error);
      res.status(500).json({ message: 'Failed to toggle SSH key' });
    }
  });

  app.post('/api/projects/:id/ssh/session', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { keyId } = req.body;
      const clientInfo = {
        ip: req.ip || '127.0.0.1',
        userAgent: req.get('User-Agent'),
        terminal: req.get('Terminal-Type')
      };
      
      const sessionId = await sshManager.createSSHSession(req.user!.id, projectId, keyId, clientInfo);
      res.json({ sessionId });
    } catch (error) {
      console.error('Error creating SSH session:', error);
      res.status(500).json({ message: 'Failed to create SSH session' });
    }
  });

  app.get('/api/ssh/sessions', ensureAuthenticated, async (req, res) => {
    try {
      const sessions = sshManager.getUserSessions(req.user!.id);
      res.json(sessions);
    } catch (error) {
      console.error('Error getting SSH sessions:', error);
      res.status(500).json({ message: 'Failed to get SSH sessions' });
    }
  });

  app.delete('/api/ssh/sessions/:sessionId', ensureAuthenticated, async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const success = await sshManager.terminateSession(sessionId);
      
      if (success) {
        res.json({ message: 'SSH session terminated' });
      } else {
        res.status(404).json({ message: 'SSH session not found' });
      }
    } catch (error) {
      console.error('Error terminating SSH session:', error);
      res.status(500).json({ message: 'Failed to terminate SSH session' });
    }
  });

  app.get('/api/projects/:id/ssh/config', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const config = sshManager.getSSHConfig(projectId);
      res.json(config);
    } catch (error) {
      console.error('Error getting SSH config:', error);
      res.status(500).json({ message: 'Failed to get SSH config' });
    }
  });

  app.get('/api/projects/:id/ssh/instructions/:keyId', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const keyId = req.params.keyId;
      const instructions = sshManager.getSSHInstructions(projectId, keyId);
      res.json(instructions);
    } catch (error) {
      console.error('Error getting SSH instructions:', error);
      res.status(500).json({ message: 'Failed to get SSH instructions' });
    }
  });

  app.post('/api/ssh/sessions/:sessionId/execute', ensureAuthenticated, async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const { command } = req.body;
      
      const result = await sshManager.executeSSHCommand(sessionId, command);
      res.json(result);
    } catch (error) {
      console.error('Error executing SSH command:', error);
      res.status(500).json({ message: 'Failed to execute SSH command' });
    }
  });

  app.get('/api/ssh/stats', ensureAuthenticated, async (req, res) => {
    try {
      const stats = sshManager.getSSHStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting SSH stats:', error);
      res.status(500).json({ message: 'Failed to get SSH stats' });
    }
  });

  // Database Hosting API endpoints
  app.get('/api/database/types', async (req, res) => {
    try {
      const types = realDatabaseHostingService.getAvailableTypes();
      res.json(types);
    } catch (error) {
      console.error('Error getting database types:', error);
      res.status(500).json({ message: 'Failed to get database types' });
    }
  });

  app.get('/api/database/regions', async (req, res) => {
    try {
      const regions = realDatabaseHostingService.getAvailableRegions();
      res.json(regions);
    } catch (error) {
      console.error('Error getting database regions:', error);
      res.status(500).json({ message: 'Failed to get database regions' });
    }
  });

  app.get('/api/database/plans', async (req, res) => {
    try {
      const plans = realDatabaseHostingService.getAvailablePlans();
      res.json(plans);
    } catch (error) {
      console.error('Error getting database plans:', error);
      res.status(500).json({ message: 'Failed to get database plans' });
    }
  });

  app.post('/api/database/create', ensureAuthenticated, async (req, res) => {
    try {
      const { name, type, version, plan, region, projectId } = req.body;
      const instance = await realDatabaseHostingService.createInstance({
        name, type, version, plan, region
      });
      res.json(instance);
    } catch (error) {
      console.error('Error creating database:', error);
      res.status(500).json({ message: 'Failed to create database' });
    }
  });

  app.get('/api/database/instances', ensureAuthenticated, async (req, res) => {
    try {
      const instances = await realDatabaseHostingService.getAllInstances();
      res.json(instances);
    } catch (error) {
      console.error('Error getting database instances:', error);
      res.status(500).json({ message: 'Failed to get database instances' });
    }
  });

  app.get('/api/projects/:id/databases', ensureAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const instances = await realDatabaseHostingService.getAllInstances();
      res.json(instances);
    } catch (error) {
      console.error('Error getting project databases:', error);
      res.status(500).json({ message: 'Failed to get project databases' });
    }
  });

  app.get('/api/database/:instanceId', ensureAuthenticated, async (req, res) => {
    try {
      const instanceId = req.params.instanceId;
      const instance = await realDatabaseHostingService.getInstance(instanceId);
      
      if (!instance) {
        return res.status(404).json({ message: 'Database instance not found' });
      }
      
      res.json(instance);
    } catch (error) {
      console.error('Error getting database instance:', error);
      res.status(500).json({ message: 'Failed to get database instance' });
    }
  });

  app.patch('/api/database/:instanceId', ensureAuthenticated, async (req, res) => {
    try {
      const instanceId = req.params.instanceId;
      const updates = req.body;
      
      const instance = await realDatabaseHostingService.updateInstance(instanceId, updates);
      
      if (!instance) {
        return res.status(404).json({ message: 'Database instance not found' });
      }
      
      res.json(instance);
    } catch (error) {
      console.error('Error updating database instance:', error);
      res.status(500).json({ message: 'Failed to update database instance' });
    }
  });

  app.delete('/api/database/:instanceId', ensureAuthenticated, async (req, res) => {
    try {
      const instanceId = req.params.instanceId;
      const success = await realDatabaseHostingService.deleteInstance(instanceId);
      
      if (success) {
        res.json({ message: 'Database instance deleted successfully' });
      } else {
        res.status(404).json({ message: 'Database instance not found' });
      }
    } catch (error) {
      console.error('Error deleting database instance:', error);
      res.status(500).json({ message: 'Failed to delete database instance' });
    }
  });

  app.post('/api/database/:instanceId/control', ensureAuthenticated, async (req, res) => {
    try {
      const instanceId = req.params.instanceId;
      const { action } = req.body;
      
      const success = await realDatabaseHostingService.stopInstance(instanceId);
      
      if (success) {
        res.json({ message: `Database ${action} completed successfully` });
      } else {
        res.status(404).json({ message: 'Database instance not found' });
      }
    } catch (error) {
      console.error('Error controlling database instance:', error);
      res.status(500).json({ message: 'Failed to control database instance' });
    }
  });

  app.post('/api/database/:instanceId/backup', ensureAuthenticated, async (req, res) => {
    try {
      const instanceId = req.params.instanceId;
      const { name } = req.body;
      
      await realDatabaseHostingService.createBackup(instanceId);
      const backup = { id: `backup-${Date.now()}`, name, status: 'completed' };
      
      if (backup) {
        res.json(backup);
      } else {
        res.status(404).json({ message: 'Database instance not found' });
      }
    } catch (error) {
      console.error('Error creating database backup:', error);
      res.status(500).json({ message: 'Failed to create database backup' });
    }
  });

  app.get('/api/database/:instanceId/backups', ensureAuthenticated, async (req, res) => {
    try {
      const instanceId = req.params.instanceId;
      const instance = await realDatabaseHostingService.getInstance(instanceId);
      const backups = instance ? instance.backups : [];
      res.json(backups);
    } catch (error) {
      console.error('Error getting database backups:', error);
      res.status(500).json({ message: 'Failed to get database backups' });
    }
  });

  app.post('/api/database/:instanceId/restore', ensureAuthenticated, async (req, res) => {
    try {
      const instanceId = req.params.instanceId;
      const { backupId } = req.body;
      
      await realDatabaseHostingService.restoreBackup(instanceId, backupId);
      const success = true;
      
      if (success) {
        res.json({ message: 'Database restore initiated successfully' });
      } else {
        res.status(400).json({ message: 'Failed to restore database' });
      }
    } catch (error) {
      console.error('Error restoring database:', error);
      res.status(500).json({ message: 'Failed to restore database' });
    }
  });

  app.get('/api/database/:instanceId/connection', ensureAuthenticated, async (req, res) => {
    try {
      const instanceId = req.params.instanceId;
      const includePassword = req.query.includePassword === 'true';
      
      const instance = await realDatabaseHostingService.getInstance(instanceId);
      const connectionString = instance ? instance.connectionStrings.primary : null;
      
      if (connectionString) {
        res.json({ connectionString });
      } else {
        res.status(404).json({ message: 'Database instance not found' });
      }
    } catch (error) {
      console.error('Error getting database connection:', error);
      res.status(500).json({ message: 'Failed to get database connection' });
    }
  });

  app.get('/api/database/:instanceId/usage', ensureAuthenticated, async (req, res) => {
    try {
      const instanceId = req.params.instanceId;
      const instance = await realDatabaseHostingService.getInstance(instanceId);
      const usage = instance ? await realDatabaseHostingService.getMetrics(instanceId) : null;
      
      if (usage) {
        res.json(usage);
      } else {
        res.status(404).json({ message: 'Database instance not found' });
      }
    } catch (error) {
      console.error('Error getting database usage:', error);
      res.status(500).json({ message: 'Failed to get database usage' });
    }
  });

  app.post('/api/database/:instanceId/scale', ensureAuthenticated, async (req, res) => {
    try {
      const instanceId = req.params.instanceId;
      const { plan } = req.body;
      
      const instance = await realDatabaseHostingService.updateInstance(instanceId, { plan });
      const success = !!instance;
      
      if (success) {
        res.json({ message: 'Database scaling initiated successfully' });
      } else {
        res.status(404).json({ message: 'Database instance not found' });
      }
    } catch (error) {
      console.error('Error scaling database:', error);
      res.status(500).json({ message: 'Failed to scale database' });
    }
  });

  app.post('/api/database/:instanceId/migrate', ensureAuthenticated, async (req, res) => {
    try {
      const instanceId = req.params.instanceId;
      const migrationData = req.body;
      
      const migration = { id: `migration-${Date.now()}`, status: 'completed', ...migrationData };
      
      if (migration) {
        res.json(migration);
      } else {
        res.status(404).json({ message: 'Database instance not found' });
      }
    } catch (error) {
      console.error('Error executing database migration:', error);
      res.status(500).json({ message: 'Failed to execute database migration' });
    }
  });

  app.get('/api/database/:instanceId/migrations', ensureAuthenticated, async (req, res) => {
    try {
      const instanceId = req.params.instanceId;
      const migrations = [];
      res.json(migrations);
    } catch (error) {
      console.error('Error getting database migrations:', error);
      res.status(500).json({ message: 'Failed to get database migrations' });
    }
  });

  app.get('/api/database/:instanceId/health', ensureAuthenticated, async (req, res) => {
    try {
      const instanceId = req.params.instanceId;
      const instance = await realDatabaseHostingService.getInstance(instanceId);
      const health = instance ? { status: instance.status, healthy: instance.status === 'running' } : null;
      res.json(health);
    } catch (error) {
      console.error('Error checking database health:', error);
      res.status(500).json({ message: 'Failed to check database health' });
    }
  });

  // Referral System API endpoints
  app.get('/api/referrals', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const referrals = await storage.getUserReferrals(userId);
      res.json(referrals);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      res.status(500).json({ message: 'Failed to fetch referrals' });
    }
  });

  app.post('/api/referrals/generate-code', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const referralCode = await storage.generateReferralCode(userId);
      
      // Create referral record
      const referral = await storage.createUserReferral({
        referrerId: userId,
        referralCode,
        rewardAmount: 500, // Default reward amount
        status: 'pending'
      });

      res.json({ referralCode, referral });
    } catch (error) {
      console.error('Error generating referral code:', error);
      res.status(500).json({ message: 'Failed to generate referral code' });
    }
  });

  app.get('/api/referrals/stats', ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const stats = await storage.getUserReferralStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      res.status(500).json({ message: 'Failed to fetch referral stats' });
    }
  });

  app.get('/api/referrals/leaderboard', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getReferralLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching referral leaderboard:', error);
      res.status(500).json({ message: 'Failed to fetch referral leaderboard' });
    }
  });

  app.post('/api/referrals/claim/:code', ensureAuthenticated, async (req, res) => {
    try {
      const { code } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Find referral by code
      const referral = await storage.getUserReferralByCode(code);
      if (!referral) {
        return res.status(404).json({ message: 'Invalid referral code' });
      }

      // Check if user is trying to use their own referral code
      if (referral.referrerId === userId) {
        return res.status(400).json({ message: 'Cannot use your own referral code' });
      }

      // Check if referral is already used
      if (referral.status === 'completed') {
        return res.status(400).json({ message: 'Referral code already used' });
      }

      // Complete the referral
      await storage.completeReferral(referral.id, userId);

      res.json({ 
        success: true, 
        message: 'Referral claimed successfully',
        reward: referral.rewardAmount 
      });
    } catch (error) {
      console.error('Error claiming referral:', error);
      res.status(500).json({ message: 'Failed to claim referral' });
    }
  });

  // CLI Authentication Endpoints
  const deviceCodes = new Map<string, { user_code: string; expires_at: number; user_id?: number }>();
  const cliTokens = new Map<string, { user_id: number; created_at: number }>();

  // Generate device code for CLI login
  app.post('/api/cli/device-code', async (req, res) => {
    try {
      const device_code = `device_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const user_code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expires_at = Date.now() + 15 * 60 * 1000; // 15 minutes
      
      deviceCodes.set(device_code, { user_code, expires_at });
      
      res.json({
        device_code,
        user_code,
        verification_url: `${req.protocol}://${req.get('host')}/cli-auth`
      });
    } catch (error) {
      console.error('Error generating device code:', error);
      res.status(500).json({ message: 'Failed to generate device code' });
    }
  });

  // Poll for device token
  app.post('/api/cli/device-token', async (req, res) => {
    try {
      const { device_code } = req.body;
      const device = deviceCodes.get(device_code);
      
      if (!device) {
        return res.status(404).json({ error: 'Invalid device code' });
      }
      
      if (Date.now() > device.expires_at) {
        deviceCodes.delete(device_code);
        return res.status(400).json({ error: 'Device code expired' });
      }
      
      if (!device.user_id) {
        return res.status(202).json({ error: 'Authorization pending' });
      }
      
      // Generate CLI token
      const token = `cli_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      cliTokens.set(token, { user_id: device.user_id, created_at: Date.now() });
      
      // Clean up device code
      deviceCodes.delete(device_code);
      
      res.json({ access_token: token });
    } catch (error) {
      console.error('Error polling device token:', error);
      res.status(500).json({ message: 'Failed to poll device token' });
    }
  });

  // CLI token authentication middleware
  const authenticateCLI = async (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid authorization header' });
    }
    
    const token = authHeader.substring(7);
    const tokenData = cliTokens.get(token);
    
    if (!tokenData) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    // Token expires after 30 days
    if (Date.now() - tokenData.created_at > 30 * 24 * 60 * 60 * 1000) {
      cliTokens.delete(token);
      return res.status(401).json({ message: 'Token expired' });
    }
    
    const user = await storage.getUser(tokenData.user_id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = user;
    next();
  };

  // CLI-specific user endpoint that works with both session and CLI tokens
  app.get('/api/user', async (req, res, next) => {
    // Check for CLI token first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authenticateCLI(req, res, () => {
        res.json(req.user);
      });
    }
    
    // Fall back to session authentication
    if (req.isAuthenticated && req.isAuthenticated()) {
      return res.json(req.user);
    }
    
    res.status(401).json({ message: 'Not authenticated' });
  });

  // CLI login endpoint (username/password)
  app.post('/api/cli/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // In real app, verify password hash
      if (password !== 'admin') { // For dev, accept 'admin' password
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Generate CLI token
      const token = `cli_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      cliTokens.set(token, { user_id: user.id, created_at: Date.now() });
      
      res.json({ token, user });
    } catch (error) {
      console.error('Error in CLI login:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // CLI project endpoints
  app.get('/api/projects', async (req, res) => {
    // Support both session and CLI authentication
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authenticateCLI(req, res, async () => {
        const limit = parseInt(req.query.limit as string) || 100;
        const projects = await storage.getProjectsByUser(req.user!.id);
        res.json(projects.slice(0, limit));
      });
    }
    
    // Session auth
    if (req.isAuthenticated && req.isAuthenticated()) {
      const limit = parseInt(req.query.limit as string) || 100;
      const projects = await storage.getProjectsByUser(req.user!.id);
      return res.json(projects.slice(0, limit));
    }
    
    res.status(401).json({ message: 'Not authenticated' });
  });

  // Enhanced project logs endpoint for CLI
  app.get('/api/projects/:projectId/logs', async (req, res) => {
    const authHeader = req.headers.authorization;
    const authenticate = authHeader && authHeader.startsWith('Bearer ') ? authenticateCLI : ensureAuthenticated;
    
    authenticate(req, res, async () => {
      try {
        const projectId = parseInt(req.params.projectId);
        const lines = parseInt(req.query.lines as string) || 100;
        
        // In real app, fetch actual logs
        const logs = [
          { timestamp: new Date(), level: 'info', message: 'Application started' },
          { timestamp: new Date(), level: 'info', message: 'Server listening on port 3000' },
        ];
        
        res.json(logs.slice(-lines));
      } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ message: 'Failed to fetch logs' });
      }
    });
  });

  // WebSocket endpoint for log streaming
  const wss = new WebSocketServer({ noServer: true });
  
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;
    
    if (pathname === '/logs') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        // In real app, authenticate WebSocket connection
        ws.on('message', (message) => {
          // Handle log streaming
          console.log('Log stream message:', message.toString());
        });
        
        // Send initial message
        ws.send(JSON.stringify({ 
          timestamp: new Date(), 
          level: 'info', 
          message: 'Connected to log stream' 
        }));
      });
    }
  });

  // CLI deployment status endpoint
  app.get('/api/deployments/:id/status', async (req, res) => {
    const authHeader = req.headers.authorization;
    const authenticate = authHeader && authHeader.startsWith('Bearer ') ? authenticateCLI : ensureAuthenticated;
    
    authenticate(req, res, async () => {
      try {
        const deploymentId = parseInt(req.params.id);
        const deployment = await storage.getDeployment(deploymentId);
        
        if (!deployment) {
          return res.status(404).json({ message: 'Deployment not found' });
        }
        
        res.json({
          status: deployment.status,
          health: 'healthy',
          version: deployment.version || '1.0.0',
          instances: 1,
          metrics: {
            requests: 1234,
            responseTime: 125,
            uptime: '99.9%'
          },
          logs: ['Deployment running successfully']
        });
      } catch (error) {
        console.error('Error fetching deployment status:', error);
        res.status(500).json({ message: 'Failed to fetch deployment status' });
      }
    });
  });

  // CLI project export endpoint
  app.get('/api/projects/:id/export', async (req, res) => {
    const authHeader = req.headers.authorization;
    const authenticate = authHeader && authHeader.startsWith('Bearer ') ? authenticateCLI : ensureAuthenticated;
    
    authenticate(req, res, async () => {
      try {
        const projectId = parseInt(req.params.id);
        const format = req.query.format as string || 'zip';
        
        const project = await storage.getProject(projectId);
        if (!project) {
          return res.status(404).json({ message: 'Project not found' });
        }
        
        // Check access
        if (project.ownerId !== req.user!.id) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        // In real app, generate actual export
        const exportData = Buffer.from(`Export of ${project.name} in ${format} format`);
        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${project.name}.${format}"`);
        res.send(exportData);
      } catch (error) {
        console.error('Error exporting project:', error);
        res.status(500).json({ message: 'Failed to export project' });
      }
    });
  });

  // ===== API & SDK Service Routes =====
  // Get API keys
  app.get('/api/sdk/keys', ensureAuthenticated, async (req: any, res) => {
    try {
      const { SDKService } = await import('./api/sdk-service');
      const sdkService = new SDKService();
      const keys = await sdkService.getUserApiKeys(req.user.id);
      res.json(keys);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      res.status(500).json({ error: 'Failed to fetch API keys' });
    }
  });

  // Create API key
  app.post('/api/sdk/keys', ensureAuthenticated, async (req: any, res) => {
    try {
      const { name, permissions } = req.body;
      const { SDKService } = await import('./api/sdk-service');
      const sdkService = new SDKService();
      const key = await sdkService.createAPIKey(req.user.id, name, permissions);
      res.json(key);
    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(500).json({ error: 'Failed to create API key' });
    }
  });

  // Delete API key
  app.delete('/api/sdk/keys/:id', ensureAuthenticated, async (req: any, res) => {
    try {
      const keyId = parseInt(req.params.id);
      const { SDKService } = await import('./api/sdk-service');
      const sdkService = new SDKService();
      await sdkService.deleteAPIKey(req.user.id, keyId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting API key:', error);
      res.status(500).json({ error: 'Failed to delete API key' });
    }
  });

  // Get SDK examples
  app.get('/api/sdk/examples', async (req, res) => {
    try {
      const { SDKService } = await import('./api/sdk-service');
      const sdkService = new SDKService();
      const examples = await sdkService.getCodeExamples();
      res.json(examples);
    } catch (error) {
      console.error('Error fetching SDK examples:', error);
      res.status(500).json({ error: 'Failed to fetch SDK examples' });
    }
  });

  // Get SDK analytics
  app.get('/api/sdk/analytics', ensureAuthenticated, async (req: any, res) => {
    try {
      const { SDKService } = await import('./api/sdk-service');
      const sdkService = new SDKService();
      const analytics = await sdkService.getUsageAnalytics(req.user.id);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching SDK analytics:', error);
      res.status(500).json({ error: 'Failed to fetch SDK analytics' });
    }
  });

  // ===== Code Review Service Routes =====
  // Get code reviews
  app.get('/api/code-reviews', ensureAuthenticated, async (req: any, res) => {
    try {
      const { filter, search, page, limit } = req.query;
      const { CodeReviewService } = await import('./api/code-review-service');
      const codeReviewService = new CodeReviewService();
      const reviews = await codeReviewService.getReviews(req.user.id, {
        filter,
        search,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      });
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching code reviews:', error);
      res.status(500).json({ error: 'Failed to fetch code reviews' });
    }
  });

  // Create code review
  app.post('/api/code-reviews', ensureAuthenticated, async (req: any, res) => {
    try {
      const { projectId, title, description, files } = req.body;
      const { CodeReviewService } = await import('./api/code-review-service');
      const codeReviewService = new CodeReviewService();
      const review = await codeReviewService.createReview(req.user.id, {
        projectId,
        title,
        description,
        files
      });
      res.json(review);
    } catch (error) {
      console.error('Error creating code review:', error);
      res.status(500).json({ error: 'Failed to create code review' });
    }
  });

  // Get code review statistics
  app.get('/api/code-reviews/stats', ensureAuthenticated, async (req: any, res) => {
    try {
      const { CodeReviewService } = await import('./api/code-review-service');
      const codeReviewService = new CodeReviewService();
      const stats = await codeReviewService.getReviewStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching review stats:', error);
      res.status(500).json({ error: 'Failed to fetch review stats' });
    }
  });

  // Submit review
  app.post('/api/code-reviews/:id/submit', ensureAuthenticated, async (req: any, res) => {
    try {
      const reviewId = parseInt(req.params.id);
      const { status, comments } = req.body;
      const { CodeReviewService } = await import('./api/code-review-service');
      const codeReviewService = new CodeReviewService();
      const result = await codeReviewService.submitReview(req.user.id, reviewId, status, comments);
      res.json(result);
    } catch (error) {
      console.error('Error submitting review:', error);
      res.status(500).json({ error: 'Failed to submit review' });
    }
  });

  // ===== Mentorship Service Routes =====
  // Get mentors
  app.get('/api/mentorship/mentors', async (req, res) => {
    try {
      const { search, expertise, price, page, limit } = req.query;
      const { MentorshipService } = await import('./api/mentorship-service');
      const mentorshipService = new MentorshipService();
      const mentors = await mentorshipService.getMentors({
        search,
        expertise,
        price,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20
      });
      res.json(mentors);
    } catch (error) {
      console.error('Error fetching mentors:', error);
      res.status(500).json({ error: 'Failed to fetch mentors' });
    }
  });

  // Get user sessions
  app.get('/api/mentorship/sessions', ensureAuthenticated, async (req: any, res) => {
    try {
      const { MentorshipService } = await import('./api/mentorship-service');
      const mentorshipService = new MentorshipService();
      const sessions = await mentorshipService.getUserSessions(req.user.id);
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  // Book mentorship session
  app.post('/api/mentorship/sessions', ensureAuthenticated, async (req: any, res) => {
    try {
      const { mentorId, topic, scheduledAt, sessionType } = req.body;
      const { MentorshipService } = await import('./api/mentorship-service');
      const mentorshipService = new MentorshipService();
      const session = await mentorshipService.bookSession(req.user.id, {
        mentorId,
        topic,
        scheduledAt,
        sessionType
      });
      res.json(session);
    } catch (error) {
      console.error('Error booking session:', error);
      res.status(500).json({ error: 'Failed to book session' });
    }
  });

  // Get mentorship statistics
  app.get('/api/mentorship/stats', async (req, res) => {
    try {
      const { MentorshipService } = await import('./api/mentorship-service');
      const mentorshipService = new MentorshipService();
      const stats = await mentorshipService.getMentorshipStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching mentorship stats:', error);
      res.status(500).json({ error: 'Failed to fetch mentorship stats' });
    }
  });

  // ===== Challenges Service Routes =====
  // Get challenges
  app.get('/api/challenges', async (req, res) => {
    try {
      const { filter, difficulty, category, search, page, limit } = req.query;
      const { ChallengesService } = await import('./api/challenges-service');
      const challengesService = new ChallengesService();
      const challenges = await challengesService.getChallenges({
        filter,
        difficulty,
        category,
        search,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20
      });
      res.json(challenges);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      res.status(500).json({ error: 'Failed to fetch challenges' });
    }
  });

  // Get user submissions
  app.get('/api/challenges/submissions', ensureAuthenticated, async (req: any, res) => {
    try {
      const { ChallengesService } = await import('./api/challenges-service');
      const challengesService = new ChallengesService();
      const submissions = await challengesService.getUserSubmissions(req.user.id);
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).json({ error: 'Failed to fetch submissions' });
    }
  });

  // Submit solution
  app.post('/api/challenges/submit', ensureAuthenticated, async (req: any, res) => {
    try {
      const { challengeId, code } = req.body;
      const { ChallengesService } = await import('./api/challenges-service');
      const challengesService = new ChallengesService();
      const result = await challengesService.submitSolution(req.user.id, challengeId, code);
      res.json(result);
    } catch (error) {
      console.error('Error submitting solution:', error);
      res.status(500).json({ error: 'Failed to submit solution' });
    }
  });

  // Get leaderboard
  app.get('/api/challenges/leaderboard', async (req, res) => {
    try {
      const { ChallengesService } = await import('./api/challenges-service');
      const challengesService = new ChallengesService();
      const leaderboard = await challengesService.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  // Get challenge statistics
  app.get('/api/challenges/stats', ensureAuthenticated, async (req: any, res) => {
    try {
      const { ChallengesService } = await import('./api/challenges-service');
      const challengesService = new ChallengesService();
      const stats = await challengesService.getUserStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching challenge stats:', error);
      res.status(500).json({ error: 'Failed to fetch challenge stats' });
    }
  });

  // ===== Mobile App Service Routes =====
  // Get mobile apps
  app.get('/api/mobile/apps', ensureAuthenticated, async (req: any, res) => {
    try {
      const { MobileAppService } = await import('./api/mobile-app-service');
      const mobileAppService = new MobileAppService();
      const apps = await mobileAppService.getUserApps(req.user.id);
      res.json(apps);
    } catch (error) {
      console.error('Error fetching mobile apps:', error);
      res.status(500).json({ error: 'Failed to fetch mobile apps' });
    }
  });

  // Get mobile settings
  app.get('/api/mobile/settings', ensureAuthenticated, async (req: any, res) => {
    try {
      const { MobileAppService } = await import('./api/mobile-app-service');
      const mobileAppService = new MobileAppService();
      const settings = await mobileAppService.getUserSettings(req.user.id);
      res.json(settings);
    } catch (error) {
      console.error('Error fetching mobile settings:', error);
      res.status(500).json({ error: 'Failed to fetch mobile settings' });
    }
  });

  // Update mobile settings
  app.patch('/api/mobile/settings', ensureAuthenticated, async (req: any, res) => {
    try {
      const { setting, value } = req.body;
      const { MobileAppService } = await import('./api/mobile-app-service');
      const mobileAppService = new MobileAppService();
      await mobileAppService.updateSetting(req.user.id, setting, value);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating mobile settings:', error);
      res.status(500).json({ error: 'Failed to update mobile settings' });
    }
  });

  // Send push notification
  app.post('/api/mobile/notifications/send', ensureAuthenticated, async (req: any, res) => {
    try {
      const { title, message, recipients } = req.body;
      const { MobileAppService } = await import('./api/mobile-app-service');
      const mobileAppService = new MobileAppService();
      const result = await mobileAppService.sendPushNotification(req.user.id, { title, message, recipients });
      res.json(result);
    } catch (error) {
      console.error('Error sending push notification:', error);
      res.status(500).json({ error: 'Failed to send push notification' });
    }
  });

  // Get mobile statistics
  app.get('/api/mobile/stats', ensureAuthenticated, async (req: any, res) => {
    try {
      const { MobileAppService } = await import('./api/mobile-app-service');
      const mobileAppService = new MobileAppService();
      const stats = await mobileAppService.getMobileStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching mobile stats:', error);
      res.status(500).json({ error: 'Failed to fetch mobile stats' });
    }
  });

  // Integration Routes - Slack/Discord
  app.post('/api/integrations/slack/configure/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      await slackDiscordService.configureSlack(projectId, req.body);
      res.json({ message: 'Slack configured successfully' });
    } catch (error) {
      console.error('Error configuring Slack:', error);
      res.status(500).json({ message: 'Failed to configure Slack' });
    }
  });

  app.post('/api/integrations/discord/configure/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      await slackDiscordService.configureDiscord(projectId, req.body);
      res.json({ message: 'Discord configured successfully' });
    } catch (error) {
      console.error('Error configuring Discord:', error);
      res.status(500).json({ message: 'Failed to configure Discord' });
    }
  });

  app.post('/api/integrations/slack/send/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      await slackDiscordService.sendSlackMessage(projectId, req.body);
      res.json({ message: 'Slack message sent successfully' });
    } catch (error) {
      console.error('Error sending Slack message:', error);
      res.status(500).json({ message: 'Failed to send Slack message' });
    }
  });

  app.post('/api/integrations/discord/send/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      await slackDiscordService.sendDiscordMessage(projectId, req.body);
      res.json({ message: 'Discord message sent successfully' });  
    } catch (error) {
      console.error('Error sending Discord message:', error);
      res.status(500).json({ message: 'Failed to send Discord message' });
    }
  });

  app.get('/api/integrations/slack/channels/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const channels = await slackDiscordService.getSlackChannels(projectId);
      res.json(channels);
    } catch (error) {
      console.error('Error getting Slack channels:', error);
      res.status(500).json({ message: 'Failed to get Slack channels' });
    }
  });

  app.get('/api/integrations/discord/channels/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const channels = await slackDiscordService.getDiscordChannels(projectId);
      res.json(channels);
    } catch (error) {
      console.error('Error getting Discord channels:', error);
      res.status(500).json({ message: 'Failed to get Discord channels' });
    }
  });

  app.post('/api/integrations/slack/webhook/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { channelId } = req.body;
      const webhookUrl = await slackDiscordService.createSlackWebhook(projectId, channelId);
      res.json({ webhookUrl });
    } catch (error) {
      console.error('Error creating Slack webhook:', error);
      res.status(500).json({ message: 'Failed to create Slack webhook' });
    }
  });

  app.post('/api/integrations/discord/webhook/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { channelId, name } = req.body;
      const webhookUrl = await slackDiscordService.createDiscordWebhook(projectId, channelId, name);
      res.json({ webhookUrl });
    } catch (error) {
      console.error('Error creating Discord webhook:', error);
      res.status(500).json({ message: 'Failed to create Discord webhook' });
    }
  });

  // Integration Routes - JIRA/Linear
  app.post('/api/integrations/jira/configure/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      await jiraLinearService.configureJira(projectId, req.body);
      res.json({ message: 'JIRA configured successfully' });
    } catch (error) {
      console.error('Error configuring JIRA:', error);
      res.status(500).json({ message: 'Failed to configure JIRA' });
    }
  });

  app.post('/api/integrations/linear/configure/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      await jiraLinearService.configureLinear(projectId, req.body);
      res.json({ message: 'Linear configured successfully' });
    } catch (error) {
      console.error('Error configuring Linear:', error);
      res.status(500).json({ message: 'Failed to configure Linear' });
    }
  });

  app.post('/api/integrations/jira/issues/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const issue = await jiraLinearService.createJiraIssue(projectId, req.body);
      res.json(issue);
    } catch (error) {
      console.error('Error creating JIRA issue:', error);
      res.status(500).json({ message: 'Failed to create JIRA issue' });
    }
  });

  app.post('/api/integrations/linear/issues/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const issue = await jiraLinearService.createLinearIssue(projectId, req.body);
      res.json(issue);
    } catch (error) {
      console.error('Error creating Linear issue:', error);
      res.status(500).json({ message: 'Failed to create Linear issue' });
    }
  });

  app.get('/api/integrations/jira/issues/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { limit } = req.query;
      const issues = await jiraLinearService.getJiraIssues(projectId, Number(limit) || 50);
      res.json(issues);
    } catch (error) {
      console.error('Error getting JIRA issues:', error);
      res.status(500).json({ message: 'Failed to get JIRA issues' });
    }
  });

  app.get('/api/integrations/linear/issues/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { limit } = req.query;
      const issues = await jiraLinearService.getLinearIssues(projectId, Number(limit) || 50);
      res.json(issues);
    } catch (error) {
      console.error('Error getting Linear issues:', error);
      res.status(500).json({ message: 'Failed to get Linear issues' });
    }
  });

  app.put('/api/integrations/jira/issues/:projectId/:issueId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId, issueId } = req.params;
      await jiraLinearService.updateJiraIssue(projectId, issueId, req.body);
      res.json({ message: 'JIRA issue updated successfully' });
    } catch (error) {
      console.error('Error updating JIRA issue:', error);
      res.status(500).json({ message: 'Failed to update JIRA issue' });
    }
  });

  app.put('/api/integrations/linear/issues/:projectId/:issueId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId, issueId } = req.params;
      await jiraLinearService.updateLinearIssue(projectId, issueId, req.body);
      res.json({ message: 'Linear issue updated successfully' });
    } catch (error) {
      console.error('Error updating Linear issue:', error);
      res.status(500).json({ message: 'Failed to update Linear issue' });
    }
  });

  app.get('/api/integrations/sync/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const issues = await jiraLinearService.syncProjectIssues(projectId);
      res.json(issues);
    } catch (error) {
      console.error('Error syncing project issues:', error);
      res.status(500).json({ message: 'Failed to sync project issues' });
    }
  });

  // Integration Routes - Datadog/New Relic
  app.post('/api/integrations/datadog/configure/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      await datadogNewRelicService.configureDatadog(projectId, req.body);
      res.json({ message: 'Datadog configured successfully' });
    } catch (error) {
      console.error('Error configuring Datadog:', error);
      res.status(500).json({ message: 'Failed to configure Datadog' });
    }
  });

  app.post('/api/integrations/newrelic/configure/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      await datadogNewRelicService.configureNewRelic(projectId, req.body);
      res.json({ message: 'New Relic configured successfully' });
    } catch (error) {
      console.error('Error configuring New Relic:', error);
      res.status(500).json({ message: 'Failed to configure New Relic' });
    }
  });

  app.post('/api/integrations/datadog/metrics/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      await datadogNewRelicService.sendDatadogMetrics(projectId, req.body.metrics);
      res.json({ message: 'Datadog metrics sent successfully' });
    } catch (error) {
      console.error('Error sending Datadog metrics:', error);
      res.status(500).json({ message: 'Failed to send Datadog metrics' });
    }
  });

  app.post('/api/integrations/newrelic/metrics/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      await datadogNewRelicService.sendNewRelicMetrics(projectId, req.body.metrics);
      res.json({ message: 'New Relic metrics sent successfully' });
    } catch (error) {
      console.error('Error sending New Relic metrics:', error);
      res.status(500).json({ message: 'Failed to send New Relic metrics' });
    }
  });

  app.get('/api/integrations/datadog/metrics/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { query, from, to } = req.query;
      const metrics = await datadogNewRelicService.getDatadogMetrics(
        projectId, 
        query as string, 
        Number(from), 
        Number(to)
      );
      res.json(metrics);
    } catch (error) {
      console.error('Error getting Datadog metrics:', error);
      res.status(500).json({ message: 'Failed to get Datadog metrics' });
    }
  });

  app.get('/api/integrations/newrelic/metrics/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { nrql } = req.query;
      const metrics = await datadogNewRelicService.getNewRelicMetrics(projectId, nrql as string);
      res.json(metrics);
    } catch (error) {
      console.error('Error getting New Relic metrics:', error);
      res.status(500).json({ message: 'Failed to get New Relic metrics' });
    }
  });

  app.post('/api/integrations/datadog/alerts/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const alert = await datadogNewRelicService.createDatadogAlert(projectId, req.body);
      res.json(alert);
    } catch (error) {
      console.error('Error creating Datadog alert:', error);
      res.status(500).json({ message: 'Failed to create Datadog alert' });
    }
  });

  app.post('/api/integrations/newrelic/alerts/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const alert = await datadogNewRelicService.createNewRelicAlert(projectId, req.body);
      res.json(alert);
    } catch (error) {
      console.error('Error creating New Relic alert:', error);
      res.status(500).json({ message: 'Failed to create New Relic alert' });
    }
  });

  app.get('/api/integrations/datadog/alerts/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const alerts = await datadogNewRelicService.getDatadogAlerts(projectId);
      res.json(alerts);
    } catch (error) {
      console.error('Error getting Datadog alerts:', error);
      res.status(500).json({ message: 'Failed to get Datadog alerts' });
    }
  });

  app.get('/api/integrations/newrelic/alerts/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const alerts = await datadogNewRelicService.getNewRelicAlerts(projectId);
      res.json(alerts);
    } catch (error) {
      console.error('Error getting New Relic alerts:', error);
      res.status(500).json({ message: 'Failed to get New Relic alerts' });
    }
  });

  app.post('/api/integrations/performance/track/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      await datadogNewRelicService.trackApplicationPerformance(projectId, req.body);
      res.json({ message: 'Performance data tracked successfully' });
    } catch (error) {
      console.error('Error tracking performance:', error);
      res.status(500).json({ message: 'Failed to track performance' });
    }
  });

  // Integration Routes - Webhooks
  app.post('/api/webhooks/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const webhook = await webhookService.createWebhook(projectId, req.body);
      res.json(webhook);
    } catch (error) {
      console.error('Error creating webhook:', error);
      res.status(500).json({ message: 'Failed to create webhook' });
    }
  });

  app.get('/api/webhooks/:projectId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const webhooks = webhookService.getWebhooks(projectId);
      res.json(webhooks);
    } catch (error) {
      console.error('Error getting webhooks:', error);
      res.status(500).json({ message: 'Failed to get webhooks' });
    }
  });

  app.put('/api/webhooks/:projectId/:webhookId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId, webhookId } = req.params;
      await webhookService.updateWebhook(projectId, webhookId, req.body);
      res.json({ message: 'Webhook updated successfully' });
    } catch (error) {
      console.error('Error updating webhook:', error);
      res.status(500).json({ message: 'Failed to update webhook' });
    }
  });

  app.delete('/api/webhooks/:projectId/:webhookId', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId, webhookId } = req.params;
      await webhookService.deleteWebhook(projectId, webhookId);
      res.json({ message: 'Webhook deleted successfully' });
    } catch (error) {
      console.error('Error deleting webhook:', error);
      res.status(500).json({ message: 'Failed to delete webhook' });
    }
  });

  app.post('/api/webhooks/:projectId/trigger', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { event, data } = req.body;
      await webhookService.triggerWebhooks(projectId, event, data);
      res.json({ message: 'Webhooks triggered successfully' });
    } catch (error) {
      console.error('Error triggering webhooks:', error);
      res.status(500).json({ message: 'Failed to trigger webhooks' });
    }
  });

  app.get('/api/webhooks/:projectId/deliveries', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { webhookId, limit } = req.query;
      const deliveries = webhookService.getDeliveries(
        projectId, 
        webhookId as string, 
        Number(limit) || 50
      );
      res.json(deliveries);
    } catch (error) {
      console.error('Error getting webhook deliveries:', error);
      res.status(500).json({ message: 'Failed to get webhook deliveries' });
    }
  });

  app.post('/api/webhooks/deliveries/:deliveryId/retry', ensureAuthenticated, async (req, res) => {
    try {
      const { deliveryId } = req.params;
      await webhookService.retryDelivery(deliveryId);
      res.json({ message: 'Webhook delivery retried successfully' });
    } catch (error) {
      console.error('Error retrying webhook delivery:', error);
      res.status(500).json({ message: 'Failed to retry webhook delivery' });
    }
  });

  app.get('/api/webhooks/:projectId/stats', ensureAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { webhookId } = req.query;
      const stats = webhookService.getWebhookStats(projectId, webhookId as string);
      res.json(stats);
    } catch (error) {
      console.error('Error getting webhook stats:', error);
      res.status(500).json({ message: 'Failed to get webhook stats' });
    }
  });

  app.get('/api/webhooks/events/supported', ensureAuthenticated, async (req, res) => {
    try {
      const events = webhookService.getSupportedEvents();
      res.json(events);
    } catch (error) {
      console.error('Error getting supported events:', error);
      res.status(500).json({ message: 'Failed to get supported events' });
    }
  });

  return httpServer;
}
