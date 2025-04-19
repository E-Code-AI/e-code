// Monaco editor setup to work with Vite
import * as monaco from 'monaco-editor';

// Setup global Monaco environment
(self as any).MonacoEnvironment = {
  getWorker: function() {
    // Create a simple worker
    const workerCode = `
      self.onmessage = function() {
        // This is a minimal worker implementation that doesn't do much
        // but prevents the editor from crashing
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }
};

// Setup Monaco theme
export function setupMonacoTheme() {
  monaco.editor.defineTheme('plotDark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#FFFFFF',
      'editorLineNumber.foreground': '#525252',
      'editorCursor.foreground': '#FFFFFF',
      'editorSuggestWidget.background': '#2D2D2D',
      'editorSuggestWidget.border': '#3E3E3E',
      'editorSuggestWidget.selectedBackground': '#3E3E3E',
    },
  });

  monaco.editor.setTheme('plotDark');
}