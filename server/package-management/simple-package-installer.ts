// @ts-nocheck
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

// Helper function to get project directory
async function getProjectDirectory(projectId: string): Promise<string> {
  const projectDir = path.join(process.cwd(), 'projects', projectId);
  
  // Ensure directory exists
  try {
    await fs.mkdir(projectDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  return projectDir;
}

export interface InstalledPackage {
  name: string;
  version: string;
  attribute?: string;
}

export class SimplePackageInstaller {
  async installPackage(projectId: string, packageName: string, language?: string): Promise<void> {
    const projectDir = await getProjectDirectory(projectId);
    
    // Detect language from project or use provided one
    const detectedLanguage = language || await this.detectLanguage(projectDir);
    
    switch (detectedLanguage) {
      case 'nodejs':
      case 'javascript':
      case 'typescript':
        await this.installNpmPackage(projectDir, packageName);
        break;
      case 'python':
      case 'python3':
        await this.installPipPackage(projectDir, packageName);
        break;
      case 'ruby':
        await this.installGemPackage(projectDir, packageName);
        break;
      default:
        // Try npm as default
        await this.installNpmPackage(projectDir, packageName);
    }
  }
  
  async removePackage(projectId: string, packageName: string, language?: string): Promise<void> {
    const projectDir = await getProjectDirectory(projectId);
    const detectedLanguage = language || await this.detectLanguage(projectDir);
    
    switch (detectedLanguage) {
      case 'nodejs':
      case 'javascript':
      case 'typescript':
        await execAsync(`cd ${projectDir} && npm uninstall ${packageName}`);
        break;
      case 'python':
      case 'python3':
        await execAsync(`cd ${projectDir} && pip uninstall -y ${packageName}`);
        break;
      case 'ruby':
        await execAsync(`cd ${projectDir} && gem uninstall ${packageName}`);
        break;
    }
  }
  
  async getInstalledPackages(projectId: string): Promise<InstalledPackage[]> {
    const projectDir = await getProjectDirectory(projectId);
    const packages: InstalledPackage[] = [];
    
    // Check for Node.js packages
    try {
      const packageJsonPath = path.join(projectDir, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      for (const [name, version] of Object.entries(deps)) {
        packages.push({ name, version: version as string });
      }
    } catch (error) {
      // No package.json
    }
    
    // Check for Python packages
    try {
      const requirementsPath = path.join(projectDir, 'requirements.txt');
      const requirements = await fs.readFile(requirementsPath, 'utf-8');
      const lines = requirements.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const match = line.match(/^([^=<>!]+)(?:[=<>!]+(.+))?$/);
        if (match) {
          packages.push({
            name: match[1].trim(),
            version: match[2]?.trim() || 'latest'
          });
        }
      }
    } catch (error) {
      // No requirements.txt
    }
    
    return packages;
  }
  
  async searchPackages(query: string, language?: string): Promise<any[]> {
    // Simple search implementation
    try {
      if (language === 'python' || language === 'python3') {
        const { stdout } = await execAsync(`pip search ${query} 2>/dev/null || echo "[]"`);
        // Parse pip search output
        return this.parsePipSearch(stdout).slice(0, 10);
      } else {
        // Default to npm search
        const { stdout } = await execAsync(`npm search ${query} --json 2>/dev/null || echo "[]"`);
        const results = JSON.parse(stdout);
        return results.slice(0, 10).map((pkg: any) => ({
          name: pkg.name,
          version: pkg.version,
          description: pkg.description
        }));
      }
    } catch (error) {
      return [];
    }
  }
  
  private async detectLanguage(projectDir: string): Promise<string> {
    // Check for package.json
    try {
      await fs.access(path.join(projectDir, 'package.json'));
      return 'nodejs';
    } catch {}
    
    // Check for requirements.txt
    try {
      await fs.access(path.join(projectDir, 'requirements.txt'));
      return 'python';
    } catch {}
    
    // Check for Gemfile
    try {
      await fs.access(path.join(projectDir, 'Gemfile'));
      return 'ruby';
    } catch {}
    
    return 'nodejs'; // Default
  }
  
  private async installNpmPackage(projectDir: string, packageName: string): Promise<void> {
    // Ensure package.json exists
    try {
      await fs.access(path.join(projectDir, 'package.json'));
    } catch {
      // Create a basic package.json
      const packageJson = {
        name: 'project',
        version: '1.0.0',
        dependencies: {}
      };
      await fs.writeFile(
        path.join(projectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
    }
    
    // Install the package
    await execAsync(`cd ${projectDir} && npm install ${packageName}`);
  }
  
  private async installPipPackage(projectDir: string, packageName: string): Promise<void> {
    // Install the package
    await execAsync(`cd ${projectDir} && pip install ${packageName}`);
    
    // Update requirements.txt
    try {
      const requirementsPath = path.join(projectDir, 'requirements.txt');
      let requirements = '';
      
      try {
        requirements = await fs.readFile(requirementsPath, 'utf-8');
      } catch {
        // File doesn't exist yet
      }
      
      if (!requirements.includes(packageName)) {
        requirements += `\n${packageName}`;
        await fs.writeFile(requirementsPath, requirements.trim());
      }
    } catch (error) {
      console.error('Failed to update requirements.txt:', error);
    }
  }
  
  private async installGemPackage(projectDir: string, packageName: string): Promise<void> {
    await execAsync(`cd ${projectDir} && gem install ${packageName}`);
  }
  
  private parsePipSearch(output: string): any[] {
    const results: any[] = [];
    const lines = output.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(\S+)\s+\(([^)]+)\)\s+-\s+(.+)$/);
      if (match) {
        results.push({
          name: match[1],
          version: match[2],
          description: match[3]
        });
      }
    }
    
    return results;
  }
}

export const simplePackageInstaller = new SimplePackageInstaller();