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
const API_BASE = process.env.ECODE_API_URL || 'https://e-code.com/api';

interface Config {
  token?: string;
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

  private async apiRequest(endpoint: string, options: any = {}) {
    const url = `${this.config.apiUrl || API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

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
      console.log(chalk.blue(`URL: https://e-code.com/${data.slug}`));
      
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
    const ws = new WebSocket(`wss://e-code.com/cli/exec?token=${this.config.token}&project=${projectId}`);

    ws.on('open', () => {
      ws.send(JSON.stringify({ command: command.join(' ') }));
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
      const ws = new WebSocket(`wss://e-code.com/cli/logs?token=${this.config.token}&project=${projectId}`);
      
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

  private getLocalFiles(dir: string): any[] {
    // Implementation for reading local files
    return [];
  }

  private saveFilesLocally(files: any[]) {
    // Implementation for saving files locally
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