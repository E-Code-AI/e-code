import * as vscode from 'vscode';
import { ECodeAPI } from '../api';

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
        if (!element) {
            try {
                const projects = await this.api.getProjects();
                return projects.map((project: any) => new ProjectItem(
                    project.name,
                    project.id,
                    project.language || 'javascript',
                    vscode.TreeItemCollapsibleState.None
                ));
            } catch (error) {
                return [];
            }
        }
        return [];
    }
}

class ProjectItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly projectId: string,
        public readonly language: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} (${this.language})`;
        this.contextValue = 'project';
        this.iconPath = new vscode.ThemeIcon('folder');
        
        this.command = {
            command: 'ecode.openProject',
            title: 'Open Project',
            arguments: [this.projectId]
        };
    }
}