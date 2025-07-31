import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { ConfigManager } from './config';
import { AuthManager } from './auth';
import { API_BASE_URL, DEPLOYMENT_TYPES } from './constants';

export class DeploymentManager {
  private auth: AuthManager;

  constructor(private config: ConfigManager) {
    this.auth = new AuthManager(config);
  }

  async create(options: any) {
    const spinner = ora('Creating deployment...').start();
    
    try {
      // Check if in project directory
      const projectConfig = this.config.getProjectConfig();
      if (!projectConfig.projectId) {
        spinner.fail('Not in an E-Code project directory. Run `ecode init` first.');
        return;
      }

      spinner.stop();

      // Get deployment details
      const details = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Deployment name:',
          default: options.name || `${projectConfig.projectSlug}-prod`
        },
        {
          type: 'list',
          name: 'type',
          message: 'Deployment type:',
          choices: DEPLOYMENT_TYPES.map(t => ({
            name: `${t.name} - ${t.description}`,
            value: t.id
          })),
          default: options.type || 'autoscale'
        },
        {
          type: 'confirm',
          name: 'autoScale',
          message: 'Enable auto-scaling?',
          default: true,
          when: (answers) => answers.type === 'autoscale'
        }
      ]);

      spinner.start('Building and deploying...');

      // Deploy via API
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectConfig.projectId}/deploy`,
        {
          method: 'POST',
          headers: {
            ...this.auth.getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: details.name,
            type: details.type,
            config: {
              autoScale: details.autoScale
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Deployment failed');
      }

      const deployment = await response.json();
      
      spinner.succeed('Deployment created successfully!');
      
      console.log(`\n  Name: ${chalk.bold(deployment.name)}`);
      console.log(`  URL: ${chalk.cyan(deployment.url)}`);
      console.log(`  Status: ${chalk.green(deployment.status)}`);
      console.log(`  Type: ${chalk.yellow(deployment.type)}`);
      
      console.log(chalk.gray('\nUse `ecode deploy status` to check deployment progress'));
    } catch (error: any) {
      spinner.fail(`Deployment failed: ${error.message}`);
    }
  }

  async list() {
    const spinner = ora('Fetching deployments...').start();
    
    try {
      const projectConfig = this.config.getProjectConfig();
      let url = `${API_BASE_URL}/api/deployments`;
      
      if (projectConfig.projectId) {
        url = `${API_BASE_URL}/api/projects/${projectConfig.projectId}/deployments`;
      }

      const response = await fetch(url, {
        headers: this.auth.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deployments');
      }

      const deployments = await response.json();
      
      spinner.stop();
      
      if (deployments.length === 0) {
        console.log(chalk.yellow('No deployments found.'));
        return;
      }

      console.log(chalk.cyan(`\nDeployments (${deployments.length}):\n`));
      
      deployments.forEach((deployment: any) => {
        const statusColor = deployment.status === 'running' ? 'green' : 
                          deployment.status === 'building' ? 'yellow' : 'red';
        const status = chalk[statusColor](deployment.status.toUpperCase());
        
        console.log(`  ${chalk.bold(deployment.name)} - ${status}`);
        console.log(`     URL: ${chalk.cyan(deployment.url)}`);
        console.log(`     Type: ${chalk.gray(deployment.type)}`);
        console.log(`     Created: ${new Date(deployment.createdAt).toLocaleString()}`);
        console.log();
      });
    } catch (error: any) {
      spinner.fail(`Failed to list deployments: ${error.message}`);
    }
  }

  async status(name: string) {
    const spinner = ora('Fetching deployment status...').start();
    
    try {
      // Find deployment
      const response = await fetch(`${API_BASE_URL}/api/deployments`, {
        headers: this.auth.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deployments');
      }

      const deployments = await response.json();
      const deployment = deployments.find((d: any) => 
        d.name.toLowerCase() === name.toLowerCase()
      );

      if (!deployment) {
        throw new Error(`Deployment "${name}" not found`);
      }

      // Get detailed status
      const statusResponse = await fetch(
        `${API_BASE_URL}/api/deployments/${deployment.id}/status`,
        { headers: this.auth.getAuthHeaders() }
      );

      if (!statusResponse.ok) {
        throw new Error('Failed to fetch deployment status');
      }

      const status = await statusResponse.json();
      
      spinner.stop();
      
      console.log(chalk.cyan(`\nDeployment: ${chalk.bold(deployment.name)}\n`));
      console.log(`  Status: ${chalk.green(status.status)}`);
      console.log(`  Health: ${status.health === 'healthy' ? chalk.green('Healthy') : chalk.red('Unhealthy')}`);
      console.log(`  URL: ${chalk.cyan(deployment.url)}`);
      console.log(`  Version: ${status.version}`);
      console.log(`  Instances: ${status.instances}`);
      
      if (status.metrics) {
        console.log('\n  Metrics:');
        console.log(`    Requests: ${status.metrics.requests || 0}`);
        console.log(`    Response Time: ${status.metrics.responseTime || 0}ms`);
        console.log(`    Uptime: ${status.metrics.uptime || '0%'}`);
      }
      
      if (status.logs && status.logs.length > 0) {
        console.log('\n  Recent logs:');
        status.logs.slice(-5).forEach((log: string) => {
          console.log(`    ${chalk.gray(log)}`);
        });
      }
    } catch (error: any) {
      spinner.fail(`Failed to get status: ${error.message}`);
    }
  }

  async rollback(name: string) {
    const spinner = ora('Rolling back deployment...').start();
    
    try {
      // Find deployment
      const response = await fetch(`${API_BASE_URL}/api/deployments`, {
        headers: this.auth.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deployments');
      }

      const deployments = await response.json();
      const deployment = deployments.find((d: any) => 
        d.name.toLowerCase() === name.toLowerCase()
      );

      if (!deployment) {
        throw new Error(`Deployment "${name}" not found`);
      }

      spinner.stop();

      // Confirm rollback
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to rollback "${deployment.name}"?`,
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Rollback cancelled'));
        return;
      }

      spinner.start('Rolling back...');

      // Rollback via API
      const rollbackResponse = await fetch(
        `${API_BASE_URL}/api/deployments/${deployment.id}/rollback`,
        {
          method: 'POST',
          headers: this.auth.getAuthHeaders()
        }
      );

      if (!rollbackResponse.ok) {
        throw new Error('Rollback failed');
      }

      const result = await rollbackResponse.json();
      
      spinner.succeed('Rollback completed successfully!');
      console.log(`\n  Rolled back to version: ${chalk.bold(result.version)}`);
    } catch (error: any) {
      spinner.fail(`Rollback failed: ${error.message}`);
    }
  }
}