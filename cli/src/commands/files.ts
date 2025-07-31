import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { api } from '../lib/api';

export class FilesCommand {
  static async upload(projectId: string, localPath: string, options: any) {
    const spinner = ora(`Uploading ${localPath}...`).start();
    
    try {
      const fullPath = path.resolve(localPath);
      const stats = await fs.stat(fullPath);
      
      if (stats.isFile()) {
        // Upload single file
        const remotePath = options.remote || path.basename(localPath);
        await api.uploadFile(`/projects/${projectId}/files/${remotePath}`, fullPath);
        
        spinner.succeed(chalk.green(`File uploaded: ${remotePath}`));
      } else if (stats.isDirectory()) {
        // Upload directory recursively
        const files = await this.getAllFiles(fullPath);
        let uploaded = 0;
        
        for (const file of files) {
          const relativePath = path.relative(fullPath, file);
          const remotePath = options.remote ? path.join(options.remote, relativePath) : relativePath;
          
          spinner.text = `Uploading ${relativePath}... (${uploaded + 1}/${files.length})`;
          
          await api.uploadFile(`/projects/${projectId}/files/${remotePath}`, file);
          uploaded++;
        }
        
        spinner.succeed(chalk.green(`Uploaded ${uploaded} files`));
      }
      
    } catch (error: any) {
      spinner.fail(chalk.red('Upload failed'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async download(projectId: string, remotePath: string, options: any) {
    const spinner = ora(`Downloading ${remotePath}...`).start();
    
    try {
      const outputPath = options.output || path.basename(remotePath);
      
      // Get file info first
      const fileInfo = await api.get(`/projects/${projectId}/files/${remotePath}/info`);
      
      if (fileInfo.type === 'file') {
        await api.downloadFile(`/projects/${projectId}/files/${remotePath}`, outputPath);
        spinner.succeed(chalk.green(`File downloaded: ${outputPath}`));
      } else {
        // Download directory - get all files
        const files = await api.get(`/projects/${projectId}/files/${remotePath}/list`);
        let downloaded = 0;
        
        for (const file of files) {
          if (file.type === 'file') {
            const localPath = path.join(outputPath, file.path);
            await fs.ensureDir(path.dirname(localPath));
            
            spinner.text = `Downloading ${file.path}... (${downloaded + 1}/${files.length})`;
            
            await api.downloadFile(`/projects/${projectId}/files/${file.path}`, localPath);
            downloaded++;
          }
        }
        
        spinner.succeed(chalk.green(`Downloaded ${downloaded} files to ${outputPath}`));
      }
      
    } catch (error: any) {
      spinner.fail(chalk.red('Download failed'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async list(projectId: string, options: any) {
    const spinner = ora('Fetching file list...').start();
    
    try {
      const files = await api.get(`/projects/${projectId}/files`, {
        path: options.path || '/'
      });
      
      spinner.succeed(chalk.green(`Found ${files.length} items`));
      
      if (files.length === 0) {
        console.log(chalk.yellow('No files found in this directory.'));
        return;
      }
      
      console.log('');
      console.log(chalk.blue.bold(`Files in ${options.path || '/'}:`));
      console.log('');
      
      // Sort: directories first, then files
      const sorted = files.sort((a: any, b: any) => {
        if (a.type === 'directory' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      });
      
      sorted.forEach((file: any) => {
        const icon = file.type === 'directory' ? '📁' : '📄';
        const size = file.type === 'file' && file.size ? ` (${this.formatBytes(file.size)})` : '';
        const modified = file.modifiedAt ? ` - ${new Date(file.modifiedAt).toLocaleDateString()}` : '';
        
        console.log(`${icon} ${chalk.cyan(file.name)}${chalk.gray(size)}${chalk.gray(modified)}`);
      });
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to fetch file list'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async create(projectId: string, filePath: string, options: any) {
    const spinner = ora(`Creating file ${filePath}...`).start();
    
    try {
      const content = options.content || '';
      
      await api.post(`/projects/${projectId}/files`, {
        path: filePath,
        content,
        type: 'file'
      });
      
      spinner.succeed(chalk.green(`File created: ${filePath}`));
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to create file'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  static async delete(projectId: string, filePath: string, options: any) {
    const spinner = ora(`Deleting ${filePath}...`).start();
    
    try {
      await api.delete(`/projects/${projectId}/files/${filePath}`, {
        recursive: options.recursive
      });
      
      spinner.succeed(chalk.green(`Deleted: ${filePath}`));
      
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to delete'));
      console.error(error.response?.data?.message || error.message);
    }
  }

  private static async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stats = await fs.stat(fullPath);
      
      if (stats.isFile()) {
        files.push(fullPath);
      } else if (stats.isDirectory()) {
        const subFiles = await this.getAllFiles(fullPath);
        files.push(...subFiles);
      }
    }
    
    return files;
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}