import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import Cart from "../models/Cart";
import Product from "../models/Product";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    [key: string]: unknown;
  };
}

interface AddToCartBody {
  productId: string;
  quantity?: number;
}

interface UpdateCartItemBody {
  quantity: number;
}

const getUserIdFromRequest = (req: AuthenticatedRequest): string => {
  if (!req.user || !req.user.id) {
    throw new Error("Unauthorized: user not found on request");
  }
  return req.user.id;
};

const validateObjectId = (id: string, fieldName: string): void => {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid undefined`);
  }
};

export const getCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);

    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart) {
      res.status(200).json({
        items: [],
        totalQuantity: 0,
        totalPrice: 0,
      });
      return;
    }

    res.status(200).json(cart);
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    const { productId, quantity = 1 } = req.body as AddToCartBody;

    if (!productId) {
      res.status(400).json({ message: "productId is required" });
      return;
    }

    validateObjectId(productId, "productId");

    if (!Number.isInteger(quantity) || quantity <= 0) {
      res.status(400).json({ message: "quantity must be a positive integer" });
      return;
    }

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      res.status(404).json({ message: "Product not found or inactive" });
      return;
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
      });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
      });
    }

    await cart.recalculateTotals();
    await cart.save();

    const populatedCart = await cart.populate("items.product");

    res.status(200).json(populatedCart);
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    const { productId } = req.params;
    const { quantity } = req.body as UpdateCartItemBody;

    if (!productId) {
      res.status(400).json({ message: "productId param is required" });
      return;
    }

    validateObjectId(productId, "productId");

    if (!Number.isInteger(quantity) || quantity < 0) {
      res
        .status(400)
        .json({ message: "quantity must be a non-negative integer" });
      return;
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      res.status(404).json({ message: "Cart not found" });
      return;
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      res.status(404).json({ message: "Item not found in cart" });
      return;
    }

    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.recalculateTotals();
    await cart.save();

    const populatedCart = await cart.populate("items.product");

    res.status(200).json(populatedCart);
  } catch (error) {
    next(error);
  }
};

export const removeFromCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);
    const { productId } = req.params;

    if (!productId) {
      res.status(400).json({ message: "productId param is required" });
      return;
    }

    validateObjectId(productId, "productId");

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      res.status(404).json({ message: "Cart not found" });
      return;
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    if (cart.items.length === initialLength) {
      res.status(404).json({ message: "Item not found in cart" });
      return;
    }

    await cart.recalculateTotals();
    await cart.save();

    const populatedCart = await cart.populate("items.product");

    res.status(200).json(populatedCart);
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      res.status(200).json({
        message: "Cart already empty",
        items: [],
        totalQuantity: 0,
        totalPrice: 0,
      });
      return;
    }

    cart.items = [];
    cart.totalQuantity = 0;
    cart.totalPrice = 0;

    await cart.save();

    res.status(200).json({
      message: "Cart cleared successfully",
      items: [],
      totalQuantity: 0,
      totalPrice: 0,
    });
  } catch (error) {
    next(error);
  }
};

export const checkoutCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = getUserIdFromRequest(req);

    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      res.status(400).json({ message: "Cart is empty" });
      return;
    }

    // Placeholder for additional checkout logic (e.g., order creation, payment)
    // After successful checkout, clear the cart
    cart.items = [];
    cart.totalQuantity = 0;
    cart.totalPrice = 0;
    await cart.save();

    res.status(200).json({
      message: "Checkout successful, cart cleared",
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  checkoutCart,
};