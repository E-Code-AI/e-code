import { Router, Request, Response } from 'express';
import { and, eq, inArray } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { environmentVariables } from '@shared/schema';
import { storage } from '../storage';
import { getJwtSecret } from '../utils/secrets-manager';
import { csrfProtection } from '../middleware/csrf';
import { RealSecretManagementService } from '../services/real-secret-management';

const router = Router();
const secretService = new RealSecretManagementService();

type CatalogEntry = {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  envVarKeys: string[];
  connectorType: 'oauth' | 'apikey' | 'managed';
  connectionLevel: 'account' | 'project';
  oauthConfig?: { authUrl: string; tokenUrl: string; scopes: string[] } | null;
  providerUrl?: string | null;
};

const integrationCatalog: CatalogEntry[] = [
  {
    id: 'github',
    name: 'GitHub',
    category: 'Developer Tools',
    description: 'Link repositories, automation, and CI workflows.',
    icon: 'github',
    envVarKeys: ['GITHUB_TOKEN'],
    connectorType: 'apikey',
    connectionLevel: 'project',
    providerUrl: 'https://github.com/settings/tokens',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'AI & Media',
    description: 'Use OpenAI APIs inside generated apps and agents.',
    icon: 'sparkles',
    envVarKeys: ['OPENAI_API_KEY'],
    connectorType: 'apikey',
    connectionLevel: 'project',
    providerUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    category: 'Backend Services',
    description: 'Connect auth, database, and storage.',
    icon: 'database',
    envVarKeys: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
    connectorType: 'apikey',
    connectionLevel: 'project',
    providerUrl: 'https://supabase.com/dashboard',
  },
  {
    id: 'neon',
    name: 'Neon',
    category: 'Database',
    description: 'Use managed Postgres for your project.',
    icon: 'database',
    envVarKeys: ['DATABASE_URL'],
    connectorType: 'apikey',
    connectionLevel: 'project',
    providerUrl: 'https://console.neon.tech',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Payments',
    description: 'Accept payments and subscriptions.',
    icon: 'credit-card',
    envVarKeys: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'],
    connectorType: 'apikey',
    connectionLevel: 'project',
    providerUrl: 'https://dashboard.stripe.com/apikeys',
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'Communication',
    description: 'Send notifications and workflow alerts.',
    icon: 'message-square',
    envVarKeys: ['SLACK_BOT_TOKEN'],
    connectorType: 'apikey',
    connectionLevel: 'project',
    providerUrl: 'https://api.slack.com/apps',
  },
  {
    id: 'resend',
    name: 'Resend',
    category: 'Communication',
    description: 'Transactional email delivery.',
    icon: 'mail',
    envVarKeys: ['RESEND_API_KEY'],
    connectorType: 'apikey',
    connectionLevel: 'project',
    providerUrl: 'https://resend.com/api-keys',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'Communication',
    description: 'Email delivery and webhooks.',
    icon: 'send',
    envVarKeys: ['SENDGRID_API_KEY'],
    connectorType: 'apikey',
    connectionLevel: 'project',
    providerUrl: 'https://app.sendgrid.com/settings/api_keys',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    category: 'Communication',
    description: 'SMS, voice, and telephony APIs.',
    icon: 'phone',
    envVarKeys: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'],
    connectorType: 'apikey',
    connectionLevel: 'project',
    providerUrl: 'https://console.twilio.com',
  },
  {
    id: 'figma',
    name: 'Figma',
    category: 'Design',
    description: 'Consume design files and tokens.',
    icon: 'figma',
    envVarKeys: ['FIGMA_ACCESS_TOKEN'],
    connectorType: 'apikey',
    connectionLevel: 'project',
    providerUrl: 'https://www.figma.com/developers/api',
  },
];

function serializeCatalogEntry(entry: CatalogEntry) {
  return {
    ...entry,
    oauthConfig: entry.oauthConfig ?? null,
    providerUrl: entry.providerUrl ?? null,
  };
}

async function ensureIntegrationAccess(req: Request, res: Response, next: any) {
  const projectId = String(req.params.projectId || '').trim();
  const bootstrapToken = req.query.bootstrap || req.headers['x-bootstrap-token'];
  const sessionUserId = (req as any).user?.id;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const project = await storage.getProject(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (bootstrapToken) {
    try {
      const decoded = jwt.verify(String(bootstrapToken), getJwtSecret()) as { projectId: string | number; userId?: number };
      if (String(decoded.projectId) !== String(project.id)) {
        return res.status(403).json({ error: 'Bootstrap token invalid for this project' });
      }
      (req as any).bootstrapAuth = decoded;
      req.params.projectId = String(project.id);
      return next();
    } catch (error: any) {
      return res.status(401).json({ error: error?.message || 'Invalid or expired bootstrap token' });
    }
  }

  if (!sessionUserId) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }

  if (project.ownerId === sessionUserId) {
    req.params.projectId = String(project.id);
    return next();
  }

  const collaborators = await storage.getProjectCollaborators(String(project.id));
  const isCollaborator = collaborators.some((c: any) => c.userId === sessionUserId);
  if (!isCollaborator) {
    return res.status(403).json({ error: 'Access denied' });
  }

  req.params.projectId = String(project.id);
  return next();
}

router.use('/projects/:projectId/integrations', ensureIntegrationAccess);
router.use('/projects/:projectId/integrations', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !(req as any).bootstrapAuth) {
    return csrfProtection(req, res, next);
  }
  return next();
});

router.get('/integrations/catalog', async (_req, res) => {
  res.json(integrationCatalog.map(serializeCatalogEntry));
});

router.get('/user/connections', async (_req, res) => {
  res.json([]);
});

router.get('/projects/:projectId/integrations', async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const projectVars = await db.query.environmentVariables.findMany({
      where: eq(environmentVariables.projectId, projectId),
    });

    const connected = integrationCatalog
      .map((entry) => {
        const matched = projectVars.filter((envVar) => entry.envVarKeys.includes(envVar.key));
        if (matched.length === 0) return null;

        const hasAllKeys = entry.envVarKeys.every((key) => matched.some((envVar) => envVar.key === key));
        const connectedAt = matched
          .map((envVar) => envVar.updatedAt ?? envVar.createdAt)
          .filter(Boolean)
          .sort((a, b) => new Date(b as any).getTime() - new Date(a as any).getTime())[0];

        return {
          id: entry.id,
          projectId: String(projectId),
          integrationId: entry.id,
          status: hasAllKeys ? 'connected' : 'error',
          config: Object.fromEntries(entry.envVarKeys.map((key) => [key, '********'])),
          connectedAt: (connectedAt ?? new Date()).toISOString(),
          integration: serializeCatalogEntry(entry),
        };
      })
      .filter(Boolean);

    res.json(connected);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to load integrations' });
  }
});

router.get('/projects/:projectId/integrations/:integrationId/logs', async (req, res) => {
  const entry = integrationCatalog.find((item) => item.id === req.params.integrationId);
  if (!entry) {
    return res.status(404).json({ error: 'Integration not found' });
  }

  const now = new Date().toISOString();
  res.json([
    {
      id: `${entry.id}-status`,
      level: 'info',
      message: `Integration ${entry.name} is configured for project ${req.params.projectId}`,
      createdAt: now,
    },
  ]);
});

router.post('/projects/:projectId/integrations', async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const { integrationId, config } = req.body || {};
    const entry = integrationCatalog.find((item) => item.id === integrationId);

    if (!entry) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Integration config is required' });
    }

    const missingKeys = entry.envVarKeys.filter((key) => !String(config[key] ?? '').trim());
    if (missingKeys.length > 0) {
      return res.status(400).json({ error: `Missing required keys: ${missingKeys.join(', ')}` });
    }

    const existing = await db.query.environmentVariables.findMany({
      where: and(
        eq(environmentVariables.projectId, projectId),
        inArray(environmentVariables.key, entry.envVarKeys),
      ),
    });

    const encryptedValues = new Map<string, string>();
    for (const key of entry.envVarKeys) {
      encryptedValues.set(key, JSON.stringify((secretService as any).encrypt(String(config[key]))));
    }

    for (const key of entry.envVarKeys) {
      const found = existing.find((item) => item.key === key);
      const value = encryptedValues.get(key)!;
      if (found) {
        await db.update(environmentVariables)
          .set({ value, isSecret: true, environment: 'development', updatedAt: new Date() })
          .where(eq(environmentVariables.id, found.id));
      } else {
        await db.insert(environmentVariables).values({
          projectId,
          key,
          value,
          isSecret: true,
          environment: 'development',
        });
      }
    }

    res.status(201).json({
      id: entry.id,
      projectId: String(projectId),
      integrationId: entry.id,
      status: 'connected',
      config: Object.fromEntries(entry.envVarKeys.map((key) => [key, '********'])),
      connectedAt: new Date().toISOString(),
      integration: serializeCatalogEntry(entry),
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to connect integration' });
  }
});

router.delete('/projects/:projectId/integrations/:integrationId', async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const entry = integrationCatalog.find((item) => item.id === req.params.integrationId);
    if (!entry) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    await db.delete(environmentVariables).where(and(
      eq(environmentVariables.projectId, projectId),
      inArray(environmentVariables.key, entry.envVarKeys),
    ));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to disconnect integration' });
  }
});

router.post('/projects/:projectId/integrations/oauth/start', async (req, res) => {
  const { integrationId } = req.body || {};
  const entry = integrationCatalog.find((item) => item.id === integrationId);
  if (!entry) {
    return res.status(404).json({ error: 'Integration not found' });
  }

  if (entry.connectorType !== 'oauth' || !entry.providerUrl) {
    return res.status(400).json({ error: 'OAuth is not configured for this integration' });
  }

  res.json({
    authUrl: entry.providerUrl,
    state: `${entry.id}:${req.params.projectId}`,
  });
});

router.post('/projects/:projectId/integrations/:integrationId/test', async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const entry = integrationCatalog.find((item) => item.id === req.params.integrationId);
    if (!entry) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const envVars = await db.query.environmentVariables.findMany({
      where: and(
        eq(environmentVariables.projectId, projectId),
        inArray(environmentVariables.key, entry.envVarKeys),
      ),
    });

    const hasAllKeys = entry.envVarKeys.every((key) => envVars.some((envVar) => envVar.key === key));
    res.json({
      success: hasAllKeys,
      message: hasAllKeys
        ? `${entry.name} credentials are configured for this project`
        : `Missing one or more required credentials: ${entry.envVarKeys.join(', ')}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error?.message || 'Connection test failed' });
  }
});

export default router;
