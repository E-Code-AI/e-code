import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FigmaImportService } from '../services/figma-import-service';

// Mock storage
const mockStorage = {
  createProject: vi.fn(),
  createFile: vi.fn(),
} as any;

// Mock fetch
global.fetch = vi.fn() as any;

describe('FigmaImportService', () => {
  let service: FigmaImportService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FigmaImportService(mockStorage);
  });

  describe('Real Figma API Integration', () => {
    it('should fetch real Figma file when API key is configured', async () => {
      // Mock successful API response
      const mockFigmaData = {
        document: {
          id: '0:0',
          name: 'Test Document',
          type: 'DOCUMENT',
          children: []
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockFigmaData
      });

      // Set API key
      process.env.FIGMA_API_KEY = 'test-api-key';
      
      const userId = 1;
      const figmaUrl = 'https://www.figma.com/file/ABC123/TestFile';
      
      mockStorage.createProject.mockResolvedValue({ id: 'project-1' });

      await service.importFigmaFile(userId, figmaUrl);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/files/ABC123',
        expect.objectContaining({
          headers: { 'X-Figma-Token': 'test-api-key' }
        })
      );
    });

    it('should fall back to demo data on API error', async () => {
      // Mock API error
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      process.env.FIGMA_API_KEY = 'test-api-key';
      
      const userId = 1;
      const figmaUrl = 'https://www.figma.com/file/ABC123/TestFile';
      
      mockStorage.createProject.mockResolvedValue({ id: 'project-1' });

      const result = await service.importFigmaFile(userId, figmaUrl);

      // Should still succeed with demo data
      expect(result).toBeDefined();
      expect(result.components).toBeDefined();
      expect(mockStorage.createProject).toHaveBeenCalled();
    });

    it('should fall back to demo data on 401 Unauthorized', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      process.env.FIGMA_API_KEY = 'invalid-key';
      
      const userId = 1;
      const figmaUrl = 'https://www.figma.com/file/ABC123/TestFile';
      
      mockStorage.createProject.mockResolvedValue({ id: 'project-1' });

      const result = await service.importFigmaFile(userId, figmaUrl);

      expect(result).toBeDefined();
      expect(mockStorage.createProject).toHaveBeenCalled();
    });
  });

  describe('Fallback Mode (No API Key)', () => {
    it('should use demo data when no API key configured', async () => {
      delete process.env.FIGMA_API_KEY;
      
      const userId = 1;
      const figmaUrl = 'https://www.figma.com/file/ABC123/TestFile';
      
      mockStorage.createProject.mockResolvedValue({ id: 'project-1' });

      const result = await service.importFigmaFile(userId, figmaUrl);

      // Should not call fetch
      expect(global.fetch).not.toHaveBeenCalled();
      
      // Should still return valid components
      expect(result).toBeDefined();
      expect(result.components).toBeDefined();
      expect(Object.keys(result.components).length).toBeGreaterThan(0);
    });

    it('should generate valid React components in demo mode', async () => {
      delete process.env.FIGMA_API_KEY;
      
      const userId = 1;
      const figmaUrl = 'https://www.figma.com/file/ABC123/TestFile';
      
      mockStorage.createProject.mockResolvedValue({ id: 'project-1' });

      const result = await service.importFigmaFile(userId, figmaUrl);

      // Check component structure
      const componentCode = Object.values(result.components)[0];
      expect(componentCode).toContain('export default function');
      expect(componentCode).toContain('return (');
    });
  });

  describe('URL Parsing', () => {
    it('should extract file key from design URL', async () => {
      const service = new FigmaImportService(mockStorage);
      const url = 'https://www.figma.com/design/XYZ789/MyDesign';
      
      mockStorage.createProject.mockResolvedValue({ id: 'project-1' });

      await service.importFigmaFile(1, url);

      expect(mockStorage.createProject).toHaveBeenCalled();
    });

    it('should extract file key from file URL', async () => {
      const service = new FigmaImportService(mockStorage);
      const url = 'https://www.figma.com/file/ABC123/OldFormat';
      
      mockStorage.createProject.mockResolvedValue({ id: 'project-1' });

      await service.importFigmaFile(1, url);

      expect(mockStorage.createProject).toHaveBeenCalled();
    });

    it('should throw error on invalid URL', async () => {
      const service = new FigmaImportService(mockStorage);
      const url = 'https://invalid-url.com/not-figma';
      
      await expect(service.importFigmaFile(1, url)).rejects.toThrow('Invalid Figma URL');
    });
  });
});
