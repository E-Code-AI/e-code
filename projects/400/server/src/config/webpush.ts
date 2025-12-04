import webpush, { PushSubscription, SendResult } from "web-push";

type VapidDetails = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

type WebPushConfig = {
  vapidDetails: VapidDetails;
};

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing required environment variable: undefined`);
  }
  return value;
};

const loadVapidConfig = (): WebPushConfig => {
  const publicKey = getEnv("VAPID_PUBLIC_KEY", "");
  const privateKey = getEnv("VAPID_PRIVATE_KEY", "");
  const subject =
    process.env.VAPID_SUBJECT ||
    process.env.WEB_PUSH_CONTACT ||
    "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys are not configured. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables."
    );
  }

  return {
    vapidDetails: {
      publicKey,
      privateKey,
      subject,
    },
  };
};

const webPushConfig = loadVapidConfig();

webpush.setVapidDetails(
  webPushConfig.vapidDetails.subject,
  webPushConfig.vapidDetails.publicKey,
  webPushConfig.vapidDetails.privateKey
);

export const getVapidPublicKey = (): string => webPushConfig.vapidDetails.publicKey;

export const sendWebPushNotification = async (
  subscription: PushSubscription,
  payload: string | Buffer | null,
  options?: webpush.RequestOptions
): Promise<SendResult> => {
  return webpush.sendNotification(subscription, payload ?? "", options);
};

export const isWebPushConfigured = (): boolean => {
  try {
    return Boolean(webPushConfig.vapidDetails.publicKey && webPushConfig.vapidDetails.privateKey);
  } catch {
    return false;
  }
};

export default webpush;