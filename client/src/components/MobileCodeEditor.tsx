import { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { Editor } from '@monaco-editor/react';
import { useTheme } from '@/components/ThemeProvider';
import { useIsMobile, useIsTouch, useOrientation } from '@/hooks/use-responsive';
import { Button } from '@/components/ui/button';
import { TouchOptimizedButton } from '@/components/ui/touch-optimized';
import {
  Undo,
  Redo,
  Search,
  Replace,
  Code,
  Type,
  Indent,
  Outdent,
  ChevronUp,
  ChevronDown,
  Keyboard,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  className?: string;
  readOnly?: boolean;
}

export function MobileCodeEditor({
  value,
  onChange,
  language = 'javascript',
  theme,
  options = {},
  className,
  readOnly = false,
}: MobileCodeEditorProps) {
  const { theme: currentTheme } = useTheme();
  const isMobile = useIsMobile();
  const isTouch = useIsTouch();
  const orientation = useOrientation();
  
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [showToolbar, setShowToolbar] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentLine, setCurrentLine] = useState(1);
  const [totalLines, setTotalLines] = useState(1);

  // Mobile-optimized editor options
  const mobileOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    // Core editing options
    wordWrap: 'on',
    lineNumbers: isMobile ? 'off' : 'on',
    minimap: { enabled: !isMobile },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    
    // Mobile-specific optimizations
    fontSize: isMobile ? 16 : 14, // Prevent zoom on mobile
    fontFamily: isMobile 
      ? 'SF Mono, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New", monospace'
      : 'Fira Code, SF Mono, Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New", monospace',
    
    // Touch-friendly options
    mouseWheelZoom: !isTouch,
    multiCursorModifier: isTouch ? 'alt' : 'ctrlCmd',
    
    // Mobile viewport optimizations
    scrollbar: {
      vertical: isMobile ? 'hidden' : 'auto',
      horizontal: isMobile ? 'hidden' : 'auto',
      useShadows: false,
      verticalScrollbarSize: isMobile ? 8 : 14,
      horizontalScrollbarSize: isMobile ? 8 : 14,
    },
    
    // Better mobile UX
    quickSuggestions: !isMobile, // Disable on mobile to prevent interference
    suggestOnTriggerCharacters: !isMobile,
    acceptSuggestionOnEnter: isMobile ? 'off' : 'on',
    tabCompletion: isMobile ? 'off' : 'on',
    
    // Gesture support
    dragAndDrop: !isTouch,
    selectionHighlight: true,
    occurrencesHighlight: true,
    
    // Performance optimizations
    renderLineHighlight: isMobile ? 'none' : 'line',
    renderControlCharacters: false,
    renderWhitespace: isMobile ? 'none' : 'selection',
    
    ...options,
  };

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Mobile-specific setup
    if (isMobile) {
      // Add touch gesture support
      setupMobileGestures(editor);
      
      // Track cursor position
      editor.onDidChangeCursorPosition((e) => {
        setCurrentLine(e.position.lineNumber);
      });
      
      // Track content changes
      editor.onDidChangeModelContent(() => {
        const model = editor.getModel();
        if (model) {
          setTotalLines(model.getLineCount());
        }
      });
    }
    
    // Custom keyboard shortcuts for mobile
    if (isTouch) {
      setupMobileKeyboardShortcuts(editor);
    }
  };

  const setupMobileGestures = (editor: monaco.editor.IStandaloneCodeEditor) => {
    const domNode = editor.getDomNode();
    if (!domNode) return;

    let touchStartY = 0;
    let touchStartTime = 0;

    // Double-tap to select word
    domNode.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    });

    // Three-finger tap to toggle toolbar
    domNode.addEventListener('touchstart', (e) => {
      if (e.touches.length === 3) {
        e.preventDefault();
        setShowToolbar(!showToolbar);
        if ('vibrate' in navigator) {
          navigator.vibrate(20);
        }
      }
    });
  };

  const setupMobileKeyboardShortcuts = (editor: monaco.editor.IStandaloneCodeEditor) => {
    // Custom actions for mobile
    editor.addAction({
      id: 'mobile-undo',
      label: 'Undo',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ],
      run: () => editor.trigger('keyboard', 'undo', null),
    });

    editor.addAction({
      id: 'mobile-redo',
      label: 'Redo',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ],
      run: () => editor.trigger('keyboard', 'redo', null),
    });
  };

  const mobileActions = [
    {
      id: 'undo',
      label: 'Undo',
      icon: <Undo className="h-4 w-4" />,
      action: () => editorRef.current?.trigger('keyboard', 'undo', null),
    },
    {
      id: 'redo',
      label: 'Redo',
      icon: <Redo className="h-4 w-4" />,
      action: () => editorRef.current?.trigger('keyboard', 'redo', null),
    },
    {
      id: 'search',
      label: 'Search',
      icon: <Search className="h-4 w-4" />,
      action: () => editorRef.current?.trigger('keyboard', 'actions.find', null),
    },
    {
      id: 'replace',
      label: 'Replace',
      icon: <Replace className="h-4 w-4" />,
      action: () => editorRef.current?.trigger('keyboard', 'editor.action.startFindReplaceAction', null),
    },
    {
      id: 'indent',
      label: 'Indent',
      icon: <Indent className="h-4 w-4" />,
      action: () => editorRef.current?.trigger('keyboard', 'editor.action.indentLines', null),
    },
    {
      id: 'outdent',
      label: 'Outdent',
      icon: <Outdent className="h-4 w-4" />,
      action: () => editorRef.current?.trigger('keyboard', 'editor.action.outdentLines', null),
    },
  ];

  const insertCommonText = (text: string) => {
    if (!editorRef.current) return;
    
    const selection = editorRef.current.getSelection();
    if (selection) {
      editorRef.current.executeEdits('mobile-insert', [
        {
          range: selection,
          text,
        },
      ]);
    }
  };

  const commonInserts = [
    { label: '{}', text: '{\n  \n}' },
    { label: '[]', text: '[]' },
    { label: '()', text: '()' },
    { label: '=>', text: ' => ' },
    { label: 'log', text: 'console.log()' },
    { label: 'func', text: 'function () {\n  \n}' },
  ];

  return (
    <div className={cn(
      'relative flex flex-col',
      isFullscreen && 'fixed inset-0 z-50 bg-background',
      className
    )}>
      {/* Mobile Toolbar */}
      {isMobile && showToolbar && (
        <div className="flex flex-col border-b border-border bg-background/95 backdrop-blur-sm">
          {/* Main Actions */}
          <div className="flex items-center justify-between p-2 space-x-1">
            <div className="flex items-center space-x-1 flex-1 overflow-x-auto">
              {mobileActions.map((action) => (
                <TouchOptimizedButton
                  key={action.id}
                  size="sm"
                  variant="ghost"
                  onClick={action.action}
                  className="flex-shrink-0"
                >
                  {action.icon}
                </TouchOptimizedButton>
              ))}
            </div>
            
            <div className="flex items-center space-x-1">
              <TouchOptimizedButton
                size="sm"
                variant="ghost"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </TouchOptimizedButton>
              
              <TouchOptimizedButton
                size="sm"
                variant="ghost"
                onClick={() => setShowToolbar(false)}
              >
                <ChevronUp className="h-4 w-4" />
              </TouchOptimizedButton>
            </div>
          </div>
          
          {/* Common Inserts */}
          <div className="flex items-center space-x-1 p-2 pt-0 overflow-x-auto">
            {commonInserts.map((insert) => (
              <TouchOptimizedButton
                key={insert.label}
                size="sm"
                variant="outline"
                onClick={() => insertCommonText(insert.text)}
                className="flex-shrink-0 text-xs"
              >
                {insert.label}
              </TouchOptimizedButton>
            ))}
          </div>
        </div>
      )}
      
      {/* Show toolbar button when hidden */}
      {isMobile && !showToolbar && (
        <TouchOptimizedButton
          size="sm"
          variant="ghost"
          onClick={() => setShowToolbar(true)}
          className="absolute top-2 right-2 z-10"
        >
          <ChevronDown className="h-4 w-4" />
        </TouchOptimizedButton>
      )}

      {/* Editor */}
      <div className="flex-1 relative">
        <Editor
          value={value}
          onChange={(newValue) => onChange(newValue || '')}
          language={language}
          theme={theme || (currentTheme === 'dark' ? 'vs-dark' : 'vs-light')}
          options={mobileOptions}
          onMount={handleEditorDidMount}
        />
        
        {/* Line indicator for mobile */}
        {isMobile && (
          <div className="absolute bottom-2 right-2 bg-background/90 rounded px-2 py-1 text-xs text-muted-foreground">
            {currentLine}/{totalLines}
          </div>
        )}
      </div>
      
      {/* Mobile keyboard helper */}
      {isMobile && isTouch && (
        <div className="border-t border-border bg-background/95 backdrop-blur-sm p-2">
          <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
            <span>3-finger tap: toggle toolbar</span>
            <span>•</span>
            <span>Swipe: navigate</span>
          </div>
        </div>
      )}
    </div>
  );
}