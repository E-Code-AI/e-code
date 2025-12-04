import { Router, Request, Response } from "express";
import webpush, { PushSubscription } from "web-push";

const pushRouter = Router();

type SubscriptionRecord = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
  userAgent?: string;
};

const subscriptions: Map<string, SubscriptionRecord> = new Map();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[pushRoutes] VAPID keys are not fully configured. Push notifications will not work correctly."
  );
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface SubscribeRequestBody {
  subscription: PushSubscription;
}

interface UnsubscribeRequestBody {
  endpoint: string;
}

pushRouter.post(
  "/subscribe",
  async (req: Request<unknown, unknown, SubscribeRequestBody>, res: Response) => {
    try {
      const { subscription } = req.body;

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({
          success: false,
          error: "Invalid subscription payload.",
        });
      }

      const record: SubscriptionRecord = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        createdAt: new Date().toISOString(),
        userAgent: req.get("User-Agent") || undefined,
      };

      subscriptions.set(subscription.endpoint, record);

      return res.status(201).json({
        success: true,
        message: "Subscription registered successfully.",
        vapidPublicKey: VAPID_PUBLIC_KEY,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[pushRoutes] Error in /subscribe:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to register subscription.",
      });
    }
  }
);

pushRouter.post(
  "/unsubscribe",
  async (req: Request<unknown, unknown, UnsubscribeRequestBody>, res: Response) => {
    try {
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({
          success: false,
          error: "Missing endpoint in request body.",
        });
      }

      const existed = subscriptions.delete(endpoint);

      return res.status(200).json({
        success: true,
        message: existed
          ? "Subscription removed successfully."
          : "Subscription not found, but treated as unsubscribed.",
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[pushRoutes] Error in /unsubscribe:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to remove subscription.",
      });
    }
  }
);

export { pushRouter };