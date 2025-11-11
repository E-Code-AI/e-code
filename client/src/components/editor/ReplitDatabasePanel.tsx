import React, { useState } from 'react';
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
  Upload,
  Plus,
  ChevronRight,
  ChevronDown,
  Circle,
  CheckCircle,
  AlertCircle,
  Search,
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

export function ReplitDatabasePanel({ projectId }: { projectId?: string }) {
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
    console.log('Running query:', query);
    setActiveTab('results');
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Database</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle className="h-4 w-4 text-status-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-status-critical" />
            )}
            <span className="text-sm text-foreground">
              {isConnected ? 'Connected to PostgreSQL' : 'Disconnected'}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Sidebar - Tables */}
        <div className="w-1/3 border-r border-border">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search tables..."
                className="h-7 pl-7 text-xs"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2">
              {tables.map((table) => (
                <div key={table.name} className="mb-1">
                  <button
                    onClick={() => toggleTableExpansion(table.name)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-left",
                      selectedTable === table.name && "bg-status-info/10"
                    )}
                  >
                    {expandedTables.has(table.name) ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    <Table className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm text-foreground flex-1">{table.name}</span>
                    <span className="text-xs text-muted-foreground">{table.rowCount}</span>
                  </button>

                  {expandedTables.has(table.name) && (
                    <div className="ml-7 mt-1">
                      {table.columns.map((column) => (
                        <div
                          key={column.name}
                          className="flex items-center justify-between px-2 py-0.5 text-xs hover:bg-muted rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Circle className="h-2 w-2 text-muted-foreground" />
                            <span className="text-foreground">{column.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">{column.type}</span>
                            {!column.nullable && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
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
          </ScrollArea>
        </div>

        {/* Right Panel - Query & Results */}
        <div className="flex-1 flex flex-col">
          {/* Query Editor */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Select value="sql" disabled>
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sql">SQL</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={runQuery}
                  className="h-7 px-3 text-xs"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Run Query
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter SQL query..."
              className="font-mono text-xs min-h-[100px]"
              spellCheck={false}
            />
          </div>

          {/* Results */}
          <ScrollArea className="flex-1">
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-foreground">Query Results</span>
                <span className="text-xs text-muted-foreground">
                  {queryResults.length} rows • 0.023s
                </span>
              </div>

              <div className="border border-border rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      {Object.keys(queryResults[0] || {}).map((key) => (
                        <th key={key} className="px-3 py-2 text-left font-medium text-foreground">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResults.map((row, index) => (
                      <tr key={index} className="border-b border-border hover:bg-muted">
                        {Object.values(row).map((value, i) => (
                          <td key={i} className="px-3 py-2 text-muted-foreground">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}