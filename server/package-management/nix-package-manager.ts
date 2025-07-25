import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import { createLogger } from '../utils/logger';
import { EventEmitter } from 'events';

const logger = createLogger('nix-package-manager');

export interface NixPackage {
  name: string;
  version: string;
  attribute: string; // Nix attribute path
  description?: string;
  homepage?: string;
  license?: string;
  platforms?: string[];
}

export interface NixEnvironment {
  packages: NixPackage[];
  shellHook?: string;
  buildInputs: string[];
  propagatedBuildInputs: string[];
  env: Record<string, string>;
}

export interface PackageSearchResult {
  attribute: string;
  name: string;
  version: string;
  description: string;
  homepage?: string;
  license?: string;
  platforms?: string[];
  installed?: boolean;
}

export class NixPackageManager extends EventEmitter {
  private nixStore: string;
  private nixProfiles: Map<string, string> = new Map();
  private packageCache: Map<string, NixPackage> = new Map();
  
  constructor() {
    super();
    this.nixStore = process.env.NIX_STORE || '/nix/store';
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Nix package manager');
    
    // Check if Nix is installed
    try {
      await this.execNix(['--version']);
    } catch (error) {
      logger.error('Nix is not installed. Installing Nix...');
      await this.installNix();
    }
    
    // Initialize default channel
    await this.addChannel('nixpkgs', 'https://nixos.org/channels/nixpkgs-unstable');
    await this.updateChannels();
    
    logger.info('Nix package manager initialized');
  }

  async createEnvironment(projectId: string, packages: string[]): Promise<NixEnvironment> {
    logger.info(`Creating Nix environment for project ${projectId} with packages:`, packages);
    
    const profilePath = await this.getOrCreateProfile(projectId);
    
    // Generate shell.nix file
    const shellNix = this.generateShellNix(packages);
    const shellNixPath = path.join('/tmp', `shell-${projectId}.nix`);
    await fs.writeFile(shellNixPath, shellNix);
    
    // Build the environment
    await this.execNix([
      'develop',
      shellNixPath,
      '--profile',
      profilePath,
      '--command',
      'true'
    ]);
    
    // Get environment info
    const env = await this.getEnvironmentVariables(shellNixPath);
    const installedPackages = await this.getInstalledPackages(profilePath);
    
    return {
      packages: installedPackages,
      buildInputs: packages,
      propagatedBuildInputs: [],
      env
    };
  }

  async searchPackages(query: string, language?: string): Promise<PackageSearchResult[]> {
    logger.info(`Searching packages for query: ${query}, language: ${language}`);
    
    // Language-specific package sets
    const languagePackageSets: Record<string, string> = {
      python: 'python3Packages',
      nodejs: 'nodePackages',
      ruby: 'rubyPackages',
      rust: 'rustPackages',
      go: 'goPackages',
      haskell: 'haskellPackages',
      perl: 'perlPackages',
      php: 'phpPackages',
      ocaml: 'ocamlPackages',
      elixir: 'elixirPackages',
      r: 'rPackages',
      java: 'javaPackages',
      dotnet: 'dotnetPackages'
    };
    
    const packageSet = language && languagePackageSets[language] 
      ? `nixpkgs.${languagePackageSets[language]}` 
      : 'nixpkgs';
    
    try {
      const output = await this.execNix([
        'search',
        packageSet,
        query,
        '--json'
      ]);
      
      const results = JSON.parse(output);
      const packages: PackageSearchResult[] = [];
      
      for (const [attribute, info] of Object.entries(results)) {
        const pkg = info as any;
        packages.push({
          attribute: attribute.replace('legacyPackages.x86_64-linux.', ''),
          name: pkg.pname || pkg.name,
          version: pkg.version,
          description: pkg.description || '',
          homepage: pkg.meta?.homepage,
          license: pkg.meta?.license?.fullName,
          platforms: pkg.meta?.platforms
        });
      }
      
      return packages.slice(0, 50); // Limit results
    } catch (error) {
      logger.error('Failed to search packages:', error);
      return [];
    }
  }

  async installPackage(projectId: string, packageAttribute: string): Promise<void> {
    logger.info(`Installing package ${packageAttribute} for project ${projectId}`);
    
    const profilePath = await this.getOrCreateProfile(projectId);
    
    // Install package to profile
    await this.execNix([
      'profile',
      'install',
      '--profile',
      profilePath,
      `nixpkgs#${packageAttribute}`
    ]);
    
    this.emit('package-installed', { projectId, package: packageAttribute });
  }

  async removePackage(projectId: string, packageAttribute: string): Promise<void> {
    logger.info(`Removing package ${packageAttribute} from project ${projectId}`);
    
    const profilePath = await this.getOrCreateProfile(projectId);
    
    // Remove package from profile
    await this.execNix([
      'profile',
      'remove',
      '--profile',
      profilePath,
      `nixpkgs#${packageAttribute}`
    ]);
    
    this.emit('package-removed', { projectId, package: packageAttribute });
  }

  async getInstalledPackages(profileOrProjectId: string): Promise<NixPackage[]> {
    const profilePath = profileOrProjectId.includes('/')
      ? profileOrProjectId
      : await this.getOrCreateProfile(profileOrProjectId);
    
    try {
      const output = await this.execNix([
        'profile',
        'list',
        '--profile',
        profilePath,
        '--json'
      ]);
      
      const elements = JSON.parse(output).elements || [];
      const packages: NixPackage[] = [];
      
      for (const element of Object.values(elements) as any[]) {
        if (element.attrPath) {
          packages.push({
            name: element.attrPath.split('.').pop(),
            version: element.version || 'unknown',
            attribute: element.attrPath
          });
        }
      }
      
      return packages;
    } catch (error) {
      logger.error('Failed to get installed packages:', error);
      return [];
    }
  }

  async updatePackages(projectId: string): Promise<void> {
    logger.info(`Updating packages for project ${projectId}`);
    
    const profilePath = await this.getOrCreateProfile(projectId);
    
    await this.execNix([
      'profile',
      'upgrade',
      '--profile',
      profilePath
    ]);
    
    this.emit('packages-updated', { projectId });
  }

  async rollback(projectId: string): Promise<void> {
    logger.info(`Rolling back packages for project ${projectId}`);
    
    const profilePath = await this.getOrCreateProfile(projectId);
    
    await this.execNix([
      'profile',
      'rollback',
      '--profile',
      profilePath
    ]);
    
    this.emit('packages-rolled-back', { projectId });
  }

  async exportEnvironment(projectId: string): Promise<string> {
    const packages = await this.getInstalledPackages(projectId);
    const packageAttributes = packages.map(p => p.attribute);
    
    return this.generateShellNix(packageAttributes);
  }

  private generateShellNix(packages: string[]): string {
    return `
{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    ${packages.map(p => {
      // Handle language-specific packages
      if (p.includes('.')) {
        return p;
      }
      return p;
    }).join('\n    ')}
  ];

  shellHook = ''
    echo "E-Code Nix environment loaded"
    echo "Packages: ${packages.join(', ')}"
  '';

  # E-Code specific environment variables
  ECODE_NIX_ENV = "1";
  ECODE_PROJECT_ID = "\${ECODE_PROJECT_ID:-}";
}
`;
  }

  private async getEnvironmentVariables(shellNixPath: string): Promise<Record<string, string>> {
    try {
      const output = await this.execNix([
        'develop',
        shellNixPath,
        '--command',
        'env'
      ]);
      
      const env: Record<string, string> = {};
      const lines = output.split('\n');
      
      for (const line of lines) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=');
        }
      }
      
      return env;
    } catch (error) {
      logger.error('Failed to get environment variables:', error);
      return {};
    }
  }

  private async getOrCreateProfile(projectId: string): Promise<string> {
    const cached = this.nixProfiles.get(projectId);
    if (cached) return cached;
    
    const profilePath = path.join('/var/lib/ecode/nix-profiles', projectId);
    await fs.mkdir(path.dirname(profilePath), { recursive: true });
    
    this.nixProfiles.set(projectId, profilePath);
    return profilePath;
  }

  private async execNix(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('nix', args, {
        env: {
          ...process.env,
          NIX_CONFIG: 'experimental-features = nix-command flakes'
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Nix command failed: ${stderr}`));
        }
      });
    });
  }

  private async installNix(): Promise<void> {
    // Install Nix if not present (requires root)
    const installScript = `
      curl -L https://nixos.org/nix/install | sh -s -- --daemon
    `;
    
    return new Promise((resolve, reject) => {
      const proc = spawn('sh', ['-c', installScript], {
        stdio: 'inherit'
      });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Failed to install Nix'));
        }
      });
    });
  }

  private async addChannel(name: string, url: string): Promise<void> {
    await this.execNix(['channel', '--add', url, name]);
  }

  private async updateChannels(): Promise<void> {
    await this.execNix(['channel', '--update']);
  }

  // Language-specific helpers
  async setupPythonEnvironment(projectId: string, pythonVersion: string = '3.11'): Promise<void> {
    const packages = [
      `python${pythonVersion.replace('.', '')}`,
      `python${pythonVersion.replace('.', '')}Packages.pip`,
      `python${pythonVersion.replace('.', '')}Packages.setuptools`,
      `python${pythonVersion.replace('.', '')}Packages.wheel`
    ];
    
    await this.createEnvironment(projectId, packages);
  }

  async setupNodeEnvironment(projectId: string, nodeVersion: string = '20'): Promise<void> {
    const packages = [
      `nodejs_${nodeVersion}`,
      'nodePackages.npm',
      'nodePackages.yarn',
      'nodePackages.pnpm'
    ];
    
    await this.createEnvironment(projectId, packages);
  }

  async setupRustEnvironment(projectId: string): Promise<void> {
    const packages = [
      'rustc',
      'cargo',
      'rustfmt',
      'clippy',
      'rust-analyzer'
    ];
    
    await this.createEnvironment(projectId, packages);
  }

  async setupGoEnvironment(projectId: string): Promise<void> {
    const packages = [
      'go',
      'gopls',
      'go-tools'
    ];
    
    await this.createEnvironment(projectId, packages);
  }
}

// Singleton instance
export const nixPackageManager = new NixPackageManager();