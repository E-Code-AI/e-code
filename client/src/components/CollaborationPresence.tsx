// @ts-nocheck
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Users, Eye, Edit3, MousePointer, Circle } from 'lucide-react';

interface Collaborator {
  id: number;
  username: string;
  avatar?: string;
  color: string;
  isActive: boolean;
  isTyping: boolean;
  cursor?: {
    line: number;
    column: number;
  };
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  lastActivity?: Date;
}

interface CollaborationPresenceProps {
  collaborators: Collaborator[];
  currentUserId?: number;
  onFollowUser?: (userId: number) => void;
  followingUserId?: number | null;
  className?: string;
}

const userColors = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#FFD93D', // Yellow
  '#6BCB77', // Green
  '#B983FF', // Purple
  '#FD79A8', // Pink
  '#A8E6CF', // Light Green
];

export function CollaborationPresence({
  collaborators,
  currentUserId,
  onFollowUser,
  followingUserId,
  className
}: CollaborationPresenceProps) {
  const [expandedView, setExpandedView] = useState(false);
  const [hoveredUser, setHoveredUser] = useState<number | null>(null);
  
  // Get color for user
  const getUserColor = (userId: number) => {
    return userColors[userId % userColors.length];
  };
  
  // Get initials from username
  const getInitials = (username: string) => {
    return username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  // Format last activity time
  const formatLastActivity = (date?: Date) => {
    if (!date) return 'Active now';
    
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return 'Active now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return 'Offline';
  };
  
  // Active collaborators (excluding current user)
  const activeCollaborators = collaborators.filter(
    c => c.id !== currentUserId && c.isActive
  );
  
  // Inactive collaborators
  const inactiveCollaborators = collaborators.filter(
    c => c.id !== currentUserId && !c.isActive
  );
  
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Compact view - Avatar stack */}
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          {/* Show first 3 active users */}
          <div className="flex -space-x-2">
            {activeCollaborators.slice(0, 3).map((collaborator, index) => (
              <TooltipProvider key={collaborator.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="relative group"
                      onClick={() => onFollowUser && onFollowUser(collaborator.id)}
                      onMouseEnter={() => setHoveredUser(collaborator.id)}
                      onMouseLeave={() => setHoveredUser(null)}
                    >
                      <Avatar 
                        className={cn(
                          "h-8 w-8 border-2 transition-all duration-200",
                          followingUserId === collaborator.id 
                            ? "ring-2 ring-violet-500 ring-offset-2" 
                            : "border-background hover:z-10"
                        )}
                        style={{
                          borderColor: getUserColor(collaborator.id),
                          zIndex: hoveredUser === collaborator.id ? 20 : 3 - index
                        }}
                      >
                        <AvatarImage src={collaborator.avatar} />
                        <AvatarFallback 
                          className="text-xs font-medium"
                          style={{
                            backgroundColor: getUserColor(collaborator.id),
                            color: 'white'
                          }}
                        >
                          {getInitials(collaborator.username)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Activity indicators */}
                      {collaborator.isTyping && (
                        <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border border-background"></span>
                        </span>
                      )}
                      
                      {followingUserId === collaborator.id && (
                        <Eye className="absolute -top-1 -right-1 h-3 w-3 text-violet-500" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Circle 
                        className="h-2 w-2 fill-current" 
                        style={{ color: getUserColor(collaborator.id) }}
                      />
                      <span className="font-medium">{collaborator.username}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {collaborator.isTyping ? 'Typing...' : formatLastActivity(collaborator.lastActivity)}
                    </div>
                    {collaborator.cursor && (
                      <div className="text-xs text-muted-foreground">
                        Line {collaborator.cursor.line}, Col {collaborator.cursor.column}
                      </div>
                    )}
                    {followingUserId !== collaborator.id && (
                      <div className="text-xs text-violet-500 mt-1">
                        Click to follow
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
          
          {/* More collaborators indicator */}
          {activeCollaborators.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 h-8 px-2 text-xs"
              onClick={() => setExpandedView(!expandedView)}
            >
              +{activeCollaborators.length - 3} more
            </Button>
          )}
        </div>
        
        {/* Total count */}
        <Badge variant="secondary" className="text-xs">
          <Users className="h-3 w-3 mr-1" />
          {activeCollaborators.length + 1} online
        </Badge>
      </div>
      
      {/* Expanded view */}
      {expandedView && (
        <div className="p-3 bg-background/95 backdrop-blur border rounded-lg space-y-3">
          {/* Active users */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Active Now ({activeCollaborators.length})
            </h4>
            <div className="space-y-1">
              {activeCollaborators.map(collaborator => (
                <div
                  key={collaborator.id}
                  className={cn(
                    "flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50 cursor-pointer transition-colors",
                    followingUserId === collaborator.id && "bg-violet-500/10"
                  )}
                  onClick={() => onFollowUser && onFollowUser(collaborator.id)}
                >
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={collaborator.avatar} />
                      <AvatarFallback 
                        className="text-[10px] font-medium"
                        style={{
                          backgroundColor: getUserColor(collaborator.id),
                          color: 'white'
                        }}
                      >
                        {getInitials(collaborator.username)}
                      </AvatarFallback>
                    </Avatar>
                    {collaborator.isTyping && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full border border-background"></span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium truncate">
                        {collaborator.username}
                      </span>
                      {followingUserId === collaborator.id && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          Following
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {collaborator.isTyping ? (
                        <span className="flex items-center gap-1">
                          <Edit3 className="h-2.5 w-2.5" />
                          Typing...
                        </span>
                      ) : collaborator.cursor ? (
                        <span className="flex items-center gap-1">
                          <MousePointer className="h-2.5 w-2.5" />
                          Line {collaborator.cursor.line}
                        </span>
                      ) : (
                        'Viewing'
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Inactive users */}
          {inactiveCollaborators.length > 0 && (
            <div className="space-y-2 opacity-60">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Away ({inactiveCollaborators.length})
              </h4>
              <div className="space-y-1">
                {inactiveCollaborators.map(collaborator => (
                  <div
                    key={collaborator.id}
                    className="flex items-center gap-2 p-1.5"
                  >
                    <Avatar className="h-6 w-6 opacity-50">
                      <AvatarImage src={collaborator.avatar} />
                      <AvatarFallback 
                        className="text-[10px] font-medium"
                        style={{
                          backgroundColor: getUserColor(collaborator.id),
                          color: 'white'
                        }}
                      >
                        {getInitials(collaborator.username)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <span className="text-sm text-muted-foreground">
                        {collaborator.username}
                      </span>
                    </div>
                    
                    <span className="text-[10px] text-muted-foreground">
                      {formatLastActivity(collaborator.lastActivity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Cursor indicators overlay - to be rendered in editor */}
      <div className="sr-only">
        {activeCollaborators.map(collaborator => (
          collaborator.cursor && (
            <div
              key={`cursor-${collaborator.id}`}
              className="absolute pointer-events-none"
              style={{
                // Position will be calculated based on editor metrics
                left: 0,
                top: 0,
                transform: `translate(${collaborator.cursor.column * 8}px, ${collaborator.cursor.line * 21}px)`
              }}
            >
              <div 
                className="w-0.5 h-5 animate-pulse"
                style={{ backgroundColor: getUserColor(collaborator.id) }}
              />
              <div 
                className="absolute -top-5 left-1 px-1.5 py-0.5 text-[10px] text-white rounded whitespace-nowrap"
                style={{ backgroundColor: getUserColor(collaborator.id) }}
              >
                {collaborator.username}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}