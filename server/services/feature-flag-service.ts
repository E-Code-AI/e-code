import { FeatureFlags, FeatureFlagService, DEFAULT_FEATURE_FLAGS } from '../../shared/feature-flags';
import { DatabaseStorage } from '../storage';

interface UserFeatureFlags {
  userId: number;
  flags: Partial<FeatureFlags>;
  updatedAt: Date;
}

export class ServerFeatureFlagService {
  private static instance: ServerFeatureFlagService;
  private storage: DatabaseStorage;
  private userFlags = new Map<number, FeatureFlagService>();
  
  constructor() {
    this.storage = new DatabaseStorage();
  }
  
  static getInstance(): ServerFeatureFlagService {
    if (!ServerFeatureFlagService.instance) {
      ServerFeatureFlagService.instance = new ServerFeatureFlagService();
    }
    return ServerFeatureFlagService.instance;
  }
  
  async getUserFlags(userId: number): Promise<FeatureFlagService> {
    // Check cache first
    if (this.userFlags.has(userId)) {
      return this.userFlags.get(userId)!;
    }
    
    // Load from database
    try {
      const userFlagData = await this.loadUserFlags(userId);
      const flagService = new FeatureFlagService(userFlagData.flags);
      this.userFlags.set(userId, flagService);
      return flagService;
    } catch (error) {
      console.error('Error loading user flags:', error);
      // Return default flags
      const defaultService = new FeatureFlagService();
      this.userFlags.set(userId, defaultService);
      return defaultService;
    }
  }
  
  async updateUserFlags(userId: number, newFlags: Partial<FeatureFlags>): Promise<void> {
    try {
      // Update in database
      await this.saveUserFlags(userId, newFlags);
      
      // Update cache
      const existingService = this.userFlags.get(userId);
      if (existingService) {
        existingService.updateFlags(newFlags);
      } else {
        const flagService = new FeatureFlagService(newFlags);
        this.userFlags.set(userId, flagService);
      }
    } catch (error) {
      console.error('Error updating user flags:', error);
      throw error;
    }
  }
  
  async isUserFlagEnabled(userId: number, flagPath: string): Promise<boolean> {
    const userFlags = await this.getUserFlags(userId);
    return userFlags.isEnabled(flagPath);
  }
  
  // Check if user has privileged access to labs features
  async canAccessLabsFeatures(userId: number): Promise<boolean> {
    // For now, enable labs for all users in development and liv environment
    const env = process.env.NODE_ENV;
    const isLivEnvironment = process.env.PROJECT_NAME === 'liv';
    
    if (env === 'development' || isLivEnvironment) {
      return true;
    }
    
    // In production, check user permissions
    try {
      const user = await this.storage.getUserById(userId);
      return user?.role === 'admin' || user?.role === 'beta_tester';
    } catch (error) {
      return false;
    }
  }
  
  private async loadUserFlags(userId: number): Promise<UserFeatureFlags> {
    // Simulate database load - in real implementation this would query the database
    // For now, return default flags
    return {
      userId,
      flags: {},
      updatedAt: new Date(),
    };
  }
  
  private async saveUserFlags(userId: number, flags: Partial<FeatureFlags>): Promise<void> {
    // Simulate database save - in real implementation this would update the database
    console.log(`Saving user flags for user ${userId}:`, flags);
  }
  
  // Get global feature flags (not user-specific)
  getGlobalFlags(): FeatureFlagService {
    return new FeatureFlagService();
  }
  
  // Clear cache for a user (useful when flags are updated externally)
  clearUserCache(userId: number): void {
    this.userFlags.delete(userId);
  }
  
  // Clear all cache
  clearAllCache(): void {
    this.userFlags.clear();
  }
}