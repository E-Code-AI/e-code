import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api';

export class TemplatesCommand {
  static async list(options: any) {
    const spinner = ora('Fetching templates...').start();
    
    try {
      const params: any = {};
      if (options.category) {
        params.category = options.category;
      }
      
      const templates = await api.get('/templates', params);
      
      spinner.succeed(chalk.green(`Found ${templates.length} templates`));
      
      if (templates.length === 0) {
        console.log(chalk.yellow('No templates found.'));
        return;
      }
      
      // Group by category
      const groupedTemplates: Record<string, any[]> = {};
      templates.forEach((template: any) => {
        if (!groupedTemplates[template.category]) {
          groupedTemplates[template.category] = [];
        }
        groupedTemplates[template.category].push(template);
      });
      
      console.log('');
      console.log(chalk.blue.bold('Available Templates:'));
      console.log('');
      
      Object.entries(groupedTemplates).forEach(([category, categoryTemplates]) => {
        console.log(chalk.cyan.bold(`${category}:`));
        
        categoryTemplates.forEach((template: any) => {
          const popularity = template.usageCount ? ` (${template.usageCount} uses)` : '';
          console.log(`  ${chalk.yellow(template.name)}${chalk.gray(popularity)}`);
          console.log(`    ${chalk.gray(template.description)}`);
          console.log(`    ${chalk.gray('Language:')} ${template.language}`);
          console.log('');
        });
      });
      
      console.log(chalk.gray('Use a template with: e-code projects create <name> --template <template-name>'));
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch templates'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async info(templateName: string) {
    const spinner = ora(`Fetching template info for ${templateName}...`).start();
    
    try {
      const template = await api.get(`/templates/${templateName}`);
      
      spinner.succeed(chalk.green('Template information retrieved'));
      
      console.log('');
      console.log(chalk.blue.bold(`Template: ${template.name}`));
      console.log('');
      
      console.log(chalk.gray('Basic Information:'));
      console.log(`  Name: ${template.name}`);
      console.log(`  Description: ${template.description}`);
      console.log(`  Category: ${template.category}`);
      console.log(`  Language: ${template.language}`);
      console.log(`  Author: ${template.author || 'E-Code Team'}`);
      console.log('');
      
      if (template.tags && template.tags.length > 0) {
        console.log(chalk.gray('Tags:'));
        console.log(`  ${template.tags.join(', ')}`);
        console.log('');
      }
      
      console.log(chalk.gray('Statistics:'));
      console.log(`  Usage Count: ${template.usageCount || 0}`);
      console.log(`  Created: ${new Date(template.createdAt).toLocaleDateString()}`);
      
      if (template.updatedAt) {
        console.log(`  Updated: ${new Date(template.updatedAt).toLocaleDateString()}`);
      }
      
      console.log('');
      
      if (template.features && template.features.length > 0) {
        console.log(chalk.gray('Features:'));
        template.features.forEach((feature: string) => {
          console.log(`  • ${feature}`);
        });
        console.log('');
      }
      
      if (template.dependencies && template.dependencies.length > 0) {
        console.log(chalk.gray('Dependencies:'));
        template.dependencies.forEach((dep: string) => {
          console.log(`  • ${dep}`);
        });
        console.log('');
      }
      
      console.log(chalk.yellow('Create a project with this template:'));
      console.log(chalk.cyan(`e-code projects create my-project --template ${template.name}`));
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch template information'));
      console.error(error.response?.data?.message || error.message);
    }
  }
}