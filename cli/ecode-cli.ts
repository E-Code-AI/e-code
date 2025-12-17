#!/usr/bin/env node

/**
 * E-Code CLI - Command Line Interface for E-Code Platform
 * Provides remote development capabilities and project management
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import WebSocket from 'ws';

const CONFIG_FILE = path.join(os.homedir(), '.ecode', 'config.json');
const API_BASE = process.env.ECODE_API_URL || 'https://e-code.ai/api';

interface Config {
  token?: string;
  refreshToken?: string;
  tokenExpiry?: number;
  apiUrl?: string;
  currentProject?: string;
}

class ECodeCLI {
  private config: Config = {};
  
  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        this.config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      }
    } catch (error) {
      console.error(chalk.red('Error loading config'));
    }
  }

  private saveConfig() {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
  }

  private async validateToken(): Promise<boolean> {
    if (!this.config.token) {
      return false;
    }

    try {
      // Decode JWT payload to check expiration
      const parts = this.config.token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      // Base64 decode the payload (handle URL-safe base64)
      const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8'));

      // Check if token is expired (with 30 second buffer)
      const expirationBuffer = 30 * 1000; // 30 seconds
      if (payload.exp && (payload.exp * 1000) < (Date.now() + expirationBuffer)) {
        // Token is expired or about to expire, try to refresh
        console.log(chalk.yellow('Token expired, attempting refresh...'));
        return await this.refreshToken();
      }

      return true;
    } catch (error) {
      // Invalid token format
      console.error(chalk.red('Invalid token format'));
      return false;
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.config.refreshToken) {
      console.log(chalk.yellow('No refresh token available. Please login again.'));
      return false;
    }

    try {
      const response = await fetch(`${this.config.apiUrl || API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: this.config.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();

      if (data.token) {
        this.config.token = data.token;
        if (data.refreshToken) {
          this.config.refreshToken = data.refreshToken;
        }
        if (data.expiresAt) {
          this.config.tokenExpiry = data.expiresAt;
        }
        this.saveConfig();
        console.log(chalk.green('Token refreshed successfully'));
        return true;
      }

      return false;
    } catch (error) {
      console.log(chalk.red('Session expired. Please login again with: ecode login'));
      // Clear expired tokens
      this.config.token = undefined;
      this.config.refreshToken = undefined;
      this.config.tokenExpiry = undefined;
      this.saveConfig();
      return false;
    }
  }

  private async ensureAuthenticated(): Promise<boolean> {
    if (!this.config.token) {
      console.error(chalk.red('Not logged in. Please run: ecode login'));
      return false;
    }

    const isValid = await this.validateToken();
    if (!isValid) {
      console.error(chalk.red('Authentication failed. Please run: ecode login'));
      return false;
    }

    return true;
  }

  private async apiRequest(endpoint: string, options: any = {}) {
    // Validate token before making request (skip for auth endpoints)
    if (!endpoint.includes('/auth/') && !endpoint.includes('/cli/login')) {
      const isAuthenticated = await this.ensureAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }
    }

    const url = `${this.config.apiUrl || API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle 401 specifically - try token refresh
    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry the request with new token
        const retryResponse = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
        
        if (!retryResponse.ok) {
          throw new Error(`API Error: ${retryResponse.statusText}`);
        }
        return retryResponse.json();
      }
      throw new Error('Authentication failed');
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async login() {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: 'Username:',
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
      },
    ]);

    const spinner = ora('Logging in...').start();

    try {
      const response = await fetch(`${API_BASE}/cli/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      });

      const data = await response.json();

      if (data.token) {
        this.config.token = data.token;
        // Store refresh token if provided
        if (data.refreshToken) {
          this.config.refreshToken = data.refreshToken;
        }
        // Store token expiry if provided
        if (data.expiresAt) {
          this.config.tokenExpiry = data.expiresAt;
        }
        this.saveConfig();
        spinner.succeed(chalk.green('Login successful!'));
      } else {
        spinner.fail(chalk.red('Login failed'));
      }
    } catch (error) {
      spinner.fail(chalk.red('Login error'));
    }
  }

  async logout() {
    this.config.token = undefined;
    this.config.refreshToken = undefined;
    this.config.tokenExpiry = undefined;
    this.saveConfig();
    console.log(chalk.green('Logged out successfully'));
  }

  async createProject(name: string, template?: string) {
    const spinner = ora('Creating project...').start();

    try {
      const data = await this.apiRequest('/cli/projects', {
        method: 'POST',
        body: JSON.stringify({ name, template }),
      });

      spinner.succeed(chalk.green(`Project "${data.name}" created!`));
      console.log(chalk.blue(`URL: https://e-code.ai/${data.slug}`));
      
      this.config.currentProject = data.id;
      this.saveConfig();
    } catch (error) {
      spinner.fail(chalk.red('Failed to create project'));
    }
  }

  async listProjects() {
    const spinner = ora('Loading projects...').start();

    try {
      const projects = await this.apiRequest('/cli/projects');
      spinner.stop();

      if (projects.length === 0) {
        console.log(chalk.yellow('No projects found'));
        return;
      }

      console.log(chalk.bold('\nYour Projects:'));
      projects.forEach((project: any) => {
        const current = project.id === this.config.currentProject ? chalk.green('*') : ' ';
        console.log(`${current} ${chalk.blue(project.name)} - ${project.slug}`);
      });
    } catch (error) {
      spinner.fail(chalk.red('Failed to load projects'));
    }
  }

  async deployProject(projectId?: string) {
    const id = projectId || this.config.currentProject;
    if (!id) {
      console.error(chalk.red('No project selected. Use "ecode use <project>" first'));
      return;
    }

    const spinner = ora('Deploying project...').start();

    try {
      const deployment = await this.apiRequest(`/cli/projects/${id}/deploy`, {
        method: 'POST',
      });

      spinner.succeed(chalk.green('Deployment started!'));
      console.log(chalk.blue(`URL: ${deployment.url}`));
      
      // Watch deployment status
      this.watchDeployment(deployment.id);
    } catch (error) {
      spinner.fail(chalk.red('Deployment failed'));
    }
  }

  private async watchDeployment(deploymentId: string) {
    const spinner = ora('Watching deployment...').start();
    
    const checkStatus = async () => {
      try {
        const status = await this.apiRequest(`/cli/deployments/${deploymentId}`);
        
        if (status.status === 'completed') {
          spinner.succeed(chalk.green('Deployment completed!'));
          console.log(chalk.blue(`Live at: ${status.url}`));
          return;
        } else if (status.status === 'failed') {
          spinner.fail(chalk.red('Deployment failed'));
          return;
        }
        
        setTimeout(checkStatus, 2000);
      } catch (error) {
        spinner.fail(chalk.red('Error checking deployment status'));
      }
    };
    
    checkStatus();
  }

  async runCommand(command: string[]) {
    const projectId = this.config.currentProject;
    if (!projectId) {
      console.error(chalk.red('No project selected. Use "ecode use <project>" first'));
      return;
    }

    console.log(chalk.blue(`Running: ${command.join(' ')}`));

    // Connect to WebSocket for real-time command execution
    // Security: Send token via message, not URL (tokens in URLs can leak via logs/referrer)
    const ws = new WebSocket(`wss://e-code.ai/cli/exec?project=${projectId}`);

    ws.on('open', () => {
      // Authenticate first, then send command
      ws.send(JSON.stringify({ 
        type: 'auth', 
        token: this.config.token 
      }));
      ws.send(JSON.stringify({ 
        type: 'command',
        command: command.join(' ') 
      }));
    });

    ws.on('message', (data: string) => {
      const msg = JSON.parse(data);
      if (msg.type === 'stdout') {
        process.stdout.write(msg.data);
      } else if (msg.type === 'stderr') {
        process.stderr.write(msg.data);
      } else if (msg.type === 'exit') {
        ws.close();
        process.exit(msg.code);
      }
    });

    ws.on('error', (error) => {
      console.error(chalk.red('Connection error'));
      process.exit(1);
    });
  }

  async logs(follow: boolean = false) {
    const projectId = this.config.currentProject;
    if (!projectId) {
      console.error(chalk.red('No project selected. Use "ecode use <project>" first'));
      return;
    }

    if (follow) {
      // Stream logs via WebSocket
      // Security: Send token via message, not URL (tokens in URLs can leak via logs/referrer)
      const ws = new WebSocket(`wss://e-code.ai/cli/logs?project=${projectId}`);
      
      ws.on('open', () => {
        // Authenticate before receiving logs
        ws.send(JSON.stringify({ 
          type: 'auth', 
          token: this.config.token 
        }));
      });

      ws.on('message', (data: string) => {
        console.log(data);
      });

      ws.on('error', () => {
        console.error(chalk.red('Failed to connect to log stream'));
      });
    } else {
      // Fetch recent logs
      try {
        const logs = await this.apiRequest(`/cli/projects/${projectId}/logs`);
        logs.forEach((log: any) => {
          console.log(`[${log.timestamp}] ${log.message}`);
        });
      } catch (error) {
        console.error(chalk.red('Failed to fetch logs'));
      }
    }
  }

  async useProject(nameOrSlug: string) {
    try {
      const projects = await this.apiRequest('/cli/projects');
      const project = projects.find((p: any) => 
        p.name === nameOrSlug || p.slug === nameOrSlug
      );

      if (project) {
        this.config.currentProject = project.id;
        this.saveConfig();
        console.log(chalk.green(`Now using project: ${project.name}`));
      } else {
        console.error(chalk.red('Project not found'));
      }
    } catch (error) {
      console.error(chalk.red('Failed to switch project'));
    }
  }

  async syncFiles(direction: 'push' | 'pull') {
    const projectId = this.config.currentProject;
    if (!projectId) {
      console.error(chalk.red('No project selected. Use "ecode use <project>" first'));
      return;
    }

    const spinner = ora(`${direction === 'push' ? 'Uploading' : 'Downloading'} files...`).start();

    try {
      if (direction === 'push') {
        // Upload local files
        const files = this.getLocalFiles('.');
        await this.apiRequest(`/cli/projects/${projectId}/files`, {
          method: 'POST',
          body: JSON.stringify({ files }),
        });
        spinner.succeed(chalk.green('Files uploaded successfully'));
      } else {
        // Download project files
        const files = await this.apiRequest(`/cli/projects/${projectId}/files`);
        this.saveFilesLocally(files);
        spinner.succeed(chalk.green('Files downloaded successfully'));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed to ${direction} files`));
    }
  }

  private getLocalFiles(dir: string, baseDir: string = dir): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];
    
    // Files/directories to ignore
    const ignorePatterns = [
      '.git', 'node_modules', '.ecode', '.ecode-ignore',
      '.DS_Store', 'Thumbs.db', '.env', '.env.local',
      'dist', 'build', 'coverage', '.cache'
    ];
    
    // Load custom ignore patterns if .ecode-ignore exists
    const ignoreFile = path.join(baseDir, '.ecode-ignore');
    if (fs.existsSync(ignoreFile)) {
      const customIgnores = fs.readFileSync(ignoreFile, 'utf-8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      ignorePatterns.push(...customIgnores);
    }
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        // Skip ignored files/directories
        if (ignorePatterns.some(pattern => {
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(entry.name);
          }
          return entry.name === pattern;
        })) {
          continue;
        }
        
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (entry.isDirectory()) {
          // Recursively get files from subdirectories
          files.push(...this.getLocalFiles(fullPath, baseDir));
        } else if (entry.isFile()) {
          try {
            // Skip binary files by checking if content is valid UTF-8
            const content = fs.readFileSync(fullPath, 'utf-8');
            files.push({
              path: relativePath.replace(/\\/g, '/'), // Normalize path separators
              content,
            });
          } catch (readError) {
            // Skip files that can't be read as UTF-8 (binary files)
            console.log(chalk.gray(`Skipping binary file: ${relativePath}`));
          }
        }
      }
    } catch (error) {
      console.error(chalk.yellow(`Warning: Could not read directory ${dir}`));
    }
    
    return files;
  }

  private saveFilesLocally(files: Array<{ path: string; content: string }>) {
    for (const file of files) {
      try {
        const filePath = path.join(process.cwd(), file.path);
        const fileDir = path.dirname(filePath);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        // Write file content
        fs.writeFileSync(filePath, file.content, 'utf-8');
        console.log(chalk.gray(`  ${file.path}`));
      } catch (error) {
        console.error(chalk.red(`Failed to save: ${file.path}`));
      }
    }
  }
}

// Initialize CLI
const cli = new ECodeCLI();
const program = new Command();

program
  .name('ecode')
  .description('E-Code CLI - Build and deploy from anywhere')
  .version('1.0.0');

program
  .command('login')
  .description('Login to E-Code')
  .action(() => cli.login());

program
  .command('logout')
  .description('Logout from E-Code')
  .action(() => cli.logout());

program
  .command('create <name>')
  .description('Create a new project')
  .option('-t, --template <template>', 'Use a template')
  .action((name, options) => cli.createProject(name, options.template));

program
  .command('list')
  .alias('ls')
  .description('List your projects')
  .action(() => cli.listProjects());

program
  .command('use <project>')
  .description('Switch to a project')
  .action((project) => cli.useProject(project));

program
  .command('deploy')
  .description('Deploy current project')
  .option('-p, --project <id>', 'Deploy specific project')
  .action((options) => cli.deployProject(options.project));

program
  .command('run [command...]')
  .description('Run command in project container')
  .action((command) => cli.runCommand(command));

program
  .command('logs')
  .description('View project logs')
  .option('-f, --follow', 'Follow log output')
  .action((options) => cli.logs(options.follow));

program
  .command('push')
  .description('Push local files to project')
  .action(() => cli.syncFiles('push'));

program
  .command('pull')
  .description('Pull project files to local')
  .action(() => cli.syncFiles('pull'));

program.parse();