import { Request, Response } from "express";
import webpush, { PushSubscription } from "web-push";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { getPrismaClient } from "../db/prismaClient";
import { logger } from "../utils/logger";

const prisma = getPrismaClient();

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

const notificationPayloadSchema = z.object({
  title: z.string(),
  body: z.string().optional(),
  icon: z.string().url().optional(),
  image: z.string().url().optional(),
  badge: z.string().url().optional(),
  data: z.record(z.unknown()).optional(),
  actions: z
    .array(
      z.object({
        action: z.string(),
        title: z.string(),
        icon: z.string().url().optional(),
      })
    )
    .optional(),
  tag: z.string().optional(),
  requireInteraction: z.boolean().optional(),
  renotify: z.boolean().optional(),
  silent: z.boolean().optional(),
});

const sendNotificationSchema = z.object({
  userId: z.string().optional(),
  subscriptionId: z.string().optional(),
  payload: notificationPayloadSchema,
});

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  logger.warn("VAPID keys are not fully configured. Push notifications may not work.");
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export const getVapidPublicKey = async (_req: Request, res: Response): Promise<void> => {
  if (!VAPID_PUBLIC_KEY) {
    res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      error: "VAPID public key is not configured",
    });
    return;
  }

  res.status(StatusCodes.OK).json({ publicKey: VAPID_PUBLIC_KEY });
};

export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = subscriptionSchema.safeParse(req.body?.subscription ?? req.body);
    if (!parseResult.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: "Invalid subscription payload",
        details: parseResult.error.flatten(),
      });
      return;
    }

    const subscription: PushSubscription = parseResult.data as unknown as PushSubscription;
    const userId: string | null = typeof req.body?.userId === "string" ? req.body.userId : null;

    const existing = await prisma.pushSubscription.findFirst({
      where: {
        endpoint: subscription.endpoint,
        userId: userId ?? undefined,
      },
    });

    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          subscription: subscription as unknown as object,
          updatedAt: new Date(),
        },
      });

      res.status(StatusCodes.OK).json({
        message: "Subscription updated",
        subscriptionId: existing.id,
      });
      return;
    }

    const created = await prisma.pushSubscription.create({
      data: {
        endpoint: subscription.endpoint,
        subscription: subscription as unknown as object,
        userId: userId ?? undefined,
      },
    });

    res.status(StatusCodes.CREATED).json({
      message: "Subscription created",
      subscriptionId: created.id,
    });
  } catch (error) {
    logger.error({ error }, "Failed to save push subscription");
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Failed to save subscription",
    });
  }
};

export const unsubscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const endpoint: string | undefined = req.body?.endpoint;
    const subscriptionId: string | undefined = req.body?.subscriptionId;

    if (!endpoint && !subscriptionId) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: "Either endpoint or subscriptionId is required",
      });
      return;
    }

    if (subscriptionId) {
      await prisma.pushSubscription.deleteMany({
        where: { id: subscriptionId },
      });
    } else if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint },
      });
    }

    res.status(StatusCodes.OK).json({ message: "Unsubscribed successfully" });
  } catch (error) {
    logger.error({ error }, "Failed to unsubscribe");
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Failed to unsubscribe",
    });
  }
};

export const sendNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = sendNotificationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: "Invalid notification payload",
        details: parseResult.error.flatten(),
      });
      return;
    }

    const { userId, subscriptionId, payload } = parseResult.data;

    if (!userId && !subscriptionId) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: "Either userId or subscriptionId is required",
      });
      return;
    }

    const whereClause: { id?: string; userId?: string } = {};
    if (subscriptionId) whereClause.id = subscriptionId;
    if (userId) whereClause.userId = userId;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: whereClause,
    });

    if (!subscriptions.length) {
      res.status(StatusCodes.NOT_FOUND).json({
        error: "No subscriptions found for target",
      });
      return;
    }

    const notificationPayload = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const subscription = sub.subscription as unknown as PushSubscription;
          await webpush.sendNotification(subscription, notificationPayload);
          return { id: sub.id, success: true as const };
        } catch (err: any) {
          logger.warn(
            {
              error: err,
              subscriptionId: sub.id,
              statusCode: err?.statusCode,
            },
            "Failed to send push notification"
          );

          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          }

          return { id: sub.id, success: false as const, error: err?.message ?? "Unknown error" };
        }
      })
    );

    const summary = results.reduce(
      (acc, r) => {
        if (r.status === "fulfilled") {
          if (r.value.success) {
            acc.sent.push(r.value.id);
          } else {
            acc.failed.push({ id: r.value.id, error: r.value.error });
          }
        } else {
          acc.failed.push({ id: "unknown", error: r.reason?.message ?? "Unknown error" });
        }
        return acc;
      },
      { sent: [] as string[], failed: [] as { id: string; error: string }[] }
    );

    res.status(StatusCodes.OK).json({
      message: "Notification processing completed",
      ...summary,
    });
  } catch (error) {
    logger.error({ error }, "Failed to send notification");
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Failed to send notification",
    });
  }
};

export const broadcastNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = notificationPayloadSchema.safeParse(req.body?.payload ?? req.body);
    if (!parseResult.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        error: "Invalid notification payload",
        details: parseResult.error.flatten(),
      });
      return;
    }

    const payload = parseResult.data;
    const notificationPayload = JSON.stringify(payload);

    const subscriptions = await prisma.pushSubscription.findMany();

    if (!subscriptions.length) {
      res.status(StatusCodes.NOT_FOUND).json({
        error: "No subscriptions available for broadcast",
      });
      return;
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const subscription = sub.subscription as unknown as PushSubscription;
          await webpush.sendNotification(subscription, notificationPayload);
          return { id: sub.id, success: true as const };
        } catch (err: any) {
          logger.warn(
            {
              error: err,
              subscriptionId: sub.id,
              statusCode: err?.statusCode,
            },
            "Failed to send broadcast push notification"
          );

          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          }

          return { id: sub.id, success: false as const, error: err?.message ?? "Unknown error" };
        }
      })
    );

    const summary = results.reduce(
      (acc, r) => {
        if (r.status