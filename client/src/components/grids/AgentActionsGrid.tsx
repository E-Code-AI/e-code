/**
 * Agent Actions Grid Component
 * AG Grid-based actions table with filtering and master/detail
 * Phase 2 - Agent Activity Dashboard
 */

import { useState, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { useQuery } from '@tanstack/react-query';
import { 
  RefreshCw, Filter, Search, Loader2, Activity, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { defaultGridOptions, actionGridColDefs } from './ag-grid-config';
import { gridCellRenderers } from './GridCellRenderers';
import type { AgentActionRow, ActionsGridResponse } from '@shared/types/agent-grid.types';
import type { GridReadyEvent, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import './ag-grid-theme.css';

interface AgentActionsGridProps {
  sessionId?: string;
  onActionSelect?: (action: AgentActionRow) => void;
  height?: string | number;
}

export function AgentActionsGrid({ 
  sessionId, 
  onActionSelect,
  height = 400 
}: AgentActionsGridProps) {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    
    if (sessionId) params.set('sessionId', sessionId);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('actionType', typeFilter);
    
    return params.toString();
  }, [page, pageSize, sessionId, statusFilter, typeFilter]);

  const { data, isLoading, error, refetch } = useQuery<ActionsGridResponse>({
    queryKey: ['/api/agent-grid/actions', buildQueryParams()],
    enabled: !!sessionId || true,
  });

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  const onRowClicked = useCallback((event: any) => {
    if (onActionSelect && event.data) {
      onActionSelect(event.data);
    }
  }, [onActionSelect]);

  const handleQuickFilter = useCallback((text: string) => {
    setSearchQuery(text);
    if (gridApi) {
      gridApi.setGridOption('quickFilterText', text);
    }
  }, [gridApi]);

  const filteredData = useMemo(() => {
    if (!data?.rows) return [];
    if (!searchQuery) return data.rows;
    
    const query = searchQuery.toLowerCase();
    return data.rows.filter(row => 
      row.actionLabel.toLowerCase().includes(query) ||
      row.target.toLowerCase().includes(query) ||
      row.status.toLowerCase().includes(query)
    );
  }, [data?.rows, searchQuery]);

  const errorCount = useMemo(() => {
    return data?.rows?.filter(r => r.status === 'failed').length || 0;
  }, [data?.rows]);

  const gridOptions = useMemo(() => ({
    ...defaultGridOptions,
    onRowClicked,
    components: gridCellRenderers,
    rowHeight: 44,
  }), [onRowClicked]);

  return (
    <div className="flex flex-col gap-3" data-testid="agent-actions-grid">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium text-sm">Actions</h4>
          {data && (
            <>
              <Badge variant="secondary" className="text-xs">
                {data.totalCount} total
              </Badge>
              {errorCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {errorCount} errors
                </Badge>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => handleQuickFilter(e.target.value)}
              className="pl-7 w-[150px] h-8 text-xs"
              data-testid="input-search-actions"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[100px] h-8 text-xs" data-testid="select-action-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs" data-testid="select-action-type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="file_create">File Create</SelectItem>
              <SelectItem value="file_edit">File Edit</SelectItem>
              <SelectItem value="command_execute">Command</SelectItem>
              <SelectItem value="package_install">Package</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-8 w-8 p-0"
            data-testid="button-refresh-actions"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div 
        className="ag-theme-custom rounded-lg border overflow-hidden"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground text-sm">
            <p>Failed to load actions</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <AgGridReact
            rowData={filteredData}
            columnDefs={actionGridColDefs}
            gridOptions={gridOptions}
            onGridReady={onGridReady}
          />
        )}
      </div>
    </div>
  );
}

export default AgentActionsGrid;
