import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  UserPlus, 
  Video, 
  MessageSquare,
  MousePointer,
  Eye,
  Code2,
  Terminal
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Collaborator {
  id: string;
  username: string;
  avatar?: string;
  color: string;
  cursor?: { x: number; y: number };
  currentFile?: string;
  status: 'active' | 'idle' | 'away';
  activity?: string;
}

interface CollaborativePresenceProps {
  projectId: number;
  currentUser: {
    id: string;
    username: string;
    avatar?: string;
  };
  className?: string;
}

const COLLABORATOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

export function CollaborativePresence({ projectId, currentUser, className }: CollaborativePresenceProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [showPresence, setShowPresence] = useState(true);
  const [isFollowing, setIsFollowing] = useState<string | null>(null);

  useEffect(() => {
    // Simulate collaborators joining
    const mockCollaborators: Collaborator[] = [
      {
        id: '1',
        username: 'alice_dev',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
        color: COLLABORATOR_COLORS[0],
        currentFile: 'App.tsx',
        status: 'active',
        activity: 'Editing'
      },
      {
        id: '2',
        username: 'bob_coder',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
        color: COLLABORATOR_COLORS[1],
        currentFile: 'styles.css',
        status: 'active',
        activity: 'Viewing'
      },
      {
        id: '3',
        username: 'charlie_ui',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
        color: COLLABORATOR_COLORS[2],
        currentFile: 'Terminal',
        status: 'idle',
        activity: 'Running tests'
      }
    ];

    // Add collaborators gradually
    mockCollaborators.forEach((collaborator, index) => {
      setTimeout(() => {
        setCollaborators(prev => [...prev, collaborator]);
      }, (index + 1) * 1000);
    });

    // Simulate cursor movements
    const cursorInterval = setInterval(() => {
      setCollaborators(prev => prev.map(collab => ({
        ...collab,
        cursor: {
          x: Math.random() * 100,
          y: Math.random() * 100
        }
      })));
    }, 3000);

    return () => {
      clearInterval(cursorInterval);
      setCollaborators([]);
    };
  }, [projectId]);

  const handleFollow = (collaboratorId: string) => {
    setIsFollowing(isFollowing === collaboratorId ? null : collaboratorId);
  };

  const getActivityIcon = (activity?: string) => {
    switch (activity) {
      case 'Editing': return <Code2 className="h-3 w-3" />;
      case 'Viewing': return <Eye className="h-3 w-3" />;
      case 'Running tests': return <Terminal className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Active Collaborators Bar */}
      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {collaborators.length + 1} active
          </span>
          <div className="flex -space-x-2">
            {/* Current User */}
            <Avatar className="h-6 w-6 border-2 border-background">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="text-xs">
                {currentUser.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Other Collaborators */}
            {collaborators.slice(0, 3).map(collab => (
              <Avatar 
                key={collab.id} 
                className="h-6 w-6 border-2 border-background"
                style={{ borderColor: collab.color }}
              >
                <AvatarImage src={collab.avatar} />
                <AvatarFallback className="text-xs" style={{ backgroundColor: collab.color }}>
                  {collab.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {collaborators.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                <span className="text-xs text-muted-foreground">+{collaborators.length - 3}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2">
            <UserPlus className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2">
            <Video className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2">
            <MessageSquare className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Detailed Presence Card */}
      {showPresence && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Collaborators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {collaborators.map(collab => (
              <div 
                key={collab.id} 
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-8 w-8" style={{ borderColor: collab.color }}>
                      <AvatarImage src={collab.avatar} />
                      <AvatarFallback style={{ backgroundColor: collab.color }}>
                        {collab.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div 
                      className={cn(
                        "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background",
                        collab.status === 'active' ? 'bg-green-500' : 
                        collab.status === 'idle' ? 'bg-yellow-500' : 
                        'bg-gray-500'
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{collab.username}</span>
                      {isFollowing === collab.id && (
                        <Badge variant="secondary" className="text-xs">
                          Following
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {getActivityIcon(collab.activity)}
                      <span>{collab.activity}</span>
                      {collab.currentFile && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{collab.currentFile}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isFollowing === collab.id ? "secondary" : "ghost"}
                  className="h-7 px-2"
                  onClick={() => handleFollow(collab.id)}
                >
                  <MousePointer className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Floating Cursors (when visible on screen) */}
      {collaborators.map(collab => 
        collab.cursor && (
          <div
            key={`cursor-${collab.id}`}
            className="fixed pointer-events-none z-50 transition-all duration-300"
            style={{
              left: `${collab.cursor.x}%`,
              top: `${collab.cursor.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              <MousePointer 
                className="h-4 w-4" 
                style={{ color: collab.color }}
                fill={collab.color}
              />
              <div 
                className="absolute top-4 left-2 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
                style={{ backgroundColor: collab.color }}
              >
                {collab.username}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}