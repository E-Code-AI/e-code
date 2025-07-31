import * as vscode from 'vscode';
import { ECodeAPI } from './api';
import { ProjectsProvider } from './projectsProvider';
import { AuthProvider } from './authProvider';
import { SyncManager } from './syncManager';

let api: ECodeAPI;
let projectsProvider: ProjectsProvider;
let authProvider: AuthProvider;
let syncManager: SyncManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('E-Code extension is now active!');

    // Initialize API client
    api = new ECodeAPI(context);
    
    // Initialize providers
    projectsProvider = new ProjectsProvider(api);
    authProvider = new AuthProvider(api);
    syncManager = new SyncManager(api);

    // Register tree data providers
    vscode.window.registerTreeDataProvider('e-code-projects', projectsProvider);
    vscode.window.registerTreeDataProvider('e-code-auth', authProvider);

    // Register commands
    const commands = [
        vscode.commands.registerCommand('e-code.login', () => login()),
        vscode.commands.registerCommand('e-code.logout', () => logout()),
        vscode.commands.registerCommand('e-code.sync', () => syncProject()),
        vscode.commands.registerCommand('e-code.deploy', () => deployProject()),
        vscode.commands.registerCommand('e-code.openInECode', (uri) => openInECode(uri)),
        vscode.commands.registerCommand('e-code.aiChat', () => openAIChat()),
        vscode.commands.registerCommand('e-code.refreshProjects', () => projectsProvider.refresh()),
        vscode.commands.registerCommand('e-code.openProject', (project) => openProject(project)),
        vscode.commands.registerCommand('e-code.createProject', () => createProject())
    ];

    // Register all commands
    commands.forEach(command => context.subscriptions.push(command));

    // Setup auto-sync if enabled
    setupAutoSync();

    // Update authentication context
    updateAuthContext();
}

async function login() {
    try {
        const token = await vscode.window.showInputBox({
            prompt: 'Enter your E-Code API token',
            password: true,
            placeHolder: 'API Token from https://e-code.dev/account/tokens'
        });

        if (!token) {
            return;
        }

        const success = await api.login(token);
        
        if (success) {
            vscode.window.showInformationMessage('Successfully logged in to E-Code!');
            updateAuthContext();
            projectsProvider.refresh();
        } else {
            vscode.window.showErrorMessage('Failed to login to E-Code. Please check your token.');
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(`Login failed: ${error.message}`);
    }
}

async function logout() {
    await api.logout();
    vscode.window.showInformationMessage('Logged out from E-Code');
    updateAuthContext();
    projectsProvider.refresh();
}

async function syncProject() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder opened');
        return;
    }

    try {
        await syncManager.syncWorkspace(workspaceFolder);
        vscode.window.showInformationMessage('Project synced successfully!');
    } catch (error: any) {
        vscode.window.showErrorMessage(`Sync failed: ${error.message}`);
    }
}

async function deployProject() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder opened');
        return;
    }

    try {
        const projectId = await getProjectIdForWorkspace(workspaceFolder);
        if (!projectId) {
            vscode.window.showErrorMessage('This workspace is not linked to an E-Code project');
            return;
        }

        const deployment = await api.createDeployment(projectId, {
            type: 'static'
        });

        vscode.window.showInformationMessage(`Deployment created! URL: ${deployment.url}`);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Deployment failed: ${error.message}`);
    }
}

async function openInECode(uri?: vscode.Uri) {
    const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
    
    if (!targetUri) {
        vscode.window.showErrorMessage('No file selected');
        return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(targetUri);
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('File is not in a workspace');
        return;
    }

    try {
        const projectId = await getProjectIdForWorkspace(workspaceFolder);
        if (!projectId) {
            vscode.window.showErrorMessage('This workspace is not linked to an E-Code project');
            return;
        }

        const project = await api.getProject(projectId);
        const url = `https://e-code.dev/@${project.owner?.username}/${project.slug}`;
        
        vscode.env.openExternal(vscode.Uri.parse(url));
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to open in E-Code: ${error.message}`);
    }
}

async function openAIChat() {
    const panel = vscode.window.createWebviewPanel(
        'eCodeAI',
        'E-Code AI Chat',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    let projectId: string | null = null;
    
    if (workspaceFolder) {
        projectId = await getProjectIdForWorkspace(workspaceFolder);
    }

    panel.webview.html = getAIChatHTML();

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.command) {
            case 'sendMessage':
                if (projectId) {
                    try {
                        const response = await api.chatWithAI(projectId, message.text);
                        panel.webview.postMessage({
                            command: 'aiResponse',
                            response: response.response
                        });
                    } catch (error: any) {
                        panel.webview.postMessage({
                            command: 'error',
                            error: error.message
                        });
                    }
                } else {
                    panel.webview.postMessage({
                        command: 'error',
                        error: 'No E-Code project linked to this workspace'
                    });
                }
                break;
        }
    });
}

async function openProject(project: any) {
    const url = `https://e-code.dev/@${project.owner?.username}/${project.slug}`;
    vscode.env.openExternal(vscode.Uri.parse(url));
}

async function createProject() {
    const name = await vscode.window.showInputBox({
        prompt: 'Enter project name',
        placeHolder: 'my-awesome-project'
    });

    if (!name) {
        return;
    }

    try {
        const project = await api.createProject({
            name,
            description: 'Created from VS Code',
            isPublic: false
        });

        vscode.window.showInformationMessage(`Project "${name}" created successfully!`);
        projectsProvider.refresh();

        // Optionally open the project
        const open = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: 'Open project in E-Code?'
        });

        if (open === 'Yes') {
            openProject(project);
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to create project: ${error.message}`);
    }
}

async function getProjectIdForWorkspace(workspaceFolder: vscode.WorkspaceFolder): Promise<string | null> {
    // Check for .e-code/project.json file
    const projectConfigPath = vscode.Uri.joinPath(workspaceFolder.uri, '.e-code', 'project.json');
    
    try {
        const configData = await vscode.workspace.fs.readFile(projectConfigPath);
        const config = JSON.parse(configData.toString());
        return config.projectId;
    } catch {
        return null;
    }
}

function setupAutoSync() {
    const config = vscode.workspace.getConfiguration('e-code');
    const autoSync = config.get<boolean>('autoSync');
    const interval = config.get<number>('syncInterval') || 30;

    if (autoSync) {
        setInterval(async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder && api.isAuthenticated()) {
                try {
                    await syncManager.syncWorkspace(workspaceFolder);
                } catch (error) {
                    // Silent fail for auto-sync
                }
            }
        }, interval * 1000);
    }
}

function updateAuthContext() {
    vscode.commands.executeCommand('setContext', 'e-code:authenticated', api.isAuthenticated());
}

function getAIChatHTML(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>E-Code AI Chat</title>
        <style>
            body {
                font-family: var(--vscode-font-family);
                background-color: var(--vscode-editor-background);
                color: var(--vscode-editor-foreground);
                margin: 0;
                padding: 20px;
                height: 100vh;
                display: flex;
                flex-direction: column;
            }
            
            #messages {
                flex: 1;
                overflow-y: auto;
                margin-bottom: 20px;
                padding: 10px;
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
            }
            
            .message {
                margin-bottom: 15px;
                padding: 10px;
                border-radius: 4px;
            }
            
            .user-message {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                text-align: right;
            }
            
            .ai-message {
                background-color: var(--vscode-input-background);
                border: 1px solid var(--vscode-input-border);
            }
            
            .input-container {
                display: flex;
                gap: 10px;
            }
            
            #messageInput {
                flex: 1;
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
                padding: 8px;
                border-radius: 4px;
            }
            
            #sendButton {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
            }
            
            #sendButton:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
        </style>
    </head>
    <body>
        <div id="messages"></div>
        <div class="input-container">
            <input type="text" id="messageInput" placeholder="Ask E-Code AI anything...">
            <button id="sendButton">Send</button>
        </div>
        
        <script>
            const vscode = acquireVsCodeApi();
            const messagesDiv = document.getElementById('messages');
            const messageInput = document.getElementById('messageInput');
            const sendButton = document.getElementById('sendButton');
            
            function addMessage(text, isUser = false) {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message ' + (isUser ? 'user-message' : 'ai-message');
                messageDiv.textContent = text;
                messagesDiv.appendChild(messageDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            
            function sendMessage() {
                const text = messageInput.value.trim();
                if (text) {
                    addMessage(text, true);
                    vscode.postMessage({
                        command: 'sendMessage',
                        text: text
                    });
                    messageInput.value = '';
                }
            }
            
            sendButton.addEventListener('click', sendMessage);
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
            
            // Handle messages from extension
            window.addEventListener('message', (event) => {
                const message = event.data;
                switch (message.command) {
                    case 'aiResponse':
                        addMessage(message.response);
                        break;
                    case 'error':
                        addMessage('Error: ' + message.error);
                        break;
                }
            });
            
            addMessage('Welcome to E-Code AI! Ask me anything about your code.');
        </script>
    </body>
    </html>`;
}

export function deactivate() {}