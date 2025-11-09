import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock node-fetch BEFORE importing service (hoisting)
const mockFetch = vi.fn();
vi.mock('node-fetch', () => ({
  default: mockFetch
}));

// Mock storage BEFORE importing service
vi.mock('../storage', () => ({
  storage: {
    createProject: vi.fn(),
    createFile: vi.fn(),
  }
}));

// NOW import service and storage (after mocks are set up)
import { FigmaImportService } from '../services/figma-import-service';
import { storage } from '../storage';

describe('FigmaImportService', () => {
  let service: FigmaImportService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    service = new FigmaImportService();
  });

  afterEach(() => {
    // Clear environment variables
    delete process.env.FIGMA_API_KEY;
  });

  describe('Real Figma API Integration', () => {
    it('should fetch real Figma file when API key is configured', async () => {
      // Set API key
      process.env.FIGMA_API_KEY = 'test-api-key';
      
      // Recreate service to pick up env var
      service = new FigmaImportService();
      
      // Mock successful API response
      const mockFigmaData = {
        document: {
          id: '0:0',
          name: 'Test Document',
          type: 'DOCUMENT',
          children: []
        },
        components: {},
        schemaVersion: 1,
        styles: {}
      };

      // Mock node-fetch response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFigmaData
      });

      const userId = 1;
      const figmaUrl = 'https://www.figma.com/file/ABC123/TestFile';
      
      (storage.createProject as any).mockResolvedValue({ 
        id: 123,
        name: 'Test Project'
      });
      (storage.createFile as any).mockResolvedValue({ id: 1 });

      await service.importFromUrl(figmaUrl, userId);

      // Verify node-fetch was called with correct params
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.figma.com/v1/files/ABC123',
        expect.objectContaining({
          headers: { 'X-Figma-Token': 'test-api-key' }
        })
      );
      expect(storage.createProject).toHaveBeenCalled();
    });

    it('should fall back to demo data on API error', async () => {
      process.env.FIGMA_API_KEY = 'test-api-key';
      service = new FigmaImportService();

      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const userId = 1;
      const figmaUrl = 'https://www.figma.com/file/ABC123/TestFile';
      
      (storage.createProject as any).mockResolvedValue({ 
        id: 123,
        name: 'Test Project'
      });
      (storage.createFile as any).mockResolvedValue({ id: 1 });

      const result = await service.importFromUrl(figmaUrl, userId);

      // Should still succeed with demo data
      expect(result).toBeDefined();
      expect(result.projectId).toBe(123);
      expect(storage.createProject).toHaveBeenCalled();
    });

    it('should fall back to demo data on 401 Unauthorized', async () => {
      process.env.FIGMA_API_KEY = 'invalid-key';
      service = new FigmaImportService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const userId = 1;
      const figmaUrl = 'https://www.figma.com/file/ABC123/TestFile';
      
      (storage.createProject as any).mockResolvedValue({ 
        id: 123,
        name: 'Test Project'
      });
      (storage.createFile as any).mockResolvedValue({ id: 1 });

      const result = await service.importFromUrl(figmaUrl, userId);

      expect(result).toBeDefined();
      expect(result.projectId).toBe(123);
      expect(storage.createProject).toHaveBeenCalled();
    });

    it('should fall back to demo data on 429 Rate Limit', async () => {
      process.env.FIGMA_API_KEY = 'test-api-key';
      service = new FigmaImportService();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429
      });

      const userId = 1;
      const figmaUrl = 'https://www.figma.com/file/ABC123/TestFile';
      
      (storage.createProject as any).mockResolvedValue({ 
        id: 123,
        name: 'Test Project'
      });
      (storage.createFile as any).mockResolvedValue({ id: 1 });

      const result = await service.importFromUrl(figmaUrl, userId);

      // Should fall back gracefully
      expect(result).toBeDefined();
      expect(result.projectId).toBe(123);
    });
  });

  describe('Fallback Mode (No API Key)', () => {
    it('should use demo data when no API key configured', async () => {
      // Ensure no API key
      delete process.env.FIGMA_API_KEY;
      service = new FigmaImportService();
      
      const userId = 1;
      const figmaUrl = 'https://www.figma.com/file/ABC123/TestFile';
      
      (storage.createProject as any).mockResolvedValue({ 
        id: 123,
        name: 'Test Project'
      });
      (storage.createFile as any).mockResolvedValue({ id: 1 });

      const result = await service.importFromUrl(figmaUrl, userId);

      // Should not call fetch
      expect(mockFetch).not.toHaveBeenCalled();
      
      // Should still return valid result
      expect(result).toBeDefined();
      expect(result.projectId).toBe(123);
      expect(result.filesCreated).toBeGreaterThan(0);
      expect(storage.createProject).toHaveBeenCalled();
    });

    it('should create project files in demo mode', async () => {
      delete process.env.FIGMA_API_KEY;
      service = new FigmaImportService();
      
      const userId = 1;
      const figmaUrl = 'https://www.figma.com/file/ABC123/TestFile';
      
      (storage.createProject as any).mockResolvedValue({ 
        id: 123,
        name: 'Test Project'
      });
      (storage.createFile as any).mockResolvedValue({ id: 1 });

      const result = await service.importFromUrl(figmaUrl, userId);

      // Should create multiple files (components + styles)
      expect(storage.createFile).toHaveBeenCalled();
      expect(result.filesCreated).toBeGreaterThan(0);
    });
  });

  describe('URL Parsing', () => {
    beforeEach(() => {
      (storage.createProject as any).mockResolvedValue({ 
        id: 123,
        name: 'Test Project'
      });
      (storage.createFile as any).mockResolvedValue({ id: 1 });
    });

    it('should extract file key from design URL format', async () => {
      const url = 'https://www.figma.com/design/XYZ789/MyDesign';
      
      const result = await service.importFromUrl(url, 1);

      expect(result).toBeDefined();
      expect(storage.createProject).toHaveBeenCalled();
    });

    it('should extract file key from file URL format', async () => {
      const url = 'https://www.figma.com/file/ABC123/OldFormat';
      
      const result = await service.importFromUrl(url, 1);

      expect(result).toBeDefined();
      expect(storage.createProject).toHaveBeenCalled();
    });

    it('should throw error on invalid URL', async () => {
      const url = 'https://invalid-url.com/not-figma';
      
      await expect(service.importFromUrl(url, 1)).rejects.toThrow('Invalid Figma URL');
    });

    it('should handle URLs with query parameters', async () => {
      const url = 'https://www.figma.com/file/ABC123/MyFile?node-id=1:2';
      
      const result = await service.importFromUrl(url, 1);

      expect(result).toBeDefined();
      expect(storage.createProject).toHaveBeenCalled();
    });
  });

  describe('Project Creation', () => {
    beforeEach(() => {
      (storage.createFile as any).mockResolvedValue({ id: 1 });
    });

    it('should use provided project name', async () => {
      const projectName = 'My Custom Project';
      const url = 'https://www.figma.com/file/ABC123/TestFile';
      const userId = 1;
      
      (storage.createProject as any).mockResolvedValue({ 
        id: 123,
        name: projectName
      });

      await service.importFromUrl(url, userId, projectName);

      expect(storage.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: projectName
        })
      );
    });

    it('should generate default project name if not provided', async () => {
      const url = 'https://www.figma.com/file/ABC123/TestFile';
      
      (storage.createProject as any).mockResolvedValue({ 
        id: 123,
        name: 'Figma Import - 2025-11-09'
      });

      await service.importFromUrl(url, 1);

      expect(storage.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('Figma Import')
        })
      );
    });

    it('should set correct project metadata', async () => {
      const url = 'https://www.figma.com/file/ABC123/TestFile';
      
      (storage.createProject as any).mockResolvedValue({ 
        id: 123,
        name: 'Test'
      });

      await service.importFromUrl(url, 1);

      expect(storage.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'javascript',
          visibility: 'private',
          ownerId: '1'
        })
      );
    });
  });
});
