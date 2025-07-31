import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { api } from '../lib/api';
import { Config } from '../lib/config';

export class AuthCommand {
  static async login(options: any) {
    const config = new Config();
    
    try {
      let token = options.token;
      
      if (!token) {
        console.log(chalk.blue('Please provide your E-Code API token.'));
        console.log(chalk.gray('You can find your API token at: https://e-code.dev/account/tokens'));
        console.log('');
        
        const answers = await inquirer.prompt([
          {
            type: 'password',
            name: 'token',
            message: 'API Token:',
            validate: (input) => input.length > 0 || 'Token is required'
          }
        ]);
        
        token = answers.token;
      }

      const spinner = ora('Authenticating...').start();
      
      // Set token temporarily to test it
      api.setAuthToken(token);
      
      // Test the token by fetching user info
      const user = await api.get('/user');
      
      spinner.succeed(chalk.green('Successfully authenticated!'));
      
      console.log(chalk.gray(`Logged in as: ${user.firstName} ${user.lastName} (${user.email})`));
      
      // Save token permanently
      config.set('auth_token', token);
      config.set('user', user);
      
    } catch (error: any) {
      console.error(chalk.red('Authentication failed:'), error.response?.data?.message || error.message);
      process.exit(1);
    }
  }

  static async logout() {
    const config = new Config();
    const spinner = ora('Logging out...').start();
    
    try {
      // Clear stored credentials
      config.delete('auth_token');
      config.delete('user');
      api.removeAuthToken();
      
      spinner.succeed(chalk.green('Successfully logged out!'));
    } catch (error) {
      spinner.fail(chalk.red('Logout failed'));
      console.error(error);
    }
  }

  static async whoami() {
    const config = new Config();
    const token = config.get('auth_token');
    
    if (!token) {
      console.log(chalk.yellow('Not authenticated. Run: e-code auth login'));
      return;
    }

    try {
      const user = await api.get('/user');
      
      console.log(chalk.blue('Current User:'));
      console.log(chalk.gray(`Name: ${user.firstName} ${user.lastName}`));
      console.log(chalk.gray(`Email: ${user.email}`));
      console.log(chalk.gray(`ID: ${user.id}`));
      
      if (user.profileImageUrl) {
        console.log(chalk.gray(`Avatar: ${user.profileImageUrl}`));
      }
      
    } catch (error: any) {
      console.error(chalk.red('Failed to fetch user info:'), error.response?.data?.message || error.message);
      
      if (error.response?.status === 401) {
        console.log(chalk.yellow('Your session may have expired. Please run: e-code auth login'));
      }
    }
  }
}