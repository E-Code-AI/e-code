#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { AuthCommand } from './commands/auth';
import { ProjectsCommand } from './commands/projects';
import { DeployCommand } from './commands/deploy';
import { FilesCommand } from './commands/files';
import { ShellCommand } from './commands/shell';
import { SecretsCommand } from './commands/secrets';
import { DatabaseCommand } from './commands/database';
import { AICommand } from './commands/ai';
import { TemplatesCommand } from './commands/templates';
import { ConfigCommand } from './commands/config';

const program = new Command();

program
  .name('e-code')
  .description('E-Code CLI - Command line interface for E-Code development platform')
  .version('1.0.0');

// Banner
console.log(chalk.blue.bold(`
 ______ ______ ______ ______ 
|  ____|  ____| ____|  ____|
| |__  | |__  | |__  | |__  
|  __| |  __| |  __| |  __| 
| |____| |____| |____| |____
|______|______|______|______|
`));

console.log(chalk.gray('E-Code CLI v1.0.0 - Cloud Development Platform'));
console.log('');

// Authentication commands
const auth = program.command('auth').description('Authentication commands');
auth.command('login')
  .description('Login to E-Code')
  .option('-t, --token <token>', 'API token for authentication')
  .action(AuthCommand.login);

auth.command('logout')
  .description('Logout from E-Code')
  .action(AuthCommand.logout);

auth.command('whoami')
  .description('Show current user')
  .action(AuthCommand.whoami);

// Project commands
const projects = program.command('projects').description('Project management commands');
projects.command('list')
  .alias('ls')
  .description('List all projects')
  .option('-l, --limit <limit>', 'Limit number of results', '20')
  .option('-f, --filter <filter>', 'Filter projects by name')
  .action(ProjectsCommand.list);

projects.command('create')
  .description('Create a new project')
  .argument('<name>', 'Project name')
  .option('-t, --template <template>', 'Project template')
  .option('-d, --description <description>', 'Project description')
  .option('-p, --public', 'Make project public')
  .action(ProjectsCommand.create);

projects.command('clone')
  .description('Clone a project')
  .argument('<project>', 'Project ID or slug (@username/projectname)')
  .option('-d, --dir <directory>', 'Target directory')
  .action(ProjectsCommand.clone);

projects.command('delete')
  .description('Delete a project')
  .argument('<project>', 'Project ID or slug')
  .option('-f, --force', 'Force delete without confirmation')
  .action(ProjectsCommand.delete);

projects.command('info')
  .description('Show project information')
  .argument('<project>', 'Project ID or slug')
  .action(ProjectsCommand.info);

// File commands
const files = program.command('files').description('File management commands');
files.command('upload')
  .description('Upload files to project')
  .argument('<project>', 'Project ID or slug')
  .argument('<path>', 'Local file or directory path')
  .option('-r, --remote <path>', 'Remote path in project')
  .action(FilesCommand.upload);

files.command('download')
  .description('Download files from project')
  .argument('<project>', 'Project ID or slug')
  .argument('<path>', 'Remote file or directory path')
  .option('-o, --output <path>', 'Local output path')
  .action(FilesCommand.download);

files.command('list')
  .alias('ls')
  .description('List project files')
  .argument('<project>', 'Project ID or slug')
  .option('-p, --path <path>', 'Directory path', '/')
  .action(FilesCommand.list);

files.command('create')
  .description('Create a new file')
  .argument('<project>', 'Project ID or slug')
  .argument('<path>', 'File path')
  .option('-c, --content <content>', 'File content')
  .action(FilesCommand.create);

files.command('delete')
  .alias('rm')
  .description('Delete a file or directory')
  .argument('<project>', 'Project ID or slug')
  .argument('<path>', 'File or directory path')
  .option('-r, --recursive', 'Delete recursively')
  .action(FilesCommand.delete);

// Deployment commands
const deploy = program.command('deploy').description('Deployment commands');
deploy.command('create')
  .description('Create a new deployment')
  .argument('<project>', 'Project ID or slug')
  .option('-t, --type <type>', 'Deployment type (static, autoscale, serverless)', 'static')
  .option('-d, --domain <domain>', 'Custom domain')
  .option('-e, --env <env>', 'Environment variables (key=value)', [])
  .action(DeployCommand.create);

deploy.command('list')
  .alias('ls')
  .description('List deployments')
  .argument('<project>', 'Project ID or slug')
  .action(DeployCommand.list);

deploy.command('logs')
  .description('Show deployment logs')
  .argument('<deployment>', 'Deployment ID')
  .option('-f, --follow', 'Follow logs in real-time')
  .option('-n, --lines <lines>', 'Number of lines to show', '100')
  .action(DeployCommand.logs);

deploy.command('delete')
  .description('Delete a deployment')
  .argument('<deployment>', 'Deployment ID')
  .action(DeployCommand.delete);

// Shell commands
const shell = program.command('shell').description('Remote shell commands');
shell.command('exec')
  .description('Execute command in project shell')
  .argument('<project>', 'Project ID or slug')
  .argument('<command>', 'Command to execute')
  .option('-i, --interactive', 'Interactive mode')
  .action(ShellCommand.exec);

shell.command('connect')
  .description('Connect to project shell')
  .argument('<project>', 'Project ID or slug')
  .action(ShellCommand.connect);

// Secrets commands
const secrets = program.command('secrets').description('Secrets management commands');
secrets.command('list')
  .alias('ls')
  .description('List project secrets')
  .argument('<project>', 'Project ID or slug')
  .action(SecretsCommand.list);

secrets.command('set')
  .description('Set a secret value')
  .argument('<project>', 'Project ID or slug')
  .argument('<key>', 'Secret key')
  .argument('<value>', 'Secret value')
  .action(SecretsCommand.set);

secrets.command('delete')
  .alias('rm')
  .description('Delete a secret')
  .argument('<project>', 'Project ID or slug')
  .argument('<key>', 'Secret key')
  .action(SecretsCommand.delete);

// Database commands
const database = program.command('db').description('Database commands');
database.command('get')
  .description('Get database value')
  .argument('<project>', 'Project ID or slug')
  .argument('<key>', 'Database key')
  .action(DatabaseCommand.get);

database.command('set')
  .description('Set database value')
  .argument('<project>', 'Project ID or slug')
  .argument('<key>', 'Database key')
  .argument('<value>', 'Database value')
  .action(DatabaseCommand.set);

database.command('list')
  .alias('ls')
  .description('List database keys')
  .argument('<project>', 'Project ID or slug')
  .option('-p, --prefix <prefix>', 'Key prefix filter')
  .action(DatabaseCommand.list);

database.command('delete')
  .alias('rm')
  .description('Delete database key')
  .argument('<project>', 'Project ID or slug')
  .argument('<key>', 'Database key')
  .action(DatabaseCommand.delete);

// AI commands
const ai = program.command('ai').description('AI assistant commands');
ai.command('chat')
  .description('Chat with AI assistant')
  .argument('<project>', 'Project ID or slug')
  .argument('<message>', 'Message to AI')
  .option('-m, --model <model>', 'AI model to use')
  .action(AICommand.chat);

ai.command('review')
  .description('AI code review')
  .argument('<project>', 'Project ID or slug')
  .option('-f, --files <files>', 'Specific files to review')
  .action(AICommand.review);

ai.command('explain')
  .description('Explain code with AI')
  .argument('<project>', 'Project ID or slug')
  .argument('<file>', 'File to explain')
  .option('-l, --lines <lines>', 'Specific line range (start:end)')
  .action(AICommand.explain);

// Templates commands
const templates = program.command('templates').description('Template management commands');
templates.command('list')
  .alias('ls')
  .description('List available templates')
  .option('-c, --category <category>', 'Filter by category')
  .action(TemplatesCommand.list);

templates.command('info')
  .description('Show template information')
  .argument('<template>', 'Template name')
  .action(TemplatesCommand.info);

// Configuration commands
const config = program.command('config').description('Configuration commands');
config.command('set')
  .description('Set configuration value')
  .argument('<key>', 'Configuration key')
  .argument('<value>', 'Configuration value')
  .action(ConfigCommand.set);

config.command('get')
  .description('Get configuration value')
  .argument('<key>', 'Configuration key')
  .action(ConfigCommand.get);

config.command('list')
  .alias('ls')
  .description('List all configuration')
  .action(ConfigCommand.list);

// Global options
program.option('-v, --verbose', 'Verbose output');
program.option('--api-url <url>', 'E-Code API URL', 'https://e-code.dev/api');

program.parse();