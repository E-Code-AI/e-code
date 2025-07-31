import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api';

export class DatabaseCommand {
  static async get(projectId: string, key: string) {
    const spinner = ora(`Getting database value for key "${key}"...`).start();
    
    try {
      const result = await api.get(`/projects/${projectId}/database/${key}`);
      
      spinner.succeed(chalk.green('Value retrieved'));
      
      console.log('');
      console.log(chalk.blue(`Database Key: ${key}`));
      console.log(chalk.gray(`Type: ${typeof result.value}`));
      console.log(chalk.gray(`Value:`));
      
      if (typeof result.value === 'object') {
        console.log(JSON.stringify(result.value, null, 2));
      } else {
        console.log(result.value);
      }
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to get database value'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async set(projectId: string, key: string, value: string) {
    const spinner = ora(`Setting database value for key "${key}"...`).start();
    
    try {
      // Try to parse as JSON first
      let parsedValue: any = value;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // Keep as string if not valid JSON
      }
      
      await api.post(`/projects/${projectId}/database`, {
        key,
        value: parsedValue
      });
      
      spinner.succeed(chalk.green(`Database key "${key}" set successfully`));
      
      console.log('');
      console.log(chalk.blue('Database Entry:'));
      console.log(chalk.gray(`Key: ${key}`));
      console.log(chalk.gray(`Type: ${typeof parsedValue}`));
      console.log(chalk.gray(`Value:`));
      
      if (typeof parsedValue === 'object') {
        console.log(JSON.stringify(parsedValue, null, 2));
      } else {
        console.log(parsedValue);
      }
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to set database value'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async list(projectId: string, options: any) {
    const spinner = ora('Fetching database keys...').start();
    
    try {
      const params: any = {};
      if (options.prefix) {
        params.prefix = options.prefix;
      }
      
      const keys = await api.get(`/projects/${projectId}/database`, params);
      
      spinner.succeed(chalk.green(`Found ${keys.length} database keys`));
      
      if (keys.length === 0) {
        console.log(chalk.yellow('No database keys found. Set your first value with: e-code db set'));
        return;
      }
      
      console.log('');
      console.log(chalk.blue.bold('Database Keys:'));
      console.log('');
      
      keys.forEach((entry: any) => {
        const valuePreview = typeof entry.value === 'object' 
          ? JSON.stringify(entry.value).substring(0, 50) + '...'
          : String(entry.value).substring(0, 50) + (String(entry.value).length > 50 ? '...' : '');
        
        console.log(`${chalk.cyan(entry.key)} ${chalk.gray(`(${typeof entry.value})`)}`);
        console.log(`  ${chalk.gray('Value:')} ${valuePreview}`);
        console.log('');
      });
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch database keys'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async delete(projectId: string, key: string) {
    const spinner = ora(`Deleting database key "${key}"...`).start();
    
    try {
      await api.delete(`/projects/${projectId}/database/${key}`);
      
      spinner.succeed(chalk.green(`Database key "${key}" deleted successfully`));
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to delete database key'));
      console.error(error.response?.data?.message || error.message);
    }
  }
}