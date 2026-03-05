import { Router, Request, Response, NextFunction } from "express";
import { type IStorage } from "../storage";
import { ensureAuthenticated } from "../middleware/auth";
import { csrfProtection } from "../middleware/csrf";
import type { User } from "@shared/schema";
import bcrypt from "../utils/bcrypt-compat";

export class UsersRouter {
  private router: Router;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.router = Router();
    this.storage = storage;
    this.initializeRoutes();
  }

  // Use the shared ensureAuthenticated middleware for consistent authentication
  private ensureAuth = ensureAuthenticated;

  private initializeRoutes() {
    // GET /me — current authenticated user (MUST be before /:id to avoid "me" being treated as an ID)
    this.router.get("/me", this.ensureAuth, async (req: Request, res: Response) => {
      try {
        const userId = (req.user as any)?.id?.toString();
        if (!userId) {
          return res.status(401).json({ message: "Not authenticated", code: "UNAUTHORIZED" });
        }
        const user = await this.storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found", code: "USER_NOT_FOUND" });
        }
        const { passwordHash, ...safeUser } = user as any;
        res.json(safeUser);
      } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({ message: "Failed to fetch user", code: "FETCH_ERROR" });
      }
    });

    // Search users (MUST be before /:id to avoid "search" being captured as user ID)
    this.router.get("/search", async (req: Request, res: Response) => {
      try {
        const query = (req.query.q || '').toString();
        if (!query || query.length < 2) {
          return res.status(400).json({ message: "Search query must be at least 2 characters", code: "INVALID_QUERY" });
        }
        const foundUsers = await this.storage.searchUsers(query);
        const publicUsers = foundUsers.map(user => ({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl
        }));
        res.json(publicUsers);
      } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: "Failed to search users", code: "SEARCH_ERROR" });
      }
    });

    // Get user profile by ID
    this.router.get("/:id", async (req: Request, res: Response) => {
      try {
        const userId = req.params.id;
        const user = await this.storage.getUser(userId);
        
        if (!user) {
          return res.status(404).json({
            message: "User not found",
            code: "USER_NOT_FOUND"
          });
        }
        
        // Remove sensitive information
        const publicUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          createdAt: user.createdAt
        };
        
        res.json(publicUser);
      } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
          message: "Failed to fetch user",
          code: "FETCH_ERROR"
        });
      }
    });

    // Get user profile by username
    this.router.get("/username/:username", async (req: Request, res: Response) => {
      try {
        const username = req.params.username;
        const user = await this.storage.getUserByUsername(username);
        
        if (!user) {
          return res.status(404).json({
            message: "User not found",
            code: "USER_NOT_FOUND"
          });
        }
        
        // Remove sensitive information
        const publicUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          createdAt: user.createdAt
        };
        
        res.json(publicUser);
      } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
          message: "Failed to fetch user",
          code: "FETCH_ERROR"
        });
      }
    });

    // Update user profile
    this.router.put("/:id", this.ensureAuth, csrfProtection, async (req: Request, res: Response) => {
      try {
        const userId = req.params.id;
        
        // Can only update own profile
        if (req.user!.id !== userId) {
          return res.status(403).json({
            message: "Can only update own profile",
            code: "ACCESS_DENIED"
          });
        }
        
        const updates = req.body;
        
        // Don't allow changing id or username
        delete updates.id;
        delete updates.username;
        
        // If updating password, hash it
        if (updates.password) {
          updates.password = await bcrypt.hash(updates.password, 10);
        }
        
        const user = await this.storage.updateUser(userId, updates);
        
        if (!user) {
          return res.status(404).json({
            message: "User not found",
            code: "USER_NOT_FOUND"
          });
        }
        
        // Remove sensitive information
        const publicUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          createdAt: user.createdAt
        };
        
        res.json(publicUser);
      } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
          message: "Failed to update user",
          code: "UPDATE_ERROR"
        });
      }
    });

    // Delete user account
    this.router.delete("/:id", this.ensureAuth, csrfProtection, async (req: Request, res: Response) => {
      try {
        const userId = req.params.id;
        
        // Can only delete own account
        if (req.user!.id !== userId) {
          return res.status(403).json({
            message: "Can only delete own account",
            code: "ACCESS_DENIED"
          });
        }
        
        await this.storage.deleteUser(userId);
        
        // Logout after deletion
        req.logout((err: any) => {
          if (err) {
            console.error('Logout error after account deletion:', err);
          }
          res.json({ message: "Account deleted successfully" });
        });
      } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
          message: "Failed to delete user",
          code: "DELETE_ERROR"
        });
      }
    });

    // Get user usage (resource consumption metrics)
    this.router.get("/usage", this.ensureAuth, async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const user = await this.storage.getUser(String(userId));
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        // Get plan allowances from canonical pricing constants
        const { getPlanByTier } = await import('../payments/pricing-constants');
        const tier = (user.subscriptionTier || 'free') as 'free' | 'core' | 'teams' | 'enterprise';
        const plan = getPlanByTier(tier);
        const allowances = plan.allowances;
        
        // Get actual usage from user record (already tracked by billing service)
        const computeUsed = parseFloat(user.usageComputeHours?.toString() || '0');
        const storageUsed = parseFloat(user.usageStorageGb?.toString() || '0');
        const bandwidthUsed = parseFloat(user.usageBandwidthGb?.toString() || '0');
        const deploymentsUsed = parseInt(user.usageDeployments?.toString() || '0');
        
        // Get project count from projects table
        let projectCount = 0;
        try {
          const projects = await this.storage.getProjectsByUserId(String(userId));
          projectCount = projects?.length || 0;
        } catch (e) {
          projectCount = 0;
        }
        
        // Calculate percentages safely (handle -1 for unlimited)
        const calcPercentage = (used: number, limit: number): number => {
          if (limit === -1) return 0; // Unlimited
          if (limit === 0) return 0;
          return Math.min(100, (used / limit) * 100);
        };
        
        const usage = {
          compute: {
            used: computeUsed,
            limit: allowances.developmentMinutes === -1 ? -1 : allowances.developmentMinutes / 60, // Convert minutes to hours
            unit: 'hours',
            percentage: calcPercentage(computeUsed, allowances.developmentMinutes / 60)
          },
          storage: {
            used: storageUsed,
            limit: allowances.storageGb,
            unit: 'GB',
            percentage: calcPercentage(storageUsed, allowances.storageGb)
          },
          bandwidth: {
            used: bandwidthUsed,
            limit: allowances.bandwidthGb,
            unit: 'GB',
            percentage: calcPercentage(bandwidthUsed, allowances.bandwidthGb)
          },
          privateProjects: {
            used: projectCount,
            limit: allowances.privateApps,
            unit: 'projects',
            percentage: calcPercentage(projectCount, allowances.privateApps)
          },
          deployments: {
            used: deploymentsUsed,
            limit: allowances.publicApps, // Use publicApps as deployment limit
            unit: 'deployments',
            percentage: calcPercentage(deploymentsUsed, allowances.publicApps)
          },
          collaborators: {
            used: 1, // Current user
            limit: allowances.collaborators,
            unit: 'users',
            percentage: calcPercentage(1, allowances.collaborators)
          }
        };
        
        res.json(usage);
      } catch (error) {
        console.error('Error fetching user usage:', error);
        res.status(500).json({ error: 'Failed to fetch usage data' });
      }
    });

    // Get user billing information
    this.router.get("/billing", this.ensureAuth, async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const user = await this.storage.getUser(String(userId));
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        // Calculate billing cycle dates
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const daysInMonth = endOfMonth.getDate();
        const currentDay = today.getDate();
        const daysRemaining = daysInMonth - currentDay + 1;
        
        // Map tier to plan name
        const planNames: Record<string, string> = {
          free: 'Starter (Free)',
          core: 'Core',
          teams: 'Teams',
          enterprise: 'Enterprise'
        };
        
        const tier = user.subscriptionTier || 'free';
        
        // Previous billing cycles - empty array until real Stripe billing history integration
        // Real billing history would be fetched from Stripe invoices or stored payment records
        const previousCycles: Array<{ month: string; period: string; amount: string; plan: string }> = [];
        
        res.json({
          currentCycle: {
            start: startOfMonth,
            end: endOfMonth,
            daysRemaining
          },
          plan: planNames[tier] || 'Free',
          tier,
          subscriptionStatus: user.subscriptionStatus || 'inactive',
          previousCycles
        });
      } catch (error) {
        console.error('Error fetching billing info:', error);
        res.status(500).json({ error: 'Failed to fetch billing information' });
      }
    });

    // Get user billing summary (for Account page)
    this.router.get("/billing-summary", this.ensureAuth, async (req: Request, res: Response) => {
      try {
        const userId = req.user!.id;
        const user = await this.storage.getUser(String(userId));
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        const tier = user.subscriptionTier || 'free';
        
        // Plan pricing (monthly)
        const planPricing: Record<string, number> = {
          free: 0,
          core: 25,
          teams: 40,
          enterprise: 200
        };
        
        // Plan names
        const planNames: Record<string, string> = {
          free: 'Starter (Free)',
          core: 'Core',
          teams: 'Teams',
          enterprise: 'Enterprise'
        };
        
        // Plan usage limits
        const planLimits: Record<string, { compute: number; storage: number; privateRepls: string }> = {
          free: { compute: 50, storage: 5, privateRepls: '3' },
          core: { compute: 200, storage: 20, privateRepls: 'Unlimited' },
          teams: { compute: 500, storage: 50, privateRepls: 'Unlimited' },
          enterprise: { compute: 2000, storage: 200, privateRepls: 'Unlimited' }
        };
        
        const limits = planLimits[tier] || planLimits.free;
        
        // Get actual usage from user record
        const computeUsed = parseFloat(user.usageComputeHours?.toString() || '0');
        const storageUsed = parseFloat(user.usageStorageGb?.toString() || '0');
        
        // Get project count for private repls
        const projects = await this.storage.getProjectsByUserId(String(userId));
        const projectCount = projects.length;
        
        // Calculate next billing date
        const today = new Date();
        const nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        
        res.json({
          plan: planNames[tier] || 'Free',
          monthlyCost: planPricing[tier] || 0,
          nextBillingDate: nextBillingDate.toISOString(),
          usage: {
            compute: { used: computeUsed, limit: limits.compute },
            storage: { used: storageUsed, limit: parseInt(limits.storage.toString()) },
            privateRepls: { used: projectCount, limit: limits.privateRepls }
          },
          paymentMethod: null // Real payment method data fetched from Stripe when available
        });
      } catch (error) {
        console.error('Error fetching billing summary:', error);
        res.status(500).json({ error: 'Failed to fetch billing summary' });
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }
}