import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { api } from '../lib/api';

export class ProjectsCommand {
  static async list(options: any) {
    const spinner = ora('Fetching projects...').start();
    
    try {
      const params: any = {
        limit: parseInt(options.limit) || 20
      };
      
      if (options.filter) {
        params.search = options.filter;
      }
      
      const projects = await api.get('/projects', params);
      
      spinner.succeed(chalk.green(`Found ${projects.length} projects`));
      
      if (projects.length === 0) {
        console.log(chalk.yellow('No projects found. Create your first project with: e-code projects create <name>'));
        return;
      }
      
      console.log('');
      console.log(chalk.blue.bold('Your Projects:'));
      console.log('');
      
      projects.forEach((project: any) => {
        const visibility = project.isPublic ? chalk.green('public') : chalk.gray('private');
        const lastModified = new Date(project.updatedAt).toLocaleDateString();
        
        console.log(`${chalk.cyan(project.name)} ${visibility}`);
        console.log(`  ${chalk.gray('ID:')} ${project.id}`);
        console.log(`  ${chalk.gray('Slug:')} @${project.owner?.username || 'unknown'}/${project.slug}`);
        console.log(`  ${chalk.gray('Description:')} ${project.description || 'No description'}`);
        console.log(`  ${chalk.gray('Language:')} ${project.language || 'Unknown'}`);
        console.log(`  ${chalk.gray('Last modified:')} ${lastModified}`);
        console.log('');
      });
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch projects'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async create(name: string, options: any) {
    const spinner = ora(`Creating project "${name}"...`).start();
    
    try {
      const projectData: any = {
        name,
        description: options.description || '',
        isPublic: options.public || false
      };
      
      if (options.template) {
        projectData.templateId = options.template;
      }
      
      const project = await api.post('/projects', projectData);
      
      spinner.succeed(chalk.green(`Project "${name}" created successfully!`));
      
      console.log('');
      console.log(chalk.blue('Project Details:'));
      console.log(chalk.gray(`ID: ${project.id}`));
      console.log(chalk.gray(`Name: ${project.name}`));
      console.log(chalk.gray(`Slug: @${project.owner?.username}/${project.slug}`));
      console.log(chalk.gray(`URL: https://e-code.dev/@${project.owner?.username}/${project.slug}`));
      console.log('');
      
      console.log(chalk.yellow('Next steps:'));
      console.log(`  ${chalk.cyan('e-code files upload')} ${project.id} <local-path>  # Upload files`);
      console.log(`  ${chalk.cyan('e-code shell connect')} ${project.id}              # Connect to shell`);
      console.log(`  ${chalk.cyan('e-code deploy create')} ${project.id}             # Deploy project`);
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to create project'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async clone(projectId: string, options: any) {
    const spinner = ora(`Cloning project ${projectId}...`).start();
    
    try {
      // First get project info
      const project = await api.get(`/projects/${projectId}`);
      
      spinner.text = `Cloning "${project.name}"...`;
      
      // Create fork/copy
      const clonedProject = await api.post(`/projects/${projectId}/fork`);
      
      // Download all files if directory specified
      if (options.dir) {
        const targetDir = path.resolve(options.dir);
        await fs.ensureDir(targetDir);
        
        spinner.text = 'Downloading project files...';
        
        // Get all files
        const files = await api.get(`/projects/${clonedProject.id}/files`);
        
        for (const file of files) {
          if (file.type === 'file') {
            const filePath = path.join(targetDir, file.path);
            await fs.ensureDir(path.dirname(filePath));
            
            // Get file content
            const content = await api.get(`/projects/${clonedProject.id}/files/${file.path}`);
            await fs.writeFile(filePath, content.content);
          }
        }
      }
      
      spinner.succeed(chalk.green(`Project cloned successfully!`));
      
      console.log('');
      console.log(chalk.blue('Cloned Project:'));
      console.log(chalk.gray(`Original: ${project.name} (ID: ${project.id})`));
      console.log(chalk.gray(`Clone: ${clonedProject.name} (ID: ${clonedProject.id})`));
      
      if (options.dir) {
        console.log(chalk.gray(`Files downloaded to: ${options.dir}`));
      }
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to clone project'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async delete(projectId: string, options: any) {
    try {
      // Get project info first
      const project = await api.get(`/projects/${projectId}`);
      
      if (!options.force) {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
            default: false
          }
        ]);
        
        if (!answers.confirm) {
          console.log(chalk.yellow('Deletion cancelled.'));
          return;
        }
      }
      
      const spinner = ora(`Deleting project "${project.name}"...`).start();
      
      await api.delete(`/projects/${projectId}`);
      
      spinner.succeed(chalk.green('Project deleted successfully!'));
      
    } catch (error: any) {
      console.error(chalk.red('Failed to delete project:'), error.response?.data?.message || error.message);
    }
  }

  static async info(projectId: string) {
    const spinner = ora('Fetching project information...').start();
    
    try {
      const project = await api.get(`/projects/${projectId}`);
      
      spinner.succeed(chalk.green('Project information retrieved'));
      
      console.log('');
      console.log(chalk.blue.bold(`Project: ${project.name}`));
      console.log('');
      
      console.log(chalk.gray('Basic Information:'));
      console.log(`  ID: ${project.id}`);
      console.log(`  Name: ${project.name}`);
      console.log(`  Slug: @${project.owner?.username}/${project.slug}`);
      console.log(`  Description: ${project.description || 'No description'}`);
      console.log(`  Language: ${project.language || 'Unknown'}`);
      console.log(`  Visibility: ${project.isPublic ? chalk.green('Public') : chalk.gray('Private')}`);
      console.log(`  Template: ${project.template?.name || 'None'}`);
      console.log('');
      
      console.log(chalk.gray('Dates:'));
      console.log(`  Created: ${new Date(project.createdAt).toLocaleString()}`);
      console.log(`  Modified: ${new Date(project.updatedAt).toLocaleString()}`);
      console.log('');
      
      console.log(chalk.gray('Statistics:'));
      console.log(`  Views: ${project.views || 0}`);
      console.log(`  Likes: ${project.likes || 0}`);
      console.log('');
      
      console.log(chalk.gray('URLs:'));
      console.log(`  Editor: https://e-code.dev/@${project.owner?.username}/${project.slug}`);
      
      if (project.deployments?.length > 0) {
        console.log(`  Live: ${project.deployments[0].url}`);
      }
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch project information'));
      console.error(error.response?.data?.message || error.message);
    }
  }
}