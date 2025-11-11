import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  FileText,
  Code,
  Hash,
  Filter,
  X,
  ChevronRight,
  FileCode,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SearchResult {
  id: string;
  file: string;
  line: number;
  column: number;
  match: string;
  preview: string;
  type: 'file' | 'code' | 'symbol';
}

export function ReplitSearchPanel({ projectId }: { projectId?: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'files' | 'code' | 'symbols'>('all');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([
    {
      id: '1',
      file: 'src/components/Header.tsx',
      line: 15,
      column: 8,
      match: 'Header',
      preview: 'export function Header({ title, user }: HeaderProps) {',
      type: 'code'
    },
    {
      id: '2',
      file: 'src/utils/auth.ts',
      line: 23,
      column: 12,
      match: 'authenticate',
      preview: '  const authenticate = async (token: string) => {',
      type: 'symbol'
    },
    {
      id: '3',
      file: 'package.json',
      line: 5,
      column: 3,
      match: 'version',
      preview: '  "version": "1.0.0",',
      type: 'code'
    }
  ]);

  const handleSearch = () => {
    // Simulate search
    console.log('Searching for:', searchQuery);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'code':
        return <Code className="h-4 w-4 text-status-info" />;
      case 'symbol':
        return <Hash className="h-4 w-4 text-status-success" />;
      default:
        return <FileCode className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Search</h3>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search in project..."
            className="pr-8 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Button
              variant={searchType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('all')}
              className="text-xs"
            >
              All
            </Button>
            <Button
              variant={searchType === 'files' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('files')}
              className="text-xs"
            >
              <FileText className="h-3 w-3 mr-1" />
              Files
            </Button>
            <Button
              variant={searchType === 'code' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('code')}
              className="text-xs"
            >
              <Code className="h-3 w-3 mr-1" />
              Code
            </Button>
            <Button
              variant={searchType === 'symbols' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSearchType('symbols')}
              className="text-xs"
            >
              <Hash className="h-3 w-3 mr-1" />
              Symbols
            </Button>
          </div>

          <div className="flex gap-3 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-muted-foreground">Case sensitive</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-muted-foreground">Regex</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        {results.length > 0 ? (
          <div className="p-2">
            <div className="text-xs text-muted-foreground px-2 py-1">
              {results.length} results
            </div>
            {results.map((result) => (
              <button
                key={result.id}
                className="w-full text-left px-2 py-2 hover:bg-muted rounded group"
              >
                <div className="flex items-start gap-2">
                  {getResultIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-foreground font-medium truncate">
                        {result.file}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {result.line}:{result.column}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground truncate">
                      <span className="text-muted-foreground">{result.line}: </span>
                      <span dangerouslySetInnerHTML={{
                        __html: result.preview.replace(
                          new RegExp(result.match, 'gi'),
                          `<mark class="bg-status-warning/20 text-foreground">${result.match}</mark>`
                        )
                      }} />
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Search className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No results found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your search terms or filters
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Search className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Enter a search term</p>
            <p className="text-xs text-muted-foreground mt-1">
              Search across files, code, and symbols
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}