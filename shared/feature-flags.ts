// Feature flags configuration for v1 Completion features
export interface FeatureFlags {
  // AI UX Enhancements
  aiUx: {
    improvePrompt: boolean;
    extendedThinking: boolean;
    highPowerMode: boolean;
    progressTab: boolean;
    pauseResume: boolean;
  };
  
  // Web Content Integration
  import: {
    url: boolean;
    screenshot: boolean;
    textExtract: boolean;
    figma: boolean;
    bolt: boolean;
    githubEnhanced: boolean;
  };
  
  // General feature flags
  labs: {
    enabled: boolean;
    betaFeatures: boolean;
  };
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  aiUx: {
    improvePrompt: false,
    extendedThinking: false,
    highPowerMode: false,
    progressTab: false,
    pauseResume: false,
  },
  import: {
    url: false,
    screenshot: false,
    textExtract: false,
    figma: false,
    bolt: false,
    githubEnhanced: false,
  },
  labs: {
    enabled: false,
    betaFeatures: false,
  },
};

// Environment-based feature flag overrides
export function getEnvironmentFeatureFlags(): Partial<FeatureFlags> {
  const env = process.env.NODE_ENV;
  const isLivEnvironment = process.env.PROJECT_NAME === 'liv';
  
  // Enable all features for development
  if (env === 'development') {
    return {
      aiUx: {
        improvePrompt: true,
        extendedThinking: true,
        highPowerMode: true,
        progressTab: true,
        pauseResume: true,
      },
      import: {
        url: true,
        screenshot: true,
        textExtract: true,
        figma: true,
        bolt: true,
        githubEnhanced: true,
      },
      labs: {
        enabled: true,
        betaFeatures: true,
      },
    };
  }
  
  // Enable specific features for liv environment
  if (isLivEnvironment) {
    return {
      labs: {
        enabled: true,
        betaFeatures: true,
      },
    };
  }
  
  return {};
}

// Feature flag utility functions
export class FeatureFlagService {
  private flags: FeatureFlags;
  
  constructor(userFlags?: Partial<FeatureFlags>) {
    const envFlags = getEnvironmentFeatureFlags();
    this.flags = this.mergeFlags(DEFAULT_FEATURE_FLAGS, envFlags, userFlags);
  }
  
  private mergeFlags(...flagsToMerge: Partial<FeatureFlags>[]): FeatureFlags {
    return flagsToMerge.reduce((merged, flags) => {
      if (!flags) return merged;
      
      return {
        aiUx: { ...merged.aiUx, ...flags.aiUx },
        import: { ...merged.import, ...flags.import },
        labs: { ...merged.labs, ...flags.labs },
      };
    }, DEFAULT_FEATURE_FLAGS);
  }
  
  isEnabled(flagPath: string): boolean {
    const parts = flagPath.split('.');
    let current: any = this.flags;
    
    for (const part of parts) {
      if (current[part] === undefined) return false;
      current = current[part];
    }
    
    return Boolean(current);
  }
  
  updateFlags(newFlags: Partial<FeatureFlags>): void {
    this.flags = this.mergeFlags(this.flags, newFlags);
  }
  
  getFlags(): FeatureFlags {
    return { ...this.flags };
  }
}