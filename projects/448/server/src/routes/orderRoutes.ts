import { Router, Request, Response, NextFunction } from "express";
import { body, param, query } from "express-validator";
import { Types } from "mongoose";
import { OrderStatus } from "../types/orderTypes";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validateRequest } from "../middleware/validateRequest";
import { OrderService } from "../services/OrderService";
import { BadRequestError, NotFoundError } from "../errors";
import { UserRole } from "../types/userTypes";

const router = Router();
const orderService = new OrderService();

const isValidObjectId = (value: string): boolean => {
  return Types.ObjectId.isValid(value);
};

const orderIdParamValidator = param("orderId")
  .trim()
  .notEmpty()
  .withMessage("Order ID is required")
  .bail()
  .custom((value) => isValidObjectId(value))
  .withMessage("Invalid order ID");

const paginationValidators = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

const statusQueryValidator = query("status")
  .optional()
  .isIn(Object.values(OrderStatus))
  .withMessage("Invalid order status");

const createOrderValidators = [
  body("cartId")
    .trim()
    .notEmpty()
    .withMessage("Cart ID is required")
    .bail()
    .custom((value) => isValidObjectId(value))
    .withMessage("Invalid cart ID"),
  body("shippingAddressId")
    .optional()
    .trim()
    .custom((value) => isValidObjectId(value))
    .withMessage("Invalid shipping address ID"),
  body("paymentMethodId")
    .optional()
    .trim()
    .custom((value) => isValidObjectId(value))
    .withMessage("Invalid payment method ID"),
  body("notes")
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage("Notes must be at most 1000 characters"),
];

const updateOrderStatusValidators = [
  orderIdParamValidator,
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .bail()
    .isIn(Object.values(OrderStatus))
    .withMessage("Invalid order status"),
  body("reason")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Reason must be at most 500 characters"),
];

const adminOrderFiltersValidators = [
  ...paginationValidators,
  statusQueryValidator,
  query("userId")
    .optional()
    .custom((value) => isValidObjectId(value))
    .withMessage("Invalid user ID"),
  query("fromDate")
    .optional()
    .isISO8601()
    .withMessage("fromDate must be a valid ISO8601 date"),
  query("toDate")
    .optional()
    .isISO8601()
    .withMessage("toDate must be a valid ISO8601 date"),
];

router.post(
  "/",
  authenticate,
  createOrderValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { cartId, shippingAddressId, paymentMethodId, notes } = req.body;

      const order = await orderService.createOrderFromCart({
        userId,
        cartId,
        shippingAddressId,
        paymentMethodId,
        notes,
      });

      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/my",
  authenticate,
  paginationValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await orderService.getUserOrders({
        userId,
        page,
        limit,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/my/:orderId",
  authenticate,
  orderIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { orderId } = req.params;

      const order = await orderService.getUserOrderById({
        userId,
        orderId,
      });

      if (!order) {
        throw new NotFoundError("Order not found");
      }

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:orderId",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPPORT),
  orderIdParamValidator,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;

      const order = await orderService.getOrderById(orderId);

      if (!order) {
        throw new NotFoundError("Order not found");
      }

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPPORT),
  adminOrderFiltersValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as OrderStatus | undefined;
      const userId = req.query.userId as string | undefined;
      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;

      const filters = {
        page,
        limit,
        status,
        userId,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
      };

      if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
        throw new BadRequestError("fromDate cannot be after toDate");
      }

      const result = await orderService.getAllOrders(filters);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:orderId/status",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  updateOrderStatusValidators,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orderId } = req.params;
      const { status, reason } = req.body;
      const adminId = req.user!.id;

      const updatedOrder = await orderService.updateOrderStatus({
        orderId,
        status,
        reason,
        updatedBy: adminId,
      });

      if (!updatedOrder) {
        throw new NotFoundError("Order not found");
      }

      res.json(updatedOrder);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:orderId/cancel",
  authenticate,
  orderIdParamValidator,
  body("reason")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Reason must be at most 500 characters"),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { orderId } = req.params;
      const { reason } = req.body;

      const cancelledOrder = await orderService.cancelOrderByUser({
        userId,
        orderId,
        reason,
      });

      if (!cancelledOrder) {
        throw new NotFoundError("Order not found or cannot be cancelled");
      }

      res.json(cancelledOrder);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/:orderId/refund",
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPPORT),
  orderIdParamValidator,
  body("reason")
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage("Reason must be at most 500 characters"),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = req.user!.id;
      const { orderId } = req.params;
      const { reason } = req.body;

      const refundedOrder = await orderService.refundOrder({
        orderId,