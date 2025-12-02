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

interface ApiBlameEntry {
  line: number;
  commit: {
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    date: string;
  };
}

interface BlameResponse {
  blame: ApiBlameEntry[];
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
  const [isLoading, setIsLoading] = useState(false);
  const decorationsRef = useRef<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled || !filePath) {
      setBlameData([]);
      return;
    }

    const fetchBlameData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/git/blame/${encodeURIComponent(filePath)}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 400) {
            setBlameData([]);
            return;
          }
          throw new Error('Failed to fetch blame data');
        }
        
        const data: BlameResponse = await response.json();
        
        const parsedBlameData: BlameInfo[] = (data.blame || []).map(entry => ({
          line: entry.line,
          commit: {
            hash: entry.commit.hash,
            shortHash: entry.commit.shortHash,
            message: entry.commit.message,
            author: entry.commit.author,
            date: new Date(entry.commit.date)
          }
        }));

        setBlameData(parsedBlameData);
      } catch (error) {
        console.error('Failed to fetch blame data:', error);
        setBlameData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlameData();
  }, [filePath, projectId, enabled, toast]);

  useEffect(() => {
    if (!editor || !enabled || blameData.length === 0) {
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

    return () => {
      if (editor && decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = [];
      }
    };
  }, [editor, blameData, enabled]);

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
