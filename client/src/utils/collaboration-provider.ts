import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import * as monaco from 'monaco-editor';

export class CollaborationProvider {
  private doc: Y.Doc;
  private provider: WebsocketProvider;
  private binding: MonacoBinding | null = null;
  private awareness: any;

  constructor(
    roomName: string,
    userInfo: { userId: number; username: string; color: string }
  ) {
    this.doc = new Y.Doc();
    
    // Get WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/collaboration`;
    
    // Create WebSocket provider with authentication info
    this.provider = new WebsocketProvider(wsUrl, roomName, this.doc, {
      params: {
        userId: userInfo.userId.toString(),
        username: userInfo.username
      }
    });
    
    this.awareness = this.provider.awareness;
    
    // Set local user info in awareness
    this.awareness.setLocalStateField('user', {
      userId: userInfo.userId,
      username: userInfo.username,
      color: userInfo.color
    });
  }

  public bindMonaco(
    editor: monaco.editor.IStandaloneCodeEditor,
    model: monaco.editor.ITextModel
  ): MonacoBinding {
    // Get the Yjs text type
    const ytext = this.doc.getText('monaco');
    
    // Create Monaco binding for collaborative editing
    this.binding = new MonacoBinding(
      ytext,
      model,
      new Set([editor]),
      this.awareness
    );
    
    return this.binding;
  }

  public getAwareness() {
    return this.awareness;
  }

  public getDoc() {
    return this.doc;
  }

  public getProvider() {
    return this.provider;
  }

  public destroy() {
    if (this.binding) {
      this.binding.destroy();
    }
    this.provider.destroy();
    this.doc.destroy();
  }

  public onUsersChange(callback: (users: any[]) => void) {
    const updateUsers = () => {
      const states = this.awareness.getStates();
      const users: any[] = [];
      
      states.forEach((state: any, clientId: number) => {
        if (state.user && clientId !== this.awareness.clientID) {
          users.push({
            clientId,
            ...state.user,
            cursor: state.cursor
          });
        }
      });
      
      callback(users);
    };
    
    this.awareness.on('change', updateUsers);
    updateUsers(); // Initial update
    
    return () => {
      this.awareness.off('change', updateUsers);
    };
  }

  public sendCursorUpdate(position: monaco.Position, selection?: monaco.Selection) {
    this.awareness.setLocalStateField('cursor', {
      position: {
        lineNumber: position.lineNumber,
        column: position.column
      },
      selection: selection ? {
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn
      } : null
    });
  }
}