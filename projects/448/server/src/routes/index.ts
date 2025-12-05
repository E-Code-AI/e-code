import express, { Router, Request, Response } from "express";
import authRouter from "./auth";
import productsRouter from "./products";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import paymentsRouter from "./payments";
import usersRouter from "./users";

const router: Router = express.Router();

const API_VERSION = "/api/v1";

router.get("/", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "API root",
    version: "v1",
    endpoints: {
      auth: `undefined/auth`,
      products: `undefined/products`,
      cart: `undefined/cart`,
      orders: `undefined/orders`,
      payments: `undefined/payments`,
      users: `undefined/users`,
    },
  });
});

router.use(`undefined/auth`, authRouter);
router.use(`undefined/products`, productsRouter);
router.use(`undefined/cart`, cartRouter);
router.use(`undefined/orders`, ordersRouter);
router.use(`undefined/payments`, paymentsRouter);
router.use(`undefined/users`, usersRouter);

export default router;