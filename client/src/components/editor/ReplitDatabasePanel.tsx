// @ts-nocheck
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LazyMotionDiv } from '@/lib/motion';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Archive,
  CheckCircle,
  Copy,
  Database,
  Eye,
  EyeOff,
  HardDrive,
  Key,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Server,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'wouter';

interface DatabaseInfo {
  provisioned: boolean;
  database?: {
    id: number;
    name: string;
    type: string;
    status: string;
    region: string;
    host: string;
    port: number;
    databaseName: string;
    username: string;
    plan: string;
    storageUsedMb: number;
    storageLimitMb: number;
    connectionCount: number;
    maxConnections: number;
  };
}

interface DatabaseCredentials {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  password: string;
  connectionUrl: string;
  sslEnabled: boolean;
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

interface BackupsResponse {
  backups: BackupInfo[];
}

interface QueryResult {
  success: boolean;
  rows: any[];
  rowCount: number;
  executionTime: number;
  error?: string;
}

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted", className)}>
      <LazyMotionDiv
        className="absolute inset-0 -translate-x-full"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--accent)), transparent)' }}
        animate={{ translateX: ['−100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-3 space-y-3">
      <ShimmerSkeleton className="h-8 w-full" />
      <ShimmerSkeleton className="h-6 w-3/4" />
      <ShimmerSkeleton className="h-6 w-1/2" />
      <ShimmerSkeleton className="h-6 w-2/3" />
    </div>
  );
}

function formatBytes(bytes?: number) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function BackupStatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
  if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-red-500" />;
  if (status === 'running' || status === 'pending') return <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />;
  return <Archive className="w-3.5 h-3.5 text-muted-foreground" />;
}

export function ReplitDatabasePanel({ projectId }: { projectId?: string }) {
  const { toast } = useToast();
  const params = useParams<{ id?: string; projectId?: string }>();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'starter' | 'pro' | 'enterprise'>('free');
  const [activeTab, setActiveTab] = useState<'status' | 'credentials' | 'backups' | 'query'>('status');
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [deleteBackupId, setDeleteBackupId] = useState<number | null>(null);
  const [restoreBackupId, setRestoreBackupId] = useState<number | null>(null);

  const resolvedProjectId = projectId ?? params.projectId ?? params.id ?? new URLSearchParams(window.location.search).get('projectId') ?? undefined;

  // Fetch database status
  const { data: databaseInfo, isLoading: databaseLoading, refetch: refetchDatabase } = useQuery<DatabaseInfo>({
    queryKey: ['/api/database/project', resolvedProjectId],
    queryFn: async () => {
      if (!resolvedProjectId) return { provisioned: false };
      return apiRequest<DatabaseInfo>('GET', `/api/database/project/${resolvedProjectId}`);
    },
    enabled: !!resolvedProjectId,
    staleTime: 30000,
  });

  // Fetch credentials when provisioned
  const { data: credentials, isLoading: credentialsLoading, refetch: refetchCredentials } = useQuery<{ credentials: DatabaseCredentials }>({
    queryKey: ['/api/database/project', resolvedProjectId, 'credentials'],
    queryFn: async () => apiRequest<{ credentials: DatabaseCredentials }>('GET', `/api/database/project/${resolvedProjectId}/credentials`),
    enabled: !!resolvedProjectId && databaseInfo?.provisioned === true,
    staleTime: 60000,
  });

  // Fetch backups
  const { data: backupsData, isLoading: backupsLoading, refetch: refetchBackups } = useQuery<BackupsResponse>({
    queryKey: ['/api/database/project', resolvedProjectId, 'backups'],
    queryFn: async () => apiRequest<BackupsResponse>('GET', `/api/database/project/${resolvedProjectId}/backups`),
    enabled: !!resolvedProjectId && databaseInfo?.provisioned === true,
    staleTime: 30000,
  });

  // Provision mutation
  const provisionMutation = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/database/project/${resolvedProjectId}/provision`, { plan: selectedPlan, type: 'postgresql' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/database/project', resolvedProjectId] });
      toast({ title: 'Database Provisioned', description: 'Your PostgreSQL database is ready to use.' });
      setActiveTab('credentials');
    },
    onError: (error: any) => {
      toast({ title: 'Provisioning Failed', description: error.message || 'Failed to provision database', variant: 'destructive' });
    },
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/database/project/${resolvedProjectId}/backups`, { backupType: 'manual' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/database/project', resolvedProjectId, 'backups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/database/project', resolvedProjectId] });
      toast({ title: 'Backup Created', description: 'Database backup created successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Backup Failed', description: error.message || 'Failed to create backup', variant: 'destructive' });
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: number) => apiRequest('POST', `/api/database/project/${resolvedProjectId}/backups/${backupId}/restore`, {}),
    onSuccess: () => {
      setRestoreBackupId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/database/project', resolvedProjectId] });
      toast({ title: 'Restore Started', description: 'Database restore is in progress.' });
    },
    onError: (error: any) => {
      setRestoreBackupId(null);
      toast({ title: 'Restore Failed', description: error.message || 'Failed to restore backup', variant: 'destructive' });
    },
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: number) => apiRequest('DELETE', `/api/database/project/${resolvedProjectId}/backups/${backupId}`),
    onSuccess: () => {
      setDeleteBackupId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/database/project', resolvedProjectId, 'backups'] });
      toast({ title: 'Backup Deleted' });
    },
    onError: (error: any) => {
      setDeleteBackupId(null);
      toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
    },
  });

  // Execute SQL mutation
  const executeSqlMutation = useMutation({
    mutationFn: async (query: string) =>
      apiRequest<QueryResult>('POST', `/api/database/project/${resolvedProjectId}/sql/execute`, { query }),
    onSuccess: (data) => {
      setQueryResult(data);
      if (data.success) {
        toast({ title: 'Query executed', description: `${data.rowCount} rows · ${data.executionTime}ms` });
      } else {
        toast({ title: 'Query error', description: data.error, variant: 'destructive' });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Execution failed', description: error.message, variant: 'destructive' });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  const handleRefresh = () => {
    refetchDatabase();
    if (databaseInfo?.provisioned) {
      refetchCredentials();
      refetchBackups();
    }
  };

  if (!resolvedProjectId) {
    return (
      <div className="h-full flex flex-col bg-[var(--ecode-surface)]" data-testid="database-panel">
        <div className="h-9 px-2.5 flex items-center border-b border-[var(--ecode-border)] shrink-0">
          <Database className="w-3.5 h-3.5 text-[var(--ecode-text-muted)]" />
          <span className="text-xs font-medium text-[var(--ecode-text)] ml-1.5">Database</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <Database className="w-8 h-8 text-[var(--ecode-text-muted)] opacity-40 mb-3" />
          <p className="text-xs text-[var(--ecode-text-muted)] text-center">Open a project to manage its database</p>
        </div>
      </div>
    );
  }

  if (databaseLoading) {
    return (
      <div className="h-full flex flex-col bg-[var(--ecode-surface)]" data-testid="database-panel">
        <div className="h-9 px-2.5 flex items-center border-b border-[var(--ecode-border)] shrink-0">
          <Database className="w-3.5 h-3.5 text-[var(--ecode-text-muted)]" />
          <span className="text-xs font-medium text-[var(--ecode-text)] ml-1.5">Database</span>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!databaseInfo?.provisioned) {
    return (
      <div className="h-full flex flex-col bg-[var(--ecode-surface)]" data-testid="database-panel">
        <div className="h-9 px-2.5 flex items-center justify-between border-b border-[var(--ecode-border)] shrink-0">
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[var(--ecode-text-muted)]" />
            <span className="text-xs font-medium text-[var(--ecode-text)]">Database</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-[var(--ecode-text-muted)]" onClick={handleRefresh}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <Database className="w-8 h-8 text-[var(--ecode-text-muted)] opacity-40 mb-3" />
          <p className="text-xs font-medium text-[var(--ecode-text)] mb-1">No Database</p>
          <p className="text-[10px] text-[var(--ecode-text-muted)] text-center mb-4 max-w-[240px]">
            Provision a PostgreSQL database for this project
          </p>

          <div className="w-full max-w-[240px] space-y-3">
            <div>
              <label className="text-[9px] uppercase tracking-wider text-[var(--ecode-text-muted)] font-medium mb-1.5 block">Plan</label>
              <Select value={selectedPlan} onValueChange={(v: any) => setSelectedPlan(v)}>
                <SelectTrigger className="h-8 text-xs bg-[var(--ecode-sidebar-hover)] border-[var(--ecode-border)]" data-testid="plan-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (500MB)</SelectItem>
                  <SelectItem value="starter">Starter (2GB)</SelectItem>
                  <SelectItem value="pro">Pro (10GB)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (100GB)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => provisionMutation.mutate()}
              disabled={provisionMutation.isPending}
              className="w-full h-7 text-xs bg-[hsl(142,72%,42%)] hover:bg-[hsl(142,72%,38%)] text-white"
              data-testid="provision-database-button"
            >
              {provisionMutation.isPending ? (
                <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Provisioning...</>
              ) : (
                <><Plus className="w-3 h-3 mr-1.5" />Provision</>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const db = databaseInfo.database!;
  const creds = credentials?.credentials;
  const storagePercent = db.storageLimitMb > 0 ? (db.storageUsedMb / db.storageLimitMb) * 100 : 0;
  const connectionPercent = db.maxConnections > 0 ? (db.connectionCount / db.maxConnections) * 100 : 0;
  const backups = backupsData?.backups || [];

  return (
    <div className="h-full flex flex-col bg-[var(--ecode-surface)]" data-testid="database-panel">
      <div className="h-9 px-2.5 flex items-center justify-between border-b border-[var(--ecode-border)] shrink-0">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-[var(--ecode-text-muted)]" />
          <span className="text-xs font-medium text-[var(--ecode-text)]">Database</span>
          <Badge className={cn(
            "h-4 px-1 text-[9px] rounded",
            db.status === 'running' ? 'bg-[hsl(142,72%,42%)]/10 text-[hsl(142,72%,42%)]' : 'bg-yellow-500/10 text-yellow-500'
          )}>
            {db.status}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-[var(--ecode-text-muted)]" onClick={handleRefresh}>
          <RefreshCw className={cn("w-3.5 h-3.5", databaseLoading && "animate-spin")} />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="h-9 w-full justify-start rounded-none border-b border-[var(--ecode-border)] bg-[var(--ecode-surface)] p-0 overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
          <TabsTrigger value="status" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(142,72%,42%)] px-2.5 text-xs whitespace-nowrap" data-testid="tab-status">
            Status
          </TabsTrigger>
          <TabsTrigger value="credentials" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(142,72%,42%)] px-2.5 text-xs whitespace-nowrap" data-testid="tab-credentials">
            Credentials
          </TabsTrigger>
          <TabsTrigger value="backups" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(142,72%,42%)] px-2.5 text-xs whitespace-nowrap" data-testid="tab-backups">
            Backups
          </TabsTrigger>
          <TabsTrigger value="query" className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(142,72%,42%)] px-2.5 text-xs whitespace-nowrap" data-testid="tab-query">
            SQL
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* STATUS TAB */}
          <TabsContent value="status" className="p-4 space-y-4 mt-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Type</span>
                <p className="text-[15px] text-foreground flex items-center gap-2">
                  <Server className="w-4 h-4" />PostgreSQL
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Plan</span>
                <p className="text-[15px] text-foreground capitalize">{db.plan}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Region</span>
                <p className="text-[15px] text-foreground">{db.region}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Database</span>
                <p className="text-[15px] text-foreground font-mono text-[13px]">{db.databaseName}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <HardDrive className="w-4 h-4" />Storage
                  </span>
                  <span className="text-foreground">{db.storageUsedMb}MB / {db.storageLimitMb}MB</span>
                </div>
                <Progress value={storagePercent} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Server className="w-4 h-4" />Connections
                  </span>
                  <span className="text-foreground">{db.connectionCount} / {db.maxConnections}</span>
                </div>
                <Progress value={connectionPercent} className="h-2" />
              </div>
            </div>
          </TabsContent>

          {/* CREDENTIALS TAB */}
          <TabsContent value="credentials" className="p-4 space-y-4 mt-0">
            {credentialsLoading ? (
              <LoadingSkeleton />
            ) : creds ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Connection URL</label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={showPassword ? creds.connectionUrl : creds.connectionUrl.replace(/:([^:@]+)@/, ':••••••••@')}
                      className="font-mono text-[12px] bg-muted border-border"
                      data-testid="connection-url"
                    />
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => copyToClipboard(creds.connectionUrl, 'Connection URL')}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Host</label>
                    <div className="flex gap-2">
                      <Input readOnly value={creds.host} className="font-mono text-[12px] bg-muted border-border" />
                      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => copyToClipboard(creds.host, 'Host')}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Port</label>
                    <Input readOnly value={String(creds.port)} className="font-mono text-[12px] bg-muted border-border" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Database</label>
                    <div className="flex gap-2">
                      <Input readOnly value={creds.databaseName} className="font-mono text-[12px] bg-muted border-border" />
                      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => copyToClipboard(creds.databaseName, 'Database')}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Username</label>
                    <div className="flex gap-2">
                      <Input readOnly value={creds.username} className="font-mono text-[12px] bg-muted border-border" />
                      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => copyToClipboard(creds.username, 'Username')}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Password</label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      type={showPassword ? 'text' : 'password'}
                      value={creds.password}
                      className="font-mono text-[12px] bg-muted border-border"
                      data-testid="password-field"
                    />
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => copyToClipboard(creds.password, 'Password')}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[13px] text-muted-foreground pt-2">
                  <Key className="w-4 h-4" />
                  <span>SSL: {creds.sslEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-[13px]">Unable to load credentials</p>
            )}
          </TabsContent>

          {/* BACKUPS TAB */}
          <TabsContent value="backups" className="p-4 space-y-4 mt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-muted-foreground" />
                <span className="text-[13px] font-medium">Database Backups</span>
              </div>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => createBackupMutation.mutate()}
                disabled={createBackupMutation.isPending}
              >
                {createBackupMutation.isPending ? (
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3 mr-1.5" />
                )}
                Create Backup
              </Button>
            </div>

            {backupsLoading ? (
              <LoadingSkeleton />
            ) : backups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Archive className="w-8 h-8 text-muted-foreground opacity-40 mb-3" />
                <p className="text-xs font-medium text-foreground mb-1">No backups</p>
                <p className="text-[10px] text-muted-foreground">Create your first backup to protect your data</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((backup) => (
                  <div key={backup.id} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <BackupStatusIcon status={backup.status} />
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium truncate">{backup.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(backup.createdAt).toLocaleDateString()} · {backup.status}
                          {backup.sizeBytes ? ` · ${formatBytes(backup.sizeBytes)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Restore"
                        disabled={backup.status !== 'completed'}
                        onClick={() => setRestoreBackupId(backup.id)}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        title="Delete"
                        onClick={() => setDeleteBackupId(backup.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* SQL QUERY TAB */}
          <TabsContent value="query" className="p-4 space-y-3 mt-0">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">SQL Query</label>
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="SELECT * FROM your_table LIMIT 10;"
                className="w-full h-32 p-3 font-mono text-[12px] bg-muted border border-border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(142,72%,42%)]"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">DROP DATABASE/SCHEMA blocked. DDL requires confirmation.</p>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-[hsl(142,72%,42%)] hover:bg-[hsl(142,72%,38%)] text-white"
                  onClick={() => sqlQuery.trim() && executeSqlMutation.mutate(sqlQuery)}
                  disabled={!sqlQuery.trim() || executeSqlMutation.isPending}
                >
                  {executeSqlMutation.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3 mr-1.5" />
                  )}
                  Execute
                </Button>
              </div>
            </div>

            {queryResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{queryResult.success ? `${queryResult.rowCount} rows returned` : 'Error'}</span>
                  <span>{queryResult.executionTime}ms</span>
                </div>
                {queryResult.error ? (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-[12px] font-mono">
                    {queryResult.error}
                  </div>
                ) : queryResult.rows.length > 0 ? (
                  <div className="border border-border rounded-md overflow-auto max-h-64">
                    <table className="w-full text-[12px]">
                      <thead className="bg-muted">
                        <tr>
                          {Object.keys(queryResult.rows[0]).map(col => (
                            <th key={col} className="px-2 py-1.5 text-left font-medium text-muted-foreground border-b border-border">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.slice(0, 100).map((row, idx) => (
                          <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/50">
                            {Object.values(row).map((val: any, i) => (
                              <td key={i} className="px-2 py-1.5 font-mono truncate max-w-[120px]">
                                {val === null ? <span className="text-muted-foreground italic">NULL</span> : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[12px] text-muted-foreground text-center py-3">
                    Query executed successfully (no rows)
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreBackupId !== null} onOpenChange={(open) => !open && setRestoreBackupId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Backup</DialogTitle>
            <DialogDescription>
              This will restore the database to this backup point. Current data will be overwritten. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreBackupId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => restoreBackupId !== null && restoreBackupMutation.mutate(restoreBackupId)}
              disabled={restoreBackupMutation.isPending}
            >
              {restoreBackupMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Backup Confirmation Dialog */}
      <Dialog open={deleteBackupId !== null} onOpenChange={(open) => !open && setDeleteBackupId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Backup</DialogTitle>
            <DialogDescription>Are you sure you want to delete this backup? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBackupId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteBackupId !== null && deleteBackupMutation.mutate(deleteBackupId)}
              disabled={deleteBackupMutation.isPending}
            >
              {deleteBackupMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
