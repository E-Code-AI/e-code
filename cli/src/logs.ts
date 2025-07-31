import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from './config';
import { AuthManager } from './auth';
import { API_BASE_URL, WS_BASE_URL } from './constants';
import WebSocket from 'ws';

export class LogsManager {
  private auth: AuthManager;

  constructor(private config: ConfigManager) {
    this.auth = new AuthManager(config);
  }

  async view(options: any) {
    const spinner = ora('Fetching logs...').start();
    
    try {
      const projectConfig = this.config.getProjectConfig();
      const projectId = options.project ? 
        await this.getProjectId(options.project) : 
        projectConfig.projectId;

      if (!projectId) {
        spinner.fail('No project specified. Use --project or run from project directory.');
        return;
      }

      const lines = parseInt(options.lines) || 100;
      const follow = options.follow || false;

      if (follow) {
        spinner.stop();
        console.log(chalk.cyan('Following logs... (Ctrl+C to stop)\n'));
        await this.followLogs(projectId);
      } else {
        // Fetch recent logs
        const response = await fetch(
          `${API_BASE_URL}/api/projects/${projectId}/logs?lines=${lines}`,
          { headers: this.auth.getAuthHeaders() }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch logs');
        }

        const logs = await response.json();
        
        spinner.stop();
        
        if (logs.length === 0) {
          console.log(chalk.yellow('No logs found'));
          return;
        }

        console.log(chalk.cyan(`\nShowing last ${logs.length} log entries:\n`));
        
        logs.forEach((log: any) => {
          this.printLog(log);
        });
      }
    } catch (error: any) {
      spinner.fail(`Failed to fetch logs: ${error.message}`);
    }
  }

  private async followLogs(projectId: number) {
    return new Promise((resolve, reject) => {
      const token = this.config.get('token');
      const ws = new WebSocket(`${WS_BASE_URL}/logs?projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      ws.on('open', () => {
        console.log(chalk.green('Connected to log stream\n'));
      });

      ws.on('message', (data: Buffer) => {
        try {
          const log = JSON.parse(data.toString());
          this.printLog(log);
        } catch (error) {
          console.error(chalk.red('Failed to parse log message'));
        }
      });

      ws.on('error', (error) => {
        console.error(chalk.red(`WebSocket error: ${error.message}`));
        reject(error);
      });

      ws.on('close', () => {
        console.log(chalk.yellow('\nLog stream closed'));
        resolve(undefined);
      });

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        ws.close();
        process.exit(0);
      });
    });
  }

  private printLog(log: any) {
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    const level = log.level || 'info';
    const levelColor = this.getLevelColor(level);
    const levelText = chalk[levelColor](level.toUpperCase().padEnd(5));
    
    console.log(`${chalk.gray(timestamp)} ${levelText} ${log.message}`);
    
    if (log.metadata) {
      Object.entries(log.metadata).forEach(([key, value]) => {
        console.log(`  ${chalk.gray(key)}: ${value}`);
      });
    }
  }

  private getLevelColor(level: string): string {
    switch (level.toLowerCase()) {
      case 'error':
        return 'red';
      case 'warn':
      case 'warning':
        return 'yellow';
      case 'info':
        return 'blue';
      case 'debug':
        return 'gray';
      default:
        return 'white';
    }
  }

  private async getProjectId(projectName: string): Promise<number | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: this.auth.getAuthHeaders()
      });

      if (!response.ok) {
        return null;
      }

      const projects = await response.json();
      const project = projects.find((p: any) => 
        p.name.toLowerCase() === projectName.toLowerCase() || 
        p.slug === projectName
      );

      return project ? project.id : null;
    } catch {
      return null;
    }
  }
}