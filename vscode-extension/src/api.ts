import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

export class ECodeAPI {
    private client: AxiosInstance;
    private context: vscode.ExtensionContext;
    private authToken: string | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        
        const config = vscode.workspace.getConfiguration('e-code');
        const apiUrl = config.get<string>('apiUrl') || 'https://e-code.dev/api';
        
        this.client = axios.create({
            baseURL: apiUrl,
            timeout: 30000
        });

        // Load saved auth token
        this.authToken = context.globalState.get('authToken') || null;
        if (this.authToken) {
            this.setAuthHeader();
        }
    }

    private setAuthHeader() {
        if (this.authToken) {
            this.client.defaults.headers.common['Authorization'] = `Bearer ${this.authToken}`;
        }
    }

    async login(token: string): Promise<boolean> {
        try {
            // Test the token
            this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            await this.client.get('/user');
            
            // Save token if successful
            this.authToken = token;
            await this.context.globalState.update('authToken', token);
            return true;
        } catch (error) {
            delete this.client.defaults.headers.common['Authorization'];
            return false;
        }
    }

    async logout(): Promise<void> {
        this.authToken = null;
        await this.context.globalState.update('authToken', null);
        delete this.client.defaults.headers.common['Authorization'];
    }

    isAuthenticated(): boolean {
        return !!this.authToken;
    }

    async getUser(): Promise<any> {
        const response = await this.client.get('/user');
        return response.data;
    }

    async getProjects(): Promise<any[]> {
        const response = await this.client.get('/projects');
        return response.data;
    }

    async getProject(id: string): Promise<any> {
        const response = await this.client.get(`/projects/${id}`);
        return response.data;
    }

    async createProject(data: any): Promise<any> {
        const response = await this.client.post('/projects', data);
        return response.data;
    }

    async updateProject(id: string, data: any): Promise<any> {
        const response = await this.client.patch(`/projects/${id}`, data);
        return response.data;
    }

    async deleteProject(id: string): Promise<void> {
        await this.client.delete(`/projects/${id}`);
    }

    async getProjectFiles(id: string, path: string = '/'): Promise<any[]> {
        const response = await this.client.get(`/projects/${id}/files`, {
            params: { path }
        });
        return response.data;
    }

    async getFileContent(projectId: string, filePath: string): Promise<string> {
        const response = await this.client.get(`/projects/${projectId}/files/${filePath}`);
        return response.data.content;
    }

    async updateFile(projectId: string, filePath: string, content: string): Promise<void> {
        await this.client.patch(`/projects/${projectId}/files/${filePath}`, {
            content
        });
    }

    async createFile(projectId: string, filePath: string, content: string): Promise<void> {
        await this.client.post(`/projects/${projectId}/files`, {
            path: filePath,
            content,
            type: 'file'
        });
    }

    async deleteFile(projectId: string, filePath: string): Promise<void> {
        await this.client.delete(`/projects/${projectId}/files/${filePath}`);
    }

    async createDeployment(projectId: string, data: any): Promise<any> {
        const response = await this.client.post(`/projects/${projectId}/deployments`, data);
        return response.data;
    }

    async getDeployments(projectId: string): Promise<any[]> {
        const response = await this.client.get(`/projects/${projectId}/deployments`);
        return response.data;
    }

    async chatWithAI(projectId: string, message: string): Promise<any> {
        const response = await this.client.post(`/projects/${projectId}/ai/chat`, {
            message,
            mode: 'assistant'
        });
        return response.data;
    }

    async getSecrets(projectId: string): Promise<any[]> {
        const response = await this.client.get(`/projects/${projectId}/secrets`);
        return response.data;
    }

    async setSecret(projectId: string, key: string, value: string): Promise<void> {
        await this.client.post(`/projects/${projectId}/secrets`, {
            key,
            value
        });
    }

    async deleteSecret(projectId: string, key: string): Promise<void> {
        await this.client.delete(`/projects/${projectId}/secrets/${key}`);
    }
}