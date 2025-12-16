import { useState } from 'react';
import { LazyMotionDiv } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Database,
  Table,
  Play,
  RefreshCw,
  Download,
  ChevronRight,
  ChevronDown,
  Circle,
  CheckCircle,
  AlertCircle,
  Search,
  Copy,
  Settings,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TableInfo {
  name: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>;
}

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted", className)}>
      <LazyMotionDiv
        className="absolute inset-0 -translate-x-full"
        style={{
          background: 'linear-gradient(90deg, transparent, hsl(var(--accent)), transparent)',
        }}
        animate={{ translateX: ['−100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Icon className="w-12 h-12 text-muted-foreground opacity-40 mb-4" />
      <h4 className="text-[17px] font-medium leading-tight text-foreground mb-2">
        {title}
      </h4>
      <p className="text-[13px] text-muted-foreground mb-4 max-w-[240px]">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="h-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[13px]"
          data-testid="empty-state-action-button"
        >
          <Plus className="w-[18px] h-[18px] mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-3 space-y-3">
      <ShimmerSkeleton className="h-8 w-full" />
      <ShimmerSkeleton className="h-6 w-3/4" />
      <ShimmerSkeleton className="h-6 w-1/2" />
      <ShimmerSkeleton className="h-6 w-2/3" />
      <ShimmerSkeleton className="h-6 w-1/2" />
    </div>
  );
}

export function ReplitDatabasePanel({ projectId }: { projectId?: string }) {
  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 100;');
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tables' | 'query' | 'results'>('tables');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['users']));

  const tables: TableInfo[] = [
    {
      name: 'users',
      rowCount: 1234,
      columns: [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'email', type: 'VARCHAR(255)', nullable: false },
        { name: 'name', type: 'VARCHAR(100)', nullable: true },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false }
      ]
    },
    {
      name: 'posts',
      rowCount: 5678,
      columns: [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'user_id', type: 'INTEGER', nullable: false },
        { name: 'title', type: 'VARCHAR(255)', nullable: false },
        { name: 'content', type: 'TEXT', nullable: true },
        { name: 'published', type: 'BOOLEAN', nullable: false }
      ]
    },
    {
      name: 'comments',
      rowCount: 8901,
      columns: [
        { name: 'id', type: 'INTEGER', nullable: false },
        { name: 'post_id', type: 'INTEGER', nullable: false },
        { name: 'user_id', type: 'INTEGER', nullable: false },
        { name: 'content', type: 'TEXT', nullable: false }
      ]
    }
  ];

  const queryResults = [
    { id: 1, email: 'user1@example.com', name: 'John Doe', created_at: '2024-01-15' },
    { id: 2, email: 'user2@example.com', name: 'Jane Smith', created_at: '2024-01-16' },
    { id: 3, email: 'user3@example.com', name: 'Bob Johnson', created_at: '2024-01-17' },
    { id: 4, email: 'user4@example.com', name: 'Alice Brown', created_at: '2024-01-18' }
  ];

  const toggleTableExpansion = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const runQuery = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setActiveTab('results');
    }, 500);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  };

  return (
    <div 
      className="h-full flex flex-col bg-card"
      data-testid="database-panel"
    >
      <div className="p-3 border-b border-border min-h-[48px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-[18px] h-[18px] text-muted-foreground" />
            <h3 className="text-[17px] font-medium leading-tight text-foreground">Database</h3>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-lg hover:bg-accent"
            data-testid="database-settings-button"
          >
            <Settings className="w-[18px] h-[18px] text-muted-foreground" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle className="w-[18px] h-[18px] text-green-500" data-testid="status-connected" />
            ) : (
              <AlertCircle className="w-[18px] h-[18px] text-destructive" data-testid="status-disconnected" />
            )}
            <span className="text-[15px] leading-[20px] text-foreground">
              {isConnected ? 'Connected to PostgreSQL' : 'Disconnected'}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-lg hover:bg-accent"
            onClick={handleRefresh}
            data-testid="database-refresh-button"
          >
            <RefreshCw className={cn("w-[18px] h-[18px] text-muted-foreground", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-1/3 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Tables</span>
          </div>
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
              <Input
                placeholder="Search tables..."
                className="h-8 pl-9 text-[13px] bg-muted border-border rounded-lg text-foreground placeholder:text-muted-foreground"
                data-testid="search-tables-input"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            {isLoading ? (
              <LoadingSkeleton />
            ) : tables.length === 0 ? (
              <EmptyState
                icon={Table}
                title="No tables found"
                description="Create your first table to start storing data"
                actionLabel="Create Table"
                onAction={() => {}}
              />
            ) : (
              <div className="p-3 space-y-2">
                {tables.map((table) => (
                  <div key={table.name}>
                    <button
                      onClick={() => {
                        toggleTableExpansion(table.name);
                        setSelectedTable(table.name);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-accent text-left transition-colors",
                        selectedTable === table.name && "bg-muted"
                      )}
                      data-testid={`table-row-${table.name}`}
                    >
                      {expandedTables.has(table.name) ? (
                        <ChevronDown className="w-[18px] h-[18px] text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-[18px] h-[18px] text-muted-foreground" />
                      )}
                      <Table className="w-[18px] h-[18px] text-muted-foreground" />
                      <span className="text-[15px] leading-[20px] text-foreground flex-1">{table.name}</span>
                      <span className="text-[13px] text-muted-foreground">{table.rowCount.toLocaleString()}</span>
                    </button>

                    {expandedTables.has(table.name) && (
                      <div className="ml-8 mt-1 space-y-1">
                        {table.columns.map((column) => (
                          <div
                            key={column.name}
                            className="flex items-center justify-between px-2 py-1.5 text-[13px] hover:bg-accent rounded-lg transition-colors"
                            data-testid={`column-${table.name}-${column.name}`}
                          >
                            <div className="flex items-center gap-2">
                              <Circle className="w-2 h-2 text-muted-foreground" />
                              <span className="text-foreground">{column.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{column.type}</span>
                              {!column.nullable && (
                                <Badge 
                                  variant="outline" 
                                  className="text-[11px] px-1.5 py-0 border-border text-muted-foreground rounded"
                                >
                                  NOT NULL
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Select value="sql" disabled>
                  <SelectTrigger className="h-8 w-24 text-[13px] bg-muted border-border rounded-lg text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="sql" className="text-foreground">SQL</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={runQuery}
                  className="h-8 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[13px]"
                  disabled={isLoading}
                  data-testid="run-query-button"
                >
                  <Play className="w-[18px] h-[18px] mr-2" />
                  Run Query
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg hover:bg-accent border border-border"
                  data-testid="copy-query-button"
                >
                  <Copy className="w-[18px] h-[18px] text-muted-foreground" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg hover:bg-accent border border-border"
                  data-testid="download-results-button"
                >
                  <Download className="w-[18px] h-[18px] text-muted-foreground" />
                </Button>
              </div>
            </div>
            
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter SQL query..."
              className="font-mono text-[13px] min-h-[100px] bg-muted border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none"
              spellCheck={false}
              data-testid="query-input"
            />
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Query Results</span>
                <span className="text-[13px] text-muted-foreground">
                  {queryResults.length} rows • 0.023s
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  <ShimmerSkeleton className="h-10 w-full" />
                  <ShimmerSkeleton className="h-10 w-full" />
                  <ShimmerSkeleton className="h-10 w-full" />
                  <ShimmerSkeleton className="h-10 w-full" />
                </div>
              ) : queryResults.length === 0 ? (
                <EmptyState
                  icon={Database}
                  title="No results"
                  description="Run a query to see results here"
                />
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-[13px]" data-testid="results-table">
                    <thead>
                      <tr className="bg-muted border-b border-border">
                        {Object.keys(queryResults[0] || {}).map((key) => (
                          <th key={key} className="px-3 py-2.5 text-left text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResults.map((row, index) => (
                        <tr 
                          key={index} 
                          className="border-b border-border last:border-b-0 hover:bg-accent transition-colors"
                          data-testid={`result-row-${index}`}
                        >
                          {Object.values(row).map((value, i) => (
                            <td key={i} className="px-3 py-2.5 text-muted-foreground">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
