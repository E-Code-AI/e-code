import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCode, Terminal as TerminalIcon, Globe, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileEditorTabsProps {
  fileExplorer: React.ReactNode;
  codeEditor: React.ReactNode;
  terminal: React.ReactNode;
  preview: React.ReactNode;
  defaultTab?: string;
  className?: string;
}

export function MobileEditorTabs({
  fileExplorer,
  codeEditor,
  terminal,
  preview,
  defaultTab = 'code',
  className
}: MobileEditorTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className={cn("flex flex-col h-full", className)}>
      <TabsContent value="files" className="flex-1 m-0">
        {fileExplorer}
      </TabsContent>
      
      <TabsContent value="code" className="flex-1 m-0">
        {codeEditor}
      </TabsContent>
      
      <TabsContent value="terminal" className="flex-1 m-0">
        {terminal}
      </TabsContent>
      
      <TabsContent value="preview" className="flex-1 m-0">
        {preview}
      </TabsContent>
      
      <TabsList className="grid w-full grid-cols-4 h-12 rounded-none border-t border-[var(--ecode-border)]">
        <TabsTrigger value="files" className="flex flex-col gap-1 h-full">
          <FileCode className="h-4 w-4" />
          <span className="text-[10px]">Files</span>
        </TabsTrigger>
        <TabsTrigger value="code" className="flex flex-col gap-1 h-full">
          <Code className="h-4 w-4" />
          <span className="text-[10px]">Code</span>
        </TabsTrigger>
        <TabsTrigger value="terminal" className="flex flex-col gap-1 h-full">
          <TerminalIcon className="h-4 w-4" />
          <span className="text-[10px]">Terminal</span>
        </TabsTrigger>
        <TabsTrigger value="preview" className="flex flex-col gap-1 h-full">
          <Globe className="h-4 w-4" />
          <span className="text-[10px]">Preview</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}