import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sendMock = vi.fn().mockResolvedValue('projects/test/messages/123');
const sendEachForMulticastMock = vi.fn().mockResolvedValue({
  successCount: 1,
  failureCount: 0,
  responses: [{ success: true }]
});

vi.mock('firebase-admin', () => ({
  default: {
    apps: [],
    initializeApp: vi.fn().mockReturnValue({}),
    app: vi.fn().mockReturnValue({}),
    credential: { cert: vi.fn().mockReturnValue({}) },
    messaging: vi.fn().mockReturnValue({
      send: sendMock,
      sendEachForMulticast: sendEachForMulticastMock,
      subscribeToTopic: vi.fn().mockResolvedValue({}),
      unsubscribeFromTopic: vi.fn().mockResolvedValue({})
    })
  },
  apps: [],
  initializeApp: vi.fn().mockReturnValue({}),
  app: vi.fn().mockReturnValue({}),
  credential: { cert: vi.fn().mockReturnValue({}) },
  messaging: vi.fn().mockReturnValue({
    send: sendMock,
    sendEachForMulticast: sendEachForMulticastMock,
    subscribeToTopic: vi.fn().mockResolvedValue({}),
    unsubscribeFromTopic: vi.fn().mockResolvedValue({})
  })
}));

interface MockTokenRecord {
  id: number;
  userId: number;
  token: string;
  platform: string;
  deviceId: string | null;
  lastSeen: Date;
  createdAt: Date;
}

const tokenStore: MockTokenRecord[] = [];

const mockDb = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([])
    })
  }),
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 1, title: 'Deploy Complete', body: 'Deployed!', type: 'deployment_complete' }])
    })
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([])
    })
  }),
  delete: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([])
  })
};

vi.mock('../server/db', () => ({ db: mockDb }));

vi.mock('@shared/schema', () => ({
  deviceTokens: { userId: 'user_id', token: 'token', id: 'id', platform: 'platform' },
  pushNotifications: { id: 'id', userId: 'user_id' },
  mobileDevices: {},
  users: {},
  projects: {}
}));

vi.mock('../server/storage', () => ({
  storage: {
    getUser: vi.fn().mockResolvedValue({ id: 42, username: 'testuser', email: 'test@test.com' }),
    getUserByEmail: vi.fn().mockResolvedValue({ id: 42, username: 'testuser' })
  }
}));

vi.mock('../server/ai/ai-service', () => ({ aiService: {} }));
vi.mock('../server/ai/ai-provider-manager', () => ({ aiProviderManager: {} }));
vi.mock('../server/services/mobile-container-service', () => ({
  mobileContainerService: {}
}));
vi.mock('../server/utils/secrets-manager', () => ({
  getJwtSecret: () => 'test-jwt-secret-key-for-testing',
  getJwtRefreshSecret: () => 'test-jwt-refresh-secret-key'
}));
vi.mock('../server/middleware/custom-rate-limiter', () => ({
  mobileOAuthRateLimiter: ((_req: Record<string, unknown>, _res: Record<string, unknown>, next: () => void) => next())
}));
vi.mock('../server/utils/bcrypt-compat', () => ({
  default: { compare: vi.fn(), hash: vi.fn() }
}));

describe('FCM Push Notifications', () => {
  const FIREBASE_CREDS = JSON.stringify({
    project_id: 'test-project',
    client_email: 'test@test.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n'
  });

  beforeEach(() => {
    vi.clearAllMocks();
    tokenStore.length = 0;
    sendMock.mockResolvedValue('projects/test/messages/123');
    sendEachForMulticastMock.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }]
    });
  });

  afterEach(() => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  });

  describe('FCMService', () => {
    it('should initialize when FIREBASE_SERVICE_ACCOUNT_JSON is set', async () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON = FIREBASE_CREDS;

      const admin = await import('firebase-admin');
      const { FCMService } = await import('../server/integrations/fcm-service');
      const service = new FCMService();

      expect(service.isInitialized()).toBe(true);
      expect(admin.initializeApp).toHaveBeenCalled();
    });

    it('should send notification to a single device with correct payload', async () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON = FIREBASE_CREDS;

      const admin = await import('firebase-admin');
      const { FCMService } = await import('../server/integrations/fcm-service');
      const service = new FCMService();

      const result = await service.sendToDevice('test-token-123', {
        title: 'Deploy Complete',
        body: 'Your project "MyApp" has been deployed successfully.'
      });

      expect(result.success).toBe(true);
      expect(result.token).toBe('test-token-123');
      expect(admin.messaging().send).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'test-token-123',
          notification: expect.objectContaining({
            title: 'Deploy Complete',
            body: 'Your project "MyApp" has been deployed successfully.'
          })
        })
      );
    });

    it('should handle stale token errors by removing from database', async () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON = FIREBASE_CREDS;

      sendMock.mockRejectedValueOnce({
        code: 'messaging/registration-token-not-registered',
        message: 'Token not registered'
      });

      const { FCMService } = await import('../server/integrations/fcm-service');
      const service = new FCMService();

      const result = await service.sendToDevice('stale-token', {
        title: 'Test',
        body: 'Test notification'
      });

      expect(result.success).toBe(false);
      expect(result.staleToken).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should send to multiple devices and handle mixed results', async () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON = FIREBASE_CREDS;

      sendEachForMulticastMock.mockResolvedValueOnce({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true },
          { success: false, error: { code: 'messaging/registration-token-not-registered', message: 'not registered' } }
        ]
      });

      const { FCMService } = await import('../server/integrations/fcm-service');
      const service = new FCMService();

      const result = await service.sendToMultipleDevices(
        ['token-1', 'stale-token-2'],
        { title: 'Deploy Complete', body: 'Deployed!' }
      );

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].staleToken).toBe(true);
    });

    it('should return failure when not initialized', async () => {
      delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

      const { FCMService } = await import('../server/integrations/fcm-service');
      const service = new FCMService();

      const result = await service.sendToDevice('some-token', {
        title: 'Test',
        body: 'Will not send'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('FCM not initialized');
    });
  });

  describe('Integration: register token via HTTP → trigger deploy → assert FCM', () => {
    it('should register a device token via POST /mobile/device-token, then send deploy notification through the full pipeline', async () => {
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON = FIREBASE_CREDS;

      const mockToken = 'fcm-device-token-integration-test-12345';
      const userId = 42;

      const registeredToken: MockTokenRecord = {
        id: 1, userId, token: mockToken, platform: 'android',
        deviceId: 'device-001', lastSeen: new Date(), createdAt: new Date()
      };

      mockDb.select.mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockImplementation(async () => {
            return tokenStore.filter(t => t.userId === userId || t.token === mockToken);
          })
        }))
      }));

      mockDb.insert.mockImplementation(() => ({
        values: vi.fn().mockImplementation((values: Record<string, unknown>) => {
          const isTokenInsert = typeof values.token === 'string' && values.token === mockToken;
          if (isTokenInsert) {
            tokenStore.push(registeredToken);
          }
          return {
            returning: vi.fn().mockImplementation(async () => {
              if (isTokenInsert) {
                return [registeredToken];
              }
              return [{ id: 99, userId, title: 'Deploy Complete', body: 'deployed', type: 'deployment_complete', sent: false }];
            })
          };
        })
      }));

      const express = (await import('express')).default;
      const supertest = (await import('supertest')).default;

      const app = express();
      app.use(express.json());

      app.use((req, _res, next) => {
        req.user = { id: userId, username: 'testuser', email: 'test@test.com' } as Express.User;
        req.isAuthenticated = () => true;
        next();
      });

      const { deviceTokens } = await import('@shared/schema');
      const { db } = await import('../server/db');
      const { eq } = await import('drizzle-orm');

      app.post('/mobile/device-token', async (req, res) => {
        const reqUserId = (req.user as { id: number }).id;
        const { token, platform, deviceId } = req.body;

        if (!token || typeof token !== 'string') {
          return res.status(400).json({ error: 'token is required' });
        }
        if (!platform || !['android', 'ios', 'web'].includes(platform)) {
          return res.status(400).json({ error: 'platform must be android, ios, or web' });
        }

        const [existing] = await db
          .select()
          .from(deviceTokens)
          .where(eq(deviceTokens.token, token));

        if (existing) {
          await db
            .update(deviceTokens)
            .set({ platform, deviceId: deviceId || null, lastSeen: new Date() })
            .where(eq(deviceTokens.id, existing.id));
        } else {
          await db
            .insert(deviceTokens)
            .values({ userId: reqUserId, token, platform, deviceId: deviceId || null });
        }

        res.json({ success: true });
      });

      const registerResponse = await supertest(app)
        .post('/mobile/device-token')
        .send({ token: mockToken, platform: 'android', deviceId: 'device-001' })
        .expect(200);

      expect(registerResponse.body.success).toBe(true);
      expect(tokenStore).toHaveLength(1);
      expect(tokenStore[0].token).toBe(mockToken);

      sendEachForMulticastMock.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }]
      });

      vi.doUnmock('../server/api/mobile-app-service');
      vi.resetModules();

      const { notifyDeployComplete } = await import('../server/services/notification-events');
      await notifyDeployComplete(userId, 'TestApp', 'https://testapp.e-code.ai');

      const admin = await import('firebase-admin');
      expect(admin.messaging().sendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: [mockToken],
          notification: expect.objectContaining({
            title: 'Deploy Complete',
            body: expect.stringContaining('TestApp')
          }),
          data: expect.objectContaining({
            type: 'deployment_complete',
            actionUrl: 'https://testapp.e-code.ai',
            projectName: 'TestApp',
            url: 'https://testapp.e-code.ai'
          })
        })
      );
    });

    it('should reject device token registration with missing token', async () => {
      const express = (await import('express')).default;
      const supertest = (await import('supertest')).default;

      const app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        req.user = { id: 42, username: 'testuser' } as Express.User;
        req.isAuthenticated = () => true;
        next();
      });

      app.post('/mobile/device-token', async (req, res) => {
        const { token, platform } = req.body;
        if (!token || typeof token !== 'string') {
          return res.status(400).json({ error: 'token is required' });
        }
        if (!platform || !['android', 'ios', 'web'].includes(platform)) {
          return res.status(400).json({ error: 'platform must be android, ios, or web' });
        }
        res.json({ success: true });
      });

      const res = await supertest(app)
        .post('/mobile/device-token')
        .send({ platform: 'android' })
        .expect(400);

      expect(res.body.error).toBe('token is required');
    });

    it('should reject device token registration with invalid platform', async () => {
      const express = (await import('express')).default;
      const supertest = (await import('supertest')).default;

      const app = express();
      app.use(express.json());
      app.use((req, _res, next) => {
        req.user = { id: 42, username: 'testuser' } as Express.User;
        req.isAuthenticated = () => true;
        next();
      });

      app.post('/mobile/device-token', async (req, res) => {
        const { token, platform } = req.body;
        if (!token || typeof token !== 'string') {
          return res.status(400).json({ error: 'token is required' });
        }
        if (!platform || !['android', 'ios', 'web'].includes(platform)) {
          return res.status(400).json({ error: 'platform must be android, ios, or web' });
        }
        res.json({ success: true });
      });

      const res = await supertest(app)
        .post('/mobile/device-token')
        .send({ token: 'valid-token', platform: 'blackberry' })
        .expect(400);

      expect(res.body.error).toBe('platform must be android, ios, or web');
    });
  });

  describe('Notification Events', () => {
    it('should export all notification event functions', async () => {
      vi.mock('../server/api/mobile-app-service', () => ({
        mobileAppService: {
          sendPushNotification: vi.fn().mockResolvedValue({
            notification: { id: 1 },
            deliveryResults: [],
            deviceCount: 0
          })
        }
      }));

      const { notifyDeployComplete, notifyCollaborationInvite, notifyPaymentFailed } =
        await import('../server/services/notification-events');

      expect(typeof notifyDeployComplete).toBe('function');
      expect(typeof notifyCollaborationInvite).toBe('function');
      expect(typeof notifyPaymentFailed).toBe('function');
    });

    it('notifyDeployComplete should call sendPushNotification with deploy data', async () => {
      const mockSendPush = vi.fn().mockResolvedValue({
        notification: { id: 1 },
        deliveryResults: [],
        deviceCount: 1
      });

      vi.doMock('../server/api/mobile-app-service', () => ({
        mobileAppService: { sendPushNotification: mockSendPush }
      }));

      vi.resetModules();
      const { notifyDeployComplete } = await import('../server/services/notification-events');

      await notifyDeployComplete(42, 'TestApp', 'https://testapp.e-code.ai');

      expect(mockSendPush).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 42,
          title: 'Deploy Complete',
          body: expect.stringContaining('TestApp'),
          type: 'deployment_complete',
          actionUrl: 'https://testapp.e-code.ai'
        })
      );
    });

    it('notifyCollaborationInvite should call sendPushNotification with invite data', async () => {
      const mockSendPush = vi.fn().mockResolvedValue({
        notification: { id: 2 },
        deliveryResults: [],
        deviceCount: 1
      });

      vi.doMock('../server/api/mobile-app-service', () => ({
        mobileAppService: { sendPushNotification: mockSendPush }
      }));

      vi.resetModules();
      const { notifyCollaborationInvite } = await import('../server/services/notification-events');

      await notifyCollaborationInvite(43, 'Alice', 'SharedProject');

      expect(mockSendPush).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 43,
          title: 'Collaboration Invite',
          body: expect.stringContaining('Alice'),
          type: 'collaboration_invite'
        })
      );
    });

    it('notifyPaymentFailed should call sendPushNotification with payment data', async () => {
      const mockSendPush = vi.fn().mockResolvedValue({
        notification: { id: 3 },
        deliveryResults: [],
        deviceCount: 1
      });

      vi.doMock('../server/api/mobile-app-service', () => ({
        mobileAppService: { sendPushNotification: mockSendPush }
      }));

      vi.resetModules();
      const { notifyPaymentFailed } = await import('../server/services/notification-events');

      await notifyPaymentFailed(44, 'Card declined');

      expect(mockSendPush).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 44,
          title: 'Payment Failed',
          body: 'Card declined',
          type: 'payment_failed'
        })
      );
    });
  });
});
