/**
 * WebhookSettings — Settings panel for managing outbound webhook
 * subscriptions. Lists active subscriptions, lets the user create/test/delete
 * them, and shows the latest delivery log per subscription.
 *
 * Backed by /api/webhooks (CRUD + /:id/deliveries + /:id/test).
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, PlayCircle, Webhook, Copy } from 'lucide-react';

interface Subscription {
  id: string;
  url: string;
  events: string;
  secret: string | null;
  active: boolean;
  lastDeliveryAt: string | null;
  lastStatusCode: number | null;
  failureCount: number;
  createdAt: string;
}

interface DeliveryRow {
  id: string;
  event: string;
  statusCode: number | null;
  succeeded: boolean;
  attemptedAt: string;
  responseBody: string | null;
}

const ALL_EVENTS = [
  'deployment.created',
  'deployment.succeeded',
  'deployment.failed',
  'deployment.stopped',
  'deployment.slept',
  'project.shared',
  'project.deleted',
  'share_link.created',
  'share_link.revoked',
];

export function WebhookSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState<string>('*');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ subscriptions: Subscription[] }>({
    queryKey: ['/api/webhooks'],
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/webhooks', { url: newUrl, events: newEvents }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks'] });
      setNewUrl('');
      setNewEvents('*');
      toast({ title: 'Webhook created', description: 'Save the secret shown next to it — it is needed to verify signatures.' });
    },
    onError: (err: any) =>
      toast({ title: 'Failed to create webhook', description: err?.message || 'Unknown error', variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiRequest('PUT', `/api/webhooks/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/webhooks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/webhooks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/webhooks'] }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => apiRequest('POST', `/api/webhooks/${id}/test`),
    onSuccess: () => toast({ title: 'Test scheduled', description: 'Check the deliveries log in a few seconds.' }),
  });

  const copySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      toast({ title: 'Secret copied' });
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Webhook className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Outbound Webhooks</h2>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <Label className="text-sm font-medium">Add a new webhook</Label>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_auto] gap-2">
          <Input
            type="url"
            placeholder="https://example.com/webhook"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <Input
            placeholder="* or comma-separated events"
            value={newEvents}
            onChange={(e) => setNewEvents(e.target.value)}
          />
          <Button
            onClick={() => createMutation.mutate(undefined)}
            disabled={!newUrl || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Available events</summary>
          <div className="mt-2 grid grid-cols-2 gap-1 font-mono">
            {ALL_EVENTS.map((e) => <span key={e}>{e}</span>)}
          </div>
        </details>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : data?.subscriptions?.length ? (
        <div className="space-y-3">
          {data.subscriptions.map((sub) => (
            <SubscriptionRow
              key={sub.id}
              sub={sub}
              expanded={expanded === sub.id}
              onToggleExpand={() => setExpanded(expanded === sub.id ? null : sub.id)}
              onToggleActive={(active) => toggleMutation.mutate({ id: sub.id, active })}
              onTest={() => testMutation.mutate(sub.id)}
              onDelete={() => {
                if (confirm('Delete this webhook? This cannot be undone.')) {
                  deleteMutation.mutate(sub.id);
                }
              }}
              onCopySecret={() => sub.secret && copySecret(sub.secret)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No webhooks configured yet.
        </div>
      )}
    </div>
  );
}

interface SubscriptionRowProps {
  sub: Subscription;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: (active: boolean) => void;
  onTest: () => void;
  onDelete: () => void;
  onCopySecret: () => void;
}

function SubscriptionRow({
  sub,
  expanded,
  onToggleExpand,
  onToggleActive,
  onTest,
  onDelete,
  onCopySecret,
}: SubscriptionRowProps) {
  const { data: deliveries } = useQuery<{ deliveries: DeliveryRow[] }>({
    queryKey: ['/api/webhooks', sub.id, 'deliveries'],
    enabled: expanded,
  });

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm truncate">{sub.url}</span>
            {!sub.active && <Badge variant="secondary">disabled</Badge>}
            {sub.failureCount > 0 && (
              <Badge variant="destructive">{sub.failureCount} failures</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            events: <span className="font-mono">{sub.events}</span>
            {sub.lastStatusCode != null && <> · last: {sub.lastStatusCode}</>}
          </div>
        </div>
        <Switch checked={sub.active} onCheckedChange={onToggleActive} />
        <Button size="sm" variant="ghost" onClick={onCopySecret} title="Copy signing secret">
          <Copy className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onTest} title="Send test event">
          <PlayCircle className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} title="Delete">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onToggleExpand}>
          {expanded ? 'Hide' : 'Logs'}
        </Button>
      </div>
      {expanded && (
        <div className="border-t p-3 space-y-1 text-xs font-mono max-h-64 overflow-auto">
          {deliveries?.deliveries?.length ? (
            deliveries.deliveries.map((d) => (
              <div key={d.id} className="flex items-start gap-2">
                <span className={d.succeeded ? 'text-green-600' : 'text-red-600'}>
                  {d.statusCode ?? 'ERR'}
                </span>
                <span className="text-muted-foreground">{new Date(d.attemptedAt).toLocaleString()}</span>
                <span>{d.event}</span>
                {d.responseBody && <span className="text-muted-foreground truncate">{d.responseBody}</span>}
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">No deliveries yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
