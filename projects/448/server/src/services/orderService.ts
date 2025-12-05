import { PrismaClient, Order, OrderStatus, PaymentStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { paymentService } from './paymentService';
import { inventoryService } from './inventoryService';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { CartItem, Cart } from '../types/cart';
import { UserContext } from '../types/auth';
import { PaymentMethod, PaymentIntentResult } from '../types/payment';
import { InventoryReservationResult } from '../types/inventory';

const prisma = new PrismaClient();

export interface CreateOrderFromCartInput {
  cartId: string;
  user: UserContext;
  paymentMethod: PaymentMethod;
  clientIp?: string;
  userAgent?: string;
}

export interface OrderItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  currency: string;
}

export interface OrderFilters {
  userId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  createdFrom?: Date;
  createdTo?: Date;
  cursor?: string;
  take?: number;
}

export interface PaginatedOrders {
  data: Order[];
  nextCursor: string | null;
  total: number;
}

export interface OrderWithRelations extends Order {
  items: Array<{
    id: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    unitPrice: number;
    currency: string;
    totalPrice: number;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    providerPaymentId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    rawResponse: unknown;
  }>;
}

export interface UpdateOrderStatusInput {
  orderId: string;
  user: UserContext;
  newStatus: OrderStatus;
  reason?: string;
}

export interface CapturePaymentInput {
  orderId: string;
  user: UserContext;
}

export interface CancelOrderInput {
  orderId: string;
  user: UserContext;
  reason?: string;
}

export interface RefundOrderInput {
  orderId: string;
  user: UserContext;
  amount?: number;
  reason?: string;
}

export interface OrderService {
  createOrderFromCart(input: CreateOrderFromCartInput): Promise<OrderWithRelations>;
  getOrderById(orderId: string, user?: UserContext | null): Promise<OrderWithRelations | null>;
  listOrders(filters: OrderFilters): Promise<PaginatedOrders>;
  updateOrderStatus(input: UpdateOrderStatusInput): Promise<OrderWithRelations>;
  capturePayment(input: CapturePaymentInput): Promise<OrderWithRelations>;
  cancelOrder(input: CancelOrderInput): Promise<OrderWithRelations>;
  refundOrder(input: RefundOrderInput): Promise<OrderWithRelations>;
}

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['AWAITING_PAYMENT', 'CANCELLED'],
  AWAITING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUND_PENDING'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUND_PENDING'],
  SHIPPED: ['DELIVERED', 'REFUND_PENDING'],
  DELIVERED: ['REFUND_PENDING'],
  CANCELLED: [],
  REFUND_PENDING: ['REFUNDED'],
  REFUNDED: []
};

function assertCanTransitionStatus(current: OrderStatus, next: OrderStatus): void {
  const allowed = ORDER_STATUS_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw new AppError(
      `Invalid order status transition from undefined to undefined`,
      400,
      'INVALID_ORDER_STATUS_TRANSITION'
    );
  }
}

async function getCartWithItems(cartId: string, userId: string): Promise<Cart> {
  const cart = await prisma.cart.findFirst({
    where: { id: cartId, userId, active: true },
    include: {
      items: {
        include: {
          product: true,
          variant: true
        }
      }
    }
  });

  if (!cart) {
    throw new AppError('Cart not found or inactive', 404, 'CART_NOT_FOUND');
  }

  if (!cart.items.length) {
    throw new AppError('Cart is empty', 400, 'CART_EMPTY');
  }

  return cart as unknown as Cart;
}

function mapCartItemsToOrderItems(cartItems: CartItem[]): OrderItemInput[] {
  return cartItems.map((item) => {
    if (!item.product) {
      throw new AppError('Cart item product missing', 500, 'CART_ITEM_INVALID');
    }

    const price = item.variant?.price ?? item.product.price;
    const currency = item.variant?.currency ?? item.product.currency;

    return {
      productId: item.productId,
      variantId: item.variantId ?? null,
      quantity: item.quantity,
      unitPrice: price,
      currency
    };
  });
}

async function reserveInventoryForOrder(
  orderId: string,
  items: OrderItemInput[]
): Promise<InventoryReservationResult> {
  const reservations = await inventoryService.reserveStock({
    orderId,
    items: items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId ?? undefined,
      quantity: item.quantity
    }))
  });

  if (!reservations.success) {
    throw new AppError(
      'Unable to reserve inventory for order',
      409,
      'INVENTORY_RESERVATION_FAILED',
      { details: reservations.details }
    );
  }

  return reservations;
}

async function createPaymentIntentForOrder(
  orderId: string,
  amount: number,
  currency: string,
  paymentMethod: PaymentMethod,
  user: UserContext,
  clientIp?: string,
  userAgent?: string
): Promise<PaymentIntentResult> {
  const paymentIntent = await paymentService.createPaymentIntent({
    orderId,
    amount,
    currency,
    paymentMethod,
    customerId: user.id,
    metadata: {
      orderId,
      userId: user.id
    },
    context: {
      clientIp,
      userAgent
    }
  });

  if (!paymentIntent.success) {
    throw new AppError(
      'Failed to create payment intent',
      502,
      'PAYMENT_INTENT_FAILED',
      { details: paymentIntent.error }
    );
  }

  return paymentIntent;
}

async function calculateOrderTotals(items: OrderItemInput[]): Promise<{
  subtotal: number;
  total: number;
  currency: string;
}> {
  if (!items.length) {
    throw new AppError('Order must contain at least one item', 400, 'ORDER_ITEMS_EMPTY');
  }

  const currency = items[0].currency;
  const subtotal = items.reduce((sum, item) => {
    if (item.currency !== currency) {
      throw new AppError('Mixed currencies in order items are not supported', 400, 'MIXED_CURRENCIES');
    }
    return sum + item.unitPrice * item.quantity;
  }, 0);

  const total = subtotal;

  return { subtotal, total, currency };
}

async function validateOrderOwnership(orderId: string, user?: UserContext | null): Promise<void> {
  if (!user) return;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true }
  });
  if (!order) {
    throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
  }
  if (order.userId !== user.id && !user.isAdmin) {
    throw new AppError('Not authorized to access this order', 403, 'FORBIDDEN');
  }
}

async function fetchOrderWithRelations(orderId: string): Promise<OrderWithRelations> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payments: true
    }
  });

  if (!order) {
    throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
  }

  return order as unknown as OrderWithRelations;
}

export const orderService: OrderService = {
  async createOrderFromCart(input: CreateOrderFromCartInput): Promise<OrderWithRelations> {
    const { cartId, user, paymentMethod, clientIp, userAgent } = input;

    const cart = await getCartWithItems(cartId, user.id);
    const orderItems = mapCartItemsToOrderItems(cart.items);
    const { subtotal, total, currency } = await calculateOrderTotals(orderItems);

    const orderId = uuidv4();

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          id: orderId,
          userId: user.id,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          subtotal,
          total,
          currency,
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              currency: item.currency,
              totalPrice: item.unitPrice * item.quantity
            }))
          },
          audit