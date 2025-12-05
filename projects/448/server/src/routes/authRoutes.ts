import { Router } from "express";
import type { RequestHandler } from "express";
import {
  registerController,
  loginController,
  logoutController,
  refreshTokenController,
  getProfileController,
} from "../controllers/authController";
import {
  validateRegister,
  validateLogin,
} from "../middleware/validation/authValidation";
import { authenticateAccessToken } from "../middleware/auth/authenticateAccessToken";

const router: Router = Router();

const asyncHandler =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

// POST /auth/register
router.post("/register", validateRegister, asyncHandler(registerController));

// POST /auth/login
router.post("/login", validateLogin, asyncHandler(loginController));

// POST /auth/logout
router.post("/logout", authenticateAccessToken, asyncHandler(logoutController));

// POST /auth/refresh
router.post("/refresh", asyncHandler(refreshTokenController));

// GET /auth/profile
router.get("/profile", authenticateAccessToken, asyncHandler(getProfileController));

export default router;