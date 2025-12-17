import chalk from 'chalk';
import ora from 'ora';
import WebSocket from 'ws';
import { api } from '../lib/api';
import { Config } from '../lib/config';

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
      console.log(chalk.gray('Type "exit" or press Ctrl+D to disconnect'));
      console.log('');
      
      // Start interactive session with proper TTY handling
      await this.connectInteractive(connectionInfo.wsUrl, projectId);
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to connect to shell'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  private static async connectInteractive(wsUrl: string, projectId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const config = new Config();
      const token = config.get('auth_token');
      
      // Security: Connect without token in URL
      const ws = new WebSocket(wsUrl);
      
      let isConnected = false;
      let isClosing = false;
      
      // Get terminal size
      const getTerminalSize = () => ({
        cols: process.stdout.columns || 80,
        rows: process.stdout.rows || 24
      });
      
      // Cleanup function to restore terminal state
      const cleanup = () => {
        if (isClosing) return;
        isClosing = true;
        
        // Restore terminal state
        if (process.stdin.isTTY) {
          try {
            process.stdin.setRawMode(false);
          } catch (e) {
            // Ignore errors during cleanup
          }
        }
        process.stdin.pause();
        process.stdin.removeAllListeners('data');
        process.stdout.removeAllListeners('resize');
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Client disconnect');
        }
        
        // Remove signal handlers
        process.removeListener('SIGINT', cleanup);
        process.removeListener('SIGTERM', cleanup);
        process.removeListener('SIGHUP', cleanup);
        
        console.log('');
        console.log(chalk.yellow('Shell session ended'));
        resolve();
      };
      
      ws.on('open', () => {
        isConnected = true;
        
        // Authenticate via message (secure - not in URL)
        ws.send(JSON.stringify({ 
          type: 'auth', 
          token,
          projectId
        }));
        
        // Send initial terminal size for proper PTY sizing
        const size = getTerminalSize();
        ws.send(JSON.stringify({
          type: 'resize',
          cols: size.cols,
          rows: size.rows
        }));
        
        // Configure stdin for raw mode (proper TTY handling)
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(true);
        }
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        
        // Handle input from terminal
        process.stdin.on('data', (data: string) => {
          if (!isConnected || isClosing) return;
          
          // Send input to remote shell
          ws.send(JSON.stringify({
            type: 'input',
            data: data
          }));
        });
        
        // Handle terminal resize events
        process.stdout.on('resize', () => {
          if (!isConnected || isClosing) return;
          
          const newSize = getTerminalSize();
          ws.send(JSON.stringify({
            type: 'resize',
            cols: newSize.cols,
            rows: newSize.rows
          }));
        });
      });
      
      ws.on('message', (data: WebSocket.Data) => {
        if (isClosing) return;
        
        try {
          const message = JSON.parse(data.toString());
          
          switch (message.type) {
            case 'output':
            case 'stdout':
              process.stdout.write(message.data);
              break;
            case 'stderr':
              process.stderr.write(message.data);
              break;
            case 'error':
              console.error(chalk.red(message.data || message.message));
              break;
            case 'exit':
              console.log(chalk.gray(`\nProcess exited with code ${message.code}`));
              cleanup();
              break;
            case 'ready':
              console.log(chalk.green('Shell ready'));
              break;
            case 'auth_success':
              // Authentication successful, shell is ready
              break;
            case 'auth_failed':
              console.error(chalk.red('Authentication failed'));
              cleanup();
              break;
          }
        } catch (e) {
          // Raw output data (not JSON)
          process.stdout.write(data.toString());
        }
      });
      
      ws.on('close', (code, reason) => {
        if (!isClosing) {
          cleanup();
        }
      });
      
      ws.on('error', (error) => {
        console.error(chalk.red(`\nConnection error: ${error.message}`));
        cleanup();
      });
      
      // Handle signals for graceful shutdown
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
      process.on('SIGHUP', cleanup);
      
      // Handle Ctrl+D (EOF) for disconnect
      process.stdin.on('end', cleanup);
    });
  }
}
