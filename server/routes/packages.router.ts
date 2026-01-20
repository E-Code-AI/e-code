/**
 * Packages Router - Handles package installation and management
 * Provides endpoints for AI-driven package automation
 * 
 * SECURITY:
 * - Package names validated with strict allowlist pattern
 * - Uses spawn instead of exec to prevent command injection
 * - Proper working directory resolution with fallback
 * - Uses safePath utility to prevent path traversal attacks
 */

import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { storage } from '../storage';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { safePath } from '../utils/safe-path';

const router = Router();

/**
 * Validates project ID to prevent path traversal
 * SECURITY: Only allows alphanumeric, hyphens, underscores (no slashes or dots)
 */
function isValidProjectId(projectId: string): boolean {
  // Strict validation: only alphanumeric, hyphens, underscores
  // NO slashes, NO dots (prevents ../ and ./)
  const projectIdPattern = /^[\w-]+$/;
  return projectIdPattern.test(projectId) 
    && projectId.length > 0 
    && projectId.length < 100
    && !projectId.includes('..') 
    && !projectId.includes('/') 
    && !projectId.includes('\\');
}

/**
 * Validates package name to prevent command injection
 * Allows: alphanumeric, hyphens, underscores, dots, @-scopes, slashes
 */
function isValidPackageName(name: string): boolean {
  // Allow scoped packages like @babel/core, normal packages like lodash, and URLs
  const packagePattern = /^(@[\w.-]+\/)?[\w.-]+$/;
  return packagePattern.test(name) && name.length < 214; // npm package name limit
}

/**
 * Validates version string to prevent command injection
 * SECURITY: Forbids whitespace and double-hyphens to prevent flag injection
 */
function isValidVersion(version: string): boolean {
  // Allow semantic versions, version ranges, tags (latest, next, etc)
  // NO whitespace, NO double-hyphens (prevents --flag injection)
  const versionPattern = /^[\w.*^~<>=-]+$/;
  const hasWhitespace = /\s/.test(version);
  const hasDoubleHyphen = /--/.test(version);
  
  return versionPattern.test(version) 
    && !hasWhitespace 
    && !hasDoubleHyphen 
    && version.length < 50 
    && version.length > 0;
}

/**
 * Resolves the working directory for a project
 * SECURITY: Returns null if project directory doesn't exist (no fallback to server root)
 * Uses safePath to prevent path traversal attacks
 */
async function resolveProjectDirectory(projectId: string): Promise<string | null> {
  // SECURITY: Validate projectId first to prevent path traversal
  if (!isValidProjectId(projectId)) {
    return null;
  }
  
  const projectsDir = path.join(process.cwd(), 'projects');
  
  // SECURITY: Use safePath to prevent path traversal
  const projectDir = safePath(projectsDir, projectId);
  if (!projectDir) {
    return null; // Path traversal attempt detected
  }
  
  try {
    await fs.access(projectDir);
    return projectDir;
  } catch {
    // SECURITY: Do NOT fallback to process.cwd() - that would allow installing in server root
    return null;
  }
}

/**
 * Spawns a package manager command safely
 */
function spawnPackageManager(
  command: string,
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      timeout: 180000, // 3 minutes - sufficient for most installs
      shell: false, // CRITICAL: Disable shell to prevent command injection
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error: any = new Error(`Package manager exited with code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });
}

/**
 * Middleware to validate project access
 * SECURITY: Enforces project ownership - only owner or collaborators can modify packages
 * Works with both req.params.projectId and req.query.projectId
 */
const ensureProjectAccess = async (req: any, res: any, next: any) => {
  try {
    // Support both params (POST/PATCH/DELETE) and query (GET) parameters
    const projectIdParam = req.params.projectId || req.query.projectId;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!projectIdParam) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    // Parse project ID as number (storage expects numbers)
    const projectId = parseInt(projectIdParam);
    if (isNaN(projectId)) {
      return res.status(400).json({ 
        error: 'Invalid project ID',
        details: 'Project ID must be a number'
      });
    }
    
    // Get project from storage
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Check if user is the owner
    if (project.ownerId === userId) {
      // Store the validated numeric projectId for later use
      req.validatedProjectId = projectId;
      return next();
    }
    
    // Check if user is a collaborator
    const collaborators = await storage.getProjectCollaborators(projectId);
    const isCollaborator = collaborators.some((c: any) => c.userId === userId);
    
    if (!isCollaborator) {
      return res.status(403).json({ 
        error: 'Forbidden',
        details: "You don't have access to this project"
      });
    }
    
    // Store the validated numeric projectId for later use
    req.validatedProjectId = projectId;
    next();
  } catch (error) {
    console.error('[Packages] Error checking project access:', error);
    res.status(500).json({ error: 'Failed to verify project access' });
  }
};

/**
 * Install package for a project
 * POST /api/packages/:projectId/install
 */
router.post('/:projectId/install', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { package: packageName, name, version } = req.body;
    
    // SECURITY: Validate project ID first
    if (!isValidProjectId(projectId)) {
      return res.status(400).json({ 
        error: 'Invalid project ID',
        details: 'Project ID contains invalid characters or path traversal attempts'
      });
    }
    
    const pkgToInstall = packageName || name || '';
    
    if (!pkgToInstall) {
      return res.status(400).json({ error: 'Package name is required' });
    }
    
    // SECURITY: Validate package name
    if (!isValidPackageName(pkgToInstall)) {
      return res.status(400).json({ 
        error: 'Invalid package name', 
        details: 'Package name contains invalid characters' 
      });
    }
    
    // SECURITY: Validate version if provided
    if (version && !isValidVersion(version)) {
      return res.status(400).json({ 
        error: 'Invalid version string',
        details: 'Version contains invalid characters'
      });
    }
    
    // Resolve working directory
    const workingDir = await resolveProjectDirectory(projectId);
    
    if (!workingDir) {
      return res.status(404).json({ 
        error: 'Project not found',
        details: `Project directory does not exist for project ${projectId}`
      });
    }
    
    // Determine package manager
    let packageManager: string;
    let installArgs: string[];
    
    try {
      await fs.access(path.join(workingDir, 'package.json'));
      // Node.js project
      packageManager = 'npm';
      installArgs = ['install', version ? `${pkgToInstall}@${version}` : pkgToInstall];
    } catch {
      try {
        await fs.access(path.join(workingDir, 'requirements.txt'));
        // Python project
        packageManager = 'pip';
        installArgs = ['install', version ? `${pkgToInstall}==${version}` : pkgToInstall];
      } catch {
        // Default to npm
        packageManager = 'npm';
        installArgs = ['install', version ? `${pkgToInstall}@${version}` : pkgToInstall];
      }
    }
    
    // Execute installation using spawn (secure)
    const { stdout, stderr } = await spawnPackageManager(packageManager, installArgs, workingDir);
    
    if (stderr && !stderr.includes('npm WARN')) {
      console.error(`[Packages] Installation warnings:`, stderr);
    }
    
    res.json({
      success: true,
      message: `Successfully installed ${pkgToInstall}`,
      package: pkgToInstall,
      version: version || 'latest',
      output: stdout,
    });
  } catch (error: any) {
    console.error('[Packages] Installation failed:', error);
    res.status(500).json({
      error: 'Package installation failed',
      message: error.message,
      details: error.stderr || error.stdout,
    });
  }
});

/**
 * Uninstall package from a project
 * POST /api/packages/:projectId/uninstall
 */
router.post('/:projectId/uninstall', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { package: packageName } = req.body;
    
    // SECURITY: Validate project ID first
    if (!isValidProjectId(projectId)) {
      return res.status(400).json({ 
        error: 'Invalid project ID',
        details: 'Project ID contains invalid characters or path traversal attempts'
      });
    }
    
    if (!packageName) {
      return res.status(400).json({ error: 'Package name is required' });
    }
    
    // SECURITY: Validate package name
    if (!isValidPackageName(packageName)) {
      return res.status(400).json({ 
        error: 'Invalid package name',
        details: 'Package name contains invalid characters'
      });
    }
    
    // Resolve working directory
    const workingDir = await resolveProjectDirectory(projectId);
    
    if (!workingDir) {
      return res.status(404).json({ 
        error: 'Project not found',
        details: `Project directory does not exist for project ${projectId}`
      });
    }
    
    // Determine package manager
    let packageManager: string;
    let uninstallArgs: string[];
    
    try {
      await fs.access(path.join(workingDir, 'package.json'));
      packageManager = 'npm';
      uninstallArgs = ['uninstall', packageName];
    } catch {
      try {
        await fs.access(path.join(workingDir, 'requirements.txt'));
        packageManager = 'pip';
        uninstallArgs = ['uninstall', '-y', packageName];
      } catch {
        packageManager = 'npm';
        uninstallArgs = ['uninstall', packageName];
      }
    }
    
    const { stdout, stderr } = await spawnPackageManager(packageManager, uninstallArgs, workingDir);
    
    res.json({
      success: true,
      message: `Successfully uninstalled ${packageName}`,
      package: packageName,
      output: stdout,
    });
  } catch (error: any) {
    console.error('[Packages] Uninstallation failed:', error);
    res.status(500).json({
      error: 'Package uninstallation failed',
      message: error.message,
    });
  }
});

/**
 * Get installed packages for a project
 * GET /api/packages/installed?projectId=:id
 * SECURITY: Uses ensureProjectAccess middleware (now supports query parameters)
 */
router.get('/installed', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    // Use the validated numeric projectId from middleware
    const projectId = req.validatedProjectId || parseInt(req.query.projectId as string);
    
    // Validate project ID string format for filesystem access
    const projectIdStr = req.query.projectId as string;
    if (!isValidProjectId(projectIdStr)) {
      return res.status(400).json({ 
        error: 'Invalid project ID',
        details: 'Project ID contains invalid characters or path traversal attempts'
      });
    }
    
    // Resolve working directory using the validated string
    const workingDir = await resolveProjectDirectory(projectIdStr);
    
    if (!workingDir) {
      return res.json({
        success: true,
        packages: [],
        message: 'Project directory does not exist',
      });
    }
    
    // Try to read package.json
    try {
      const packageJsonPath = path.join(workingDir, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      
      const packages = Object.entries(dependencies).map(([name, version]) => ({
        name,
        version: version as string,
        type: packageJson.dependencies?.[name] ? 'production' : 'development',
      }));
      
      return res.json({
        success: true,
        packages,
        language: 'javascript',
      });
    } catch {
      // Try Python requirements.txt
      try {
        const requirementsPath = path.join(workingDir, 'requirements.txt');
        const requirements = await fs.readFile(requirementsPath, 'utf-8');
        
        const packages = requirements
          .split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(line => {
            const [name, version] = line.split('==');
            return {
              name: name.trim(),
              version: version?.trim() || 'latest',
              type: 'production',
            };
          });
        
        return res.json({
          success: true,
          packages,
          language: 'python',
        });
      } catch {
        // No package files found
        return res.json({
          success: true,
          packages: [],
          message: 'No package files found',
        });
      }
    }
  } catch (error: any) {
    console.error('[Packages] Failed to fetch installed packages:', error);
    res.status(500).json({
      error: 'Failed to fetch installed packages',
      message: error.message,
    });
  }
});

/**
 * Search packages from registry (npm/pip)
 * GET /api/packages/:projectId/search?q=query
 */
router.get('/:projectId/search', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    const query = req.query.q as string;
    const language = req.query.language as string || 'nodejs';
    
    if (!query || query.length < 2) {
      return res.status(400).json({ 
        error: 'Search query is required',
        details: 'Query must be at least 2 characters'
      });
    }
    
    let packages: any[] = [];
    
    if (language === 'python') {
      // Search PyPI
      try {
        const response = await fetch(`https://pypi.org/pypi/${encodeURIComponent(query)}/json`);
        if (response.ok) {
          const data = await response.json();
          packages = [{
            name: data.info.name,
            version: data.info.version,
            description: data.info.summary || '',
            homepage: data.info.home_page || data.info.project_url || '',
          }];
        }
      } catch {
        // PyPI API doesn't have a search endpoint, so we try exact match
        packages = [];
      }
    } else {
      // Search npm registry
      try {
        const response = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=20`);
        if (response.ok) {
          const data = await response.json();
          packages = data.objects?.map((obj: any) => ({
            name: obj.package.name,
            version: obj.package.version,
            description: obj.package.description || '',
            homepage: obj.package.links?.homepage || obj.package.links?.npm || '',
            score: obj.score?.final || 0,
          })) || [];
        }
      } catch (e) {
        console.error('[Packages] npm search failed:', e);
        packages = [];
      }
    }
    
    res.json({
      success: true,
      packages,
      query,
      language,
    });
  } catch (error: any) {
    console.error('[Packages] Search failed:', error);
    res.status(500).json({
      error: 'Package search failed',
      message: error.message,
    });
  }
});

/**
 * Update a package to a specific version
 * POST /api/packages/:projectId/update
 */
router.post('/:projectId/update', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { package: packageName, name, version } = req.body;
    
    if (!isValidProjectId(projectId)) {
      return res.status(400).json({ 
        error: 'Invalid project ID',
        details: 'Project ID contains invalid characters'
      });
    }
    
    const pkgToUpdate = packageName || name || '';
    
    if (!pkgToUpdate) {
      return res.status(400).json({ error: 'Package name is required' });
    }
    
    if (!isValidPackageName(pkgToUpdate)) {
      return res.status(400).json({ 
        error: 'Invalid package name',
        details: 'Package name contains invalid characters'
      });
    }
    
    if (version && !isValidVersion(version)) {
      return res.status(400).json({ 
        error: 'Invalid version string',
        details: 'Version contains invalid characters'
      });
    }
    
    const workingDir = await resolveProjectDirectory(projectId);
    
    if (!workingDir) {
      return res.status(404).json({ 
        error: 'Project not found',
        details: `Project directory does not exist for project ${projectId}`
      });
    }
    
    let packageManager: string;
    let updateArgs: string[];
    
    try {
      await fs.access(path.join(workingDir, 'package.json'));
      packageManager = 'npm';
      updateArgs = ['install', version ? `${pkgToUpdate}@${version}` : `${pkgToUpdate}@latest`];
    } catch {
      try {
        await fs.access(path.join(workingDir, 'requirements.txt'));
        packageManager = 'pip';
        updateArgs = ['install', '--upgrade', version ? `${pkgToUpdate}==${version}` : pkgToUpdate];
      } catch {
        packageManager = 'npm';
        updateArgs = ['install', version ? `${pkgToUpdate}@${version}` : `${pkgToUpdate}@latest`];
      }
    }
    
    const { stdout, stderr } = await spawnPackageManager(packageManager, updateArgs, workingDir);
    
    res.json({
      success: true,
      message: `Successfully updated ${pkgToUpdate}`,
      package: pkgToUpdate,
      version: version || 'latest',
      output: stdout,
    });
  } catch (error: any) {
    console.error('[Packages] Update failed:', error);
    res.status(500).json({
      error: 'Package update failed',
      message: error.message,
      details: error.stderr || error.stdout,
    });
  }
});

/**
 * Get installed packages (alternative route for per-project)
 * GET /api/packages/:projectId/list
 */
router.get('/:projectId/list', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!isValidProjectId(projectId)) {
      return res.status(400).json({ 
        error: 'Invalid project ID',
        details: 'Project ID contains invalid characters'
      });
    }
    
    const workingDir = await resolveProjectDirectory(projectId);
    
    if (!workingDir) {
      return res.json({
        success: true,
        packages: [],
        systemDependencies: [],
        message: 'Project directory does not exist',
      });
    }
    
    let packages: any[] = [];
    let language = 'nodejs';
    
    // Try to read package.json
    try {
      const packageJsonPath = path.join(workingDir, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};
      
      packages = [
        ...Object.entries(dependencies).map(([name, version]) => ({
          name,
          version: version as string,
          type: 'production',
          isDev: false,
        })),
        ...Object.entries(devDependencies).map(([name, version]) => ({
          name,
          version: version as string,
          type: 'development',
          isDev: true,
        })),
      ];
      language = 'nodejs';
    } catch {
      // Try Python requirements.txt
      try {
        const requirementsPath = path.join(workingDir, 'requirements.txt');
        const requirements = await fs.readFile(requirementsPath, 'utf-8');
        
        packages = requirements
          .split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(line => {
            const match = line.match(/^([a-zA-Z0-9_.-]+)(?:==|>=|<=|~=|!=)?(.*)$/);
            return {
              name: match ? match[1].trim() : line.trim(),
              version: match && match[2] ? match[2].trim() : 'latest',
              type: 'production',
              isDev: false,
            };
          });
        language = 'python';
      } catch {
        packages = [];
      }
    }
    
    // System dependencies (from .replit or nix config if available)
    let systemDependencies: any[] = [];
    try {
      const replitPath = path.join(workingDir, '.replit');
      const replitContent = await fs.readFile(replitPath, 'utf-8');
      // Parse basic nix packages from .replit file
      const nixMatch = replitContent.match(/nix\s*=\s*\[([^\]]*)\]/);
      if (nixMatch) {
        systemDependencies = nixMatch[1]
          .split(',')
          .map(pkg => pkg.trim().replace(/["']/g, ''))
          .filter(pkg => pkg)
          .map(pkg => ({ name: pkg, type: 'system' }));
      }
    } catch {
      systemDependencies = [];
    }
    
    return res.json({
      success: true,
      packages,
      systemDependencies,
      language,
    });
  } catch (error: any) {
    console.error('[Packages] Failed to fetch packages:', error);
    res.status(500).json({
      error: 'Failed to fetch packages',
      message: error.message,
    });
  }
});

/**
 * Remove a specific package (DELETE variant)
 * DELETE /api/packages/:projectId/:packageName
 */
router.delete('/:projectId/:packageName', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const { projectId, packageName } = req.params;
    
    if (!isValidProjectId(projectId)) {
      return res.status(400).json({ 
        error: 'Invalid project ID',
        details: 'Project ID contains invalid characters'
      });
    }
    
    if (!isValidPackageName(packageName)) {
      return res.status(400).json({ 
        error: 'Invalid package name',
        details: 'Package name contains invalid characters'
      });
    }
    
    const workingDir = await resolveProjectDirectory(projectId);
    
    if (!workingDir) {
      return res.status(404).json({ 
        error: 'Project not found',
        details: `Project directory does not exist for project ${projectId}`
      });
    }
    
    let packageManager: string;
    let uninstallArgs: string[];
    
    try {
      await fs.access(path.join(workingDir, 'package.json'));
      packageManager = 'npm';
      uninstallArgs = ['uninstall', packageName];
    } catch {
      try {
        await fs.access(path.join(workingDir, 'requirements.txt'));
        packageManager = 'pip';
        uninstallArgs = ['uninstall', '-y', packageName];
      } catch {
        packageManager = 'npm';
        uninstallArgs = ['uninstall', packageName];
      }
    }
    
    const { stdout, stderr } = await spawnPackageManager(packageManager, uninstallArgs, workingDir);
    
    res.json({
      success: true,
      message: `Successfully removed ${packageName}`,
      package: packageName,
      output: stdout,
    });
  } catch (error: any) {
    console.error('[Packages] Removal failed:', error);
    res.status(500).json({
      error: 'Package removal failed',
      message: error.message,
    });
  }
});

/**
 * Security audit for a project (npm audit)
 * GET /api/packages/:projectId/audit
 */
router.get('/:projectId/audit', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!isValidProjectId(projectId)) {
      return res.status(400).json({ 
        error: 'Invalid project ID',
        details: 'Project ID contains invalid characters'
      });
    }
    
    const workingDir = await resolveProjectDirectory(projectId);
    
    if (!workingDir) {
      return res.status(404).json({ 
        error: 'Project not found',
        details: `Project directory does not exist for project ${projectId}`
      });
    }
    
    let language = 'javascript';
    let vulnerabilities: any[] = [];
    let summary = { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 };
    
    try {
      await fs.access(path.join(workingDir, 'package.json'));
      language = 'javascript';
      
      try {
        const { stdout } = await spawnPackageManager('npm', ['audit', '--json'], workingDir);
        const auditData = JSON.parse(stdout);
        
        if (auditData.vulnerabilities) {
          vulnerabilities = Object.entries(auditData.vulnerabilities).map(([name, data]: [string, any]) => ({
            name,
            severity: data.severity,
            title: data.via?.[0]?.title || 'Vulnerability detected',
            url: data.via?.[0]?.url || '',
            fixAvailable: data.fixAvailable,
            range: data.range,
            nodes: data.nodes?.length || 0,
          }));
          
          summary = auditData.metadata?.vulnerabilities || summary;
        }
      } catch (auditError: any) {
        if (auditError.stdout) {
          try {
            const auditData = JSON.parse(auditError.stdout);
            if (auditData.vulnerabilities) {
              vulnerabilities = Object.entries(auditData.vulnerabilities).map(([name, data]: [string, any]) => ({
                name,
                severity: data.severity,
                title: data.via?.[0]?.title || 'Vulnerability detected',
                url: data.via?.[0]?.url || '',
                fixAvailable: data.fixAvailable,
                range: data.range,
                nodes: data.nodes?.length || 0,
              }));
              
              summary = auditData.metadata?.vulnerabilities || summary;
            }
          } catch {
            // Couldn't parse audit output
          }
        }
      }
    } catch {
      try {
        await fs.access(path.join(workingDir, 'requirements.txt'));
        language = 'python';
        
        try {
          const { stdout } = await spawnPackageManager('pip', ['check'], workingDir);
          if (stdout.includes('No broken requirements')) {
            vulnerabilities = [];
          } else {
            const lines = stdout.split('\n').filter(l => l.trim());
            vulnerabilities = lines.map(line => ({
              name: line.split(' ')[0],
              severity: 'moderate',
              title: line,
              fixAvailable: true,
            }));
          }
        } catch {
          vulnerabilities = [];
        }
      } catch {
        return res.json({
          success: true,
          vulnerabilities: [],
          summary,
          language: 'unknown',
          message: 'No package files found',
        });
      }
    }
    
    res.json({
      success: true,
      vulnerabilities,
      summary,
      language,
    });
  } catch (error: any) {
    console.error('[Packages] Audit failed:', error);
    res.status(500).json({
      error: 'Security audit failed',
      message: error.message,
    });
  }
});

/**
 * Check for outdated packages
 * GET /api/packages/:projectId/outdated
 */
router.get('/:projectId/outdated', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!isValidProjectId(projectId)) {
      return res.status(400).json({ 
        error: 'Invalid project ID',
        details: 'Project ID contains invalid characters'
      });
    }
    
    const workingDir = await resolveProjectDirectory(projectId);
    
    if (!workingDir) {
      return res.status(404).json({ 
        error: 'Project not found',
        details: `Project directory does not exist for project ${projectId}`
      });
    }
    
    let outdatedPackages: any[] = [];
    let language = 'javascript';
    
    try {
      await fs.access(path.join(workingDir, 'package.json'));
      language = 'javascript';
      
      try {
        const { stdout } = await spawnPackageManager('npm', ['outdated', '--json'], workingDir);
        const outdatedData = JSON.parse(stdout || '{}');
        
        outdatedPackages = Object.entries(outdatedData).map(([name, data]: [string, any]) => ({
          name,
          current: data.current,
          wanted: data.wanted,
          latest: data.latest,
          type: data.type || 'dependencies',
          homepage: data.homepage || `https://www.npmjs.com/package/${name}`,
        }));
      } catch (outdatedError: any) {
        if (outdatedError.stdout) {
          try {
            const outdatedData = JSON.parse(outdatedError.stdout || '{}');
            outdatedPackages = Object.entries(outdatedData).map(([name, data]: [string, any]) => ({
              name,
              current: data.current,
              wanted: data.wanted,
              latest: data.latest,
              type: data.type || 'dependencies',
              homepage: data.homepage || `https://www.npmjs.com/package/${name}`,
            }));
          } catch {
            outdatedPackages = [];
          }
        }
      }
    } catch {
      try {
        await fs.access(path.join(workingDir, 'requirements.txt'));
        language = 'python';
        
        try {
          const { stdout } = await spawnPackageManager('pip', ['list', '--outdated', '--format=json'], workingDir);
          const outdatedData = JSON.parse(stdout || '[]');
          
          outdatedPackages = outdatedData.map((pkg: any) => ({
            name: pkg.name,
            current: pkg.version,
            latest: pkg.latest_version,
            wanted: pkg.latest_version,
            type: 'dependencies',
            homepage: `https://pypi.org/project/${pkg.name}/`,
          }));
        } catch {
          outdatedPackages = [];
        }
      } catch {
        return res.json({
          success: true,
          outdated: [],
          language: 'unknown',
          message: 'No package files found',
        });
      }
    }
    
    res.json({
      success: true,
      outdated: outdatedPackages,
      language,
    });
  } catch (error: any) {
    console.error('[Packages] Outdated check failed:', error);
    res.status(500).json({
      error: 'Outdated check failed',
      message: error.message,
    });
  }
});

/**
 * Get dependency tree for a project
 * GET /api/packages/:projectId/dependencies
 */
router.get('/:projectId/dependencies', ensureAuthenticated, ensureProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    if (!isValidProjectId(projectId)) {
      return res.status(400).json({ 
        error: 'Invalid project ID',
        details: 'Project ID contains invalid characters'
      });
    }
    
    const workingDir = await resolveProjectDirectory(projectId);
    
    if (!workingDir) {
      return res.status(404).json({ 
        error: 'Project not found',
        details: `Project directory does not exist for project ${projectId}`
      });
    }
    
    let dependencies: any = {};
    let language = 'javascript';
    
    try {
      await fs.access(path.join(workingDir, 'package.json'));
      language = 'javascript';
      
      try {
        const { stdout } = await spawnPackageManager('npm', ['ls', '--json', '--depth=2'], workingDir);
        const depData = JSON.parse(stdout || '{}');
        dependencies = depData.dependencies || {};
      } catch (lsError: any) {
        if (lsError.stdout) {
          try {
            const depData = JSON.parse(lsError.stdout || '{}');
            dependencies = depData.dependencies || {};
          } catch {
            dependencies = {};
          }
        }
      }
    } catch {
      try {
        await fs.access(path.join(workingDir, 'requirements.txt'));
        language = 'python';
        
        const requirementsPath = path.join(workingDir, 'requirements.txt');
        const requirements = await fs.readFile(requirementsPath, 'utf-8');
        
        const pkgs = requirements
          .split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(line => {
            const match = line.match(/^([a-zA-Z0-9_.-]+)(?:==|>=|<=|~=|!=)?(.*)$/);
            return {
              name: match ? match[1].trim() : line.trim(),
              version: match && match[2] ? match[2].trim() : 'latest',
            };
          });
        
        pkgs.forEach(pkg => {
          dependencies[pkg.name] = { version: pkg.version, dependencies: {} };
        });
      } catch {
        return res.json({
          success: true,
          dependencies: [],
          language: 'unknown',
          message: 'No package files found',
        });
      }
    }
    
    const flattenDeps = (deps: any, depth = 0): any[] => {
      const result: any[] = [];
      for (const [name, data] of Object.entries(deps) as [string, any][]) {
        result.push({
          name,
          version: data.version,
          depth,
          dependencyCount: Object.keys(data.dependencies || {}).length,
          children: flattenDeps(data.dependencies || {}, depth + 1),
        });
      }
      return result;
    };
    
    res.json({
      success: true,
      dependencies: flattenDeps(dependencies),
      language,
    });
  } catch (error: any) {
    console.error('[Packages] Dependency tree failed:', error);
    res.status(500).json({
      error: 'Failed to get dependency tree',
      message: error.message,
    });
  }
});

export default router;
