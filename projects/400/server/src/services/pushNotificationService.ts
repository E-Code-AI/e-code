import webpush, { PushSubscription, SendResult } from "web-push";
import { PrismaClient, PushSubscription as PrismaPushSubscription } from "@prisma/client";

export interface PushNotificationPayload {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[] | number;
  timestamp?: number;
  lang?: string;
  dir?: "auto" | "ltr" | "rtl";
}

export interface PushNotificationOptions {
  ttl?: number;
  urgency?: "very-low" | "low" | "normal" | "high";
  topic?: string;
}

export interface PushNotificationResult {
  successCount: number;
  failureCount: number;
  results: Array<{
    subscriptionId: string;
    endpoint: string;
    success: boolean;
    error?: string;
    statusCode?: number;
  }>;
}

export interface PushNotificationServiceConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  subject: string;
}

export class PushNotificationService {
  private prisma: PrismaClient;
  private isConfigured: boolean;

  constructor(prismaClient?: PrismaClient, config?: PushNotificationServiceConfig) {
    this.prisma = prismaClient ?? new PrismaClient();
    this.isConfigured = false;

    const vapidPublicKey =
      config?.vapidPublicKey ?? process.env.VAPID_PUBLIC_KEY ?? "";
    const vapidPrivateKey =
      config?.vapidPrivateKey ?? process.env.VAPID_PRIVATE_KEY ?? "";
    const subject = config?.subject ?? process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

    if (!vapidPublicKey || !vapidPrivateKey || !subject) {
      this.isConfigured = false;
    } else {
      webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey);
      this.isConfigured = true;
    }
  }

  public getVapidPublicKey(): string | null {
    if (!this.isConfigured) return null;
    const details = (webpush as unknown as { vapidDetails?: { publicKey?: string } }).vapidDetails;
    if (details?.publicKey) return details.publicKey;
    return process.env.VAPID_PUBLIC_KEY ?? null;
  }

  public async sendNotificationToUser(
    userId: string,
    payload: PushNotificationPayload,
    options?: PushNotificationOptions
  ): Promise<PushNotificationResult> {
    if (!this.isConfigured) {
      throw new Error("PushNotificationService is not configured with VAPID keys.");
    }

    const subscriptions = await this.getUserSubscriptions(userId);
    if (!subscriptions.length) {
      return {
        successCount: 0,
        failureCount: 0,
        results: [],
      };
    }

    return this.sendToSubscriptions(subscriptions, payload, options);
  }

  public async sendNotificationToAll(
    payload: PushNotificationPayload,
    options?: PushNotificationOptions
  ): Promise<PushNotificationResult> {
    if (!this.isConfigured) {
      throw new Error("PushNotificationService is not configured with VAPID keys.");
    }

    const subscriptions = await this.getAllSubscriptions();
    if (!subscriptions.length) {
      return {
        successCount: 0,
        failureCount: 0,
        results: [],
      };
    }

    return this.sendToSubscriptions(subscriptions, payload, options);
  }

  public async sendNotificationToSegment(
    filter: { userIds?: string[] },
    payload: PushNotificationPayload,
    options?: PushNotificationOptions
  ): Promise<PushNotificationResult> {
    if (!this.isConfigured) {
      throw new Error("PushNotificationService is not configured with VAPID keys.");
    }

    let subscriptions: PrismaPushSubscription[] = [];

    if (filter.userIds && filter.userIds.length > 0) {
      subscriptions = await this.prisma.pushSubscription.findMany({
        where: {
          userId: {
            in: filter.userIds,
          },
        },
      });
    }

    if (!subscriptions.length) {
      return {
        successCount: 0,
        failureCount: 0,
        results: [],
      };
    }

    return this.sendToSubscriptions(subscriptions, payload, options);
  }

  public async getUserSubscriptions(userId: string): Promise<PrismaPushSubscription[]> {
    return this.prisma.pushSubscription.findMany({
      where: { userId },
    });
  }

  public async getAllSubscriptions(): Promise<PrismaPushSubscription[]> {
    return this.prisma.pushSubscription.findMany();
  }

  public async addSubscription(
    userId: string,
    subscription: PushSubscription
  ): Promise<PrismaPushSubscription> {
    const existing = await this.prisma.pushSubscription.findFirst({
      where: {
        userId,
        endpoint: subscription.endpoint,
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh ?? "",
        auth: subscription.keys?.auth ?? "",
      },
    });
  }

  public async removeSubscriptionByEndpoint(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
  }

  public async removeSubscriptionById(id: string): Promise<void> {
    await this.prisma.pushSubscription.delete({
      where: { id },
    });
  }

  private async sendToSubscriptions(
    subscriptions: PrismaPushSubscription[],
    payload: PushNotificationPayload,
    options?: PushNotificationOptions
  ): Promise<PushNotificationResult> {
    const payloadString = JSON.stringify(payload);

    const results: PushNotificationResult["results"] = [];
    let successCount = 0;
    let failureCount = 0;

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSub: PushSubscription = {
        endpoint: sub.endpoint,
        expirationTime: null,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        const res: SendResult = await webpush.sendNotification(pushSub, payloadString, {
          TTL: options?.ttl,
          urgency: options?.urgency,
          topic: options?.topic,
        });

        results.push({
          subscriptionId: sub.id,
          endpoint: sub.endpoint,
          success: true,
          statusCode: res.statusCode,
        });
        successCount += 1;
      } catch (error: unknown) {
        const err = error as { statusCode?: number; body?: string; message?: string };
        const statusCode = err.statusCode;
        const message = err.body || err.message || "Unknown push notification error";

        if (statusCode === 404 || statusCode === 410) {
          await this.prisma.pushSubscription.deleteMany({
            where: { endpoint: sub.endpoint },
          });
        }

        results.push({
          subscriptionId: sub.id,
          endpoint: sub.endpoint,
          success: false,
          error: message,
          statusCode,
        });
        failureCount += 1;
      }
    });

    await Promise.all(sendPromises);

    return {
      successCount,
      failureCount,
      results,
    };
  }
}

const defaultPrisma = new PrismaClient();
export const pushNotificationService = new PushNotificationService(defaultPrisma);