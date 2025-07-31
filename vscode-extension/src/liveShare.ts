import * as vscode from 'vscode';
import WebSocket from 'ws';
import { ECodeAPI } from './api';

interface Collaborator {
    id: string;
    name: string;
    status: 'active' | 'idle' | 'offline';
    currentFile?: string;
    cursorPosition?: vscode.Position;
    color: string;
}

export class LiveShareManager {
    private ws?: WebSocket;
    private collaborators: Map<string, Collaborator> = new Map();
    private decorations: Map<string, vscode.TextEditorDecorationType> = new Map();
    private _onCollaboratorsChanged: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onCollaboratorsChanged: vscode.Event<void> = this._onCollaboratorsChanged.event;

    constructor(private api: ECodeAPI) {}

    async connect(projectId: string) {
        const baseUrl = this.api.getBaseUrl().replace('https://', 'wss://').replace('http://', 'ws://');
        this.ws = new WebSocket(`${baseUrl}/ws/collaboration?projectId=${projectId}`);
        
        this.ws.on('open', () => {
            console.log('Connected to E-Code live share');
            this.sendPresence();
        });
        
        this.ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
        });
        
        this.ws.on('close', () => {
            console.log('Disconnected from E-Code live share');
            this.clearAllCollaborators();
        });
        
        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
        
        // Send cursor updates
        vscode.window.onDidChangeTextEditorSelection((event) => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'cursor',
                    file: vscode.workspace.asRelativePath(event.textEditor.document.uri),
                    position: {
                        line: event.selections[0].active.line,
                        character: event.selections[0].active.character
                    }
                }));
            }
        });
        
        // Send file change updates
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'file_change',
                    file: vscode.workspace.asRelativePath(editor.document.uri)
                }));
            }
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
        this.clearAllCollaborators();
    }

    private sendPresence() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'presence',
                status: 'active'
            }));
        }
    }

    private handleMessage(message: any) {
        switch (message.type) {
            case 'collaborator_joined':
                this.addCollaborator(message.collaborator);
                break;
            case 'collaborator_left':
                this.removeCollaborator(message.collaboratorId);
                break;
            case 'cursor_update':
                this.updateCollaboratorCursor(message.collaboratorId, message.file, message.position);
                break;
            case 'file_change':
                this.updateCollaboratorFile(message.collaboratorId, message.file);
                break;
            case 'collaborators_list':
                this.setCollaborators(message.collaborators);
                break;
        }
    }

    private addCollaborator(collaborator: Collaborator) {
        this.collaborators.set(collaborator.id, collaborator);
        
        // Create decoration for this collaborator
        const decoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: collaborator.color + '20',
            border: `2px solid ${collaborator.color}`,
            borderRadius: '2px',
            after: {
                content: collaborator.name,
                backgroundColor: collaborator.color,
                color: 'white',
                fontStyle: 'normal',
                fontWeight: 'bold',
                margin: '0 0 0 10px',
                padding: '2px 4px',
                borderRadius: '2px'
            }
        });
        
        this.decorations.set(collaborator.id, decoration);
        this._onCollaboratorsChanged.fire();
    }

    private removeCollaborator(collaboratorId: string) {
        this.collaborators.delete(collaboratorId);
        
        const decoration = this.decorations.get(collaboratorId);
        if (decoration) {
            decoration.dispose();
            this.decorations.delete(collaboratorId);
        }
        
        this._onCollaboratorsChanged.fire();
    }

    private updateCollaboratorCursor(collaboratorId: string, file: string, position: vscode.Position) {
        const collaborator = this.collaborators.get(collaboratorId);
        if (collaborator) {
            collaborator.currentFile = file;
            collaborator.cursorPosition = position;
            
            // Update decoration
            this.updateCursorDecoration(collaboratorId, file, position);
        }
    }

    private updateCollaboratorFile(collaboratorId: string, file: string) {
        const collaborator = this.collaborators.get(collaboratorId);
        if (collaborator) {
            collaborator.currentFile = file;
            collaborator.status = 'active';
            this._onCollaboratorsChanged.fire();
        }
    }

    private setCollaborators(collaborators: Collaborator[]) {
        this.clearAllCollaborators();
        collaborators.forEach(collab => this.addCollaborator(collab));
    }

    private clearAllCollaborators() {
        this.decorations.forEach(decoration => decoration.dispose());
        this.decorations.clear();
        this.collaborators.clear();
        this._onCollaboratorsChanged.fire();
    }

    private updateCursorDecoration(collaboratorId: string, file: string, position: vscode.Position) {
        const decoration = this.decorations.get(collaboratorId);
        if (!decoration) return;
        
        // Find the editor for this file
        const editor = vscode.window.visibleTextEditors.find(e => 
            vscode.workspace.asRelativePath(e.document.uri) === file
        );
        
        if (editor) {
            const range = new vscode.Range(position, position);
            editor.setDecorations(decoration, [range]);
        }
    }

    getActiveCollaborators(): Collaborator[] {
        return Array.from(this.collaborators.values());
    }
}