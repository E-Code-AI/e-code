import axios, { AxiosInstance, AxiosResponse } from 'axios';
import chalk from 'chalk';
import { Config } from './config';

export class APIClient {
  private client: AxiosInstance;
  private config: Config;

  constructor() {
    this.config = new Config();
    
    this.client = axios.create({
      baseURL: this.config.get('api_url') || 'https://e-code.dev/api',
      timeout: 30000,
      headers: {
        'User-Agent': 'E-Code CLI/1.0.0'
      }
    });

    // Add auth token if available
    const token = this.config.get('auth_token');
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.error(chalk.red('Authentication failed. Please run: e-code auth login'));
          process.exit(1);
        }
        
        if (error.response?.status === 403) {
          console.error(chalk.red('Access denied. Check your permissions.'));
          process.exit(1);
        }

        if (error.code === 'ECONNREFUSED') {
          console.error(chalk.red('Cannot connect to E-Code API. Check your internet connection.'));
          process.exit(1);
        }

        throw error;
      }
    );
  }

  async get<T = any>(path: string, params?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(path, { params });
    return response.data;
  }

  async post<T = any>(path: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(path, data);
    return response.data;
  }

  async put<T = any>(path: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(path, data);
    return response.data;
  }

  async patch<T = any>(path: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(path, data);
    return response.data;
  }

  async delete<T = any>(path: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(path);
    return response.data;
  }

  // Upload file with progress
  async uploadFile(path: string, filePath: string, fileName?: string): Promise<any> {
    const fs = require('fs-extra');
    const FormData = require('formdata-node');
    
    const form = new FormData();
    const fileStream = fs.createReadStream(filePath);
    form.append('file', fileStream, fileName || require('path').basename(filePath));

    const response = await this.client.post(path, form, {
      headers: {
        ...form.headers,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return response.data;
  }

  // Download file
  async downloadFile(path: string, outputPath: string): Promise<void> {
    const fs = require('fs-extra');
    const response = await this.client.get(path, {
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  setAuthToken(token: string) {
    this.config.set('auth_token', token);
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken() {
    this.config.delete('auth_token');
    delete this.client.defaults.headers.common['Authorization'];
  }

  getAuthToken(): string | null {
    return this.config.get('auth_token');
  }
}

export const api = new APIClient();