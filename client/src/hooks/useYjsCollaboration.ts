// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { CollaborationProvider } from '@/utils/collaboration-provider';
import { useAuth } from '@/hooks/use-auth';

interface Collaborator {
  clientId: number;
  userId: number;
  username: string;
  color: string;
  cursor?: {
    position: {
      lineNumber: number;
      column: number;
    };
    selection?: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    };
  };
}

interface UseYjsCollaborationOptions {
  projectId: number;
  fileId: number;
  editor?: monaco.editor.IStandaloneCodeEditor | null;
  model?: monaco.editor.ITextModel | null;
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#F9CA24', '#6C5CE7',
  '#A29BFE', '#FD79A8', '#FDCB6E', '#6C5CE7', '#00B894'
];

export function useYjsCollaboration({
  projectId,
  fileId,
  editor,
  model
}: UseYjsCollaborationOptions) {
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [followingUserId, setFollowingUserId] = useState<number | null>(null);
  const providerRef = useRef<CollaborationProvider | null>(null);
  const bindingRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!user || !projectId || !fileId) return;

    // Generate a color for this user
    const userColor = COLORS[user.id % COLORS.length];
    
    // Create collaboration provider
    const provider = new CollaborationProvider(
      `project-${projectId}`,
      {
        userId: user.id,
        username: user.username,
        color: userColor
      }
    );
    
    providerRef.current = provider;

    // Listen for connection status
    provider.getProvider().on('status', ({ status }: { status: string }) => {
      setIsConnected(status === 'connected');
    });

    // Listen for collaborator changes
    const unsubscribe = provider.onUsersChange((users) => {
      setCollaborators(users);
      
      // Update cursor decorations if editor is available
      if (editor && model) {
        updateCursorDecorations(editor, model, users);
      }
    });

    // Cleanup
    return () => {
      unsubscribe();
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      provider.destroy();
      providerRef.current = null;
    };
  }, [user, projectId, fileId]);

  // Bind Monaco editor when it becomes available
  useEffect(() => {
    if (!editor || !model || !providerRef.current) return;

    // Bind Monaco editor to Yjs
    bindingRef.current = providerRef.current.bindMonaco(editor, model);

    // Listen for cursor position changes
    const disposable = editor.onDidChangeCursorPosition((e) => {
      if (providerRef.current) {
        providerRef.current.sendCursorUpdate(
          e.position,
          editor.getSelection() || undefined
        );
      }
    });

    // Handle following user
    if (followingUserId !== null) {
      const collaborator = collaborators.find(c => c.userId === followingUserId);
      if (collaborator?.cursor) {
        editor.revealLineInCenter(collaborator.cursor.position.lineNumber);
        editor.setPosition(collaborator.cursor.position);
      }
    }

    return () => {
      disposable.dispose();
    };
  }, [editor, model, followingUserId, collaborators]);

  const updateCursorDecorations = (
    editor: monaco.editor.IStandaloneCodeEditor,
    model: monaco.editor.ITextModel,
    users: Collaborator[]
  ) => {
    // Clear previous decorations
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      []
    );

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    users.forEach((user) => {
      if (!user.cursor) return;

      const { position, selection } = user.cursor;

      // Add cursor decoration
      newDecorations.push({
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        options: {
          className: 'yjs-cursor',
          hoverMessage: { value: user.username },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          afterContentClassName: `yjs-cursor-head yjs-cursor-${user.userId}`,
          after: {
            content: ' ',
            inlineClassName: `yjs-cursor-${user.userId}`
          }
        }
      });

      // Add selection decoration if exists
      if (selection) {
        newDecorations.push({
          range: new monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn
          ),
          options: {
            className: `yjs-selection yjs-selection-${user.userId}`,
            inlineClassName: 'yjs-selection-inline',
            beforeContentClassName: 'yjs-selection-before',
            afterContentClassName: 'yjs-selection-after',
            inlineClassNameAffectsLetterSpacing: true,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            isWholeLine: false,
            minimap: {
              color: user.color,
              position: monaco.editor.MinimapPosition.Inline
            }
          }
        });
      }
    });

    decorationsRef.current = editor.deltaDecorations([], newDecorations);
  };

  const followUser = (userId: number) => {
    if (followingUserId === userId) {
      setFollowingUserId(null);
    } else {
      setFollowingUserId(userId);
    }
  };

  const setEditor = (newEditor: monaco.editor.IStandaloneCodeEditor | null) => {
    editor = newEditor;
  };

  const setModel = (newModel: monaco.editor.ITextModel | null) => {
    model = newModel;
  };

  return {
    collaborators,
    isConnected,
    followingUserId,
    followUser,
    setEditor,
    setModel
  };
}