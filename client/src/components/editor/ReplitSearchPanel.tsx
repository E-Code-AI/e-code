import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  FileText,
  Code,
  Hash,
  X,
  ChevronRight,
  FileCode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SearchResult {
  id: string;
  file: string;
  line: number;
  column: number;
  match: string;
  preview: string;
  type: 'file' | 'code' | 'symbol';
}

function ShimmerSkeleton() {
  return (
    <div className="p-3 space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="flex items-start gap-2"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-[18px] h-[18px] rounded bg-[#3d4452]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-[#3d4452]" />
            <div className="h-3 w-full rounded bg-[#242b3d]" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function ReplitSearchPanel({ projectId }: { projectId?: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'files' | 'code' | 'symbols'>('all');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FileText className="w-[18px] h-[18px] text-[#9da2a6]" />;
      case 'code':
        return <Code className="w-[18px] h-[18px] text-[#0079f2]" />;
      case 'symbol':
        return <Hash className="w-[18px] h-[18px] text-[#0079f2]" />;
      default:
        return <FileCode className="w-[18px] h-[18px] text-[#9da2a6]" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0e1525]">
      {/* Header */}
      <div className="p-3 border-b border-[#3d4452] min-h-[48px]">
        <div className="flex items-center gap-2 mb-3">
          <Search className="w-[18px] h-[18px] text-[#9da2a6]" />
          <h3 className="text-[17px] font-medium leading-tight text-[#ffffff]">Search</h3>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search in project..."
            className="pr-8 text-[15px] leading-[20px] bg-[#1c2333] border-[#3d4452] text-[#ffffff] placeholder:text-[#5c6670] focus:border-[#0079f2] focus:ring-[#0079f2]"
            data-testid="input-search"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5c6670] hover:text-[#9da2a6] transition-colors"
              data-testid="button-clear-search"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Button
              variant={searchType === 'all' ? 'default' : 'outline'}
              onClick={() => setSearchType('all')}
              className={cn(
                "h-8 rounded-lg text-[13px]",
                searchType === 'all' 
                  ? "bg-[#0079f2] text-[#ffffff] hover:bg-[#0066CC]" 
                  : "bg-transparent border-[#3d4452] text-[#9da2a6] hover:bg-[#3D4455] hover:text-[#ffffff]"
              )}
              data-testid="button-filter-all"
            >
              All
            </Button>
            <Button
              variant={searchType === 'files' ? 'default' : 'outline'}
              onClick={() => setSearchType('files')}
              className={cn(
                "h-8 rounded-lg text-[13px]",
                searchType === 'files' 
                  ? "bg-[#0079f2] text-[#ffffff] hover:bg-[#0066CC]" 
                  : "bg-transparent border-[#3d4452] text-[#9da2a6] hover:bg-[#3D4455] hover:text-[#ffffff]"
              )}
              data-testid="button-filter-files"
            >
              <FileText className="w-[18px] h-[18px] mr-1" />
              Files
            </Button>
            <Button
              variant={searchType === 'code' ? 'default' : 'outline'}
              onClick={() => setSearchType('code')}
              className={cn(
                "h-8 rounded-lg text-[13px]",
                searchType === 'code' 
                  ? "bg-[#0079f2] text-[#ffffff] hover:bg-[#0066CC]" 
                  : "bg-transparent border-[#3d4452] text-[#9da2a6] hover:bg-[#3D4455] hover:text-[#ffffff]"
              )}
              data-testid="button-filter-code"
            >
              <Code className="w-[18px] h-[18px] mr-1" />
              Code
            </Button>
            <Button
              variant={searchType === 'symbols' ? 'default' : 'outline'}
              onClick={() => setSearchType('symbols')}
              className={cn(
                "h-8 rounded-lg text-[13px]",
                searchType === 'symbols' 
                  ? "bg-[#0079f2] text-[#ffffff] hover:bg-[#0066CC]" 
                  : "bg-transparent border-[#3d4452] text-[#9da2a6] hover:bg-[#3D4455] hover:text-[#ffffff]"
              )}
              data-testid="button-filter-symbols"
            >
              <Hash className="w-[18px] h-[18px] mr-1" />
              Symbols
            </Button>
          </div>

          <div className="flex gap-4 text-[11px] uppercase tracking-wider">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="rounded border-[#3d4452] bg-[#1c2333] text-[#0079f2] focus:ring-[#0079f2]"
                data-testid="checkbox-case-sensitive"
              />
              <span className="text-[#5c6670]">Case sensitive</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
                className="rounded border-[#3d4452] bg-[#1c2333] text-[#0079f2] focus:ring-[#0079f2]"
                data-testid="checkbox-regex"
              />
              <span className="text-[#5c6670]">Regex</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <ShimmerSkeleton />
        ) : results.length > 0 && searchQuery ? (
          <div className="p-3">
            <div className="text-[11px] uppercase tracking-wider text-[#5c6670] px-2 py-1 mb-2">
              {results.length} results
            </div>
            {results.map((result) => (
              <button
                key={result.id}
                className="w-full text-left px-2 py-2 hover:bg-[#3D4455] rounded-lg group transition-colors"
                data-testid={`result-item-${result.id}`}
              >
                <div className="flex items-start gap-2">
                  {getResultIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] leading-[20px] text-[#ffffff] font-medium truncate">
                        {result.file}
                      </span>
                      <span className="text-[13px] text-[#5c6670]">
                        {result.line}:{result.column}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[13px] text-[#9da2a6] truncate">
                      <span className="text-[#5c6670]">{result.line}: </span>
                      <span dangerouslySetInnerHTML={{
                        __html: result.preview.replace(
                          new RegExp(result.match, 'gi'),
                          `<mark class="bg-[#1C2333] text-[#ffffff] rounded px-0.5">${result.match}</mark>`
                        )
                      }} />
                    </div>
                  </div>
                  <ChevronRight className="w-[18px] h-[18px] text-[#5c6670] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        ) : searchQuery ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-3">
            <Search className="w-12 h-12 text-[#5c6670] opacity-40 mb-3" />
            <p className="text-[17px] font-medium leading-tight text-[#ffffff]">No results found</p>
            <p className="text-[13px] text-[#5c6670] mt-1">
              Try adjusting your search terms or filters
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-3">
            <Search className="w-12 h-12 text-[#5c6670] opacity-40 mb-3" />
            <p className="text-[17px] font-medium leading-tight text-[#ffffff]">Search your project</p>
            <p className="text-[13px] text-[#5c6670] mt-1">
              Search across files, code, and symbols
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
