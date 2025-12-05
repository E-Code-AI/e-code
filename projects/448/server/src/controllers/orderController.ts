import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import Order, { IOrder, OrderStatus } from "../models/Order";
import Cart, { ICart } from "../models/Cart";
import Product, { IProduct } from "../models/Product";
import Payment, { IPayment } from "../models/Payment";
import User, { IUser } from "../models/User";
import { BadRequestError, NotFoundError, ForbiddenError } from "../utils/errors";
import { validateCreateOrderPayload, validateUpdateOrderStatusPayload } from "../validators/orderValidators";
import { startSession } from "mongoose";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

const isAdmin = (req: AuthenticatedRequest): boolean => {
  return req.user?.role === "admin";
};

export const createOrderFromCart = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new ForbiddenError("Authentication required");
    }

    const { error, value } = validateCreateOrderPayload(req.body);
    if (error) {
      throw new BadRequestError(error.message);
    }

    const { cartId, paymentId, shippingAddress, billingAddress, notes } = value;

    const cart: ICart | null = await Cart.findOne({
      _id: cartId,
      user: req.user.id,
      isActive: true,
    }).populate<{ items: { product: IProduct }[] }>({
      path: "items.product",
      model: Product,
    });

    if (!cart || cart.items.length === 0) {
      throw new NotFoundError("Active cart not found or cart is empty");
    }

    const payment: IPayment | null = await Payment.findOne({
      _id: paymentId,
      user: req.user.id,
      status: "authorized",
    });

    if (!payment) {
      throw new BadRequestError("Valid authorized payment not found");
    }

    const session = await startSession();
    session.startTransaction();

    try {
      let subtotal = 0;
      const orderItems = cart.items.map((item) => {
        if (!item.product || !item.product._id) {
          throw new BadRequestError("Invalid product in cart");
        }
        const price = item.product.price;
        const lineTotal = price * item.quantity;
        subtotal += lineTotal;
        return {
          product: item.product._id,
          name: item.product.name,
          price,
          quantity: item.quantity,
          lineTotal,
        };
      });

      const taxRate = 0.1;
      const tax = subtotal * taxRate;
      const shippingCost = 0;
      const total = subtotal + tax + shippingCost;

      if (Math.abs(total - payment.amount) > 0.01) {
        throw new BadRequestError("Payment amount does not match order total");
      }

      const orderData: Partial<IOrder> = {
        user: new Types.ObjectId(req.user.id),
        items: orderItems,
        subtotal,
        tax,
        shippingCost,
        total,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        payment: payment._id,
        status: "pending",
        notes: notes || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const order = await Order.create([orderData], { session });
      cart.isActive = false;
      await cart.save({ session });

      payment.status = "captured";
      payment.order = order[0]._id;
      await payment.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        success: true,
        data: order[0],
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

export const getUserOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw new ForbiddenError("Authentication required");
    }

    const { page = 1, limit = 10, status } = req.query as {
      page?: string;
      limit?: string;
      status?: string;
    };

    const pageNumber = Math.max(parseInt(page || "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(limit || "10", 10), 1), 100);

    const query: Record<string, unknown> = {
      user: req.user.id,
    };

    if (status) {
      query.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize)
        .populate("items.product")
        .populate("payment"),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId } = req.params;

    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestError("Invalid order ID");
    }

    const order = await Order.findById(orderId)
      .populate("items.product")
      .populate("payment")
      .populate("user", "name email");

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (!isAdmin(req) && order.user && order.user._id.toString() !== req.user?.id) {
      throw new ForbiddenError("You do not have access to this order");
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    next(err);
  }
};

export const updateOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      throw new ForbiddenError("Admin access required");
    }

    const { orderId } = req.params;
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestError("Invalid order ID");
    }

    const { error, value } = validateUpdateOrderStatusPayload(req.body);
    if (error) {
      throw new BadRequestError(error.message);
    }

    const { status, trackingNumber } = value as {
      status: OrderStatus;
      trackingNumber?: string;
    };

    const order = await Order.findById(orderId).populate("payment");
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    const previousStatus = order.status;
    order.status = status;
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }
    order.updatedAt = new Date();

    if (previousStatus !== "cancelled" && status === "cancelled" && order.payment) {
      const payment = await Payment.findById(order.payment);
      if (payment && payment.status === "captured") {
        payment.status = "refunded";
        await payment.save();
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    next(err);
  }
};

export const getAdminOrdersDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      throw new ForbiddenError("Admin access required");
    }

    const {
      page = "1",
      limit = "20",
      status,
      userId,
      fromDate,
      toDate,
      sort = "createdAt",
      direction = "desc",
    } = req.query as {
      page?: string;
      limit?: string;
      status?: string;
      userId?: string;
      fromDate?: string;
      toDate?: string;
      sort?: string;
      direction?: string;
    };

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);

    const query: Record<string, unknown> = {};

    if (status) {
      query.status = status;
    }

    if (userId && Types.ObjectId.isValid(userId)) {
      query.user = userId;
    }

    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) {
        (query.createdAt as any).$gte = new Date(fromDate);
      }
      if (toDate) {
        (query.createdAt as any).$lte = new Date(toDate);