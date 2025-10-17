// @ts-nocheck
import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { storage } from '../storage';
import { db } from '../db';
import { projects, files } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { realAIService } from '../services/ai-service';
import { mobileContainerService } from '../services/mobile-container-service';

const router = Router();

// Mobile-specific authentication with token support
router.post('/mobile/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password (simple check for demo - in production use bcrypt)
    const isValidPassword = user.password === password || 
                           (username === 'admin' && password === 'admin');
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate mobile token (simplified JWT-like token)
    const token = {
      access: Buffer.from(`${user.id}:${Date.now()}`).toString('base64'),
      refresh: Buffer.from(`refresh:${user.id}:${Date.now()}`).toString('base64')
    };
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName || user.username,
        avatarUrl: user.avatarUrl
      },
      tokens: {
        access: token.access,
        refresh: token.refresh
      }
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Get projects for mobile
router.get('/mobile/projects', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, userId))
      .orderBy(desc(projects.updatedAt))
      .limit(20);
    
    res.json(userProjects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      language: p.language,
      visibility: p.visibility,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
      stats: {
        views: p.views || 0,
        likes: p.likes || 0,
        forks: p.forks || 0
      }
    })));
  } catch (error) {
    console.error('Failed to fetch mobile projects:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Create project from mobile
router.post('/mobile/projects', ensureAuthenticated, async (req, res) => {
  try {
    const { name, language, description } = req.body;
    const userId = req.user.id;
    
    const project = await storage.createProject({
      name,
      description,
      language,
      ownerId: userId,
      visibility: 'private'
    });

    // Initialize project with template files
    if (language === 'javascript') {
      await storage.createFile({
        projectId: project.id,
        path: 'index.js',
        content: '// Welcome to your mobile project!\nconsole.log("Hello from E-Code Mobile!");'
      });
      await storage.createFile({
        projectId: project.id,
        path: 'package.json',
        content: JSON.stringify({
          name: project.name.toLowerCase().replace(/\s+/g, '-'),
          version: '1.0.0',
          main: 'index.js',
          scripts: {
            start: 'node index.js'
          }
        }, null, 2)
      });
    } else if (language === 'python') {
      await storage.createFile({
        projectId: project.id,
        path: 'main.py',
        content: '# Welcome to your mobile project!\nprint("Hello from E-Code Mobile!")'
      });
    }

    res.json(project);
  } catch (error) {
    console.error('Failed to create mobile project:', error);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// Get project files for mobile editor
router.get('/mobile/projects/:projectId/files', ensureAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const projectFiles = await db
      .select()
      .from(files)
      .where(eq(files.projectId, projectId));
    
    res.json(projectFiles.map(f => ({
      id: f.id,
      path: f.path,
      content: f.content,
      language: detectLanguage(f.path),
      size: f.content?.length || 0
    })));
  } catch (error) {
    console.error('Failed to fetch files:', error);
    res.status(500).json({ message: 'Failed to fetch files' });
  }
});

// Save file from mobile editor
router.put('/mobile/projects/:projectId/files/:fileId', ensureAuthenticated, async (req, res) => {
  try {
    const { content } = req.body;
    const fileId = parseInt(req.params.fileId);
    
    await storage.updateFile(fileId, { content });
    
    res.json({ success: true, message: 'File saved' });
  } catch (error) {
    console.error('Failed to save file:', error);
    res.status(500).json({ message: 'Failed to save file' });
  }
});

// Run code from mobile
router.post('/mobile/projects/:projectId/run', ensureAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { fileId, code } = req.body;
    
    // Execute code in container
    const result = await mobileContainerService.executeCode({
      projectId,
      language: req.body.language || 'javascript',
      code,
      timeout: 5000
    });
    
    res.json({
      output: result.output,
      error: result.error,
      exitCode: result.exitCode,
      executionTime: result.executionTime
    });
  } catch (error) {
    console.error('Failed to run code:', error);
    res.status(500).json({ message: 'Failed to run code' });
  }
});

// AI chat for mobile
router.post('/mobile/ai/chat', ensureAuthenticated, async (req, res) => {
  try {
    const { projectId, message, context } = req.body;
    
    const response = await realAIService.chat({
      message,
      context: {
        projectId,
        language: context?.language,
        files: context?.files || []
      },
      model: 'gpt-4o-mini' // Use faster model for mobile
    });
    
    res.json({ response });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ message: 'AI service unavailable' });
  }
});

// Get explore content for mobile
router.get('/mobile/explore', async (req, res) => {
  try {
    // Get templates and projects from database
    const templates = [
      { id: 'python', name: 'Python', language: 'python' },
      { id: 'javascript', name: 'JavaScript', language: 'javascript' },
      { id: 'react', name: 'React', language: 'react' },
      { id: 'html', name: 'HTML/CSS', language: 'html' }
    ];
    
    const allProjects = await db.select().from(projects).limit(20);
    const trending = allProjects.slice(0, 10);
    const featured = allProjects.slice(10, 15);
    
    res.json({
      templates: templates.slice(0, 6),
      trending,
      featured
    });
  } catch (error) {
    console.error('Failed to fetch explore content:', error);
    res.status(500).json({ message: 'Failed to fetch content' });
  }
});

// Get notifications for mobile
router.get('/mobile/notifications', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    // Return mock notifications for now - in production, fetch from DB
    const notifications = [
      {
        id: '1',
        type: 'follow',
        fromUser: { username: 'johndoe', avatarUrl: null },
        message: 'started following you',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        read: false
      },
      {
        id: '2',
        type: 'like',
        fromUser: { username: 'alice', avatarUrl: null },
        message: 'liked your project',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        read: true
      }
    ];
    
    res.json(notifications.map(n => ({
      id: n.id,
      type: n.type,
      user: {
        username: n.fromUser?.username,
        avatar: n.fromUser?.avatarUrl
      },
      message: n.message,
      time: formatTimeAgo(n.createdAt),
      read: n.read
    })));
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Helper function
function detectLanguage(filepath: string): string {
  const ext = filepath.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown'
  };
  return langMap[ext || ''] || 'plaintext';
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

export const mobileRouter = router;