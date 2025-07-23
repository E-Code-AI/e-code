import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // General
  { keys: ['⌘', 'K'], description: 'Open command palette', category: 'General' },
  { keys: ['⌘', ','], description: 'Open settings', category: 'General' },
  { keys: ['⌘', 'P'], description: 'Quick open file', category: 'General' },
  { keys: ['⌘', '⇧', 'P'], description: 'Show all commands', category: 'General' },
  
  // Navigation
  { keys: ['⌘', 'H'], description: 'Go to home', category: 'Navigation' },
  { keys: ['⌘', 'D'], description: 'Go to dashboard', category: 'Navigation' },
  { keys: ['⌘', '1'], description: 'Focus editor', category: 'Navigation' },
  { keys: ['⌘', '2'], description: 'Focus file explorer', category: 'Navigation' },
  { keys: ['⌘', '3'], description: 'Focus terminal', category: 'Navigation' },
  
  // Editor
  { keys: ['⌘', 'S'], description: 'Save file', category: 'Editor' },
  { keys: ['⌘', '⇧', 'S'], description: 'Save all files', category: 'Editor' },
  { keys: ['⌘', 'W'], description: 'Close file', category: 'Editor' },
  { keys: ['⌘', '⇧', 'W'], description: 'Close all files', category: 'Editor' },
  { keys: ['⌘', 'F'], description: 'Find in file', category: 'Editor' },
  { keys: ['⌘', '⇧', 'F'], description: 'Find in project', category: 'Editor' },
  { keys: ['⌘', 'G'], description: 'Go to line', category: 'Editor' },
  { keys: ['⌘', '/'], description: 'Toggle comment', category: 'Editor' },
  { keys: ['⌘', '['], description: 'Outdent line', category: 'Editor' },
  { keys: ['⌘', ']'], description: 'Indent line', category: 'Editor' },
  { keys: ['⌘', 'D'], description: 'Select next occurrence', category: 'Editor' },
  { keys: ['⌘', '⇧', 'L'], description: 'Select all occurrences', category: 'Editor' },
  { keys: ['⌥', '↑'], description: 'Move line up', category: 'Editor' },
  { keys: ['⌥', '↓'], description: 'Move line down', category: 'Editor' },
  { keys: ['⌥', '⇧', '↑'], description: 'Copy line up', category: 'Editor' },
  { keys: ['⌥', '⇧', '↓'], description: 'Copy line down', category: 'Editor' },
  
  // Terminal
  { keys: ['⌘', '`'], description: 'Toggle terminal', category: 'Terminal' },
  { keys: ['⌘', '⇧', '`'], description: 'Create new terminal', category: 'Terminal' },
  { keys: ['⌘', '⇧', '['], description: 'Previous terminal', category: 'Terminal' },
  { keys: ['⌘', '⇧', ']'], description: 'Next terminal', category: 'Terminal' },
  { keys: ['⌘', 'K'], description: 'Clear terminal', category: 'Terminal' },
  
  // Project
  { keys: ['⌘', 'N'], description: 'New project', category: 'Project' },
  { keys: ['⌘', '⇧', 'N'], description: 'New file', category: 'Project' },
  { keys: ['⌘', '⏎'], description: 'Run project', category: 'Project' },
  { keys: ['⌘', '⇧', '⏎'], description: 'Stop project', category: 'Project' },
  { keys: ['⌘', 'B'], description: 'Toggle sidebar', category: 'Project' },
  
  // Git
  { keys: ['⌘', '⇧', 'G'], description: 'Open Git panel', category: 'Git' },
  { keys: ['⌘', '⇧', 'C'], description: 'Commit changes', category: 'Git' },
  { keys: ['⌘', '⇧', 'U'], description: 'Push changes', category: 'Git' },
  { keys: ['⌘', '⇧', 'D'], description: 'Pull changes', category: 'Git' },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '?') {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for the custom event to open shortcuts
  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('show-shortcuts', handleOpen);
    return () => window.removeEventListener('show-shortcuts', handleOpen);
  }, []);

  // Group shortcuts by category
  const categories = [...new Set(shortcuts.map(s => s.category))];
  const groupedShortcuts = categories.reduce((acc, category) => {
    acc[category] = shortcuts.filter(s => s.category === category);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  const ShortcutsList = ({ shortcuts }: { shortcuts: Shortcut[] }) => (
    <div className="space-y-2">
      {shortcuts.map((shortcut, index) => (
        <div
          key={index}
          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <span className="text-sm">{shortcut.description}</span>
          <div className="flex items-center gap-1">
            {shortcut.keys.map((key, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="font-mono text-xs px-2 py-0.5"
              >
                {key}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick reference for all keyboard shortcuts. Press ⌘⇧? to open this anytime.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue={categories[0]} className="mt-4">
          <TabsList className="grid grid-cols-5 w-full">
            {categories.map(category => (
              <TabsTrigger key={category} value={category}>
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <ScrollArea className="h-[400px] mt-4">
            {categories.map(category => (
              <TabsContent key={category} value={category}>
                <ShortcutsList shortcuts={groupedShortcuts[category]} />
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Note: Use Ctrl instead of ⌘ on Windows/Linux
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}