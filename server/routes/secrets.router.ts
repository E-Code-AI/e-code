import { Router } from 'express';
import { z } from 'zod';
import { createLogger } from '../utils/logger';
import { db } from '../db';
import { environmentVariables, projects } from '@shared/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { RealSecretManagementService } from '../services/real-secret-management';
import { ensureAuthenticated } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';

const router = Router({ mergeParams: true });
const logger = createLogger('secrets');
const secretService = new RealSecretManagementService();

router.use(ensureAuthenticated);

router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return csrfProtection(req, res, next);
  }
  return next();
});

async function verifyProjectOwnership(userId: number | string, projectId: number | string): Promise<boolean> {
  try {
    const userIdNum = typeof userId === 'number' ? userId : parseInt(String(userId), 10);
    const projectIdNum = typeof projectId === 'number' ? projectId : parseInt(String(projectId), 10);
    
    if (isNaN(userIdNum) || isNaN(projectIdNum) || userIdNum <= 0 || projectIdNum <= 0) {
      return false;
    }
    
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectIdNum),
        eq(projects.ownerId, userIdNum)
      )
    });
    return !!project;
  } catch (error) {
    logger.error('Project ownership verification failed', { userId, projectId, error });
    return false;
  }
}

async function verifySecretAccess(userId: number | string, secretId: string): Promise<{ allowed: boolean; secret?: any }> {
  try {
    const userIdNum = typeof userId === 'number' ? userId : parseInt(String(userId), 10);
    
    if (isNaN(userIdNum) || userIdNum <= 0) {
      return { allowed: false };
    }
    
    const secret = await db.query.environmentVariables.findFirst({
      where: eq(environmentVariables.id, secretId)
    });
    
    if (!secret) {
      return { allowed: false };
    }
    
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, secret.projectId),
        eq(projects.ownerId, userIdNum)
      )
    });
    
    if (!project) {
      return { allowed: false };
    }
    
    return { allowed: true, secret };
  } catch (error) {
    logger.error('Secret access verification failed', { userId, secretId, error });
    return { allowed: false };
  }
}

const createSecretSchema = z.object({
  key: z.string().min(1).max(255).regex(/^[A-Z][A-Z0-9_]*$/, 'Must be UPPERCASE with underscores'),
  value: z.string().max(10000),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  isSecret: z.boolean().default(true)
});

const updateSecretSchema = z.object({
  value: z.string().max(10000).optional(),
  environment: z.enum(['development', 'staging', 'production']).optional(),
  isSecret: z.boolean().optional()
});

router.get('/', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user?.id;
    const environment = req.query.environment as string | undefined;
    const search = req.query.search as string | undefined;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const isOwner = await verifyProjectOwnership(userId, projectId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const projectIdNum = parseInt(projectId, 10);
    
    let conditions = [eq(environmentVariables.projectId, projectIdNum)];
    
    if (environment && environment !== 'all') {
      conditions.push(eq(environmentVariables.environment, environment));
    }
    
    const secrets = await db.query.environmentVariables.findMany({
      where: and(...conditions),
      orderBy: (vars, { asc }) => [asc(vars.key)]
    });
    
    let filteredSecrets = secrets;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSecrets = secrets.filter(s => s.key.toLowerCase().includes(searchLower));
    }

    const maskedSecrets = filteredSecrets.map(secret => ({
      ...secret,
      value: secret.isSecret ? '********' : secret.value
    }));

    res.json({ secrets: maskedSecrets });
  } catch (error: any) {
    logger.error('Failed to get secrets:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = req.user?.id;
    const data = createSecretSchema.parse(req.body);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const isOwner = await verifyProjectOwnership(userId, projectId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const projectIdNum = parseInt(projectId, 10);
    
    const existing = await db.query.environmentVariables.findFirst({
      where: and(
        eq(environmentVariables.projectId, projectIdNum),
        eq(environmentVariables.key, data.key),
        eq(environmentVariables.environment, data.environment)
      )
    });

    if (existing) {
      return res.status(409).json({ error: 'Secret already exists for this environment' });
    }

    let valueToStore = data.value;
    if (data.isSecret) {
      const encrypted = (secretService as any).encrypt(data.value);
      valueToStore = JSON.stringify(encrypted);
    }

    const [secret] = await db.insert(environmentVariables).values({
      projectId: projectIdNum,
      key: data.key,
      value: valueToStore,
      environment: data.environment,
      isSecret: data.isSecret
    }).returning();

    const response = {
      ...secret,
      value: secret.isSecret ? '********' : secret.value
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Failed to create secret:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const updates = updateSecretSchema.parse(req.body);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { allowed, secret } = await verifySecretAccess(userId, id);
    if (!allowed || !secret) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    const isSecretFlag = updates.isSecret ?? secret.isSecret;
    let valueToStore = updates.value;
    const valueProvided = updates.value !== undefined;
    
    if (secret.isSecret && updates.isSecret === false && !valueProvided) {
      try {
        const encryptedData = JSON.parse(secret.value);
        valueToStore = (secretService as any).decrypt(encryptedData);
      } catch (error) {
        return res.status(500).json({ error: 'Failed to downgrade secret' });
      }
    } else if (!secret.isSecret && updates.isSecret === true && !valueProvided) {
      const encrypted = (secretService as any).encrypt(secret.value);
      valueToStore = JSON.stringify(encrypted);
    } else if (valueProvided && isSecretFlag) {
      const encrypted = (secretService as any).encrypt(valueToStore!);
      valueToStore = JSON.stringify(encrypted);
    } else if (!valueProvided) {
      valueToStore = secret.value;
    }

    const [updated] = await db.update(environmentVariables)
      .set({
        value: valueToStore,
        environment: updates.environment ?? secret.environment,
        isSecret: isSecretFlag,
        updatedAt: new Date()
      })
      .where(eq(environmentVariables.id, id))
      .returning();

    const response = {
      ...updated,
      value: updated.isSecret ? '********' : updated.value
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Failed to update secret:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { allowed, secret } = await verifySecretAccess(userId, id);
    if (!allowed || !secret) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    await db.delete(environmentVariables)
      .where(eq(environmentVariables.id, id));

    res.json({ message: 'Secret deleted' });
  } catch (error: any) {
    logger.error('Failed to delete secret:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/reveal', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { allowed, secret } = await verifySecretAccess(userId, id);
    if (!allowed || !secret) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    let value = secret.value;
    if (secret.isSecret) {
      try {
        const encryptedData = JSON.parse(secret.value);
        value = (secretService as any).decrypt(encryptedData);
      } catch (error) {
        return res.status(500).json({ error: 'Failed to decrypt secret' });
      }
    }

    logger.warn('Secret revealed', {
      userId,
      secretId: id,
      key: secret.key,
      projectId: secret.projectId
    });

    res.json({ 
      value,
      expiresIn: 60
    });
  } catch (error: any) {
    logger.error('Failed to reveal secret:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
