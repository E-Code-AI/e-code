interface UserQuota {
  userId: number;
  remainingCredits: number;
  dailyLimit: number;
  monthlyLimit: number;
  usedToday: number;
  usedThisMonth: number;
  lastReset: Date;
  tier: 'free' | 'pro' | 'enterprise';
}

interface CostMultipliers {
  extendedThinking: number;
  highPowerMode: number;
  baseCredit: number;
}

export class AIQuotaService {
  private static instance: AIQuotaService;
  private quotaCache = new Map<number, UserQuota>();
  
  private readonly costMultipliers: CostMultipliers = {
    extendedThinking: 2.0,
    highPowerMode: 5.0,
    baseCredit: 1.0,
  };
  
  private readonly tierLimits = {
    free: { daily: 50, monthly: 1000 },
    pro: { daily: 500, monthly: 15000 },
    enterprise: { daily: 5000, monthly: 100000 },
  };
  
  static getInstance(): AIQuotaService {
    if (!AIQuotaService.instance) {
      AIQuotaService.instance = new AIQuotaService();
    }
    return AIQuotaService.instance;
  }
  
  async getUserQuota(userId: number): Promise<UserQuota> {
    // Check cache first
    const cached = this.quotaCache.get(userId);
    if (cached && this.isQuotaValid(cached)) {
      return cached;
    }
    
    // Load from database (mock implementation)
    const quota = await this.loadUserQuotaFromDB(userId);
    this.quotaCache.set(userId, quota);
    return quota;
  }
  
  async checkQuota(userId: number, options: {
    extendedThinking?: boolean;
    highPowerMode?: boolean;
    estimatedTokens?: number;
  } = {}): Promise<{
    allowed: boolean;
    remainingCredits: number;
    estimatedCost: number;
    warning: boolean;
    reason?: string;
  }> {
    const quota = await this.getUserQuota(userId);
    const estimatedCost = this.calculateCost(options);
    
    // Check daily limit
    if (quota.usedToday + estimatedCost > quota.dailyLimit) {
      return {
        allowed: false,
        remainingCredits: quota.remainingCredits,
        estimatedCost,
        warning: false,
        reason: 'Daily limit exceeded'
      };
    }
    
    // Check monthly limit
    if (quota.usedThisMonth + estimatedCost > quota.monthlyLimit) {
      return {
        allowed: false,
        remainingCredits: quota.remainingCredits,
        estimatedCost,
        warning: false,
        reason: 'Monthly limit exceeded'
      };
    }
    
    // Check remaining credits
    if (quota.remainingCredits < estimatedCost) {
      return {
        allowed: false,
        remainingCredits: quota.remainingCredits,
        estimatedCost,
        warning: false,
        reason: 'Insufficient credits'
      };
    }
    
    // Check for warning thresholds
    const warning = quota.remainingCredits < quota.dailyLimit * 0.2 || // Less than 20% of daily limit
                   quota.remainingCredits < 100; // Less than 100 credits
    
    return {
      allowed: true,
      remainingCredits: quota.remainingCredits,
      estimatedCost,
      warning
    };
  }
  
  async consumeCredits(userId: number, options: {
    extendedThinking?: boolean;
    highPowerMode?: boolean;
    actualTokens?: number;
    sessionId?: string;
  }): Promise<void> {
    const cost = this.calculateCost(options);
    const quota = await this.getUserQuota(userId);
    
    // Update usage
    quota.remainingCredits -= cost;
    quota.usedToday += cost;
    quota.usedThisMonth += cost;
    
    // Update cache and database
    this.quotaCache.set(userId, quota);
    await this.saveUserQuotaToDB(userId, quota);
    
    // Log usage for analytics
    await this.logUsage(userId, {
      cost,
      options,
      timestamp: new Date()
    });
  }
  
  async resetDailyUsage(): Promise<void> {
    // This would typically be called by a cron job
    for (const [userId, quota] of this.quotaCache) {
      if (this.shouldResetDaily(quota)) {
        quota.usedToday = 0;
        quota.lastReset = new Date();
        this.quotaCache.set(userId, quota);
        await this.saveUserQuotaToDB(userId, quota);
      }
    }
  }
  
  private calculateCost(options: {
    extendedThinking?: boolean;
    highPowerMode?: boolean;
    estimatedTokens?: number;
    actualTokens?: number;
  }): number {
    let cost = this.costMultipliers.baseCredit;
    
    if (options.extendedThinking) {
      cost *= this.costMultipliers.extendedThinking;
    }
    
    if (options.highPowerMode) {
      cost *= this.costMultipliers.highPowerMode;
    }
    
    // Factor in token usage if provided
    const tokens = options.actualTokens || options.estimatedTokens || 1000;
    const tokenMultiplier = Math.max(1, tokens / 1000); // Base cost per 1000 tokens
    cost *= tokenMultiplier;
    
    return Math.ceil(cost);
  }
  
  private isQuotaValid(quota: UserQuota): boolean {
    const now = new Date();
    const daysSinceReset = (now.getTime() - quota.lastReset.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceReset < 1; // Valid for 24 hours
  }
  
  private shouldResetDaily(quota: UserQuota): boolean {
    const now = new Date();
    const lastReset = new Date(quota.lastReset);
    return now.getDate() !== lastReset.getDate() || 
           now.getMonth() !== lastReset.getMonth() ||
           now.getFullYear() !== lastReset.getFullYear();
  }
  
  private async loadUserQuotaFromDB(userId: number): Promise<UserQuota> {
    // Mock implementation - in real app this would query the database
    const now = new Date();
    return {
      userId,
      remainingCredits: 1000,
      dailyLimit: this.tierLimits.free.daily,
      monthlyLimit: this.tierLimits.free.monthly,
      usedToday: 0,
      usedThisMonth: 0,
      lastReset: now,
      tier: 'free'
    };
  }
  
  private async saveUserQuotaToDB(userId: number, quota: UserQuota): Promise<void> {
    // Mock implementation - in real app this would update the database
    console.log(`Saving quota for user ${userId}:`, quota);
  }
  
  private async logUsage(userId: number, usage: {
    cost: number;
    options: any;
    timestamp: Date;
  }): Promise<void> {
    // Mock implementation - in real app this would log to analytics
    console.log(`Usage logged for user ${userId}:`, usage);
  }
}