/**
 * Visual Diff Editor - Side-by-side file comparison
 * Apple-grade design for viewing git diffs
 */

import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  GitCompare,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Copy,
  ArrowLeftRight,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DiffChange {
  lineNumber: number;
  type: 'added' | 'removed' | 'modified';
  oldContent?: string;
  newContent?: string;
}

interface VisualDiffEditorProps {
  originalContent: string;
  modifiedContent: string;
  originalFileName?: string;
  modifiedFileName?: string;
  language?: string;
  onAcceptChange?: (lineNumber: number) => void;
  onRejectChange?: (lineNumber: number) => void;
  className?: string;
  readOnly?: boolean;
}

export function VisualDiffEditor({
  originalContent,
  modifiedContent,
  originalFileName = 'Original',
  modifiedFileName = 'Modified',
  language = 'typescript',
  onAcceptChange,
  onRejectChange,
  className,
  readOnly = false
}: VisualDiffEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const [currentDiff, setCurrentDiff] = useState(0);
  const [totalDiffs, setTotalDiffs] = useState(0);
  const [showWhitespace, setShowWhitespace] = useState(false);
  const [inlineView, setInlineView] = useState(false);
  const [changes, setChanges] = useState<DiffChange[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!containerRef.current) return;

    // Create diff editor
    const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
      automaticLayout: true,
      renderSideBySide: !inlineView,
      readOnly: readOnly,
      enableSplitViewResizing: true,
      renderWhitespace: showWhitespace ? 'all' : 'none',
      diffWordWrap: 'on',
      renderLineHighlight: 'all',
      scrollBeyondLastLine: false,
      minimap: {
        enabled: false
      },
      fontSize: 13,
      lineHeight: 20,
      fontFamily: 'IBM Plex Mono, SF Mono, Monaco, Consolas, monospace',
      theme: 'vs-dark',
      diffAlgorithm: 'advanced', // Use advanced diff algorithm for better results
      ignoreTrimWhitespace: !showWhitespace,
      renderIndicators: true,
      // Apple-grade smooth scrolling
      smoothScrolling: true,
      cursorSmoothCaretAnimation: 'on',
    });

    // Set original and modified models
    const originalModel = monaco.editor.createModel(originalContent, language);
    const modifiedModel = monaco.editor.createModel(modifiedContent, language);

    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel
    });

    diffEditorRef.current = diffEditor;

    // Calculate diff changes
    const lineChanges = diffEditor.getLineChanges() || [];
    const parsedChanges: DiffChange[] = [];

    lineChanges.forEach(change => {
      if (change.modifiedEndLineNumber !== undefined) {
        for (let i = change.modifiedStartLineNumber; i <= change.modifiedEndLineNumber; i++) {
          parsedChanges.push({
            lineNumber: i,
            type: change.originalEndLineNumber === 0 ? 'added' : 'modified',
            newContent: modifiedModel.getLineContent(i)
          });
        }
      }
      if (change.originalEndLineNumber !== undefined && change.modifiedEndLineNumber === 0) {
        for (let i = change.originalStartLineNumber; i <= change.originalEndLineNumber; i++) {
          parsedChanges.push({
            lineNumber: i,
            type: 'removed',
            oldContent: originalModel.getLineContent(i)
          });
        }
      }
    });

    setChanges(parsedChanges);
    setTotalDiffs(lineChanges.length);

    // Cleanup
    return () => {
      diffEditor.dispose();
      originalModel.dispose();
      modifiedModel.dispose();
    };
  }, [originalContent, modifiedContent, language, inlineView, showWhitespace, readOnly]);

  const navigateToDiff = (direction: 'next' | 'previous') => {
    if (!diffEditorRef.current || totalDiffs === 0) return;

    const lineChanges = diffEditorRef.current.getLineChanges() || [];

    let targetIndex = direction === 'next'
      ? Math.min(currentDiff + 1, lineChanges.length - 1)
      : Math.max(currentDiff - 1, 0);

    setCurrentDiff(targetIndex);

    // Scroll to the change
    const change = lineChanges[targetIndex];
    if (change) {
      const modifiedEditor = diffEditorRef.current.getModifiedEditor();
      modifiedEditor.revealLineInCenter(change.modifiedStartLineNumber);
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  };

  const handleCopyModified = () => {
    navigator.clipboard.writeText(modifiedContent);
    toast({
      title: "Copied to clipboard",
      description: "Modified content copied successfully",
    });
  };

  const handleAcceptAll = () => {
    if (onAcceptChange) {
      changes.forEach(change => onAcceptChange(change.lineNumber));
    }
    toast({
      title: "All changes accepted",
      description: `${changes.length} changes have been accepted`,
    });
  };

  const handleRejectAll = () => {
    if (onRejectChange) {
      changes.forEach(change => onRejectChange(change.lineNumber));
    }
    toast({
      title: "All changes rejected",
      description: `${changes.length} changes have been rejected`,
    });
  };

  const getDiffStats = () => {
    const added = changes.filter(c => c.type === 'added').length;
    const removed = changes.filter(c => c.type === 'removed').length;
    const modified = changes.filter(c => c.type === 'modified').length;
    return { added, removed, modified };
  };

  const stats = getDiffStats();

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3 space-y-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Visual Diff
          </CardTitle>

          {/* Diff Statistics */}
          <div className="flex items-center gap-2">
            {stats.added > 0 && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                +{stats.added}
              </Badge>
            )}
            {stats.removed > 0 && (
              <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">
                -{stats.removed}
              </Badge>
            )}
            {stats.modified > 0 && (
              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                ~{stats.modified}
              </Badge>
            )}
          </div>
        </div>

        <Separator className="my-3" />

        {/* File names */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-mono">{originalFileName}</span>
            <ArrowLeftRight className="h-3 w-3" />
            <span className="font-mono font-medium">{modifiedFileName}</span>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => navigateToDiff('previous')}
              disabled={currentDiff === 0 || totalDiffs === 0}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 text-xs">
              {totalDiffs > 0 ? `${currentDiff + 1}/${totalDiffs}` : '0/0'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => navigateToDiff('next')}
              disabled={currentDiff >= totalDiffs - 1 || totalDiffs === 0}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setInlineView(!inlineView)}
            >
              {inlineView ? (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Side-by-Side
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Inline
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setShowWhitespace(!showWhitespace)}
            >
              <Settings className="h-3 w-3 mr-1" />
              {showWhitespace ? 'Hide' : 'Show'} Whitespace
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={handleCopyModified}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
          </div>

          {!readOnly && onAcceptChange && onRejectChange && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-green-600 border-green-600/20 hover:bg-green-500/10"
                onClick={handleAcceptAll}
                disabled={changes.length === 0}
              >
                <Check className="h-3 w-3 mr-1" />
                Accept All
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-red-600 border-red-600/20 hover:bg-red-500/10"
                onClick={handleRejectAll}
                disabled={changes.length === 0}
              >
                <X className="h-3 w-3 mr-1" />
                Reject All
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <div
          ref={containerRef}
          className="h-full w-full"
          style={{ minHeight: '400px' }}
        />
      </CardContent>
    </Card>
  );
}
