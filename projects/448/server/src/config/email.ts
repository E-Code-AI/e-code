import nodemailer, { Transporter } from "nodemailer";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromAddress: string;
  fromName?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM_ADDRESS,
  EMAIL_FROM_NAME,
  NODE_ENV,
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM_ADDRESS) {
  throw new Error(
    "Email configuration error: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM_ADDRESS must be set in environment variables."
  );
}

const emailConfig: EmailConfig = {
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_SECURE === "true" || SMTP_PORT === "465",
  user: SMTP_USER,
  pass: SMTP_PASS,
  fromAddress: EMAIL_FROM_ADDRESS,
  fromName: EMAIL_FROM_NAME,
};

const transporter: Transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: {
    user: emailConfig.user,
    pass: emailConfig.pass,
  },
});

if (NODE_ENV !== "production") {
  transporter
    .verify()
    .then(() => {
      // Transporter is ready
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Error verifying email transporter:", err);
    });
}

export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const { to, subject, text, html, cc, bcc, replyTo } = options;

  if (!text && !html) {
    throw new Error("sendEmail: Either text or html content must be provided.");
  }

  const from = emailConfig.fromName
    ? `"undefined" <undefined>`
    : emailConfig.fromAddress;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
    cc,
    bcc,
    replyTo,
  });
};

export const getEmailTransporter = (): Transporter => transporter;

export default {
  config: emailConfig,
  transporter,
  sendEmail,
};