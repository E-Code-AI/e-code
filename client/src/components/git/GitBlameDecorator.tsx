/**
 * Git Blame Decorator - Inline blame annotations in Monaco Editor
 * Shows commit info and author for each line
 */

import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface BlameInfo {
  line: number;
  commit: {
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    date: Date;
  };
}

interface GitBlameDecoratorProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  filePath: string;
  projectId: string | number;
  enabled?: boolean;
}

export function GitBlameDecorator({
  editor,
  filePath,
  projectId,
  enabled = true
}: GitBlameDecoratorProps) {
  const [blameData, setBlameData] = useState<BlameInfo[]>([]);
  const decorationsRef = useRef<string[]>([]);
  const { toast } = useToast();

  // Fetch blame data
  useEffect(() => {
    if (!enabled || !filePath) {
      setBlameData([]);
      return;
    }

    const fetchBlameData = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/projects/${projectId}/git/blame?file=${filePath}`);
        // const data = await response.json();

        // Mock data for demonstration
        const mockBlameData: BlameInfo[] = Array.from({ length: 20 }, (_, i) => ({
          line: i + 1,
          commit: {
            hash: `a${i}b2c3d4e5f6g7h8i9j0`,
            shortHash: `a${i}b2c3d`,
            message: i % 3 === 0
              ? 'feat: Add new feature'
              : i % 2 === 0
              ? 'fix: Bug fix'
              : 'refactor: Code cleanup',
            author: i % 2 === 0 ? 'Claude AI' : 'Developer',
            date: new Date(Date.now() - 1000 * 60 * 60 * 24 * (i + 1))
          }
        }));

        setBlameData(mockBlameData);
      } catch (error) {
        console.error('Failed to fetch blame data:', error);
        toast({
          title: "Failed to load blame data",
          description: error instanceof Error ? error.message : "An error occurred",
          variant: "destructive",
        });
      }
    };

    fetchBlameData();
  }, [filePath, projectId, enabled, toast]);

  // Apply decorations to editor
  useEffect(() => {
    if (!editor || !enabled || blameData.length === 0) {
      // Clear decorations if disabled or no data
      if (editor && decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
      return;
    }

    const decorations: monaco.editor.IModelDeltaDecoration[] = blameData.map(blame => ({
      range: new monaco.Range(blame.line, 1, blame.line, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: 'git-blame-glyph',
        glyphMarginHoverMessage: {
          value: [
            `**${blame.commit.shortHash}** - ${blame.commit.message}`,
            '',
            `Author: ${blame.commit.author}`,
            `Date: ${formatDistanceToNow(blame.commit.date, { addSuffix: true })}`
          ].join('\n')
        },
        before: {
          content: ` ${blame.commit.author} • ${formatDistanceToNow(blame.commit.date, { addSuffix: true })} `,
          inlineClassName: 'git-blame-inline',
          cursorStops: monaco.editor.InjectedTextCursorStops.None,
        }
      }
    }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);

    // Add custom CSS for blame decorations (only once)
    if (!document.getElementById('git-blame-styles')) {
      const style = document.createElement('style');
      style.id = 'git-blame-styles';
      style.textContent = `
        .git-blame-inline {
          color: var(--vscode-editorCodeLens-foreground, rgba(150, 150, 150, 0.7)) !important;
          font-size: 11px !important;
          font-family: 'IBM Plex Mono', 'SF Mono', Monaco, Consolas, monospace !important;
          font-style: italic !important;
          padding-right: 12px !important;
          opacity: 0.6 !important;
          transition: opacity 0.2s ease !important;
        }

        .git-blame-inline:hover {
          opacity: 1 !important;
        }

        .git-blame-glyph {
          background: transparent !important;
          width: 8px !important;
        }

        /* Line hover effect */
        .monaco-editor .view-line:hover .git-blame-inline {
          opacity: 1 !important;
        }

        /* Dark mode adjustments */
        .dark .git-blame-inline {
          color: rgba(150, 150, 150, 0.6) !important;
        }

        /* Light mode adjustments */
        .light .git-blame-inline {
          color: rgba(100, 100, 100, 0.7) !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Cleanup
    return () => {
      if (editor && decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
    };
  }, [editor, blameData, enabled]);

  // This component doesn't render anything visible
  return null;
}

/**
 * Hook to use Git Blame with Monaco Editor
 */
export function useGitBlame(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  filePath: string,
  projectId: string | number
) {
  const [enabled, setEnabled] = useState(true);

  const toggle = () => setEnabled(prev => !prev);
  const enable = () => setEnabled(true);
  const disable = () => setEnabled(false);

  return {
    GitBlameDecorator: () => (
      <GitBlameDecorator
        editor={editor}
        filePath={filePath}
        projectId={projectId}
        enabled={enabled}
      />
    ),
    enabled,
    toggle,
    enable,
    disable
  };
}
