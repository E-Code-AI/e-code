import * as vscode from 'vscode';
import { ECodeAPI } from '../api';
import { LiveShareManager } from '../liveShare';

export class CollaboratorsProvider implements vscode.TreeDataProvider<CollaboratorItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CollaboratorItem | undefined | null | void> = new vscode.EventEmitter<CollaboratorItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CollaboratorItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    private activeProjectId?: string;

    constructor(
        private api: ECodeAPI,
        private liveShare: LiveShareManager
    ) {
        // Listen for live share updates
        liveShare.onCollaboratorsChanged(() => {
            this.refresh();
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setActiveProject(projectId: string) {
        this.activeProjectId = projectId;
        this.refresh();
    }

    getTreeItem(element: CollaboratorItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: CollaboratorItem): Promise<CollaboratorItem[]> {
        if (!element && this.activeProjectId) {
            const collaborators = this.liveShare.getActiveCollaborators();
            
            return collaborators.map(collab => new CollaboratorItem(
                collab.name,
                collab.id,
                collab.status,
                collab.currentFile
            ));
        }
        return [];
    }
}

class CollaboratorItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly userId: string,
        public readonly status: 'active' | 'idle' | 'offline',
        public readonly currentFile?: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        
        this.tooltip = this.currentFile ? `Editing: ${this.currentFile}` : `Status: ${this.status}`;
        this.contextValue = 'collaborator';
        
        // Set icon based on status
        if (this.status === 'active') {
            this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('terminal.ansiGreen'));
        } else if (this.status === 'idle') {
            this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('terminal.ansiYellow'));
        } else {
            this.iconPath = new vscode.ThemeIcon('circle-outline');
        }
        
        // Add description showing current file
        if (this.currentFile) {
            this.description = this.currentFile;
        }
    }
}