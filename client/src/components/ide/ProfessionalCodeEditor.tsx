import { ReplitMonacoEditor } from '@/components/editor/ReplitMonacoEditor';
import { useState, useEffect } from 'react';

interface ProfessionalCodeEditorProps {
  fileName: string;
  initialContent: string;
  language: string;
  onChange: (content: string) => void;
  onSave: () => void;
  onCursorChange?: (position: { line: number; column: number }) => void;
}

export function ProfessionalCodeEditor({
  fileName,
  initialContent,
  language,
  onChange,
  onSave,
  onCursorChange
}: ProfessionalCodeEditorProps) {
  return (
    <div className="h-full flex flex-col">
      {/* File Toolbar */}
      <div className="h-10 border-b flex items-center px-3 gap-3 bg-muted/30">
        <span className="text-sm font-medium">{fileName}</span>
        <span className="text-xs text-muted-foreground">{language}</span>
        <span className="text-xs text-muted-foreground">UTF-8</span>
        <span className="text-xs text-muted-foreground">LF</span>
      </div>
      
      {/* Monaco Editor */}
      <div className="flex-1">
        <ReplitMonacoEditor
          projectId="1"
          onRunCode={() => {}}
          onStopCode={() => {}}
          isRunning={false}
          onEditorMount={(editor) => {
            // Set initial content
            editor.setValue(initialContent);
            
            // Listen to content changes
            editor.onDidChangeModelContent(() => {
              const content = editor.getValue();
              onChange(content);
            });
            
            // Listen to cursor changes
            editor.onDidChangeCursorPosition((e) => {
              if (onCursorChange) {
                onCursorChange({
                  line: e.position.lineNumber,
                  column: e.position.column
                });
              }
            });
            
            // Save on Cmd/Ctrl+S
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
              onSave();
            });
          }}
        />
      </div>
    </div>
  );
}
