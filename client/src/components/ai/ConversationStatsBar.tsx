import { useMemo, useState, useEffect } from 'react';
import { MessageSquare, FileEdit, Wrench, Coins, Clock, Activity, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/stores/agentConversationStore';

interface ConversationStatsBarProps {
  messages: Message[];
  isWorking?: boolean;
  className?: string;
}

interface Stats {
  userMessages: number;
  assistantMessages: number;
  totalMessages: number;
  edits: number;
  fileCreates: number;
  fileDeletes: number;
  commands: number;
  toolCalls: number;
  tokens: number;
  costCents: number;
  thinkingMs: number;
  executionMs: number;
  filesTouched: Set<string>;
  startedAt: number | null;
  lastActivityAt: number | null;
}

function parseCostToCents(cost: string | undefined): number {
  if (!cost) return 0;
  const m = cost.match(/[\d.]+/);
  if (!m) return 0;
  return Math.round(parseFloat(m[0]) * 100);
}

function computeStats(messages: Message[]): Stats {
  const stats: Stats = {
    userMessages: 0,
    assistantMessages: 0,
    totalMessages: 0,
    edits: 0,
    fileCreates: 0,
    fileDeletes: 0,
    commands: 0,
    toolCalls: 0,
    tokens: 0,
    costCents: 0,
    thinkingMs: 0,
    executionMs: 0,
    filesTouched: new Set<string>(),
    startedAt: null,
    lastActivityAt: null,
  };

  for (const m of messages) {
    if (m.id === '1' && !m.content) continue;
    const ts = m.timestamp instanceof Date ? m.timestamp.getTime() : new Date(m.timestamp as any).getTime();
    if (!Number.isNaN(ts)) {
      if (stats.startedAt === null || ts < stats.startedAt) stats.startedAt = ts;
      if (stats.lastActivityAt === null || ts > stats.lastActivityAt) stats.lastActivityAt = ts;
    }

    if (m.role === 'user') stats.userMessages++;
    else if (m.role === 'assistant') stats.assistantMessages++;
    stats.totalMessages++;

    // Actions
    if (m.actions && Array.isArray(m.actions)) {
      for (const a of m.actions) {
        if (a.type === 'edit_file') { stats.edits++; if (a.path) stats.filesTouched.add(a.path); }
        else if (a.type === 'create_file') { stats.fileCreates++; if (a.path) stats.filesTouched.add(a.path); }
        else if (a.type === 'delete_file') { stats.fileDeletes++; if (a.path) stats.filesTouched.add(a.path); }
        else if (a.type === 'run_command' || a.type === 'install_package') { stats.commands++; }
      }
    }

    // Tool executions
    if (m.toolExecutions && Array.isArray(m.toolExecutions)) {
      stats.toolCalls += m.toolExecutions.length;
      for (const t of m.toolExecutions) {
        if (t.metadata?.executionTime) stats.executionMs += t.metadata.executionTime;
        if (Array.isArray(t.metadata?.filesChanged)) {
          for (const f of t.metadata.filesChanged) stats.filesTouched.add(f);
        }
      }
    }

    // Autonomous file operations (telemetry-style messages)
    if (m.autonomousPayload?.fileOperation?.path) {
      const op = m.autonomousPayload.fileOperation;
      stats.filesTouched.add(op.path);
      if (op.type === 'edit') stats.edits++;
      else if (op.type === 'create') stats.fileCreates++;
      else if (op.type === 'delete') stats.fileDeletes++;
    }
    if (m.autonomousPayload?.terminal?.command) stats.commands++;
    if (m.autonomousPayload?.timeline?.events) {
      for (const ev of m.autonomousPayload.timeline.events) {
        if (ev.filePath) stats.filesTouched.add(ev.filePath);
      }
    }

    // Metadata
    if (m.metadata?.tokens) stats.tokens += m.metadata.tokens;
    if (m.metadata?.cost) stats.costCents += parseCostToCents(m.metadata.cost);

    // Thinking time
    if (m.thinking && Array.isArray(m.thinking)) {
      for (const step of m.thinking) {
        if (step.duration) stats.thinkingMs += step.duration;
      }
    }
  }

  return stats;
}

function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r ? `${m}m ${r}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

function formatCost(cents: number): string {
  if (cents === 0) return '$0';
  if (cents < 1) return `<$0.01`;
  return `$${(cents / 100).toFixed(cents < 100 ? 3 : 2)}`;
}

function formatNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

export function ConversationStatsBar({ messages, isWorking, className }: ConversationStatsBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick every second when agent is working so the elapsed timer updates live
  useEffect(() => {
    if (!isWorking) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isWorking]);

  const stats = useMemo(() => computeStats(messages), [messages]);

  // Hide when conversation is empty (only the default welcome message)
  if (stats.totalMessages <= 1) return null;

  const elapsedMs = stats.startedAt
    ? (isWorking ? now : (stats.lastActivityAt || now)) - stats.startedAt
    : 0;

  const totalActions = stats.edits + stats.fileCreates + stats.fileDeletes + stats.commands;

  return (
    <div
      className={cn(
        'mx-3 sm:mx-4 mt-2 mb-2 rounded-lg border border-[var(--ecode-border)] bg-[var(--ecode-surface)]/60 backdrop-blur-sm overflow-hidden',
        className
      )}
      data-testid="conversation-stats-bar"
    >
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--ecode-surface)] transition-colors"
        onClick={() => setExpanded(v => !v)}
        data-testid="stats-bar-toggle"
      >
        {isWorking ? (
          <Activity className="h-3.5 w-3.5 text-violet-500 animate-pulse flex-shrink-0" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
        )}

        <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto scrollbar-none text-[11px] font-medium text-[var(--ecode-text-secondary)]">
          <Stat icon={MessageSquare} value={`${stats.userMessages}/${stats.assistantMessages}`} label="msgs" testId="stat-messages" />
          <Stat icon={FileEdit} value={formatNumber(stats.filesTouched.size)} label={stats.filesTouched.size === 1 ? 'file' : 'files'} testId="stat-files" />
          <Stat icon={Wrench} value={formatNumber(totalActions)} label={totalActions === 1 ? 'action' : 'actions'} testId="stat-actions" />
          {stats.tokens > 0 && (
            <Stat icon={Coins} value={formatNumber(stats.tokens)} label="tok" testId="stat-tokens" />
          )}
          <Stat
            icon={Clock}
            value={formatDuration(elapsedMs)}
            label={isWorking ? 'live' : 'total'}
            testId="stat-time"
            highlight={isWorking}
          />
        </div>

        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)] flex-shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)] flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[var(--ecode-border)] grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-[11px]" data-testid="stats-bar-expanded">
          <DetailRow label="Vos messages" value={String(stats.userMessages)} />
          <DetailRow label="Réponses agent" value={String(stats.assistantMessages)} />
          <DetailRow label="Outils utilisés" value={String(stats.toolCalls)} />
          <DetailRow label="Fichiers créés" value={String(stats.fileCreates)} accent={stats.fileCreates > 0 ? 'green' : undefined} />
          <DetailRow label="Fichiers édités" value={String(stats.edits)} accent={stats.edits > 0 ? 'blue' : undefined} />
          <DetailRow label="Fichiers supprimés" value={String(stats.fileDeletes)} accent={stats.fileDeletes > 0 ? 'red' : undefined} />
          <DetailRow label="Commandes lancées" value={String(stats.commands)} />
          <DetailRow label="Fichiers touchés" value={String(stats.filesTouched.size)} />
          {stats.thinkingMs > 0 && (
            <DetailRow label="Temps de réflexion" value={formatDuration(stats.thinkingMs)} />
          )}
          {stats.executionMs > 0 && (
            <DetailRow label="Temps d'exécution" value={formatDuration(stats.executionMs)} />
          )}
          {stats.tokens > 0 && (
            <DetailRow label="Tokens consommés" value={formatNumber(stats.tokens)} />
          )}
          {stats.costCents > 0 && (
            <DetailRow label="Coût estimé" value={formatCost(stats.costCents)} accent="green" />
          )}
          <DetailRow
            label="Durée de session"
            value={formatDuration(elapsedMs)}
            accent={isWorking ? 'violet' : undefined}
          />
        </div>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  testId,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  testId?: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap',
        highlight && 'text-violet-500 dark:text-violet-400'
      )}
      data-testid={testId}
    >
      <Icon className="h-3 w-3 flex-shrink-0 opacity-70" />
      <span className="font-semibold tabular-nums text-[var(--ecode-text)]">{value}</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}

function DetailRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'green' | 'blue' | 'red' | 'violet';
}) {
  const accentClass =
    accent === 'green' ? 'text-green-600 dark:text-green-400'
    : accent === 'blue' ? 'text-blue-600 dark:text-blue-400'
    : accent === 'red' ? 'text-red-600 dark:text-red-400'
    : accent === 'violet' ? 'text-violet-600 dark:text-violet-400'
    : 'text-[var(--ecode-text)]';
  return (
    <div className="flex items-center justify-between gap-2 min-w-0">
      <span className="text-[var(--ecode-text-secondary)] truncate">{label}</span>
      <span className={cn('font-semibold tabular-nums flex-shrink-0', accentClass)}>{value}</span>
    </div>
  );
}

export default ConversationStatsBar;
