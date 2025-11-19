/**
 * Feature Flags System
 * Fortune 500-grade feature management
 */

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  rolloutPercentage?: number; // 0-100
  rules?: FeatureFlagRule[];
}

export interface FeatureFlagRule {
  userId?: string;
  userGroup?: string;
  enabled: boolean;
}

class FeatureFlagsManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private userId?: string;

  init(flags: FeatureFlag[], userId?: string) {
    flags.forEach(flag => this.flags.set(flag.key, flag));
    this.userId = userId;
  }

  isEnabled(key: string): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;

    // Check user-specific rules
    if (flag.rules && this.userId) {
      const userRule = flag.rules.find(r => r.userId === this.userId);
      if (userRule) return userRule.enabled;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined) {
      const hash = this.hashUserId(this.userId || 'anonymous');
      return (hash % 100) < flag.rolloutPercentage;
    }

    return flag.enabled;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

export const featureFlags = new FeatureFlagsManager();

// Default flags
export const FLAGS = {
  COMMAND_PALETTE: 'command-palette',
  SEARCH_REPLACE: 'search-replace',
  AI_ASSISTANT: 'ai-assistant',
  ADVANCED_ANALYTICS: 'advanced-analytics',
  EXPERIMENTAL_FEATURES: 'experimental-features',
} as const;
