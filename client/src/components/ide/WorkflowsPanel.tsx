import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Edit2,
  Globe,
  GripVertical,
  Loader2,
  MoreVertical,
  Package,
  Play,
  Plus,
  RefreshCw,
  Square,
  Star,
  Terminal,
  TestTube,
  Trash2,
  Workflow,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskType = 'shell' | 'packages' | 'workflow';
type WorkflowStatus = 'idle' | 'running' | 'success' | 'failed' | 'cancelled';
type ExecMode = 'sequential' | 'parallel';

interface WorkflowTask {
  id: number;
  orderIndex: number;
  taskType: TaskType;
  command: string | null;
  targetWorkflowId: number | null;
  waitForPort: number | null;
}

interface WorkflowItem {
  id: string | number;
  name: string;
  description?: string;
  icon?: string;
  isDefault?: boolean;
  isSystem?: boolean;
  isRunButton?: boolean;
  runOnStart?: boolean;
  enabled?: boolean;
  executionMode?: ExecMode;
  tasks?: WorkflowTask[];
  command?: string;
}

interface TaskFormEntry {
  _key: string;
  taskType: TaskType;
  command: string;
  waitForPort: string;
}

interface WorkflowFormState {
  name: string;
  description: string;
  icon: string;
  runOnStart: boolean;
  executionMode: ExecMode;
  tasks: TaskFormEntry[];
}

interface WorkflowsPanelProps {
  projectId: string;
  onRunWorkflow?: (workflow: WorkflowItem) => void;
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ICON_OPTIONS = [
  { id: 'play', icon: Play, label: 'Play' },
  { id: 'terminal', icon: Terminal, label: 'Terminal' },
  { id: 'globe', icon: Globe, label: 'Web' },
  { id: 'test', icon: TestTube, label: 'Test' },
  { id: 'package', icon: Package, label: 'Build' },
  { id: 'database', icon: Database, label: 'Database' },
  { id: 'zap', icon: Zap, label: 'Quick' },
];

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  shell: 'Shell command',
  packages: 'Install packages',
  workflow: 'Run workflow',
};

function getIcon(iconId?: string) {
  return ICON_OPTIONS.find(o => o.id === iconId)?.icon ?? Terminal;
}

function makeKey() {
  return Math.random().toString(36).slice(2);
}

const EMPTY_TASK: TaskFormEntry = { _key: '', taskType: 'shell', command: '', waitForPort: '' };

const EMPTY_FORM: WorkflowFormState = {
  name: '',
  description: '',
  icon: 'play',
  runOnStart: false,
  executionMode: 'sequential',
  tasks: [{ ...EMPTY_TASK, _key: makeKey() }],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formToApiPayload(form: WorkflowFormState, projectId: string) {
  return {
    projectId,
    name: form.name,
    executionMode: form.executionMode,
    runOnStart: form.runOnStart,
    tasks: form.tasks.map((t, i) => {
      const port = parseInt(t.waitForPort, 10);
      return {
        taskType: t.taskType,
        command: t.taskType !== 'workflow' ? (t.command || null) : null,
        orderIndex: i,
        waitForPort: t.taskType === 'shell' && !isNaN(port) && port > 0 ? port : null,
      };
    }),
  };
}

function workflowToForm(wf: WorkflowItem): WorkflowFormState {
  const tasks = (wf.tasks ?? []).length > 0
    ? (wf.tasks ?? []).map(t => ({
        _key: makeKey(),
        taskType: t.taskType,
        command: t.command ?? '',
        waitForPort: t.waitForPort != null ? String(t.waitForPort) : '',
      }))
    : [{ _key: makeKey(), taskType: 'shell' as TaskType, command: wf.command ?? '', waitForPort: '' }];
  return {
    name: wf.name,
    description: wf.description ?? '',
    icon: wf.icon ?? 'play',
    runOnStart: wf.runOnStart ?? false,
    executionMode: wf.executionMode ?? 'sequential',
    tasks,
  };
}

// ─── Log viewer (SSE) ─────────────────────────────────────────────────────────

function LogViewer({ workflowId, isRunning, onStatusChange }: {
  workflowId: number;
  isRunning: boolean;
  onStatusChange?: (status: WorkflowStatus) => void;
}) {
  const [lines, setLines] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLines([]);
    esRef.current?.close();

    const es = new EventSource(`/api/workflows/${workflowId}/logs/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'log') {
          setLines(prev => [...prev, msg.text]);
        } else if (msg.type === 'completed') {
          onStatusChange?.(msg.status === 'success' ? 'success' : 'failed');
          es.close();
        } else if (msg.type === 'stopped') {
          onStatusChange?.('cancelled');
          es.close();
        }
      } catch { /* ignore parse errors */ }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [workflowId, isRunning]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const copyLogs = () => {
    navigator.clipboard.writeText(lines.join(''));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="mt-2 rounded bg-black/85 overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 border-b border-white/10">
        <span className="text-[9px] uppercase tracking-wide text-white/40">Logs</span>
        <div className="flex gap-1">
          <button
            className="text-[9px] text-white/40 hover:text-white/70"
            onClick={copyLogs}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            className="text-[9px] text-white/40 hover:text-white/70"
            onClick={() => setLines([])}
          >
            Clear
          </button>
        </div>
      </div>
      <div className="p-2 text-[10px] font-mono max-h-44 overflow-y-auto">
        {lines.length === 0 && (
          <span className="text-white/30">Waiting for output…</span>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              'whitespace-pre-wrap leading-relaxed',
              line.includes('[stderr]') || line.startsWith('\x1b[31m') ? 'text-red-400' : 'text-green-300',
            )}
          >
            {line.replace(/\x1b\[[0-9;]*m/g, '')}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WorkflowStatus }) {
  const cfg: Record<WorkflowStatus, { label: string; cls: string; Icon: typeof Terminal }> = {
    idle: { label: 'Idle', cls: 'text-muted-foreground', Icon: Terminal },
    running: { label: 'Running', cls: 'text-blue-500', Icon: Loader2 },
    success: { label: 'Done', cls: 'text-green-500', Icon: CheckCircle2 },
    failed: { label: 'Failed', cls: 'text-red-500', Icon: AlertCircle },
    cancelled: { label: 'Stopped', cls: 'text-yellow-500', Icon: Square },
  };
  const { label, cls, Icon } = cfg[status] ?? cfg.idle;
  return (
    <span className={cn('flex items-center gap-1 text-[10px]', cls)}>
      <Icon className={cn('h-3 w-3', status === 'running' && 'animate-spin')} />
      {label}
    </span>
  );
}

// ─── Task form row ─────────────────────────────────────────────────────────────

function TaskRow({
  task,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  task: TaskFormEntry;
  index: number;
  onChange: (updated: TaskFormEntry) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex items-start gap-2 p-2 bg-muted/40 rounded border border-border/50">
      <GripVertical className="h-4 w-4 text-muted-foreground mt-1.5 flex-shrink-0 cursor-grab" />
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-4 flex-shrink-0">{index + 1}.</span>
          <Select value={task.taskType} onValueChange={(v) => onChange({ ...task, taskType: v as TaskType })}>
            <SelectTrigger className="h-7 text-[11px] flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shell">Shell command</SelectItem>
              <SelectItem value="packages">Install packages</SelectItem>
            </SelectContent>
          </Select>
          {canRemove && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 flex-shrink-0" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <Input
          value={task.command}
          onChange={e => onChange({ ...task, command: e.target.value })}
          placeholder={task.taskType === 'packages' ? 'e.g., lodash (or empty for npm install)' : 'e.g., npm run build'}
          className="h-7 text-[11px] font-mono"
        />
        {task.taskType === 'shell' && (
          <div className="flex items-center gap-1.5">
            <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Wait for port:</Label>
            <Input
              value={task.waitForPort}
              onChange={e => onChange({ ...task, waitForPort: e.target.value })}
              placeholder="e.g., 3000"
              className="h-6 text-[10px] font-mono w-24"
              type="number"
              min={1}
              max={65535}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Workflow form ─────────────────────────────────────────────────────────────

function WorkflowForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  isEdit,
  isPending,
}: {
  value: WorkflowFormState;
  onChange: (v: WorkflowFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEdit?: boolean;
  isPending?: boolean;
}) {
  const set = <K extends keyof WorkflowFormState>(key: K, val: WorkflowFormState[K]) =>
    onChange({ ...value, [key]: val });

  const addTask = () =>
    set('tasks', [...value.tasks, { ...EMPTY_TASK, _key: makeKey() }]);

  const removeTask = (i: number) =>
    set('tasks', value.tasks.filter((_, idx) => idx !== i));

  const updateTask = (i: number, t: TaskFormEntry) => {
    const tasks = [...value.tasks];
    tasks[i] = t;
    set('tasks', tasks);
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-1.5">
        <Label className="text-[11px]">Workflow Name</Label>
        <Input
          value={value.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g., Deploy to Production"
          className="h-8 text-[13px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px]">Icon</Label>
        <div className="flex gap-1 flex-wrap">
          {ICON_OPTIONS.map(opt => {
            const Icon = opt.icon;
            return (
              <Button
                key={opt.id}
                type="button"
                variant={value.icon === opt.id ? 'default' : 'outline'}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => set('icon', opt.id)}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px]">Execution mode</Label>
        <Select value={value.executionMode} onValueChange={(v) => set('executionMode', v as ExecMode)}>
          <SelectTrigger className="h-8 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sequential">Sequential (one task at a time)</SelectItem>
            <SelectItem value="parallel">Parallel (all tasks at once)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Tasks</Label>
          <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={addTask}>
            <Plus className="h-3 w-3 mr-1" /> Add task
          </Button>
        </div>
        <div className="space-y-2">
          {value.tasks.map((task, i) => (
            <TaskRow
              key={task._key}
              task={task}
              index={i}
              onChange={t => updateTask(i, t)}
              onRemove={() => removeTask(i)}
              canRemove={value.tasks.length > 1}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between py-2 border-t">
        <div>
          <Label className="text-[11px]">Run on project start</Label>
          <p className="text-[10px] text-muted-foreground">Auto-launch when the project preview opens</p>
        </div>
        <Switch
          checked={value.runOnStart}
          onCheckedChange={v => set('runOnStart', v)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" type="button" onClick={onCancel}>Cancel</Button>
        <Button
          size="sm"
          type="button"
          disabled={!value.name.trim() || value.tasks.every(t => !t.command.trim()) || isPending}
          onClick={onSubmit}
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {isEdit ? 'Update' : 'Create'} Workflow
        </Button>
      </div>
    </div>
  );
}

// ─── Workflow card ─────────────────────────────────────────────────────────────

function WorkflowCard({
  workflow,
  status,
  onRun,
  onStop,
  onRestart,
  onEdit,
  onDelete,
  onDuplicate,
  onSetRunButton,
  onStatusChange,
  isSystem,
}: {
  workflow: WorkflowItem;
  status: WorkflowStatus;
  onRun: () => void;
  onStop: () => void;
  onRestart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSetRunButton: () => void;
  onStatusChange: (s: WorkflowStatus) => void;
  isSystem: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const Icon = getIcon(workflow.icon);
  const isRunning = status === 'running';
  const tasks = workflow.tasks ?? [];
  const primaryCmd = workflow.command ?? tasks[0]?.command ?? '';

  useEffect(() => {
    if (isRunning) setShowLogs(true);
  }, [isRunning]);

  return (
    <Card className={cn(
      'group transition-all',
      workflow.isDefault && 'ring-1 ring-primary/20',
      isRunning && 'ring-1 ring-blue-400/40',
    )}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg flex-shrink-0', workflow.isDefault ? 'bg-primary/10' : 'bg-muted')}>
            <Icon className={cn('h-4 w-4', workflow.isDefault && 'text-primary')} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[13px] font-medium truncate">{workflow.name}</span>
              {workflow.isDefault && (
                <Badge variant="outline" className="text-[10px] h-4">
                  <Star className="h-2.5 w-2.5 mr-0.5" /> Default
                </Badge>
              )}
              {isSystem && <Badge variant="secondary" className="text-[10px] h-4">System</Badge>}
              {workflow.runOnStart && (
                <Badge variant="outline" className="text-[10px] h-4 text-blue-500 border-blue-300">Auto-start</Badge>
              )}
              {workflow.isRunButton && (
                <Badge variant="outline" className="text-[10px] h-4 text-orange-500 border-orange-300">Run button</Badge>
              )}
            </div>

            {workflow.description && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{workflow.description}</p>
            )}

            {primaryCmd && (
              <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-1 inline-block max-w-full truncate">
                {primaryCmd}
              </code>
            )}

            <div className="flex items-center gap-3 mt-1.5">
              <StatusBadge status={status} />
              {tasks.length > 1 && (
                <button
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                  onClick={() => setExpanded(p => !p)}
                >
                  {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  {tasks.length} tasks
                </button>
              )}
              {typeof workflow.id === 'number' && (isRunning || status !== 'idle') && (
                <button
                  className="text-[10px] text-blue-400 hover:text-blue-500"
                  onClick={() => setShowLogs(p => !p)}
                >
                  {showLogs ? 'Hide logs' : 'Logs'}
                </button>
              )}
            </div>

            {expanded && tasks.length > 0 && (
              <div className="mt-2 space-y-1">
                {tasks.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-4 text-right flex-shrink-0">{i + 1}.</span>
                    <Badge variant="outline" className="text-[9px] h-3.5 px-1">{TASK_TYPE_LABELS[t.taskType]}</Badge>
                    <code className="bg-muted px-1 rounded truncate">{t.command ?? `→ wf#${t.targetWorkflowId}`}</code>
                    {t.waitForPort && <span className="text-blue-400 flex-shrink-0">→ :{t.waitForPort}</span>}
                  </div>
                ))}
              </div>
            )}

            {showLogs && typeof workflow.id === 'number' && (
              <LogViewer
                workflowId={workflow.id}
                isRunning={isRunning}
                onStatusChange={onStatusChange}
              />
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {isRunning ? (
              <>
                <Button variant="ghost" size="sm" title="Stop" onClick={onStop}
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
                  <Square className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" title="Restart" onClick={onRestart}
                  className="h-7 w-7 p-0 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" title="Run" onClick={onRun}
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50">
                <Play className="h-3.5 w-3.5" />
              </Button>
            )}

            {!isSystem && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit2 className="h-3.5 w-3.5 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    navigator.clipboard.writeText(primaryCmd);
                    toast({ title: 'Command copied' });
                  }}>
                    <Copy className="h-3.5 w-3.5 mr-2" /> Copy command
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSetRunButton}>
                    <Star className="h-3.5 w-3.5 mr-2" /> Set as Run button
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function WorkflowsPanel({ projectId, onRunWorkflow, className }: WorkflowsPanelProps) {
  const qc = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowItem | null>(null);
  const [form, setForm] = useState<WorkflowFormState>(EMPTY_FORM);

  // Live status per workflow id
  const [statusMap, setStatusMap] = useState<Map<string | number, WorkflowStatus>>(new Map());
  const setStatus = useCallback((id: string | number, s: WorkflowStatus) =>
    setStatusMap(m => new Map(m).set(id, s)), []);

  // Load system workflows (static, stale-time Infinity)
  const { data: systemWorkflows = [] } = useQuery<WorkflowItem[]>({
    queryKey: ['/api/workflows/system'],
    queryFn: () => apiRequest<WorkflowItem[]>('GET', '/api/workflows/system'),
    staleTime: Infinity,
  });

  // Load custom workflows (poll every 5 s)
  const { data: customWorkflows = [], isLoading } = useQuery<WorkflowItem[]>({
    queryKey: ['/api/workflows', projectId],
    queryFn: async () => {
      try {
        return await apiRequest<WorkflowItem[]>('GET', `/api/workflows?projectId=${projectId}`);
      } catch {
        return [];
      }
    },
    enabled: !!projectId,
    refetchInterval: 5000,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (f: WorkflowFormState) => apiRequest('POST', '/api/workflows', formToApiPayload(f, projectId)),
    onSuccess: () => {
      toast({ title: 'Workflow created' });
      qc.invalidateQueries({ queryKey: ['/api/workflows', projectId] });
      setIsCreating(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast({ title: 'Failed to create workflow', description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string | number; f: WorkflowFormState }) =>
      apiRequest('PATCH', `/api/workflows/${args.id}`, {
        name: args.f.name,
        executionMode: args.f.executionMode,
        runOnStart: args.f.runOnStart,
        tasks: formToApiPayload(args.f, projectId).tasks,
      }),
    onSuccess: () => {
      toast({ title: 'Workflow updated' });
      qc.invalidateQueries({ queryKey: ['/api/workflows', projectId] });
      setEditingWorkflow(null);
    },
    onError: (e: any) => toast({ title: 'Failed to update workflow', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => apiRequest('DELETE', `/api/workflows/${id}`, {}),
    onSuccess: () => {
      toast({ title: 'Workflow deleted' });
      qc.invalidateQueries({ queryKey: ['/api/workflows', projectId] });
    },
    onError: (e: any) => toast({ title: 'Failed to delete workflow', description: e.message, variant: 'destructive' }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string | number) => apiRequest('POST', `/api/workflows/${id}/duplicate`),
    onSuccess: () => {
      toast({ title: 'Workflow duplicated' });
      qc.invalidateQueries({ queryKey: ['/api/workflows', projectId] });
    },
    onError: (e: any) => toast({ title: 'Failed to duplicate workflow', description: e.message, variant: 'destructive' }),
  });

  const runMutation = useMutation({
    mutationFn: async (wf: WorkflowItem) => {
      if (typeof wf.id === 'number') {
        return apiRequest('POST', `/api/workflows/${wf.id}/run`);
      }
      // System workflow: run via run-command
      const cmd = wf.command ?? wf.tasks?.[0]?.command ?? '';
      return apiRequest('POST', '/api/workflows/run-command', {
        projectId: String(projectId),
        command: cmd,
        name: wf.name,
      });
    },
    onMutate: (wf) => setStatus(wf.id, 'running'),
    onSuccess: (_, wf) => {
      toast({ title: `Running: ${wf.name}` });
      onRunWorkflow?.(wf);
      // System workflows complete synchronously — mark done after delay
      if (typeof wf.id !== 'number') {
        setTimeout(() => setStatus(wf.id, 'success'), 1000);
      }
    },
    onError: (e: any, wf) => {
      setStatus(wf.id, 'failed');
      toast({ title: 'Failed to run workflow', description: e.message, variant: 'destructive' });
    },
  });

  const stopMutation = useMutation({
    mutationFn: (id: number) => apiRequest('POST', `/api/workflows/${id}/stop`),
    onSuccess: (_, id) => {
      setStatus(id, 'cancelled');
      toast({ title: 'Workflow stopped' });
      qc.invalidateQueries({ queryKey: ['/api/workflows', projectId] });
    },
    onError: (e: any) => toast({ title: 'Failed to stop workflow', description: e.message, variant: 'destructive' }),
  });

  const restartMutation = useMutation({
    mutationFn: (id: number) => apiRequest('POST', `/api/workflows/${id}/restart`),
    onMutate: (id) => setStatus(id, 'running'),
    onSuccess: (_, id) => toast({ title: 'Workflow restarted' }),
    onError: (e: any, id) => {
      setStatus(id, 'failed');
      toast({ title: 'Failed to restart workflow', description: e.message, variant: 'destructive' });
    },
  });

  const setRunButtonMutation = useMutation({
    mutationFn: (id: number) => apiRequest('POST', `/api/workflows/${id}/set-run-button`),
    onSuccess: () => {
      toast({ title: 'Run button workflow updated' });
      qc.invalidateQueries({ queryKey: ['/api/workflows', projectId] });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const openEdit = (wf: WorkflowItem) => {
    setForm(workflowToForm(wf));
    setEditingWorkflow(wf);
  };

  const allCount = systemWorkflows.length + customWorkflows.length;

  return (
    <div className={cn('h-full flex flex-col bg-[var(--ecode-surface)]', className)}>
      {/* Header */}
      <div className="h-9 border-b border-[var(--ecode-border)] flex items-center justify-between px-2.5 bg-[var(--ecode-surface)] flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Workflow className="h-3.5 w-3.5 text-[var(--ecode-text-muted)]" />
          <span className="text-xs font-medium text-[var(--ecode-text-muted)]">Workflows</span>
          <Badge variant="secondary" className="text-[11px]">{allCount}</Badge>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-[11px]">
              <Plus className="h-3.5 w-3.5 mr-1" /> New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
              <DialogDescription>Define tasks to automate your development process.</DialogDescription>
            </DialogHeader>
            <WorkflowForm
              value={form}
              onChange={setForm}
              onSubmit={() => createMutation.mutate(form)}
              onCancel={() => { setIsCreating(false); setForm(EMPTY_FORM); }}
              isPending={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {systemWorkflows.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-[11px] font-medium text-muted-foreground px-1">System Workflows</h3>
                {systemWorkflows.map(wf => (
                  <WorkflowCard
                    key={wf.id}
                    workflow={wf}
                    status={statusMap.get(wf.id) ?? 'idle'}
                    isSystem
                    onRun={() => runMutation.mutate(wf)}
                    onStop={() => {}}
                    onRestart={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onDuplicate={() => {}}
                    onSetRunButton={() => {}}
                    onStatusChange={s => setStatus(wf.id, s)}
                  />
                ))}
              </div>
            )}

            {customWorkflows.length > 0 && (
              <>
                {systemWorkflows.length > 0 && <Separator className="my-2" />}
                <div className="space-y-1.5">
                  <h3 className="text-[11px] font-medium text-muted-foreground px-1">Custom Workflows</h3>
                  {customWorkflows.map(wf => (
                    <WorkflowCard
                      key={wf.id}
                      workflow={wf}
                      status={statusMap.get(wf.id) ?? 'idle'}
                      isSystem={false}
                      onRun={() => runMutation.mutate(wf)}
                      onStop={() => typeof wf.id === 'number' && stopMutation.mutate(wf.id)}
                      onRestart={() => typeof wf.id === 'number' && restartMutation.mutate(wf.id)}
                      onEdit={() => openEdit(wf)}
                      onDelete={() => deleteMutation.mutate(wf.id)}
                      onDuplicate={() => duplicateMutation.mutate(wf.id)}
                      onSetRunButton={() => typeof wf.id === 'number' && setRunButtonMutation.mutate(wf.id)}
                      onStatusChange={s => setStatus(wf.id, s)}
                    />
                  ))}
                </div>
              </>
            )}

            {customWorkflows.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-[11px]">No custom workflows yet</p>
                <p className="text-[10px] mt-1">Create a workflow to automate your tasks</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Edit dialog */}
      <Dialog open={!!editingWorkflow} onOpenChange={open => !open && setEditingWorkflow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
          </DialogHeader>
          <WorkflowForm
            value={form}
            onChange={setForm}
            isEdit
            onSubmit={() => editingWorkflow && updateMutation.mutate({ id: editingWorkflow.id, f: form })}
            onCancel={() => setEditingWorkflow(null)}
            isPending={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
