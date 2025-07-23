import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Users, UserPlus, MessageSquare, Video, Phone, Share2, Eye, Edit3, MousePointer } from 'lucide-react';
import { useCollaboration } from '@/hooks/use-collaboration';
import { useAuth } from '@/hooks/use-auth';

interface Collaborator {
  id: string;
  username: string;
  avatarUrl?: string;
  color: string;
  cursor?: { x: number; y: number; file?: string };
  status: 'online' | 'idle' | 'offline';
  lastSeen?: Date;
}

export function CollaborationPanel({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const { 
    collaborators, 
    activeUsers, 
    sendMessage, 
    awareness,
    isConnected 
  } = useCollaboration(projectId);
  
  const [message, setMessage] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };

  const handleInvite = () => {
    // TODO: Implement invite functionality
    console.log('Inviting:', inviteEmail);
    setInviteEmail('');
    setShowInvite(false);
  };

  const getInitials = (username: string) => {
    return username.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatLastSeen = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Collaboration</CardTitle>
              <CardDescription>
                {isConnected ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    {activeUsers.length} active
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-gray-400 rounded-full" />
                    Offline
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowInvite(!showInvite)}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Invite
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0">
          <Tabs defaultValue="active" className="h-full">
            <TabsList className="w-full justify-start rounded-none border-b">
              <TabsTrigger value="active">Active Now</TabsTrigger>
              <TabsTrigger value="all">All Members</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="p-4">
              <div className="space-y-3">
                {activeUsers.map((collab) => (
                  <div key={collab.id} className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={collab.avatarUrl} />
                        <AvatarFallback style={{ backgroundColor: collab.color }}>
                          {getInitials(collab.username)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{collab.username}</p>
                      {collab.cursor?.file && (
                        <p className="text-xs text-muted-foreground">
                          Editing: {collab.cursor.file}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <MousePointer className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {activeUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No one else is currently active
                  </p>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="all" className="p-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {collaborators.map((collab) => (
                    <div key={collab.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={collab.avatarUrl} />
                        <AvatarFallback style={{ backgroundColor: collab.color }}>
                          {getInitials(collab.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{collab.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {collab.status === 'online' ? 'Online' : `Last seen ${formatLastSeen(collab.lastSeen)}`}
                        </p>
                      </div>
                      <Badge variant={collab.status === 'online' ? 'default' : 'secondary'}>
                        {collab.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="chat" className="flex flex-col h-full p-0">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <div className="text-center text-sm text-muted-foreground">
                    Chat feature coming soon
                  </div>
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled
                  />
                  <Button size="icon" onClick={handleSendMessage} disabled>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Invite Dialog */}
      {showInvite && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite Collaborator</CardTitle>
              <CardDescription>
                Send an invitation to collaborate on this project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Email address"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowInvite(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite}>
                  Send Invite
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}