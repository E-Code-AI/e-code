import { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { EditorView } from '@codemirror/view';
import { WebsocketProvider } from 'y-websocket';
import { 
  createCollaborationExtension,
  disconnectCollaboration,
  onCollaboratorsChange,
  userColors,
  type Collaborator,
} from '@/lib/cm6/collaboration-adapter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

interface Participant {
  user: {
    id: string;
    username: string;
    color: string;
  };
  cursor?: {
    line: number;
    column: number;
  };
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

interface CollaborativeProviderProps {
  projectId: string;
  fileId: number;
  editor: EditorView | null;
  enabled?: boolean;
  onParticipantsChange?: (participants: Participant[]) => void;
  children?: React.ReactNode;
}

interface CollaborativeContextValue {
  isConnected: boolean;
  participants: Participant[];
  sessionId: string | null;
  userColor: string | null;
  shareLink: string | null;
  generateShareLink: () => Promise<string>;
  followUser: (userId: string) => void;
  getCollaborationExtensions: () => ReturnType<typeof createCollaborationExtension> | null;
}

const CollaborativeContext = createContext<CollaborativeContextValue | null>(null);

export const useCollaboration = () => {
  const context = useContext(CollaborativeContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborativeProvider');
  }
  return context;
};

export function CollaborativeProvider({
  projectId,
  fileId,
  editor,
  enabled = true,
  onParticipantsChange,
  children,
}: CollaborativeProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userColor, setUserColor] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const collaborationExtensionsRef = useRef<ReturnType<typeof createCollaborationExtension> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const cleanupAwarenessRef = useRef<(() => void) | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  const convertCollaboratorToParticipant = useCallback((collaborator: Collaborator): Participant => {
    return {
      user: {
        id: collaborator.userId,
        username: collaborator.name,
        color: collaborator.color,
      },
      cursor: collaborator.cursor ? {
        line: 0,
        column: collaborator.cursor.anchor,
      } : undefined,
    };
  }, []);

  const initializeYjs = useCallback(() => {
    if (!editor || collaborationExtensionsRef.current || !ydocRef.current || !awarenessRef.current) return;

    const ydoc = ydocRef.current;
    const awareness = awarenessRef.current;

    const userId = localStorage.getItem('userId') || `user-${Date.now()}`;
    const userName = localStorage.getItem('userName') || 'Anonymous';
    const color = userColor || userColors[Math.floor(Math.random() * userColors.length)];

    const extensions = createCollaborationExtension({
      doc: ydoc,
      provider: providerRef.current,
      userId,
      userName,
      userColor: color,
      awareness,
      textField: 'content',
    });

    collaborationExtensionsRef.current = extensions;

    cleanupAwarenessRef.current = onCollaboratorsChange(awareness, (collaborators) => {
      const newParticipants = collaborators.map(convertCollaboratorToParticipant);
      setParticipants(newParticipants);
    });

  }, [editor, userColor, convertCollaboratorToParticipant]);

  useEffect(() => {
    if (!enabled || !editor) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const collaborationDoc = new Y.Doc();
    const currentUserId = String(user?.id || localStorage.getItem('userId') || `user-${Date.now()}`);
    const currentUserName = user?.username || localStorage.getItem('userName') || 'Anonymous';
    const color = userColor || userColors[Math.floor(Math.random() * userColors.length)];

    const provider = new WebsocketProvider(
      `${protocol}//${window.location.host}/ws/yjs`,
      `project-${projectId}-file-${fileId}`,
      collaborationDoc,
      {
        params: {
          projectId,
          userId: currentUserId,
        },
        maxBackoffTime: 5000,
      }
    );

    providerRef.current = provider;
    ydocRef.current = collaborationDoc;
    awarenessRef.current = provider.awareness;
    setSessionId(`project-${projectId}-file-${fileId}`);
    setUserColor(color);
    initializeYjs();

    const handleStatus = (event: { status: string }) => {
      const connected = event.status === 'connected';
      setIsConnected(connected);

      if (!connected && reconnectAttemptsRef.current >= 5) {
        toast({
          title: 'Connection lost',
          description: 'Unable to reconnect to collaboration server',
          variant: 'destructive',
        });
      }
    };

    provider.on('status', handleStatus);
    provider.awareness.setLocalStateField('user', {
      userId: currentUserId,
      name: currentUserName,
      color,
      colorLight: `${color}33`,
    });

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      provider.off('status', handleStatus);
      provider.destroy();
      providerRef.current = null;
      if (cleanupAwarenessRef.current) {
        cleanupAwarenessRef.current();
      }
      disconnectCollaboration();
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
      awarenessRef.current = null;
      collaborationExtensionsRef.current = null;
    };
  }, [enabled, editor, toast, initializeYjs, projectId, fileId, user, userColor]);

  const generateShareLink = async (): Promise<string> => {
    try {
      const response = await apiRequest('POST', '/api/collaboration/generate-link', { projectId, fileId });

      if (!response.ok) throw new Error('Failed to generate share link');

      const { link } = await response.json();
      setShareLink(link);
      return link;
    } catch (error) {
      console.error('Error generating share link:', error);
      throw error;
    }
  };

  const followUser = useCallback((userId: string) => {
    const participant = participants.find(p => p.user.id === userId);
    if (participant?.cursor && editor) {
      const doc = editor.state.doc;
      const line = Math.min(participant.cursor.line, doc.lines);
      const lineInfo = doc.line(Math.max(1, line));
      const pos = lineInfo.from + Math.min(participant.cursor.column, lineInfo.length);
      
      editor.dispatch({
        selection: { anchor: pos },
        scrollIntoView: true,
      });
    }
  }, [participants, editor]);

  const getCollaborationExtensions = useCallback(() => {
    return collaborationExtensionsRef.current;
  }, []);

  useEffect(() => {
    onParticipantsChange?.(participants);
  }, [participants, onParticipantsChange]);

  const contextValue: CollaborativeContextValue = {
    isConnected,
    participants,
    sessionId,
    userColor,
    shareLink,
    generateShareLink,
    followUser,
    getCollaborationExtensions,
  };

  return (
    <CollaborativeContext.Provider value={contextValue}>
      {children}
    </CollaborativeContext.Provider>
  );
}
