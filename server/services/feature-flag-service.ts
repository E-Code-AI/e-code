interface FeatureFlags {
  import: {
    figma: boolean;
    bolt: boolean;
    githubEnhanced: boolean;
  };
  [key: string]: any;
}

class FeatureFlagService {
  private flags: FeatureFlags;
  
  constructor() {
    this.flags = this.loadFlags();
  }

  private loadFlags(): FeatureFlags {
    // Load from environment variables with defaults
    return {
      import: {
        figma: process.env.FEATURE_FLAG_IMPORT_FIGMA === 'true' || false,
        bolt: process.env.FEATURE_FLAG_IMPORT_BOLT === 'true' || false,
        githubEnhanced: process.env.FEATURE_FLAG_IMPORT_GITHUB_ENHANCED === 'true' || false
      }
    };
  }

  isEnabled(flag: string): boolean {
    const parts = flag.split('.');
    let current: any = this.flags;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return false;
      }
    }
    
    return Boolean(current);
  }

  getFlags(): FeatureFlags {
    return { ...this.flags };
  }

  updateFlag(flag: string, value: boolean): void {
    const parts = flag.split('.');
    let current: any = this.flags;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
}

export const featureFlagService = new FeatureFlagService();
export type { FeatureFlags };