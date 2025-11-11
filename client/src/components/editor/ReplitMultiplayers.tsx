import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import {
  UserPlus,
  Copy,
  Check,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface Collaborator {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'away';
  role: 'owner' | 'editor' | 'viewer';
  currentFile?: string;
  cursor?: { line: number; col: number };
}

interface ReplitMultiplayersProps {
  projectId?: string;
  collaborators?: Collaborator[];
  onInvite?: (email: string) => void;
  className?: string;
}

export function ReplitMultiplayers({ 
  projectId, 
  collaborators = [], 
  onInvite,
  className 
}: ReplitMultiplayersProps) {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleInvite = () => {
    if (inviteEmail.trim()) {
      onInvite?.(inviteEmail.trim());
      setInviteEmail('');
    }
  };

  const handleCopyLink = () => {
    const inviteLink = `${window.location.origin}/join/${projectId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Mock collaborators for demo
  const mockCollaborators: Collaborator[] = collaborators.length > 0 ? collaborators : [
    {
      id: '1',
      username: 'You',
      email: user?.email || 'you@example.com',
      status: 'online',
      role: 'owner',
      currentFile: 'index.js'
    }
  ];

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground mb-3">
          Multiplayers
        </h3>
        
        <p className="text-sm text-muted-foreground mb-3">
          Add people by username or email
        </p>
        
        {/* Invite Section */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Username or email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              className="flex-1 text-sm h-8 border-border"
            />
            <Button
              size="sm"
              onClick={handleInvite}
              className="h-8 px-3 bg-status-info hover:bg-status-info text-white text-xs"
            >
              Invite
            </Button>
          </div>
        </div>
      </div>

      {/* No one else here section */}
      {mockCollaborators.length === 1 && (
        <div className="px-4 py-3 bg-muted border-b border-border">
          <p className="text-sm font-medium text-foreground">
            No one else is here
          </p>
        </div>
      )}

      {/* Collaborators List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {mockCollaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-muted"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={collaborator.avatarUrl} />
                  <AvatarFallback className="bg-muted text-foreground text-xs">
                    {collaborator.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {collaborator.status === 'online' && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-status-success rounded-full border-2 border-white" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {collaborator.username}
                  </span>
                  {collaborator.role === 'owner' && (
                    <span className="text-xs text-muted-foreground">
                      (owner)
                    </span>
                  )}
                </div>
                {collaborator.currentFile && (
                  <p className="text-xs text-muted-foreground truncate">
                    {collaborator.currentFile}
                  </p>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background">
                  <DropdownMenuItem>View Profile</DropdownMenuItem>
                  <DropdownMenuItem>Send Message</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Refer a Friend Section */}
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