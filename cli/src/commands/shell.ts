import chalk from 'chalk';
import ora from 'ora';
import WebSocket from 'ws';
import { api } from '../lib/api';

export class ShellCommand {
  static async exec(projectId: string, command: string, options: any) {
    const spinner = ora(`Executing command in project ${projectId}...`).start();
    
    try {
      const result = await api.post(`/projects/${projectId}/shell/exec`, {
        command,
        interactive: options.interactive
      });
      
      spinner.succeed(chalk.green('Command executed'));
      
      console.log('');
      console.log(chalk.blue.bold('Output:'));
      
      if (result.stdout) {
        console.log(result.stdout);
      }
      
      if (result.stderr) {
        console.log(chalk.red(result.stderr));
      }
      
      console.log('');
      console.log(chalk.gray(`Exit code: ${result.exitCode}`));
      
    } catch (error: any) {
      spinner.fail(chalk.red('Command execution failed'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async connect(projectId: string) {
    const spinner = ora(`Connecting to shell for project ${projectId}...`).start();
    
    try {
      // Get WebSocket connection info
      const connectionInfo = await api.post(`/projects/${projectId}/shell/connect`);
      
      spinner.succeed(chalk.green('Connected to shell'));
      
      console.log('');
      console.log(chalk.blue('Interactive shell session started'));
      console.log(chalk.gray('Type "exit" or press Ctrl+C to disconnect'));
      console.log('');
      
      // Connect to WebSocket
      const ws = new WebSocket(connectionInfo.wsUrl, {
        headers: {
          'Authorization': `Bearer ${api.getAuthToken()}`
        }
      });
      
      ws.on('open', () => {
        console.log(chalk.green('Shell connected'));
        
        // Handle stdin
        process.stdin.setRawMode?.(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        
        process.stdin.on('data', (key: string) => {
          // Send input to shell
          ws.send(JSON.stringify({
            type: 'input',
            data: key
          }));
          
          // Handle Ctrl+C
          if (key === '\u0003') {
            process.exit(0);
          }
        });
      });
      
      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          
          if (message.type === 'output') {
            process.stdout.write(message.data);
          } else if (message.type === 'error') {
            process.stderr.write(chalk.red(message.data));
          }
        } catch (e) {
          // Raw data
          process.stdout.write(data);
        }
      });
      
      ws.on('close', () => {
        console.log('');
        console.log(chalk.yellow('Shell session ended'));
        process.exit(0);
      });
      
      ws.on('error', (error) => {
        console.error(chalk.red('WebSocket error:'), error.message);
        process.exit(1);
      });
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to connect to shell'));
      console.error(error.response?.data?.message || error.message);
    }
  }
}