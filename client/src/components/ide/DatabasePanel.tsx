import { useState, useEffect } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Database,
  Table,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Circle,
  CheckCircle,
  AlertCircle,
  Search,
  Settings,
  Key,
  FileText,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface DatabasePanelProps {
  projectId: string;
}

interface TableInfo {
  name: string;
  displayName: string;
  icon: 'table' | 'file' | 'key' | 'rocket';
  rowCount: number;
}

interface TableColumn {
  name: string;
  type: string;
  nullable?: boolean;
  isPrimaryKey?: boolean;
}

interface ProjectDataTablesResponse {
  tables: TableInfo[];
}

interface TableSchemaResponse {
  tableName: string;
  columns: TableColumn[];
}

interface TableDataResponse {
  tableName: string;
  data: any[];
  pagination: {
    page: number;
    limit: number;
    totalRows: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const tableIcons = {
  table: Table,
  file: FileText,
  key: Key,
  rocket: Database
};

export function DatabasePanel({ projectId }: DatabasePanelProps) {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const { toast } = useToast();

  // Fetch tables list - Admin DB or Project Data depending on permissions
  const { data: tablesData, isLoading: tablesLoading, error: tablesError, refetch: refetchTables } = useQuery<ProjectDataTablesResponse>({
    queryKey: isAdmin ? ['/api/admin/database/tables'] : ['/api/projects', projectId, 'data/tables'],
    queryFn: async () => {
      try {
        const endpoint = isAdmin 
          ? '/api/admin/database/tables'
          : `/api/projects/${projectId}/data/tables`;
        const response = await apiRequest('GET', endpoint);
        return response;
      } catch (error: any) {
        console.error('[DatabasePanel] Tables fetch error:', error);
        throw error;
      }
    },
    staleTime: 30000,
    enabled: isAdmin || !!projectId
  });

  // Get all tables from response
  const allTables = tablesData?.tables || [];
  
  // Create stable table identity hash for useEffect dependency
  const tablesHash = allTables.map(t => t.name).join(',');

  // Reset state when admin mode changes or tables list changes
  useEffect(() => {
    if (allTables.length > 0) {
      const firstTable = allTables[0].name;
      // Only reset if selectedTable is empty or doesn't exist in current tables
      if (!selectedTable || !allTables.some(t => t.name === selectedTable)) {
        setSelectedTable(firstTable);
        setExpandedTables(new Set([firstTable]));
        setCurrentPage(1);
      }
    }
  }, [isAdmin, tablesHash]);

  // Fetch table data - Admin DB or Project Data
  // Guard: only fetch if selectedTable exists in current tables list
  const tableExists = allTables.some(t => t.name === selectedTable);
  
  const { data: tableData, isLoading: dataLoading, error: dataError } = useQuery<TableDataResponse>({
    queryKey: isAdmin 
      ? ['/api/admin/database', selectedTable, 'data', 'page', currentPage]
      : ['/api/projects', projectId, 'data', selectedTable, 'page', currentPage],
    queryFn: async () => {
      const endpoint = isAdmin
        ? `/api/admin/database/${selectedTable}/data?page=${currentPage}&limit=100`
        : `/api/projects/${projectId}/data/${selectedTable}/data?page=${currentPage}&limit=100`;
      const response = await apiRequest('GET', endpoint);
      return response;
    },
    enabled: !!selectedTable && tableExists,
    staleTime: 30000
  });

  // Fetch table schemas for expanded tables using useQueries (stable hook count)
  const schemasQueries = useQueries({
    queries: allTables.map(table => ({
      queryKey: isAdmin
        ? ['/api/admin/database', table.name, 'schema']
        : ['/api/projects', projectId, 'data', table.name, 'schema'],
      queryFn: async () => {
        const endpoint = isAdmin
          ? `/api/admin/database/${table.name}/schema`
          : `/api/projects/${projectId}/data/${table.name}/schema`;
        const response = await apiRequest('GET', endpoint);
        return response;
      },
      enabled: expandedTables.has(table.name),
      staleTime: 60000
    }))
  });

  // Helper to get schema for a specific table
  const getSchemaForTable = (tableName: string) => {
    const tableIndex = allTables.findIndex(t => t.name === tableName);
    if (tableIndex === -1) return undefined;
    return schemasQueries[tableIndex];
  };

  const toggleTableExpansion = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setCurrentPage(1);
  };

  const handleNextPage = () => {
    if (tableData?.pagination.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (tableData?.pagination.hasPrevPage) {
      setCurrentPage(prev => Math.max(1, prev - 1));
    }
  };

  const handleRefresh = () => {
    refetchTables();
    toast({
      title: 'Refreshed',
      description: 'Database tables refreshed successfully'
    });
  };

  // Filter tables by search term
  const filteredTables = allTables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Error state
  if (tablesError) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">
            {(tablesError as any).message || 'Failed to load database tables'}
          </p>
          <Button onClick={() => refetchTables()} size="sm" variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Database</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-status-success" />
          <span className="text-sm text-foreground">
            {isAdmin ? `Admin Database • ${allTables.length} tables` : `Project Database • ${allTables.length} tables`}
          </span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tables */}
        <div className="w-1/3 border-r border-border flex flex-col">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search tables..."
                className="h-7 pl-7 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-tables"
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            {tablesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="p-2">
                {filteredTables.map((table) => {
                  const isExpanded = expandedTables.has(table.name);
                  const Icon = tableIcons[table.icon] || Table;
                  const schemaQuery = getSchemaForTable(table.name);
                  const schemaData = schemaQuery?.data as TableSchemaResponse | undefined;
                  const schemaLoading = schemaQuery?.isLoading;

                  return (
                    <div key={table.name} className="mb-1">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 hover:bg-muted"
                          onClick={() => toggleTableExpansion(table.name)}
                          data-testid={`button-expand-${table.name}`}
                        >
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </Button>
                        <button
                          onClick={() => handleTableSelect(table.name)}
                          className={cn(
                            "flex-1 flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-left",
                            selectedTable === table.name && "bg-status-info/10"
                          )}
                          data-testid={`button-select-${table.name}`}
                        >
                          <Icon className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-foreground flex-1">{table.displayName}</span>
                          <span className="text-xs text-muted-foreground">{table.rowCount}</span>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="ml-7 mt-1">
                          {schemaLoading && (
                            <div className="flex items-center justify-center py-2">
                              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          {schemaData?.columns?.map((column) => (
                            <div
                              key={column.name}
                              className="flex items-center justify-between px-2 py-0.5 text-xs hover:bg-muted rounded"
                            >
                              <div className="flex items-center gap-2">
                                <Circle className="h-2 w-2 text-muted-foreground" />
                                <span className="text-foreground font-mono">{column.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">{column.type}</span>
                                {column.isPrimaryKey && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    PK
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Data */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-3">
              {dataLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : tableData && tableData.data && tableData.data.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      {selectedTable} • {tableData.pagination.totalRows} rows
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Page {tableData.pagination.page} of {tableData.pagination.totalPages}
                    </span>
                  </div>

                  <div className="border border-border rounded overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted border-b border-border">
                            {Object.keys(tableData.data[0] || {}).map((key) => (
                              <th key={key} className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.data.map((row, index) => (
                            <tr key={index} className="border-b border-border hover:bg-muted">
                              {Object.entries(row).map(([key, value], i) => (
                                <td key={i} className="px-3 py-2 text-muted-foreground font-mono whitespace-nowrap">
                                  {typeof value === 'object' && value !== null
                                    ? JSON.stringify(value)
                                    : String(value || '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {(tableData.pagination.hasNextPage || tableData.pagination.hasPrevPage) && (
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!tableData.pagination.hasPrevPage}
                        onClick={handlePrevPage}
                        data-testid="button-prev-page"
                      >
                        Previous
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Page {tableData.pagination.page} of {tableData.pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!tableData.pagination.hasNextPage}
                        onClick={handleNextPage}
                        data-testid="button-next-page"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">No data available</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
