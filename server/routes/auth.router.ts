import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import passport from "passport";
import { userRegistrationSchema, securityLogs, emailVerificationTokens, passwordResetTokens } from "@shared/schema";
import { type IStorage } from "../storage";
import { devAuthBypass, isAuthBypassEnabled } from "../dev-auth-bypass";
import { csrfProtection } from "../middleware/csrf";
import type { User } from "@shared/schema";
import { randomBytes } from "crypto";
import { hashToken, generateEmailVerificationToken, generatePasswordResetToken } from "../utils/auth-utils";
import { sendVerificationEmail, sendPasswordResetEmail, resendVerificationEmail } from "../utils/sendgrid-email-service";
import { z } from "zod";
import { db } from "../db";
import { eq, and, gte } from "drizzle-orm";
import { sessionManager } from "../auth/session-manager";
import { createLogger } from "../utils/logger";
import { tierRateLimiters } from "../middleware/tier-rate-limiter";

const logger = createLogger('auth-router');

// Define a UserForAuth type that includes password for authentication
interface UserForAuth extends User {
  password?: string;
}

export class AuthRouter {
  private router: Router;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.router = Router();
    this.storage = storage;
    this.initializeRoutes();
  }

  /**
   * Sanitize user object by removing sensitive fields
   * Returns only safe fields for client consumption
   */
  private sanitizeUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      bio: user.bio,
      website: user.website,
      githubUsername: user.githubUsername,
      twitterUsername: user.twitterUsername,
      linkedinUsername: user.linkedinUsername,
      reputation: user.reputation,
      isMentor: user.isMentor,
      isAdmin: user.isAdmin,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
      // EXCLUDED: passwordHash, twoFactorSecret, passwordResetToken, stripeCustomerId, etc.
    };
  }

  private ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    // Apply auth bypass middleware ONLY if explicitly enabled via bypass token
    // DO NOT auto-inject testauth user - this prevents E2E testing
    devAuthBypass(req, res, () => {
      if (req.isAuthenticated()) {
        return next();
      }
      
      res.status(401).json({ 
        message: "Unauthorized",
        code: "AUTH_REQUIRED",
        path: req.path 
      });
    });
  };

  private initializeRoutes() {
    // Fortune 500 Auth Rate Limiter - Apply to all auth routes
    // Free: 5/15min, Pro: 20/15min, Enterprise: 100/15min (10x in dev)
    this.router.use('/api/register', tierRateLimiters.auth);
    this.router.use('/api/login', tierRateLimiters.auth);
    this.router.use('/api/logout', tierRateLimiters.auth);
    this.router.use('/api/auth', tierRateLimiters.auth);
    this.router.use('/api/verify-email', tierRateLimiters.auth);
    this.router.use('/api/resend-verification', tierRateLimiters.auth);
    this.router.use('/api/forgot-password', tierRateLimiters.auth);
    this.router.use('/api/reset-password', tierRateLimiters.auth);
    
    // Get current user (sanitized - no sensitive fields)
    this.router.get("/api/me", this.ensureAuthenticated, (req: Request, res: Response) => {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      res.json(this.sanitizeUser(user));
    });

    // Register endpoint
    this.router.post("/api/register", csrfProtection, async (req: Request, res: Response) => {
      try {
        // Use registration schema with password validation
        const validatedData = userRegistrationSchema.parse(req.body);
        
        // Validate required fields
        if (!validatedData.username || !validatedData.email) {
          return res.status(400).json({
            message: "Username and email are required",
            code: "MISSING_FIELDS"
          });
        }
        
        // Check if user exists
        const existingUser = await this.storage.getUserByUsername(validatedData.username);
        if (existingUser) {
          return res.status(400).json({ 
            error: "Username already exists",
            message: "Username already exists",
            code: "USERNAME_EXISTS"
          });
        }

        // Check if email is already used
        const existingEmail = await this.storage.getUserByEmail(validatedData.email);
        if (existingEmail) {
          return res.status(400).json({
            error: "Email already registered",
            message: "Email already registered",
            code: "EMAIL_EXISTS"
          });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(validatedData.password, 10);
        
        // Create user with emailVerified set to false (exclude plain password from storage)
        const { password, ...userDataWithoutPassword } = validatedData;
        const user = await this.storage.createUser({
          ...userDataWithoutPassword,
          passwordHash: hashedPassword,
          emailVerified: false
        });

        // Generate and save email verification token
        const verificationToken = generateEmailVerificationToken();
        const hashedToken = hashToken(verificationToken);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours
        
        await this.storage.saveEmailVerificationToken(
          user.id,
          user.email!,
          hashedToken,
          expiresAt
        );

        // Send verification email (non-blocking - don't fail registration if email fails)
        try {
          await sendVerificationEmail(
            user.id,
            user.email!,
            user.displayName || user.username || 'User',
            verificationToken // Send unhashed token to user
          );
        } catch (emailError: any) {
          console.error('Failed to send verification email:', emailError.message || emailError);
        }

        // Log registration event
        await db.insert(securityLogs).values({
          userId: user.id,
          ip: req.ip || 'unknown',
          action: 'user_registration',
          resource: user.email || 'unknown',
          result: 'success',
          userAgent: req.headers['user-agent'] || '',
          metadata: { username: user.username }
        });
        
        // Log the user in automatically if session is available
        if (req.login && typeof req.login === 'function') {
          req.login(user, (err: any) => {
            if (err) {
              console.error('Login after registration failed:', err);
              // Still return success for registration
              return res.json({ 
                message: "Registration successful. Please check your email to verify your account. Login manually to continue.",
                user: this.sanitizeUser(user)
              });
            }
            
            res.json({ 
              message: "Registration successful. Please check your email to verify your account.",
              user: this.sanitizeUser(user)
            });
          });
        } else {
          // No session available (e.g., during testing)
          res.json({ 
            message: "Registration successful. Please check your email to verify your account.",
            user: this.sanitizeUser(user)
          });
        }
      } catch (error: any) {
        console.error("Registration error:", error);
        if (error.name === 'ZodError') {
          // Check if error is about password
          const hasPasswordError = error.errors?.some((e: any) => e.path?.includes('password'));
          const errorMessage = hasPasswordError 
            ? "Invalid password. Password must be at least 8 characters." 
            : "Invalid input data";
          
          return res.status(400).json({ 
            error: errorMessage,
            message: errorMessage,
            code: "INVALID_INPUT",
            errors: error.errors
          });
        }
        res.status(500).json({ 
          error: "Registration failed",
          message: "Registration failed",
          code: "REGISTRATION_ERROR"
        });
      }
    });

    // Login endpoint
    this.router.post("/api/login", csrfProtection, (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate('local', (err: any, user: User, info: any) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ 
            error: "Login failed",
            message: "Login failed",
            code: "LOGIN_ERROR"
          });
        }
        
        if (!user) {
          return res.status(401).json({ 
            error: info?.message || "Invalid credentials",
            message: info?.message || "Invalid credentials",
            code: "INVALID_CREDENTIALS"
          });
        }
        
        req.login(user, (loginErr: any) => {
          if (loginErr) {
            console.error('Session creation failed:', loginErr);
            return res.status(500).json({ 
              message: "Session creation failed",
              code: "SESSION_ERROR"
            });
          }
          
          res.json({ 
            message: "Login successful",
            user: this.sanitizeUser(user)
          });
        });
      })(req, res, next);
    });

    // Logout endpoint - properly destroy session and clear cookies
    this.router.post("/api/logout", csrfProtection, (req: Request, res: Response) => {
      // ✅ 40-YEAR SENIOR FIX: Call Passport logout BEFORE session destruction
      // req.logout() removes user from session; must be called before session is destroyed
      req.logout((logoutErr: any) => {
        if (logoutErr) {
          console.error('Passport logout warning:', logoutErr);
        }
        
        // Now destroy the session after Passport logout
        sessionManager.destroySession(req, res, (err: any) => {
          if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ 
              message: "Logout failed",
              code: "LOGOUT_ERROR"
            });
          }
          
          res.json({ 
            message: "Logout successful",
            code: "LOGOUT_SUCCESS"
          });
        });
      });
    });

    // ===== COMPATIBILITY LAYER: /api/auth/* aliases =====
    // These routes provide backward compatibility and align with RESTful naming
    // Eventually, we should deprecate the flat /api/* routes and use only /api/auth/*
    
    // Alias: /api/auth/user -> /api/me
    this.router.get("/api/auth/user", this.ensureAuthenticated, (req: Request, res: Response) => {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      res.json(this.sanitizeUser(user));
    });

    // Alias: /api/auth/register -> /api/register
    this.router.post("/api/auth/register", csrfProtection, async (req: Request, res: Response) => {
      try {
        // Use registration schema with password validation
        const validatedData = userRegistrationSchema.parse(req.body);
        
        // Validate required fields
        if (!validatedData.username || !validatedData.email) {
          return res.status(400).json({
            message: "Username and email are required",
            code: "MISSING_FIELDS"
          });
        }
        
        // Check if user exists
        const existingUser = await this.storage.getUserByUsername(validatedData.username);
        if (existingUser) {
          return res.status(400).json({ 
            error: "Username already exists",
            message: "Username already exists",
            code: "USERNAME_EXISTS"
          });
        }

        // Check if email is already used
        const existingEmail = await this.storage.getUserByEmail(validatedData.email);
        if (existingEmail) {
          return res.status(400).json({
            error: "Email already registered",
            message: "Email already registered",
            code: "EMAIL_EXISTS"
          });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(validatedData.password, 10);
        
        // Create user with emailVerified set to false (exclude plain password from storage)
        const { password, ...userDataWithoutPassword } = validatedData;
        const user = await this.storage.createUser({
          ...userDataWithoutPassword,
          passwordHash: hashedPassword,
          emailVerified: false
        });

        // Generate and save email verification token
        const verificationToken = generateEmailVerificationToken();
        const hashedToken = hashToken(verificationToken);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours
        
        await this.storage.saveEmailVerificationToken(
          user.id,
          user.email!,
          hashedToken,
          expiresAt
        );

        // Send verification email (non-blocking - don't fail registration if email fails)
        try {
          await sendVerificationEmail(
            user.id,
            user.email!,
            user.displayName || user.username || 'User',
            verificationToken // Send unhashed token to user
          );
        } catch (emailError: any) {
          console.error('Failed to send verification email:', emailError.message || emailError);
        }

        // Log registration event
        await db.insert(securityLogs).values({
          userId: user.id,
          ip: req.ip || 'unknown',
          action: 'user_registration',
          resource: user.email || 'unknown',
          result: 'success',
          userAgent: req.headers['user-agent'] || '',
          metadata: { username: user.username }
        });
        
        // Log the user in automatically if session is available
        if (req.login && typeof req.login === 'function') {
          req.login(user, (err: any) => {
            if (err) {
              console.error('Login after registration failed:', err);
              // Still return success for registration
              return res.json({ 
                message: "Registration successful. Please check your email to verify your account. Login manually to continue.",
                user: this.sanitizeUser(user)
              });
            }
            
            res.json({ 
              message: "Registration successful. Please check your email to verify your account.",
              user: this.sanitizeUser(user)
            });
          });
        } else {
          // No session available (e.g., during testing)
          res.json({ 
            message: "Registration successful. Please check your email to verify your account.",
            user: this.sanitizeUser(user)
          });
        }
      } catch (error: any) {
        console.error("Registration error:", error);
        if (error.name === 'ZodError') {
          // Check if error is about password
          const hasPasswordError = error.errors?.some((e: any) => e.path?.includes('password'));
          const errorMessage = hasPasswordError 
            ? "Invalid password. Password must be at least 8 characters." 
            : "Invalid input data";
          
          return res.status(400).json({ 
            error: errorMessage,
            message: errorMessage,
            code: "INVALID_INPUT",
            errors: error.errors
          });
        }
        res.status(500).json({ 
          error: "Registration failed",
          message: "Registration failed",
          code: "REGISTRATION_ERROR"
        });
      }
    });

    // Alias: /api/auth/login -> /api/login
    this.router.post("/api/auth/login", csrfProtection, (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate('local', (err: any, user: User, info: any) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ 
            error: "Login failed",
            message: "Login failed",
            code: "LOGIN_ERROR"
          });
        }
        
        if (!user) {
          return res.status(401).json({ 
            error: info?.message || "Invalid credentials",
            message: info?.message || "Invalid credentials",
            code: "INVALID_CREDENTIALS"
          });
        }
        
        req.login(user, (loginErr: any) => {
          if (loginErr) {
            console.error('Session creation failed:', loginErr);
            return res.status(500).json({ 
              message: "Session creation failed",
              code: "SESSION_ERROR"
            });
          }
          
          res.json({ 
            message: "Login successful",
            user: this.sanitizeUser(user)
          });
        });
      })(req, res, next);
    });

    // Alias: /api/auth/logout -> /api/logout
    this.router.post("/api/auth/logout", csrfProtection, (req: Request, res: Response) => {
      // ✅ 40-YEAR SENIOR FIX: Call Passport logout BEFORE session destruction
      // req.logout() removes user from session; must be called before session is destroyed
      req.logout((logoutErr: any) => {
        if (logoutErr) {
          console.error('Passport logout warning:', logoutErr);
        }
        
        // Now destroy the session after Passport logout
        sessionManager.destroySession(req, res, (err: any) => {
          if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ 
              message: "Logout failed",
              code: "LOGOUT_ERROR"
            });
          }
          
          res.json({ 
            message: "Logout successful",
            code: "LOGOUT_SUCCESS"
          });
        });
      });
    });

    // Check authentication status
    this.router.get("/api/auth/check", (req: Request, res: Response) => {
      res.json({ 
        authenticated: req.isAuthenticated(),
        user: req.user ? this.sanitizeUser(req.user) : null
      });
    });

    // Email verification endpoint (token-based, no CSRF needed - token provides protection)
    this.router.post("/api/verify-email", async (req: Request, res: Response) => {
      try {
        const { token } = z.object({ token: z.string() }).parse(req.body);
        
        // Hash the token to compare with stored hash
        const hashedToken = hashToken(token);
        
        // Get verification record
        const verification = await this.storage.getEmailVerificationByToken(hashedToken);
        if (!verification) {
          return res.status(400).json({ 
            message: "Invalid verification token",
            code: "INVALID_TOKEN"
          });
        }

        // Check if token has expired
        if (new Date() > verification.expiresAt) {
          await this.storage.deleteEmailVerificationToken(hashedToken);
          return res.status(400).json({ 
            message: "Verification token has expired. Please request a new one.",
            code: "TOKEN_EXPIRED"
          });
        }

        // Mark user as verified
        await this.storage.updateUser(verification.userId, { 
          emailVerified: true 
        });

        // Delete the used token
        await this.storage.deleteEmailVerificationToken(hashedToken);

        // Log verification event
        await db.insert(securityLogs).values({
          userId: verification.userId,
          ip: req.ip || 'unknown',
          action: 'email_verification',
          resource: verification.email,
          result: 'success',
          userAgent: req.headers['user-agent'] || ''
        });

        res.json({ 
          message: "Email verified successfully! You can now access all features.",
          code: "EMAIL_VERIFIED"
        });
      } catch (error: any) {
        console.error("Email verification error:", error);
        if (error.name === 'ZodError') {
          return res.status(400).json({ 
            message: "Invalid request format",
            code: "INVALID_REQUEST"
          });
        }
        res.status(500).json({ 
          message: "Email verification failed",
          code: "VERIFICATION_ERROR"
        });
      }
    });

    // Resend verification email endpoint
    this.router.post("/api/resend-verification", csrfProtection, this.ensureAuthenticated, async (req: Request, res: Response) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ 
            message: "Not authenticated",
            code: "AUTH_REQUIRED"
          });
        }

        // Check if email is already verified
        if (user.emailVerified) {
          return res.status(400).json({ 
            message: "Email is already verified",
            code: "ALREADY_VERIFIED"
          });
        }

        // Generate new verification token
        const verificationToken = generateEmailVerificationToken();
        const hashedToken = hashToken(verificationToken);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

        // Delete any existing tokens for this user
        const existingTokens = await db.select()
          .from(emailVerificationTokens)
          .where(eq(emailVerificationTokens.userId, user.id));
        
        for (const token of existingTokens) {
          await this.storage.deleteEmailVerificationToken(token.token);
        }

        // Validate email exists
        if (!user.email) {
          return res.status(400).json({ 
            message: "User email is not set",
            code: "EMAIL_MISSING"
          });
        }

        // Save new token
        await this.storage.saveEmailVerificationToken(
          user.id,
          user.email,
          hashedToken,
          expiresAt
        );

        // Send verification email
        await resendVerificationEmail(
          user.id,
          user.email,
          user.displayName || user.username || 'User',
          verificationToken
        );

        // Log resend event
        await db.insert(securityLogs).values({
          userId: user.id,
          ip: req.ip || 'unknown',
          action: 'verification_resend',
          resource: user.email,
          result: 'success',
          userAgent: req.headers['user-agent'] || ''
        });

        res.json({ 
          message: "Verification email has been resent. Please check your inbox.",
          code: "VERIFICATION_RESENT"
        });
      } catch (error: any) {
        console.error("Resend verification error:", error);
        res.status(500).json({ 
          message: "Failed to resend verification email",
          code: "RESEND_ERROR"
        });
      }
    });

    // Forgot password endpoint (no CSRF protection needed - public endpoint)
    this.router.post("/api/forgot-password", async (req: Request, res: Response) => {
      try {
        const { email } = z.object({ email: z.string().email() }).parse(req.body);

        // Always return the same response to prevent email enumeration
        const successResponse = {
          message: "If an account exists with this email, a password reset link has been sent.",
          code: "RESET_REQUESTED"
        };

        // Check if user exists
        const user = await this.storage.getUserByEmail(email);
        if (!user || !user.email) {
          // Don't reveal if email exists
          return res.json(successResponse);
        }

        // Rate limiting check (simple implementation)
        const recentRequests = await db.select()
          .from(securityLogs)
          .where(
            and(
              eq(securityLogs.userId, user.id),
              eq(securityLogs.action, 'password_reset_request'),
              gte(securityLogs.timestamp, new Date(Date.now() - 15 * 60 * 1000)) // Last 15 minutes
            )
          );

        if (recentRequests.length >= 3) {
          // Still return success to prevent enumeration
          return res.json(successResponse);
        }

        // Generate password reset token
        const resetToken = generatePasswordResetToken();
        const hashedToken = hashToken(resetToken);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 2); // Expires in 2 hours

        // Delete any existing reset tokens for this user
        const existingTokens = await db.select()
          .from(passwordResetTokens)
          .where(eq(passwordResetTokens.userId, user.id));
        
        for (const token of existingTokens) {
          await this.storage.deletePasswordResetToken(token.token);
        }

        // Save reset token
        await this.storage.savePasswordResetToken(
          user.id,
          hashedToken,
          expiresAt
        );

        // Send reset email
        try {
          await sendPasswordResetEmail(
            user.id,
            user.email,
            user.displayName || user.username || 'User',
            resetToken
          );
        } catch (emailError) {
          console.error('Failed to send reset email:', emailError);
        }

        // Log reset request
        await db.insert(securityLogs).values({
          userId: user.id,
          ip: req.ip || 'unknown',
          action: 'password_reset_request',
          resource: user.email,
          result: 'success',
          userAgent: req.headers['user-agent'] || ''
        });

        res.json(successResponse);
      } catch (error: any) {
        console.error("Password reset request error:", error);
        if (error.name === 'ZodError') {
          return res.status(400).json({ 
            message: "Invalid email format",
            code: "INVALID_EMAIL"
          });
        }
        res.status(500).json({ 
          message: "Failed to process password reset request",
          code: "RESET_ERROR"
        });
      }
    });

    // Reset password endpoint (no CSRF protection needed - token-based authentication)
    this.router.post("/api/reset-password", async (req: Request, res: Response) => {
      try {
        const { token, newPassword } = z.object({
          token: z.string(),
          newPassword: z.string().min(8).max(100)
        }).parse(req.body);

        // Hash the token to compare with stored hash
        const hashedToken = hashToken(token);

        // Get reset record
        const resetRecord = await this.storage.getPasswordResetByToken(hashedToken);
        if (!resetRecord) {
          return res.status(400).json({ 
            message: "Invalid or expired reset token",
            code: "INVALID_TOKEN"
          });
        }

        // Check if token has expired
        if (new Date() > resetRecord.expiresAt) {
          await this.storage.deletePasswordResetToken(hashedToken);
          return res.status(400).json({ 
            message: "Reset token has expired. Please request a new one.",
            code: "TOKEN_EXPIRED"
          });
        }

        // Check if token was already used
        if (resetRecord.usedAt) {
          return res.status(400).json({ 
            message: "This reset token has already been used",
            code: "TOKEN_USED"
          });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await this.storage.updateUser(resetRecord.userId, {
          passwordHash: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
          failedLoginAttempts: 0,
          lockedUntil: null
        });

        // Mark token as used
        await this.storage.markPasswordResetTokenUsed(hashedToken);

        // Log password reset
        await db.insert(securityLogs).values({
          userId: resetRecord.userId,
          ip: req.ip || 'unknown',
          action: 'password_reset_complete',
          resource: 'password',
          result: 'success',
          userAgent: req.headers['user-agent'] || ''
        });

        res.json({ 
          message: "Password reset successfully! You can now log in with your new password.",
          code: "PASSWORD_RESET"
        });
      } catch (error: any) {
        console.error("Password reset error:", error);
        if (error.name === 'ZodError') {
          return res.status(400).json({ 
            message: "Invalid request. Password must be at least 8 characters.",
            code: "INVALID_REQUEST",
            errors: error.errors
          });
        }
        res.status(500).json({ 
          message: "Failed to reset password",
          code: "RESET_ERROR"
        });
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }
}