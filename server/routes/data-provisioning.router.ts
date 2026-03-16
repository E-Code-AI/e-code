/**
 * Data Provisioning Router for E-Code Platform
 * Handles test data generation, seeding, and import/export
 */

import { Router, Request, Response } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { dataProvisioningService } from '../data/data-provisioning-service';
import { storage } from '../storage';
import type { DataSchema, DataProvisioningConfig } from '../data/data-provisioning-service';

const router = Router();

// SECURITY FIX: Maximum records to prevent resource exhaustion
const MAX_GENERATE_COUNT = 10_000;

/**
 * SECURITY FIX: Verify project ownership before data operations
 */
async function verifyProjectOwnership(projectId: string | number, userId: number): Promise<{ valid: boolean; error?: string }> {
  const project = await storage.getProject(projectId);
  if (!project) return { valid: false, error: 'Project not found' };
  if (project.ownerId !== userId) return { valid: false, error: 'Access denied: You do not own this project' };
  return { valid: true };
}

/**
 * Generate test data based on schema
 * POST /generate
 */
router.post('/generate', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { schema, count } = req.body;

    if (!schema || !schema.tableName || !schema.fields) {
      return res.status(400).json({
        error: 'Schema with tableName and fields is required'
      });
    }

    // SECURITY FIX: Validate and cap the count parameter
    const rawCount = typeof count === 'number' ? count : 50;
    if (rawCount < 1 || rawCount > MAX_GENERATE_COUNT) {
      return res.status(400).json({
        error: `Count must be between 1 and ${MAX_GENERATE_COUNT}`
      });
    }
    const recordCount = Math.min(Math.max(rawCount, 1), MAX_GENERATE_COUNT);

    const generatedData = await dataProvisioningService.generateData(
      schema as DataSchema,
      recordCount
    );

    res.json({
      success: true,
      data: generatedData,
      message: `Generated ${generatedData.records} records for ${generatedData.table}`
    });
  } catch (error: any) {
    console.error('Error generating data:', error);
    res.status(500).json({
      error: 'Failed to generate data',
      details: error.message
    });
  }
});

/**
 * Seed database with predefined data sets
 * POST /seed
 */
router.post('/seed', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId, seedType } = req.body;

    if (!projectId || !seedType) {
      return res.status(400).json({
        error: 'projectId and seedType are required'
      });
    }

    // SECURITY FIX: Verify user owns the project before seeding
    const ownership = await verifyProjectOwnership(projectId, userId);
    if (!ownership.valid) {
      return res.status(403).json({ error: ownership.error });
    }

    const validSeedTypes = ['ecommerce', 'blog', 'saas'];
    if (!validSeedTypes.includes(seedType)) {
      return res.status(400).json({
        error: `Invalid seed type. Must be one of: ${validSeedTypes.join(', ')}`
      });
    }

    await dataProvisioningService.seedDatabase(projectId, seedType);

    res.json({
      success: true,
      message: `Database seeded with ${seedType} data`,
      projectId,
      seedType
    });
  } catch (error: any) {
    console.error('Error seeding database:', error);
    res.status(500).json({
      error: 'Failed to seed database',
      details: error.message
    });
  }
});

/**
 * Import data from various sources
 * POST /import
 */
router.post('/import', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const config: DataProvisioningConfig = req.body;

    if (!config.projectId || !config.type || !config.source) {
      return res.status(400).json({
        error: 'projectId, type, and source are required'
      });
    }

    const importedData = await dataProvisioningService.importData(config);

    res.json({
      success: true,
      data: importedData,
      message: `Data imported successfully from ${config.source}`
    });
  } catch (error: any) {
    console.error('Error importing data:', error);
    res.status(500).json({
      error: 'Failed to import data',
      details: error.message
    });
  }
});

/**
 * Create data fixtures for testing
 * POST /fixtures
 */
router.post('/fixtures', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { projectId, fixtureName } = req.body;

    if (!projectId) {
      return res.status(400).json({
        error: 'projectId is required'
      });
    }

    const name = fixtureName || 'test';
    await dataProvisioningService.createFixtures(projectId, name);

    res.json({
      success: true,
      message: `Fixtures created: ${name}`,
      projectId,
      fixtureName: name
    });
  } catch (error: any) {
    console.error('Error creating fixtures:', error);
    res.status(500).json({
      error: 'Failed to create fixtures',
      details: error.message
    });
  }
});

/**
 * Migrate data between schemas/formats
 * POST /migrate
 */
router.post('/migrate', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const config: DataProvisioningConfig = req.body;

    if (!config.projectId || !config.options?.sourceTable || !config.options?.targetTable) {
      return res.status(400).json({
        error: 'projectId, sourceTable, and targetTable are required'
      });
    }

    await dataProvisioningService.migrateData(config);

    res.json({
      success: true,
      message: `Data migrated from ${config.options.sourceTable} to ${config.options.targetTable}`
    });
  } catch (error: any) {
    console.error('Error migrating data:', error);
    res.status(500).json({
      error: 'Failed to migrate data',
      details: error.message
    });
  }
});

/**
 * Get available seed types and templates
 * GET /templates
 */
router.get('/templates', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const templates = {
      seedTypes: [
        {
          type: 'ecommerce',
          description: 'E-commerce data with products and customers',
          tables: ['products', 'customers'],
          recordsPerTable: 50
        },
        {
          type: 'blog',
          description: 'Blog data with posts',
          tables: ['posts'],
          recordsPerTable: 50
        },
        {
          type: 'saas',
          description: 'SaaS data with users and organizations',
          tables: ['users', 'organizations'],
          recordsPerTable: 50
        }
      ],
      fixtureTypes: [
        { type: 'auth', description: 'Authentication fixtures with test users' },
        { type: 'test', description: 'Generic test data' }
      ],
      importSources: ['csv', 'json', 'sql', 'api'],
      dataTypes: ['string', 'number', 'boolean', 'date', 'email', 'uuid', 'json', 'custom']
    };

    res.json({
      success: true,
      templates
    });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      error: 'Failed to fetch templates',
      details: error.message
    });
  }
});

export default router;
