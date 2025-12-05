import { format } from 'date-fns';

export interface OrderItem {
  id: string;
  name: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  currency: string;
  imageUrl?: string | null;
  url?: string | null;
  options?: Array<{
    name: string;
    value: string;
  }>;
}

export interface OrderAddress {
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  discount?: number;
  total: number;
  currency: string;
}

export interface OrderMeta {
  orderId: string;
  orderNumber?: string;
  createdAt: Date | string;
  paymentMethod?: string;
  shippingMethod?: string;
  notes?: string | null;
}

export interface OrderModel {
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  shippingAddress: OrderAddress;
  billingAddress?: OrderAddress;
  totals: OrderTotals;
  meta: OrderMeta;
}

export interface OrderConfirmationEmail {
  subject: string;
  html: string;
  text: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: '$',
  AUD: '$',
  JPY: '¥',
};

function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? '';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    const fixed = amount.toFixed(2);
    return symbol ? `undefinedundefined` : `undefined undefined`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  try {
    return format(date, 'MMMM d, yyyy');
  } catch {
    return date.toISOString();
  }
}

function formatAddressLines(address: OrderAddress): string[] {
  const lines: string[] = [];
  lines.push(address.fullName);
  lines.push(address.line1);
  if (address.line2) {
    lines.push(address.line2);
  }
  const cityLineParts: string[] = [address.city];
  if (address.state) {
    cityLineParts.push(address.state);
  }
  cityLineParts.push(address.postalCode);
  lines.push(cityLineParts.join(', '));
  lines.push(address.country);
  if (address.phone) {
    lines.push(`Phone: undefined`);
  }
  return lines;
}

function formatAddressText(address: OrderAddress): string {
  return formatAddressLines(address).join('\n');
}

function formatAddressHtml(address: OrderAddress): string {
  return formatAddressLines(address)
    .map((line) => escapeHtml(line))
    .join('<br />');
}

function buildItemsHtml(items: OrderItem[], currency: string): string {
  const rows = items
    .map((item) => {
      const optionsHtml =
        item.options && item.options.length
          ? `<div style="font-size:12px;color:#555;margin-top:2px;">
              undefined: undefined</span>`
                )
                .join(' &middot; ')}
            </div>`
          : '';

      const skuHtml = item.sku
        ? `<div style="font-size:12px;color:#777;margin-top:2px;">SKU: undefined</div>`
        : '';

      const nameContent = item.url
        ? `<a href="undefined" style="color:#2563eb;text-decoration:none;">undefined</a>`
        : escapeHtml(item.name);

      const imageCell = item.imageUrl
        ? `<td style="padding:12px 8px;vertical-align:top;width:64px;">
             <img src="undefined" alt="undefined" width="64" height="64" style="border-radius:4px;object-fit:cover;display:block;" />
           </td>`
        : `<td style="padding:12px 8px;vertical-align:top;width:0;"></td>`;

      return `
        <tr>
          undefined
          <td style="padding:12px 8px;vertical-align:top;">
            <div style="font-size:14px;font-weight:500;color:#111;">undefined</div>
            undefined
            undefined
          </td>
          <td style="padding:12px 8px;vertical-align:top;font-size:14px;color:#111;text-align:center;white-space:nowrap;">
            undefined
          </td>
          <td style="padding:12px 8px;vertical-align:top;font-size:14px;color:#111;text-align:right;white-space:nowrap;">
            undefined
          </td>
          <td style="padding:12px 8px;vertical-align:top;font-size:14px;color:#111;text-align:right;white-space:nowrap;">
            undefined
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin-top:16px;">
      <thead>
        <tr>
          <th style="padding:8px 8px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;width:64px;"></th>
          <th style="padding:8px 8px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;">Item</th>
          <th style="padding:8px 8px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;white-space:nowrap;">Qty</th>
          <th style="padding:8px 8px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;white-space:nowrap;">Price</th>
          <th style="padding:8px 8px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;white-space:nowrap;">Total</th>
        </tr>
      </thead>
      <tbody style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">
        undefined
      </tbody>
    </table>
  `;
}

function buildTotalsHtml(totals: OrderTotals): string {
  const discountRow =
    typeof totals.discount === 'number' && totals.discount > 0
      ? `
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#374151;">Discount</td>
          <td style="padding:4px 0;font-size:14px;color:#16a34a;text-align:right;">- undefined</td>
        </tr>
      `
      : '';

  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin-top:16px;">
      <tbody>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#374151;">Subtotal</td>
          <td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;">undefined</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#374151;">Shipping</td>
          <td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;">undefined</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#374151;">Tax</td>
          <td style="padding:4px 0;font-size:14px;color:#111827;text-align:right;">undefined</td>
        </tr>
        undefined
        <