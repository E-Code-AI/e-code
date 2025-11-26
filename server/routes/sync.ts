/**
 * Multi-Device Sync API
 * Synchronizes user preferences, workspace state, and settings across devices
 * 
 * ✅ 40-YEAR SENIOR SECURITY FIX:
 * All sync endpoints require authentication - user data must be protected
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { ensureAuthenticated } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { storage } from '../storage';
import { createLogger } from '../utils/logger';

const logger = createLogger('sync');

const router = Router();

/**
 * SECURITY: All sync routes require authentication
 * Workspace state, preferences, and device info are sensitive user data
 */
router.use(ensureAuthenticated);

/**
 * CSRF protection for all mutating operations (PUT, POST, DELETE)
 */
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return csrfProtection(req, res, next);
  }
  return next();
});

// Type definitions
interface WorkspaceState {
  openFiles: Array<{ projectId: number; fileId: number; path: string; cursorPosition?: { line: number; column: number } }>;
  activeProjectId: number | null;
  activeFileId: number | null;
  breakpoints: Record<string, Array<{ line: number; enabled: boolean }>>;
  editorLayout: {
    splitMode: 'single' | 'vertical' | 'horizontal';
    panelSizes: number[];
    visiblePanels: string[];
  };
  terminalState: {
    tabs: Array<{ id: string; cwd: string; history: string[] }>;
    activeTabId: string | null;
  };
  lastModified: number;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  autoSave: boolean;
  autoSaveDelay: number;
  minimap: boolean;
  lineNumbers: boolean;
  wordWrap: boolean;
  keyboardShortcuts: Record<string, string>;
  aiPreferences: {
    defaultModel: string;
    autoComplete: boolean;
    inlineSuggestions: boolean;
  };
  notifications: {
    enabled: boolean;
    desktop: boolean;
    sound: boolean;
    emailDigest: boolean;
  };
  lastModified: number;
}

interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  platform: string;
  lastSyncAt: number;
}

// ============================================================
// WORKSPACE STATE SYNC
// ============================================================

/**
 * GET /api/sync/workspace
 * Get current workspace state for the user
 */
router.get('/workspace', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = String(req.user.id);

    // Get workspace state from storage (using dynamic intelligence settings as storage)
    const settings = await storage.getDynamicIntelligenceSettings(userId);

    const workspaceState: WorkspaceState = settings?.workspaceState || {
      openFiles: [],
      activeProjectId: null,
      activeFileId: null,
      breakpoints: {},
      editorLayout: {
        splitMode: 'single',
        panelSizes: [50, 50],
        visiblePanels: ['editor', 'terminal'],
      },
      terminalState: {
        tabs: [],
        activeTabId: null,
      },
      lastModified: Date.now(),
    };

    res.json(workspaceState);
  } catch (error) {
    console.error('[Sync] Failed to get workspace state:', error);
    res.status(500).json({ error: 'Failed to get workspace state' });
  }
});

/**
 * PUT /api/sync/workspace
 * Update workspace state
 */
router.put('/workspace', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const workspaceState: Partial<WorkspaceState> = req.body;

    // Validate workspace state
    if (!workspaceState) {
      return res.status(400).json({ error: 'Workspace state is required' });
    }

    // Get current settings
    const settings = await storage.getDynamicIntelligenceSettings(userId);

    // Merge with existing state
    const updatedState: WorkspaceState = {
      ...settings.workspaceState,
      ...workspaceState,
      lastModified: Date.now(),
    };

    // Save to storage
    await storage.updateDynamicIntelligenceSettings(userId, {
      workspaceState: updatedState,
    });

    console.log(`[Sync] Workspace state updated for user ${userId}`);

    res.json({ success: true, workspaceState: updatedState });
  } catch (error) {
    console.error('[Sync] Failed to update workspace state:', error);
    res.status(500).json({ error: 'Failed to update workspace state' });
  }
});

// ============================================================
// USER PREFERENCES SYNC
// ============================================================

/**
 * GET /api/sync/preferences
 * Get user preferences
 */
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;

    // Get preferences from storage
    const settings = await storage.getDynamicIntelligenceSettings(userId);

    const preferences: UserPreferences = settings.userPreferences || {
      theme: 'dark',
      fontSize: 14,
      fontFamily: 'Monaco, monospace',
      tabSize: 2,
      autoSave: true,
      autoSaveDelay: 1000,
      minimap: true,
      lineNumbers: true,
      wordWrap: false,
      keyboardShortcuts: {},
      aiPreferences: {
        defaultModel: settings.defaultModel || 'claude-sonnet-4-5-20250929',
        autoComplete: true,
        inlineSuggestions: true,
      },
      notifications: {
        enabled: true,
        desktop: true,
        sound: false,
        emailDigest: false,
      },
      lastModified: Date.now(),
    };

    res.json(preferences);
  } catch (error) {
    console.error('[Sync] Failed to get preferences:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

/**
 * PUT /api/sync/preferences
 * Update user preferences
 */
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const preferences: Partial<UserPreferences> = req.body;

    if (!preferences) {
      return res.status(400).json({ error: 'Preferences are required' });
    }

    // Get current settings
    const settings = await storage.getDynamicIntelligenceSettings(userId);

    // Merge with existing preferences
    const updatedPreferences: UserPreferences = {
      ...settings.userPreferences,
      ...preferences,
      lastModified: Date.now(),
    };

    // Save to storage
    await storage.updateDynamicIntelligenceSettings(userId, {
      userPreferences: updatedPreferences,
    });

    console.log(`[Sync] Preferences updated for user ${userId}`);

    res.json({ success: true, preferences: updatedPreferences });
  } catch (error) {
    console.error('[Sync] Failed to update preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ============================================================
// DEVICE MANAGEMENT
// ============================================================

/**
 * GET /api/sync/devices
 * Get list of devices for the user
 */
router.get('/devices', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;

    // Get devices from storage
    const settings = await storage.getDynamicIntelligenceSettings(userId);

    const devices: DeviceInfo[] = settings.devices || [];

    res.json(devices);
  } catch (error) {
    console.error('[Sync] Failed to get devices:', error);
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

/**
 * POST /api/sync/devices
 * Register a new device
 */
router.post('/devices', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const { deviceName, deviceType, platform } = req.body;

    if (!deviceName || !deviceType || !platform) {
      return res.status(400).json({ error: 'Device info is required' });
    }

    const deviceId = crypto.randomUUID();

    const newDevice: DeviceInfo = {
      deviceId,
      deviceName,
      deviceType,
      platform,
      lastSyncAt: Date.now(),
    };

    // Get current settings
    const settings = await storage.getDynamicIntelligenceSettings(userId);

    const devices = settings.devices || [];
    devices.push(newDevice);

    // Save to storage
    await storage.updateDynamicIntelligenceSettings(userId, { devices });

    console.log(`[Sync] Device registered for user ${userId}:`, deviceName);

    res.json({ success: true, device: newDevice });
  } catch (error) {
    console.error('[Sync] Failed to register device:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

/**
 * PUT /api/sync/devices/:deviceId
 * Update device last sync time
 */
router.put('/devices/:deviceId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const { deviceId } = req.params;

    // Get current settings
    const settings = await storage.getDynamicIntelligenceSettings(userId);

    const devices = settings.devices || [];
    const device = devices.find((d: DeviceInfo) => d.deviceId === deviceId);

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    device.lastSyncAt = Date.now();

    // Save to storage
    await storage.updateDynamicIntelligenceSettings(userId, { devices });

    res.json({ success: true, device });
  } catch (error) {
    console.error('[Sync] Failed to update device:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

/**
 * DELETE /api/sync/devices/:deviceId
 * Remove a device
 */
router.delete('/devices/:deviceId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;
    const { deviceId } = req.params;

    // Get current settings
    const settings = await storage.getDynamicIntelligenceSettings(userId);

    const devices = (settings.devices || []).filter((d: DeviceInfo) => d.deviceId !== deviceId);

    // Save to storage
    await storage.updateDynamicIntelligenceSettings(userId, { devices });

    console.log(`[Sync] Device removed for user ${userId}:`, deviceId);

    res.json({ success: true });
  } catch (error) {
    console.error('[Sync] Failed to remove device:', error);
    res.status(500).json({ error: 'Failed to remove device' });
  }
});

// ============================================================
// SYNC STATUS
// ============================================================

/**
 * GET /api/sync/status
 * Get sync status and last sync times
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;

    // Get all sync data
    const settings = await storage.getDynamicIntelligenceSettings(userId);

    const status = {
      workspaceLastModified: settings.workspaceState?.lastModified || null,
      preferencesLastModified: settings.userPreferences?.lastModified || null,
      devicesCount: (settings.devices || []).length,
      lastSyncAt: Math.max(
        settings.workspaceState?.lastModified || 0,
        settings.userPreferences?.lastModified || 0
      ),
    };

    res.json(status);
  } catch (error) {
    console.error('[Sync] Failed to get sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

export default router;
