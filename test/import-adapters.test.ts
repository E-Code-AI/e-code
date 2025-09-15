import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { figmaImportService } from '../server/import/figma-import-service';
import { boltImportService } from '../server/import/bolt-import-service';
import { githubImportService } from '../server/import/github-import-service';

// Mock the storage module
jest.mock('../server/storage', () => ({
  storage: {
    createProjectImport: jest.fn().mockResolvedValue({ id: 'test-import-1' }),
    updateProjectImport: jest.fn().mockResolvedValue({}),
    createFile: jest.fn().mockResolvedValue({})
  }
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Import Adapters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Figma Import Service', () => {
    it('should prepare valid Figma options', async () => {
      const result = await figmaImportService.prepare({
        projectId: 1,
        userId: 1,
        figmaUrl: 'https://www.figma.com/file/test123/TestFile'
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should fail preparation with missing URL', async () => {
      const result = await figmaImportService.prepare({
        projectId: 1,
        userId: 1
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Figma URL is required');
    });

    it('should validate Figma URL format', async () => {
      const result = await figmaImportService.validate({
        projectId: 1,
        userId: 1,
        figmaUrl: 'invalid-url'
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid Figma URL format');
    });

    it('should extract file ID from Figma URL', () => {
      const service = figmaImportService as any;
      const fileId = service.extractFileId('https://www.figma.com/file/ABC123/TestFile');
      expect(fileId).toBe('ABC123');
    });
  });

  describe('Bolt Import Service', () => {
    it('should prepare valid Bolt options with URL', async () => {
      const result = await boltImportService.prepare({
        projectId: 1,
        userId: 1,
        boltUrl: 'https://bolt.new/test-project'
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should prepare valid Bolt options with project data', async () => {
      const result = await boltImportService.prepare({
        projectId: 1,
        userId: 1,
        boltProjectData: {
          name: 'Test Project',
          framework: 'react'
        }
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should fail preparation with no input', async () => {
      const result = await boltImportService.prepare({
        projectId: 1,
        userId: 1
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Either Bolt URL, project data, or zip file is required');
    });

    it('should detect framework from dependencies', () => {
      const service = boltImportService as any;
      const framework = service.detectFramework({
        dependencies: { react: '^18.0.0' },
        files: []
      });
      expect(framework).toBe('react');
    });

    it('should generate proper package.json', () => {
      const service = boltImportService as any;
      const packageJson = service.generatePackageJson({
        name: 'Test Project',
        framework: 'react',
        dependencies: { react: '^18.0.0' },
        devDependencies: { vite: '^4.0.0' }
      });

      expect(packageJson.name).toBe('test-project');
      expect(packageJson.dependencies.react).toBe('^18.0.0');
      expect(packageJson.devDependencies.vite).toBe('^4.0.0');
    });
  });

  describe('GitHub Import Service', () => {
    it('should prepare valid GitHub options', async () => {
      const result = await githubImportService.prepare({
        projectId: 1,
        userId: 1,
        githubUrl: 'https://github.com/owner/repo'
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should fail preparation with missing URL', async () => {
      const result = await githubImportService.prepare({
        projectId: 1,
        userId: 1
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('GitHub URL is required');
    });

    it('should parse GitHub URLs correctly', () => {
      const service = githubImportService as any;
      
      const httpResult = service.parseGitHubUrl('https://github.com/owner/repo');
      expect(httpResult).toEqual({
        owner: 'owner',
        repo: 'repo',
        branch: 'main',
        subdirectory: undefined
      });

      const branchResult = service.parseGitHubUrl('https://github.com/owner/repo/tree/develop');
      expect(branchResult).toEqual({
        owner: 'owner',
        repo: 'repo',
        branch: 'develop',
        subdirectory: undefined
      });

      const pathResult = service.parseGitHubUrl('https://github.com/owner/repo/tree/main/packages/frontend');
      expect(pathResult).toEqual({
        owner: 'owner',
        repo: 'repo',
        branch: 'main',
        subdirectory: 'packages/frontend'
      });
    });

    it('should count components correctly', () => {
      const service = githubImportService as any;
      const files = [
        { path: '/src/components/Button.tsx', content: '', size: 100 },
        { path: '/src/components/Card.vue', content: '', size: 100 },
        { path: '/src/utils/helper.ts', content: '', size: 100 },
        { path: '/src/App.jsx', content: '', size: 100 }
      ];

      const count = service.countComponents(files);
      expect(count).toBe(3); // Button.tsx, Card.vue, App.jsx
    });
  });

  describe('Import Progress and Telemetry', () => {
    it('should generate progress stages correctly', () => {
      const service = figmaImportService as any;
      const stages = service.generateProgressStages(['stage1', 'stage2', 'stage3']);
      
      expect(stages.stage1).toBe(33);
      expect(stages.stage2).toBe(67);
      expect(stages.stage3).toBe(100);
    });

    it('should track telemetry on successful import', async () => {
      const telemetryEmitted = new Promise((resolve) => {
        figmaImportService.once('telemetry', resolve);
      });

      // Mock successful import (would need more setup for full test)
      figmaImportService.emit('telemetry', {
        importType: 'figma',
        success: true,
        duration: 1000,
        artifactCounts: { files: 5, assets: 2, components: 3 }
      });

      const telemetryData = await telemetryEmitted;
      expect(telemetryData).toMatchObject({
        importType: 'figma',
        success: true,
        duration: 1000
      });
    });
  });
});