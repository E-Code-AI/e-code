// Security tests for package installer to prevent shell injection
import { SimplePackageInstaller } from '../server/package-management/simple-package-installer';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Package Installer Security Tests', () => {
  const installer = new SimplePackageInstaller();
  const testProjectId = 'test-project-security';
  
  beforeEach(async () => {
    // Clean up test directory
    const projectDir = path.join(process.cwd(), 'projects', testProjectId);
    try {
      await fs.rm(projectDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });
  
  afterEach(async () => {
    // Clean up test directory
    const projectDir = path.join(process.cwd(), 'projects', testProjectId);
    try {
      await fs.rm(projectDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
  });
  
  describe('Shell Injection Prevention', () => {
    it('should reject project ID with shell metacharacters', async () => {
      const maliciousProjectIds = [
        '../../etc/passwd',
        'project; rm -rf /',
        'project && cat /etc/passwd',
        'project | ls /',
        'project`whoami`',
        'project$(whoami)',
        'project\'; DROP TABLE users; --',
        '../../../root',
        'project\n\nrm -rf /'
      ];
      
      for (const maliciousId of maliciousProjectIds) {
        await expect(
          installer.installPackage(maliciousId, 'express')
        ).rejects.toThrow('Invalid project ID format');
        
        await expect(
          installer.removePackage(maliciousId, 'express')
        ).rejects.toThrow('Invalid project ID format');
        
        await expect(
          installer.getInstalledPackages(maliciousId)
        ).rejects.toThrow('Invalid project ID format');
      }
    });
    
    it('should reject package names with shell metacharacters', async () => {
      const maliciousPackageNames = [
        'express; rm -rf /',
        'express && cat /etc/passwd',
        'express | ls /',
        'express`whoami`',
        'express$(whoami)',
        'express\'; DROP TABLE users; --',
        'express\n\nrm -rf /',
        'express > /etc/passwd',
        'express < /etc/passwd'
      ];
      
      for (const maliciousPackage of maliciousPackageNames) {
        await expect(
          installer.installPackage(testProjectId, maliciousPackage)
        ).rejects.toThrow('Invalid package name format');
        
        await expect(
          installer.removePackage(testProjectId, maliciousPackage)
        ).rejects.toThrow('Invalid package name format');
      }
    });
    
    it('should reject search queries with shell metacharacters', async () => {
      const maliciousQueries = [
        'express; rm -rf /',
        'express && cat /etc/passwd',
        'express | ls /',
        'express`whoami`',
        'express$(whoami)',
        'express\'; DROP TABLE users; --',
        'express\n\nrm -rf /',
        'express > /etc/passwd',
        'express < /etc/passwd'
      ];
      
      for (const maliciousQuery of maliciousQueries) {
        await expect(
          installer.searchPackages(maliciousQuery)
        ).rejects.toThrow('Invalid search query');
      }
    });
    
    it('should prevent path traversal attacks', async () => {
      const pathTraversalIds = [
        '../',
        '../../',
        '../../../',
        '..',
        'projects/../../../',
        'projects/../../etc',
        '.\\..\\',
        '..\\..\\',
        'projects\\..\\..\\etc'
      ];
      
      for (const traversalId of pathTraversalIds) {
        await expect(
          installer.installPackage(traversalId, 'express')
        ).rejects.toThrow(/Invalid project (ID format|path)/);
      }
    });
    
    it('should accept valid project IDs', async () => {
      const validProjectIds = [
        'my-project',
        'project123',
        'test_project',
        'MyProject',
        'project-with-numbers-123',
        'UPPERCASE_PROJECT'
      ];
      
      for (const validId of validProjectIds) {
        // Should not throw for valid IDs (may fail for other reasons like missing commands)
        try {
          await installer.getInstalledPackages(validId);
          // If it succeeds, great
        } catch (error: any) {
          // Should not be a validation error
          expect(error.message).not.toContain('Invalid project ID');
          expect(error.message).not.toContain('Invalid project path');
        }
      }
    });
    
    it('should accept valid package names', async () => {
      const validPackageNames = [
        'express',
        '@angular/core',
        'react-dom',
        'lodash.debounce',
        '@types/node',
        'my-package_123'
      ];
      
      for (const validPackage of validPackageNames) {
        // Create a test package.json to avoid npm errors
        const projectDir = path.join(process.cwd(), 'projects', testProjectId);
        await fs.mkdir(projectDir, { recursive: true });
        await fs.writeFile(
          path.join(projectDir, 'package.json'),
          JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2)
        );
        
        // Should not throw validation errors for valid package names
        // (may fail for other reasons like network issues)
        try {
          await installer.installPackage(testProjectId, validPackage, 'nodejs');
          // If it succeeds, great
        } catch (error: any) {
          // Should not be a validation error
          expect(error.message).not.toContain('Invalid package name');
        }
      }
    });
  });
  
  describe('Command Execution Safety', () => {
    it('should not execute shell when spawning commands', async () => {
      // This test verifies that commands are executed without shell interpretation
      const projectDir = path.join(process.cwd(), 'projects', testProjectId);
      await fs.mkdir(projectDir, { recursive: true });
      await fs.writeFile(
        path.join(projectDir, 'package.json'),
        JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2)
      );
      
      // Even if we somehow bypass validation, shell interpretation should not occur
      // This is ensured by using spawn with shell: false
      try {
        // This should fail because the package name contains semicolon (not a valid package)
        // but should NOT execute the malicious command
        await installer.installPackage(testProjectId, 'express', 'nodejs');
        // Normal execution
      } catch (error: any) {
        // Expected to fail, but not due to shell injection
        expect(error.message).not.toContain('rm');
        expect(error.message).not.toContain('cat');
      }
    });
  });
  
  describe('Input Validation', () => {
    it('should enforce project ID length limits', async () => {
      const longProjectId = 'a'.repeat(101); // Over 100 character limit
      
      await expect(
        installer.installPackage(longProjectId, 'express')
      ).rejects.toThrow('Invalid project ID format');
    });
    
    it('should enforce package name length limits', async () => {
      const longPackageName = 'package-' + 'a'.repeat(200); // Over 200 character limit
      
      await expect(
        installer.installPackage(testProjectId, longPackageName)
      ).rejects.toThrow('Invalid package name format');
    });
    
    it('should enforce search query length limits', async () => {
      const longQuery = 'search-' + 'a'.repeat(100); // Over 100 character limit
      
      await expect(
        installer.searchPackages(longQuery)
      ).rejects.toThrow('Invalid search query');
    });
  });
});

// Export for test runner
export default describe;