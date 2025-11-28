/**
 * E-Code Collaborator Cursors Component
 * Fortune 500 Quality Editor Integration
 * 
 * Renders remote collaborator cursors and selections in Monaco Editor
 * Features:
 * - Animated cursor indicators
 * - Username labels
 * - Selection highlighting
 * - Mobile-friendly touch targets
 */

import { useEffect, useRef, memo } from 'react';
import * as monaco from 'monaco-editor';
import { Collaborator } from '@/hooks/useRealTimeCollaboration';

interface CollaboratorCursorsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  collaborators: Collaborator[];
  followingUserId?: string | null;
  onFollowCursor?: (position: { lineNumber: number; column: number }) => void;
}

const cursorStyles = `
  .collaborator-cursor {
    position: relative;
    pointer-events: none;
  }
  
  .collaborator-cursor-line {
    position: absolute;
    width: 2px;
    height: 18px;
    animation: cursor-blink 1s ease-in-out infinite;
  }
  
  .collaborator-cursor-label {
    position: absolute;
    top: -18px;
    left: 0;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 500;
    border-radius: 3px 3px 3px 0;
    white-space: nowrap;
    color: white;
    z-index: 10;
    pointer-events: none;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  
  .collaborator-selection {
    opacity: 0.3;
  }
  
  @keyframes cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @media (max-width: 768px) {
    .collaborator-cursor-label {
      font-size: 9px;
      padding: 2px 4px;
    }
  }
`;

function injectCursorStyles() {
  const styleId = 'collaborator-cursor-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = cursorStyles;
    document.head.appendChild(style);
  }
}

export const CollaboratorCursors = memo(function CollaboratorCursors({
  editor,
  collaborators,
  followingUserId,
  onFollowCursor
}: CollaboratorCursorsProps) {
  const decorationsRef = useRef<string[]>([]);
  const styleInjectedRef = useRef(false);

  useEffect(() => {
    if (!styleInjectedRef.current) {
      injectCursorStyles();
      styleInjectedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    collaborators.forEach((collaborator) => {
      const { cursor, selection, color, username, odUserId } = collaborator;

      if (cursor) {
        newDecorations.push({
          range: new monaco.Range(
            cursor.lineNumber,
            cursor.column,
            cursor.lineNumber,
            cursor.column
          ),
          options: {
            className: 'collaborator-cursor',
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            beforeContentClassName: `collaborator-cursor-line`,
            hoverMessage: { value: `**${username}**` },
            overviewRuler: {
              color: color,
              position: monaco.editor.OverviewRulerLane.Right
            }
          }
        });

        newDecorations.push({
          range: new monaco.Range(
            cursor.lineNumber,
            cursor.column,
            cursor.lineNumber,
            cursor.column + 1
          ),
          options: {
            after: {
              content: '',
              inlineClassName: `collaborator-cursor-indicator-${odUserId}`
            },
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
          }
        });
      }

      if (selection && (
        selection.startLineNumber !== selection.endLineNumber ||
        selection.startColumn !== selection.endColumn
      )) {
        newDecorations.push({
          range: new monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn
          ),
          options: {
            className: 'collaborator-selection',
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            minimap: {
              color: color,
              position: monaco.editor.MinimapPosition.Inline
            },
            overviewRuler: {
              color: color,
              position: monaco.editor.OverviewRulerLane.Full
            }
          }
        });
      }

      const existingStyle = document.getElementById(`cursor-style-${odUserId}`);
      if (existingStyle) existingStyle.remove();

      const dynamicStyle = document.createElement('style');
      dynamicStyle.id = `cursor-style-${odUserId}`;
      dynamicStyle.textContent = `
        .collaborator-cursor-line[data-user="${odUserId}"] {
          background-color: ${color};
        }
        .collaborator-cursor-indicator-${odUserId}::before {
          content: '';
          position: absolute;
          left: -2px;
          top: 0;
          width: 2px;
          height: 100%;
          background-color: ${color};
          animation: cursor-blink 1s ease-in-out infinite;
        }
        .collaborator-cursor-indicator-${odUserId}::after {
          content: '${username}';
          position: absolute;
          left: -2px;
          top: -16px;
          padding: 1px 5px;
          font-size: 10px;
          font-weight: 500;
          border-radius: 3px 3px 3px 0;
          background-color: ${color};
          color: white;
          white-space: nowrap;
          z-index: 100;
        }
      `;
      document.head.appendChild(dynamicStyle);
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

    return () => {
      collaborators.forEach((collaborator) => {
        const style = document.getElementById(`cursor-style-${collaborator.odUserId}`);
        if (style) style.remove();
      });
    };
  }, [editor, collaborators]);

  useEffect(() => {
    if (!editor || !followingUserId || !onFollowCursor) return;

    const followedUser = collaborators.find(c => c.odUserId.toString() === followingUserId);
    if (followedUser?.cursor) {
      editor.revealLineInCenter(followedUser.cursor.lineNumber);
      onFollowCursor(followedUser.cursor);
    }
  }, [editor, followingUserId, collaborators, onFollowCursor]);

  return null;
});

export default CollaboratorCursors;
