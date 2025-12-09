import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  FileText,
  Bot,
  Sparkles,
  Rocket,
  HardDrive,
  UserCheck,
  Terminal,
  Database,
  Code,
  GitBranch,
  Puzzle,
  Users,
  Eye,
  Key,
  Shield,
  TerminalSquare,
  Settings,
  Zap,
  Store,
  X,
} from 'lucide-react';

export interface ToolItem {
  id: string;
  icon: typeof Search;
  title: string;
  description: string;
  section: 'search' | 'tools';
}

const defaultTools: ToolItem[] = [
  { id: 'search', icon: Search, title: 'Search', description: 'Search through your files', section: 'search' },
  { id: 'files', icon: FileText, title: 'Files', description: 'Find a file', section: 'search' },
  { id: 'agent', icon: Bot, title: 'Agent', description: 'Agent can make changes, review its work, and debug itself automatically.', section: 'tools' },
  { id: 'assistant', icon: Sparkles, title: 'Assistant', description: 'Assistant answers questions, refines code, and makes precise edits.', section: 'tools' },
  { id: 'publishing', icon: Rocket, title: 'Publishing', description: 'Publish a live, stable, public version of your App, unaffected by the changes you make in the workspace', section: 'tools' },
  { id: 'app-storage', icon: HardDrive, title: 'App Storage', description: "App Storage is Replit's built-in object storage that lets your app easily host and save uploads like images, videos, and documents.", section: 'tools' },
  { id: 'auth', icon: UserCheck, title: 'Auth', description: 'Let users log in to your App using a prebuilt login page', section: 'tools' },
  { id: 'console', icon: Terminal, title: 'Console', description: 'View the terminal output after running your code', section: 'tools' },
  { id: 'database', icon: Database, title: 'Database', description: 'Stores structured data such as user profiles, game scores, and product catalogs.', section: 'tools' },
  { id: 'developer', icon: Code, title: 'Developer', description: 'Advanced developer tools and settings', section: 'tools' },
  { id: 'git', icon: GitBranch, title: 'Git', description: 'Version control for your App', section: 'tools' },
  { id: 'integrations', icon: Puzzle, title: 'Integrations', description: 'Connect to Replit-native and external services', section: 'tools' },
  { id: 'multiplayer', icon: Users, title: 'Multiplayer', description: 'Invite real-time collaborators and manage access to your App', section: 'tools' },
  { id: 'preview', icon: Eye, title: 'Preview', description: 'Preview your App', section: 'tools' },
  { id: 'kv-store', icon: Store, title: 'Replit Key-Value Store', description: 'Free, easy-to-use key value store suitable for unstructured data, caching, session management, fast lookups, and flexible data models', section: 'tools' },
  { id: 'secrets', icon: Key, title: 'Secrets', description: 'Store sensitive information (like API keys) securely in your App', section: 'tools' },
  { id: 'security', icon: Shield, title: 'Security Scanner', description: 'Scan your app for vulnerabilities', section: 'tools' },
  { id: 'shell', icon: TerminalSquare, title: 'Shell', description: 'Directly access your App through a command line interface (CLI)', section: 'tools' },
  { id: 'settings', icon: Settings, title: 'User Settings', description: 'Configure personal editor preferences and workspace settings which apply to all Apps', section: 'tools' },
  { id: 'workflows', icon: Zap, title: 'Workflows', description: 'Configure different ways to run your App', section: 'tools' },
];

interface ReplitToolsSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectTool: (toolId: string) => void;
  className?: string;
}

export function ReplitToolsSheet({
  open,
  onClose,
  onSelectTool,
  className,
}: ReplitToolsSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return defaultTools;
    const query = searchQuery.toLowerCase();
    return defaultTools.filter(
      tool =>
        tool.title.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const searchItems = filteredTools.filter(t => t.section === 'search');
  const toolItems = filteredTools.filter(t => t.section === 'tools');

  const handleSelect = (toolId: string) => {
    onSelectTool(toolId);
    onClose();
    setSearchQuery('');
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={onClose}
        data-testid="tools-sheet-backdrop"
      />
      
      <div
        className={cn(
          'fixed inset-0 z-50 bg-[var(--ecode-background)]',
          'flex flex-col animate-in fade-in-0 slide-in-from-bottom-4 duration-300',
          className
        )}
        data-testid="tools-sheet"
      >
      {/* Header with Search */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ecode-border)]">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ecode-text-muted)]" />
          <Input
            type="text"
            placeholder="Search for tools and files"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 h-10',
              'bg-[var(--ecode-surface)] border-[var(--ecode-border)]',
              'text-[var(--ecode-text)] placeholder:text-[var(--ecode-text-muted)]',
              'focus:ring-1 focus:ring-[var(--ecode-accent)] focus:border-[var(--ecode-accent)]',
              'font-[var(--ecode-font-sans)]'
            )}
            data-testid="tools-search-input"
            autoFocus
          />
        </div>
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-[var(--ecode-text)] hover:bg-[var(--ecode-surface-hover)] font-medium"
          data-testid="tools-sheet-close"
        >
          Close
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-2">
          {/* Search Section */}
          {searchItems.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-medium text-[var(--ecode-text-muted)] uppercase tracking-wider mb-2 px-1">
                Search
              </h3>
              <div className="space-y-1">
                {searchItems.map((item) => (
                  <ToolItemRow
                    key={item.id}
                    item={item}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tools Section */}
          {toolItems.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-[var(--ecode-text-muted)] uppercase tracking-wider mb-2 px-1">
                Tools
              </h3>
              <div className="space-y-1">
                {toolItems.map((item) => (
                  <ToolItemRow
                    key={item.id}
                    item={item}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {filteredTools.length === 0 && (
            <div className="py-12 text-center text-[var(--ecode-text-muted)]">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No tools found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
    </>
  );
}

interface ToolItemRowProps {
  item: ToolItem;
  onSelect: (id: string) => void;
}

function ToolItemRow({ item, onSelect }: ToolItemRowProps) {
  const Icon = item.icon;
  
  return (
    <button
      onClick={() => onSelect(item.id)}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg',
        'text-left transition-colors duration-150',
        'hover:bg-[var(--ecode-surface-hover)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--ecode-accent)] focus:ring-inset',
        'group'
      )}
      data-testid={`tool-item-${item.id}`}
    >
      <div className={cn(
        'flex-shrink-0 w-6 h-6 flex items-center justify-center',
        'text-[var(--ecode-text-muted)] group-hover:text-[var(--ecode-text)]'
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[var(--ecode-text)] text-[15px] leading-tight">
          {item.title}
        </div>
        <div className="text-[13px] text-[var(--ecode-text-muted)] leading-snug mt-0.5 line-clamp-2">
          {item.description}
        </div>
      </div>
      <div className="flex-shrink-0 text-[var(--ecode-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
