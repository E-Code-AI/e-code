import chalk from 'chalk';
import { Config } from '../lib/config';

export class ConfigCommand {
  static async set(key: string, value: string) {
    const config = new Config();
    
    try {
      config.set(key, value);
      console.log(chalk.green(`Configuration "${key}" set successfully.`));
      console.log(chalk.gray(`Value: ${value}`));
    } catch (error: any) {
      console.error(chalk.red('Failed to set configuration:'), error.message);
    }
  }

  static async get(key: string) {
    const config = new Config();
    
    try {
      const value = config.get(key);
      
      if (value === undefined) {
        console.log(chalk.yellow(`Configuration "${key}" not found.`));
        return;
      }
      
      console.log(chalk.blue(`Configuration: ${key}`));
      console.log(chalk.gray(`Value: ${value}`));
    } catch (error: any) {
      console.error(chalk.red('Failed to get configuration:'), error.message);
    }
  }

  static async list() {
    const config = new Config();
    
    try {
      const allConfig = config.list();
      const keys = Object.keys(allConfig);
      
      if (keys.length === 0) {
        console.log(chalk.yellow('No configuration found.'));
        return;
      }
      
      console.log('');
      console.log(chalk.blue.bold('Current Configuration:'));
      console.log('');
      
      keys.forEach(key => {
        const value = allConfig[key];
        
        // Hide sensitive values
        const displayValue = key.toLowerCase().includes('token') || key.toLowerCase().includes('password') 
          ? '*'.repeat(Math.min(String(value).length, 20))
          : value;
        
        console.log(`${chalk.cyan(key)}: ${displayValue}`);
      });
      
      console.log('');
      console.log(chalk.gray('Change configuration with: e-code config set <key> <value>'));
      
    } catch (error: any) {
      console.error(chalk.red('Failed to list configuration:'), error.message);
    }
  }
}