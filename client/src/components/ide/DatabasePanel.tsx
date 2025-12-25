import { useState, useEffect } from 'react';
import { useQuery, useQueries, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  Loader2,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Server,
  HardDrive,
  Users,
  Calendar,
  Archive,
  RotateCcw,
  Download,
  Plus,
  Clock
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

interface DatabaseInfo {
  provisioned: boolean;
  status?: 'running' | 'stopped' | 'error' | 'provisioning';
  host?: string;
  port?: number;
  databaseName?: string;
  username?: string;
  storageUsedMb?: number;
  storageLimitMb?: number;
  connectionCount?: number;
  maxConnections?: number;
  lastBackupAt?: string;
  plan?: string;
  region?: string;
}

interface DatabaseCredentials {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
  connectionUrl: string;
}

interface ProvisionRequest {
  plan: string;
  region: string;
  provider?: string;
}

interface BackupInfo {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'expired';
  backupType: 'scheduled' | 'manual' | 'pre_migration' | 'pitr';
  sizeBytes?: number;
  restorePoint?: string;
  createdAt: string;
  expiresAt?: string;
  completedAt?: string;
}

interface BackupsResponse {
  backups: BackupInfo[];
}

interface DatabaseStats {
  stats: {
    storagePercent: number;
    connectionPercent: number;
    status: string;
    lastBackup: string | null;
    provider: string;
    backupCount: number;
  };
}

const tableIcons = {
  table: Table,
  file: FileText,
  key: Key,
  rocket: Database
};

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free', storage: '500MB' },
  { value: 'starter', label: 'Starter', storage: '2GB' },
  { value: 'pro', label: 'Pro', storage: '10GB' },
  { value: 'enterprise', label: 'Enterprise', storage: '100GB' },
];

const REGION_OPTIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU (Ireland)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
];

export function DatabasePanel({ projectId }: DatabasePanelProps) {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('data');
  const [selectedPlan, setSelectedPlan] = useState<string>('free');
  const [selectedRegion, setSelectedRegion] = useState<string>('us-east-1');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  const { toast } = useToast();

  const { data: databaseInfo, isLoading: databaseInfoLoading, refetch: refetchDatabaseInfo } = useQuery<DatabaseInfo>({
    queryKey: ['/api/database/project', projectId],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/database/project/${projectId}`);
        return response;
      } catch (error: any) {
        if (error?.status === 404) {
          return { provisioned: false };
        }
        throw error;
      }
    },
    staleTime: 30000,
    enabled: !!projectId
  });

  const { data: credentials, isLoading: credentialsLoading, refetch: refetchCredentials } = useQuery<DatabaseCredentials>({
    queryKey: ['/api/database/project', projectId, 'credentials'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/database/project/${projectId}/credentials`);
      return response;
    },
    staleTime: 60000,
    enabled: !!projectId && databaseInfo?.provisioned === true
  });

  const provisionMutation = useMutation({
    mutationFn: async (data: ProvisionRequest) => {
      return apiRequest('POST', `/api/database/project/${projectId}/provision`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/database/project', projectId] });
      toast({
        title: 'Database Provisioned',
        description: 'Your PostgreSQL database is being provisioned. It will be ready shortly.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Provisioning Failed',
        description: error.message || 'Failed to provision database',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/database/project/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/database/project', projectId] });
      toast({
        title: 'Database Deleted',
        description: 'Your database has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Failed to delete database',
        variant: 'destructive',
      });
    },
  });

  const { data: backupsData, isLoading: backupsLoading, refetch: refetchBackups } = useQuery<BackupsResponse>({
    queryKey: ['/api/database/project', projectId, 'backups'],
    queryFn: async () => {
      return apiRequest('GET', `/api/database/project/${projectId}/backups`);
    },
    staleTime: 30000,
    enabled: !!projectId && databaseInfo?.provisioned === true
  });

  const createBackupMutation = useMutation({
    mutationFn: async (data: { name?: string; backupType?: string }) => {
      return apiRequest('POST', `/api/database/project/${projectId}/backups`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/database/project', projectId, 'backups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/database/project', projectId] });
      toast({
        title: 'Backup Created',
        description: 'Your database backup has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Backup Failed',
        description: error.message || 'Failed to create backup',
        variant: 'destructive',
      });
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: number) => {
      return apiRequest('POST', `/api/database/project/${projectId}/backups/${backupId}/restore`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/database/project', projectId] });
      toast({
        title: 'Restore Initiated',
        description: 'Database restore has been initiated. This may take a few minutes.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Restore Failed',
        description: error.message || 'Failed to restore backup',
        variant: 'destructive',
      });
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: number) => {
      return apiRequest('DELETE', `/api/database/project/${projectId}/backups/${backupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/database/project', projectId, 'backups'] });
      toast({
        title: 'Backup Deleted',
        description: 'The backup has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete backup',
        variant: 'destructive',
      });
    },
  });

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
    enabled: (isAdmin || !!projectId) && activeTab === 'data'
  });

  const allTables = tablesData?.tables || [];
  const tablesHash = allTables.map(t => t.name).join(',');

  useEffect(() => {
    if (allTables.length > 0) {
      const firstTable = allTables[0].name;
      if (!selectedTable || !allTables.some(t => t.name === selectedTable)) {
        setSelectedTable(firstTable);
        setExpandedTables(new Set([firstTable]));
        setCurrentPage(1);
      }
    }
  }, [isAdmin, tablesHash]);

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
    enabled: !!selectedTable && tableExists && activeTab === 'data',
    staleTime: 30000
  });

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
    refetchDatabaseInfo();
    toast({
      title: 'Refreshed',
      description: 'Database information refreshed successfully'
    });
  };

  const handleProvision = () => {
    provisionMutation.mutate({ plan: selectedPlan, region: selectedRegion });
  };

  const handleCopyConnectionUrl = async () => {
    if (credentials?.connectionUrl) {
      try {
        await navigator.clipboard.writeText(credentials.connectionUrl);
        toast({
          title: 'Copied',
          description: 'Connection URL copied to clipboard',
        });
      } catch {
        toast({
          title: 'Copy Failed',
          description: 'Failed to copy to clipboard',
          variant: 'destructive',
        });
      }
    }
  };

  const filteredTables = allTables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Running</Badge>;
      case 'stopped':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Stopped</Badge>;
      case 'error':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/30">Error</Badge>;
      case 'provisioning':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">Provisioning</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const storagePercentage = databaseInfo?.storageLimitMb 
    ? ((databaseInfo.storageUsedMb || 0) / databaseInfo.storageLimitMb) * 100 
    : 0;

  const connectionPercentage = databaseInfo?.maxConnections 
    ? ((databaseInfo.connectionCount || 0) / databaseInfo.maxConnections) * 100 
    : 0;

  if (tablesError && activeTab === 'data') {
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

        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-status-success" />
          <span className="text-sm text-foreground">
            {isAdmin ? `Admin Database • ${allTables.length} tables` : `Project Database • ${allTables.length} tables`}
          </span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2">
          <TabsTrigger value="data" data-testid="tab-data">Data</TabsTrigger>
          <TabsTrigger value="backups" data-testid="tab-backups" disabled={!databaseInfo?.provisioned}>Backups</TabsTrigger>
          <TabsTrigger value="provision" data-testid="tab-provision">Provision</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="flex-1 flex overflow-hidden m-0">
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
        </TabsContent>

        <TabsContent value="backups" className="flex-1 overflow-auto m-0 p-4">
          <ScrollArea className="h-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Database Backups
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchBackups()}
                    disabled={backupsLoading}
                    data-testid="button-refresh-backups"
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", backupsLoading && "animate-spin")} />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => createBackupMutation.mutate({ name: `manual-${new Date().toISOString().split('T')[0]}` })}
                    disabled={createBackupMutation.isPending}
                    data-testid="button-create-backup"
                  >
                    {createBackupMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create Backup
                  </Button>
                </div>
              </div>

              {backupsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : backupsData?.backups && backupsData.backups.length > 0 ? (
                <div className="space-y-3">
                  {backupsData.backups.map((backup) => (
                    <div
                      key={backup.id}
                      className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                      data-testid={`backup-item-${backup.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-full",
                            backup.status === 'completed' && "bg-green-500/10 text-green-500",
                            backup.status === 'pending' && "bg-yellow-500/10 text-yellow-500",
                            backup.status === 'running' && "bg-blue-500/10 text-blue-500",
                            backup.status === 'failed' && "bg-red-500/10 text-red-500",
                            backup.status === 'expired' && "bg-gray-500/10 text-gray-500"
                          )}>
                            {backup.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : backup.status === 'running' || backup.status === 'pending' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-foreground" data-testid={`backup-name-${backup.id}`}>
                              {backup.name}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {backup.backupType}
                              </Badge>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(backup.createdAt).toLocaleString()}
                              </span>
                              {backup.sizeBytes && (
                                <span className="flex items-center gap-1">
                                  <HardDrive className="h-3 w-3" />
                                  {(backup.sizeBytes / 1024 / 1024).toFixed(2)} MB
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              backup.status === 'completed' ? 'default' :
                              backup.status === 'failed' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {backup.status}
                          </Badge>
                          {backup.status === 'completed' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  data-testid={`button-restore-${backup.id}`}
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restore
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Restore Backup?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will restore your database to the state at {new Date(backup.createdAt).toLocaleString()}.
                                    Current data will be replaced.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => restoreBackupMutation.mutate(backup.id)}
                                    data-testid={`button-confirm-restore-${backup.id}`}
                                  >
                                    {restoreBackupMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                    )}
                                    Restore
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-backup-${backup.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Backup?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the backup "{backup.name}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteBackupMutation.mutate(backup.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  data-testid={`button-confirm-delete-backup-${backup.id}`}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      {backup.expiresAt && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Expires: {new Date(backup.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">No Backups Yet</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first backup to protect your data
                  </p>
                  <Button
                    onClick={() => createBackupMutation.mutate({ name: `manual-${new Date().toISOString().split('T')[0]}` })}
                    disabled={createBackupMutation.isPending}
                    data-testid="button-create-first-backup"
                  >
                    {createBackupMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create First Backup
                  </Button>
                </div>
              )}

              <div className="border-t border-border pt-4 mt-4">
                <h4 className="text-sm font-medium text-foreground mb-2">Backup Policy</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Automatic backups run daily when enabled</p>
                  <p>• Backup retention: {databaseInfo?.plan === 'enterprise' ? '90 days' : databaseInfo?.plan === 'pro' ? '30 days' : databaseInfo?.plan === 'starter' ? '14 days' : '7 days'}</p>
                  <p>• Point-in-time recovery available for Pro and Enterprise plans</p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="provision" className="flex-1 overflow-auto m-0 p-4">
          <ScrollArea className="h-full">
            {databaseInfoLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : databaseInfo?.provisioned ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="h-6 w-6 text-primary" />
                    <div>
                      <h4 className="font-semibold text-foreground">PostgreSQL Database</h4>
                      <p className="text-sm text-muted-foreground">{databaseInfo.plan} Plan • {databaseInfo.region}</p>
                    </div>
                  </div>
                  {getStatusBadge(databaseInfo.status)}
                </div>

                <div className="grid gap-4">
                  <div className="border border-border rounded-lg p-4 space-y-4">
                    <h5 className="font-medium text-foreground flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Connection Information
                    </h5>
                    
                    {credentialsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : credentials ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Host</span>
                          <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded" data-testid="text-host">
                            {credentials.host}
                          </code>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Port</span>
                          <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded" data-testid="text-port">
                            {credentials.port}
                          </code>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Database</span>
                          <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded" data-testid="text-database-name">
                            {credentials.databaseName}
                          </code>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Username</span>
                          <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded" data-testid="text-username">
                            {credentials.username}
                          </code>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Password</span>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded" data-testid="text-password">
                              {showPassword ? credentials.password : '••••••••'}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password"
                            >
                              {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full mt-2"
                          onClick={handleCopyConnectionUrl}
                          data-testid="button-copy-connection-url"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Connection URL
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Unable to load credentials</p>
                    )}
                  </div>

                  <div className="border border-border rounded-lg p-4 space-y-4">
                    <h5 className="font-medium text-foreground flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      Storage Usage
                    </h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Used</span>
                        <span className="text-foreground" data-testid="text-storage-usage">
                          {databaseInfo.storageUsedMb?.toFixed(1) || 0} MB / {databaseInfo.storageLimitMb || 0} MB
                        </span>
                      </div>
                      <Progress value={storagePercentage} className="h-2" data-testid="progress-storage" />
                    </div>
                  </div>

                  <div className="border border-border rounded-lg p-4 space-y-4">
                    <h5 className="font-medium text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Connections
                    </h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Active</span>
                        <span className="text-foreground" data-testid="text-connection-count">
                          {databaseInfo.connectionCount || 0} / {databaseInfo.maxConnections || 0}
                        </span>
                      </div>
                      <Progress value={connectionPercentage} className="h-2" data-testid="progress-connections" />
                    </div>
                  </div>

                  {databaseInfo.lastBackupAt && (
                    <div className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Last Backup</span>
                        </div>
                        <span className="text-sm text-foreground" data-testid="text-last-backup">
                          {new Date(databaseInfo.lastBackupAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full"
                        data-testid="button-delete-database"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Database
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Database?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. All data stored in this database will be permanently deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          data-testid="button-confirm-delete"
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">No Database Provisioned</h4>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Provision a dedicated PostgreSQL database for your project
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Plan</label>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger data-testid="select-plan">
                        <SelectValue placeholder="Select a plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAN_OPTIONS.map((plan) => (
                          <SelectItem key={plan.value} value={plan.value} data-testid={`option-plan-${plan.value}`}>
                            {plan.label} ({plan.storage})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Region</label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger data-testid="select-region">
                        <SelectValue placeholder="Select a region" />
                      </SelectTrigger>
                      <SelectContent>
                        {REGION_OPTIONS.map((region) => (
                          <SelectItem key={region.value} value={region.value} data-testid={`option-region-${region.value}`}>
                            {region.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleProvision}
                    disabled={provisionMutation.isPending}
                    data-testid="button-provision-database"
                  >
                    {provisionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Database className="h-4 w-4 mr-2" />
                    )}
                    Provision Database
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
