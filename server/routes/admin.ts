import { Router } from 'express';
import { AdminService } from '../services/admin-service';
import { storage } from '../storage';
import { z } from 'zod';

const router = Router();
const adminService = new AdminService(storage);

// Admin authorization middleware
const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = await storage.getUser(req.user.id);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }

  next();
};

// Apply admin middleware to all routes
router.use(requireAdmin);

// Dashboard stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(stats);
  } catch (error) {
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

router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    await adminService.updateUserRole(parseInt(req.params.id), role, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

router.post('/users/:id/suspend', async (req, res) => {
  try {
    const { reason } = req.body;
    await adminService.suspendUser(parseInt(req.params.id), req.user.id, reason);
    res.json({ success: true });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ message: 'Failed to suspend user' });
  }
});

router.post('/users/:id/unsuspend', async (req, res) => {
  try {
    await adminService.unsuspendUser(parseInt(req.params.id), req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error unsuspending user:', error);
    res.status(500).json({ message: 'Failed to unsuspend user' });
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
    const apiKey = await adminService.createApiKey(data, req.user.id);
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
    
    const apiKey = await adminService.updateApiKey(parseInt(req.params.id), updates, req.user.id);
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
    await adminService.deleteApiKey(parseInt(req.params.id), req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ message: 'Failed to delete API key' });
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
    const page = await adminService.createCmsPage(data, req.user.id);
    res.json(page);
  } catch (error) {
    console.error('Error creating CMS page:', error);
    res.status(500).json({ message: 'Failed to create CMS page' });
  }
});

router.patch('/cms/pages/:id', async (req, res) => {
  try {
    const page = await adminService.updateCmsPage(parseInt(req.params.id), req.body, req.user.id);
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
    const page = await adminService.publishCmsPage(parseInt(req.params.id), req.user.id);
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
    await adminService.deleteCmsPage(parseInt(req.params.id), req.user.id);
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
    const category = await adminService.createDocCategory(data, req.user.id);
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
    const doc = await adminService.createDocumentation(data, req.user.id);
    res.json(doc);
  } catch (error) {
    console.error('Error creating documentation:', error);
    res.status(500).json({ message: 'Failed to create documentation' });
  }
});

router.patch('/docs/:id', async (req, res) => {
  try {
    const doc = await adminService.updateDocumentation(parseInt(req.params.id), req.body, req.user.id);
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
    const doc = await adminService.publishDocumentation(parseInt(req.params.id), req.user.id);
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
      userId: req.user.id,
      ...data
    }, req.user.id);
    res.json(reply);
  } catch (error) {
    console.error('Error creating ticket reply:', error);
    res.status(500).json({ message: 'Failed to create ticket reply' });
  }
});

router.post('/support/tickets/:id/assign', async (req, res) => {
  try {
    const { assignedTo } = req.body;
    await adminService.assignTicket(parseInt(req.params.id), assignedTo, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error assigning ticket:', error);
    res.status(500).json({ message: 'Failed to assign ticket' });
  }
});

router.post('/support/tickets/:id/resolve', async (req, res) => {
  try {
    await adminService.resolveTicket(parseInt(req.params.id), req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error resolving ticket:', error);
    res.status(500).json({ message: 'Failed to resolve ticket' });
  }
});

router.post('/support/tickets/:id/close', async (req, res) => {
  try {
    await adminService.closeTicket(parseInt(req.params.id), req.user.id);
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
    const subscription = await adminService.createUserSubscription(data, req.user.id);
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
      req.user.id
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
    await adminService.cancelSubscription(parseInt(req.params.id), req.user.id);
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