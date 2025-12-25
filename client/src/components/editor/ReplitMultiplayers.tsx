import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Copy,
  Check,
  MoreVertical,
  Loader2,
  Trash2,
  Shield,
  Eye,
  Edit3
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface Collaborator {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'away';
  role: 'owner' | 'editor' | 'viewer';
  currentFile?: string;
  cursor?: { line: number; col: number; color?: string };
  lastSeen?: string;
}

interface CollaboratorsResponse {
  collaborators: Collaborator[];
}

interface InviteResponse {
  success: boolean;
  message: string;
  inviteLink?: string;
}

interface ReplitMultiplayersProps {
  projectId?: string;
  collaborators?: Collaborator[];
  onInvite?: (email: string) => void;
  className?: string;
}

export function ReplitMultiplayers({ 
  projectId, 
  collaborators: propCollaborators = [], 
  onInvite,
  className 
}: ReplitMultiplayersProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const { data, isLoading, isError } = useQuery<CollaboratorsResponse>({
    queryKey: ['/api/collaboration', projectId, 'users'],
    queryFn: async () => {
      if (!projectId) return { collaborators: [] };
      const response = await fetch(`/api/collaboration/${projectId}/users`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch collaborators');
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role?: string }) => {
      if (!projectId) throw new Error('Project ID is required');
      return apiRequest<InviteResponse>('POST', `/api/collaboration/${projectId}/invite`, { 
        email, 
        role: role || 'editor' 
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Invitation sent',
        description: data.message || 'User has been invited to collaborate',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/collaboration', projectId, 'users'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send invitation',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ collaboratorId, role }: { collaboratorId: string; role: string }) => {
      if (!projectId) throw new Error('Project ID is required');
      return apiRequest<{ success: boolean; message: string }>('PATCH', `/api/collaboration/${projectId}/users/${collaboratorId}`, { role });
    },
    onSuccess: (data) => {
      toast({
        title: 'Role updated',
        description: data.message || 'Collaborator role has been updated',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/collaboration', projectId, 'users'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update role',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeCollaboratorMutation = useMutation({
    mutationFn: async (collaboratorId: string) => {
      if (!projectId) throw new Error('Project ID is required');
      return apiRequest<{ success: boolean; message: string }>('DELETE', `/api/collaboration/${projectId}/users/${collaboratorId}`);
    },
    onSuccess: (data) => {
      toast({
        title: 'Collaborator removed',
        description: data.message || 'Collaborator has been removed from the project',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/collaboration', projectId, 'users'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove collaborator',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleInvite = () => {
    if (inviteEmail.trim()) {
      if (onInvite) {
        onInvite(inviteEmail.trim());
      }
      inviteMutation.mutate({ email: inviteEmail.trim() });
      setInviteEmail('');
    }
  };

  const handleCopyLink = () => {
    const inviteLink = `${window.location.origin}/join/${projectId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleUpdateRole = (collaboratorId: string, role: string) => {
    updateRoleMutation.mutate({ collaboratorId, role });
  };

  const handleRemoveCollaborator = (collaboratorId: string) => {
    removeCollaboratorMutation.mutate(collaboratorId);
  };

  const fallbackCollaborators: Collaborator[] = [
    {
      id: 'current-user',
      username: user?.username || 'You',
      email: user?.email || 'you@example.com',
      status: 'online',
      role: 'owner',
      currentFile: 'index.js'
    }
  ];

  const apiCollaborators = data?.collaborators || [];
  const displayCollaborators: Collaborator[] = 
    propCollaborators.length > 0 
      ? propCollaborators 
      : apiCollaborators.length > 0 
        ? apiCollaborators 
        : (isError || !projectId) 
          ? fallbackCollaborators 
          : [];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Shield className="h-3 w-3" />;
      case 'editor':
        return <Edit3 className="h-3 w-3" />;
      case 'viewer':
        return <Eye className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const isCurrentUser = (collaborator: Collaborator) => {
    return collaborator.id === 'current-user' || collaborator.email === user?.email || collaborator.username === user?.username;
  };

  return (
    <div className={cn("h-full flex flex-col bg-background", className)} data-testid="multiplayers-panel">
      <div className="p-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground mb-3">
          Multiplayers
        </h3>
        
        <p className="text-sm text-muted-foreground mb-3">
          Add people by username or email
        </p>
        
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Username or email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              className="flex-1 text-sm h-8 border-border"
              disabled={inviteMutation.isPending}
              data-testid="input-invite-email"
            />
            <Button
              size="sm"
              onClick={handleInvite}
              disabled={inviteMutation.isPending || !inviteEmail.trim()}
              className="h-8 px-3 bg-status-info hover:bg-status-info text-white text-xs"
              data-testid="button-invite"
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                'Invite'
              )}
            </Button>
          </div>
        </div>
      </div>

      {isLoading && projectId && (
        <div className="flex items-center justify-center py-8" data-testid="loading-collaborators">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading collaborators...</span>
        </div>
      )}

      {!isLoading && displayCollaborators.length <= 1 && (
        <div className="px-4 py-3 bg-muted border-b border-border">
          <p className="text-sm font-medium text-foreground" data-testid="text-no-collaborators">
            No one else is here
          </p>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2">
          {displayCollaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-muted group"
              data-testid={`collaborator-item-${collaborator.id}`}
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={collaborator.avatarUrl} />
                  <AvatarFallback className="bg-muted text-foreground text-xs">
                    {(collaborator.displayName || collaborator.username)?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {collaborator.status === 'online' && (
                  <div 
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-status-success rounded-full border-2 border-white" 
                    style={collaborator.cursor?.color ? { backgroundColor: collaborator.cursor.color } : undefined}
                  />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate" data-testid={`text-username-${collaborator.id}`}>
                    {collaborator.displayName || collaborator.username}
                    {isCurrentUser(collaborator) && ' (You)'}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {getRoleIcon(collaborator.role)}
                    ({collaborator.role})
                  </span>
                </div>
                {collaborator.currentFile && (
                  <p className="text-xs text-muted-foreground truncate">
                    {collaborator.currentFile}
                  </p>
                )}
              </div>
              
              {!isCurrentUser(collaborator) && collaborator.role !== 'owner' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-collaborator-menu-${collaborator.id}`}
                    >
                      <MoreVertical className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background">
                    <DropdownMenuItem>View Profile</DropdownMenuItem>
                    <DropdownMenuItem>Send Message</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleUpdateRole(collaborator.id, 'editor')}
                      disabled={updateRoleMutation.isPending}
                      data-testid={`menu-item-make-editor-${collaborator.id}`}
                    >
                      <Edit3 className="h-3 w-3 mr-2" />
                      Make Editor
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleUpdateRole(collaborator.id, 'viewer')}
                      disabled={updateRoleMutation.isPending}
                      data-testid={`menu-item-make-viewer-${collaborator.id}`}
                    >
                      <Eye className="h-3 w-3 mr-2" />
                      Make Viewer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleRemoveCollaborator(collaborator.id)}
                      disabled={removeCollaboratorMutation.isPending}
                      className="text-destructive focus:text-destructive"
                      data-testid={`menu-item-remove-${collaborator.id}`}
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border bg-status-info/10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-foreground">
            Refer a friend and earn more credits
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="w-full h-8 text-xs border-status-info hover:bg-status-info-soft"
          data-testid="button-copy-invite-link"
        >
          {copiedLink ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy invite link
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
