/**
 * Agent Sessions Grid Component
 * AG Grid-based sessions table with filtering, sorting, and export
 * Phase 2 - Agent Activity Dashboard
 */

import { useState, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { useQuery } from '@tanstack/react-query';
import { 
  Download, RefreshCw, Filter, Search, Calendar, 
  ChevronDown, Loader2, Table2, SlidersHorizontal
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { defaultGridOptions, sessionGridColDefs } from './ag-grid-config';
import { gridCellRenderers } from './GridCellRenderers';
import type { AgentSessionRow, SessionsGridResponse } from '@shared/types/agent-grid.types';
import type { GridReadyEvent, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import './ag-grid-theme.css';

interface AgentSessionsGridProps {
  projectId?: number;
  onSessionSelect?: (session: AgentSessionRow) => void;
  height?: string | number;
}

export function AgentSessionsGrid({ 
  projectId, 
  onSessionSelect,
  height = 500 
}: AgentSessionsGridProps) {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [showFilters, setShowFilters] = useState(false);

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    params.set('sortDirection', 'desc');
    
    if (projectId) params.set('projectId', String(projectId));
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (modelFilter !== 'all') params.set('model', modelFilter);
    if (dateRange.start) params.set('startDate', dateRange.start.toISOString());
    if (dateRange.end) params.set('endDate', dateRange.end.toISOString());
    
    return params.toString();
  }, [page, pageSize, projectId, statusFilter, modelFilter, dateRange]);

  const { data, isLoading, error, refetch } = useQuery<SessionsGridResponse>({
    queryKey: ['/api/agent-grid/sessions', buildQueryParams()],
  });

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  const onRowClicked = useCallback((event: any) => {
    if (onSessionSelect && event.data) {
      onSessionSelect(event.data);
    }
  }, [onSessionSelect]);

  const handleExport = useCallback(async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(`/api/agent-grid/export/sessions?format=${format}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent-sessions-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, []);

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
      row.id.toLowerCase().includes(query) ||
      row.userName?.toLowerCase().includes(query) ||
      row.projectName?.toLowerCase().includes(query) ||
      row.model.toLowerCase().includes(query)
    );
  }, [data?.rows, searchQuery]);

  const gridOptions = useMemo(() => ({
    ...defaultGridOptions,
    onRowClicked,
    components: gridCellRenderers,
  }), [onRowClicked]);

  return (
    <div className="flex flex-col gap-4" data-testid="agent-sessions-grid">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Table2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Agent Sessions</h3>
          {data && (
            <Badge variant="secondary" className="ml-2">
              {data.totalCount.toLocaleString()} sessions
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => handleQuickFilter(e.target.value)}
              className="pl-8 w-[200px] sm:w-[250px] h-9"
              data-testid="input-search-sessions"
            />
          </div>

          {/* Filters Toggle */}
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <SlidersHorizontal className="h-4 w-4 mr-1" />
            Filters
          </Button>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-sessions"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>

          {/* Export */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-export">
                <Download className="h-4 w-4 mr-1" />
                Export
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleExport('csv')}
                data-testid="button-export-csv"
              >
                Export CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleExport('json')}
                data-testid="button-export-json"
              >
                Export JSON
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg" data-testid="filters-panel">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={modelFilter} onValueChange={setModelFilter}>
            <SelectTrigger className="w-[160px] h-8" data-testid="select-model-filter">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              <SelectItem value="gpt-5.1">GPT-5.1</SelectItem>
              <SelectItem value="claude-sonnet-4.5">Claude Sonnet 4.5</SelectItem>
              <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8" data-testid="button-date-range">
                <Calendar className="h-4 w-4 mr-1" />
                {dateRange.start ? (
                  dateRange.end ? (
                    `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d')}`
                  ) : (
                    format(dateRange.start, 'MMM d, yyyy')
                  )
                ) : (
                  'Date Range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{ from: dateRange.start, to: dateRange.end }}
                onSelect={(range) => setDateRange({ 
                  start: range?.from, 
                  end: range?.to 
                })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {(statusFilter !== 'all' || modelFilter !== 'all' || dateRange.start) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setStatusFilter('all');
                setModelFilter('all');
                setDateRange({});
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Grid */}
      <div 
        className="ag-theme-custom rounded-lg border overflow-hidden"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <p>Failed to load sessions</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <AgGridReact
            rowData={filteredData}
            columnDefs={sessionGridColDefs}
            gridOptions={gridOptions}
            onGridReady={onGridReady}
          />
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data.totalCount)} of {data.totalCount}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              data-testid="button-prev-page"
            >
              Previous
            </Button>
            <span className="px-2">
              Page {page} of {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage(p => p + 1)}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentSessionsGrid;
