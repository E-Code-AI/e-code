import React, { useEffect, useRef, useState, createContext, useContext } from 'react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { WebsocketProvider } from 'y-websocket';
import * as monaco from 'monaco-editor';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Share, WifiOff, Wifi } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CollaborativeSession {
  sessionId: string;
  color: string;
  participants: Participant[];
}

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
  editor: monaco.editor.IStandaloneCodeEditor | null;
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
  const [showShareDialog, setShowShareDialog] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const { toast } = useToast();

  // Initialize WebSocket connection
  useEffect(() => {
    if (!enabled || !editor) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/collaborate`;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Collaborative WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Get auth token from localStorage or session
        const token = localStorage.getItem('authToken') || '';
        
        // Authenticate
        ws.send(JSON.stringify({
          type: 'auth',
          data: { token },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect (attempt ${reconnectAttemptsRef.current})...`);
            connect();
          }, delay);
        } else {
          toast({
            title: 'Connection lost',
            description: 'Unable to reconnect to collaboration server',
            variant: 'destructive',
          });
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
    };
  }, [enabled, editor, toast]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'auth-success':
        // Join the collaboration session
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'join-session',
            data: { projectId, fileId },
          }));
        }
        break;

      case 'auth-failed':
        toast({
          title: 'Authentication failed',
          description: 'Please log in to use collaborative editing',
          variant: 'destructive',
        });
        break;

      case 'session-joined':
        setSessionId(message.data.sessionId);
        setUserColor(message.data.color);
        setParticipants(message.data.participants || []);
        
        // Initialize Yjs
        initializeYjs();
        
        toast({
          title: 'Collaboration started',
          description: `You joined the editing session with color ${message.data.color}`,
        });
        break;

      case 'participant-joined':
        setParticipants(prev => [
          ...prev,
          {
            user: message.data,
            cursor: undefined,
            selection: undefined,
          },
        ]);
        
        toast({
          title: 'User joined',
          description: `${message.data.username} joined the session`,
        });
        break;

      case 'participant-leave':
        setParticipants(prev => 
          prev.filter(p => p.user.id !== message.data.userId)
        );
        
        // Remove user's cursor decorations
        updateCursorDecorations();
        
        toast({
          title: 'User left',
          description: `${message.data.username} left the session`,
        });
        break;

      case 'document-update':
        if (ydocRef.current) {
          const update = new Uint8Array(message.data);
          Y.applyUpdate(ydocRef.current, update);
        }
        break;

      case 'cursor-update':
        updateParticipantCursor(message.data.userId, message.data.cursor);
        updateCursorDecorations();
        break;

      case 'selection-update':
        updateParticipantSelection(message.data.userId, message.data.selection);
        updateCursorDecorations();
        break;

      case 'state-update':
        if (ydocRef.current && message.data.document) {
          const update = new Uint8Array(message.data.document);
          Y.applyUpdate(ydocRef.current, update);
        }
        setParticipants(message.data.participants || []);
        break;
    }
  };

  // Initialize Yjs and Monaco binding
  const initializeYjs = () => {
    if (!editor || ydocRef.current) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const ytext = ydoc.getText('monaco');
    
    // Create Monaco binding
    const binding = new MonacoBinding(
      ytext,
      editor.getModel()!,
      new Set([editor]),
      null
    );
    bindingRef.current = binding;

    // Listen for Yjs updates
    ydoc.on('update', (update: Uint8Array) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'document-update',
          data: Array.from(update),
        }));
      }
    });

    // Listen for cursor position changes
    let cursorThrottle: NodeJS.Timeout | null = null;
    editor.onDidChangeCursorPosition((e) => {
      if (cursorThrottle) clearTimeout(cursorThrottle);
      
      cursorThrottle = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'cursor-update',
            data: {
              line: e.position.lineNumber,
              column: e.position.column,
            },
          }));
        }
      }, 100); // Throttle to 100ms
    });

    // Listen for selection changes
    let selectionThrottle: NodeJS.Timeout | null = null;
    editor.onDidChangeCursorSelection((e) => {
      if (selectionThrottle) clearTimeout(selectionThrottle);
      
      selectionThrottle = setTimeout(() => {
        const selection = e.selection;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'selection-update',
            data: {
              startLine: selection.startLineNumber,
              startColumn: selection.startColumn,
              endLine: selection.endLineNumber,
              endColumn: selection.endColumn,
            },
          }));
        }
      }, 100); // Throttle to 100ms
    });

    // Request current state
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'request-state',
      }));
    }
  };

  // Update participant cursor position
  const updateParticipantCursor = (userId: string, cursor: { line: number; column: number }) => {
    setParticipants(prev => prev.map(p => 
      p.user.id === userId
        ? { ...p, cursor }
        : p
    ));
  };

  // Update participant selection
  const updateParticipantSelection = (userId: string, selection: any) => {
    setParticipants(prev => prev.map(p => 
      p.user.id === userId
        ? { ...p, selection }
        : p
    ));
  };

  // Update cursor decorations in Monaco
  const updateCursorDecorations = () => {
    if (!editor) return;

    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    participants.forEach(participant => {
      if (participant.cursor) {
        // Add cursor decoration
        decorations.push({
          range: new monaco.Range(
            participant.cursor.line,
            participant.cursor.column,
            participant.cursor.line,
            participant.cursor.column
          ),
          options: {
            className: `collaborative-cursor-${participant.user.id}`,
            beforeContentClassName: `cursor-${participant.user.id}`,
            hoverMessage: { value: participant.user.username },
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      }

      if (participant.selection) {
        // Add selection decoration
        decorations.push({
          range: new monaco.Range(
            participant.selection.startLine,
            participant.selection.startColumn,
            participant.selection.endLine,
            participant.selection.endColumn
          ),
          options: {
            className: `collaborative-selection-${participant.user.id}`,
            inlineClassName: `selection-${participant.user.id}`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      }
    });

    // Update decorations
    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }
    decorationsRef.current = editor.createDecorationsCollection(decorations);

    // Inject CSS for cursor colors
    injectCursorStyles();
  };

  // Inject CSS styles for cursors
  const injectCursorStyles = () => {
    const styleId = 'collaborative-cursor-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    const styles = participants.map(p => `
      .cursor-${p.user.id}::before {
        content: '';
        position: absolute;
        width: 2px;
        height: 20px;
        background-color: ${p.user.color};
        animation: cursorBlink 1s ease-in-out infinite;
      }
      .collaborative-selection-${p.user.id} {
        background-color: ${p.user.color}30 !important;
      }
      @keyframes cursorBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `).join('\n');

    styleElement.textContent = styles;
  };

  // Generate shareable link
  const generateShareLink = async (): Promise<string> => {
    try {
      const response = await fetch('/api/collaboration/generate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId, fileId }),
      });

      if (!response.ok) throw new Error('Failed to generate share link');

      const { link } = await response.json();
      setShareLink(link);
      return link;
    } catch (error) {
      console.error('Error generating share link:', error);
      throw error;
    }
  };

  // Follow a user's cursor
  const followUser = (userId: string) => {
    const participant = participants.find(p => p.user.id === userId);
    if (participant?.cursor && editor) {
      editor.revealLineInCenter(participant.cursor.line);
      editor.setPosition({
        lineNumber: participant.cursor.line,
        column: participant.cursor.column,
      });
    }
  };

  // Notify parent about participant changes
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
  };

  return (
    <CollaborativeContext.Provider value={contextValue}>
      {children}
    </CollaborativeContext.Provider>
  );
}