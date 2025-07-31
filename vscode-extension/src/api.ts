import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

export class ECodeAPI {
    private client: AxiosInstance;
    private context: vscode.ExtensionContext;
    private token?: string;
    private username?: string;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.token = context.globalState.get('ecode.token');
        
        const config = vscode.workspace.getConfiguration('ecode');
        const baseURL = config.get<string>('apiUrl') || 'https://e-code.app';
        
        this.client = axios.create({
            baseURL: baseURL + '/api',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Add token to requests if available
        this.client.interceptors.request.use(config => {
            if (this.token) {
                config.headers.Authorization = `Bearer ${this.token}`;
            }
            return config;
        });
    }

    async setToken(token: string) {
        this.token = token;
        await this.context.globalState.update('ecode.token', token);
    }

    async verifyToken(): Promise<boolean> {
        if (!this.token) return false;
        
        try {
            const response = await this.client.get('/user');
            this.username = response.data.username;
            return true;
        } catch (error) {
            return false;
        }
    }

    async getUsername(): Promise<string> {
        if (!this.username) {
            await this.verifyToken();
        }
        return this.username || 'user';
    }

    getBaseUrl(): string {
        const config = vscode.workspace.getConfiguration('ecode');
        return config.get<string>('apiUrl') || 'https://e-code.app';
    }

    async getProjects() {
        const response = await this.client.get('/projects');
        return response.data;
    }

    async createProject(name: string, template: string) {
        try {
            const response = await this.client.post('/projects', {
                name,
                template,
                visibility: 'private'
            });
            return response.data;
        } catch (error) {
            vscode.window.showErrorMessage('Failed to create project');
            return null;
        }
    }

    async getProjectIdFromPath(filePath: string): Promise<string | undefined> {
        // In a real implementation, this would map local files to E-Code projects
        // For now, we'll store this mapping in workspace state
        const projectMappings = this.context.workspaceState.get<Record<string, string>>('projectMappings', {});
        
        for (const [projectId, projectPath] of Object.entries(projectMappings)) {
            if (filePath.startsWith(projectPath)) {
                return projectId;
            }
        }
        
        return undefined;
    }

    async deployProject(projectId: string) {
        try {
            const response = await this.client.post(`/projects/${projectId}/deploy`);
            return response.data;
        } catch (error) {
            vscode.window.showErrorMessage('Failed to deploy project');
            return null;
        }
    }

    async installPackage(projectId: string, packageName: string) {
        try {
            await this.client.post(`/projects/${projectId}/packages`, {
                dependencies: [packageName]
            });
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to install package: ${packageName}`);
            return false;
        }
    }

    async getShareUrl(projectId: string): Promise<string | undefined> {
        const username = await this.getUsername();
        const project = await this.client.get(`/projects/${projectId}`);
        return `${this.getBaseUrl()}/@${username}/${project.data.name}`;
    }

    async addSecret(projectId: string, key: string, value: string) {
        try {
            await this.client.post(`/projects/${projectId}/secrets`, {
                key,
                value
            });
            return true;
        } catch (error) {
            vscode.window.showErrorMessage('Failed to add secret');
            return false;
        }
    }

    async syncFile(projectId: string, uri: vscode.Uri) {
        try {
            const content = await vscode.workspace.fs.readFile(uri);
            const relativePath = vscode.workspace.asRelativePath(uri);
            
            await this.client.patch(`/projects/${projectId}/files`, {
                path: relativePath,
                content: content.toString()
            });
            
            return true;
        } catch (error) {
            console.error('Failed to sync file:', error);
            return false;
        }
    }

    async getDeployments() {
        try {
            const response = await this.client.get('/deployments');
            return response.data;
        } catch (error) {
            return [];
        }
    }

    async getCollaborators(projectId: string) {
        try {
            const response = await this.client.get(`/projects/${projectId}/collaborators`);
            return response.data;
        } catch (error) {
            return [];
        }
    }
}