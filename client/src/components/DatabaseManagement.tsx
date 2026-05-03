// @ts-nocheck
import { CM6Editor } from '@/components/editor/CM6Editor';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  Archive,
  CheckCircle,
  Code,
  Copy,
  Database,
  ExternalLink,
  FileText,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Table as TableIcon,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

interface DatabaseInstance {
  id: number;
  projectId: number;
  projectName: string;
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'provisioning' | 'error';
  region: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  provider: string;
  createdAt: string;
  storageUsedMb: number;
  storageLimitMb: number;
  connectionCount: number;
  maxConnections: number;
  lastBackupAt?: string;
}

interface QueryResult {
  success: boolean;
  rows: any[];
  rowCount: number;
  fields: Array<{ name: string }>;
  executionTime: number;
  error?: string;
}

interface BackupInfo {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'expired';
  backupType: string;
  sizeBytes?: number;
  createdAt: string;
  expiresAt?: string;
}

interface DatabaseManagementProps {
  projectId: string;
}

export function DatabaseManagement({ projectId }: DatabaseManagementProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedInstance, setSelectedInstance] = useState<DatabaseInstance | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
  const [isQueryLoading, setIsQueryLoading] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [targetUpgradePlan, setTargetUpgradePlan] = useState<string>('starter');

  // Fetch user's database instances (real project-scoped endpoint)
  const { data: instancesData, isLoading } = useQuery({
    queryKey: ['/api/database/instances'],
    queryFn: async () => apiRequest('GET', '/api/database/instances'),
  });

  const databases: DatabaseInstance[] = instancesData?.instances || [];

  // Fetch backups for selected instance
  const { data: backupsData, refetch: refetchBackups } = useQuery({
    queryKey: ['/api/database/project', selectedInstance?.projectId, 'backups'],
    queryFn: async () => apiRequest('GET', `/api/database/project/${selectedInstance!.projectId}/backups`),
    enabled: !!selectedInstance,
  });

  const backups: BackupInfo[] = backupsData?.backups || [];

  // Fetch tables for selected instance
  const { data: tablesData } = useQuery({
    queryKey: ['/api/database/project', selectedInstance?.projectId, 'tables'],
    queryFn: async () => apiRequest('GET', `/api/database/project/${selectedInstance!.projectId}/tables`),
    enabled: !!selectedInstance && selectedInstance.status === 'running',
  });

  const tables = tablesData?.tables || [];

  // Create database (provision for this project)
  const createDatabaseMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('POST', `/api/database/project/${data.projectId}/provision`, {
        plan: data.plan,
        region: data.region,
        type: 'postgresql',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/database/instances'] });
      toast({ title: 'Database Provisioning', description: 'Your database is being provisioned.' });
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Provisioning Failed', description: error.message, variant: 'destructive' });
    },
  });

  // Create backup
  const createBackupMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/database/project/${selectedInstance!.projectId}/backups`, { backupType: 'manual' }),
    onSuccess: () => {
      refetchBackups();
      qc.invalidateQueries({ queryKey: ['/api/database/instances'] });
      toast({ title: 'Backup Created', description: 'Database backup created successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Backup Failed', description: error.message, variant: 'destructive' });
    },
  });

  // Restore backup
  const restoreBackupMutation = useMutation({
    mutationFn: (backupId: number) =>
      apiRequest('POST', `/api/database/project/${selectedInstance!.projectId}/backups/${backupId}/restore`, {}),
    onSuccess: () => {
      toast({ title: 'Restore Started', description: 'Database restore is in progress.' });
    },
    onError: (error: any) => {
      toast({ title: 'Restore Failed', description: error.message, variant: 'destructive' });
    },
  });

  // Upgrade plan
  const upgradePlanMutation = useMutation({
    mutationFn: (targetPlan: string) =>
      apiRequest('POST', `/api/database/project/${selectedInstance!.projectId}/upgrade`, { targetPlan }),
    onSuccess: (data: any) => {
      setUpgradeDialogOpen(false);
      qc.invalidateQueries({ queryKey: ['/api/database/instances'] });
      toast({ title: 'Plan Upgraded', description: data.message });
    },
    onError: (error: any) => {
      toast({ title: 'Upgrade Failed', description: error.message, variant: 'destructive' });
    },
  });

  // Execute SQL query on selected database
  const executeQueryMutation = useMutation({
    mutationFn: (query: string) =>
      apiRequest<QueryResult>('POST', `/api/database/project/${selectedInstance!.projectId}/sql/execute`, { query }),
    onMutate: () => setIsQueryLoading(true),
    onSuccess: (data: QueryResult) => {
      setQueryResults(data);
      if (data.success) {
        toast({ description: `Query executed in ${data.executionTime}ms · ${data.rowCount} rows` });
      } else {
        toast({ title: 'Query Error', description: data.error, variant: 'destructive' });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Query Error', description: error.message || 'Failed to execute query', variant: 'destructive' });
    },
    onSettled: () => setIsQueryLoading(false),
  });

  const database = selectedInstance || databases[0];

  const DatabaseCreateForm = () => {
    const [formData, setFormData] = useState({
      projectId: projectId,
      plan: 'free',
      region: 'us-east-1',
    });
    return (
      <form onSubmit={(e) => { e.preventDefault(); createDatabaseMutation.mutate(formData); }}>
        <div className="space-y-4">
          <div>
            <Label>Project ID</Label>
            <Input
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              placeholder="Project ID"
              required
            />
          </div>
          <div>
            <Label>Region</Label>
            <Select value={formData.region} onValueChange={(v) => setFormData({ ...formData, region: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="us-east-1">US East (Virginia)</SelectItem>
                <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                <SelectItem value="eu-west-1">EU West (Ireland)</SelectItem>
                <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Plan</Label>
            <Select value={formData.plan} onValueChange={(v) => setFormData({ ...formData, plan: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free (500MB)</SelectItem>
                <SelectItem value="starter">Starter (2GB)</SelectItem>
                <SelectItem value="pro">Pro (10GB)</SelectItem>
                <SelectItem value="enterprise">Enterprise (100GB)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button type="submit" disabled={createDatabaseMutation.isPending}>
            {createDatabaseMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Provision Database
          </Button>
        </DialogFooter>
      </form>
    );
  };

  const QueryEditor = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-medium">Query Editor</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQueryInput('SELECT * FROM information_schema.tables WHERE table_schema = current_schema() LIMIT 10;')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Sample
          </Button>
          <Button
            onClick={() => queryInput && executeQueryMutation.mutate(queryInput)}
            disabled={!queryInput || isQueryLoading || !selectedInstance}
          >
            {isQueryLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Execute
          </Button>
        </div>
      </div>

      {!selectedInstance && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>No database selected</AlertTitle>
          <AlertDescription>Select a database instance above to execute queries.</AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg overflow-hidden">
        <CM6Editor
          height="200px"
          language="sql"
          theme="dark"
          value={queryInput}
          onChange={(value) => setQueryInput(value)}
        />
      </div>
      <p className="text-[12px] text-muted-foreground">DROP DATABASE / DROP SCHEMA / ALTER SYSTEM are blocked for safety.</p>

      {queryResults && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[13px] text-muted-foreground">
            {queryResults.success ? (
              <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-4 h-4" />{queryResults.rowCount} rows</span>
            ) : (
              <span className="flex items-center gap-1 text-destructive"><AlertCircle className="w-4 h-4" />Error</span>
            )}
            <span>Execution: {queryResults.executionTime}ms</span>
          </div>

          {queryResults.error ? (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-[13px] font-mono text-destructive">
              {queryResults.error}
            </div>
          ) : queryResults.rows.length > 0 ? (
            <div className="border rounded-lg overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(queryResults.rows[0]).map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queryResults.rows.map((row, idx) => (
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
  );

  return (
    <div className="space-y-6">
      {/* Database Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Database Management
              </CardTitle>
              <CardDescription>Manage your database instances and data</CardDescription>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Provision Database
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Provision Database</DialogTitle>
                  <DialogDescription>Create a new PostgreSQL database for your project</DialogDescription>
                </DialogHeader>
                <DatabaseCreateForm />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading databases...</span>
            </div>
          ) : databases.length === 0 ? (
            <Alert>
              <Database className="w-4 h-4" />
              <AlertTitle>No Databases</AlertTitle>
              <AlertDescription>Provision your first database to start storing data.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {databases.map((db) => (
                <div
                  key={db.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedInstance?.id === db.id ? 'border-primary bg-muted/50' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedInstance(db)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{db.projectName}</h3>
                        <Badge variant={db.status === 'running' ? 'default' : 'secondary'}>{db.status}</Badge>
                        <Badge variant="outline">{db.plan}</Badge>
                        <Badge variant="outline" className="text-[11px]">{db.provider}</Badge>
                      </div>
                      <div className="text-[13px] text-muted-foreground">
                        {db.region} · Created {new Date(db.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInstance(db);
                                setUpgradeDialogOpen(true);
                              }}
                            >
                              <TrendingUp className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Upgrade Plan</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-1">
                      <div className="text-[13px] text-muted-foreground">Storage</div>
                      <div className="flex items-center gap-2">
                        <Progress value={db.storageLimitMb > 0 ? (db.storageUsedMb / db.storageLimitMb) * 100 : 0} className="h-2 flex-1" />
                        <span className="text-[11px] shrink-0">{db.storageUsedMb}MB / {db.storageLimitMb}MB</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[13px] text-muted-foreground">Connections</div>
                      <div className="font-medium text-[13px]">{db.connectionCount} / {db.maxConnections}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Details */}
      {database && (
        <Card>
          <CardHeader>
            <CardTitle>{database.projectName} Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tables">Tables</TabsTrigger>
                <TabsTrigger value="query">Query</TabsTrigger>
                <TabsTrigger value="connection">Connection</TabsTrigger>
                <TabsTrigger value="backups">Backups</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[13px]">Database Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-[13px]">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <Badge variant={database.status === 'running' ? 'default' : 'secondary'}>{database.status}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Plan</span>
                          <span className="font-medium capitalize">{database.plan}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Provider</span>
                          <span className="font-medium capitalize">{database.provider}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Region</span>
                          <span className="font-medium">{database.region}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-[13px]">Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-[13px]">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Tables</span>
                          <span className="font-medium">{tables.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Total Rows</span>
                          <span className="font-medium">
                            {tables.reduce((acc: number, t: any) => acc + (t.rowCount || 0), 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Storage Used</span>
                          <span className="font-medium">{database.storageUsedMb} MB</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Storage Limit</span>
                          <span className="font-medium">{database.storageLimitMb} MB</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Alert>
                  <Activity className="w-4 h-4" />
                  <AlertTitle>Database Health</AlertTitle>
                  <AlertDescription>
                    Status: <span className="font-medium">{database.status}</span> ·
                    Connections: {database.connectionCount} / {database.maxConnections} ·
                    Last backup: {database.lastBackupAt ? new Date(database.lastBackupAt).toLocaleDateString() : 'Never'}
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="tables" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search tables..." className="pl-8" />
                  </div>
                </div>

                {tables.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <TableIcon className="h-12 w-12 mb-4 opacity-40" />
                    <p>{database.status !== 'running' ? 'Database must be running to browse tables' : 'No tables found'}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table Name</TableHead>
                        <TableHead>Rows</TableHead>
                        <TableHead>Columns</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tables.map((table: any) => (
                        <TableRow key={table.name}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <TableIcon className="w-4 h-4 text-muted-foreground" />
                              {table.name}
                            </div>
                          </TableCell>
                          <TableCell>{(table.rowCount || 0).toLocaleString()}</TableCell>
                          <TableCell>{table.columns?.length || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="query">
                <QueryEditor />
              </TabsContent>

              <TabsContent value="connection" className="space-y-4">
                <Alert>
                  <Shield className="w-4 h-4" />
                  <AlertTitle>Connection Security</AlertTitle>
                  <AlertDescription>All connections are encrypted with SSL/TLS.</AlertDescription>
                </Alert>
                <p className="text-[13px] text-muted-foreground">
                  Use the <strong>Credentials</strong> tab in the Database sidebar panel for connection details, or call{' '}
                  <code className="text-[12px] bg-muted px-1 rounded">GET /api/database/project/:id/credentials</code>.
                </p>
              </TabsContent>

              <TabsContent value="backups" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-medium">Backups</h3>
                    <p className="text-[13px] text-muted-foreground">Manage database backups and restore points</p>
                  </div>
                  <Button
                    onClick={() => createBackupMutation.mutate()}
                    disabled={createBackupMutation.isPending || !selectedInstance}
                  >
                    {createBackupMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Archive className="w-4 h-4 mr-2" />
                    )}
                    Create Backup
                  </Button>
                </div>

                {backups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Archive className="h-12 w-12 mb-4 opacity-40" />
                    <p>No backups yet. Create your first backup above.</p>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        {backups.map((backup) => (
                          <div key={backup.id} className="flex items-center justify-between p-3 hover:bg-muted rounded-lg border border-border">
                            <div className="flex items-center gap-3">
                              {backup.status === 'completed' ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : backup.status === 'failed' ? (
                                <AlertCircle className="w-4 h-4 text-red-600" />
                              ) : (
                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                              )}
                              <div>
                                <div className="text-[13px] font-medium">{backup.name}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {new Date(backup.createdAt).toLocaleString()} · {backup.status}
                                  {backup.sizeBytes ? ` · ${(backup.sizeBytes / 1024).toFixed(1)} KB` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={backup.status !== 'completed' || restoreBackupMutation.isPending}
                                onClick={() => restoreBackupMutation.mutate(backup.id)}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Plan Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Database Plan</DialogTitle>
            <DialogDescription>
              Current plan: <span className="font-medium capitalize">{selectedInstance?.plan}</span>.
              Upgrade for more storage and connections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Target Plan</Label>
            <Select value={targetUpgradePlan} onValueChange={setTargetUpgradePlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter (2GB, 25 connections)</SelectItem>
                <SelectItem value="pro">Pro (10GB, 100 connections)</SelectItem>
                <SelectItem value="enterprise">Enterprise (100GB, 500 connections)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => upgradePlanMutation.mutate(targetUpgradePlan)}
              disabled={upgradePlanMutation.isPending}
            >
              {upgradePlanMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
              Upgrade to {targetUpgradePlan}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
