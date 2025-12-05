import { PrismaClient, Cart, CartItem, Product } from '@prisma/client';
import createHttpError from 'http-errors';

const prisma = new PrismaClient();

export type CartItemInput = {
  productId: string;
  quantity: number;
};

export type CartTotals = {
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
};

export type CartWithItems = Cart & {
  items: (CartItem & { product: Product })[];
};

export type CartSummary = {
  cart: CartWithItems;
  totals: CartTotals;
};

export type MergeCartOptions = {
  enforceStock?: boolean;
  overwriteQuantities?: boolean;
};

const DEFAULT_TAX_RATE = 0.1;
const DEFAULT_CURRENCY = 'USD';

async function getOrCreateCartByUserId(userId: string): Promise<CartWithItems> {
  let cart = await prisma.cart.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId,
        status: 'ACTIVE',
        currency: DEFAULT_CURRENCY,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  return cart;
}

async function getOrCreateCartBySessionId(sessionId: string): Promise<CartWithItems> {
  let cart = await prisma.cart.findFirst({
    where: { sessionId, status: 'ACTIVE' },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        sessionId,
        status: 'ACTIVE',
        currency: DEFAULT_CURRENCY,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  return cart;
}

async function getCartById(cartId: string): Promise<CartWithItems | null> {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

async function ensureProductAndStock(
  productId: string,
  requestedQuantity: number
): Promise<{ product: Product; allowedQuantity: number }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || !product.isActive) {
    throw createHttpError(404, 'Product not found or inactive');
  }

  if (product.stock <= 0) {
    throw createHttpError(409, 'Product is out of stock');
  }

  const allowedQuantity = Math.min(requestedQuantity, product.stock);

  if (allowedQuantity <= 0) {
    throw createHttpError(409, 'Requested quantity not available');
  }

  return { product, allowedQuantity };
}

async function addItemToCart(
  cartId: string,
  item: CartItemInput,
  enforceStock: boolean = true
): Promise<CartSummary> {
  const cart = await getCartById(cartId);
  if (!cart || cart.status !== 'ACTIVE') {
    throw createHttpError(404, 'Active cart not found');
  }

  let quantityToSet = item.quantity;

  if (enforceStock) {
    const { allowedQuantity } = await ensureProductAndStock(item.productId, item.quantity);
    quantityToSet = allowedQuantity;
  }

  const existingItem = cart.items.find((i) => i.productId === item.productId);

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantityToSet;
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: newQuantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId,
        productId: item.productId,
        quantity: quantityToSet,
      },
    });
  }

  const updatedCart = await getCartById(cartId);
  if (!updatedCart) {
    throw createHttpError(500, 'Failed to load updated cart');
  }

  const totals = calculateCartTotals(updatedCart);
  return { cart: updatedCart, totals };
}

async function updateCartItemQuantity(
  cartId: string,
  productId: string,
  quantity: number,
  enforceStock: boolean = true
): Promise<CartSummary> {
  if (quantity <= 0) {
    return removeItemFromCart(cartId, productId);
  }

  const cart = await getCartById(cartId);
  if (!cart || cart.status !== 'ACTIVE') {
    throw createHttpError(404, 'Active cart not found');
  }

  let quantityToSet = quantity;

  if (enforceStock) {
    const { allowedQuantity } = await ensureProductAndStock(productId, quantity);
    quantityToSet = allowedQuantity;
  }

  const existingItem = cart.items.find((i) => i.productId === productId);

  if (!existingItem) {
    throw createHttpError(404, 'Cart item not found');
  }

  await prisma.cartItem.update({
    where: { id: existingItem.id },
    data: { quantity: quantityToSet },
  });

  const updatedCart = await getCartById(cartId);
  if (!updatedCart) {
    throw createHttpError(500, 'Failed to load updated cart');
  }

  const totals = calculateCartTotals(updatedCart);
  return { cart: updatedCart, totals };
}

async function removeItemFromCart(cartId: string, productId: string): Promise<CartSummary> {
  const cart = await getCartById(cartId);
  if (!cart || cart.status !== 'ACTIVE') {
    throw createHttpError(404, 'Active cart not found');
  }

  const existingItem = cart.items.find((i) => i.productId === productId);

  if (!existingItem) {
    throw createHttpError(404, 'Cart item not found');
  }

  await prisma.cartItem.delete({
    where: { id: existingItem.id },
  });

  const updatedCart = await getCartById(cartId);
  if (!updatedCart) {
    throw createHttpError(500, 'Failed to load updated cart');
  }

  const totals = calculateCartTotals(updatedCart);
  return { cart: updatedCart, totals };
}

async function clearCart(cartId: string): Promise<CartSummary> {
  const cart = await getCartById(cartId);
  if (!cart || cart.status !== 'ACTIVE') {
    throw createHttpError(404, 'Active cart not found');
  }

  await prisma.cartItem.deleteMany({
    where: { cartId },
  });

  const updatedCart = await getCartById(cartId);
  if (!updatedCart) {
    throw createHttpError(500, 'Failed to load updated cart');
  }

  const totals = calculateCartTotals(updatedCart);
  return { cart: updatedCart, totals };
}

function calculateCartTotals(cart: CartWithItems): CartTotals {
  const subtotal = cart.items.reduce((sum, item) => {
    const price = item.product.price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  const taxRate = cart.taxRate ?? DEFAULT_TAX_RATE;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return {
    subtotal,
    tax,
    total,
    currency: cart.currency || DEFAULT_CURRENCY,
  };
}

async function enforceStockLimitsForCart(cartId: string): Promise<CartSummary> {
  const cart = await getCartById(cartId);
  if (!cart || cart.status !== 'ACTIVE') {
    throw createHttpError(404, 'Active cart not found');
  }

  const updates: Promise<unknown>[] = [];

  for (const item of cart.items) {
    if (!item.product.isActive || item.product.stock <= 0) {
      updates.push(
        prisma.cartItem.delete({
          where: { id: item.id },
        })
      );
      continue;
    }

    if (item.quantity > item.product.stock) {
      updates.push(
        prisma.cartItem.update({
          where: { id: item.id },
          data: { quantity: item.product.stock },
        })
      );
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  const updatedCart = await getCartById(cartId);
  if (!updatedCart) {
    throw createHttpError(500, 'Failed to load updated cart');
  }

  const totals = calculateCartTotals(updatedCart);
  return { cart: updatedCart, totals };
}

async function mergeCarts(
  sourceCartId: string,
  targetCartId: string,
  options: MergeCartOptions = {}
): Promise<CartSummary> {
  const { enforceStock = true, overwriteQuantities = false } = options;

  if (sourceCartId === targetCartId) {
    const cart = await getCartById(targetCartId);
    if (!cart) {
      throw createHttpError(404, 'Cart not