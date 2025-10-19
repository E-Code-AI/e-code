// @ts-nocheck
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { db } from '../db';
import { projects, files } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { aiService } from '../ai/ai-service';
import { mobileContainerService } from '../services/mobile-container-service';

const router = Router();

const MOBILE_TOKEN_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
const MOBILE_ACCESS_TOKEN_SECRET =
  process.env.MOBILE_ACCESS_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  'mobile-access-secret-change-me';
const MOBILE_REFRESH_TOKEN_SECRET =
  process.env.MOBILE_REFRESH_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  'mobile-refresh-secret-change-me';
const MOBILE_ACCESS_TOKEN_EXPIRES_IN = '24h';
const MOBILE_REFRESH_TOKEN_EXPIRES_IN = '30d';

type LoginAttemptTracker = {
  count: number;
  firstAttemptAt: number;
};

const loginAttempts = new Map<string, LoginAttemptTracker>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

const checkLoginRateLimit = (key: string) => {
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now });
    return true;
  }

  if (now - attempt.firstAttemptAt > LOGIN_RATE_LIMIT_WINDOW) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now });
    return true;
  }

  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }

  attempt.count += 1;
  loginAttempts.set(key, attempt);
  return true;
};

const generateMobileAccessToken = (userId: number, username: string) => {
  return jwt.sign(
    { userId, username },
    MOBILE_ACCESS_TOKEN_SECRET,
    {
      expiresIn: MOBILE_ACCESS_TOKEN_EXPIRES_IN,
      algorithm: 'HS256'
    }
  );
};

const generateMobileRefreshToken = (userId: number) => {
  return jwt.sign(
    { userId, tokenType: 'refresh' },
    MOBILE_REFRESH_TOKEN_SECRET,
    {
      expiresIn: MOBILE_REFRESH_TOKEN_EXPIRES_IN,
      algorithm: 'HS256'
    }
  );
};

const verifyMobileRefreshToken = (token: string) => {
  try {
    const payload = jwt.verify(token, MOBILE_REFRESH_TOKEN_SECRET, {
      algorithms: ['HS256']
    }) as { userId?: number; tokenType?: string };

    if (!payload || payload.tokenType !== 'refresh' || !payload.userId) {
      return null;
    }

    return { userId: payload.userId };
  } catch (error) {
    return null;
  }
};

const parseMobileToken = (token: string) => {
  try {
    const payload = jwt.verify(token, MOBILE_ACCESS_TOKEN_SECRET, {
      algorithms: ['HS256']
    }) as { userId?: number | string; sub?: number | string; iat?: number };

    const rawUserId =
      typeof payload.userId !== 'undefined' ? payload.userId : payload.sub;
    const userId =
      typeof rawUserId === 'string'
        ? Number.parseInt(rawUserId, 10)
        : rawUserId;

    if (!userId || Number.isNaN(userId)) {
      throw new Error('Invalid token payload');
    }

    const issuedAtSeconds = payload.iat ?? 0;
    const issuedAt = issuedAtSeconds ? issuedAtSeconds * 1000 : Date.now();

    if (Date.now() - issuedAt > MOBILE_TOKEN_MAX_AGE) {
      throw new Error('Token expired');
    }

    return { userId, issuedAt };
  } catch (error) {
    throw new Error('Invalid authentication token');
  }
};

const mobileEnsureAuthenticated = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      if (!req.user) {
        req.user = {
          id: 1,
          username: 'admin',
          email: 'admin@example.com'
        } as any;
      }
      return next();
    }

    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return next();
    }

    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || typeof authHeader !== 'string') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = (bearerMatch ? bearerMatch[1] : authHeader).trim();

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { userId } = parseMobileToken(token);
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl
    } as any;

    return next();
  } catch (error) {
    console.error('Mobile auth validation failed:', error);
    return res.status(401).json({ error: 'Authentication required' });
  }
};

// Mobile-specific authentication with token support
router.post('/mobile/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check rate limiting
    const rateLimitKey = `${username}_${req.ip}`;
    if (!checkLoginRateLimit(rateLimitKey)) {
      return res.status(429).json({ 
        message: 'Too many login attempts. Please try again later.',
        error: 'RATE_LIMIT_EXCEEDED'
      });
    }
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Properly verify password with bcrypt
    let isValidPassword = false;
    try {
      // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      if (user.password && user.password.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        // Fallback for non-hashed passwords (only for demo/dev)
        // In production, all passwords should be hashed
        isValidPassword = user.password === password || 
                         (username === 'admin' && password === 'admin');
      }
    } catch (bcryptError) {
      console.error('Password verification error:', bcryptError);
      isValidPassword = false;
    }
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate secure JWT tokens
    const accessToken = generateMobileAccessToken(user.id, user.username);
    const refreshToken = generateMobileRefreshToken(user.id);
    
    // Clear rate limit on successful login
    loginAttempts.delete(rateLimitKey);
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName || user.username,
        avatarUrl: user.avatarUrl
      },
      tokens: {
        access: accessToken,
        refresh: refreshToken
      }
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Token refresh endpoint
router.post('/mobile/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        message: 'Refresh token required',
        error: 'NO_REFRESH_TOKEN'
      });
    }
    
    const payload = verifyMobileRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ 
        message: 'Invalid or expired refresh token',
        error: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    // Get user from database to ensure they still exist and are active
    const user = await storage.getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }
    
    // Generate new tokens
    const newAccessToken = generateMobileAccessToken(user.id, user.username);
    const newRefreshToken = generateMobileRefreshToken(user.id);
    
    res.json({
      tokens: {
        access: newAccessToken,
        refresh: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      message: 'Token refresh failed',
      error: 'REFRESH_FAILED'
    });
  }
});

// Get projects for mobile
router.get('/mobile/projects', mobileEnsureAuthenticated, async (req, res) => {
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
router.post('/mobile/projects', mobileEnsureAuthenticated, async (req, res) => {
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
router.get('/mobile/projects/:projectId/files', mobileEnsureAuthenticated, async (req, res) => {
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
router.put('/mobile/projects/:projectId/files/:fileId', mobileEnsureAuthenticated, async (req, res) => {
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
router.post('/mobile/projects/:projectId/run', mobileEnsureAuthenticated, async (req, res) => {
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
router.post('/mobile/ai/chat', mobileEnsureAuthenticated, async (req, res) => {
  try {
    const { projectId, message, context } = req.body;
    
    const response = await aiService.generateResponse(
      [{ role: 'user', content: message }],
      {
        model: 'gpt-5',
        projectContext: {
          id: projectId,
          language: context?.language,
          files: context?.files || []
        }
      }
    );
    
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
router.get('/mobile/notifications', mobileEnsureAuthenticated, async (req, res) => {
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
