import { DatabaseStorage } from '../storage';
import { createLogger } from '../utils/logger';

const logger = createLogger('FeatureFlagsService');

export interface WebImportFeatureFlags {
  userId: number;
  urlImport: boolean;
  screenshotCapture: boolean;
  textExtraction: boolean;
  readabilityAlgorithm: boolean;
  htmlToMarkdown: boolean;
}

export interface FeatureFlags {
  userId: number;
  // Web Content Integration
  webImport: WebImportFeatureFlags;
  // Existing mobile flags
  mobile: {
    offlineMode: boolean;
    pushNotifications: boolean;
    biometricAuth: boolean;
    darkMode: boolean;
    autoSync: boolean;
    reducedMotion: boolean;
    dataSaver: boolean;
  };
  // AI Features
  ai: {
    promptRefinement: boolean;
    advancedCapabilities: boolean;
    progressTracking: boolean;
    enhancedContext: boolean;
  };
}

export class FeatureFlagsService {
  private storage: DatabaseStorage;
  
  constructor() {
    this.storage = new DatabaseStorage();
  }

  async getWebImportFeatureFlags(userId: number): Promise<WebImportFeatureFlags> {
    try {
      // In a real implementation, this would fetch from database
      // For now, return defaults with flags initially disabled as specified
      return {
        userId,
        urlImport: false, // Default off initially
        screenshotCapture: false, // Default off initially  
        textExtraction: false, // Default off initially
        readabilityAlgorithm: true, // Can be enabled for better content extraction
        htmlToMarkdown: true, // Can be enabled for better content conversion
      };
    } catch (error) {
      logger.error(`Failed to get web import feature flags for user ${userId}:`, error);
      throw error;
    }
  }

  async updateWebImportFeatureFlags(
    userId: number, 
    flags: Partial<WebImportFeatureFlags>
  ): Promise<void> {
    try {
      // In a real implementation, this would update the database
      logger.info(`Updated web import feature flags for user ${userId}:`, flags);
      
      // Here you would update the database with the new flags
      // await this.storage.updateWebImportFeatureFlags(userId, flags);
    } catch (error) {
      logger.error(`Failed to update web import feature flags for user ${userId}:`, error);
      throw error;
    }
  }

  async getAllFeatureFlags(userId: number): Promise<FeatureFlags> {
    try {
      const webImportFlags = await this.getWebImportFeatureFlags(userId);
      
      // Get other feature flags (mobile, ai, etc.)
      return {
        userId,
        webImport: webImportFlags,
        mobile: {
          offlineMode: true,
          pushNotifications: true,
          biometricAuth: false,
          darkMode: true,
          autoSync: true,
          reducedMotion: false,
          dataSaver: false,
        },
        ai: {
          promptRefinement: true,
          advancedCapabilities: true,
          progressTracking: true,
          enhancedContext: true,
        }
      };
    } catch (error) {
      logger.error(`Failed to get all feature flags for user ${userId}:`, error);
      throw error;
    }
  }

  async enableWebImportFeature(userId: number, feature: keyof WebImportFeatureFlags): Promise<void> {
    try {
      const currentFlags = await this.getWebImportFeatureFlags(userId);
      if (feature !== 'userId') {
        await this.updateWebImportFeatureFlags(userId, {
          ...currentFlags,
          [feature]: true
        });
        logger.info(`Enabled web import feature '${feature}' for user ${userId}`);
      }
    } catch (error) {
      logger.error(`Failed to enable web import feature '${feature}' for user ${userId}:`, error);
      throw error;
    }
  }

  async disableWebImportFeature(userId: number, feature: keyof WebImportFeatureFlags): Promise<void> {
    try {
      const currentFlags = await this.getWebImportFeatureFlags(userId);
      if (feature !== 'userId') {
        await this.updateWebImportFeatureFlags(userId, {
          ...currentFlags,
          [feature]: false
        });
        logger.info(`Disabled web import feature '${feature}' for user ${userId}`);
      }
    } catch (error) {
      logger.error(`Failed to disable web import feature '${feature}' for user ${userId}:`, error);
      throw error;
    }
  }

  async isWebImportEnabled(userId: number): Promise<boolean> {
    try {
      const flags = await this.getWebImportFeatureFlags(userId);
      return flags.urlImport;
    } catch (error) {
      logger.error(`Failed to check if web import is enabled for user ${userId}:`, error);
      return false;
    }
  }

  async isScreenshotEnabled(userId: number): Promise<boolean> {
    try {
      const flags = await this.getWebImportFeatureFlags(userId);
      return flags.screenshotCapture;
    } catch (error) {
      logger.error(`Failed to check if screenshot is enabled for user ${userId}:`, error);
      return false;
    }
  }

  async isTextExtractionEnabled(userId: number): Promise<boolean> {
    try {
      const flags = await this.getWebImportFeatureFlags(userId);
      return flags.textExtraction;
    } catch (error) {
      logger.error(`Failed to check if text extraction is enabled for user ${userId}:`, error);
      return false;
    }
  }
}

export const featureFlagsService = new FeatureFlagsService();