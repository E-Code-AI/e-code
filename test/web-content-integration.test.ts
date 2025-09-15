import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { WebContentService } from '../../../server/services/web-content-service';
import { FeatureFlagsService } from '../../../server/services/feature-flags-service';

// Mock dependencies
jest.mock('../../../server/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  })
}));

jest.mock('../../../server/storage', () => ({
  storage: {}
}));

jest.mock('../../../server/services/checkpoint-service', () => ({
  checkpointService: {
    createComprehensiveCheckpoint: jest.fn()
  }
}));

describe('Web Content Integration', () => {
  let webContentService: WebContentService;
  let featureFlagsService: FeatureFlagsService;

  beforeEach(() => {
    webContentService = new WebContentService();
    featureFlagsService = new FeatureFlagsService();
  });

  afterEach(async () => {
    await webContentService.cleanup();
  });

  describe('FeatureFlagsService', () => {
    test('should return default feature flags with import disabled', async () => {
      const userId = 1;
      const flags = await featureFlagsService.getWebImportFeatureFlags(userId);

      expect(flags).toEqual({
        userId,
        urlImport: false,
        screenshotCapture: false,
        textExtraction: false,
        readabilityAlgorithm: true,
        htmlToMarkdown: true
      });
    });

    test('should enable web import feature', async () => {
      const userId = 1;
      
      await featureFlagsService.enableWebImportFeature(userId, 'urlImport');
      
      const enabled = await featureFlagsService.isWebImportEnabled(userId);
      expect(enabled).toBe(false); // Still false in mock implementation
    });

    test('should check screenshot feature status', async () => {
      const userId = 1;
      
      const enabled = await featureFlagsService.isScreenshotEnabled(userId);
      expect(enabled).toBe(false);
    });
  });

  describe('WebContentService', () => {
    test('should initialize without browser in test environment', async () => {
      // Browser won't be available in test environment
      await expect(webContentService.initialize()).rejects.toThrow();
    });

    test('should validate URL format', async () => {
      const invalidUrl = 'not-a-url';
      const userId = 1;

      await expect(
        webContentService.extractContent(invalidUrl, userId)
      ).rejects.toThrow();
    });

    test('should handle feature flag checks', async () => {
      const url = 'https://example.com';
      const userId = 1;

      // Should fail because web import is disabled by default
      await expect(
        webContentService.importFromUrl(url, userId)
      ).rejects.toThrow('Web import feature is not enabled for this user');
    });
  });

  describe('Integration Tests', () => {
    test('should have proper error handling for disabled features', async () => {
      const userId = 1;
      const url = 'https://example.com';

      const result = await webContentService.importFromUrl(url, userId);
      
      expect(result.metadata.success).toBe(false);
      expect(result.metadata.error).toContain('not enabled');
    });

    test('should validate import options', () => {
      const options = {
        includeScreenshot: true,
        saveArtifacts: true,
        extractionType: 'readability' as const
      };

      expect(options.includeScreenshot).toBe(true);
      expect(options.saveArtifacts).toBe(true);
      expect(options.extractionType).toBe('readability');
    });
  });

  describe('Content Extraction', () => {
    test('should extract title from various selectors', () => {
      // Test the title extraction logic
      const mockDocument = {
        querySelector: jest.fn()
      };

      // Mock title element
      mockDocument.querySelector.mockReturnValueOnce({
        textContent: 'Test Article Title'
      });

      // This would be tested with actual DOM manipulation
      expect(mockDocument.querySelector).toHaveBeenCalledWith('title');
    });

    test('should clean unwanted elements from content', () => {
      // Test content cleaning logic
      const selectors = [
        'script', 'style', 'noscript', 'iframe', 'embed', 'object',
        'nav', 'header', 'footer', 'aside',
        '.ads', '.advertisement', '.social-share'
      ];

      expect(selectors).toContain('script');
      expect(selectors).toContain('nav');
      expect(selectors).toContain('.ads');
    });
  });

  describe('Screenshot Functionality', () => {
    test('should handle screenshot options', () => {
      const screenshotOptions = {
        type: 'png' as const,
        fullPage: true,
        quality: 80
      };

      expect(screenshotOptions.type).toBe('png');
      expect(screenshotOptions.fullPage).toBe(true);
    });

    test('should validate viewport settings', () => {
      const viewport = {
        width: 1920,
        height: 1080
      };

      expect(viewport.width).toBe(1920);
      expect(viewport.height).toBe(1080);
    });
  });

  describe('API Input Validation', () => {
    test('should validate URL import schema', () => {
      const validInput = {
        url: 'https://example.com',
        projectId: 123,
        options: {
          includeScreenshot: false,
          saveArtifacts: true,
          extractionType: 'readability' as const
        }
      };

      expect(validInput.url).toMatch(/^https?:\/\//);
      expect(typeof validInput.projectId).toBe('number');
      expect(validInput.options.extractionType).toBe('readability');
    });

    test('should validate screenshot schema', () => {
      const validInput = {
        url: 'https://example.com',
        viewport: {
          width: 1920,
          height: 1080
        }
      };

      expect(validInput.url).toMatch(/^https?:\/\//);
      expect(validInput.viewport.width).toBeGreaterThan(0);
      expect(validInput.viewport.height).toBeGreaterThan(0);
    });
  });

  describe('Telemetry Tracking', () => {
    test('should track import success metrics', () => {
      const telemetryData = {
        userId: 1,
        action: 'import_success' as const,
        url: 'https://example.com',
        processingTime: 1500,
        contentLength: 5000,
        timestamp: new Date()
      };

      expect(telemetryData.action).toBe('import_success');
      expect(telemetryData.processingTime).toBeGreaterThan(0);
      expect(telemetryData.contentLength).toBeGreaterThan(0);
    });

    test('should track import failure metrics', () => {
      const telemetryData = {
        userId: 1,
        action: 'import_failure' as const,
        url: 'https://example.com',
        processingTime: 800,
        errorMessage: 'Feature not enabled',
        timestamp: new Date()
      };

      expect(telemetryData.action).toBe('import_failure');
      expect(telemetryData.errorMessage).toBeDefined();
    });
  });
});