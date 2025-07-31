import * as vscode from 'vscode';
import { ECodeAPI } from './api';

export class ProjectsProvider implements vscode.TreeDataProvider<ProjectItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | null | void> = new vscode.EventEmitter<ProjectItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private api: ECodeAPI) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProjectItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ProjectItem): Promise<ProjectItem[]> {
        if (!this.api.isAuthenticated()) {
            return [];
        }

        if (element) {
            // Get project files/deployments
            return [];
        } else {
            // Get projects
            try {
                const projects = await this.api.getProjects();
                return projects.map(project => new ProjectItem(
                    project.name,
                    project.description || 'No description',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    project
                ));
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to fetch projects: ${error}`);
                return [];
            }
        }
    }
}

export class ProjectItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly project: any
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
        this.description = project.language || '';
        this.contextValue = 'project';
        
        // Add click command
        this.command = {
            command: 'e-code.openProject',
            title: 'Open Project',
            arguments: [project]
        };
    }

    iconPath = new vscode.ThemeIcon('repo');
}