import * as vscode from 'vscode';
import { ECodeAPI } from '../api';

export class DeploymentsProvider implements vscode.TreeDataProvider<DeploymentItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DeploymentItem | undefined | null | void> = new vscode.EventEmitter<DeploymentItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DeploymentItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private api: ECodeAPI) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DeploymentItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DeploymentItem): Promise<DeploymentItem[]> {
        if (!element) {
            try {
                const deployments = await this.api.getDeployments();
                return deployments.map((deployment: any) => new DeploymentItem(
                    deployment.projectName || 'Unknown Project',
                    deployment.id,
                    deployment.status,
                    deployment.url
                ));
            } catch (error) {
                return [];
            }
        }
        return [];
    }
}

class DeploymentItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly deploymentId: string,
        public readonly status: string,
        public readonly url?: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        
        this.tooltip = `Status: ${this.status}${this.url ? '\nURL: ' + this.url : ''}`;
        this.contextValue = 'deployment';
        
        // Set icon based on status
        if (this.status === 'running') {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        } else if (this.status === 'failed') {
            this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
        } else {
            this.iconPath = new vscode.ThemeIcon('sync~spin');
        }
        
        if (this.url) {
            this.command = {
                command: 'vscode.open',
                title: 'Open Deployment',
                arguments: [vscode.Uri.parse(this.url)]
            };
        }
    }
}