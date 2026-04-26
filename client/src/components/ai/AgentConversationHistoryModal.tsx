import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { History, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

interface ConversationHistoryItem {
  id: number;
  projectId: number;
  agentMode: 'plan' | 'build';
  model: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
}

interface AgentConversationHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  currentConversationId: number | null;
  onSelectConversation: (conversationId: number) => void;
}

export function AgentConversationHistoryModal({
  open,
  onOpenChange,
  projectId,
  currentConversationId,
  onSelectConversation,
}: AgentConversationHistoryModalProps) {
  const { data, isLoading } = useQuery<{ conversations: ConversationHistoryItem[] }>({
    queryKey: ['/api/agent/projects', projectId, 'conversations'],
    queryFn: () => apiRequest('GET', `/api/agent/projects/${projectId}/conversations`),
    enabled: open && projectId > 0,
  });

  const conversations = useMemo(() => data?.conversations || [], [data]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] p-0 overflow-hidden" data-testid="agent-conversation-history-modal">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <History className="h-4 w-4 text-muted-foreground" />
            Conversations
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-4 sm:p-5">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-24 w-full" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No saved conversations yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start a new chat and it will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conversation) => {
                  const isActive = conversation.id === currentConversationId;
                  const preview = conversation.preview?.trim() || 'New conversation';

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => onSelectConversation(conversation.id)}
                      className={cn(
                        'w-full rounded-lg border px-4 py-3 text-left transition-colors',
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:bg-muted/40'
                      )}
                      data-testid={`conversation-history-item-${conversation.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">{preview}</span>
                            {isActive && <Badge variant="secondary">Current</Badge>}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}</span>
                            <span>{conversation.messageCount} messages</span>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {conversation.agentMode}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <Badge variant="secondary">Open</Badge>
                          ) : (
                            <span className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium">
                              Open
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default AgentConversationHistoryModal;
