import { useEffect, useRef, useState, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { 
  Undo2, Redo2, Save, Search, MoreVertical,
  ChevronRight, CornerDownLeft, Keyboard, X, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useEditorScrollPersistence } from '@/hooks/use-mobile-persistence';
import { usePinchZoom } from '@/hooks/use-pinch-zoom';
import { useSmoothScroll } from '@/hooks/use-smooth-scroll';
import { useMediaQuery } from '@/hooks/use-media-query';
import { getIPadProMonacoConfig, detectIPadPro } from '@/utils/ipad-pro-optimization';

interface CompletionItem {
  label: string;
  kind: string;
  detail?: string;
  documentation?: string;
  insertText: string;
}

interface MobileCodeEditorProps {
  fileId?: number;
  projectId: string | number; // Support both UUID strings and numeric IDs
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
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [showKeyboardToolbar, setShowKeyboardToolbar] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completions, setCompletions] = useState<CompletionItem[]>([]);
  const [completionFilter, setCompletionFilter] = useState('');
  const [editorFontSize, setEditorFontSize] = useState(14);
  const { toast } = useToast();
  
  // Persistent scroll position
  const [scroll, setScroll] = useEditorScrollPersistence(projectId, fileId);
  
  // Tablet detection for pinch-to-zoom (tablet-9: iPad Pro optimization)
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1024px)");
  const iPadProConfig = detectIPadPro();

  // Save file mutation
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

  // Pinch-to-zoom for tablets (768px-1024px)
  const handlePinchZoom = useCallback((scale: number) => {
    // Scale from 1.0 to 2.0 maps to fontSize 14 to 28
    const baseFontSize = 14;
    const newFontSize = Math.round(baseFontSize * scale);
    setEditorFontSize(newFontSize);
    
    // Update Monaco editor font size dynamically
    if (editorInstanceRef.current) {
      editorInstanceRef.current.updateOptions({
        fontSize: newFontSize,
        lineHeight: Math.round(newFontSize * 1.57), // Maintain 1.57 ratio
      });
    }
  }, []);

  // Enable pinch-to-zoom only on tablets
  usePinchZoom(editorRef, {
    minScale: 0.8, // Min 11px font
    maxScale: 2.5, // Max 35px font
    onScaleChange: handlePinchZoom,
    enabled: isTablet,
  });

  // Enable smooth two-finger scroll for tablets (uses Monaco API via ref)
  useSmoothScroll(editorRef, {
    friction: 0.92, // Smooth deceleration
    threshold: 0.5, // Minimum velocity
    enabled: isTablet,
    editorInstanceRef, // Pass ref (not .current) so hook accesses live Monaco instance
  });

  // Mobile-optimized Monaco configuration (tablet-9: iPad Pro enhanced)
  const getMobileEditorConfig = (): monaco.editor.IStandaloneEditorConstructionOptions => {
    const baseConfig: monaco.editor.IStandaloneEditorConstructionOptions = {
      value: initialContent,
      language: initialLanguage,
      theme: 'vs-dark',
      readOnly,
      
      // Mobile-specific settings (tablet uses dynamic editorFontSize)
      fontSize: editorFontSize,
      lineHeight: Math.round(editorFontSize * 1.57), // 14px → 22px ratio
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      fontLigatures: false, // Better performance on mobile
      
      // Simplified features for touch
      minimap: { enabled: false }, // Takes too much space on mobile
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
    
    // Touch-friendly options
    mouseWheelZoom: false,
    quickSuggestions: false, // Manual trigger via toolbar
    suggestOnTriggerCharacters: false, // Prevent auto-popup
    acceptSuggestionOnEnter: 'on',
    tabCompletion: 'on',
    
    // Performance optimizations
    renderValidationDecorations: 'off',
    renderLineHighlight: 'line',
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    
    // Mobile layout
    lineNumbers: 'on',
    glyphMargin: false,
    folding: true,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    
    // Disable features that conflict with touch
    contextmenu: false,
    links: false,
    
    // Word wrap for mobile
    wordWrap: 'on',
    wordWrapColumn: 80,
    wrappingIndent: 'indent',
    
      // Auto-closing
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      autoIndent: 'full',
    };

    // Merge iPad Pro optimizations if on iPad Pro (tablet-9)
    if (iPadProConfig.isIPadPro) {
      const iPadProEnhancements = getIPadProMonacoConfig();
      return { ...baseConfig, ...iPadProEnhancements };
    }

    return baseConfig;
  };

  // Initialize Monaco editor
  useEffect(() => {
    if (!editorRef.current) return;

    // Create editor instance
    const editor = monaco.editor.create(editorRef.current, getMobileEditorConfig());
    editorInstanceRef.current = editor;
    
    // Restore scroll position
    if (scroll.line > 1 || scroll.column > 1) {
      editor.revealLineInCenter(scroll.line);
      editor.setPosition({ lineNumber: scroll.line, column: scroll.column });
    }

    // Track content changes
    editor.onDidChangeModelContent(() => {
      setHasUnsavedChanges(true);
    });
    
    // Save scroll position on changes
    editor.onDidScrollChange(() => {
      const position = editor.getPosition();
      if (position) {
        setScroll(position.lineNumber, position.column);
      }
    });
    
    // Save cursor position (also represents scroll)
    editor.onDidChangeCursorPosition((e) => {
      setScroll(e.position.lineNumber, e.position.column);
    });

    // Handle touch gestures with intelligent pinch/swipe separation
    let touchStartX = 0;
    let touchStartY = 0;
    let initialDistance = 0;
    let isPinching = false;
    
    const getTouchDistance = (touches: TouchList): number => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        initialDistance = getTouchDistance(e.touches);
        isPinching = false; // Reset pinch detection
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const currentDistance = getTouchDistance(e.touches);
        const distanceChange = Math.abs(currentDistance - initialDistance);
        
        // If distance changed >20px, it's a pinch gesture (handled by usePinchZoom)
        if (distanceChange > 20) {
          isPinching = true;
          return; // Skip swipe detection during pinch
        }
        
        // Only detect swipe if not pinching and tablet mode disabled
        if (!isPinching && !isTablet) {
          const deltaX = e.touches[0].clientX - touchStartX;
          const deltaY = e.touches[0].clientY - touchStartY;
          
          // Two-finger horizontal swipe for undo/redo (mobile only)
          if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 30) {
            e.preventDefault();
            
            if (deltaX < 0) {
              // Swipe left = undo
              editor.trigger('keyboard', 'undo', {});
            } else {
              // Swipe right = redo
              editor.trigger('keyboard', 'redo', {});
            }
            
            touchStartX = e.touches[0].clientX; // Reset
          }
        }
      }
    };

    editorRef.current.addEventListener('touchstart', handleTouchStart, { passive: true });
    editorRef.current.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Cleanup
    return () => {
      editor.dispose();
      if (editorRef.current) {
        editorRef.current.removeEventListener('touchstart', handleTouchStart);
        editorRef.current.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [isTablet]); // FIX: Include isTablet so listeners re-register when mode changes

  // Update content when prop changes
  useEffect(() => {
    if (editorInstanceRef.current && initialContent) {
      const currentValue = editorInstanceRef.current.getValue();
      if (currentValue !== initialContent) {
        editorInstanceRef.current.setValue(initialContent);
        setHasUnsavedChanges(false);
      }
    }
  }, [initialContent]);

  // Keyboard toolbar actions
  const insertText = (text: string) => {
    const editor = editorInstanceRef.current;
    if (!editor) return;
    
    const selection = editor.getSelection();
    if (selection) {
      editor.executeEdits('mobile-keyboard', [{
        range: selection,
        text,
      }]);
      editor.focus();
    }
  };

  const handleSave = () => {
    const content = editorInstanceRef.current?.getValue() || '';
    if (fileId) {
      saveFileMutation.mutate(content);
    }
    onSave?.(content);
  };

  const handleUndo = () => {
    editorInstanceRef.current?.trigger('keyboard', 'undo', {});
  };

  const handleRedo = () => {
    editorInstanceRef.current?.trigger('keyboard', 'redo', {});
  };

  const handleFind = () => {
    editorInstanceRef.current?.trigger('keyboard', 'actions.find', {});
  };

  const triggerSuggestions = async () => {
    const editor = editorInstanceRef.current;
    if (!editor) return;
    
    const model = editor.getModel();
    const position = editor.getPosition();
    if (!model || !position) return;
    
    // Get word at cursor for filtering
    const wordInfo = model.getWordUntilPosition(position);
    
    // Generate common completions based on language
    const language = model.getLanguageId();
    const commonCompletions = getCommonCompletions(language, wordInfo.word);
    
    setCompletions(commonCompletions);
    setCompletionFilter('');
    setShowCompletionModal(true);
  };
  
  const getCommonCompletions = (language: string, prefix: string): CompletionItem[] => {
    const jsCompletions: CompletionItem[] = [
      { label: 'console.log', kind: 'Function', detail: 'Log to console', insertText: 'console.log($1)' },
      { label: 'function', kind: 'Keyword', detail: 'Function declaration', insertText: 'function ${1:name}($2) {\n\t$3\n}' },
      { label: 'const', kind: 'Keyword', detail: 'Constant declaration', insertText: 'const ${1:name} = $2;' },
      { label: 'let', kind: 'Keyword', detail: 'Variable declaration', insertText: 'let ${1:name} = $2;' },
      { label: 'if', kind: 'Keyword', detail: 'If statement', insertText: 'if ($1) {\n\t$2\n}' },
      { label: 'for', kind: 'Keyword', detail: 'For loop', insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t$3\n}' },
      { label: 'while', kind: 'Keyword', detail: 'While loop', insertText: 'while ($1) {\n\t$2\n}' },
      { label: 'switch', kind: 'Keyword', detail: 'Switch statement', insertText: 'switch ($1) {\n\tcase $2:\n\t\t$3\n\t\tbreak;\n\tdefault:\n\t\t$4\n}' },
      { label: 'try', kind: 'Keyword', detail: 'Try-catch', insertText: 'try {\n\t$1\n} catch (error) {\n\t$2\n}' },
      { label: 'async', kind: 'Keyword', detail: 'Async function', insertText: 'async function ${1:name}($2) {\n\t$3\n}' },
      { label: 'await', kind: 'Keyword', detail: 'Await expression', insertText: 'await $1' },
      { label: 'import', kind: 'Keyword', detail: 'Import statement', insertText: "import { $1 } from '$2';" },
      { label: 'export', kind: 'Keyword', detail: 'Export statement', insertText: 'export $1' },
      { label: 'class', kind: 'Keyword', detail: 'Class declaration', insertText: 'class ${1:ClassName} {\n\tconstructor($2) {\n\t\t$3\n\t}\n}' },
      { label: 'interface', kind: 'Keyword', detail: 'TypeScript interface', insertText: 'interface ${1:InterfaceName} {\n\t$2\n}' },
      { label: 'type', kind: 'Keyword', detail: 'TypeScript type alias', insertText: 'type ${1:TypeName} = $2;' },
      { label: 'useState', kind: 'Function', detail: 'React hook', insertText: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState($2);' },
      { label: 'useEffect', kind: 'Function', detail: 'React hook', insertText: 'useEffect(() => {\n\t$1\n}, [$2]);' },
      { label: 'map', kind: 'Method', detail: 'Array method', insertText: 'map(${1:item} => $2)' },
      { label: 'filter', kind: 'Method', detail: 'Array method', insertText: 'filter(${1:item} => $2)' },
      { label: 'reduce', kind: 'Method', detail: 'Array method', insertText: 'reduce((${1:acc}, ${2:item}) => $3, $4)' },
    ];
    
    if (language === 'javascript' || language === 'typescript') {
      return jsCompletions.filter(c => 
        !prefix || c.label.toLowerCase().startsWith(prefix.toLowerCase())
      );
    }
    
    return [];
  };
  
  const insertCompletion = (completion: CompletionItem) => {
    const editor = editorInstanceRef.current;
    if (!editor) return;
    
    const position = editor.getPosition();
    if (!position) return;
    
    // Get word at cursor to replace
    const model = editor.getModel();
    if (!model) return;
    
    const wordInfo = model.getWordUntilPosition(position);
    const range = new monaco.Range(
      position.lineNumber,
      wordInfo.startColumn,
      position.lineNumber,
      wordInfo.endColumn
    );
    
    // Handle snippet placeholders (simple implementation)
    let textToInsert = completion.insertText;
    textToInsert = textToInsert.replace(/\$\d+/g, ''); // Remove $1, $2, etc.
    textToInsert = textToInsert.replace(/\$\{(\d+):([^}]+)\}/g, '$2'); // Replace ${1:name} with name
    
    editor.executeEdits('mobile-completion', [{
      range,
      text: textToInsert,
    }]);
    
    setShowCompletionModal(false);
    editor.focus();
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
    <div className={cn('flex flex-col h-full bg-[#1e1e1e]', className)}>
      {/* Mobile Keyboard Toolbar */}
      {showKeyboardToolbar && !readOnly && (
        <motion.div 
          className="flex items-center gap-1 px-2 py-2 bg-[#252526] border-b border-[#3e3e42] overflow-x-auto mobile-hide-scrollbar"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          data-testid="mobile-editor-keyboard-toolbar"
        >
          {/* Special Keys */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-xs font-mono bg-[#3e3e42] hover:bg-[#4e4e52] active:scale-95 touch-manipulation"
            onClick={() => insertText('\t')}
            data-testid="mobile-editor-tab"
          >
            Tab
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs bg-[#3e3e42] hover:bg-[#4e4e52] active:scale-95 touch-manipulation"
            onClick={() => insertText('{')}
            data-testid="mobile-editor-brace"
          >
            {'{'}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs bg-[#3e3e42] hover:bg-[#4e4e52] active:scale-95 touch-manipulation"
            onClick={() => insertText('}')}
            data-testid="mobile-editor-close-brace"
          >
            {'}'}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs bg-[#3e3e42] hover:bg-[#4e4e52] active:scale-95 touch-manipulation"
            onClick={() => insertText('(')}
            data-testid="mobile-editor-paren"
          >
            (
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs bg-[#3e3e42] hover:bg-[#4e4e52] active:scale-95 touch-manipulation"
            onClick={() => insertText(')')}
            data-testid="mobile-editor-close-paren"
          >
            )
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs bg-[#3e3e42] hover:bg-[#4e4e52] active:scale-95 touch-manipulation"
            onClick={() => insertText(';')}
            data-testid="mobile-editor-semicolon"
          >
            ;
          </Button>
          
          <div className="w-px h-6 bg-[#3e3e42] mx-1" />
          
          {/* Editor Actions */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 hover:bg-[#4e4e52] active:scale-95 touch-manipulation"
            onClick={handleUndo}
            data-testid="mobile-editor-undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 hover:bg-[#4e4e52] active:scale-95 touch-manipulation"
            onClick={handleRedo}
            data-testid="mobile-editor-redo"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 hover:bg-[#4e4e52] active:scale-95 touch-manipulation"
            onClick={triggerSuggestions}
            data-testid="mobile-editor-suggest"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 hover:bg-[#4e4e52] active:scale-95 touch-manipulation"
            onClick={handleFind}
            data-testid="mobile-editor-find"
          >
            <Search className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              'h-8 px-3 active:scale-95 touch-manipulation',
              hasUnsavedChanges && 'bg-[#F26207] hover:bg-[#F26207]/90 text-white'
            )}
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saveFileMutation.isPending}
            data-testid="mobile-editor-save"
          >
            <Save className="h-4 w-4 mr-1" />
            {hasUnsavedChanges ? 'Save' : 'Saved'}
          </Button>
          
          <div className="flex-1" />
          
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 hover:bg-[#4e4e52] active:scale-95 touch-manipulation"
            onClick={() => setShowKeyboardToolbar(false)}
            data-testid="mobile-editor-hide-toolbar"
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
      
      {/* Show toolbar toggle when hidden */}
      {!showKeyboardToolbar && !readOnly && (
        <motion.div 
          className="absolute top-2 right-2 z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 rounded-full shadow-lg touch-manipulation"
            onClick={() => setShowKeyboardToolbar(true)}
            data-testid="mobile-editor-show-toolbar"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
      
      {/* Monaco Editor Container */}
      <div 
        ref={editorRef} 
        className="flex-1 min-h-0"
        data-testid="mobile-editor-monaco"
      />
      
      {/* Gesture hint overlay (shows briefly on mount) */}
      <motion.div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-4 py-2 rounded-full pointer-events-none"
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 0, y: 10 }}
        transition={{ delay: 3, duration: 0.5 }}
      >
        Swipe with 2 fingers to undo/redo
      </motion.div>
      
      {/* Code Completion Modal - Touch-Friendly */}
      <AnimatePresence>
        {showCompletionModal && (
          <>
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCompletionModal(false)}
              data-testid="mobile-completion-backdrop"
            />
            
            {/* Completion Modal */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-[#252526] rounded-t-2xl shadow-2xl z-50 max-h-[60vh] flex flex-col"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 500 }}
              data-testid="mobile-completion-modal"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#3e3e42]">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#F26207]" />
                  <h3 className="font-semibold text-white">Code Completions</h3>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-[#3e3e42] touch-manipulation"
                  onClick={() => setShowCompletionModal(false)}
                  data-testid="mobile-completion-close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Search/Filter Input */}
              <div className="px-4 py-2 border-b border-[#3e3e42]">
                <Input
                  type="text"
                  placeholder="Filter completions..."
                  value={completionFilter}
                  onChange={(e) => setCompletionFilter(e.target.value)}
                  className="bg-[#3e3e42] border-none text-white placeholder:text-gray-400 h-9 touch-manipulation"
                  data-testid="mobile-completion-filter"
                />
              </div>
              
              {/* Completions List */}
              <ScrollArea className="flex-1 mobile-hide-scrollbar">
                <div className="p-2">
                  {filteredCompletions.length > 0 ? (
                    filteredCompletions.map((completion, index) => (
                      <motion.button
                        key={`${completion.label}-${index}`}
                        className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-[#3e3e42] active:bg-[#4e4e52] transition-colors touch-manipulation text-left"
                        onClick={() => insertCompletion(completion)}
                        whileTap={{ scale: 0.98 }}
                        data-testid={`mobile-completion-item-${index}`}
                      >
                        {/* Kind Icon */}
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[#3e3e42] rounded font-mono text-sm text-[#F26207]">
                          {getCompletionKindIcon(completion.kind)}
                        </div>
                        
                        {/* Completion Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-white truncate">
                            {completion.label}
                          </div>
                          {completion.detail && (
                            <div className="text-xs text-gray-400 truncate mt-0.5">
                              {completion.detail}
                            </div>
                          )}
                        </div>
                        
                        {/* Kind Badge */}
                        <div className="flex-shrink-0 px-2 py-1 bg-[#3e3e42] rounded text-xs text-gray-400 font-mono">
                          {completion.kind}
                        </div>
                      </motion.button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm" data-testid="mobile-completion-empty">
                      {completionFilter ? 'No matching completions' : 'No completions available'}
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              {/* Completion Count */}
              <div className="px-4 py-2 border-t border-[#3e3e42] text-xs text-gray-400 text-center">
                {filteredCompletions.length} {filteredCompletions.length === 1 ? 'completion' : 'completions'}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
