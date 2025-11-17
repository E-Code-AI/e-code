import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Search, Replace, X, FileText, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
  filePath: string;
  matches: {
    line: number;
    column: number;
    text: string;
    matchText: string;
  }[];
  totalMatches: number;
}

interface GlobalSearchPanelProps {
  projectId: number;
  onFileSelect?: (filePath: string, line?: number) => void;
}

export function GlobalSearchPanel({ projectId, onFileSelect }: GlobalSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [filePattern, setFilePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('node_modules,dist,.git');
  const [showReplace, setShowReplace] = useState(false);
  const [searching, setSearching] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Empty search",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    setSearching(true);
    try {
      const response = await apiRequest<{
        results: SearchResult[];
        totalFiles: number;
        totalMatches: number;
      }>('/api/search/global', {
        method: 'POST',
        body: JSON.stringify({
          query,
          projectId,
          caseSensitive,
          wholeWord,
          useRegex,
          filePattern: filePattern || undefined,
          excludePattern: excludePattern || undefined
        })
      });

      setResults(response.results);
      toast({
        title: "Search complete",
        description: `Found ${response.totalMatches} matches in ${response.totalFiles} files`
      });
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const handleReplace = async () => {
    if (!query.trim() || !replacement) {
      toast({
        title: "Invalid input",
        description: "Please enter both search and replacement text",
        variant: "destructive"
      });
      return;
    }

    setReplacing(true);
    try {
      const response = await apiRequest<{
        results: Array<{ filePath: string; replacements: number; success: boolean }>;
        totalFiles: number;
        totalReplacements: number;
      }>('/api/search/replace', {
        method: 'POST',
        body: JSON.stringify({
          query,
          replacement,
          projectId,
          caseSensitive,
          wholeWord,
          useRegex,
          filePattern: filePattern || undefined,
          excludePattern: excludePattern || undefined
        })
      });

      toast({
        title: "Replace complete",
        description: `Replaced ${response.totalReplacements} instances in ${response.totalFiles} files`
      });

      // Refresh search results
      handleSearch();
    } catch (error: any) {
      toast({
        title: "Replace failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setReplacing(false);
    }
  };

  const toggleFileExpanded = (filePath: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filePath)) {
      newExpanded.delete(filePath);
    } else {
      newExpanded.add(filePath);
    }
    setExpandedFiles(newExpanded);
  };

  const highlightMatch = (text: string, matchText: string) => {
    const parts = text.split(new RegExp(`(${matchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === matchText.toLowerCase() ? (
            <mark key={i} className="bg-yellow-300 dark:bg-yellow-700">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background" data-testid="global-search-panel">
      {/* Search Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Search className="h-4 w-4" />
            Global Search
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplace(!showReplace)}
            data-testid="toggle-replace-button"
          >
            {showReplace ? 'Hide' : 'Show'} Replace
          </Button>
        </div>

        {/* Search Input */}
        <div className="space-y-2">
          <Input
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="font-mono text-sm"
            data-testid="input-search-query"
          />

          <AnimatePresence>
            {showReplace && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <Input
                  placeholder="Replace with..."
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  className="font-mono text-sm"
                  data-testid="input-replacement"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Options */}
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={caseSensitive}
              onCheckedChange={(checked) => setCaseSensitive(!!checked)}
              data-testid="checkbox-case-sensitive"
            />
            <span>Case sensitive</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={wholeWord}
              onCheckedChange={(checked) => setWholeWord(!!checked)}
              data-testid="checkbox-whole-word"
            />
            <span>Whole word</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={useRegex}
              onCheckedChange={(checked) => setUseRegex(!!checked)}
              data-testid="checkbox-use-regex"
            />
            <span>Regex</span>
          </label>
        </div>

        {/* File Filters */}
        <div className="space-y-2">
          <Input
            placeholder="Files to include (e.g., *.ts,*.tsx)"
            value={filePattern}
            onChange={(e) => setFilePattern(e.target.value)}
            className="text-xs"
            data-testid="input-file-pattern"
          />
          <Input
            placeholder="Files to exclude"
            value={excludePattern}
            onChange={(e) => setExcludePattern(e.target.value)}
            className="text-xs"
            data-testid="input-exclude-pattern"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="flex-1"
            data-testid="button-search"
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
          {showReplace && (
            <Button
              onClick={handleReplace}
              disabled={replacing || !query.trim() || !replacement}
              variant="destructive"
              className="flex-1"
              data-testid="button-replace-all"
            >
              {replacing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Replacing...
                </>
              ) : (
                <>
                  <Replace className="h-4 w-4 mr-2" />
                  Replace All
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Search className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">No results</p>
          </div>
        ) : (
          <div className="space-y-1" data-testid="search-results">
            {results.map((result) => (
              <Card key={result.filePath} className="p-2">
                <button
                  onClick={() => toggleFileExpanded(result.filePath)}
                  className="flex items-center gap-2 w-full text-left hover:bg-accent p-1 rounded"
                  data-testid={`file-result-${result.filePath}`}
                >
                  {expandedFiles.has(result.filePath) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium flex-1">{result.filePath}</span>
                  <span className="text-xs text-muted-foreground">
                    {result.totalMatches} matches
                  </span>
                </button>

                <AnimatePresence>
                  {expandedFiles.has(result.filePath) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-6 mt-2 space-y-1"
                    >
                      {result.matches.map((match, idx) => (
                        <button
                          key={idx}
                          onClick={() => onFileSelect?.(result.filePath, match.line)}
                          className="block w-full text-left hover:bg-accent p-2 rounded text-xs font-mono"
                          data-testid={`match-line-${match.line}`}
                        >
                          <div className="flex gap-2">
                            <span className="text-muted-foreground min-w-[3rem]">
                              {match.line}:{match.column}
                            </span>
                            <span className="flex-1 truncate">
                              {highlightMatch(match.text.trim(), match.matchText)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
