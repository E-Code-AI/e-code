import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Database,
  Play,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Copy,
  Settings
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

interface MobileDatabasePanelProps {
  projectId: string;
  className?: string;
}

export function MobileDatabasePanel({ projectId, className }: MobileDatabasePanelProps) {
  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 100;');
  const [isConnected, setIsConnected] = useState(true);
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
        { name: 'content', type: 'TEXT', nullable: true }
      ]
    }
  ];

  const queryResults = [
    { id: 1, email: 'user1@example.com', name: 'John Doe', created_at: '2024-01-15' },
    { id: 2, email: 'user2@example.com', name: 'Jane Smith', created_at: '2024-01-16' },
    { id: 3, email: 'user3@example.com', name: 'Bob Johnson', created_at: '2024-01-17' }
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
    setActiveTab('results');
  };

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
            {tables.map((table) => (
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
                        <span className="font-mono">{col.name}</span>
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
                placeholder="SELECT * FROM users;"
                className="font-mono text-sm min-h-[120px]"
                data-testid="input-sql-query"
              />
            </div>
            <Button 
              onClick={runQuery} 
              className="w-full"
              data-testid="button-run-query"
            >
              <Play className="h-4 w-4 mr-2" />
              Run Query
            </Button>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="p-4">
            <div className="border border-border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    {Object.keys(queryResults[0] || {}).map((key) => (
                      <th key={key} className="text-left px-3 py-2 font-medium">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResults.map((row, idx) => (
                    <tr key={idx} className="border-t border-border">
                      {Object.values(row).map((val, i) => (
                        <td key={i} className="px-3 py-2 text-muted-foreground">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-muted-foreground text-center">
              {queryResults.length} rows returned
            </div>
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
          data-testid="button-refresh-tables"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
