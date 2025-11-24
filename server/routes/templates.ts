/**
 * Templates Marketplace API Routes
 * CRUD operations for templates, categories, ratings, and collections
 */

import { Router } from 'express';
import { db } from '../db';
import {
  templates,
  templateCategories,
  templateRatings,
  templateTags,
  templateCollections,
  collectionTemplates,
  insertTemplateSchema,
  insertTemplateCategorySchema,
  insertTemplateRatingSchema,
  insertTemplateTagSchema,
  insertTemplateCollectionSchema,
  insertCollectionTemplateSchema,
  type Template,
  type TemplateCategory,
  type TemplateRating,
  type TemplateTag
} from '@shared/schema';
import { eq, desc, sql, and, or, ilike } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/templates
 * List all templates with filters and pagination
 */
router.get('/api/templates', async (req, res) => {
  try {
    const {
      category,
      search,
      featured,
      official,
      limit = '20',
      offset = '0',
      sortBy = 'downloads' // downloads, rating, recent, popular
    } = req.query;

    let query = db.select().from(templates);

    // Apply filters
    const conditions = [];
    
    if (category) {
      conditions.push(eq(templates.category, category as string));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(templates.name, `%${search}%`),
          ilike(templates.description, `%${search}%`)
        )!
      );
    }
    
    if (featured === 'true') {
      conditions.push(eq(templates.isFeatured, true));
    }
    
    if (official === 'true') {
      conditions.push(eq(templates.isOfficial, true));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)!);
    }

    // Sort
    switch (sortBy) {
      case 'rating':
        query = query.orderBy(desc(templates.rating));
        break;
      case 'recent':
        query = query.orderBy(desc(templates.createdAt));
        break;
      case 'popular':
        query = query.orderBy(desc(templates.uses));
        break;
      case 'downloads':
      default:
        query = query.orderBy(desc(templates.downloads));
    }

    // Pagination
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    
    const results = await query.limit(limitNum).offset(offsetNum);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(templates)
      .where(conditions.length > 0 ? and(...conditions)! : undefined);

    res.json({
      templates: results,
      pagination: {
        total: Number(count),
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < Number(count)
      }
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * GET /api/templates/:id
 * Get single template by ID
 */
router.get('/api/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get tags
    const tags = await db
      .select()
      .from(templateTags)
      .where(eq(templateTags.templateId, id));

    // Get ratings
    const [ratingStats] = await db
      .select({
        avgRating: sql<number>`avg(${templateRatings.rating})`,
        totalRatings: sql<number>`count(*)`,
      })
      .from(templateRatings)
      .where(eq(templateRatings.templateId, id));

    res.json({
      ...template,
      tags: tags.map((t: TemplateTag) => t.tag),
      ratingStats: {
        average: ratingStats?.avgRating ? Number(ratingStats.avgRating).toFixed(1) : '0',
        total: Number(ratingStats?.totalRatings || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * POST /api/templates
 * Create new template (authenticated users only)
 */
router.post('/api/templates', async (req, res) => {
  try {
    // ✅ SECURITY: Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validation = insertTemplateSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.error.errors 
      });
    }

    // ✅ SECURITY: Safe access to req.user properties
    const userId = typeof req.user === 'object' && 'id' in req.user ? req.user.id : null;
    const userRole = typeof req.user === 'object' && 'role' in req.user ? req.user.role : 'user';
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    const templateData = {
      ...validation.data,
      authorId: userId,
      isCommunity: userRole !== 'admin',
      isOfficial: false
    };

    const [newTemplate] = await db
      .insert(templates)
      .values(templateData)
      .returning();

    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * PATCH /api/templates/:id
 * Update existing template (owner or admin only)
 */
router.patch('/api/templates/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    // Check ownership
    const [existing] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existing.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this template' });
    }

    const [updated] = await db
      .update(templates)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * DELETE /api/templates/:id
 * Delete template (owner or admin only)
 */
router.delete('/api/templates/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    // Check ownership
    const [existing] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existing.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this template' });
    }

    await db.delete(templates).where(eq(templates.id, id));

    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

/**
 * GET /api/templates/categories
 * List all template categories
 */
router.get('/api/templates/categories', async (req, res) => {
  try {
    const categories = await db
      .select()
      .from(templateCategories)
      .orderBy(desc(templateCategories.templateCount));

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * POST /api/templates/:id/rate
 * Rate a template
 */
router.post('/api/templates/:id/rate', async (req, res) => {
  try {
    // ✅ SECURITY: Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // ✅ SECURITY: Safe access to req.user.id
    const userId = typeof req.user === 'object' && 'id' in req.user ? req.user.id : null;
    
    if (!userId) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    // Check if template exists
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Upsert rating
    const [existingRating] = await db
      .select()
      .from(templateRatings)
      .where(
        and(
          eq(templateRatings.templateId, id),
          eq(templateRatings.userId, userId)
        )
      )
      .limit(1);

    let result;
    
    if (existingRating) {
      [result] = await db
        .update(templateRatings)
        .set({ rating, review, updatedAt: new Date() })
        .where(eq(templateRatings.id, existingRating.id))
        .returning();
    } else {
      [result] = await db
        .insert(templateRatings)
        .values({
          templateId: id,
          userId,
          rating,
          review
        })
        .returning();
    }

    // Update template average rating
    const [avgRating] = await db
      .select({ avg: sql<number>`avg(${templateRatings.rating})` })
      .from(templateRatings)
      .where(eq(templateRatings.templateId, id));

    await db
      .update(templates)
      .set({ rating: Number(avgRating.avg).toFixed(1) })
      .where(eq(templates.id, id));

    res.json(result);
  } catch (error) {
    console.error('Error rating template:', error);
    res.status(500).json({ error: 'Failed to rate template' });
  }
});

/**
 * POST /api/templates/:id/use
 * Increment usage count when template is used
 */
router.post('/api/templates/:id/use', async (req, res) => {
  try {
    const { id } = req.params;

    await db
      .update(templates)
      .set({ 
        uses: sql`${templates.uses} + 1`,
        downloads: sql`${templates.downloads} + 1`
      })
      .where(eq(templates.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error('Error incrementing usage:', error);
    res.status(500).json({ error: 'Failed to update usage count' });
  }
});

/**
 * GET /api/templates/collections
 * List template collections
 */
router.get('/api/templates/collections', async (req, res) => {
  try {
    const collections = await db
      .select()
      .from(templateCollections)
      .orderBy(desc(templateCollections.isFeatured), desc(templateCollections.templateCount));

    res.json(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

/**
 * GET /api/templates/collections/:id
 * Get templates in a collection
 */
router.get('/api/templates/collections/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [collection] = await db
      .select()
      .from(templateCollections)
      .where(eq(templateCollections.id, id))
      .limit(1);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const collectionTemplatesData = await db
      .select({
        template: templates,
        order: collectionTemplates.order
      })
      .from(collectionTemplates)
      .innerJoin(templates, eq(collectionTemplates.templateId, templates.id))
      .where(eq(collectionTemplates.collectionId, id))
      .orderBy(collectionTemplates.order);

    res.json({
      ...collection,
      templates: collectionTemplatesData.map((ct: any) => ct.template)
    });
  } catch (error) {
    console.error('Error fetching collection templates:', error);
    res.status(500).json({ error: 'Failed to fetch collection templates' });
  }
});

export default router;
