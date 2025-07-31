import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { api } from '../lib/api';

export class SecretsCommand {
  static async list(projectId: string) {
    const spinner = ora('Fetching secrets...').start();
    
    try {
      const secrets = await api.get(`/projects/${projectId}/secrets`);
      
      spinner.succeed(chalk.green(`Found ${secrets.length} secrets`));
      
      if (secrets.length === 0) {
        console.log(chalk.yellow('No secrets found. Add your first secret with: e-code secrets set'));
        return;
      }
      
      console.log('');
      console.log(chalk.blue.bold('Project Secrets:'));
      console.log('');
      
      secrets.forEach((secret: any) => {
        const createdDate = new Date(secret.createdAt).toLocaleDateString();
        const updatedDate = new Date(secret.updatedAt).toLocaleDateString();
        
        console.log(`${chalk.cyan(secret.key)}`);
        console.log(`  ${chalk.gray('Value:')} ${'*'.repeat(Math.min(secret.value?.length || 8, 20))}`);
        console.log(`  ${chalk.gray('Created:')} ${createdDate}`);
        console.log(`  ${chalk.gray('Updated:')} ${updatedDate}`);
        console.log('');
      });
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch secrets'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async set(projectId: string, key: string, value: string) {
    const spinner = ora(`Setting secret ${key}...`).start();
    
    try {
      await api.post(`/projects/${projectId}/secrets`, {
        key,
        value
      });
      
      spinner.succeed(chalk.green(`Secret "${key}" set successfully`));
      
      console.log('');
      console.log(chalk.blue('Secret Details:'));
      console.log(chalk.gray(`Key: ${key}`));
      console.log(chalk.gray(`Value: ${'*'.repeat(Math.min(value.length, 20))}`));
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to set secret'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async delete(projectId: string, key: string) {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete secret "${key}"?`,
          default: false
        }
      ]);
      
      if (!answers.confirm) {
        console.log(chalk.yellow('Deletion cancelled.'));
        return;
      }
      
      const spinner = ora(`Deleting secret ${key}...`).start();
      
      await api.delete(`/projects/${projectId}/secrets/${key}`);
      
      spinner.succeed(chalk.green(`Secret "${key}" deleted successfully`));
      
    } catch (error: any) {
      console.error(chalk.red('Failed to delete secret:'), error.response?.data?.message || error.message);
    }
  }
}