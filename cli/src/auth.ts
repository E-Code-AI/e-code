import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import open from 'open';
import { ConfigManager } from './config';
import { API_BASE_URL } from './constants';

export class AuthManager {
  constructor(private config: ConfigManager) {}

  async login() {
    const spinner = ora('Logging in...').start();
    
    try {
      // Check if already logged in
      const token = this.config.get('token');
      if (token) {
        const isValid = await this.validateToken(token);
        if (isValid) {
          spinner.succeed('Already logged in!');
          return;
        }
      }

      // Interactive login
      const { method } = await inquirer.prompt([
        {
          type: 'list',
          name: 'method',
          message: 'How would you like to login?',
          choices: [
            { name: 'Browser (recommended)', value: 'browser' },
            { name: 'API Token', value: 'token' },
            { name: 'Username/Password', value: 'credentials' }
          ]
        }
      ]);

      switch (method) {
        case 'browser':
          await this.browserLogin(spinner);
          break;
        case 'token':
          await this.tokenLogin(spinner);
          break;
        case 'credentials':
          await this.credentialsLogin(spinner);
          break;
      }
    } catch (error: any) {
      spinner.fail(`Login failed: ${error.message}`);
      process.exit(1);
    }
  }

  private async browserLogin(spinner: ora.Ora) {
    // Generate device code
    const response = await fetch(`${API_BASE_URL}/api/cli/device-code`, {
      method: 'POST'
    });
    
    const { device_code, user_code, verification_url } = await response.json();
    
    spinner.stop();
    console.log('\n' + chalk.cyan('Please visit this URL and enter the code:'));
    console.log(chalk.bold(verification_url));
    console.log('\nYour code is: ' + chalk.bold.green(user_code));
    console.log('\n' + chalk.gray('Opening browser...'));
    
    // Open browser
    await open(verification_url);
    
    spinner.start('Waiting for authorization...');
    
    // Poll for token
    let token: string | null = null;
    while (!token) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const tokenResponse = await fetch(`${API_BASE_URL}/api/cli/device-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_code })
      });
      
      if (tokenResponse.ok) {
        const data = await tokenResponse.json();
        token = data.access_token;
      }
    }
    
    // Save token
    this.config.set('token', token);
    
    // Get user info
    const userResponse = await fetch(`${API_BASE_URL}/api/user`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const user = await userResponse.json();
    this.config.set('user', user);
    
    spinner.succeed(`Logged in as ${chalk.bold(user.username)}`);
  }

  private async tokenLogin(spinner: ora.Ora) {
    spinner.stop();
    
    const { token } = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Enter your API token:',
        validate: (input) => input.length > 0 || 'Token is required'
      }
    ]);
    
    spinner.start('Validating token...');
    
    const isValid = await this.validateToken(token);
    if (!isValid) {
      throw new Error('Invalid token');
    }
    
    this.config.set('token', token);
    
    // Get user info
    const userResponse = await fetch(`${API_BASE_URL}/api/user`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const user = await userResponse.json();
    this.config.set('user', user);
    
    spinner.succeed(`Logged in as ${chalk.bold(user.username)}`);
  }

  private async credentialsLogin(spinner: ora.Ora) {
    spinner.stop();
    
    const { username, password } = await inquirer.prompt([
      {
        type: 'input',
        name: 'username',
        message: 'Username:',
        validate: (input) => input.length > 0 || 'Username is required'
      },
      {
        type: 'password',
        name: 'password',
        message: 'Password:',
        validate: (input) => input.length > 0 || 'Password is required'
      }
    ]);
    
    spinner.start('Logging in...');
    
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }
    
    const { token, user } = await response.json();
    
    this.config.set('token', token);
    this.config.set('user', user);
    
    spinner.succeed(`Logged in as ${chalk.bold(user.username)}`);
  }

  async logout() {
    const spinner = ora('Logging out...').start();
    
    try {
      const token = this.config.get('token');
      if (token) {
        // Revoke token on server
        await fetch(`${API_BASE_URL}/api/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      
      // Clear local config
      this.config.clear();
      
      spinner.succeed('Logged out successfully');
    } catch (error: any) {
      spinner.fail(`Logout failed: ${error.message}`);
    }
  }

  async whoami() {
    const user = this.config.get('user');
    const token = this.config.get('token');
    
    if (!user || !token) {
      console.log(chalk.yellow('Not logged in'));
      console.log(chalk.gray('Run `ecode login` to authenticate'));
      return;
    }
    
    const spinner = ora('Fetching user info...').start();
    
    try {
      // Refresh user info
      const response = await fetch(`${API_BASE_URL}/api/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }
      
      const freshUser = await response.json();
      this.config.set('user', freshUser);
      
      spinner.stop();
      
      console.log(chalk.cyan('Current user:'));
      console.log(`  Username: ${chalk.bold(freshUser.username)}`);
      console.log(`  Email: ${chalk.bold(freshUser.email)}`);
      console.log(`  Plan: ${chalk.bold(freshUser.plan || 'Free')}`);
      console.log(`  Projects: ${chalk.bold(freshUser.projectCount || 0)}`);
    } catch (error: any) {
      spinner.fail('Failed to fetch user info');
      console.log(chalk.gray('You may need to login again'));
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = this.config.get('token');
    if (!token) return false;
    
    return await this.validateToken(token);
  }

  private async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getAuthHeaders(): { Authorization: string } {
    const token = this.config.get('token');
    if (!token) {
      throw new Error('Not authenticated. Run `ecode login` first.');
    }
    return { Authorization: `Bearer ${token}` };
  }
}