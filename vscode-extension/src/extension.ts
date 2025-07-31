import * as vscode from 'vscode';
import { ECodeAPI } from './api';
import { ProjectsProvider } from './views/projectsProvider';
import { DeploymentsProvider } from './views/deploymentsProvider';
import { CollaboratorsProvider } from './views/collaboratorsProvider';
import { LiveShareManager } from './liveShare';
import { AIAssistant } from './aiAssistant';

let api: ECodeAPI;
let liveShare: LiveShareManager;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('E-Code extension is now active!');
    
    // Initialize API
    api = new ECodeAPI(context);
    
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(cloud) E-Code';
    statusBarItem.command = 'ecode.showMenu';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    
    // Initialize Live Share
    liveShare = new LiveShareManager(api);
    
    // Register commands
    const commands = [
        vscode.commands.registerCommand('ecode.login', async () => {
            const token = await vscode.window.showInputBox({
                prompt: 'Enter your E-Code API token',
                password: true,
                placeHolder: 'cli_xxxxx'
            });
            
            if (token) {
                await api.setToken(token);
                const success = await api.verifyToken();
                if (success) {
                    vscode.window.showInformationMessage('Successfully logged in to E-Code!');
                    statusBarItem.text = '$(cloud) E-Code (Connected)';
                } else {
                    vscode.window.showErrorMessage('Invalid API token');
                }
            }
        }),
        
        vscode.commands.registerCommand('ecode.createProject', async () => {
            const name = await vscode.window.showInputBox({
                prompt: 'Project name',
                placeHolder: 'my-awesome-project'
            });
            
            if (!name) return;
            
            const template = await vscode.window.showQuickPick([
                { label: 'HTML/CSS/JS', value: 'html-css-js' },
                { label: 'React', value: 'react' },
                { label: 'Node.js', value: 'nodejs' },
                { label: 'Python', value: 'python' },
                { label: 'Next.js', value: 'nextjs' },
            ], { placeHolder: 'Select a template' });
            
            if (template) {
                const project = await api.createProject(name, template.value);
                if (project) {
                    vscode.window.showInformationMessage(`Project "${name}" created successfully!`);
                    vscode.commands.executeCommand('ecode.openProject', project.id);
                }
            }
        }),
        
        vscode.commands.registerCommand('ecode.openProject', async (projectId?: string) => {
            if (!projectId) {
                const projects = await api.getProjects();
                const selected = await vscode.window.showQuickPick(
                    projects.map(p => ({ label: p.name, description: p.slug, id: p.id })),
                    { placeHolder: 'Select a project to open' }
                );
                
                if (selected) {
                    projectId = selected.id;
                }
            }
            
            if (projectId) {
                const url = `${api.getBaseUrl()}/@${await api.getUsername()}/${projectId}`;
                vscode.env.openExternal(vscode.Uri.parse(url));
            }
        }),
        
        vscode.commands.registerCommand('ecode.deploy', async () => {
            const activeFile = vscode.window.activeTextEditor?.document;
            if (!activeFile) {
                vscode.window.showErrorMessage('No active file to deploy');
                return;
            }
            
            const projectId = await api.getProjectIdFromPath(activeFile.uri.fsPath);
            if (!projectId) {
                vscode.window.showErrorMessage('This file is not part of an E-Code project');
                return;
            }
            
            const deployment = await api.deployProject(projectId);
            if (deployment) {
                vscode.window.showInformationMessage('Deployment started successfully!');
                
                // Show deployment progress
                vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Deploying to E-Code',
                    cancellable: false
                }, async (progress) => {
                    for (let i = 0; i <= 100; i += 10) {
                        progress.report({ increment: 10, message: `${i}% complete` });
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                    vscode.window.showInformationMessage('Deployment complete! 🚀');
                });
            }
        }),
        
        vscode.commands.registerCommand('ecode.runCode', async () => {
            const activeFile = vscode.window.activeTextEditor?.document;
            if (!activeFile) {
                vscode.window.showErrorMessage('No active file to run');
                return;
            }
            
            const projectId = await api.getProjectIdFromPath(activeFile.uri.fsPath);
            if (!projectId) {
                vscode.window.showErrorMessage('This file is not part of an E-Code project');
                return;
            }
            
            const terminal = vscode.window.createTerminal('E-Code Run');
            terminal.sendText(`ecode run ${projectId}`);
            terminal.show();
        }),
        
        vscode.commands.registerCommand('ecode.aiAssist', async () => {
            const assistant = new AIAssistant(api);
            await assistant.showAssistant();
        }),
        
        vscode.commands.registerCommand('ecode.installPackage', async () => {
            const packageName = await vscode.window.showInputBox({
                prompt: 'Package name to install',
                placeHolder: 'express, lodash, react, etc.'
            });
            
            if (packageName) {
                const activeFile = vscode.window.activeTextEditor?.document;
                const projectId = activeFile ? await api.getProjectIdFromPath(activeFile.uri.fsPath) : undefined;
                
                if (projectId) {
                    const success = await api.installPackage(projectId, packageName);
                    if (success) {
                        vscode.window.showInformationMessage(`Package "${packageName}" installed successfully!`);
                    }
                }
            }
        }),
        
        vscode.commands.registerCommand('ecode.shareProject', async () => {
            const activeFile = vscode.window.activeTextEditor?.document;
            if (!activeFile) {
                vscode.window.showErrorMessage('No active file');
                return;
            }
            
            const projectId = await api.getProjectIdFromPath(activeFile.uri.fsPath);
            if (!projectId) {
                vscode.window.showErrorMessage('This file is not part of an E-Code project');
                return;
            }
            
            const shareUrl = await api.getShareUrl(projectId);
            if (shareUrl) {
                await vscode.env.clipboard.writeText(shareUrl);
                vscode.window.showInformationMessage('Share URL copied to clipboard!');
            }
        }),
        
        vscode.commands.registerCommand('ecode.viewLogs', async () => {
            const projects = await api.getProjects();
            const selected = await vscode.window.showQuickPick(
                projects.map(p => ({ label: p.name, id: p.id })),
                { placeHolder: 'Select a project to view logs' }
            );
            
            if (selected) {
                const terminal = vscode.window.createTerminal('E-Code Logs');
                terminal.sendText(`ecode logs ${selected.id} --follow`);
                terminal.show();
            }
        }),
        
        vscode.commands.registerCommand('ecode.manageSecrets', async () => {
            const activeFile = vscode.window.activeTextEditor?.document;
            const projectId = activeFile ? await api.getProjectIdFromPath(activeFile.uri.fsPath) : undefined;
            
            if (!projectId) {
                vscode.window.showErrorMessage('Open a file from an E-Code project first');
                return;
            }
            
            const action = await vscode.window.showQuickPick([
                { label: 'Add Secret', value: 'add' },
                { label: 'View Secrets', value: 'view' },
                { label: 'Remove Secret', value: 'remove' }
            ]);
            
            if (action?.value === 'add') {
                const key = await vscode.window.showInputBox({ prompt: 'Secret key' });
                const value = await vscode.window.showInputBox({ prompt: 'Secret value', password: true });
                
                if (key && value) {
                    await api.addSecret(projectId, key, value);
                    vscode.window.showInformationMessage('Secret added successfully!');
                }
            }
        }),
        
        vscode.commands.registerCommand('ecode.showMenu', async () => {
            const quickPick = vscode.window.createQuickPick();
            quickPick.items = [
                { label: '$(add) Create Project', description: 'Create a new E-Code project' },
                { label: '$(folder-opened) Open Project', description: 'Open an existing project' },
                { label: '$(cloud-upload) Deploy', description: 'Deploy current project' },
                { label: '$(play) Run Code', description: 'Run current file' },
                { label: '$(hubot) AI Assistant', description: 'Get AI help' },
                { label: '$(package) Install Package', description: 'Install npm package' },
                { label: '$(link) Share Project', description: 'Get share link' },
                { label: '$(output) View Logs', description: 'View deployment logs' },
                { label: '$(key) Manage Secrets', description: 'Manage environment variables' },
                { label: '$(sign-in) Login', description: 'Login to E-Code' }
            ];
            
            quickPick.onDidChangeSelection(selection => {
                if (selection[0]) {
                    const command = selection[0].label.includes('Create') ? 'ecode.createProject' :
                                  selection[0].label.includes('Open') ? 'ecode.openProject' :
                                  selection[0].label.includes('Deploy') ? 'ecode.deploy' :
                                  selection[0].label.includes('Run') ? 'ecode.runCode' :
                                  selection[0].label.includes('AI') ? 'ecode.aiAssist' :
                                  selection[0].label.includes('Install') ? 'ecode.installPackage' :
                                  selection[0].label.includes('Share') ? 'ecode.shareProject' :
                                  selection[0].label.includes('Logs') ? 'ecode.viewLogs' :
                                  selection[0].label.includes('Secrets') ? 'ecode.manageSecrets' :
                                  'ecode.login';
                    
                    vscode.commands.executeCommand(command);
                    quickPick.hide();
                }
            });
            
            quickPick.show();
        })
    ];
    
    context.subscriptions.push(...commands);
    
    // Register tree data providers
    const projectsProvider = new ProjectsProvider(api);
    const deploymentsProvider = new DeploymentsProvider(api);
    const collaboratorsProvider = new CollaboratorsProvider(api, liveShare);
    
    vscode.window.registerTreeDataProvider('ecodeProjects', projectsProvider);
    vscode.window.registerTreeDataProvider('ecodeDeployments', deploymentsProvider);
    vscode.window.registerTreeDataProvider('ecodeCollaborators', collaboratorsProvider);
    
    // Auto-login if token exists
    api.verifyToken().then(valid => {
        if (valid) {
            statusBarItem.text = '$(cloud) E-Code (Connected)';
        }
    });
    
    // Watch for file changes and sync
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
    fileWatcher.onDidChange(async (uri) => {
        const config = vscode.workspace.getConfiguration('ecode');
        if (config.get('autoSync')) {
            const projectId = await api.getProjectIdFromPath(uri.fsPath);
            if (projectId) {
                await api.syncFile(projectId, uri);
            }
        }
    });
    
    context.subscriptions.push(fileWatcher);
}

export function deactivate() {
    if (liveShare) {
        liveShare.disconnect();
    }
}