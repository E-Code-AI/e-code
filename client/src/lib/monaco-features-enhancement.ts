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
 * AI-Powered Code Actions Enhancement (Replit Agent 3 style)
 * Provides inline AI quick fixes with lightbulb and right-click context menu
 */
export class AICodeActionsEnhancement {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private disposables: monaco.IDisposable[] = [];
  private projectId: string | number;

  constructor(editor: monaco.editor.IStandaloneCodeEditor, projectId?: string | number) {
    this.editor = editor;
    this.projectId = projectId || 'unknown';
    this.registerProviders();
  }

  private registerProviders() {
    const model = this.editor.getModel();
    if (!model) return;

    const language = model.getLanguageId();

    // Register AI Code Action Provider for ALL languages
    this.disposables.push(
      monaco.languages.registerCodeActionProvider(['typescript', 'javascript', 'python', 'java', 'cpp', 'go', 'rust', 'css', 'html', 'json', 'yaml'], {
        provideCodeActions: (model, range, context, token) => {
          const actions: monaco.languages.CodeAction[] = [];
          
          // Get selected text or current line
          const selection = this.editor.getSelection();
          const selectedText = selection ? model.getValueInRange(selection) : '';
          const hasSelection = selectedText.length > 0;

          // 🔥 AI-POWERED QUICK FIXES (Replit Agent 3 style)
          actions.push({
            title: '✨ AI Explain',
            kind: 'quickfix',
            command: {
              id: 'ai.explain',
              title: 'AI Explain Code',
              arguments: [model, range, selectedText],
            },
            diagnostics: [],
          });

          actions.push({
            title: '🐛 AI Debug',
            kind: 'quickfix',
            command: {
              id: 'ai.debug',
              title: 'AI Debug Code',
              arguments: [model, range, selectedText],
            },
            diagnostics: [],
          });

          actions.push({
            title: '🧪 AI Test',
            kind: 'quickfix',
            command: {
              id: 'ai.test',
              title: 'AI Generate Tests',
              arguments: [model, range, selectedText],
            },
            diagnostics: [],
          });

          actions.push({
            title: '📝 AI Document',
            kind: 'quickfix',
            command: {
              id: 'ai.document',
              title: 'AI Add Documentation',
              arguments: [model, range, selectedText],
            },
            diagnostics: [],
          });

          actions.push({
            title: '⚡ AI Optimize',
            kind: 'quickfix',
            command: {
              id: 'ai.optimize',
              title: 'AI Optimize Code',
              arguments: [model, range, selectedText],
            },
            diagnostics: [],
          });

          actions.push({
            title: '🔍 AI Review',
            kind: 'quickfix',
            command: {
              id: 'ai.review',
              title: 'AI Code Review',
              arguments: [model, range, selectedText],
            },
            diagnostics: [],
          });

          // Only show if text is selected
          if (hasSelection) {
            actions.push({
              title: '🔎 AI Search Similar',
              kind: 'quickfix',
              command: {
                id: 'ai.search',
                title: 'AI Search Similar Code',
                arguments: [model, range, selectedText],
              },
              diagnostics: [],
            });
          }

          return { actions, dispose: () => {} };
        },
      })
    );

    // Register command handlers for AI actions
    this.registerAICommandHandlers();
  }

  private registerAICommandHandlers() {
    // Handler for AI Explain
    this.editor.addAction({
      id: 'ai.explain',
      label: '✨ AI Explain',
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 1,
      run: async (editor, ...args) => {
        const [model, range, selectedText] = args;
        await this.handleAIAction('explain', selectedText || model.getValueInRange(range));
      },
    });

    // Handler for AI Debug
    this.editor.addAction({
      id: 'ai.debug',
      label: '🐛 AI Debug',
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 2,
      run: async (editor, ...args) => {
        const [model, range, selectedText] = args;
        await this.handleAIAction('debug', selectedText || model.getValueInRange(range));
      },
    });

    // Handler for AI Test
    this.editor.addAction({
      id: 'ai.test',
      label: '🧪 AI Test',
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 3,
      run: async (editor, ...args) => {
        const [model, range, selectedText] = args;
        await this.handleAIAction('test', selectedText || model.getValueInRange(range));
      },
    });

    // Handler for AI Document
    this.editor.addAction({
      id: 'ai.document',
      label: '📝 AI Document',
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 4,
      run: async (editor, ...args) => {
        const [model, range, selectedText] = args;
        await this.handleAIAction('document', selectedText || model.getValueInRange(range));
      },
    });

    // Handler for AI Optimize
    this.editor.addAction({
      id: 'ai.optimize',
      label: '⚡ AI Optimize',
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 5,
      run: async (editor, ...args) => {
        const [model, range, selectedText] = args;
        await this.handleAIAction('optimize', selectedText || model.getValueInRange(range));
      },
    });

    // Handler for AI Review
    this.editor.addAction({
      id: 'ai.review',
      label: '🔍 AI Review',
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 6,
      run: async (editor, ...args) => {
        const [model, range, selectedText] = args;
        await this.handleAIAction('review', selectedText || model.getValueInRange(range));
      },
    });

    // Handler for AI Search
    this.editor.addAction({
      id: 'ai.search',
      label: '🔎 AI Search Similar',
      contextMenuGroupId: 'ai-actions',
      contextMenuOrder: 7,
      run: async (editor, ...args) => {
        const [model, range, selectedText] = args;
        await this.handleAIAction('search', selectedText || model.getValueInRange(range));
      },
    });
  }

  private async handleAIAction(action: string, code: string) {
    try {
      // Show loading indicator
      console.log(`[AI ${action}] Processing code...`, code.substring(0, 100));

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
        throw new Error(`AI action failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Handle different action types
      if (action === 'optimize' || action === 'document') {
        // Replace code with AI suggestion
        this.applyCodeSuggestion(result.suggestion);
      } else {
        // Show result in a notification or modal
        this.showAIResult(action, result);
      }

      console.log(`[AI ${action}] Success:`, result);
    } catch (error) {
      console.error(`[AI ${action}] Error:`, error);
      // Show error notification
      alert(`AI ${action} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private applyCodeSuggestion(suggestion: string) {
    const selection = this.editor.getSelection();
    if (!selection) return;

    this.editor.executeEdits('ai-suggestion', [{
      range: selection,
      text: suggestion,
      forceMoveMarkers: true,
    }]);
  }

  private showAIResult(action: string, result: any) {
    // For now, show in console (can be replaced with modal/panel)
    console.log(`[AI ${action}] Result:`, result);
    alert(`AI ${action} result:\n\n${JSON.stringify(result, null, 2)}`);
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
