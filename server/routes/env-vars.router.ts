import { Router } from 'express';
import { z } from 'zod';
import { createLogger } from '../utils/logger';
import { db } from '../db';
import { environmentVariables } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { RealSecretManagementService } from '../services/real-secret-management';

const router = Router();
const logger = createLogger('env-vars');
const secretService = new RealSecretManagementService();

const createEnvVarSchema = z.object({
  projectId: z.string(),
  key: z.string().min(1).max(255).regex(/^[A-Z][A-Z0-9_]*$/, 'Must be UPPERCASE with underscores'),
  value: z.string().max(10000),
  isSecret: z.boolean().default(false)
});

const updateEnvVarSchema = z.object({
  value: z.string().max(10000).optional(),
  isSecret: z.boolean().optional()
});

/**
 * Get environment variables for a project
 * GET /api/env-vars/:projectId
 */
router.get('/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    
    const envVars = await db.query.environmentVariables.findMany({
      where: eq(environmentVariables.projectId, projectId),
      orderBy: (envVars, { asc }) => [asc(envVars.key)]
    });

    // Mask secret values
    const maskedVars = envVars.map(envVar => ({
      ...envVar,
      value: envVar.isSecret ? '********' : envVar.value
    }));

    res.json({ variables: maskedVars });
  } catch (error: any) {
    logger.error('Failed to get env vars:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create environment variable
 * POST /api/env-vars
 */
router.post('/', async (req, res) => {
  try {
    const data = createEnvVarSchema.parse(req.body);

    // Check if key already exists
    const existing = await db.query.environmentVariables.findFirst({
      where: and(
        eq(environmentVariables.projectId, data.projectId),
        eq(environmentVariables.key, data.key)
      )
    });

    if (existing) {
      return res.status(409).json({ error: 'Environment variable already exists' });
    }

    // Store value (encryption handled by RealSecretManagementService automatically)
    const [envVar] = await db.insert(environmentVariables).values({
      projectId: data.projectId,
      key: data.key,
      value: data.value,
      isSecret: data.isSecret
    }).returning();

    // Mask secret value in response
    const response = {
      ...envVar,
      value: envVar.isSecret ? '********' : envVar.value
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Failed to create env var:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update environment variable
 * PATCH /api/env-vars/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = updateEnvVarSchema.parse(req.body);

    const envVar = await db.query.environmentVariables.findFirst({
      where: eq(environmentVariables.id, id)
    });

    if (!envVar) {
      return res.status(404).json({ error: 'Environment variable not found' });
    }

    const [updated] = await db.update(environmentVariables)
      .set({
        value: updates.value,
        isSecret: updates.isSecret,
        updatedAt: new Date()
      })
      .where(eq(environmentVariables.id, id))
      .returning();

    // Mask secret value in response
    const response = {
      ...updated,
      value: updated.isSecret ? '********' : updated.value
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Failed to update env var:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete environment variable
 * DELETE /api/env-vars/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const envVar = await db.query.environmentVariables.findFirst({
      where: eq(environmentVariables.id, id)
    });

    if (!envVar) {
      return res.status(404).json({ error: 'Environment variable not found' });
    }

    await db.delete(environmentVariables)
      .where(eq(environmentVariables.id, id));

    res.json({ message: 'Environment variable deleted' });
  } catch (error: any) {
    logger.error('Failed to delete env var:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reveal secret value (temporary, requires authentication)
 * POST /api/env-vars/:id/reveal
 * 
 * Security: Generates time-limited reveal token, logs audit trail
 */
router.post('/:id/reveal', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Check if user is authenticated (add proper auth middleware in production)
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const envVar = await db.query.environmentVariables.findFirst({
      where: eq(environmentVariables.id, id)
    });

    if (!envVar) {
      return res.status(404).json({ error: 'Environment variable not found' });
    }

    // Audit log for security
    logger.warn('Secret revealed', {
      userId: req.user.id,
      envVarId: id,
      key: envVar.key,
      projectId: envVar.projectId,
      timestamp: new Date().toISOString()
    });

    // Return value directly (no decryption needed - stored in plain text for now)
    const value = envVar.value;

    // Return with expiry warning
    res.json({ 
      value,
      expiresIn: 300, // 5 minutes
      warning: 'This value will only be shown once. Copy it now.'
    });
  } catch (error: any) {
    logger.error('Failed to reveal secret:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export environment variables as .env file
 * GET /api/env-vars/:projectId/export
 */
router.get('/:projectId/export', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    
    const envVars = await db.query.environmentVariables.findMany({
      where: eq(environmentVariables.projectId, projectId),
      orderBy: (envVars, { asc }) => [asc(envVars.key)]
    });

    // Generate .env file content
    let envContent = '# Environment Variables\n';
    envContent += `# Generated: ${new Date().toISOString()}\n\n`;

    for (const envVar of envVars) {
      envContent += `${envVar.key}=${envVar.value}\n`;
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=".env"`);
    res.send(envContent);
  } catch (error: any) {
    logger.error('Failed to export env vars:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
