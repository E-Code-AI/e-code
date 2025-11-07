import { Router, Request, Response } from 'express';
import { TemplateMarketplaceService } from '../services/template-marketplace';
import { ensureAuthenticated } from '../middleware/auth';
import { storage } from '../storage';

const router = Router();
const templateMarketplace = new TemplateMarketplaceService();

// GET /api/marketplace/templates - Return templates with search/filters
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const options = {
      query: req.query.q as string,
      category: req.query.category as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      languages: req.query.languages ? (req.query.languages as string).split(',') : undefined,
      frameworks: req.query.frameworks ? (req.query.frameworks as string).split(',') : undefined,
      difficulty: req.query.difficulty ? (req.query.difficulty as string).split(',') : undefined,
      minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      authorId: req.query.authorId as string,
      featured: req.query.featured === 'true',
      official: req.query.official === 'true',
      community: req.query.community === 'true',
      sortBy: req.query.sortBy as any || 'popularity',
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    const result = await templateMarketplace.searchTemplates(options);
    res.json(result);
  } catch (error) {
    console.error('[marketplace] Error searching templates:', error);
    res.status(500).json({ error: 'Failed to search templates' });
  }
});

// GET /api/marketplace/template/:id - Get template details
router.get('/template/:id', async (req: Request, res: Response) => {
  try {
    const template = await templateMarketplace.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    console.error('[marketplace] Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST /api/marketplace/rate/:id - Rate a template
router.post('/rate/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { rating, review } = req.body;
    const userId = req.user!.id;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const result = await templateMarketplace.rateTemplate(
      req.params.id,
      userId,
      rating,
      review
    );

    res.json(result);
  } catch (error) {
    console.error('[marketplace] Error rating template:', error);
    res.status(500).json({ error: 'Failed to rate template' });
  }
});

// GET /api/marketplace/trending - Get trending templates
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const templates = await templateMarketplace.getTrendingTemplates(limit);
    res.json(templates);
  } catch (error) {
    console.error('[marketplace] Error fetching trending templates:', error);
    res.status(500).json({ error: 'Failed to fetch trending templates' });
  }
});

// GET /api/marketplace/categories - Get category list
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await templateMarketplace.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('[marketplace] Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/marketplace/collections - Get template collections
router.get('/collections', async (req: Request, res: Response) => {
  try {
    const featured = req.query.featured === 'true';
    const collections = await templateMarketplace.getCollections(featured);
    res.json(collections);
  } catch (error) {
    console.error('[marketplace] Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// GET /api/marketplace/collection/:id - Get collection details
router.get('/collection/:id', async (req: Request, res: Response) => {
  try {
    const collection = await templateMarketplace.getCollectionById(req.params.id);
    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    res.json(collection);
  } catch (error) {
    console.error('[marketplace] Error fetching collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// POST /api/marketplace/template/:id/use - Track template usage
router.post('/template/:id/use', async (req: Request, res: Response) => {
  try {
    await templateMarketplace.trackTemplateUse(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[marketplace] Error tracking template use:', error);
    res.status(500).json({ error: 'Failed to track template use' });
  }
});

// POST /api/marketplace/template/:id/star - Star/unstar a template
router.post('/template/:id/star', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { starred } = req.body;
    const userId = req.user!.id;
    
    await templateMarketplace.starTemplate(req.params.id, userId, starred);
    res.json({ success: true, starred });
  } catch (error) {
    console.error('[marketplace] Error starring template:', error);
    res.status(500).json({ error: 'Failed to star template' });
  }
});

// POST /api/marketplace/template - Submit a community template
router.post('/template', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const templateData = {
      ...req.body,
      authorId: userId,
      isCommunity: true,
      isOfficial: false,
      status: 'pending_review'
    };
    
    const newTemplate = await templateMarketplace.submitTemplate(templateData);
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('[marketplace] Error submitting template:', error);
    res.status(500).json({ error: 'Failed to submit template' });
  }
});

// GET /api/marketplace/stats - Get marketplace statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await templateMarketplace.getMarketplaceStats();
    res.json(stats);
  } catch (error) {
    console.error('[marketplace] Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace stats' });
  }
});

// POST /api/marketplace/template/:id/fork - Fork a template
router.post('/template/:id/fork', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const userId = req.user!.id;
    
    // Fork the template project to the user's account
    const forkedProject = await storage.forkProject(templateId, userId);
    
    // Track the fork action
    await templateMarketplace.trackTemplateUsage(templateId);
    
    res.json({ 
      success: true, 
      project: forkedProject,
      message: `Template forked successfully as "${forkedProject.name}"`
    });
  } catch (error) {
    console.error('[marketplace] Error forking template:', error);
    res.status(500).json({ error: 'Failed to fork template' });
  }
});

// POST /api/marketplace/template/:id/deploy - Deploy a template
router.post('/template/:id/deploy', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const userId = req.user!.id;
    const { environment = 'production', type = 'static' } = req.body;
    
    // First, fork the template to create a project for the user
    const forkedProject = await storage.forkProject(templateId, userId);
    
    // Create a deployment for the forked project
    const deployment = await storage.createDeployment({
      projectId: forkedProject.id,
      deploymentId: `deploy-${Date.now()}`,
      type,
      environment,
      status: 'pending',
      metadata: {
        source: 'template',
        templateId,
        autoDeployed: true
      }
    });
    
    // Track the deploy action
    await templateMarketplace.trackTemplateUsage(templateId);
    
    res.json({ 
      success: true, 
      project: forkedProject,
      deployment,
      message: `Template deployed successfully`
    });
  } catch (error) {
    console.error('[marketplace] Error deploying template:', error);
    res.status(500).json({ error: 'Failed to deploy template' });
  }
});

export default router;