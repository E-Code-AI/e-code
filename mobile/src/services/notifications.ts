/**
 * Push Notifications Service
 * Handles registration, permissions, and notification management for E-Code mobile app
 * 
 * Requires: expo-notifications, expo-device, expo-constants
 * Install: npx expo install expo-notifications expo-device
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PUSH_TOKEN_STORAGE_KEY = 'ecode.mobile.pushToken';
const NOTIFICATIONS_ENABLED_KEY = 'ecode.mobile.notificationsEnabled';

export interface PushNotificationConfig {
  serverUrl: string;
  userId?: string;
  token?: string;
}

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private isInitialized: boolean = false;
  private config: PushNotificationConfig | null = null;

  /**
   * Initialize the notification service
   * Call this at app startup after user authentication
   */
  async initialize(config: PushNotificationConfig): Promise<boolean> {
    this.config = config;

    try {
      // Check if notifications module is available
      const notificationsAvailable = await this.checkNotificationsAvailable();
      if (!notificationsAvailable) {
        console.log('[Notifications] expo-notifications not available - skipping initialization');
        return false;
      }

      // Request permissions and get token
      const token = await this.registerForPushNotifications();
      
      if (token) {
        this.expoPushToken = token;
        await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
        
        // Send token to server if authenticated
        if (config.userId && config.token) {
          await this.sendTokenToServer(token, config.userId, config.token);
        }
        
        this.isInitialized = true;
        console.log('[Notifications] Initialized successfully with token:', token.substring(0, 20) + '...');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Notifications] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Check if expo-notifications is available (lazy load)
   */
  private async checkNotificationsAvailable(): Promise<boolean> {
    try {
      // Dynamic import to avoid crash if not installed
      await import('expo-notifications');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Register for push notifications and return the Expo push token
   */
  private async registerForPushNotifications(): Promise<string | null> {
    try {
      const Notifications = await import('expo-notifications');
      const Device = await import('expo-device');
      const Constants = await import('expo-constants');

      // Must use physical device for push notifications
      if (!Device.isDevice) {
        console.log('[Notifications] Push notifications require a physical device');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted');
        return null;
      }

      // Get the Expo push token
      const projectId = Constants.default.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      // Configure notification behavior for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'E-Code Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#38bdf8',
        });
      }

      return tokenData.data;
    } catch (error) {
      console.error('[Notifications] Failed to register:', error);
      return null;
    }
  }

  /**
   * Send the push token to the E-Code server for backend notifications
   */
  private async sendTokenToServer(
    pushToken: string, 
    userId: string, 
    authToken: string
  ): Promise<void> {
    if (!this.config?.serverUrl) {
      console.warn('[Notifications] No server URL configured');
      return;
    }

    try {
      const response = await fetch(`${this.config.serverUrl}/api/users/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          userId,
          pushToken,
          platform: Platform.OS,
          deviceType: Platform.OS === 'ios' ? 'ios' : 'android',
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      console.log('[Notifications] Push token sent to server');
    } catch (error) {
      console.error('[Notifications] Failed to send token to server:', error);
    }
  }

  /**
   * Add a listener for incoming notifications (foreground)
   */
  async addNotificationReceivedListener(
    callback: (notification: any) => void
  ): Promise<(() => void) | null> {
    try {
      const Notifications = await import('expo-notifications');
      const subscription = Notifications.addNotificationReceivedListener(callback);
      return () => subscription.remove();
    } catch {
      return null;
    }
  }

  /**
   * Add a listener for notification responses (user tapped)
   */
  async addNotificationResponseListener(
    callback: (response: any) => void
  ): Promise<(() => void) | null> {
    try {
      const Notifications = await import('expo-notifications');
      const subscription = Notifications.addNotificationResponseReceivedListener(callback);
      return () => subscription.remove();
    } catch {
      return null;
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    notification: NotificationData,
    trigger?: { seconds: number }
  ): Promise<string | null> {
    try {
      const Notifications = await import('expo-notifications');
      
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
        },
        trigger: trigger || null,
      });

      return id;
    } catch (error) {
      console.error('[Notifications] Failed to schedule notification:', error);
      return null;
    }
  }

  /**
   * Cancel all pending notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      const Notifications = await import('expo-notifications');
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('[Notifications] Failed to cancel notifications:', error);
    }
  }

  /**
   * Get the current push token
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
      return enabled !== 'false';
    } catch {
      return true;
    }
  }

  /**
   * Enable/disable notifications
   */
  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled.toString());
  }

  /**
   * Clear stored push token (on logout)
   */
  async clearToken(): Promise<void> {
    this.expoPushToken = null;
    this.isInitialized = false;
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
