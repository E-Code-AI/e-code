import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { api } from '../lib/api';

export class DeployCommand {
  static async create(projectId: string, options: any) {
    const spinner = ora(`Creating deployment for project ${projectId}...`).start();
    
    try {
      const deploymentData: any = {
        type: options.type || 'static',
        environment: {}
      };
      
      if (options.domain) {
        deploymentData.customDomain = options.domain;
      }
      
      // Parse environment variables
      if (options.env && options.env.length > 0) {
        for (const envVar of options.env) {
          const [key, value] = envVar.split('=');
          if (key && value) {
            deploymentData.environment[key] = value;
          }
        }
      }
      
      const deployment = await api.post(`/projects/${projectId}/deployments`, deploymentData);
      
      spinner.succeed(chalk.green('Deployment created successfully!'));
      
      console.log('');
      console.log(chalk.blue('Deployment Details:'));
      console.log(chalk.gray(`ID: ${deployment.id}`));
      console.log(chalk.gray(`Type: ${deployment.type}`));
      console.log(chalk.gray(`Status: ${deployment.status}`));
      console.log(chalk.gray(`URL: ${deployment.url}`));
      console.log('');
      
      if (deployment.status === 'building') {
        console.log(chalk.yellow('Your deployment is building. You can check the status with:'));
        console.log(chalk.cyan(`e-code deploy logs ${deployment.id}`));
      }
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to create deployment'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async list(projectId: string) {
    const spinner = ora('Fetching deployments...').start();
    
    try {
      const deployments = await api.get(`/projects/${projectId}/deployments`);
      
      spinner.succeed(chalk.green(`Found ${deployments.length} deployments`));
      
      if (deployments.length === 0) {
        console.log(chalk.yellow('No deployments found. Create your first deployment with: e-code deploy create'));
        return;
      }
      
      console.log('');
      console.log(chalk.blue.bold('Deployments:'));
      console.log('');
      
      deployments.forEach((deployment: any) => {
        const statusColor = deployment.status === 'running' ? chalk.green :
                           deployment.status === 'building' ? chalk.yellow :
                           deployment.status === 'failed' ? chalk.red : chalk.gray;
        
        console.log(`${chalk.cyan(deployment.id)} ${statusColor(deployment.status)}`);
        console.log(`  ${chalk.gray('Type:')} ${deployment.type}`);
        console.log(`  ${chalk.gray('URL:')} ${deployment.url || 'Not available'}`);
        console.log(`  ${chalk.gray('Created:')} ${new Date(deployment.createdAt).toLocaleString()}`);
        
        if (deployment.customDomain) {
          console.log(`  ${chalk.gray('Custom Domain:')} ${deployment.customDomain}`);
        }
        
        console.log('');
      });
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch deployments'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async logs(deploymentId: string, options: any) {
    const spinner = ora('Fetching deployment logs...').start();
    
    try {
      const logs = await api.get(`/deployments/${deploymentId}/logs`, {
        lines: parseInt(options.lines) || 100
      });
      
      spinner.succeed(chalk.green('Logs retrieved'));
      
      console.log('');
      console.log(chalk.blue.bold(`Deployment Logs: ${deploymentId}`));
      console.log('');
      
      if (logs.length === 0) {
        console.log(chalk.yellow('No logs available yet.'));
        return;
      }
      
      logs.forEach((log: any) => {
        const timestamp = new Date(log.timestamp).toLocaleTimeString();
        const levelColor = log.level === 'error' ? chalk.red :
                          log.level === 'warn' ? chalk.yellow :
                          log.level === 'info' ? chalk.blue : chalk.gray;
        
        console.log(`${chalk.gray(timestamp)} ${levelColor(log.level.toUpperCase())} ${log.message}`);
      });
      
      if (options.follow) {
        console.log('');
        console.log(chalk.yellow('Following logs... (Press Ctrl+C to exit)'));
        
        // Implementation for following logs would require WebSocket connection
        // For now, show a message
        console.log(chalk.gray('Live log following not yet implemented in CLI'));
      }
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch logs'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async delete(deploymentId: string) {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete deployment ${deploymentId}?`,
          default: false
        }
      ]);
      
      if (!answers.confirm) {
        console.log(chalk.yellow('Deletion cancelled.'));
        return;
      }
      
      const spinner = ora(`Deleting deployment ${deploymentId}...`).start();
      
      await api.delete(`/deployments/${deploymentId}`);
      
      spinner.succeed(chalk.green('Deployment deleted successfully!'));
      
    } catch (error: any) {
      console.error(chalk.red('Failed to delete deployment:'), error.response?.data?.message || error.message);
    }
  }
}