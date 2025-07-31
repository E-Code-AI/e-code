import * as vscode from 'vscode';
import { ECodeAPI } from './api';

export class AuthProvider implements vscode.TreeDataProvider<AuthItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AuthItem | undefined | null | void> = new vscode.EventEmitter<AuthItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AuthItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private api: ECodeAPI) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AuthItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: AuthItem): Promise<AuthItem[]> {
        if (this.api.isAuthenticated()) {
            return [];
        }

        return [
            new AuthItem('Login to E-Code', 'Click to authenticate with E-Code', 'login'),
            new AuthItem('Get API Token', 'Get your API token from E-Code', 'token')
        ];
    }
}

export class AuthItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly type: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.tooltip = tooltip;
        this.contextValue = type;
        
        if (type === 'login') {
            this.command = {
                command: 'e-code.login',
                title: 'Login',
                arguments: []
            };
            this.iconPath = new vscode.ThemeIcon('sign-in');
        } else if (type === 'token') {
            this.command = {
                command: 'vscode.open',
                title: 'Get Token',
                arguments: [vscode.Uri.parse('https://e-code.dev/account/tokens')]
            };
            this.iconPath = new vscode.ThemeIcon('key');
        }
    }
}