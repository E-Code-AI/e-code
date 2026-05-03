import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Edit,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Table as TableIcon,
  Trash2
} from 'lucide-react';
import { useState } from 'react';

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  isPrimary?: boolean;
}

interface TableSchema {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
}

interface TablesResponse {
  tables: TableSchema[];
}

interface TableDataResponse {
  rows: any[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface QueryResponse {
  success: boolean;
  rows: any[];
  rowCount: number;
  fields: Array<{ name: string }>;
  executionTime: number;
  error?: string;
}

export function DatabaseBrowser({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [queryInput, setQueryInput] = useState('');
  const [queryResults, setQueryResults] = useState<QueryResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit/Delete row state
  const [editRowData, setEditRowData] = useState<{ row: any; pkColumn: string; pkValue: string } | null>(null);
  const [deleteRowData, setDeleteRowData] = useState<{ pkColumn: string; pkValue: string } | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Fetch tables list — uses unified project-scoped endpoint
  const { data: tablesData, isLoading: tablesLoading, refetch: refetchTables } = useQuery<TablesResponse>({
    queryKey: [`/api/database/project/${projectId}/tables`],
    enabled: !!projectId,
    queryFn: async () => apiRequest<TablesResponse>('GET', `/api/database/project/${projectId}/tables`)
  });

  // Fetch table data
  const { data: tableData, refetch: refetchTableData, isLoading: isLoadingTableData } = useQuery<TableDataResponse>({
    queryKey: [`/api/database/project/${projectId}/tables/${selectedTable}/data`, currentPage, pageSize],
    enabled: !!selectedTable,
    queryFn: async () =>
      apiRequest<TableDataResponse>('GET', `/api/database/project/${projectId}/tables/${selectedTable}/data?page=${currentPage}&pageSize=${pageSize}`)
  });

  // Detect primary key column for a table
  const getPkColumn = (tableName: string): string => {
    const schema = tablesData?.tables.find(t => t.name === tableName);
    const pk = schema?.columns.find(c => c.isPrimary);
    return pk?.name || schema?.columns[0]?.name || 'id';
  };

  // Execute SQL query
  const executeQueryMutation = useMutation({
    mutationFn: async (query: string) =>
      apiRequest<QueryResponse>('POST', `/api/database/project/${projectId}/sql/execute`, { query }),
    onSuccess: (data) => {
      setQueryResults(data);
      if (data.success) {
        toast({ title: 'Query executed', description: `${data.rowCount} rows · ${data.executionTime}ms` });
      } else {
        toast({ title: 'Query error', description: data.error, variant: 'destructive' });
      }
      refetchTableData();
      refetchTables();
    },
    onError: (error: Error) => {
      toast({ title: 'Query failed', description: error.message, variant: 'destructive' });
    }
  });

  // Update a row
  const updateRowMutation = useMutation({
    mutationFn: async ({ rowId, updates, pkColumn }: { rowId: string; updates: Record<string, string>; pkColumn: string }) =>
      apiRequest('PATCH', `/api/database/project/${projectId}/tables/${selectedTable}/rows/${encodeURIComponent(rowId)}`, { updates, pkColumn }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/database/project/${projectId}/tables/${selectedTable}/data`] });
      setEditRowData(null);
      toast({ title: 'Row updated', description: 'The row was updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    }
  });

  // Delete a row
  const deleteRowMutation = useMutation({
    mutationFn: async ({ rowId, pkColumn }: { rowId: string; pkColumn: string }) =>
      apiRequest('DELETE', `/api/database/project/${projectId}/tables/${selectedTable}/rows/${encodeURIComponent(rowId)}`, { pkColumn }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/database/project/${projectId}/tables/${selectedTable}/data`] });
      setDeleteRowData(null);
      toast({ title: 'Row deleted', description: 'The row was deleted successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
  });

  const handleExecuteQuery = () => {
    if (!queryInput.trim()) return;
    executeQueryMutation.mutate(queryInput);
  };

  const handleEditRow = (row: any) => {
    const pkCol = getPkColumn(selectedTable);
    setEditRowData({ row, pkColumn: pkCol, pkValue: String(row[pkCol]) });
    setEditValues(Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === null || v === undefined ? '' : String(v)])));
  };

  const handleDeleteRow = (row: any) => {
    const pkCol = getPkColumn(selectedTable);
    setDeleteRowData({ pkColumn: pkCol, pkValue: String(row[pkCol]) });
  };

  const handleConfirmEdit = () => {
    if (!editRowData) return;
    const updates = { ...editValues };
    delete updates[editRowData.pkColumn];
    updateRowMutation.mutate({ rowId: editRowData.pkValue, updates, pkColumn: editRowData.pkColumn });
  };

  const handleConfirmDelete = () => {
    if (!deleteRowData) return;
    deleteRowMutation.mutate({ rowId: deleteRowData.pkValue, pkColumn: deleteRowData.pkColumn });
  };

  const exportTable = async () => {
    try {
      const data = await apiRequest('GET', `/api/database/project/${projectId}/tables/${selectedTable}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Table exported', description: `${selectedTable} data exported successfully` });
    } catch (error: any) {
      toast({ title: 'Export failed', description: error?.message || 'Failed to export table data', variant: 'destructive' });
    }
  };

  const dbInfo = tablesData ? {
    name: 'Project Database',
    size: '-',
    tables: tablesData.tables
  } : null;

  const filteredTables = (tablesData?.tables || []).filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <div>
              <CardTitle className="text-[15px]">Database Browser</CardTitle>
              <CardDescription>
                {dbInfo ? `${dbInfo.tables.length} tables` : 'PostgreSQL Database'}
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetchTables(); refetchTableData(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <div className="flex-1 flex overflow-hidden">
        {/* Tables Sidebar */}
        <div className="w-64 border-r border-[var(--ecode-border)] bg-[var(--ecode-surface)] flex flex-col">
          <div className="px-2.5 py-1.5 border-b border-[var(--ecode-border)] shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--ecode-text-muted)]" />
              <Input
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-7 text-xs bg-[var(--ecode-sidebar-hover)] border-[var(--ecode-border)]"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {tablesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="p-2">
                {filteredTables.map((table) => (
                  <button
                    key={table.name}
                    onClick={() => { setSelectedTable(table.name); setCurrentPage(1); }}
                    className={`w-full text-left p-3 rounded-md mb-1 transition-colors ${
                      selectedTable === table.name
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TableIcon className="h-4 w-4" />
                        <span className="text-[13px] font-medium">{table.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-[11px]">
                        {table.rowCount}
                      </Badge>
                    </div>
                  </button>
                ))}
                {filteredTables.length === 0 && !tablesLoading && (
                  <p className="text-center text-[13px] text-muted-foreground py-4">
                    {searchTerm ? 'No matching tables' : 'No tables yet'}
                  </p>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs defaultValue="data" className="flex-1 flex flex-col">
            <div className="border-b px-4 shrink-0">
              <TabsList className="h-12 bg-transparent">
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="structure">Structure</TabsTrigger>
                <TabsTrigger value="query">Query</TabsTrigger>
              </TabsList>
            </div>

            {/* DATA TAB */}
            <TabsContent value="data" className="m-0 flex-1 flex flex-col overflow-hidden">
              {selectedTable ? (
                <>
                  <div className="h-9 px-2.5 flex items-center justify-between border-b border-[var(--ecode-border)] shrink-0">
                    <span className="text-xs font-medium text-[var(--ecode-text)]">{selectedTable}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={exportTable} className="h-7 w-7 text-[var(--ecode-text-muted)]" title="Export">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-[hsl(142,72%,42%)]"
                        title="Insert row (use Query tab)"
                        onClick={() => setQueryInput(`INSERT INTO "${selectedTable}" () VALUES ();`)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto">
                    {isLoadingTableData ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : tableData && tableData.rows && tableData.rows.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(tableData.rows[0]).map((column) => (
                              <TableHead key={column} className="font-medium">{column}</TableHead>
                            ))}
                            <TableHead className="w-24">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableData.rows.map((row: any, index: number) => (
                            <TableRow key={index}>
                              {Object.values(row).map((value: any, i: number) => (
                                <TableCell key={i} className="font-mono text-[13px] max-w-[200px] truncate">
                                  {value === null ? (
                                    <span className="text-muted-foreground italic">NULL</span>
                                  ) : typeof value === 'object' ? (
                                    <span className="text-[11px]">{JSON.stringify(value)}</span>
                                  ) : (
                                    String(value)
                                  )}
                                </TableCell>
                              ))}
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Edit row"
                                    onClick={() => handleEditRow(row)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    title="Delete row"
                                    onClick={() => handleDeleteRow(row)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <TableIcon className="h-12 w-12 mb-4" />
                        <p>No data in this table</p>
                      </div>
                    )}
                  </div>

                  {tableData && tableData.totalRows > pageSize && (
                    <div className="p-4 border-t flex items-center justify-between shrink-0">
                      <p className="text-[13px] text-muted-foreground">
                        Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, tableData.totalRows)} of {tableData.totalRows} rows
                      </p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-[13px]">Page {currentPage}</span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage * pageSize >= tableData.totalRows}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Database className="h-12 w-12 mb-4" />
                  <p>Select a table to view data</p>
                </div>
              )}
            </TabsContent>

            {/* STRUCTURE TAB */}
            <TabsContent value="structure" className="m-0 p-4 overflow-auto">
              {selectedTable && (tablesData?.tables.find(t => t.name === selectedTable)) ? (
                <div className="space-y-4">
                  <h3 className="font-semibold">{selectedTable} Structure</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Column</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Nullable</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead>Key</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tablesData!.tables
                        .find(t => t.name === selectedTable)!
                        .columns.map((column) => (
                          <TableRow key={column.name}>
                            <TableCell className="font-mono">{column.name}</TableCell>
                            <TableCell className="font-mono text-[13px]">{column.type}</TableCell>
                            <TableCell>{column.nullable ? 'Yes' : 'No'}</TableCell>
                            <TableCell className="font-mono text-[13px]">{column.default || '-'}</TableCell>
                            <TableCell>
                              {column.isPrimary && (
                                <Badge variant="outline" className="gap-1">
                                  <Key className="h-3 w-3" />
                                  Primary
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                  <TableIcon className="h-12 w-12 mb-4" />
                  <p>Select a table to view its structure</p>
                </div>
              )}
            </TabsContent>

            {/* QUERY TAB */}
            <TabsContent value="query" className="m-0 flex flex-col h-full overflow-hidden">
              <div className="flex-1 flex flex-col p-4 space-y-4 min-h-0">
                <div className="flex-1 min-h-[120px]">
                  <textarea
                    value={queryInput}
                    onChange={(e) => setQueryInput(e.target.value)}
                    placeholder="Enter SQL query... (SELECT, INSERT, UPDATE, DELETE)"
                    className="w-full h-full p-4 font-mono text-[13px] bg-background border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex justify-between items-center shrink-0">
                  <p className="text-[13px] text-muted-foreground">
                    DDL destructive operations (DROP DATABASE/SCHEMA) are blocked
                  </p>
                  <Button
                    onClick={handleExecuteQuery}
                    disabled={!queryInput.trim() || executeQueryMutation.isPending}
                  >
                    {executeQueryMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Execute
                  </Button>
                </div>

                {queryResults && (
                  <div className="space-y-2 overflow-auto max-h-64">
                    <div className="flex items-center justify-between text-[13px] text-muted-foreground">
                      <span>{queryResults.success ? `${queryResults.rowCount} rows` : 'Error'}</span>
                      <span>{queryResults.executionTime}ms</span>
                    </div>
                    {queryResults.error ? (
                      <div className="p-3 bg-destructive/10 text-destructive rounded-md text-[13px] font-mono">
                        {queryResults.error}
                      </div>
                    ) : queryResults.rows.length > 0 ? (
                      <div className="border rounded-lg overflow-auto max-h-52">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(queryResults.rows[0]).map(col => (
                                <TableHead key={col}>{col}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {queryResults.rows.slice(0, 100).map((row, idx) => (
                              <TableRow key={idx}>
                                {Object.values(row).map((val: any, i) => (
                                  <TableCell key={i} className="font-mono text-[13px]">
                                    {val === null ? <span className="text-muted-foreground italic">NULL</span> : String(val)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-[13px] text-muted-foreground">Query executed successfully (no rows returned)</p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Row Dialog */}
      <Dialog open={!!editRowData} onOpenChange={(open) => !open && setEditRowData(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Row</DialogTitle>
            <DialogDescription>
              Editing row where {editRowData?.pkColumn} = {editRowData?.pkValue}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-2">
            {editRowData && Object.keys(editRowData.row).map((col) => (
              <div key={col} className="space-y-1">
                <Label className="text-[13px]">
                  {col}
                  {col === editRowData.pkColumn && (
                    <span className="ml-1 text-[11px] text-muted-foreground">(primary key — read only)</span>
                  )}
                </Label>
                <Input
                  value={editValues[col] ?? ''}
                  disabled={col === editRowData.pkColumn}
                  onChange={(e) => setEditValues(v => ({ ...v, [col]: e.target.value }))}
                  className="font-mono text-[13px]"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRowData(null)}>Cancel</Button>
            <Button onClick={handleConfirmEdit} disabled={updateRowMutation.isPending}>
              {updateRowMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Row Confirmation Dialog */}
      <Dialog open={!!deleteRowData} onOpenChange={(open) => !open && setDeleteRowData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Row</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the row where {deleteRowData?.pkColumn} = {deleteRowData?.pkValue}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRowData(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteRowMutation.isPending}>
              {deleteRowMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
