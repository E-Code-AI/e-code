import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Database,
  Play,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Copy,
  Settings,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
}

interface TableInfo {
  name: string;
  rowCount: number;
  columns: TableColumn[];
}

interface TablesResponse {
  tables: TableInfo[];
  executionTime: number;
  timestamp: string;
}

interface QueryResult {
  rows: any[];
  rowCount: number;
  executionTime: number;
  fields: Array<{
    name: string;
    dataTypeID: number;
  }>;
}

interface MobileDatabasePanelProps {
  projectId: string;
  className?: string;
}

export function MobileDatabasePanel({ projectId, className }: MobileDatabasePanelProps) {
  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 100;');
  const [activeTab, setActiveTab] = useState<'tables' | 'query' | 'results'>('tables');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['users']));
  const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tables list
  const { data: tablesData, isLoading: tablesLoading, error: tablesError, refetch: refetchTables } = useQuery<TablesResponse>({
    queryKey: ['/api/database', projectId, 'tables'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/database/tables/${projectId}`);
      return response;
    },
    staleTime: 30000 // Cache for 30 seconds
  });

  // Execute query mutation
  const queryMutation = useMutation({
    mutationFn: async (sqlQuery: string) => {
      const response = await apiRequest('POST', `/api/database/query/${projectId}`, {
        query: sqlQuery,
        limit: 100
      });
      return response as QueryResult;
    },
    onSuccess: (data) => {
      setQueryResults(data);
      setActiveTab('results');
      toast({
        title: "Query executed successfully",
        description: `${data.rowCount} rows returned in ${data.executionTime}ms`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Query execution failed",
        description: error.message || 'Failed to execute query',
        variant: "destructive"
      });
    }
  });

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
    if (!query.trim()) {
      toast({
        title: "Query required",
        description: "Please enter a SQL query",
        variant: "destructive"
      });
      return;
    }
    queryMutation.mutate(query);
  };

  const handleRefresh = () => {
    refetchTables();
    toast({
      title: "Refreshing",
      description: "Fetching latest database tables..."
    });
  };

  const tables = tablesData?.tables || [];
  const isConnected = !tablesError;

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Database</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-600 dark:text-green-400">Connected</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-destructive">Disconnected</span>
            </>
          )}
          <Badge variant="secondary" className="ml-auto text-xs">PostgreSQL</Badge>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="flex border-b border-border bg-card">
        {(['tables', 'query', 'results'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-3 text-sm font-medium capitalize transition-colors",
              activeTab === tab
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            )}
            data-testid={`tab-${tab}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === 'tables' && (
          <div className="p-4 space-y-2">
            {tablesLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading tables...</span>
              </div>
            )}

            {tablesError && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive text-center">
                  Failed to load tables: {(tablesError as any)?.message || 'Unknown error'}
                </p>
                <Button size="sm" onClick={handleRefresh} variant="outline">
                  Try Again
                </Button>
              </div>
            )}

            {!tablesLoading && !tablesError && tables.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Database className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  No tables found in database
                </p>
              </div>
            )}

            {!tablesLoading && !tablesError && tables.map((table) => (
              <div key={table.name} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleTableExpansion(table.name)}
                  className="w-full flex items-center justify-between p-3 bg-card hover:bg-accent transition-colors"
                  data-testid={`table-${table.name}`}
                >
                  <div className="flex items-center gap-2">
                    {expandedTables.has(table.name) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-medium">{table.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{table.rowCount} rows</Badge>
                </button>

                {expandedTables.has(table.name) && (
                  <div className="p-3 bg-muted/30 space-y-1 text-xs">
                    {table.columns.map((col) => (
                      <div key={col.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{col.name}</span>
                          {!col.nullable && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">NOT NULL</Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground">{col.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'query' && (
          <div className="p-4 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">SQL Query</label>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SELECT * FROM users LIMIT 100;"
                className="font-mono text-sm min-h-[120px]"
                data-testid="input-sql-query"
                disabled={queryMutation.isPending}
              />
            </div>
            <Button 
              onClick={runQuery} 
              className="w-full"
              data-testid="button-run-query"
              disabled={queryMutation.isPending || !query.trim()}
            >
              {queryMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Query
                </>
              )}
            </Button>
            
            {queryMutation.isPending && (
              <p className="text-xs text-muted-foreground text-center">
                Please wait while query executes...
              </p>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div className="p-4">
            {!queryResults && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Database className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  No query results yet. Run a query to see results.
                </p>
              </div>
            )}

            {queryResults && queryResults.rows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <p className="text-sm text-muted-foreground text-center">
                  Query executed successfully but returned no rows
                </p>
              </div>
            )}

            {queryResults && queryResults.rows.length > 0 && (
              <>
                <div className="border border-border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {Object.keys(queryResults.rows[0] || {}).map((key) => (
                          <th key={key} className="text-left px-3 py-2 font-medium whitespace-nowrap">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResults.rows.map((row, idx) => (
                        <tr key={idx} className="border-t border-border">
                          {Object.values(row).map((val, i) => (
                            <td key={i} className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                              {val === null ? <span className="text-muted-foreground italic">null</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>{queryResults.rowCount} rows returned</span>
                    <span>{queryResults.executionTime}ms</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-border bg-card flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => setActiveTab('query')}
          data-testid="button-new-query"
        >
          New Query
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1"
          onClick={handleRefresh}
          disabled={tablesLoading}
          data-testid="button-refresh-tables"
        >
          {tablesLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>
    </div>
  );
}
