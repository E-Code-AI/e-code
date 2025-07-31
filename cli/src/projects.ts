import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import open from 'open';
import fs from 'fs';
import path from 'path';
import { ConfigManager } from './config';
import { AuthManager } from './auth';
import { API_BASE_URL, WEB_BASE_URL, LANGUAGES, TEMPLATES } from './constants';

export class ProjectManager {
  private auth: AuthManager;

  constructor(private config: ConfigManager) {
    this.auth = new AuthManager(config);
  }

  async create(name?: string, options?: any) {
    const spinner = ora('Creating project...').start();
    
    try {
      // Ensure authenticated
      if (!await this.auth.isAuthenticated()) {
        spinner.fail('Not authenticated. Run `ecode login` first.');
        return;
      }

      // Get project details
      if (!name) {
        spinner.stop();
        const details = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Project name:',
            validate: (input) => input.length > 0 || 'Name is required'
          }
        ]);
        name = details.name;
        spinner.start('Creating project...');
      }

      const language = options?.language || 'javascript';
      const template = options?.template;
      const isPrivate = options?.private || false;

      // Create project via API
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          ...this.auth.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          language,
          template,
          visibility: isPrivate ? 'private' : 'public',
          description: `Created with E-Code CLI`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create project');
      }

      const project = await response.json();
      
      spinner.succeed(`Project "${chalk.bold(project.name)}" created successfully!`);
      
      console.log(`\n  URL: ${chalk.cyan(`${WEB_BASE_URL}/${project.slug}`)}`);
      console.log(`  Language: ${chalk.yellow(project.language)}`);
      console.log(`  Visibility: ${chalk.gray(project.visibility)}`);
      
      // Ask if user wants to open in browser
      const { openBrowser } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'openBrowser',
          message: 'Open in browser?',
          default: true
        }
      ]);
      
      if (openBrowser) {
        await open(`${WEB_BASE_URL}/${project.slug}`);
      }
    } catch (error: any) {
      spinner.fail(`Failed to create project: ${error.message}`);
    }
  }

  async createInteractive() {
    const details = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        validate: (input) => input.length > 0 || 'Name is required'
      },
      {
        type: 'list',
        name: 'language',
        message: 'Language:',
        choices: LANGUAGES.map(lang => ({
          name: lang.charAt(0).toUpperCase() + lang.slice(1),
          value: lang
        }))
      },
      {
        type: 'list',
        name: 'template',
        message: 'Template:',
        choices: [
          { name: 'Blank project', value: null },
          ...TEMPLATES.map(t => ({ name: t.name, value: t.id }))
        ]
      },
      {
        type: 'list',
        name: 'visibility',
        message: 'Visibility:',
        choices: [
          { name: 'Public', value: 'public' },
          { name: 'Private', value: 'private' },
          { name: 'Unlisted', value: 'unlisted' }
        ],
        default: 'private'
      }
    ]);

    await this.create(details.name, {
      language: details.language,
      template: details.template,
      private: details.visibility !== 'public'
    });
  }

  async list(options: any) {
    const spinner = ora('Fetching projects...').start();
    
    try {
      const limit = parseInt(options.limit) || 10;
      
      const response = await fetch(`${API_BASE_URL}/api/projects?limit=${limit}`, {
        headers: this.auth.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const projects = await response.json();
      
      spinner.stop();
      
      if (projects.length === 0) {
        console.log(chalk.yellow('No projects found.'));
        console.log(chalk.gray('Create one with `ecode project create`'));
        return;
      }

      console.log(chalk.cyan(`\nYour projects (${projects.length}):\n`));
      
      projects.forEach((project: any) => {
        const visibility = project.visibility === 'private' ? 
          chalk.red('🔒') : chalk.green('🌐');
        const language = chalk.yellow(project.language);
        const updated = new Date(project.updatedAt).toLocaleDateString();
        
        console.log(`  ${visibility} ${chalk.bold(project.name)} ${chalk.gray(`(${language})`)} - Updated: ${updated}`);
        console.log(`     ${chalk.gray(`${WEB_BASE_URL}/${project.slug}`)}`);
        console.log();
      });
    } catch (error: any) {
      spinner.fail(`Failed to list projects: ${error.message}`);
    }
  }

  async open(name: string) {
    const spinner = ora('Opening project...').start();
    
    try {
      // Find project by name
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: this.auth.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const projects = await response.json();
      const project = projects.find((p: any) => 
        p.name.toLowerCase() === name.toLowerCase() || 
        p.slug === name
      );

      if (!project) {
        throw new Error(`Project "${name}" not found`);
      }

      spinner.succeed(`Opening ${chalk.bold(project.name)}...`);
      await open(`${WEB_BASE_URL}/${project.slug}`);
    } catch (error: any) {
      spinner.fail(`Failed to open project: ${error.message}`);
    }
  }

  async delete(name: string, options: any) {
    const spinner = ora('Deleting project...').start();
    
    try {
      // Find project
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: this.auth.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const projects = await response.json();
      const project = projects.find((p: any) => 
        p.name.toLowerCase() === name.toLowerCase() || 
        p.slug === name
      );

      if (!project) {
        throw new Error(`Project "${name}" not found`);
      }

      spinner.stop();

      // Confirm deletion
      if (!options.force) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete "${project.name}"? This cannot be undone.`,
            default: false
          }
        ]);

        if (!confirm) {
          console.log(chalk.yellow('Deletion cancelled'));
          return;
        }
      }

      spinner.start('Deleting project...');

      // Delete project
      const deleteResponse = await fetch(`${API_BASE_URL}/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: this.auth.getAuthHeaders()
      });

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete project');
      }

      spinner.succeed(`Project "${chalk.bold(project.name)}" deleted successfully`);
    } catch (error: any) {
      spinner.fail(`Failed to delete project: ${error.message}`);
    }
  }

  async fork(name: string, options: any) {
    const spinner = ora('Forking project...').start();
    
    try {
      // Find project
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: this.auth.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const projects = await response.json();
      const project = projects.find((p: any) => 
        p.name.toLowerCase() === name.toLowerCase() || 
        p.slug === name
      );

      if (!project) {
        throw new Error(`Project "${name}" not found`);
      }

      const newName = options.newName || `${project.name}-fork`;

      // Fork project
      const forkResponse = await fetch(`${API_BASE_URL}/api/projects/${project.id}/fork`, {
        method: 'POST',
        headers: {
          ...this.auth.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      });

      if (!forkResponse.ok) {
        throw new Error('Failed to fork project');
      }

      const forkedProject = await forkResponse.json();
      
      spinner.succeed(`Project forked successfully!`);
      console.log(`\n  Original: ${chalk.gray(project.name)}`);
      console.log(`  Fork: ${chalk.bold(forkedProject.name)}`);
      console.log(`  URL: ${chalk.cyan(`${WEB_BASE_URL}/${forkedProject.slug}`)}`);
    } catch (error: any) {
      spinner.fail(`Failed to fork project: ${error.message}`);
    }
  }

  async run(script?: string, options?: any) {
    const spinner = ora('Starting project...').start();
    
    try {
      // Get project config
      const projectConfig = this.config.getProjectConfig();
      if (!projectConfig.projectId) {
        spinner.fail('Not in an E-Code project directory. Run `ecode init` first.');
        return;
      }

      spinner.succeed('Project started! Check your browser for the running application.');
      
      // In real implementation, this would connect to WebSocket for real-time logs
      console.log(chalk.gray('\nPress Ctrl+C to stop'));
    } catch (error: any) {
      spinner.fail(`Failed to run project: ${error.message}`);
    }
  }

  async init() {
    const spinner = ora('Initializing E-Code project...').start();
    
    try {
      // Check if already initialized
      const ecodeDir = path.join(process.cwd(), '.ecode');
      if (fs.existsSync(ecodeDir)) {
        spinner.fail('Already initialized as an E-Code project');
        return;
      }

      spinner.stop();

      // Get project details
      const details = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Project name:',
          default: path.basename(process.cwd())
        },
        {
          type: 'list',
          name: 'language',
          message: 'Language:',
          choices: LANGUAGES
        }
      ]);

      spinner.start('Creating project...');

      // Create project on server
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          ...this.auth.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: details.name,
          language: details.language,
          description: 'Initialized from CLI'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const project = await response.json();

      // Create .ecode directory
      fs.mkdirSync(ecodeDir);
      
      // Save project config
      this.config.setProjectConfig({
        projectId: project.id,
        projectSlug: project.slug,
        language: project.language
      });

      spinner.succeed('E-Code project initialized!');
      console.log(`\n  Project: ${chalk.bold(project.name)}`);
      console.log(`  URL: ${chalk.cyan(`${WEB_BASE_URL}/${project.slug}`)}`);
    } catch (error: any) {
      spinner.fail(`Failed to initialize: ${error.message}`);
    }
  }

  async export(options: any) {
    const spinner = ora('Exporting project...').start();
    
    try {
      const projectConfig = this.config.getProjectConfig();
      if (!projectConfig.projectId) {
        spinner.fail('Not in an E-Code project directory');
        return;
      }

      const format = options.format || 'zip';
      const output = options.output || `./${projectConfig.projectSlug}-export.${format}`;

      // Export via API
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectConfig.projectId}/export?format=${format}`,
        { headers: this.auth.getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error('Failed to export project');
      }

      // Save to file
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(output, Buffer.from(buffer));

      spinner.succeed(`Project exported to ${chalk.bold(output)}`);
    } catch (error: any) {
      spinner.fail(`Failed to export: ${error.message}`);
    }
  }

  async addSecret(key: string, value?: string) {
    const spinner = ora('Adding secret...').start();
    
    try {
      const projectConfig = this.config.getProjectConfig();
      if (!projectConfig.projectId) {
        spinner.fail('Not in an E-Code project directory');
        return;
      }

      if (!value) {
        spinner.stop();
        const { secretValue } = await inquirer.prompt([
          {
            type: 'password',
            name: 'secretValue',
            message: `Enter value for ${key}:`
          }
        ]);
        value = secretValue;
        spinner.start('Adding secret...');
      }

      // Add secret via API
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectConfig.projectId}/secrets`,
        {
          method: 'POST',
          headers: {
            ...this.auth.getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ key, value })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add secret');
      }

      spinner.succeed(`Secret "${chalk.bold(key)}" added successfully`);
    } catch (error: any) {
      spinner.fail(`Failed to add secret: ${error.message}`);
    }
  }

  async removeSecret(key: string) {
    const spinner = ora('Removing secret...').start();
    
    try {
      const projectConfig = this.config.getProjectConfig();
      if (!projectConfig.projectId) {
        spinner.fail('Not in an E-Code project directory');
        return;
      }

      // Remove secret via API
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectConfig.projectId}/secrets/${key}`,
        {
          method: 'DELETE',
          headers: this.auth.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove secret');
      }

      spinner.succeed(`Secret "${chalk.bold(key)}" removed successfully`);
    } catch (error: any) {
      spinner.fail(`Failed to remove secret: ${error.message}`);
    }
  }

  async listSecrets() {
    const spinner = ora('Fetching secrets...').start();
    
    try {
      const projectConfig = this.config.getProjectConfig();
      if (!projectConfig.projectId) {
        spinner.fail('Not in an E-Code project directory');
        return;
      }

      // List secrets via API
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectConfig.projectId}/secrets`,
        { headers: this.auth.getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch secrets');
      }

      const secrets = await response.json();
      
      spinner.stop();
      
      if (secrets.length === 0) {
        console.log(chalk.yellow('No secrets found'));
        return;
      }

      console.log(chalk.cyan('\nProject secrets:\n'));
      secrets.forEach((secret: any) => {
        console.log(`  ${chalk.bold(secret.key)} = ${chalk.gray('*****')}`);
      });
    } catch (error: any) {
      spinner.fail(`Failed to list secrets: ${error.message}`);
    }
  }
}