import * as vscode from 'vscode';
import { ECodeCopilotProvider } from './copilotProvider';
import { ECodeAIService } from './aiService';
import { CodeAnalyzer } from './codeAnalyzer';
import { SuggestionProvider } from './suggestionProvider';

let copilotProvider: ECodeCopilotProvider;
let aiService: ECodeAIService;
let codeAnalyzer: CodeAnalyzer;
let suggestionProvider: SuggestionProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('E-Code Copilot extension is now active!');

    // Initialize services
    aiService = new ECodeAIService(context);
    codeAnalyzer = new CodeAnalyzer();
    copilotProvider = new ECodeCopilotProvider(aiService, codeAnalyzer);
    suggestionProvider = new SuggestionProvider(aiService, codeAnalyzer);

    // Register inline completion provider
    const inlineCompletionProvider = vscode.languages.registerInlineCompletionItemProvider(
        { scheme: 'file' },
        suggestionProvider
    );

    // Register commands
    const commands = [
        vscode.commands.registerCommand('ecodeCopilot.explainCode', () => explainCode()),
        vscode.commands.registerCommand('ecodeCopilot.generateTests', () => generateTests()),
        vscode.commands.registerCommand('ecodeCopilot.optimizeCode', () => optimizeCode()),
        vscode.commands.registerCommand('ecodeCopilot.generateDocs', () => generateDocs()),
        vscode.commands.registerCommand('ecodeCopilot.findBugs', () => findBugs()),
        vscode.commands.registerCommand('ecodeCopilot.refactorCode', () => refactorCode()),
        vscode.commands.registerCommand('ecodeCopilot.translateCode', () => translateCode()),
        vscode.commands.registerCommand('ecodeCopilot.generateComments', () => generateComments())
    ];

    // Register all commands and providers
    context.subscriptions.push(inlineCompletionProvider, ...commands);

    // Setup status bar
    setupStatusBar(context);

    // Setup auto-suggestion if enabled
    setupAutoSuggestion(context);
}

async function explainCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    
    if (!selectedText) {
        vscode.window.showErrorMessage('Please select some code to explain');
        return;
    }

    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Explaining code with E-Code AI...',
            cancellable: false
        }, async () => {
            const explanation = await copilotProvider.explainCode(
                selectedText, 
                editor.document.languageId,
                getContextInfo(editor)
            );

            showExplanationPanel(explanation, selectedText);
        });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to explain code: ${error.message}`);
    }
}

async function generateTests() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    
    if (!selectedText) {
        vscode.window.showErrorMessage('Please select some code to generate tests for');
        return;
    }

    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating tests with E-Code AI...',
            cancellable: false
        }, async () => {
            const tests = await copilotProvider.generateTests(
                selectedText,
                editor.document.languageId,
                getContextInfo(editor)
            );

            await createTestFile(tests, editor.document.fileName);
        });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to generate tests: ${error.message}`);
    }
}

async function optimizeCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    
    if (!selectedText) {
        vscode.window.showErrorMessage('Please select some code to optimize');
        return;
    }

    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Optimizing code with E-Code AI...',
            cancellable: false
        }, async () => {
            const optimized = await copilotProvider.optimizeCode(
                selectedText,
                editor.document.languageId,
                getContextInfo(editor)
            );

            await showOptimizationDiff(selectedText, optimized.code, optimized.explanation);
        });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to optimize code: ${error.message}`);
    }
}

async function generateDocs() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    
    if (!selectedText) {
        vscode.window.showErrorMessage('Please select some code to document');
        return;
    }

    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating documentation with E-Code AI...',
            cancellable: false
        }, async () => {
            const docs = await copilotProvider.generateDocumentation(
                selectedText,
                editor.document.languageId,
                getContextInfo(editor)
            );

            await insertDocumentation(editor, docs);
        });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to generate documentation: ${error.message}`);
    }
}

async function findBugs() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    
    if (!selectedText) {
        vscode.window.showErrorMessage('Please select some code to analyze for bugs');
        return;
    }

    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing code for bugs with E-Code AI...',
            cancellable: false
        }, async () => {
            const bugs = await copilotProvider.findBugs(
                selectedText,
                editor.document.languageId,
                getContextInfo(editor)
            );

            showBugAnalysisPanel(bugs, selectedText);
        });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to analyze code: ${error.message}`);
    }
}

async function refactorCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    
    if (!selectedText) {
        vscode.window.showErrorMessage('Please select some code to refactor');
        return;
    }

    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Suggesting refactoring with E-Code AI...',
            cancellable: false
        }, async () => {
            const refactoring = await copilotProvider.suggestRefactoring(
                selectedText,
                editor.document.languageId,
                getContextInfo(editor)
            );

            await showRefactoringDiff(selectedText, refactoring.code, refactoring.explanation);
        });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to suggest refactoring: ${error.message}`);
    }
}

async function translateCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    
    if (!selectedText) {
        vscode.window.showErrorMessage('Please select some code to translate');
        return;
    }

    // Ask user for target language
    const targetLanguage = await vscode.window.showQuickPick([
        'python', 'javascript', 'typescript', 'java', 'cpp', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin'
    ], {
        placeHolder: 'Select target programming language'
    });

    if (!targetLanguage) {
        return;
    }

    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Translating code to ${targetLanguage} with E-Code AI...`,
            cancellable: false
        }, async () => {
            const translation = await copilotProvider.translateCode(
                selectedText,
                editor.document.languageId,
                targetLanguage,
                getContextInfo(editor)
            );

            await createTranslatedFile(translation.code, targetLanguage, translation.explanation);
        });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to translate code: ${error.message}`);
    }
}

async function generateComments() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    
    if (!selectedText) {
        vscode.window.showErrorMessage('Please select some code to add comments to');
        return;
    }

    try {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating comments with E-Code AI...',
            cancellable: false
        }, async () => {
            const commented = await copilotProvider.addComments(
                selectedText,
                editor.document.languageId,
                getContextInfo(editor)
            );

            await replaceSelectedText(editor, commented);
        });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to generate comments: ${error.message}`);
    }
}

// Helper functions
function getContextInfo(editor: vscode.TextEditor): any {
    return {
        fileName: editor.document.fileName,
        language: editor.document.languageId,
        lineNumber: editor.selection.start.line + 1,
        surroundingCode: getSurroundingCode(editor),
        projectRoot: vscode.workspace.getWorkspaceFolder(editor.document.uri)?.uri.fsPath
    };
}

function getSurroundingCode(editor: vscode.TextEditor): string {
    const document = editor.document;
    const selection = editor.selection;
    
    const startLine = Math.max(0, selection.start.line - 5);
    const endLine = Math.min(document.lineCount - 1, selection.end.line + 5);
    
    const range = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
    return document.getText(range);
}

function showExplanationPanel(explanation: string, code: string) {
    const panel = vscode.window.createWebviewPanel(
        'eCodeExplanation',
        'E-Code AI Code Explanation',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; }
                .code { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
                .explanation { line-height: 1.6; }
                h2 { color: #0066cc; }
            </style>
        </head>
        <body>
            <h2>Code Explanation</h2>
            <div class="code"><pre>${code}</pre></div>
            <div class="explanation">${explanation.replace(/\n/g, '<br>')}</div>
        </body>
        </html>
    `;
}

async function showOptimizationDiff(original: string, optimized: string, explanation: string) {
    // Create temporary files for diff view
    const originalUri = vscode.Uri.parse(`untitled:Original Code`);
    const optimizedUri = vscode.Uri.parse(`untitled:Optimized Code`);
    
    await vscode.workspace.openTextDocument(originalUri).then(doc => {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(originalUri, new vscode.Range(0, 0, doc.lineCount, 0), original);
        return vscode.workspace.applyEdit(edit);
    });
    
    await vscode.workspace.openTextDocument(optimizedUri).then(doc => {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(optimizedUri, new vscode.Range(0, 0, doc.lineCount, 0), optimized);
        return vscode.workspace.applyEdit(edit);
    });

    await vscode.commands.executeCommand('vscode.diff', originalUri, optimizedUri, 'Code Optimization');
    
    vscode.window.showInformationMessage(`Optimization: ${explanation}`);
}

function setupStatusBar(context: vscode.ExtensionContext) {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(robot) E-Code AI";
    statusBarItem.tooltip = "E-Code AI Assistant is active";
    statusBarItem.show();
    
    context.subscriptions.push(statusBarItem);
}

function setupAutoSuggestion(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('ecodeCopilot');
    if (!config.get('autoSuggest')) {
        return;
    }

    // Auto-suggestion will be handled by the SuggestionProvider
    vscode.window.showInformationMessage('E-Code AI auto-suggestions enabled');
}

async function createTestFile(tests: string, originalFileName: string) {
    const ext = originalFileName.split('.').pop();
    const testFileName = originalFileName.replace(`.${ext}`, `.test.${ext}`);
    
    const testUri = vscode.Uri.file(testFileName);
    const document = await vscode.workspace.openTextDocument(testUri);
    
    const editor = await vscode.window.showTextDocument(document);
    await editor.edit(editBuilder => {
        editBuilder.insert(new vscode.Position(0, 0), tests);
    });
}

async function insertDocumentation(editor: vscode.TextEditor, docs: string) {
    const selection = editor.selection;
    await editor.edit(editBuilder => {
        editBuilder.insert(selection.start, docs + '\n');
    });
}

function showBugAnalysisPanel(bugs: any[], code: string) {
    const panel = vscode.window.createWebviewPanel(
        'eCodeBugAnalysis',
        'E-Code AI Bug Analysis',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const bugsHtml = bugs.map(bug => `
        <div class="bug ${bug.severity}">
            <h3>🐛 ${bug.title}</h3>
            <p><strong>Severity:</strong> ${bug.severity}</p>
            <p><strong>Line:</strong> ${bug.line}</p>
            <p>${bug.description}</p>
            ${bug.suggestion ? `<p><strong>Suggestion:</strong> ${bug.suggestion}</p>` : ''}
        </div>
    `).join('');

    panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; }
                .bug { margin: 15px 0; padding: 15px; border-radius: 5px; border-left: 4px solid; }
                .high { border-color: #e74c3c; background: #fdf2f2; }
                .medium { border-color: #f39c12; background: #fef9e7; }
                .low { border-color: #3498db; background: #eaf4fc; }
                h2 { color: #0066cc; }
            </style>
        </head>
        <body>
            <h2>Bug Analysis Results</h2>
            ${bugsHtml}
        </body>
        </html>
    `;
}

async function showRefactoringDiff(original: string, refactored: string, explanation: string) {
    await showOptimizationDiff(original, refactored, explanation);
}

async function createTranslatedFile(translatedCode: string, targetLanguage: string, explanation: string) {
    const extensions: Record<string, string> = {
        'python': 'py',
        'javascript': 'js',
        'typescript': 'ts',
        'java': 'java',
        'cpp': 'cpp',
        'go': 'go',
        'rust': 'rs',
        'php': 'php',
        'ruby': 'rb',
        'swift': 'swift',
        'kotlin': 'kt'
    };

    const ext = extensions[targetLanguage] || 'txt';
    const fileName = `translated.${ext}`;
    
    const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(`untitled:${fileName}`));
    const editor = await vscode.window.showTextDocument(document);
    
    await editor.edit(editBuilder => {
        editBuilder.insert(new vscode.Position(0, 0), `// ${explanation}\n\n${translatedCode}`);
    });
}

async function replaceSelectedText(editor: vscode.TextEditor, newText: string) {
    const selection = editor.selection;
    await editor.edit(editBuilder => {
        editBuilder.replace(selection, newText);
    });
}

export function deactivate() {}