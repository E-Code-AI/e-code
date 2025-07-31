#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { AuthManager } from './auth';
import { ProjectManager } from './projects';
import { DeploymentManager } from './deployments';
import { PackageManager } from './packages';
import { LogsManager } from './logs';
import { ConfigManager } from './config';
import { version } from '../package.json';

const program = new Command();
const config = new ConfigManager();

// ASCII Art Logo
const logo = chalk.blue(`
╔═══════════════════════════════════════╗
║  ███████╗   ██████╗ ██████╗ ██████╗  ║
║  ██╔════╝  ██╔════╝██╔═══██╗██╔══██╗ ║
║  █████╗    ██║     ██║   ██║██║  ██║ ║
║  ██╔══╝    ██║     ██║   ██║██║  ██║ ║
║  ███████╗  ╚██████╗╚██████╔╝██████╔╝ ║
║  ╚══════╝   ╚═════╝ ╚═════╝ ╚═════╝  ║
╚═══════════════════════════════════════╝
`);

program
  .name('ecode')
  .description('E-Code CLI - Build and deploy from your terminal')
  .version(version);

// Auth commands
program
  .command('login')
  .description('Login to your E-Code account')
  .action(async () => {
    console.log(logo);
    const auth = new AuthManager(config);
    await auth.login();
  });

program
  .command('logout')
  .description('Logout from your E-Code account')
  .action(async () => {
    const auth = new AuthManager(config);
    await auth.logout();
  });

program
  .command('whoami')
  .description('Display current logged in user')
  .action(async () => {
    const auth = new AuthManager(config);
    await auth.whoami();
  });

// Project commands
const project = program.command('project');

project
  .command('create [name]')
  .description('Create a new project')
  .option('-l, --language <language>', 'Project language', 'javascript')
  .option('-t, --template <template>', 'Use a template')
  .option('-p, --private', 'Make project private', false)
  .action(async (name, options) => {
    const projectManager = new ProjectManager(config);
    await projectManager.create(name, options);
  });

project
  .command('list')
  .description('List all your projects')
  .option('-l, --limit <limit>', 'Number of projects to show', '10')
  .action(async (options) => {
    const projectManager = new ProjectManager(config);
    await projectManager.list(options);
  });

project
  .command('open <name>')
  .description('Open a project in the browser')
  .action(async (name) => {
    const projectManager = new ProjectManager(config);
    await projectManager.open(name);
  });

project
  .command('delete <name>')
  .description('Delete a project')
  .option('-f, --force', 'Skip confirmation')
  .action(async (name, options) => {
    const projectManager = new ProjectManager(config);
    await projectManager.delete(name, options);
  });

project
  .command('fork <name>')
  .description('Fork a project')
  .option('-n, --new-name <name>', 'Name for the forked project')
  .action(async (name, options) => {
    const projectManager = new ProjectManager(config);
    await projectManager.fork(name, options);
  });

// Run command
program
  .command('run [script]')
  .description('Run a project or script')
  .option('-w, --watch', 'Watch for changes')
  .option('-p, --project <name>', 'Project to run')
  .action(async (script, options) => {
    const projectManager = new ProjectManager(config);
    await projectManager.run(script, options);
  });

// Deploy commands
const deploy = program.command('deploy');

deploy
  .command('create')
  .description('Deploy current project')
  .option('-t, --type <type>', 'Deployment type (static, autoscale, reserved-vm)', 'autoscale')
  .option('-n, --name <name>', 'Deployment name')
  .action(async (options) => {
    const deploymentManager = new DeploymentManager(config);
    await deploymentManager.create(options);
  });

deploy
  .command('list')
  .description('List all deployments')
  .action(async () => {
    const deploymentManager = new DeploymentManager(config);
    await deploymentManager.list();
  });

deploy
  .command('status <name>')
  .description('Get deployment status')
  .action(async (name) => {
    const deploymentManager = new DeploymentManager(config);
    await deploymentManager.status(name);
  });

deploy
  .command('rollback <name>')
  .description('Rollback a deployment')
  .action(async (name) => {
    const deploymentManager = new DeploymentManager(config);
    await deploymentManager.rollback(name);
  });

// Package commands
const pkg = program.command('package');

pkg
  .command('add <packages...>')
  .description('Add packages to your project')
  .option('-D, --dev', 'Add as dev dependency')
  .action(async (packages, options) => {
    const packageManager = new PackageManager(config);
    await packageManager.add(packages, options);
  });

pkg
  .command('remove <packages...>')
  .description('Remove packages from your project')
  .action(async (packages) => {
    const packageManager = new PackageManager(config);
    await packageManager.remove(packages);
  });

pkg
  .command('list')
  .description('List installed packages')
  .action(async () => {
    const packageManager = new PackageManager(config);
    await packageManager.list();
  });

// Logs command
program
  .command('logs')
  .description('View project logs')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <lines>', 'Number of lines to show', '100')
  .option('-p, --project <name>', 'Project name')
  .action(async (options) => {
    const logsManager = new LogsManager(config);
    await logsManager.view(options);
  });

// Secret commands
const secret = program.command('secret');

secret
  .command('add <key> [value]')
  .description('Add a secret')
  .action(async (key, value) => {
    const projectManager = new ProjectManager(config);
    await projectManager.addSecret(key, value);
  });

secret
  .command('remove <key>')
  .description('Remove a secret')
  .action(async (key) => {
    const projectManager = new ProjectManager(config);
    await projectManager.removeSecret(key);
  });

secret
  .command('list')
  .description('List all secrets')
  .action(async () => {
    const projectManager = new ProjectManager(config);
    await projectManager.listSecrets();
  });

// Init command for current directory
program
  .command('init')
  .description('Initialize E-Code in current directory')
  .action(async () => {
    const projectManager = new ProjectManager(config);
    await projectManager.init();
  });

// Export command
program
  .command('export')
  .description('Export project')
  .option('-f, --format <format>', 'Export format (zip, docker, github)', 'zip')
  .option('-o, --output <path>', 'Output path')
  .action(async (options) => {
    const projectManager = new ProjectManager(config);
    await projectManager.export(options);
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode')
  .action(async () => {
    console.log(logo);
    console.log(chalk.cyan('Welcome to E-Code CLI Interactive Mode!\n'));
    
    const auth = new AuthManager(config);
    const isLoggedIn = await auth.isAuthenticated();
    
    if (!isLoggedIn) {
      console.log(chalk.yellow('You are not logged in. Please login first.\n'));
      await auth.login();
    }
    
    // Interactive menu
    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '🚀 Create a new project', value: 'create' },
            { name: '📁 List projects', value: 'list' },
            { name: '🔧 Run a project', value: 'run' },
            { name: '🌐 Deploy a project', value: 'deploy' },
            { name: '📦 Manage packages', value: 'packages' },
            { name: '🔑 Manage secrets', value: 'secrets' },
            { name: '📊 View logs', value: 'logs' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);
      
      if (action === 'exit') break;
      
      // Handle each action
      switch (action) {
        case 'create':
          const projectManager = new ProjectManager(config);
          await projectManager.createInteractive();
          break;
        case 'list':
          const pm = new ProjectManager(config);
          await pm.list({ limit: '20' });
          break;
        // ... other cases
      }
    }
  });

// Error handling
process.on('unhandledRejection', (err) => {
  console.error(chalk.red('Error:'), err);
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(logo);
  program.outputHelp();
}