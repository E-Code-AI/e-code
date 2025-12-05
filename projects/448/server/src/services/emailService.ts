import nodemailer, { Transporter } from "nodemailer";
import path from "path";
import fs from "fs";
import { promisify } from "util";

const readFileAsync = promisify(fs.readFile);

export type EmailTemplateName = "orderConfirmation" | "shippingUpdate";

export interface EmailRecipient {
  name?: string;
  email: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderDetails {
  orderId: string;
  orderDate: string;
  totalAmount: number;
  currency: string;
  items: OrderItem[];
  shippingAddress: string;
}

export interface ShippingDetails {
  orderId: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
  shippingAddress: string;
}

export interface SendOrderConfirmationParams {
  to: EmailRecipient;
  order: OrderDetails;
}

export interface SendShippingUpdateParams {
  to: EmailRecipient;
  shipping: ShippingDetails;
}

export interface EmailServiceConfig {
  fromAddress: string;
  fromName?: string;
  templatesDir: string;
  transport?: Transporter;
}

export interface EmailSendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
}

class EmailService {
  private transporter: Transporter;
  private readonly fromAddress: string;
  private readonly fromName?: string;
  private readonly templatesDir: string;

  constructor(config: EmailServiceConfig) {
    this.fromAddress = config.fromAddress;
    this.fromName = config.fromName;
    this.templatesDir = config.templatesDir;

    if (config.transport) {
      this.transporter = config.transport;
    } else {
      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (!host || !user || !pass) {
        throw new Error("SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    }
  }

  private getFromHeader(): string {
    if (this.fromName) {
      return `"undefined" <undefined>`;
    }
    return this.fromAddress;
  }

  private async loadTemplate(templateName: EmailTemplateName): Promise<string> {
    const filePath = path.join(this.templatesDir, `undefined.html`);
    try {
      const content = await readFileAsync(filePath, "utf8");
      return content;
    } catch (error) {
      throw new Error(`Failed to load email template "undefined" from undefined: undefined`);
    }
  }

  private renderTemplate(template: string, variables: Record<string, string | number | undefined>): string {
    return template.replace(/{{\s*([\w.]+)\s*}}/g, (match, key) => {
      const value = variables[key];
      if (value === undefined || value === null) {
        return "";
      }
      return String(value);
    });
  }

  private formatCurrency(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(amount);
    } catch {
      return `undefined undefined`;
    }
  }

  private buildOrderItemsHtml(items: OrderItem[], currency: string): string {
    if (!items.length) {
      return "";
    }

    const rows = items
      .map((item) => {
        const lineTotal = item.unitPrice * item.quantity;
        return `
          <tr>
            <td style="padding: 4px 8px;">undefined</td>
            <td style="padding: 4px 8px; text-align: center;">undefined</td>
            <td style="padding: 4px 8px; text-align: right;">undefined</td>
            <td style="padding: 4px 8px; text-align: right;">undefined</td>
          </tr>
        `;
      })
      .join("");

    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-top: 12px;">
        <thead>
          <tr>
            <th align="left" style="border-bottom: 1px solid #ddd; padding: 4px 8px;">Item</th>
            <th align="center" style="border-bottom: 1px solid #ddd; padding: 4px 8px;">Qty</th>
            <th align="right" style="border-bottom: 1px solid #ddd; padding: 4px 8px;">Unit Price</th>
            <th align="right" style="border-bottom: 1px solid #ddd; padding: 4px 8px;">Total</th>
          </tr>
        </thead>
        <tbody>
          undefined
        </tbody>
      </table>
    `;
  }

  private async sendEmail(params: {
    to: EmailRecipient;
    subject: string;
    html: string;
  }): Promise<EmailSendResult> {
    const toHeader = params.to.name ? `"undefined" <undefined>` : params.to.email;

    const info = await this.transporter.sendMail({
      from: this.getFromHeader(),
      to: toHeader,
      subject: params.subject,
      html: params.html,
    });

    return {
      messageId: info.messageId,
      accepted: (info.accepted as string[]) || [],
      rejected: (info.rejected as string[]) || [],
      response: info.response || "",
    };
  }

  public async sendOrderConfirmation(params: SendOrderConfirmationParams): Promise<EmailSendResult> {
    const template = await this.loadTemplate("orderConfirmation");

    const itemsHtml = this.buildOrderItemsHtml(params.order.items, params.order.currency);

    const variables: Record<string, string> = {
      customerName: params.to.name || "Customer",
      orderId: params.order.orderId,
      orderDate: params.order.orderDate,
      orderTotal: this.formatCurrency(params.order.totalAmount, params.order.currency),
      shippingAddress: params.order.shippingAddress,
      itemsTable: itemsHtml,
    };

    const html = this.renderTemplate(template, variables);

    const subject = `Order Confirmation - #undefined`;

    return this.sendEmail({
      to: params.to,
      subject,
      html,
    });
  }

  public async sendShippingUpdate(params: SendShippingUpdateParams): Promise<EmailSendResult> {
    const template = await this.loadTemplate("shippingUpdate");

    const variables: Record<string, string> = {
      customerName: params.to.name || "Customer",
      orderId: params.shipping.orderId,
      carrier: params.shipping.carrier,
      trackingNumber: params.shipping.trackingNumber,
      trackingUrl: params.shipping.trackingUrl || "",
      estimatedDeliveryDate: params.shipping.estimatedDeliveryDate || "",
      shippingAddress: params.shipping.shippingAddress,
    };

    const html = this.renderTemplate(template, variables);

    const subject = `Shipping Update - Order #undefined`;

    return this.sendEmail({
      to: params.to,
      subject,
      html,
    });
  }

  public async sendTestEmail(to: EmailRecipient, subject: string, body: string): Promise<EmailSendResult> {
    return this.sendEmail({
      to,
      subject,
      html: body,
    });
  }
}

let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    const templatesDir =
      process.env.EMAIL_TEMPLATES_DIR || path.join(process.cwd(), "server", "templates", "emails");

    const fromAddress = process.env.EMAIL_FROM_ADDRESS;
    const fromName = process.env.EMAIL_FROM_NAME;

    if (!fromAddress) {
      throw new Error("EMAIL_FROM_ADDRESS environment variable is required for EmailService.");
    }

    emailServiceInstance = new EmailService({
      fromAddress,
      fromName,
      templatesDir,
    });
  }

  return emailServiceInstance;
}

export default EmailService;