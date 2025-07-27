import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Users2, Eye, Edit3, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Collaborator {
  clientId: number;
  userId: number;
  username: string;
  color: string;
  cursor?: {
    position: {
      lineNumber: number;
      column: number;
    };
    selection?: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    };
  };
}

interface CollaborationPanelProps {
  collaborators: Collaborator[];
  onFollowUser?: (userId: number) => void;
  followingUserId?: number | null;
  className?: string;
}

export function CollaborationPanel({
  collaborators,
  onFollowUser,
  followingUserId,
  className
}: CollaborationPanelProps) {
  const [expandedView, setExpandedView] = useState(false);

  const getActivityStatus = (cursor?: Collaborator['cursor']) => {
    if (!cursor) return 'idle';
    if (cursor.selection) return 'editing';
    return 'viewing';
  };

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'editing':
        return <Edit3 className="h-3 w-3" />;
      case 'viewing':
        return <Eye className="h-3 w-3" />;
      default:
        return <Circle className="h-3 w-3" />;
    }
  };

  const getUserInitials = (username: string) => {
    return username
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (collaborators.length === 0) {
    return null;
  }

  return (
    <div className={cn("bg-ecode-darker border-b border-ecode-border", className)}>
      {/* Compact view */}
      {!expandedView && (
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Users2 className="h-4 w-4 text-ecode-muted" />
            <span className="text-sm text-ecode-muted">
              {collaborators.length} {collaborators.length === 1 ? 'collaborator' : 'collaborators'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {collaborators.slice(0, 3).map((collaborator) => (
                <Tooltip key={collaborator.clientId}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-6 w-6 border-2 border-ecode-darker">
                      <AvatarImage src={`https://avatar.vercel.sh/${collaborator.userId}.png`} />
                      <AvatarFallback style={{ backgroundColor: collaborator.color }}>
                        {getUserInitials(collaborator.username)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{collaborator.username}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {collaborators.length > 3 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ecode-muted text-xs font-medium text-ecode-foreground">
                  +{collaborators.length - 3}
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedView(true)}
              className="h-6 px-2 text-xs"
            >
              View all
            </Button>
          </div>
        </div>
      )}

      {/* Expanded view */}
      {expandedView && (
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Active Collaborators</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedView(false)}
              className="h-6 px-2 text-xs"
            >
              Collapse
            </Button>
          </div>
          
          <div className="space-y-2">
            {collaborators.map((collaborator) => {
              const status = getActivityStatus(collaborator.cursor);
              const isFollowing = followingUserId === collaborator.userId;
              
              return (
                <div
                  key={collaborator.clientId}
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2",
                    isFollowing && "bg-ecode-accent/10 ring-1 ring-ecode-accent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://avatar.vercel.sh/${collaborator.userId}.png`} />
                      <AvatarFallback style={{ backgroundColor: collaborator.color }}>
                        {getUserInitials(collaborator.username)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <p className="text-sm font-medium">{collaborator.username}</p>
                      {collaborator.cursor && (
                        <p className="text-xs text-ecode-muted">
                          Line {collaborator.cursor.position.lineNumber}, Col {collaborator.cursor.position.column}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      {getActivityIcon(status)}
                      {status}
                    </Badge>
                    
                    {onFollowUser && (
                      <Button
                        variant={isFollowing ? "default" : "outline"}
                        size="sm"
                        onClick={() => onFollowUser(collaborator.userId)}
                        className="h-7 px-2 text-xs"
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}