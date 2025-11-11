import * as admin from 'firebase-admin';

export interface FCMNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  clickAction?: string;
}

export class FCMService {
  private initialized = false;
  private app?: admin.app.App;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      
      if (!serviceAccountJson) {
        console.warn('[FCMService] FIREBASE_SERVICE_ACCOUNT_JSON not configured. Push notifications disabled.');
        return;
      }

      const serviceAccount = JSON.parse(serviceAccountJson);

      if (!admin.apps.length) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        this.app = admin.app();
      }

      this.initialized = true;
    } catch (error) {
      console.error('[FCMService] Failed to initialize Firebase Admin SDK:', error);
      console.warn('[FCMService] Push notifications will not work. Set FIREBASE_SERVICE_ACCOUNT_JSON environment variable.');
    }
  }

  async sendToDevice(
    deviceToken: string,
    notification: FCMNotificationPayload
  ): Promise<boolean> {
    if (!this.initialized || !this.app) {
      console.warn('[FCMService] Cannot send notification - service not initialized');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        token: deviceToken,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl
        },
        data: notification.data,
        android: {
          priority: 'high',
          notification: {
            clickAction: notification.clickAction,
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      return true;
    } catch (error) {
      console.error('[FCMService] Error sending notification:', error);
      return false;
    }
  }

  async sendToMultipleDevices(
    deviceTokens: string[],
    notification: FCMNotificationPayload
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.initialized || !this.app) {
      console.warn('[FCMService] Cannot send notifications - service not initialized');
      return { successCount: 0, failureCount: deviceTokens.length };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: deviceTokens,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl
        },
        data: notification.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      return {
        successCount: response.successCount,
        failureCount: response.failureCount
      };
    } catch (error) {
      console.error('[FCMService] Error sending batch notifications:', error);
      return { successCount: 0, failureCount: deviceTokens.length };
    }
  }

  async sendToTopic(
    topic: string,
    notification: FCMNotificationPayload
  ): Promise<boolean> {
    if (!this.initialized || !this.app) {
      console.warn('[FCMService] Cannot send notification - service not initialized');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl
        },
        data: notification.data
      };

      const response = await admin.messaging().send(message);
      return true;
    } catch (error) {
      console.error('[FCMService] Error sending topic notification:', error);
      return false;
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.initialized || !this.app) {
      console.warn('[FCMService] Cannot subscribe to topic - service not initialized');
      return;
    }

    try {
      await admin.messaging().subscribeToTopic(tokens, topic);
    } catch (error) {
      console.error('[FCMService] Error subscribing to topic:', error);
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    if (!this.initialized || !this.app) {
      console.warn('[FCMService] Cannot unsubscribe from topic - service not initialized');
      return;
    }

    try {
      await admin.messaging().unsubscribeFromTopic(tokens, topic);
    } catch (error) {
      console.error('[FCMService] Error unsubscribing from topic:', error);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const fcmService = new FCMService();
