import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from './config';
import { AuthManager } from './auth';
import { API_BASE_URL } from './constants';

export class PackageManager {
  private auth: AuthManager;

  constructor(private config: ConfigManager) {
    this.auth = new AuthManager(config);
  }

  async add(packages: string[], options: any) {
    const spinner = ora('Installing packages...').start();
    
    try {
      const projectConfig = this.config.getProjectConfig();
      if (!projectConfig.projectId) {
        spinner.fail('Not in an E-Code project directory');
        return;
      }

      const isDev = options.dev || false;

      // Install via API
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectConfig.projectId}/packages`,
        {
          method: 'POST',
          headers: {
            ...this.auth.getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            packages,
            dev: isDev
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to install packages');
      }

      const result = await response.json();
      
      spinner.succeed('Packages installed successfully!');
      
      console.log(chalk.cyan('\nInstalled:'));
      packages.forEach(pkg => {
        console.log(`  ✓ ${chalk.bold(pkg)}`);
      });
      
      if (result.warnings && result.warnings.length > 0) {
        console.log(chalk.yellow('\nWarnings:'));
        result.warnings.forEach((warning: string) => {
          console.log(`  ${warning}`);
        });
      }
    } catch (error: any) {
      spinner.fail(`Failed to install packages: ${error.message}`);
    }
  }

  async remove(packages: string[]) {
    const spinner = ora('Removing packages...').start();
    
    try {
      const projectConfig = this.config.getProjectConfig();
      if (!projectConfig.projectId) {
        spinner.fail('Not in an E-Code project directory');
        return;
      }

      // Remove via API
      for (const pkg of packages) {
        const response = await fetch(
          `${API_BASE_URL}/api/projects/${projectConfig.projectId}/packages/${encodeURIComponent(pkg)}`,
          {
            method: 'DELETE',
            headers: this.auth.getAuthHeaders()
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to remove ${pkg}`);
        }
      }
      
      spinner.succeed('Packages removed successfully!');
      
      console.log(chalk.cyan('\nRemoved:'));
      packages.forEach(pkg => {
        console.log(`  ✓ ${chalk.bold(pkg)}`);
      });
    } catch (error: any) {
      spinner.fail(`Failed to remove packages: ${error.message}`);
    }
  }

  async list() {
    const spinner = ora('Fetching packages...').start();
    
    try {
      const projectConfig = this.config.getProjectConfig();
      if (!projectConfig.projectId) {
        spinner.fail('Not in an E-Code project directory');
        return;
      }

      // List via API
      const response = await fetch(
        `${API_BASE_URL}/api/projects/${projectConfig.projectId}/packages`,
        { headers: this.auth.getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch packages');
      }

      const packages = await response.json();
      
      spinner.stop();
      
      if (!packages.dependencies && !packages.devDependencies) {
        console.log(chalk.yellow('No packages installed'));
        return;
      }

      if (packages.dependencies && Object.keys(packages.dependencies).length > 0) {
        console.log(chalk.cyan('\nDependencies:'));
        Object.entries(packages.dependencies).forEach(([name, version]) => {
          console.log(`  ${chalk.bold(name)} ${chalk.gray(version as string)}`);
        });
      }

      if (packages.devDependencies && Object.keys(packages.devDependencies).length > 0) {
        console.log(chalk.cyan('\nDev Dependencies:'));
        Object.entries(packages.devDependencies).forEach(([name, version]) => {
          console.log(`  ${chalk.bold(name)} ${chalk.gray(version as string)}`);
        });
      }

      if (packages.outdated && packages.outdated.length > 0) {
        console.log(chalk.yellow('\nOutdated packages:'));
        packages.outdated.forEach((pkg: any) => {
          console.log(`  ${chalk.bold(pkg.name)} ${chalk.red(pkg.current)} → ${chalk.green(pkg.latest)}`);
        });
      }
    } catch (error: any) {
      spinner.fail(`Failed to list packages: ${error.message}`);
    }
  }
}