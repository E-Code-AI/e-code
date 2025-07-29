import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  UserPlus,
  Circle,
  Eye,
  Edit,
  MessageSquare,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Share2,
  Copy,
  Check,
  MousePointer,
  Activity,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CollaboratorStatus {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  status: 'active' | 'idle' | 'offline';
  cursor?: { x: number; y: number; file?: string };
  currentFile?: string;
  lastActivity?: Date;
  isFollowing?: boolean;
  isSpeaking?: boolean;
  hasVideo?: boolean;
}

interface CollaborationPanelProps {
  projectId: number;
  currentUser?: any;
  onFollowUser?: (userId: string) => void;
  onStartCall?: () => void;
  className?: string;
}

export function CollaborationPanel({
  projectId,
  currentUser,
  onFollowUser,
  onStartCall,
  className,
}: CollaborationPanelProps) {
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<CollaboratorStatus[]>([]);
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Simulate collaborators for demo
  useEffect(() => {
    const demoCollaborators: CollaboratorStatus[] = [
      {
        id: '1',
        name: 'Alice Chen',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
        color: '#FF6B6B',
        status: 'active',
        currentFile: 'src/App.tsx',
        cursor: { x: 450, y: 320, file: 'src/App.tsx' },
        lastActivity: new Date(),
      },
      {
        id: '2',
        name: 'Bob Smith',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
        color: '#4ECDC4',
        status: 'active',
        currentFile: 'src/components/Header.tsx',
        cursor: { x: 200, y: 150, file: 'src/components/Header.tsx' },
        lastActivity: new Date(Date.now() - 60000),
      },
      {
        id: '3',
        name: 'Carol Davis',
        color: '#FFE66D',
        status: 'idle',
        currentFile: 'README.md',
        lastActivity: new Date(Date.now() - 300000),
      },
    ];
    setCollaborators(demoCollaborators);

    // Generate share link
    setShareLink(`https://e-code.app/join/${projectId}?token=${Math.random().toString(36).substr(2, 9)}`);
  }, [projectId]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    toast({
      title: "Link copied!",
      description: "Share this link to invite collaborators",
    });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleFollowUser = (userId: string) => {
    const user = collaborators.find(c => c.id === userId);
    if (user) {
      toast({
        title: `Following ${user.name}`,
        description: `You're now following ${user.name}'s cursor`,
      });
      onFollowUser?.(userId);
    }
  };

  const toggleCall = () => {
    if (!isInCall) {
      setIsInCall(true);
      toast({
        title: "Call started",
        description: "Voice & video call is now active",
      });
      onStartCall?.();
    } else {
      setIsInCall(false);
      toast({
        title: "Call ended",
        description: "You've left the call",
      });
    }
  };

  const getStatusColor = (status: CollaboratorStatus['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-500';
      case 'idle':
        return 'text-yellow-500';
      case 'offline':
        return 'text-gray-400';
    }
  };

  const getActivityText = (lastActivity?: Date) => {
    if (!lastActivity) return 'Never';
    const diff = Date.now() - lastActivity.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Collaboration
            <Badge variant="secondary" className="ml-1">
              {collaborators.filter(c => c.status !== 'offline').length} active
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            {isInCall && (
              <>
                <Button
                  size="icon"
                  variant={isMuted ? "destructive" : "ghost"}
                  className="h-8 w-8"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  size="icon"
                  variant={!isVideoOn ? "destructive" : "ghost"}
                  className="h-8 w-8"
                  onClick={() => setIsVideoOn(!isVideoOn)}
                >
                  {isVideoOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                </Button>
              </>
            )}
            <Button
              size="icon"
              variant={isInCall ? "destructive" : "ghost"}
              className="h-8 w-8"
              onClick={toggleCall}
            >
              <Video className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100%-8rem)]">
          <div className="p-4 space-y-3">
            {/* Share Link */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Share2 className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 bg-transparent text-xs text-muted-foreground outline-none"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={copyShareLink}
              >
                {linkCopied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            <Separator />

            {/* Active Collaborators */}
            <div className="space-y-2">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={collaborator.avatar} />
                        <AvatarFallback style={{ backgroundColor: collaborator.color }}>
                          {collaborator.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <Circle
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-current",
                          getStatusColor(collaborator.status)
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {collaborator.name}
                        </p>
                        {collaborator.isFollowing && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            Following
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {collaborator.currentFile && (
                          <>
                            <Edit className="h-3 w-3" />
                            <span className="truncate">{collaborator.currentFile}</span>
                          </>
                        )}
                        <span className="text-xs">• {getActivityText(collaborator.lastActivity)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {collaborator.status === 'active' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleFollowUser(collaborator.id)}
                      >
                        <MousePointer className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isInCall && (
                      <div className="flex items-center gap-1">
                        {collaborator.isSpeaking && (
                          <Activity className="h-3.5 w-3.5 text-green-500" />
                        )}
                        {collaborator.hasVideo && (
                          <Video className="h-3.5 w-3.5 text-blue-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Invite Button */}
            <Button
              variant="outline"
              className="w-full"
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Collaborator
            </Button>
          </div>
        </ScrollArea>

        {/* Call Controls */}
        {isInCall && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                In call with {collaborators.filter(c => c.status === 'active').length} people
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={toggleCall}
              >
                End Call
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}