import { useState, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Database,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  FileText,
  Rocket,
  Key,
  Loader2,
  Table as TableIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey?: boolean;
}

interface TableInfo {
  name: string;
  displayName: string;
  rowCount: number;
  description: string;
  icon: string;
  columns?: TableColumn[];
}

interface ProjectDataTablesResponse {
  projectId: string;
  projectName: string;
  tables: TableInfo[];
  totalTables: number;
}

interface TableDataResponse {
  tableName: string;
  projectId: string;
  rows: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface MobileDatabasePanelProps {
  projectId: string;
  className?: string;
}

const iconMap: Record<string, any> = {
  FileText,
  Rocket,
  Key,
  Database
};

export function MobileDatabasePanel({ projectId, className }: MobileDatabasePanelProps) {
  const [selectedTable, setSelectedTable] = useState<string>('files');
  const [activeTab, setActiveTab] = useState<'tables' | 'data'>('tables');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['files']));
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  const { toast } = useToast();

  // Fetch project data tables list (project-scoped)
  const { data: tablesData, isLoading: tablesLoading, error: tablesError, refetch: refetchTables } = useQuery<ProjectDataTablesResponse>({
    queryKey: ['/api/projects', projectId, 'data/tables'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/projects/${projectId}/data/tables`);
      return response;
    },
    staleTime: 30000 // Cache for 30 seconds
  });

  // Fetch table data (project-scoped)
  const { data: tableData, isLoading: dataLoading } = useQuery<TableDataResponse>({
    queryKey: ['/api/projects', projectId, 'data', selectedTable, 'page', currentPage],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/projects/${projectId}/data/${selectedTable}/data?page=${currentPage}&limit=100`);
      return response;
    },
    enabled: !!selectedTable && activeTab === 'data',
    staleTime: 30000
  });

  // Fetch table schemas for expanded tables using useQueries (stable hook count)
  // Always query for all tables but only enable for expanded ones
  const allTables = tablesData?.tables || [];
  
  const schemasQueries = useQueries({
    queries: allTables.map(table => ({
      queryKey: ['/api/projects', projectId, 'data', table.name, 'schema'],
      queryFn: async () => {
        const response = await apiRequest('GET', `/api/projects/${projectId}/data/${table.name}/schema`);
        return response;
      },
      enabled: expandedTables.has(table.name),
      staleTime: 60000
    }))
  });

  // Helper to get schema for a specific table (keyed by table name to avoid index desync)
  const getSchemaForTable = (tableName: string) => {
    const queryIndex = schemasQueries.findIndex(
      (query) => query.data && (query.data as any).tableName === tableName
    );
    if (queryIndex !== -1) return schemasQueries[queryIndex];
    
    // If not found in data, try to match by queryKey
    const matchingQuery = schemasQueries.find((_, idx) => {
      const table = allTables[idx];
      return table && table.name === tableName;
    });
    
    return matchingQuery;
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
    setCurrentPage(1); // Reset to first page when changing table
    setActiveTab('data');
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
      title: "Refreshed",
      description: "Project data reloaded"
    });
  };

  const Icon = selectedTable && tablesData?.tables.find(t => t.name === selectedTable)
    ? iconMap[tablesData.tables.find(t => t.name === selectedTable)!.icon] || Database
    : Database;

  return (
    <div className={cn("flex flex-col h-full bg-background", className)} data-testid="mobile-database-panel">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            Project Data
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={tablesLoading}
            data-testid="button-refresh-database"
          >
            <RefreshCw className={cn("h-4 w-4", tablesLoading && "animate-spin")} />
          </Button>
        </div>

        {tablesData && (
          <div className="text-xs text-muted-foreground">
            {tablesData.projectName} • {tablesData.totalTables} data sources
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('tables')}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'tables'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
          data-testid="tab-tables"
        >
          Tables
        </button>
        <button
          onClick={() => setActiveTab('data')}
          disabled={!selectedTable}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === 'data'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
            !selectedTable && "opacity-50 cursor-not-allowed"
          )}
          data-testid="tab-data"
        >
          Data
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === 'tables' && (
          <div className="p-4 space-y-2">
            {tablesLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {tablesError && (
              <div className="text-center py-12 text-sm text-destructive">
                Failed to load project data
              </div>
            )}

            {tablesData && tablesData.tables.map((table) => {
              const TableIcon = iconMap[table.icon] || Database;
              const isExpanded = expandedTables.has(table.name);

              return (
                <div key={table.name} className="border rounded-lg overflow-hidden" data-testid={`table-${table.name}`}>
                  <div className="flex items-center justify-between p-3 bg-card hover:bg-accent transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 flex-1" onClick={() => handleTableSelect(table.name)}>
                      <TableIcon className="h-4 w-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{table.displayName}</div>
                        <div className="text-xs text-muted-foreground truncate">{table.description}</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {table.rowCount} rows
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTableExpansion(table.name);
                      }}
                      data-testid={`button-expand-${table.name}`}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </div>

                  {isExpanded && (() => {
                    const schemaQuery = getSchemaForTable(table.name);
                    const schemaData = schemaQuery?.data;
                    const schemaLoading = schemaQuery?.isLoading;

                    return (
                      <div className="border-t bg-muted/30 p-3 space-y-2">
                        {schemaLoading && (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        )}

                        {schemaData && schemaData.columns && (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground mb-2">Columns:</div>
                            {schemaData.columns.map((col: TableColumn) => (
                              <div
                                key={col.name}
                                className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background"
                                data-testid={`column-${col.name}`}
                              >
                                <span className="font-mono">{col.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">{col.type}</span>
                                  {col.isPrimaryKey && (
                                    <Badge variant="outline" className="text-xs">PK</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'data' && (
          <div className="p-4 space-y-4">
            {selectedTable && (
              <div className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {tablesData?.tables.find(t => t.name === selectedTable)?.displayName || selectedTable}
                </span>
              </div>
            )}

            {dataLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {tableData && tableData.rows.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No data available
              </div>
            )}

            {tableData && tableData.rows.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Showing {tableData.rows.length} of {tableData.pagination.total} rows
                </div>

                {tableData.rows.map((row, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-3 space-y-2 bg-card"
                    data-testid={`row-${idx}`}
                  >
                    {Object.entries(row).map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{key}:</span>
                        <span className="text-xs font-mono text-right break-all">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}

                {(tableData.pagination.hasNextPage || tableData.pagination.hasPrevPage) && (
                  <div className="flex items-center justify-between pt-2">
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
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
