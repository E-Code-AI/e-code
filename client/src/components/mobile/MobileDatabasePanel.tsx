import { useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  Database,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  FileText,
  Rocket,
  Key,
  Plus,
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

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("bg-[#242b3d] rounded-lg overflow-hidden relative", className)}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3d4452]/30 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-[#3d4452] rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ShimmerSkeleton className="w-[18px] h-[18px] rounded" />
            <div className="flex-1 space-y-2">
              <ShimmerSkeleton className="h-4 w-32" />
              <ShimmerSkeleton className="h-3 w-48" />
            </div>
            <ShimmerSkeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DataRowSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border border-[#3d4452] rounded-lg p-4 space-y-3">
          {[1, 2, 3].map((j) => (
            <div key={j} className="flex items-center justify-between">
              <ShimmerSkeleton className="h-3 w-20" />
              <ShimmerSkeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Database className="w-12 h-12 text-[#5c6670] opacity-40 mb-4" />
      <h3 className="text-[17px] font-medium leading-tight text-[#ffffff] mb-2 text-center">
        No Data Available
      </h3>
      <p className="text-[15px] leading-[20px] text-[#9da2a6] text-center mb-6 max-w-[280px]">
        This project doesn't have any data tables yet. Create your first table to get started.
      </p>
      {onAction && (
        <Button
          onClick={onAction}
          className="h-11 px-6 rounded-lg bg-[#0079f2] hover:bg-[#0079f2]/90 text-[#ffffff] text-[15px] font-medium"
          data-testid="button-create-table"
        >
          <Plus className="w-[18px] h-[18px] mr-2" />
          Create Table
        </Button>
      )}
    </div>
  );
}

export function MobileDatabasePanel({ projectId, className }: MobileDatabasePanelProps) {
  const [selectedTable, setSelectedTable] = useState<string>('files');
  const [activeTab, setActiveTab] = useState<'tables' | 'data'>('tables');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['files']));
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  const { toast } = useToast();

  const { data: tablesData, isLoading: tablesLoading, error: tablesError, refetch: refetchTables } = useQuery<ProjectDataTablesResponse>({
    queryKey: ['/api/projects', projectId, 'data/tables'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/projects/${projectId}/data/tables`);
      return response;
    },
    staleTime: 30000
  });

  const { data: tableData, isLoading: dataLoading } = useQuery<TableDataResponse>({
    queryKey: ['/api/projects', projectId, 'data', selectedTable, 'page', currentPage],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/projects/${projectId}/data/${selectedTable}/data?page=${currentPage}&limit=100`);
      return response;
    },
    enabled: !!selectedTable && activeTab === 'data',
    staleTime: 30000
  });

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

  const getSchemaForTable = (tableName: string) => {
    const queryIndex = schemasQueries.findIndex(
      (query) => query.data && (query.data as any).tableName === tableName
    );
    if (queryIndex !== -1) return schemasQueries[queryIndex];
    
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
    setCurrentPage(1);
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
    <div className={cn("flex flex-col h-full bg-[#0e1525]", className)} data-testid="mobile-database-panel">
      {/* Header */}
      <div className="p-4 border-b border-[#3d4452] min-h-[56px] flex flex-col justify-center space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] font-medium leading-tight text-[#ffffff] flex items-center gap-2">
            <Database className="w-[18px] h-[18px] text-[#0079f2]" />
            Project Data
          </h3>
          <Button
            variant="ghost"
            onClick={handleRefresh}
            disabled={tablesLoading}
            className="w-11 h-11 p-0 rounded-lg hover:bg-[#1c2333]"
            data-testid="button-refresh-database"
          >
            <RefreshCw className={cn("w-[18px] h-[18px] text-[#9da2a6]", tablesLoading && "animate-spin")} />
          </Button>
        </div>

        {tablesData && (
          <div className="text-[13px] text-[#5c6670]">
            {tablesData.projectName} • {tablesData.totalTables} data sources
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#3d4452]">
        <button
          onClick={() => setActiveTab('tables')}
          className={cn(
            "flex-1 h-11 text-[15px] font-medium border-b-2 transition-colors",
            activeTab === 'tables'
              ? "border-[#0079f2] text-[#0079f2]"
              : "border-transparent text-[#9da2a6] hover:text-[#ffffff]"
          )}
          data-testid="tab-tables"
        >
          Tables
        </button>
        <button
          onClick={() => setActiveTab('data')}
          disabled={!selectedTable}
          className={cn(
            "flex-1 h-11 text-[15px] font-medium border-b-2 transition-colors",
            activeTab === 'data'
              ? "border-[#0079f2] text-[#0079f2]"
              : "border-transparent text-[#9da2a6] hover:text-[#ffffff]",
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
          <div className="p-4 space-y-3">
            {tablesLoading && <TableSkeleton />}

            {tablesError && (
              <div className="text-center py-16">
                <Database className="w-12 h-12 text-[#5c6670] opacity-40 mx-auto mb-4" />
                <p className="text-[15px] text-[#9da2a6]">Failed to load project data</p>
                <Button
                  onClick={() => refetchTables()}
                  className="h-11 mt-4 px-6 rounded-lg bg-[#0079f2] hover:bg-[#0079f2]/90 text-[#ffffff]"
                >
                  Try Again
                </Button>
              </div>
            )}

            {tablesData && tablesData.tables.length === 0 && (
              <EmptyState onAction={() => {}} />
            )}

            {tablesData && tablesData.tables.map((table) => {
              const TableIconComponent = iconMap[table.icon] || Database;
              const isExpanded = expandedTables.has(table.name);

              return (
                <motion.div
                  key={table.name}
                  className="border border-[#3d4452] rounded-lg overflow-hidden bg-[#1c2333]"
                  data-testid={`table-${table.name}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between p-4 hover:bg-[#242b3d] transition-colors cursor-pointer">
                    <div
                      className="flex items-center gap-3 flex-1 min-h-[44px]"
                      onClick={() => handleTableSelect(table.name)}
                    >
                      <TableIconComponent className="w-[18px] h-[18px] text-[#0079f2]" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-medium text-[#ffffff] leading-[20px]">
                          {table.displayName}
                        </div>
                        <div className="text-[13px] text-[#5c6670] truncate">
                          {table.description}
                        </div>
                      </div>
                      <Badge className="bg-[#242b3d] text-[#9da2a6] border-[#3d4452] text-[11px] uppercase tracking-wider">
                        {table.rowCount} rows
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTableExpansion(table.name);
                      }}
                      className="w-11 h-11 p-0 rounded-lg hover:bg-[#3d4452] ml-2"
                      data-testid={`button-expand-${table.name}`}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-[18px] h-[18px] text-[#9da2a6]" />
                      ) : (
                        <ChevronRight className="w-[18px] h-[18px] text-[#9da2a6]" />
                      )}
                    </Button>
                  </div>

                  {isExpanded && (() => {
                    const schemaQuery = getSchemaForTable(table.name);
                    const schemaData = schemaQuery?.data;
                    const schemaLoading = schemaQuery?.isLoading;

                    return (
                      <motion.div
                        className="border-t border-[#3d4452] bg-[#0e1525] p-4 space-y-3"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {schemaLoading && (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <ShimmerSkeleton key={i} className="h-8 w-full" />
                            ))}
                          </div>
                        )}

                        {schemaData && schemaData.columns && (
                          <div className="space-y-2">
                            <div className="text-[11px] uppercase tracking-wider text-[#5c6670] font-medium mb-3">
                              Columns
                            </div>
                            {schemaData.columns.map((col: TableColumn) => (
                              <div
                                key={col.name}
                                className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1c2333] min-h-[40px]"
                                data-testid={`column-${col.name}`}
                              >
                                <span className="font-mono text-[13px] text-[#ffffff]">{col.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[13px] text-[#5c6670]">{col.type}</span>
                                  {col.isPrimaryKey && (
                                    <Badge className="bg-[#0079f2]/20 text-[#0079f2] border-[#0079f2]/30 text-[11px]">
                                      PK
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })()}
                </motion.div>
              );
            })}
          </div>
        )}

        {activeTab === 'data' && (
          <div className="p-4 space-y-3">
            {selectedTable && (
              <div className="flex items-center gap-2 min-h-[44px]">
                <Icon className="w-[18px] h-[18px] text-[#0079f2]" />
                <span className="text-[17px] font-medium text-[#ffffff]">
                  {tablesData?.tables.find(t => t.name === selectedTable)?.displayName || selectedTable}
                </span>
              </div>
            )}

            {dataLoading && <DataRowSkeleton />}

            {tableData && tableData.rows.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <TableIcon className="w-12 h-12 text-[#5c6670] opacity-40 mb-4" />
                <h3 className="text-[17px] font-medium leading-tight text-[#ffffff] mb-2">
                  No Data
                </h3>
                <p className="text-[15px] leading-[20px] text-[#9da2a6] text-center">
                  This table is empty
                </p>
              </div>
            )}

            {tableData && tableData.rows.length > 0 && (
              <div className="space-y-3">
                <div className="text-[13px] text-[#5c6670]">
                  Showing {tableData.rows.length} of {tableData.pagination.total} rows
                </div>

                {tableData.rows.map((row, idx) => (
                  <motion.div
                    key={idx}
                    className="border border-[#3d4452] rounded-lg p-4 space-y-3 bg-[#1c2333]"
                    data-testid={`row-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                  >
                    {Object.entries(row).map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between gap-3">
                        <span className="text-[13px] font-medium text-[#5c6670] shrink-0">
                          {key}:
                        </span>
                        <span className="text-[13px] font-mono text-[#ffffff] text-right break-all">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Bottom Action Bar - Pagination */}
      {activeTab === 'data' && tableData && (tableData.pagination.hasNextPage || tableData.pagination.hasPrevPage) && (
        <div
          className="border-t border-[#3d4452] bg-[#1c2333] p-4 flex items-center justify-between"
          style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
        >
          <Button
            variant="outline"
            disabled={!tableData.pagination.hasPrevPage}
            onClick={handlePrevPage}
            className="h-10 px-4 rounded-lg border-[#3d4452] bg-[#242b3d] text-[#ffffff] hover:bg-[#3d4452] disabled:opacity-50"
            data-testid="button-prev-page"
          >
            Previous
          </Button>
          <span className="text-[13px] text-[#9da2a6]">
            Page {tableData.pagination.page} of {tableData.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={!tableData.pagination.hasNextPage}
            onClick={handleNextPage}
            className="h-10 px-4 rounded-lg border-[#3d4452] bg-[#242b3d] text-[#ffffff] hover:bg-[#3d4452] disabled:opacity-50"
            data-testid="button-next-page"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
