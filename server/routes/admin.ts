import { Router } from 'express';
import { AdminService } from '../services/admin-service';
import { storage } from '../storage';
import { z } from 'zod';
import { ensureAdmin } from '../middleware/admin-auth';
import { ensureAuthenticated } from '../middleware/auth';
import { createLogger } from '../utils/logger';

const router = Router();
const adminService = new AdminService(storage);
const logger = createLogger('admin-routes');

// After ensureAuthenticated + ensureAdmin middleware, req.user is guaranteed to exist
// TypeScript doesn't understand middleware guarantees, so we use type assertion helper
const getAuthUser = (req: any): Express.User => req.user!;

// SECURITY: Apply authentication + admin authorization to ALL routes
// No dev bypasses - authorization must ALWAYS be enforced
router.use(ensureAuthenticated);
router.use(ensureAdmin);

// Security audit logging middleware
router.use((req, res, next) => {
  const adminUser = getAuthUser(req);
  logger.info('Admin action', {
    action: `${req.method} ${req.path}`,
    adminId: adminUser.id,
    adminUsername: adminUser.username,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching dashboard stats', { error: error.message });
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

// User management
router.get('/users', async (req, res) => {
  try {
    const filter = {
      search: req.query.search as string,
      role: req.query.role as string,
      status: req.query.status as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };
    
    const result = await adminService.getAllUsers(filter);
    res.json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.patch('/users/:id/toggle-admin', async (req, res) => {
  try {
    const userId = req.params.id;
    const adminUser = getAuthUser(req);
    
    // SECURITY: Prevent self-modification (admin removing their own admin rights)
    if (adminUser.id === userId) {
      logger.warn('Admin self-modification attempt blocked', {
        adminId: adminUser.id,
        ip: req.ip
      });
      return res.status(400).json({ 
        message: 'Cannot modify your own admin status',
        code: 'SELF_MODIFICATION_FORBIDDEN'
      });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Toggle isAdmin status
    const updated = await storage.updateUser(userId, {
      isAdmin: !user.isAdmin
    });
    
    if (!updated) {
      return res.status(500).json({ message: 'Failed to update user' });
    }
    
    logger.info('Admin status toggled', {
      targetUserId: userId,
      newStatus: updated.isAdmin,
      adminId: adminUser.id
    });
    
    res.json({ success: true, user: updated });
  } catch (error: any) {
    logger.error('Error toggling admin status', { error: error?.message });
    console.error('Error toggling admin status:', error);
    res.status(500).json({ message: 'Failed to toggle admin status' });
  }
});

router.post('/users/:id/lock', async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;
    
    // Lock account for 24 hours
    const lockUntil = new Date();
    lockUntil.setHours(lockUntil.getHours() + 24);
    
    const updated = await storage.updateUser(userId, {
      lockedUntil: lockUntil
    });
    
    res.json({ success: true, user: updated, reason });
  } catch (error) {
    console.error('Error locking user:', error);
    res.status(500).json({ message: 'Failed to lock user' });
  }
});

router.post('/users/:id/unlock', async (req, res) => {
  try {
    const userId = req.params.id;
    
    const updated = await storage.updateUser(userId, {
      lockedUntil: null,
      failedLoginAttempts: 0
    });
    
    res.json({ success: true, user: updated });
  } catch (error) {
    console.error('Error unlocking user:', error);
    res.status(500).json({ message: 'Failed to unlock user' });
  }
});

// API Key management
router.get('/api-keys', async (req, res) => {
  try {
    const apiKeys = await adminService.getApiKeys();
    // Mask the keys for security
    const maskedKeys = apiKeys.map(key => ({
      ...key,
      key: key.key.substring(0, 8) + '...' + key.key.substring(key.key.length - 4)
    }));
    res.json(maskedKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ message: 'Failed to fetch API keys' });
  }
});

router.get('/api-keys/:provider', async (req, res) => {
  try {
    const apiKey = await adminService.getApiKeyByProvider(req.params.provider);
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }
    // Don't send the actual key in response
    res.json({ ...apiKey, key: 'REDACTED' });
  } catch (error) {
    console.error('Error fetching API key:', error);
    res.status(500).json({ message: 'Failed to fetch API key' });
  }
});

router.post('/api-keys', async (req, res) => {
  try {
    const schema = z.object({
      provider: z.string(),
      key: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      usageLimit: z.number().optional()
    });
    
    const data = schema.parse(req.body);
    const apiKey = await adminService.createApiKey(data, getAuthUser(req).id);
    res.json({ ...apiKey, key: 'REDACTED' });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ message: 'Failed to create API key' });
  }
});

router.patch('/api-keys/:id', async (req, res) => {
  try {
    const updates = req.body;
    // Don't allow updating the key itself through this endpoint
    delete updates.key;
    
    const apiKey = await adminService.updateApiKey(parseInt(req.params.id), updates, getAuthUser(req).id);
    if (!apiKey) {
      return res.status(404).json({ message: 'API key not found' });
    }
    res.json({ ...apiKey, key: 'REDACTED' });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ message: 'Failed to update API key' });
  }
});

router.delete('/api-keys/:id', async (req, res) => {
  try {
    await adminService.deleteApiKey(parseInt(req.params.id), getAuthUser(req).id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ message: 'Failed to delete API key' });
  }
});

// Update user details (admin can update any user)
router.patch('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;
    
    // Don't allow updating sensitive fields through this endpoint
    delete updates.id;
    delete updates.passwordHash;
    
    const user = await storage.updateUser(userId, updates);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const adminUser = getAuthUser(req);
    
    // SECURITY: Prevent self-deletion
    if (adminUser.id === userId) {
      logger.warn('Admin self-deletion attempt blocked', {
        adminId: adminUser.id,
        ip: req.ip
      });
      return res.status(400).json({ 
        message: 'Cannot delete your own account',
        code: 'SELF_DELETION_FORBIDDEN'
      });
    }
    
    await storage.deleteUser(userId);
    logger.info('User deleted', {
      deletedUserId: userId,
      adminId: adminUser.id
    });
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting user', { error: error?.message });
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Project management
router.get('/projects', async (req, res) => {
  try {
    const search = req.query.search as string;
    const visibility = req.query.visibility as string;
    const language = req.query.language as string;
    const status = req.query.status as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const result = await adminService.getAllProjects({
      search,
      visibility,
      language,
      status,
      limit,
      offset
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

router.patch('/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const updates = req.body;
    
    // Don't allow updating sensitive fields
    delete updates.id;
    delete updates.ownerId;
    delete updates.createdAt;
    
    const project = await storage.updateProject(projectId, updates);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json({ success: true, project });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Failed to update project' });
  }
});

router.delete('/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    await storage.deleteProject(projectId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

router.patch('/projects/:id/pin', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const project = await storage.updateProject(projectId, {
      isPinned: true
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json({ success: true, project });
  } catch (error) {
    console.error('Error pinning project:', error);
    res.status(500).json({ message: 'Failed to pin project' });
  }
});

router.patch('/projects/:id/unpin', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const project = await storage.updateProject(projectId, {
      isPinned: false
    });
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json({ success: true, project });
  } catch (error) {
    console.error('Error unpinning project:', error);
    res.status(500).json({ message: 'Failed to unpin project' });
  }
});

// CMS management
router.get('/cms/pages', async (req, res) => {
  try {
    const pages = await adminService.getCmsPages();
    res.json(pages);
  } catch (error) {
    console.error('Error fetching CMS pages:', error);
    res.status(500).json({ message: 'Failed to fetch CMS pages' });
  }
});

router.get('/cms/pages/:slug', async (req, res) => {
  try {
    const page = await adminService.getCmsPageBySlug(req.params.slug);
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    console.error('Error fetching CMS page:', error);
    res.status(500).json({ message: 'Failed to fetch CMS page' });
  }
});

router.post('/cms/pages', async (req, res) => {
  try {
    const schema = z.object({
      slug: z.string(),
      title: z.string(),
      content: z.string(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      metaKeywords: z.string().optional(),
      template: z.string().optional(),
      customCss: z.string().optional(),
      customJs: z.string().optional()
    });
    
    const data = schema.parse(req.body);
    const page = await adminService.createCmsPage(data, getAuthUser(req).id);
    res.json(page);
  } catch (error) {
    console.error('Error creating CMS page:', error);
    res.status(500).json({ message: 'Failed to create CMS page' });
  }
});

router.patch('/cms/pages/:id', async (req, res) => {
  try {
    const page = await adminService.updateCmsPage(parseInt(req.params.id), req.body, getAuthUser(req).id);
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    console.error('Error updating CMS page:', error);
    res.status(500).json({ message: 'Failed to update CMS page' });
  }
});

router.post('/cms/pages/:id/publish', async (req, res) => {
  try {
    const page = await adminService.publishCmsPage(parseInt(req.params.id), getAuthUser(req).id);
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    console.error('Error publishing CMS page:', error);
    res.status(500).json({ message: 'Failed to publish CMS page' });
  }
});

router.delete('/cms/pages/:id', async (req, res) => {
  try {
    await adminService.deleteCmsPage(parseInt(req.params.id), getAuthUser(req).id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting CMS page:', error);
    res.status(500).json({ message: 'Failed to delete CMS page' });
  }
});

// Documentation management
router.get('/docs/categories', async (req, res) => {
  try {
    const categories = await adminService.getDocCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching doc categories:', error);
    res.status(500).json({ message: 'Failed to fetch doc categories' });
  }
});

router.post('/docs/categories', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string(),
      slug: z.string(),
      description: z.string().optional(),
      parentId: z.number().optional(),
      icon: z.string().optional(),
      order: z.number().optional()
    });
    
    const data = schema.parse(req.body);
    const category = await adminService.createDocCategory(data, getAuthUser(req).id);
    res.json(category);
  } catch (error) {
    console.error('Error creating doc category:', error);
    res.status(500).json({ message: 'Failed to create doc category' });
  }
});

router.get('/docs', async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const docs = categoryId 
      ? await adminService.getDocumentationByCategory(categoryId)
      : await adminService.getDocumentation();
    res.json(docs);
  } catch (error) {
    console.error('Error fetching documentation:', error);
    res.status(500).json({ message: 'Failed to fetch documentation' });
  }
});

router.post('/docs', async (req, res) => {
  try {
    const schema = z.object({
      categoryId: z.number().optional(),
      slug: z.string(),
      title: z.string(),
      content: z.string(),
      excerpt: z.string().optional(),
      order: z.number().optional(),
      version: z.string().optional(),
      tags: z.array(z.string()).optional(),
      relatedDocs: z.array(z.number()).optional()
    });
    
    const data = schema.parse(req.body);
    const doc = await adminService.createDocumentation(data, getAuthUser(req).id);
    res.json(doc);
  } catch (error) {
    console.error('Error creating documentation:', error);
    res.status(500).json({ message: 'Failed to create documentation' });
  }
});

router.patch('/docs/:id', async (req, res) => {
  try {
    const doc = await adminService.updateDocumentation(parseInt(req.params.id), req.body, getAuthUser(req).id);
    if (!doc) {
      return res.status(404).json({ message: 'Documentation not found' });
    }
    res.json(doc);
  } catch (error) {
    console.error('Error updating documentation:', error);
    res.status(500).json({ message: 'Failed to update documentation' });
  }
});

router.post('/docs/:id/publish', async (req, res) => {
  try {
    const doc = await adminService.publishDocumentation(parseInt(req.params.id), getAuthUser(req).id);
    if (!doc) {
      return res.status(404).json({ message: 'Documentation not found' });
    }
    res.json(doc);
  } catch (error) {
    console.error('Error publishing documentation:', error);
    res.status(500).json({ message: 'Failed to publish documentation' });
  }
});

// Support ticket management
router.get('/support/tickets', async (req, res) => {
  try {
    const filter = {
      status: req.query.status as string,
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      assignedTo: req.query.assignedTo ? parseInt(req.query.assignedTo as string) : undefined
    };
    
    const tickets = await adminService.getSupportTickets(filter);
    res.json(tickets);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ message: 'Failed to fetch support tickets' });
  }
});

router.get('/support/tickets/:id', async (req, res) => {
  try {
    const ticket = await adminService.getSupportTicket(parseInt(req.params.id));
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    res.status(500).json({ message: 'Failed to fetch support ticket' });
  }
});

router.get('/support/tickets/:id/replies', async (req, res) => {
  try {
    const replies = await adminService.getTicketReplies(parseInt(req.params.id));
    res.json(replies);
  } catch (error) {
    console.error('Error fetching ticket replies:', error);
    res.status(500).json({ message: 'Failed to fetch ticket replies' });
  }
});

router.post('/support/tickets/:id/replies', async (req, res) => {
  try {
    const schema = z.object({
      message: z.string(),
      isInternal: z.boolean().optional(),
      attachments: z.array(z.object({
        url: z.string(),
        name: z.string()
      })).optional()
    });
    
    const data = schema.parse(req.body);
    const reply = await adminService.createTicketReply({
      ticketId: parseInt(req.params.id),
      userId: getAuthUser(req).id,
      ...data
    }, getAuthUser(req).id);
    res.json(reply);
  } catch (error) {
    console.error('Error creating ticket reply:', error);
    res.status(500).json({ message: 'Failed to create ticket reply' });
  }
});

router.post('/support/tickets/:id/assign', async (req, res) => {
  try {
    const { assignedTo } = req.body;
    await adminService.assignTicket(parseInt(req.params.id), assignedTo, getAuthUser(req).id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(500).json({ message: 'Failed to assign ticket' });
  }
});

router.post('/support/tickets/:id/resolve', async (req, res) => {
  try {
    await adminService.resolveTicket(parseInt(req.params.id), getAuthUser(req).id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error resolving ticket:', error);
    res.status(500).json({ message: 'Failed to resolve ticket' });
  }
});

router.post('/support/tickets/:id/close', async (req, res) => {
  try {
    await adminService.closeTicket(parseInt(req.params.id), getAuthUser(req).id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error closing ticket:', error);
    res.status(500).json({ message: 'Failed to close ticket' });
  }
});

// Subscription management
router.get('/subscriptions', async (req, res) => {
  try {
    const filter = {
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      status: req.query.status as string
    };
    
    const subscriptions = await adminService.getUserSubscriptions(filter);
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ message: 'Failed to fetch subscriptions' });
  }
});

router.post('/subscriptions', async (req, res) => {
  try {
    const schema = z.object({
      userId: z.number(),
      planId: z.string(),
      stripeSubscriptionId: z.string().optional(),
      stripeCustomerId: z.string().optional(),
      features: z.record(z.any()).optional()
    });
    
    const data = schema.parse(req.body);
    const subscription = await adminService.createUserSubscription(data, getAuthUser(req).id);
    res.json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ message: 'Failed to create subscription' });
  }
});

router.patch('/subscriptions/:id', async (req, res) => {
  try {
    const subscription = await adminService.updateUserSubscription(
      parseInt(req.params.id), 
      req.body, 
      getAuthUser(req).id
    );
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    res.json(subscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ message: 'Failed to update subscription' });
  }
});

router.post('/subscriptions/:id/cancel', async (req, res) => {
  try {
    await adminService.cancelSubscription(parseInt(req.params.id), getAuthUser(req).id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ message: 'Failed to cancel subscription' });
  }
});

// Activity logs
router.get('/activity-logs', async (req, res) => {
  try {
    const filter = {
      adminId: req.query.adminId ? parseInt(req.query.adminId as string) : undefined,
      entityType: req.query.entityType as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100
    };
    
    const logs = await adminService.getAdminActivityLogs(filter);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
});

export default router;