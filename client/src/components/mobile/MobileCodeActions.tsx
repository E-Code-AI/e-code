/**
 * Mobile Code Actions Panel
 * Provides touch-optimized access to Monaco advanced features
 * Brings mobile to 100% feature parity with desktop
 */

import { useState, useEffect } from 'react';
import * as monaco from 'monaco-editor';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Search,
  Replace,
  FileEdit,
  GitBranch,
  Navigation,
  Code2,
  Wand2,
  ChevronRight,
  X,
  ArrowUpDown,
  Braces,
  Terminal,
  ListTree,
  MousePointerClick,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface MobileCodeActionsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  className?: string;
}

interface QuickAction {
  id: string;
  icon: typeof Sparkles;
  label: string;
  description: string;
  action: () => void;
  badge?: string;
  color: string;
}

export function MobileCodeActions({ editor, className }: MobileCodeActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [symbolList, setSymbolList] = useState<any[]>([]);
  const { toast } = useToast();

  // Get current word/selection info
  const getCurrentContext = () => {
    if (!editor) return { word: '', hasSelection: false, position: null };
    const selection = editor.getSelection();
    const position = editor.getPosition();
    const model = editor.getModel();

    if (!model || !position) return { word: '', hasSelection: false, position: null };

    const word = model.getWordAtPosition(position);
    const hasSelection = selection ? !selection.isEmpty() : false;

    return {
      word: word?.word || '',
      hasSelection,
      position,
    };
  };

  // Quick Actions
  const quickActions: QuickAction[] = [
    {
      id: 'goto-definition',
      icon: Navigation,
      label: 'Go to Definition',
      description: 'Navigate to symbol definition',
      color: 'text-blue-500',
      action: () => {
        editor?.trigger('mobile', 'editor.action.revealDefinition', {});
        toast({ title: 'Finding definition...' });
        setIsOpen(false);
      },
    },
    {
      id: 'find-references',
      icon: GitBranch,
      label: 'Find All References',
      description: 'Show all usages',
      color: 'text-purple-500',
      action: () => {
        editor?.trigger('mobile', 'editor.action.goToReferences', {});
        toast({ title: 'Finding references...' });
        setIsOpen(false);
      },
    },
    {
      id: 'rename',
      icon: FileEdit,
      label: 'Rename Symbol',
      description: 'Rename all occurrences',
      color: 'text-orange-500',
      action: () => {
        editor?.trigger('mobile', 'editor.action.rename', {});
        setIsOpen(false);
      },
    },
    {
      id: 'format',
      icon: Braces,
      label: 'Format Code',
      description: 'Auto-format document',
      color: 'text-green-500',
      action: () => {
        editor?.trigger('mobile', 'editor.action.formatDocument', {});
        toast({ title: 'Code formatted', description: 'Document formatted successfully' });
        setIsOpen(false);
      },
    },
    {
      id: 'quick-fix',
      icon: Wand2,
      label: 'Quick Fix',
      description: 'Show available fixes',
      color: 'text-yellow-500',
      badge: 'AI',
      action: () => {
        editor?.trigger('mobile', 'editor.action.quickFix', {});
        setIsOpen(false);
      },
    },
    {
      id: 'organize-imports',
      icon: ArrowUpDown,
      label: 'Organize Imports',
      description: 'Sort and clean imports',
      color: 'text-indigo-500',
      action: () => {
        editor?.trigger('mobile', 'editor.action.organizeImports', {});
        toast({ title: 'Imports organized' });
        setIsOpen(false);
      },
    },
    {
      id: 'find',
      icon: Search,
      label: 'Find',
      description: 'Search in file',
      color: 'text-cyan-500',
      action: () => {
        setActivePanel('find');
      },
    },
    {
      id: 'replace',
      icon: Replace,
      label: 'Find & Replace',
      description: 'Search and replace text',
      color: 'text-pink-500',
      action: () => {
        setActivePanel('replace');
      },
    },
    {
      id: 'symbols',
      icon: ListTree,
      label: 'Go to Symbol',
      description: 'Navigate to function/class',
      color: 'text-teal-500',
      action: () => {
        loadSymbols();
        setActivePanel('symbols');
      },
    },
    {
      id: 'suggestions',
      icon: Sparkles,
      label: 'Show Suggestions',
      description: 'Trigger IntelliSense',
      color: 'text-violet-500',
      badge: 'AI',
      action: () => {
        editor?.trigger('mobile', 'editor.action.triggerSuggest', {});
        toast({ title: 'Suggestions triggered' });
        setIsOpen(false);
      },
    },
    {
      id: 'command-palette',
      icon: Terminal,
      label: 'Command Palette',
      description: 'All editor commands',
      color: 'text-slate-500',
      action: () => {
        editor?.trigger('mobile', 'editor.action.quickCommand', {});
        setIsOpen(false);
      },
    },
  ];

  // Load document symbols
  const loadSymbols = async () => {
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    try {
      const symbols = await monaco.languages.executeDocumentSymbolProvider(
        model.uri.toString(),
        {} as any
      );

      if (symbols && Array.isArray(symbols)) {
        setSymbolList(symbols);
      }
    } catch (error) {
      console.error('Failed to load symbols:', error);
    }
  };

  // Find in document
  const handleFind = () => {
    if (!editor || !searchQuery) return;

    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(searchQuery, true, false, true, null, true);

    if (matches.length > 0) {
      editor.setSelection(matches[0].range);
      editor.revealLineInCenter(matches[0].range.startLineNumber);
      toast({
        title: `Found ${matches.length} match${matches.length > 1 ? 'es' : ''}`,
        description: `Showing first occurrence`
      });
    } else {
      toast({ title: 'No matches found', variant: 'destructive' });
    }

    setActivePanel(null);
    setIsOpen(false);
  };

  // Replace in document
  const handleReplace = () => {
    if (!editor || !searchQuery) return;

    const model = editor.getModel();
    if (!model) return;

    const matches = model.findMatches(searchQuery, true, false, true, null, true);

    if (matches.length > 0) {
      const edits = matches.map(match => ({
        range: match.range,
        text: replaceQuery,
        forceMoveMarkers: true,
      }));

      editor.executeEdits('mobile-replace', edits);
      toast({
        title: `Replaced ${matches.length} occurrence${matches.length > 1 ? 's' : ''}`,
        description: `"${searchQuery}" → "${replaceQuery}"`
      });
    } else {
      toast({ title: 'No matches found', variant: 'destructive' });
    }

    setActivePanel(null);
    setIsOpen(false);
  };

  // Jump to symbol
  const handleSymbolClick = (symbol: any) => {
    if (!editor) return;

    const range = symbol.selectionRange || symbol.range;
    editor.setSelection(range);
    editor.revealLineInCenter(range.startLineNumber);

    setActivePanel(null);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        className={cn('fixed bottom-20 right-4 z-40', className)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Button
          size="lg"
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-[var(--ecode-orange)] to-[var(--ecode-blue)] hover:shadow-xl transition-shadow"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Zap className="h-6 w-6" />
          )}
        </Button>
      </motion.div>

      {/* Actions Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-[var(--ecode-surface)] rounded-t-3xl shadow-2xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-[var(--ecode-border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--ecode-text)]">
                      Code Actions
                    </h3>
                    <p className="text-sm text-[var(--ecode-text-secondary)]">
                      {activePanel ? 'Back to actions' : 'Touch-optimized shortcuts'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (activePanel) {
                        setActivePanel(null);
                      } else {
                        setIsOpen(false);
                      }
                    }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="max-h-[60vh]">
                <AnimatePresence mode="wait">
                  {!activePanel ? (
                    /* Main Actions Grid */
                    <motion.div
                      key="main"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="grid grid-cols-2 gap-3 p-4"
                    >
                      {quickActions.map((action) => (
                        <motion.button
                          key={action.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={action.action}
                          className="relative p-4 rounded-xl bg-[var(--ecode-sidebar)] hover:bg-[var(--ecode-sidebar-hover)] transition-colors text-left"
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn('p-2 rounded-lg bg-[var(--ecode-surface)]', action.color)}>
                              <action.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-[var(--ecode-text)] truncate">
                                  {action.label}
                                </span>
                                {action.badge && (
                                  <Badge variant="secondary" className="text-xs">
                                    {action.badge}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-[var(--ecode-text-secondary)] mt-1">
                                {action.description}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </motion.div>
                  ) : activePanel === 'find' ? (
                    /* Find Panel */
                    <motion.div
                      key="find"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-4 space-y-4"
                    >
                      <div>
                        <label className="text-sm font-medium text-[var(--ecode-text)] mb-2 block">
                          Find in file
                        </label>
                        <Input
                          placeholder="Search text..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-[var(--ecode-sidebar)]"
                          onKeyDown={(e) => e.key === 'Enter' && handleFind()}
                          autoFocus
                        />
                      </div>
                      <Button
                        onClick={handleFind}
                        className="w-full bg-[var(--ecode-orange)] hover:bg-[var(--ecode-orange)]/90"
                        size="lg"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Find
                      </Button>
                    </motion.div>
                  ) : activePanel === 'replace' ? (
                    /* Replace Panel */
                    <motion.div
                      key="replace"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-4 space-y-4"
                    >
                      <div>
                        <label className="text-sm font-medium text-[var(--ecode-text)] mb-2 block">
                          Find
                        </label>
                        <Input
                          placeholder="Search text..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-[var(--ecode-sidebar)]"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[var(--ecode-text)] mb-2 block">
                          Replace with
                        </label>
                        <Input
                          placeholder="Replacement text..."
                          value={replaceQuery}
                          onChange={(e) => setReplaceQuery(e.target.value)}
                          className="bg-[var(--ecode-sidebar)]"
                          onKeyDown={(e) => e.key === 'Enter' && handleReplace()}
                        />
                      </div>
                      <Button
                        onClick={handleReplace}
                        className="w-full bg-[var(--ecode-orange)] hover:bg-[var(--ecode-orange)]/90"
                        size="lg"
                      >
                        <Replace className="h-4 w-4 mr-2" />
                        Replace All
                      </Button>
                    </motion.div>
                  ) : activePanel === 'symbols' ? (
                    /* Symbols Panel */
                    <motion.div
                      key="symbols"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-4 space-y-2"
                    >
                      {symbolList.length > 0 ? (
                        symbolList.map((symbol, index) => (
                          <button
                            key={index}
                            onClick={() => handleSymbolClick(symbol)}
                            className="w-full p-3 rounded-lg bg-[var(--ecode-sidebar)] hover:bg-[var(--ecode-sidebar-hover)] transition-colors text-left flex items-center justify-between"
                          >
                            <div>
                              <span className="text-sm font-medium text-[var(--ecode-text)]">
                                {symbol.name}
                              </span>
                              <p className="text-xs text-[var(--ecode-text-secondary)]">
                                Line {(symbol.selectionRange || symbol.range).startLineNumber}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-[var(--ecode-text-secondary)]" />
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-8 text-[var(--ecode-text-secondary)]">
                          <ListTree className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No symbols found in this file</p>
                        </div>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </ScrollArea>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
