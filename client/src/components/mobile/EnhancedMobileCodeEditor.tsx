/**
 * Enhanced Mobile Code Editor with Design System Integration
 * Adds SearchReplace, StatusBar, and IDE event handling
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MobileCodeEditor } from './MobileCodeEditor';
import {
  SearchReplace,
  StatusBar,
  useToast,
  type SearchOptions,
  type SearchResult,
} from '@/design-system';
import type * as monaco from 'monaco-editor';

interface EnhancedMobileCodeEditorProps {
  fileId?: number;
  projectId: string | number;
  initialContent?: string;
  initialLanguage?: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
  className?: string;
}

/**
 * Enhanced Mobile Code Editor
 *
 * Adds to base MobileCodeEditor:
 * - ✅ Search & Replace with regex (Cmd+F, Cmd+H)
 * - ✅ Status Bar with connection, language, cursor position
 * - ✅ IDE event listeners (save, find, format)
 * - ✅ Toast notifications integration
 *
 * @example
 * ```tsx
 * <EnhancedMobileCodeEditor
 *   fileId={123}
 *   projectId="abc"
 *   initialLanguage="typescript"
 * />
 * ```
 */
export function EnhancedMobileCodeEditor(props: EnhancedMobileCodeEditorProps) {
  const toast = useToast();
  const [showSearch, setShowSearch] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected');
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Listen to IDE events
  useEffect(() => {
    const handleFind = () => {
      setShowSearch(true);
    };

    const handleReplace = () => {
      setShowSearch(true);
    };

    const handleSave = () => {
      if (props.onSave && editorRef.current) {
        const content = editorRef.current.getValue();
        props.onSave(content);
        toast.success('File saved');
      }
    };

    const handleFormat = () => {
      if (editorRef.current) {
        editorRef.current.getAction('editor.action.formatDocument')?.run();
        toast.success('Document formatted');
      }
    };

    window.addEventListener('ide:find', handleFind as EventListener);
    window.addEventListener('ide:replace', handleReplace as EventListener);
    window.addEventListener('ide:save-file', handleSave as EventListener);
    window.addEventListener('ide:format', handleFormat as EventListener);

    return () => {
      window.removeEventListener('ide:find', handleFind as EventListener);
      window.removeEventListener('ide:replace', handleReplace as EventListener);
      window.removeEventListener('ide:save-file', handleSave as EventListener);
      window.removeEventListener('ide:format', handleFormat as EventListener);
    };
  }, [props.onSave, toast]);

  // Search & Replace handlers
  const handleSearch = useCallback(
    (query: string, options: SearchOptions): SearchResult[] => {
      if (!editorRef.current) return [];

      const model = editorRef.current.getModel();
      if (!model) return [];

      try {
        let searchRegex: RegExp;

        if (options.useRegex) {
          searchRegex = new RegExp(
            query,
            options.caseSensitive ? 'g' : 'gi'
          );
        } else {
          const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const pattern = options.wholeWord
            ? `\\b${escapedQuery}\\b`
            : escapedQuery;
          searchRegex = new RegExp(
            pattern,
            options.caseSensitive ? 'g' : 'gi'
          );
        }

        const results: SearchResult[] = [];
        const text = model.getValue();
        const lines = text.split('\n');

        lines.forEach((line, lineIndex) => {
          let match;
          searchRegex.lastIndex = 0;

          while ((match = searchRegex.exec(line)) !== null) {
            results.push({
              line: lineIndex + 1,
              column: match.index + 1,
              length: match[0].length,
              text: match[0],
            });
          }
        });

        return results;
      } catch (error) {
        // Invalid regex
        return [];
      }
    },
    []
  );

  const handleReplace = useCallback(
    (query: string, replacement: string, options: SearchOptions): number => {
      if (!editorRef.current) return 0;

      const model = editorRef.current.getModel();
      if (!model) return 0;

      const results = handleSearch(query, options);
      if (results.length === 0) return 0;

      // Replace first occurrence
      const firstResult = results[0];
      const range = new monaco.Range(
        firstResult.line,
        firstResult.column,
        firstResult.line,
        firstResult.column + firstResult.length
      );

      editorRef.current.executeEdits('search-replace', [
        {
          range,
          text: replacement,
        },
      ]);

      return 1;
    },
    [handleSearch]
  );

  const handleReplaceAll = useCallback(
    (query: string, replacement: string, options: SearchOptions): number => {
      if (!editorRef.current) return 0;

      const model = editorRef.current.getModel();
      if (!model) return 0;

      const results = handleSearch(query, options);
      if (results.length === 0) return 0;

      // Replace all occurrences
      const edits = results.map((result) => ({
        range: new monaco.Range(
          result.line,
          result.column,
          result.line,
          result.column + result.length
        ),
        text: replacement,
      }));

      editorRef.current.executeEdits('search-replace-all', edits);

      toast.success(`Replaced ${results.length} occurrence${results.length !== 1 ? 's' : ''}`);

      return results.length;
    },
    [handleSearch, toast]
  );

  // Get language from file extension or prop
  const getLanguage = (): string => {
    return props.initialLanguage || 'typescript';
  };

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Main Editor */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MobileCodeEditor {...props} />

        {/* Search & Replace Overlay */}
        <SearchReplace
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          onSearch={handleSearch}
          onReplace={handleReplace}
          onReplaceAll={handleReplaceAll}
        />
      </div>

      {/* Status Bar */}
      <StatusBar
        connectionStatus={connectionStatus}
        language={getLanguage()}
        cursorPosition={cursorPosition}
        encoding="UTF-8"
        lineEnding="LF"
        indentation="Spaces: 2"
        showPerformance={false}
      />
    </div>
  );
}

export default EnhancedMobileCodeEditor;
