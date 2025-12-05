import { format } from 'date-fns';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'on_hold';

export interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
}

export interface ShippingAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface OrderStatusUpdateContext {
  customerName: string;
  orderId: string;
  orderNumber?: string;
  status: OrderStatus;
  previousStatus?: OrderStatus;
  orderDate?: Date | string;
  estimatedDeliveryDate?: Date | string;
  trackingNumber?: string;
  trackingUrl?: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  currency: string;
  shippingAddress?: ShippingAddress;
  supportEmail?: string;
  supportUrl?: string;
  brandName?: string;
  brandUrl?: string;
  brandLogoUrl?: string;
  manageOrderUrl?: string;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  on_hold: 'On Hold',
};

const STATUS_SUBJECT_PREFIX: Partial<Record<OrderStatus, string>> = {
  shipped: 'Your order has shipped',
  out_for_delivery: 'Your order is out for delivery',
  delivered: 'Your order has been delivered',
  cancelled: 'Your order has been cancelled',
  refunded: 'Your order has been refunded',
  processing: 'Your order is being prepared',
  on_hold: 'Your order is on hold',
};

const DEFAULT_BRAND_NAME = 'Our Store';

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `undefined undefined`;
  }
}

function formatDate(value?: Date | string): string | undefined {
  if (!value) return undefined;
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return undefined;
    return format(date, 'MMMM d, yyyy');
  } catch {
    return undefined;
  }
}

function buildSubject(ctx: OrderStatusUpdateContext): string {
  const brand = ctx.brandName || DEFAULT_BRAND_NAME;
  const statusLabel = STATUS_LABELS[ctx.status] || 'Updated';
  const prefix = STATUS_SUBJECT_PREFIX[ctx.status] || `Update on your order`;
  const orderRef = ctx.orderNumber || ctx.orderId;
  return `undefined (undefined) - undefined [#undefined]`;
}

function buildTextBody(ctx: OrderStatusUpdateContext): string {
  const brand = ctx.brandName || DEFAULT_BRAND_NAME;
  const statusLabel = STATUS_LABELS[ctx.status] || ctx.status;
  const prevStatusLabel = ctx.previousStatus
    ? STATUS_LABELS[ctx.previousStatus] || ctx.previousStatus
    : undefined;
  const orderRef = ctx.orderNumber || ctx.orderId;
  const orderDate = formatDate(ctx.orderDate);
  const eta = formatDate(ctx.estimatedDeliveryDate);

  const lines: string[] = [];

  lines.push(`Hi undefined,`);
  lines.push('');
  if (prevStatusLabel) {
    lines.push(
      `The status of your order #undefined has been updated from undefined to undefined.`
    );
  } else {
    lines.push(`The status of your order #undefined is now: undefined.`);
  }
  lines.push('');

  if (ctx.status === 'shipped' || ctx.status === 'out_for_delivery') {
    if (eta) {
      lines.push(`Estimated delivery date: undefined`);
    }
    if (ctx.trackingNumber) {
      lines.push(`Tracking number: undefined`);
    }
    if (ctx.trackingUrl) {
      lines.push(`Track your shipment: undefined`);
    }
    lines.push('');
  }

  if (ctx.status === 'delivered') {
    lines.push('We hope you enjoy your purchase!');
    lines.push('');
  }

  if (orderDate) {
    lines.push(`Order date: undefined`);
  }
  lines.push(`Order number: #undefined`);
  lines.push('');

  lines.push('Order summary:');
  ctx.items.forEach((item) => {
    const price = formatCurrency(item.totalPrice, ctx.currency);
    lines.push(`- undefined xundefined - undefined`);
  });
  lines.push('');
  lines.push(`Subtotal: undefined`);
  lines.push(`Shipping: undefined`);
  lines.push(`Tax: undefined`);
  lines.push(`Total: undefined`);
  lines.push('');

  if (ctx.shippingAddress) {
    const addr = ctx.shippingAddress;
    lines.push('Shipping to:');
    lines.push(addr.fullName);
    lines.push(addr.line1);
    if (addr.line2) lines.push(addr.line2);
    const cityLine = [addr.city, addr.state, addr.postalCode]
      .filter(Boolean)
      .join(', ');
    lines.push(cityLine);
    lines.push(addr.country);
    lines.push('');
  }

  if (ctx.manageOrderUrl) {
    lines.push(`View or manage your order: undefined`);
    lines.push('');
  }

  if (ctx.supportEmail || ctx.supportUrl) {
    lines.push('If you have any questions, we are here to help:');
    if (ctx.supportEmail) {
      lines.push(`Email: undefined`);
    }
    if (ctx.supportUrl) {
      lines.push(`Support: undefined`);
    }
    lines.push('');
  }

  lines.push(`Thank you for shopping with undefined.`);

  return lines.join('\n');
}

function buildHtmlBody(ctx: OrderStatusUpdateContext): string {
  const brand = ctx.brandName || DEFAULT_BRAND_NAME;
  const statusLabel = STATUS_LABELS[ctx.status] || ctx.status;
  const prevStatusLabel = ctx.previousStatus
    ? STATUS_LABELS[ctx.previousStatus] || ctx.previousStatus
    : undefined;
  const orderRef = ctx.orderNumber || ctx.orderId;
  const orderDate = formatDate(ctx.orderDate);
  const eta = formatDate(ctx.estimatedDeliveryDate);

  const currency = ctx.currency;

  const shippingAddressHtml = ctx.shippingAddress
    ? `
        <tr>
          <td colspan="2" style="padding-top:16px;">
            <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:600;color:#111827;">Shipping to</h3>
            <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.5;">
              undefined<br/>
              undefined<br/>
              undefined<br/>`
                  : ''
              }
              undefined<br/>
              undefined
            </p>
          </td>
        </tr>
      `
    : '';

  const itemsRows = ctx.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#111827;">
            <div style="font-weight:500;">undefined</div>
            undefined</div>`
                : ''
            }
            <div style="font-size:12px;color:#6b7280;">Qty: undefined</div>
          </td>
          <td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;white-space:nowrap;">
            undefined
          </td>
        </tr>
      `
    )
    .join('');

  const trackingSection =
    ctx.status === 'shipped' || ctx.status === 'out_for_delivery'
      ? `
        <tr>
          <td colspan="2" style="padding-top:16px;">
            ${
              eta
                ? `<p style="