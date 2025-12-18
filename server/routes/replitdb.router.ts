import { Router, Request, Response } from 'express';
import { replitDB } from '../database/replitdb';

const replitdbRouter = Router();

/**
 * ReplDB-Compatible Key-Value Database API
 * 
 * Provides Replit-compatible database access for user code running in containers.
 * Environment variable REPLIT_DB_URL points to this API.
 * 
 * API Format: /api/db/:projectId
 * 
 * Operations:
 * - GET /api/db/:projectId/:key - Get value for key
 * - GET /api/db/:projectId?prefix=... - List keys with optional prefix
 * - POST /api/db/:projectId/:key - Set value for key (body = value)
 * - DELETE /api/db/:projectId/:key - Delete key
 */

// GET /api/db/:projectId - List all keys (with optional prefix filter)
replitdbRouter.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).send('Invalid project ID');
    }

    const prefix = req.query.prefix as string | undefined;
    const keys = await replitDB.keys(projectId, prefix);
    
    // Return keys as newline-separated list (Replit format)
    res.type('text/plain').send(keys.join('\n'));
  } catch (error) {
    console.error('ReplitDB list error:', error);
    res.status(500).send('Internal server error');
  }
});

// GET /api/db/:projectId/:key - Get value for key
replitdbRouter.get('/:projectId/:key', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).send('Invalid project ID');
    }

    const key = req.params.key;
    const value = await replitDB.get(projectId, key);
    
    if (value === undefined) {
      return res.status(404).send('Key not found');
    }
    
    // Return value as JSON string (Replit format)
    res.type('text/plain').send(typeof value === 'string' ? value : JSON.stringify(value));
  } catch (error) {
    console.error('ReplitDB get error:', error);
    res.status(500).send('Internal server error');
  }
});

// POST /api/db/:projectId/:key - Set value for key
replitdbRouter.post('/:projectId/:key', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).send('Invalid project ID');
    }

    const key = req.params.key;
    
    // Get value from request body (text or JSON)
    let value: any;
    if (typeof req.body === 'string') {
      value = req.body;
    } else if (typeof req.body === 'object') {
      value = req.body;
    } else {
      value = String(req.body);
    }
    
    await replitDB.set(projectId, key, value);
    res.status(200).send('OK');
  } catch (error) {
    console.error('ReplitDB set error:', error);
    res.status(500).send('Internal server error');
  }
});

// DELETE /api/db/:projectId/:key - Delete key
replitdbRouter.delete('/:projectId/:key', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).send('Invalid project ID');
    }

    const key = req.params.key;
    const deleted = await replitDB.delete(projectId, key);
    
    if (deleted) {
      res.status(200).send('OK');
    } else {
      res.status(404).send('Key not found');
    }
  } catch (error) {
    console.error('ReplitDB delete error:', error);
    res.status(500).send('Internal server error');
  }
});

// POST /api/db/:projectId - Bulk set (Replit extension)
replitdbRouter.post('/:projectId', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).send('Invalid project ID');
    }

    const data = req.body;
    if (typeof data !== 'object' || data === null) {
      return res.status(400).send('Body must be a JSON object');
    }

    for (const [key, value] of Object.entries(data)) {
      await replitDB.set(projectId, key, value);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('ReplitDB bulk set error:', error);
    res.status(500).send('Internal server error');
  }
});

// DELETE /api/db/:projectId - Clear all keys for project
replitdbRouter.delete('/:projectId', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).send('Invalid project ID');
    }

    await replitDB.clear(projectId);
    res.status(200).send('OK');
  } catch (error) {
    console.error('ReplitDB clear error:', error);
    res.status(500).send('Internal server error');
  }
});

export { replitdbRouter };
