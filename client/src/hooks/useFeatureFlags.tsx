import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { FeatureFlags, FeatureFlagService } from '../../../shared/feature-flags';

interface FeatureFlagContextType {
  flags: FeatureFlags;
  isEnabled: (flagPath: string) => boolean;
  updateFlags: (newFlags: Partial<FeatureFlags>) => Promise<void>;
  loading: boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null);

interface FeatureFlagProviderProps {
  children: ReactNode;
  userId?: number;
}

export function FeatureFlagProvider({ children, userId }: FeatureFlagProviderProps) {
  const [flagService, setFlagService] = useState<FeatureFlagService>(new FeatureFlagService());
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadUserFlags();
  }, [userId]);
  
  const loadUserFlags = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/feature-flags/${userId}`);
      if (response.ok) {
        const userFlags = await response.json();
        setFlagService(new FeatureFlagService(userFlags));
      }
    } catch (error) {
      console.error('Error loading user feature flags:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const updateFlags = async (newFlags: Partial<FeatureFlags>) => {
    if (!userId) {
      // Update local flags only
      flagService.updateFlags(newFlags);
      setFlagService(new FeatureFlagService(flagService.getFlags()));
      return;
    }
    
    try {
      const response = await fetch(`/api/feature-flags/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFlags),
      });
      
      if (response.ok) {
        flagService.updateFlags(newFlags);
        setFlagService(new FeatureFlagService(flagService.getFlags()));
      }
    } catch (error) {
      console.error('Error updating feature flags:', error);
      throw error;
    }
  };
  
  const contextValue: FeatureFlagContextType = {
    flags: flagService.getFlags(),
    isEnabled: (flagPath: string) => flagService.isEnabled(flagPath),
    updateFlags,
    loading,
  };
  
  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags(): FeatureFlagContextType {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
}

// Convenience hook for checking a specific flag
export function useFeatureFlag(flagPath: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(flagPath);
}

// Hook for labs/beta features
export function useLabsAccess(): boolean {
  return useFeatureFlag('labs.enabled');
}