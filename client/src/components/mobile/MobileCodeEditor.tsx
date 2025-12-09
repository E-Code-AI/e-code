import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorView } from '@codemirror/view';
import { undo, redo, cursorCharLeft, cursorCharRight, cursorLineUp, cursorLineDown } from '@codemirror/commands';
import { openSearchPanel } from '@codemirror/search';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Undo2, Redo2, Save, Search, 
  Keyboard, X, Sparkles,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useEditorScrollPersistence } from '@/hooks/use-mobile-persistence';
import { useMediaQuery } from '@/hooks/use-media-query';
import { CM6Editor } from '@/components/editor/CM6Editor';

interface CompletionItem {
  label: string;
  kind: string;
  detail?: string;
  documentation?: string;
  insertText: string;
}

interface MobileCodeEditorProps {
  fileId?: number;
  projectId: string | number;
  initialContent?: string;
  initialLanguage?: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function MobileCodeEditor({
  fileId,
  projectId,
  initialContent = '',
  initialLanguage = 'typescript',
  onSave,
  readOnly = false,
  className
}: MobileCodeEditorProps) {
  const editorViewRef = useRef<EditorView | null>(null);
  const [content, setContent] = useState(initialContent);
  const [showKeyboardToolbar, setShowKeyboardToolbar] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completions, setCompletions] = useState<CompletionItem[]>([]);
  const [completionFilter, setCompletionFilter] = useState('');
  const { toast } = useToast();
  
  const [scroll, setScroll] = useEditorScrollPersistence(projectId, fileId);
  
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1024px)");

  const saveFileMutation = useMutation({
    mutationFn: async (content: string) =>
      apiRequest('PUT', `/api/files/${fileId}`, { content }),
    onSuccess: () => {
      setHasUnsavedChanges(false);
      toast({ title: 'Saved', description: 'File saved successfully' });
      queryClient.invalidateQueries({ queryKey: [`/api/files/${projectId}`] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save file', variant: 'destructive' });
    },
  });

  const handleEditorMount = useCallback((view: EditorView) => {
    editorViewRef.current = view;
    
    if (scroll.line > 1) {
      const line = view.state.doc.line(Math.min(scroll.line, view.state.doc.lines));
      view.dispatch({
        selection: { anchor: line.from + Math.min(scroll.column - 1, line.length) },
        scrollIntoView: true
      });
    }
  }, [scroll]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    
    const view = editorViewRef.current;
    if (view) {
      const pos = view.state.selection.main.head;
      const line = view.state.doc.lineAt(pos);
      setScroll(line.number, pos - line.from + 1);
    }
  }, [setScroll]);

  useEffect(() => {
    if (initialContent !== content && !hasUnsavedChanges) {
      setContent(initialContent);
    }
  }, [initialContent]);

  const insertText = (text: string) => {
    const view = editorViewRef.current;
    if (!view) return;
    
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length }
    });
    view.focus();
  };

  const handleSave = () => {
    const currentContent = editorViewRef.current?.state.doc.toString() || content;
    if (fileId) {
      saveFileMutation.mutate(currentContent);
    }
    onSave?.(currentContent);
  };

  const handleUndo = () => {
    const view = editorViewRef.current;
    if (view) {
      undo(view);
      view.focus();
    }
  };

  const handleRedo = () => {
    const view = editorViewRef.current;
    if (view) {
      redo(view);
      view.focus();
    }
  };

  const handleFind = () => {
    const view = editorViewRef.current;
    if (view) {
      openSearchPanel(view);
    }
  };

  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleCaretLeft = () => {
    const view = editorViewRef.current;
    if (view) {
      cursorCharLeft(view);
      view.focus();
    }
  };

  const handleCaretRight = () => {
    const view = editorViewRef.current;
    if (view) {
      cursorCharRight(view);
      view.focus();
    }
  };

  const handleCaretUp = () => {
    const view = editorViewRef.current;
    if (view) {
      cursorLineUp(view);
      view.focus();
    }
  };

  const handleCaretDown = () => {
    const view = editorViewRef.current;
    if (view) {
      cursorLineDown(view);
      view.focus();
    }
  };

  const handleHideToolbar = () => {
    triggerHapticFeedback();
    setShowKeyboardToolbar(false);
    (document.activeElement as HTMLElement)?.blur();
  };

  const handleShowToolbar = () => {
    triggerHapticFeedback();
    setShowKeyboardToolbar(true);
    editorViewRef.current?.focus();
  };

  const triggerSuggestions = () => {
    const view = editorViewRef.current;
    if (!view) return;
    
    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    const lineText = line.text;
    const colPos = pos - line.from;
    
    let wordStart = colPos;
    while (wordStart > 0 && /\w/.test(lineText[wordStart - 1])) {
      wordStart--;
    }
    const prefix = lineText.slice(wordStart, colPos);
    
    const commonCompletions = getCommonCompletions(initialLanguage, prefix);
    
    setCompletions(commonCompletions);
    setCompletionFilter('');
    setShowCompletionModal(true);
  };
  
  const getCommonCompletions = (language: string, prefix: string): CompletionItem[] => {
    const jsCompletions: CompletionItem[] = [
      { label: 'console.log', kind: 'Function', detail: 'Log to console', insertText: 'console.log()' },
      { label: 'function', kind: 'Keyword', detail: 'Function declaration', insertText: 'function name() {\n\t\n}' },
      { label: 'const', kind: 'Keyword', detail: 'Constant declaration', insertText: 'const name = ' },
      { label: 'let', kind: 'Keyword', detail: 'Variable declaration', insertText: 'let name = ' },
      { label: 'if', kind: 'Keyword', detail: 'If statement', insertText: 'if () {\n\t\n}' },
      { label: 'for', kind: 'Keyword', detail: 'For loop', insertText: 'for (let i = 0; i < array.length; i++) {\n\t\n}' },
      { label: 'while', kind: 'Keyword', detail: 'While loop', insertText: 'while () {\n\t\n}' },
      { label: 'switch', kind: 'Keyword', detail: 'Switch statement', insertText: 'switch () {\n\tcase :\n\t\t\n\t\tbreak;\n\tdefault:\n\t\t\n}' },
      { label: 'try', kind: 'Keyword', detail: 'Try-catch', insertText: 'try {\n\t\n} catch (error) {\n\t\n}' },
      { label: 'async', kind: 'Keyword', detail: 'Async function', insertText: 'async function name() {\n\t\n}' },
      { label: 'await', kind: 'Keyword', detail: 'Await expression', insertText: 'await ' },
      { label: 'import', kind: 'Keyword', detail: 'Import statement', insertText: "import {  } from '';" },
      { label: 'export', kind: 'Keyword', detail: 'Export statement', insertText: 'export ' },
      { label: 'class', kind: 'Keyword', detail: 'Class declaration', insertText: 'class ClassName {\n\tconstructor() {\n\t\t\n\t}\n}' },
      { label: 'interface', kind: 'Keyword', detail: 'TypeScript interface', insertText: 'interface InterfaceName {\n\t\n}' },
      { label: 'type', kind: 'Keyword', detail: 'TypeScript type alias', insertText: 'type TypeName = ' },
      { label: 'useState', kind: 'Function', detail: 'React hook', insertText: 'const [state, setState] = useState();' },
      { label: 'useEffect', kind: 'Function', detail: 'React hook', insertText: 'useEffect(() => {\n\t\n}, []);' },
      { label: 'map', kind: 'Method', detail: 'Array method', insertText: 'map(item => )' },
      { label: 'filter', kind: 'Method', detail: 'Array method', insertText: 'filter(item => )' },
      { label: 'reduce', kind: 'Method', detail: 'Array method', insertText: 'reduce((acc, item) => , )' },
    ];
    
    if (language === 'javascript' || language === 'typescript' || language === 'javascriptreact' || language === 'typescriptreact') {
      return jsCompletions.filter(c => 
        !prefix || c.label.toLowerCase().startsWith(prefix.toLowerCase())
      );
    }
    
    return [];
  };
  
  const insertCompletion = (completion: CompletionItem) => {
    const view = editorViewRef.current;
    if (!view) return;
    
    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    const lineText = line.text;
    const colPos = pos - line.from;
    
    let wordStart = colPos;
    while (wordStart > 0 && /\w/.test(lineText[wordStart - 1])) {
      wordStart--;
    }
    
    const from = line.from + wordStart;
    const to = pos;
    
    view.dispatch({
      changes: { from, to, insert: completion.insertText },
      selection: { anchor: from + completion.insertText.length }
    });
    
    setShowCompletionModal(false);
    view.focus();
  };
  
  const getCompletionKindIcon = (kind: string) => {
    const kindMap: Record<string, string> = {
      'Function': '𝑓',
      'Method': '𝑚',
      'Keyword': '⌘',
      'Variable': '𝑥',
      'Class': '𝐶',
      'Interface': '𝐼',
      'Module': '📦',
    };
    return kindMap[kind] || '•';
  };
  
  const filteredCompletions = completionFilter
    ? completions.filter(c => c.label.toLowerCase().includes(completionFilter.toLowerCase()))
    : completions;

  return (
    <div className={cn('flex flex-col h-full bg-background dark:bg-[var(--ecode-background)]', className)}>
      {showKeyboardToolbar && !readOnly && (
        <motion.div 
          className="flex items-center gap-1 px-2 py-2 bg-card dark:bg-[var(--ecode-surface)] border-b border-border dark:border-[var(--ecode-border)] overflow-x-auto mobile-hide-scrollbar"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          data-testid="mobile-editor-keyboard-toolbar"
        >
          <Button
            size="sm"
            variant="ghost"
            className="h-10 px-4 text-sm font-mono bg-muted dark:bg-[var(--ecode-surface-secondary)] hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation min-w-[48px]"
            onClick={() => insertText('\t')}
            data-testid="mobile-editor-tab"
          >
            Tab
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-10 px-3 text-sm bg-muted dark:bg-[var(--ecode-surface-secondary)] hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation min-w-[44px]"
            onClick={() => insertText('{')}
            data-testid="mobile-editor-brace"
          >
            {'{'}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-10 px-3 text-sm bg-muted dark:bg-[var(--ecode-surface-secondary)] hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation min-w-[44px]"
            onClick={() => insertText('}')}
            data-testid="mobile-editor-close-brace"
          >
            {'}'}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-10 px-3 text-sm bg-muted dark:bg-[var(--ecode-surface-secondary)] hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation min-w-[44px]"
            onClick={() => insertText('(')}
            data-testid="mobile-editor-paren"
          >
            (
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-10 px-3 text-sm bg-muted dark:bg-[var(--ecode-surface-secondary)] hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation min-w-[44px]"
            onClick={() => insertText(')')}
            data-testid="mobile-editor-close-paren"
          >
            )
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-10 px-3 text-sm bg-muted dark:bg-[var(--ecode-surface-secondary)] hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation min-w-[44px]"
            onClick={() => insertText(';')}
            data-testid="mobile-editor-semicolon"
          >
            ;
          </Button>
          
          <div className="w-px h-8 bg-border dark:bg-[var(--ecode-border)] mx-1" />
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation"
            onClick={handleCaretLeft}
            data-testid="button-caret-left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation"
            onClick={handleCaretRight}
            data-testid="button-caret-right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation"
            onClick={handleCaretUp}
            data-testid="button-caret-up"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation"
            onClick={handleCaretDown}
            data-testid="button-caret-down"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-10 w-10 p-0 hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation"
            onClick={handleUndo}
            data-testid="mobile-editor-undo"
          >
            <Undo2 className="h-5 w-5" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-10 w-10 p-0 hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation"
            onClick={handleRedo}
            data-testid="mobile-editor-redo"
          >
            <Redo2 className="h-5 w-5" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-10 w-10 p-0 hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation"
            onClick={triggerSuggestions}
            data-testid="mobile-editor-suggest"
          >
            <Keyboard className="h-5 w-5" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-10 w-10 p-0 hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation"
            onClick={handleFind}
            data-testid="mobile-editor-find"
          >
            <Search className="h-5 w-5" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              'h-10 px-4 active:scale-95 touch-manipulation min-w-[80px]',
              hasUnsavedChanges && 'bg-primary hover:bg-primary/90 text-primary-foreground'
            )}
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saveFileMutation.isPending}
            data-testid="mobile-editor-save"
          >
            <Save className="h-5 w-5 mr-1" />
            {hasUnsavedChanges ? 'Save' : 'Saved'}
          </Button>
          
          <div className="flex-1" />
          
          <Button
            size="sm"
            variant="ghost"
            className="h-10 w-10 p-0 hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:scale-95 touch-manipulation"
            onClick={handleHideToolbar}
            data-testid="mobile-editor-hide-toolbar"
          >
            <X className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
      
      {!showKeyboardToolbar && !readOnly && (
        <motion.div 
          className="absolute top-2 right-2 z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <Button
            size="sm"
            variant="secondary"
            className="h-10 w-10 p-0 rounded-full shadow-lg touch-manipulation"
            onClick={handleShowToolbar}
            data-testid="mobile-editor-show-toolbar"
          >
            <Keyboard className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
      
      <div className="flex-1 min-h-0" data-testid="mobile-editor-cm6">
        <CM6Editor
          value={content}
          language={initialLanguage}
          onChange={handleContentChange}
          onMount={handleEditorMount}
          readOnly={readOnly}
          height="100%"
          theme="dark"
          lineWrapping={true}
          tabSize={2}
        />
      </div>
      
      <AnimatePresence>
        {showCompletionModal && (
          <>
            <motion.div
              className="absolute inset-0 bg-background z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCompletionModal(false)}
              data-testid="mobile-completion-backdrop"
            />
            
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-card dark:bg-[var(--ecode-surface)] rounded-t-2xl shadow-2xl z-50 max-h-[60vh] flex flex-col"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 500 }}
              data-testid="mobile-completion-modal"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-[var(--ecode-border)]">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Code Completions</h3>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 p-0 hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] touch-manipulation"
                  onClick={() => setShowCompletionModal(false)}
                  data-testid="mobile-completion-close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="px-4 py-2 border-b border-border dark:border-[var(--ecode-border)]">
                <Input
                  type="text"
                  placeholder="Filter completions..."
                  value={completionFilter}
                  onChange={(e) => setCompletionFilter(e.target.value)}
                  className="bg-muted dark:bg-[var(--ecode-surface-secondary)] border-none text-foreground placeholder:text-muted-foreground h-10 touch-manipulation"
                  data-testid="mobile-completion-filter"
                />
              </div>
              
              <ScrollArea className="flex-1 mobile-hide-scrollbar">
                <div className="p-2">
                  {filteredCompletions.length > 0 ? (
                    filteredCompletions.map((completion, index) => (
                      <motion.button
                        key={`${completion.label}-${index}`}
                        className="w-full flex items-start gap-3 p-4 rounded-lg hover:bg-surface-tertiary-solid dark:hover:bg-[var(--ecode-surface-hover)] active:bg-surface-tertiary-solid transition-colors touch-manipulation text-left min-h-[56px]"
                        onClick={() => insertCompletion(completion)}
                        whileTap={{ scale: 0.98 }}
                        data-testid={`mobile-completion-item-${index}`}
                      >
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-muted dark:bg-[var(--ecode-surface-secondary)] rounded font-mono text-sm text-primary">
                          {getCompletionKindIcon(completion.kind)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-foreground truncate">
                            {completion.label}
                          </div>
                          {completion.detail && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {completion.detail}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-shrink-0 px-2 py-1 bg-muted dark:bg-[var(--ecode-surface-secondary)] rounded text-xs text-muted-foreground font-mono">
                          {completion.kind}
                        </div>
                      </motion.button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm" data-testid="mobile-completion-empty">
                      {completionFilter ? 'No matching completions' : 'No completions available'}
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <div className="px-4 py-2 border-t border-border dark:border-[var(--ecode-border)] text-xs text-muted-foreground text-center">
                {filteredCompletions.length} {filteredCompletions.length === 1 ? 'completion' : 'completions'}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
