import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { CartModel, CartDocument } from '../models/Cart';
import { ProductModel } from '../models/Product';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

interface CartItemPayload {
  productId: string;
  quantity?: number;
}

const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

const getOrCreateCart = async (userId: string): Promise<CartDocument> => {
  let cart = await CartModel.findOne({ user: userId }).populate('items.product');
  if (!cart) {
    cart = new CartModel({
      user: userId,
      items: [],
      totalQuantity: 0,
      totalPrice: 0,
    });
    await cart.save();
    cart = await cart.populate('items.product');
  }
  return cart;
};

const recalculateCartTotals = (cart: CartDocument): void => {
  let totalQuantity = 0;
  let totalPrice = 0;

  cart.items.forEach((item) => {
    totalQuantity += item.quantity;
    const price = (item.product as any)?.price ?? item.priceSnapshot ?? 0;
    totalPrice += price * item.quantity;
  });

  cart.totalQuantity = totalQuantity;
  cart.totalPrice = totalPrice;
};

const validateCartItemPayload = (payload: CartItemPayload): string | null => {
  if (!payload.productId || typeof payload.productId !== 'string') {
    return 'productId is required and must be a string';
  }
  if (!isValidObjectId(payload.productId)) {
    return 'Invalid productId';
  }
  if (payload.quantity !== undefined) {
    if (
      typeof payload.quantity !== 'number' ||
      !Number.isInteger(payload.quantity) ||
      payload.quantity <= 0
    ) {
      return 'quantity must be a positive integer';
    }
  }
  return null;
};

const ensureAuthenticated = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.user.id) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  next();
};

// GET /cart - Get current user's cart
router.get(
  '/',
  ensureAuthenticated,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const cart = await getOrCreateCart(userId);
      res.json(cart);
    } catch (error) {
      next(error);
    }
  }
);

// POST /cart/items - Add item to cart
router.post(
  '/items',
  ensureAuthenticated,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const payload: CartItemPayload = req.body;

      const validationError = validateCartItemPayload(payload);
      if (validationError) {
        res.status(400).json({ message: validationError });
        return;
      }

      const product = await ProductModel.findById(payload.productId);
      if (!product) {
        res.status(404).json({ message: 'Product not found' });
        return;
      }

      const quantityToAdd = payload.quantity ?? 1;

      const cart = await getOrCreateCart(userId);

      const existingItem = cart.items.find(
        (item) => item.product.toString() === payload.productId
      );

      if (existingItem) {
        existingItem.quantity += quantityToAdd;
      } else {
        cart.items.push({
          product: product._id,
          quantity: quantityToAdd,
          priceSnapshot: product.price,
        } as any);
      }

      recalculateCartTotals(cart);
      await cart.save();
      await cart.populate('items.product');

      res.status(201).json(cart);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /cart/items/:productId - Update item quantity
router.patch(
  '/items/:productId',
  ensureAuthenticated,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { productId } = req.params;
      const { quantity } = req.body as { quantity?: number };

      if (!isValidObjectId(productId)) {
        res.status(400).json({ message: 'Invalid productId' });
        return;
      }

      if (
        quantity === undefined ||
        typeof quantity !== 'number' ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        res.status(400).json({ message: 'quantity must be a positive integer' });
        return;
      }

      const cart = await CartModel.findOne({ user: userId });
      if (!cart) {
        res.status(404).json({ message: 'Cart not found' });
        return;
      }

      const item = cart.items.find(
        (cartItem) => cartItem.product.toString() === productId
      );

      if (!item) {
        res.status(404).json({ message: 'Item not found in cart' });
        return;
      }

      item.quantity = quantity;

      recalculateCartTotals(cart);
      await cart.save();
      await cart.populate('items.product');

      res.json(cart);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /cart/items/:productId - Remove item from cart
router.delete(
  '/items/:productId',
  ensureAuthenticated,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { productId } = req.params;

      if (!isValidObjectId(productId)) {
        res.status(400).json({ message: 'Invalid productId' });
        return;
      }

      const cart = await CartModel.findOne({ user: userId });
      if (!cart) {
        res.status(404).json({ message: 'Cart not found' });
        return;
      }

      const initialLength = cart.items.length;
      cart.items = cart.items.filter(
        (item) => item.product.toString() !== productId
      );

      if (cart.items.length === initialLength) {
        res.status(404).json({ message: 'Item not found in cart' });
        return;
      }

      recalculateCartTotals(cart);
      await cart.save();
      await cart.populate('items.product');

      res.json(cart);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /cart - Clear cart
router.delete(
  '/',
  ensureAuthenticated,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const cart = await CartModel.findOne({ user: userId });

      if (!cart) {
        res.status(404).json({ message: 'Cart not found' });
        return;
      }

      cart.items = [];
      cart.totalPrice = 0;
      cart.totalQuantity = 0;

      await cart.save();

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;