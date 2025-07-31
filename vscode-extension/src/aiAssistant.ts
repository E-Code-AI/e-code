import * as vscode from 'vscode';
import { ECodeAPI } from './api';

export class AIAssistant {
    constructor(private api: ECodeAPI) {}

    async showAssistant() {
        const panel = vscode.window.createWebviewPanel(
            'ecodeAI',
            'E-Code AI Assistant',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
        
        panel.webview.html = this.getWebviewContent();
        
        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'askAI':
                    await this.handleAIRequest(message.text, panel);
                    break;
                case 'applyCode':
                    await this.applyCodeSuggestion(message.code);
                    break;
            }
        });
    }

    private async handleAIRequest(prompt: string, panel: vscode.WebviewPanel) {
        const activeEditor = vscode.window.activeTextEditor;
        let context = '';
        
        if (activeEditor) {
            const selection = activeEditor.selection;
            const selectedText = activeEditor.document.getText(selection);
            
            if (selectedText) {
                context = `Selected code:\n\`\`\`${activeEditor.document.languageId}\n${selectedText}\n\`\`\`\n\n`;
            } else {
                context = `Current file: ${vscode.workspace.asRelativePath(activeEditor.document.uri)}\n\n`;
            }
        }
        
        // Send to AI API
        try {
            // In real implementation, this would call the E-Code AI API
            const response = await this.callAIAPI(context + prompt);
            
            panel.webview.postMessage({
                command: 'aiResponse',
                response: response
            });
        } catch (error) {
            panel.webview.postMessage({
                command: 'aiError',
                error: 'Failed to get AI response'
            });
        }
    }

    private async callAIAPI(prompt: string): Promise<string> {
        // Simulate AI response for now
        return `Based on your request, here's a solution:

\`\`\`javascript
// Example code suggestion
function improvedFunction() {
    // AI-generated improvement
    return "This is an AI suggestion";
}
\`\`\`

This code improves performance by...`;
    }

    private async applyCodeSuggestion(code: string) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active editor to apply code');
            return;
        }
        
        const selection = activeEditor.selection;
        await activeEditor.edit(editBuilder => {
            if (selection.isEmpty) {
                editBuilder.insert(selection.start, code);
            } else {
                editBuilder.replace(selection, code);
            }
        });
        
        vscode.window.showInformationMessage('Code applied successfully!');
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-Code AI Assistant</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        
        .chat-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        
        .messages {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 20px;
            padding: 10px;
            background: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: 4px;
        }
        
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 4px;
        }
        
        .user-message {
            background: var(--vscode-inputOption-activeBackground);
            margin-left: 20%;
        }
        
        .ai-message {
            background: var(--vscode-editor-inactiveSelectionBackground);
            margin-right: 20%;
        }
        
        .input-container {
            display: flex;
            gap: 10px;
        }
        
        #messageInput {
            flex: 1;
            padding: 10px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
        }
        
        button {
            padding: 10px 20px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .code-block {
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            position: relative;
        }
        
        .apply-button {
            position: absolute;
            top: 5px;
            right: 5px;
            padding: 5px 10px;
            font-size: 12px;
        }
        
        pre {
            margin: 0;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="messages" id="messages">
            <div class="message ai-message">
                <strong>E-Code AI:</strong> Hello! I'm your AI assistant. How can I help you with your code today?
            </div>
        </div>
        
        <div class="input-container">
            <input 
                type="text" 
                id="messageInput" 
                placeholder="Ask anything about your code..."
                onkeypress="if(event.key === 'Enter') sendMessage()"
            />
            <button onclick="sendMessage()">Send</button>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        
        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;
            
            // Add user message
            addMessage(text, 'user');
            
            // Send to extension
            vscode.postMessage({
                command: 'askAI',
                text: text
            });
            
            messageInput.value = '';
        }
        
        function addMessage(text, type) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + (type === 'user' ? 'user-message' : 'ai-message');
            
            if (type === 'user') {
                messageDiv.innerHTML = '<strong>You:</strong> ' + escapeHtml(text);
            } else {
                messageDiv.innerHTML = '<strong>E-Code AI:</strong> ' + formatAIResponse(text);
            }
            
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        function formatAIResponse(text) {
            // Format code blocks
            return text.replace(/\`\`\`(\w+)?\n([\s\S]*?)\`\`\`/g, (match, lang, code) => {
                const id = 'code-' + Date.now();
                return \`<div class="code-block">
                    <button class="apply-button" onclick="applyCode('\${id}')">Apply Code</button>
                    <pre id="\${id}">\${escapeHtml(code.trim())}</pre>
                </div>\`;
            });
        }
        
        function applyCode(id) {
            const codeElement = document.getElementById(id);
            if (codeElement) {
                vscode.postMessage({
                    command: 'applyCode',
                    code: codeElement.textContent
                });
            }
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'aiResponse':
                    addMessage(message.response, 'ai');
                    break;
                case 'aiError':
                    addMessage('Error: ' + message.error, 'ai');
                    break;
            }
        });
    </script>
</body>
</html>`;
    }
}