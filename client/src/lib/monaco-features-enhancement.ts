/**
 * Monaco Editor Features Enhancement
 * Adds VS Code-level advanced features to Monaco editor
 */

import * as monaco from 'monaco-editor';

export interface MonacoEnhancementConfig {
  enableMultiCursor?: boolean;
  enableCodeActions?: boolean;
  enableNavigation?: boolean;
  enableRefactoring?: boolean;
  enableAdvancedSearch?: boolean;
  enableIntelliSense?: boolean;
  projectId?: string | number;
}

/**
 * Note: Monaco's editor.addCommand() returns string | null (command ID), not IDisposable.
 * Commands are managed by Monaco's keybinding service and don't need manual disposal.
 * Only providers (languages.register*) return actual IDisposables that must be disposed.
 */

/**
 * Enhanced multi-cursor editing features
 */
export class MultiCursorEnhancement {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private disposables: monaco.IDisposable[] = [];

  constructor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
    this.registerCommands();
  }

  private registerCommands() {
    // Note: addCommand returns command ID (string|null), not IDisposable
    // Monaco manages command lifecycle, no disposal needed

    // Add selection to next find match (Ctrl+D / Cmd+D)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
      this.editor.trigger('keyboard', 'editor.action.addSelectionToNextFindMatch', {});
    });

    // Select all occurrences of find match (Ctrl+Shift+L / Cmd+Shift+L)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
      this.editor.trigger('keyboard', 'editor.action.selectHighlights', {});
    });

    // Add cursor above (Ctrl+Alt+Up / Cmd+Option+Up)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => {
      this.editor.trigger('keyboard', 'editor.action.insertCursorAbove', {});
    });

    // Add cursor below (Ctrl+Alt+Down / Cmd+Option+Down)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
      this.editor.trigger('keyboard', 'editor.action.insertCursorBelow', {});
    });

    // Column selection (Ctrl+Shift+Alt+Arrow)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
      this.editor.trigger('keyboard', 'cursorColumnSelectDown', {});
    });

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => {
      this.editor.trigger('keyboard', 'cursorColumnSelectUp', {});
    });
  }

  dispose() {
    this.disposables.forEach(d => d?.dispose?.());
    this.disposables = [];
  }
}

/**
 * Code navigation features (Go to Definition, Find References, etc.)
 */
export class CodeNavigationEnhancement {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private disposables: monaco.IDisposable[] = [];

  constructor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
    this.registerCommands();
    this.registerProviders();
  }

  private registerCommands() {
    // Go to Definition (F12)
    this.editor.addCommand(monaco.KeyCode.F12, () => {

      this.editor.trigger('keyboard', 'editor.action.revealDefinition', {});

    });

    // Peek Definition (Alt+F12)
    this.editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.F12, () => {

      this.editor.trigger('keyboard', 'editor.action.peekDefinition', {});

    });

    // Find All References (Shift+F12)
    this.editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.F12, () => {

      this.editor.trigger('keyboard', 'editor.action.goToReferences', {});

    });

    // Go to Symbol in File (Ctrl+Shift+O / Cmd+Shift+O)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyO, () => {

      this.editor.trigger('keyboard', 'editor.action.quickOutline', {});

    });

    // Go to Symbol in Workspace (Ctrl+T / Cmd+T)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyT, () => {

      this.editor.trigger('keyboard', 'editor.action.quickOpen', { prefix: '#' });

    });

    // Go to Line (Ctrl+G / Cmd+G)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG, () => {

      this.editor.trigger('keyboard', 'editor.action.gotoLine', {});

    });
  }

  private registerProviders() {
    const model = this.editor.getModel();
    if (!model) return;

    const language = model.getLanguageId();

    // Register Definition Provider (for simple cases)
    this.disposables.push(
      monaco.languages.registerDefinitionProvider(language, {
        provideDefinition: (model, position, token) => {
          // This would typically call a language server
          // For now, we'll return null to use Monaco's built-in providers
          return null;
        },
      })
    );

    // Register Reference Provider
    this.disposables.push(
      monaco.languages.registerReferenceProvider(language, {
        provideReferences: (model, position, context, token) => {
          // This would typically call a language server
          return null;
        },
      })
    );

    // Register Document Symbol Provider (for outline)
    this.disposables.push(
      monaco.languages.registerDocumentSymbolProvider(language, {
        provideDocumentSymbols: (model, token) => {
          // Parse the document and return symbols
          // This enables the outline view and breadcrumbs
          return null;
        },
      })
    );
  }

  dispose() {
    this.disposables.forEach(d => d?.dispose?.());
    this.disposables = [];
  }
}

/**
 * Code refactoring features
 */
export class CodeRefactoringEnhancement {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private disposables: monaco.IDisposable[] = [];

  constructor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
    this.registerCommands();
    this.registerProviders();
  }

  private registerCommands() {
    // Rename Symbol (F2)
    this.editor.addCommand(monaco.KeyCode.F2, () => {

      this.editor.trigger('keyboard', 'editor.action.rename', {});

    });

    // Format Document (Shift+Alt+F)
    this.editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {

      this.editor.trigger('keyboard', 'editor.action.formatDocument', {});

    });

    // Format Selection (Ctrl+K Ctrl+F / Cmd+K Cmd+F)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {

      // This is a chord command - wait for second key
          this.editor.trigger('keyboard', 'editor.action.formatSelection', {});

    });

    // Organize Imports (Shift+Alt+O)
    this.editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyO, () => {

      this.editor.trigger('keyboard', 'editor.action.organizeImports', {});

    });

    // Quick Fix (Ctrl+. / Cmd+.)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period, () => {

      this.editor.trigger('keyboard', 'editor.action.quickFix', {});

    });

    // Trigger Suggest (Ctrl+Space)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {

      this.editor.trigger('keyboard', 'editor.action.triggerSuggest', {});

    });
  }

  private registerProviders() {
    const model = this.editor.getModel();
    if (!model) return;

    const language = model.getLanguageId();

    // Register Rename Provider
    this.disposables.push(
      monaco.languages.registerRenameProvider(language, {
        provideRenameEdits: (model, position, newName, token) => {
          // Find all references and create edits
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          const edits: monaco.languages.IWorkspaceTextEdit[] = [];
          const matches = model.findMatches(
            word.word,
            true,
            false,
            true,
            null,
            true
          );

          matches.forEach(match => {
            edits.push({
              resource: model.uri,
              versionId: model.getVersionId(),
              textEdit: {
                range: match.range,
                text: newName,
              },
            });
          });

          return { edits };
        },
        resolveRenameLocation: (model, position, token) => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          return {
            range: new monaco.Range(
              position.lineNumber,
              word.startColumn,
              position.lineNumber,
              word.endColumn
            ),
            text: word.word,
          };
        },
      })
    );

    // Register Code Action Provider (Quick Fixes)
    this.disposables.push(
      monaco.languages.registerCodeActionProvider(language, {
        provideCodeActions: (model, range, context, token) => {
          const actions: monaco.languages.CodeAction[] = [];

          // Example: Extract to function
          if (!range.isEmpty()) {
            actions.push({
              title: 'Extract to function',
              kind: 'refactor.extract.function',
              command: {
                id: 'editor.action.extractFunction',
                title: 'Extract to function',
              },
            });

            actions.push({
              title: 'Extract to constant',
              kind: 'refactor.extract.constant',
              command: {
                id: 'editor.action.extractConstant',
                title: 'Extract to constant',
              },
            });
          }

          // Add organize imports action
          actions.push({
            title: 'Organize Imports',
            kind: 'source.organizeImports',
            command: {
              id: 'editor.action.organizeImports',
              title: 'Organize Imports',
            },
          });

          return { actions, dispose: () => {} };
        },
      })
    );
  }

  dispose() {
    this.disposables.forEach(d => d?.dispose?.());
    this.disposables = [];
  }
}

/**
 * Enhanced search and replace features
 */
export class AdvancedSearchEnhancement {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private disposables: monaco.IDisposable[] = [];

  constructor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
    this.registerCommands();
  }

  private registerCommands() {
    // Find with selection (Ctrl+F / Cmd+F)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {

      this.editor.trigger('keyboard', 'actions.find', {});

    });

    // Replace (Ctrl+H / Cmd+H)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {

      this.editor.trigger('keyboard', 'editor.action.startFindReplaceAction', {});

    });

    // Find Next (F3)
    this.editor.addCommand(monaco.KeyCode.F3, () => {

      this.editor.trigger('keyboard', 'editor.action.nextMatchFindAction', {});

    });

    // Find Previous (Shift+F3)
    this.editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.F3, () => {

      this.editor.trigger('keyboard', 'editor.action.previousMatchFindAction', {});

    });

    // Toggle Find Regex (Alt+R)
    this.editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyR, () => {

      this.editor.trigger('keyboard', 'toggleFindRegex', {});

    });

    // Toggle Find Whole Word (Alt+W)
    this.editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyW, () => {

      this.editor.trigger('keyboard', 'toggleFindWholeWord', {});

    });

    // Toggle Find Case Sensitive (Alt+C)
    this.editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyC, () => {

      this.editor.trigger('keyboard', 'toggleFindCaseSensitive', {});

    });
  }

  /**
   * Advanced find with regex and capture groups
   */
  findWithRegex(pattern: string, flags: string = 'g'): monaco.editor.FindMatch[] {
    const model = this.editor.getModel();
    if (!model) return [];

    try {
      const regex = new RegExp(pattern, flags);
      return model.findMatches(pattern, true, true, true, null, true);
    } catch (error) {
      console.error('Invalid regex pattern:', error);
      return [];
    }
  }

  /**
   * Replace with capture group substitution
   */
  replaceWithCaptureGroups(
    searchPattern: string,
    replacePattern: string,
    flags: string = 'g'
  ): number {
    const model = this.editor.getModel();
    if (!model) return 0;

    const matches = this.findWithRegex(searchPattern, flags);
    let replacementCount = 0;

    const edits: monaco.editor.IIdentifiedSingleEditOperation[] = matches.map(match => {
      replacementCount++;
      return {
        range: match.range,
        text: replacePattern,
        forceMoveMarkers: true,
      };
    });

    this.editor.executeEdits('advanced-replace', edits);
    return replacementCount;
  }

  dispose() {
    this.disposables.forEach(d => d?.dispose?.());
    this.disposables = [];
  }
}

/**
 * Enhanced IntelliSense features
 */
export class IntelliSenseEnhancement {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private disposables: monaco.IDisposable[] = [];

  constructor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
    this.registerCommands();
    this.registerProviders();
  }

  private registerCommands() {
    // Trigger Parameter Hints (Ctrl+Shift+Space / Cmd+Shift+Space)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Space, () => {

      this.editor.trigger('keyboard', 'editor.action.triggerParameterHints', {});

    });

    // Trigger Suggest (Ctrl+Space / Cmd+Space)
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {

      this.editor.trigger('keyboard', 'editor.action.triggerSuggest', {});

    });
  }

  private registerProviders() {
    const model = this.editor.getModel();
    if (!model) return;

    const language = model.getLanguageId();

    // Register Signature Help Provider (Parameter Hints)
    this.disposables.push(
      monaco.languages.registerSignatureHelpProvider(language, {
        signatureHelpTriggerCharacters: ['(', ','],
        signatureHelpRetriggerCharacters: [','],
        provideSignatureHelp: (model, position, token, context) => {
          // This would typically call a language server
          // For now, return null to use built-in providers
          return null;
        },
      })
    );

    // Register Hover Provider (enhanced tooltips)
    this.disposables.push(
      monaco.languages.registerHoverProvider(language, {
        provideHover: (model, position, token) => {
          // Provide rich hover information
          return null;
        },
      })
    );

    // Register Completion Item Provider (enhanced autocomplete)
    this.disposables.push(
      monaco.languages.registerCompletionItemProvider(language, {
        triggerCharacters: ['.', ':', '<', '"', "'", '/', '@'],
        provideCompletionItems: (model, position, context, token) => {
          // Provide context-aware completions
          return null;
        },
      })
    );
  }

  dispose() {
    this.disposables.forEach(d => d?.dispose?.());
    this.disposables = [];
  }
}

/**
 * AI Code Action Event Types - for communication with UI components
 */
export interface AICodeActionEvent {
  type: 'loading' | 'result' | 'error';
  action: string;
  code?: string;
  result?: any;
  error?: string;
}

/**
 * Dispatch AI code action events to the window for UI components to listen
 */
function dispatchAIEvent(event: AICodeActionEvent) {
  window.dispatchEvent(new CustomEvent('ai-code-action', { detail: event }));
}

/**
 * AI-Powered Code Actions Enhancement (Replit Agent 3 style)
 * Provides inline AI quick fixes with lightbulb and right-click context menu
 */
export class AICodeActionsEnhancement {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private disposables: monaco.IDisposable[] = [];
  private projectId: string | number;
  private loadingDecorations: string[] = [];

  constructor(editor: monaco.editor.IStandaloneCodeEditor, projectId?: string | number) {
    this.editor = editor;
    this.projectId = projectId || 'unknown';
    this.registerProviders();
    this.registerCodeLensProvider();
  }

  private registerProviders() {
    const model = this.editor.getModel();
    if (!model) return;

    // Register AI Code Action Provider for ALL languages (shows in lightbulb menu)
    // Using comprehensive language list + wildcard patterns for broad coverage
    const supportedLanguages = [
      // Web languages
      'typescript', 'javascript', 'typescriptreact', 'javascriptreact', 
      'html', 'css', 'scss', 'less', 'sass', 'stylus',
      // Backend languages  
      'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'ruby', 'php',
      'scala', 'kotlin', 'swift', 'objective-c', 'perl',
      // Data & Config
      'json', 'yaml', 'xml', 'toml', 'ini',
      // Scripting & Shell
      'shell', 'bash', 'powershell', 'sh',
      // Database
      'sql', 'mysql', 'pgsql', 'plpgsql',
      // Markup & Docs
      'markdown', 'plaintext', 'latex', 'restructuredtext',
      // Other
      'lua', 'r', 'julia', 'dart', 'elixir', 'erlang', 'haskell',
      'clojure', 'fsharp', 'ocaml', 'zig', 'nim', 'v',
      'dockerfile', 'makefile', 'cmake', 'nginx', 'graphql',
    ];
    
    this.disposables.push(
      monaco.languages.registerCodeActionProvider(supportedLanguages, {
        provideCodeActions: (model, range, context, token) => {
          const actions: monaco.languages.CodeAction[] = [];
          
          // Get selected text or current line content
          const selection = this.editor.getSelection();
          let selectedText = '';
          let effectiveRange = range;
          
          if (selection && !selection.isEmpty()) {
            selectedText = model.getValueInRange(selection);
            effectiveRange = selection;
          } else {
            // Get the current line if no selection
            const lineNumber = range.startLineNumber;
            selectedText = model.getLineContent(lineNumber);
            effectiveRange = new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber));
          }

          const hasContent = selectedText.trim().length > 0;
          if (!hasContent) return { actions, dispose: () => {} };

          // Check if there are diagnostics in the selection (for QuickFix kind)
          const hasDiagnostics = context.markers && context.markers.length > 0;
          
          // Use QuickFix for lines with errors, Refactor for other selections
          const primaryKind = hasDiagnostics ? 'quickfix' : 'refactor.rewrite';

          // 🔥 AI-POWERED QUICK FIXES (Replit Agent 3 style)
          // Using dynamic kind based on diagnostics for better lightbulb visibility
          actions.push({
            title: '✨ AI Explain',
            kind: primaryKind,
            command: {
              id: 'ai.explain',
              title: 'AI Explain Code',
              arguments: [selectedText, effectiveRange],
            },
            isPreferred: hasDiagnostics,
          });

          actions.push({
            title: '🐛 AI Debug',
            kind: hasDiagnostics ? 'quickfix' : 'refactor.rewrite',
            command: {
              id: 'ai.debug',
              title: 'AI Debug Code',
              arguments: [selectedText, effectiveRange],
            },
            isPreferred: hasDiagnostics,
          });

          actions.push({
            title: '🧪 AI Generate Tests',
            kind: 'refactor.rewrite',
            command: {
              id: 'ai.test',
              title: 'AI Generate Tests',
              arguments: [selectedText, effectiveRange],
            },
          });

          actions.push({
            title: '📝 AI Document',
            kind: 'refactor.rewrite',
            command: {
              id: 'ai.document',
              title: 'AI Add Documentation',
              arguments: [selectedText, effectiveRange],
            },
          });

          actions.push({
            title: '⚡ AI Optimize',
            kind: 'refactor.rewrite',
            command: {
              id: 'ai.optimize',
              title: 'AI Optimize Code',
              arguments: [selectedText, effectiveRange],
            },
          });

          actions.push({
            title: '🔍 AI Review',
            kind: 'refactor.rewrite',
            command: {
              id: 'ai.review',
              title: 'AI Code Review',
              arguments: [selectedText, effectiveRange],
            },
          });

          actions.push({
            title: '🔎 AI Search Similar',
            kind: 'refactor.rewrite',
            command: {
              id: 'ai.search',
              title: 'AI Search Similar Code',
              arguments: [selectedText, effectiveRange],
            },
          });

          return { actions, dispose: () => {} };
        },
      })
    );

    // Register command handlers for AI actions
    this.registerAICommandHandlers();
  }

  /**
   * Register Code Lens provider for function-level AI actions
   */
  private registerCodeLensProvider() {
    // Comprehensive language support for function-level AI actions
    const supportedLanguages = [
      'typescript', 'javascript', 'typescriptreact', 'javascriptreact',
      'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'ruby', 'php',
      'scala', 'kotlin', 'swift', 'lua', 'dart', 'elixir', 'haskell',
    ];
    
    this.disposables.push(
      monaco.languages.registerCodeLensProvider(supportedLanguages, {
        provideCodeLenses: (model, token) => {
          const lenses: monaco.languages.CodeLens[] = [];
          const text = model.getValue();
          
          // Simple function detection patterns
          const functionPatterns = [
            /^[\s]*(async\s+)?function\s+(\w+)\s*\(/gm,  // function declarations
            /^[\s]*(export\s+)?(async\s+)?function\s+(\w+)\s*\(/gm,  // exported functions
            /^[\s]*(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(/gm,  // arrow functions
            /^[\s]*(public|private|protected)?\s*(async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/gm,  // class methods
            /^[\s]*def\s+(\w+)\s*\(/gm,  // Python functions
            /^[\s]*async\s+def\s+(\w+)\s*\(/gm,  // Python async functions
          ];

          for (const pattern of functionPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
              const position = model.getPositionAt(match.index);
              const line = position.lineNumber;
              
              // Add AI actions as code lenses above functions
              lenses.push({
                range: new monaco.Range(line, 1, line, 1),
                command: {
                  id: 'ai.explain.function',
                  title: '✨ Explain',
                  arguments: [this.getFunctionBody(model, line)],
                },
              });
              
              lenses.push({
                range: new monaco.Range(line, 1, line, 1),
                command: {
                  id: 'ai.test.function',
                  title: '🧪 Test',
                  arguments: [this.getFunctionBody(model, line)],
                },
              });
              
              lenses.push({
                range: new monaco.Range(line, 1, line, 1),
                command: {
                  id: 'ai.document.function',
                  title: '📝 Doc',
                  arguments: [this.getFunctionBody(model, line)],
                },
              });
            }
          }

          return { lenses, dispose: () => {} };
        },
        resolveCodeLens: (model, codeLens, token) => {
          return codeLens;
        },
      })
    );

    // Register function-level AI command handlers
    this.registerFunctionAICommands();
  }

  /**
   * Get the body of a function starting at the given line
   */
  private getFunctionBody(model: monaco.editor.ITextModel, startLine: number): string {
    const lines: string[] = [];
    let braceCount = 0;
    let foundOpen = false;
    
    for (let i = startLine; i <= Math.min(startLine + 100, model.getLineCount()); i++) {
      const line = model.getLineContent(i);
      lines.push(line);
      
      for (const char of line) {
        if (char === '{' || char === ':') {
          braceCount++;
          foundOpen = true;
        } else if (char === '}') {
          braceCount--;
        }
      }
      
      if (foundOpen && braceCount <= 0) break;
    }
    
    return lines.join('\n');
  }

  /**
   * Register function-level AI commands
   */
  private registerFunctionAICommands() {
    // Function Explain
    this.editor.addAction({
      id: 'ai.explain.function',
      label: '✨ AI Explain Function',
      run: async (editor, code) => {
        await this.handleAIAction('explain', code as string);
      },
    });

    // Function Test
    this.editor.addAction({
      id: 'ai.test.function',
      label: '🧪 AI Test Function',
      run: async (editor, code) => {
        await this.handleAIAction('test', code as string);
      },
    });

    // Function Document
    this.editor.addAction({
      id: 'ai.document.function',
      label: '📝 AI Document Function',
      run: async (editor, code) => {
        await this.handleAIAction('document', code as string);
      },
    });
  }

  private registerAICommandHandlers() {
    // Handler for AI Explain
    this.editor.addAction({
      id: 'ai.explain',
      label: '✨ AI Explain',
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 1,
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyE],
      run: async (editor, ...args) => {
        const [code] = args as [string];
        await this.handleAIAction('explain', code || this.getSelectedOrLineCode());
      },
    });

    // Handler for AI Debug
    this.editor.addAction({
      id: 'ai.debug',
      label: '🐛 AI Debug',
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 2,
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyB],
      run: async (editor, ...args) => {
        const [code] = args as [string];
        await this.handleAIAction('debug', code || this.getSelectedOrLineCode());
      },
    });

    // Handler for AI Test
    this.editor.addAction({
      id: 'ai.test',
      label: '🧪 AI Generate Tests',
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 3,
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyT],
      run: async (editor, ...args) => {
        const [code] = args as [string];
        await this.handleAIAction('test', code || this.getSelectedOrLineCode());
      },
    });

    // Handler for AI Document
    this.editor.addAction({
      id: 'ai.document',
      label: '📝 AI Document',
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 4,
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyD],
      run: async (editor, ...args) => {
        const [code] = args as [string];
        await this.handleAIAction('document', code || this.getSelectedOrLineCode());
      },
    });

    // Handler for AI Optimize
    this.editor.addAction({
      id: 'ai.optimize',
      label: '⚡ AI Optimize',
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 5,
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyO],
      run: async (editor, ...args) => {
        const [code] = args as [string];
        await this.handleAIAction('optimize', code || this.getSelectedOrLineCode());
      },
    });

    // Handler for AI Review
    this.editor.addAction({
      id: 'ai.review',
      label: '🔍 AI Review',
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 6,
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyR],
      run: async (editor, ...args) => {
        const [code] = args as [string];
        await this.handleAIAction('review', code || this.getSelectedOrLineCode());
      },
    });

    // Handler for AI Search
    this.editor.addAction({
      id: 'ai.search',
      label: '🔎 AI Search Similar',
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 7,
      run: async (editor, ...args) => {
        const [code] = args as [string];
        await this.handleAIAction('search', code || this.getSelectedOrLineCode());
      },
    });
  }

  /**
   * Get selected text or current line content
   */
  private getSelectedOrLineCode(): string {
    const model = this.editor.getModel();
    if (!model) return '';
    
    const selection = this.editor.getSelection();
    if (selection && !selection.isEmpty()) {
      return model.getValueInRange(selection);
    }
    
    const position = this.editor.getPosition();
    if (position) {
      return model.getLineContent(position.lineNumber);
    }
    
    return '';
  }

  /**
   * Show loading decoration on the editor
   */
  private showLoadingState(range: monaco.Range | null) {
    if (!range) return;
    
    this.loadingDecorations = this.editor.deltaDecorations(this.loadingDecorations, [
      {
        range,
        options: {
          isWholeLine: true,
          className: 'ai-loading-line',
          glyphMarginClassName: 'ai-loading-glyph',
          glyphMarginHoverMessage: { value: '⏳ AI is processing...' },
          afterContentClassName: 'ai-loading-spinner',
        },
      },
    ]);
  }

  /**
   * Hide loading decoration
   */
  private hideLoadingState() {
    this.loadingDecorations = this.editor.deltaDecorations(this.loadingDecorations, []);
  }

  private async handleAIAction(action: string, code: string) {
    if (!code || code.trim().length === 0) {
      dispatchAIEvent({
        type: 'error',
        action,
        error: 'No code selected. Please select some code first.',
      });
      return;
    }

    const selection = this.editor.getSelection();
    
    try {
      // Show loading state
      console.log(`[AI ${action}] Processing code...`, code.substring(0, 100));
      this.showLoadingState(selection);
      
      // Dispatch loading event for UI
      dispatchAIEvent({
        type: 'loading',
        action,
        code: code.substring(0, 200),
      });

      // Call AI backend API
      const response = await fetch(`/api/ai/code-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          code,
          projectId: this.projectId,
          language: this.editor.getModel()?.getLanguageId() || 'typescript',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `AI action failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Hide loading state
      this.hideLoadingState();
      
      // Handle different action types
      if (action === 'optimize' || action === 'document') {
        // Apply code suggestion if available
        if (result.suggestion && selection) {
          this.applyCodeSuggestion(result.suggestion, selection);
        }
      }

      // Dispatch result event for UI to show
      dispatchAIEvent({
        type: 'result',
        action,
        code: code.substring(0, 200),
        result,
      });

      console.log(`[AI ${action}] Success:`, result);
    } catch (error) {
      // Hide loading state
      this.hideLoadingState();
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[AI ${action}] Error:`, error);
      
      // Dispatch error event for UI
      dispatchAIEvent({
        type: 'error',
        action,
        error: errorMessage,
      });
    }
  }

  private applyCodeSuggestion(suggestion: string, range: monaco.Selection) {
    if (!suggestion) return;

    this.editor.executeEdits('ai-suggestion', [{
      range,
      text: suggestion,
      forceMoveMarkers: true,
    }]);
    
    // Focus editor after applying suggestion
    this.editor.focus();
  }

  dispose() {
    this.disposables.forEach(d => d?.dispose?.());
    this.disposables = [];
  }
}

/**
 * Main enhancement class that orchestrates all features
 */
export class MonacoFeaturesEnhancement {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private config: MonacoEnhancementConfig;
  private multiCursor?: MultiCursorEnhancement;
  private navigation?: CodeNavigationEnhancement;
  private refactoring?: CodeRefactoringEnhancement;
  private search?: AdvancedSearchEnhancement;
  private intelliSense?: IntelliSenseEnhancement;
  private aiCodeActions?: AICodeActionsEnhancement;

  constructor(editor: monaco.editor.IStandaloneCodeEditor, config: MonacoEnhancementConfig = {}) {
    this.editor = editor;
    this.config = {
      enableMultiCursor: true,
      enableCodeActions: true,
      enableNavigation: true,
      enableRefactoring: true,
      enableAdvancedSearch: true,
      enableIntelliSense: true,
      ...config,
    };

    this.initialize();
  }

  private initialize() {
    if (this.config.enableMultiCursor) {
      this.multiCursor = new MultiCursorEnhancement(this.editor);
    }

    if (this.config.enableNavigation) {
      this.navigation = new CodeNavigationEnhancement(this.editor);
    }

    if (this.config.enableRefactoring) {
      this.refactoring = new CodeRefactoringEnhancement(this.editor);
    }

    if (this.config.enableAdvancedSearch) {
      this.search = new AdvancedSearchEnhancement(this.editor);
    }

    if (this.config.enableIntelliSense) {
      this.intelliSense = new IntelliSenseEnhancement(this.editor);
    }

    // 🔥 REPLIT AGENT 3: AI-powered inline code actions
    if (this.config.enableCodeActions) {
      this.aiCodeActions = new AICodeActionsEnhancement(this.editor, this.config.projectId);
    }
  }

  /**
   * Get the search enhancement instance for advanced operations
   */
  getSearchEnhancement(): AdvancedSearchEnhancement | undefined {
    return this.search;
  }

  /**
   * Dispose all enhancements
   */
  dispose() {
    this.multiCursor?.dispose();
    this.navigation?.dispose();
    this.refactoring?.dispose();
    this.search?.dispose();
    this.intelliSense?.dispose();
    this.aiCodeActions?.dispose();
  }
}

/**
 * Register Monaco features enhancement on an editor instance
 */
export function registerMonacoEnhancements(
  editor: monaco.editor.IStandaloneCodeEditor,
  config?: MonacoEnhancementConfig
): MonacoFeaturesEnhancement {
  return new MonacoFeaturesEnhancement(editor, config);
}
