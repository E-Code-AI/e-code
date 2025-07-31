import * as vscode from 'vscode';
import * as path from 'path';
import { ECodeAPI } from './api';

export class SyncManager {
    constructor(private api: ECodeAPI) {}

    async syncWorkspace(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
        if (!this.api.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        const projectId = await this.getOrCreateProjectForWorkspace(workspaceFolder);
        
        // Get all files from workspace
        const files = await this.getAllWorkspaceFiles(workspaceFolder);
        
        // Upload files to E-Code
        const uploadPromises = files.map(async (file) => {
            const relativePath = path.relative(workspaceFolder.uri.fsPath, file.fsPath);
            const content = await vscode.workspace.fs.readFile(file);
            const contentString = Buffer.from(content).toString('utf8');
            
            try {
                await this.api.updateFile(projectId, relativePath, contentString);
            } catch (error) {
                // If file doesn't exist, create it
                await this.api.createFile(projectId, relativePath, contentString);
            }
        });

        await Promise.all(uploadPromises);
        
        // Save project configuration
        await this.saveProjectConfig(workspaceFolder, projectId);
    }

    private async getOrCreateProjectForWorkspace(workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
        // Check if project config exists
        const projectConfigPath = vscode.Uri.joinPath(workspaceFolder.uri, '.e-code', 'project.json');
        
        try {
            const configData = await vscode.workspace.fs.readFile(projectConfigPath);
            const config = JSON.parse(configData.toString());
            return config.projectId;
        } catch {
            // Create new project
            const projectName = path.basename(workspaceFolder.uri.fsPath);
            const project = await this.api.createProject({
                name: projectName,
                description: `Synced from VS Code workspace: ${projectName}`,
                isPublic: false
            });
            
            await this.saveProjectConfig(workspaceFolder, project.id);
            return project.id;
        }
    }

    private async saveProjectConfig(workspaceFolder: vscode.WorkspaceFolder, projectId: string): Promise<void> {
        const configDir = vscode.Uri.joinPath(workspaceFolder.uri, '.e-code');
        const configPath = vscode.Uri.joinPath(configDir, 'project.json');
        
        const config = {
            projectId,
            syncedAt: new Date().toISOString()
        };
        
        // Ensure directory exists
        try {
            await vscode.workspace.fs.createDirectory(configDir);
        } catch {
            // Directory might already exist
        }
        
        await vscode.workspace.fs.writeFile(configPath, Buffer.from(JSON.stringify(config, null, 2)));
    }

    private async getAllWorkspaceFiles(workspaceFolder: vscode.WorkspaceFolder): Promise<vscode.Uri[]> {
        const files: vscode.Uri[] = [];
        
        const findFiles = async (dir: vscode.Uri) => {
            const entries = await vscode.workspace.fs.readDirectory(dir);
            
            for (const [name, type] of entries) {
                if (name.startsWith('.') && name !== '.e-code') {
                    continue; // Skip hidden files except our config
                }
                
                if (name === 'node_modules' || name === 'dist' || name === 'build') {
                    continue; // Skip common build directories
                }
                
                const entryUri = vscode.Uri.joinPath(dir, name);
                
                if (type === vscode.FileType.File) {
                    // Only include text files
                    if (this.isTextFile(name)) {
                        files.push(entryUri);
                    }
                } else if (type === vscode.FileType.Directory) {
                    await findFiles(entryUri);
                }
            }
        };
        
        await findFiles(workspaceFolder.uri);
        return files;
    }

    private isTextFile(fileName: string): boolean {
        const textExtensions = [
            '.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.scss', '.sass',
            '.py', '.java', '.cpp', '.c', '.h', '.cs', '.go', '.rs', '.php', '.rb',
            '.swift', '.kt', '.sql', '.sh', '.bash', '.yml', '.yaml', '.xml', '.md',
            '.txt', '.env', '.gitignore', '.dockerignore', '.dockerfile'
        ];
        
        const ext = path.extname(fileName).toLowerCase();
        return textExtensions.includes(ext) || !ext; // Include files without extension
    }
}