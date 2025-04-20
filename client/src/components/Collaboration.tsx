import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  MessageSquare,
  Send,
  Settings,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  BellOff,
} from 'lucide-react';
import { User } from '@shared/schema';
import { getInitials, getRandomColor } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

// Types for collaboration
export type CollaboratorInfo = {
  userId: number;
  username: string;
  color: string;
  position?: {
    lineNumber: number;
    column: number;
  };
  lastActivity?: Date;
};

export type ChatMessage = {
  userId: number;
  username: string;
  content: string;
  timestamp: number;
  isSystem?: boolean;
};

interface CollaborationProps {
  projectId: number;
  fileId: number | null;
  currentUser: User;
  onToggle?: () => void;
  isCollapsed?: boolean;
}

const Collaboration: React.FC<CollaborationProps> = ({
  projectId,
  fileId,
  currentUser,
  onToggle,
  isCollapsed = false,
}) => {
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'chat'>('users');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Colors
  const userColor = useRef(getRandomColor());

  // Effect for scrolling chat to bottom
  useEffect(() => {
    if (messagesEndRef.current && activeTab === 'chat') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Setup WebSocket connection
  useEffect(() => {
    if (!projectId || !currentUser) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Connected to collaboration server');
      // Send join message once connected
      const joinMessage = {
        type: 'user_joined',
        projectId,
        fileId,
        userId: currentUser.id,
        username: currentUser.username || currentUser.displayName || 'Anonymous',
        timestamp: Date.now(),
        data: {
          color: userColor.current,
        },
      };
      socket.send(JSON.stringify(joinMessage));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received collaboration message:', data);

      // Handle different message types
      switch (data.type) {
        case 'user_joined':
          handleUserJoined(data);
          break;
        case 'user_left':
          handleUserLeft(data);
          break;
        case 'cursor_move':
          handleCursorMove(data);
          break;
        case 'chat_message':
          handleChatMessage(data);
          break;
        case 'current_collaborators':
          handleCurrentCollaborators(data);
          break;
        case 'ping':
          socket.send(JSON.stringify({ type: 'pong' }));
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to collaboration server',
        variant: 'destructive',
      });
    };

    socket.onclose = () => {
      console.log('Disconnected from collaboration server');
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [projectId, fileId, currentUser, toast]);

  // Handle user joined
  const handleUserJoined = useCallback((data: any) => {
    // Don't add yourself
    if (data.userId === currentUser.id) return;

    setCollaborators((prev) => {
      // Check if user already exists
      if (prev.some((c) => c.userId === data.userId)) {
        return prev;
      }
      return [
        ...prev,
        {
          userId: data.userId,
          username: data.username,
          color: data.data.color,
        },
      ];
    });

    // Add system message
    setMessages((prev) => [
      ...prev,
      {
        userId: data.userId,
        username: data.username,
        content: `${data.username} joined the project`,
        timestamp: data.timestamp,
        isSystem: true,
      },
    ]);

    // Show notification if enabled
    if (notificationsEnabled && activeTab !== 'chat') {
      setUnreadCount((prev) => prev + 1);
      toast({
        title: 'User Joined',
        description: `${data.username} joined the project`,
      });
    }
  }, [currentUser.id, notificationsEnabled, activeTab, toast]);

  // Handle user left
  const handleUserLeft = useCallback((data: any) => {
    setCollaborators((prev) => prev.filter((c) => c.userId !== data.userId));

    // Add system message
    setMessages((prev) => [
      ...prev,
      {
        userId: data.userId,
        username: data.username,
        content: `${data.username} left the project`,
        timestamp: data.timestamp,
        isSystem: true,
      },
    ]);

    // Show notification if enabled
    if (notificationsEnabled && activeTab !== 'chat') {
      setUnreadCount((prev) => prev + 1);
    }
  }, [notificationsEnabled, activeTab]);

  // Handle cursor move
  const handleCursorMove = useCallback((data: any) => {
    setCollaborators((prev) => {
      return prev.map((c) => {
        if (c.userId === data.userId) {
          return {
            ...c,
            position: data.data.position,
            lastActivity: new Date(),
          };
        }
        return c;
      });
    });
  }, []);

  // Handle chat message
  const handleChatMessage = useCallback((data: any) => {
    setMessages((prev) => [
      ...prev,
      {
        userId: data.userId,
        username: data.username,
        content: data.data.message,
        timestamp: data.data.timestamp,
      },
    ]);

    // Show notification if enabled and not on chat tab
    if (notificationsEnabled && activeTab !== 'chat') {
      setUnreadCount((prev) => prev + 1);
      toast({
        title: `Message from ${data.username}`,
        description: data.data.message.substring(0, 50) + (data.data.message.length > 50 ? '...' : ''),
      });
    }
  }, [notificationsEnabled, activeTab, toast]);

  // Handle list of current collaborators
  const handleCurrentCollaborators = useCallback((data: any) => {
    if (data.data?.collaborators) {
      setCollaborators(data.data.collaborators);
    }
  }, []);

  // Send chat message
  const sendMessage = useCallback(() => {
    if (!socketRef.current || !newMessage.trim()) return;

    const message = {
      type: 'chat_message',
      projectId,
      fileId,
      userId: currentUser.id,
      username: currentUser.username || currentUser.displayName || 'Anonymous',
      timestamp: Date.now(),
      data: {
        message: newMessage,
        timestamp: Date.now(),
      },
    };

    socketRef.current.send(JSON.stringify(message));

    // Add to local messages
    setMessages((prev) => [
      ...prev,
      {
        userId: currentUser.id,
        username: currentUser.username || currentUser.displayName || 'Anonymous',
        content: newMessage,
        timestamp: Date.now(),
      },
    ]);

    setNewMessage('');
    inputRef.current?.focus();
  }, [projectId, fileId, currentUser, newMessage]);

  // Handle tab change
  const handleTabChange = (tab: 'users' | 'chat') => {
    setActiveTab(tab);
    if (tab === 'chat') {
      setUnreadCount(0);
    }
  };

  // Toggle notifications
  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  if (isCollapsed) {
    return (
      <Button
        variant="ghost" 
        className="fixed bottom-4 right-4 p-2 rounded-full shadow-md"
        onClick={onToggle}
      >
        <PanelLeftOpen className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Card className="w-full h-full flex flex-col border-l rounded-none">
      <CardHeader className="px-2 py-2 border-b flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-sm font-medium">Collaboration</CardTitle>
          {unreadCount > 0 && activeTab !== 'chat' && (
            <Badge className="bg-primary text-xs">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-7 w-7 ${activeTab === 'users' ? 'bg-muted' : ''}`}
            onClick={() => handleTabChange('users')}
          >
            <Users className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-7 w-7 relative ${activeTab === 'chat' ? 'bg-muted' : ''}`}
            onClick={() => handleTabChange('chat')}
          >
            <MessageSquare className="h-4 w-4" />
            {unreadCount > 0 && activeTab !== 'chat' && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Collaboration Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleNotifications}>
                {notificationsEnabled ? (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    <span>Disable Notifications</span>
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    <span>Enable Notifications</span>
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggle}>
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        {activeTab === 'users' && (
          <div className="h-full p-2 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground mb-2">
              {collaborators.length} Online Collaborator{collaborators.length !== 1 ? 's' : ''}
            </h3>
            <ScrollArea className="h-[calc(100%-2rem)] pr-2">
              <div className="space-y-2">
                {/* Current user */}
                <div className="flex items-center space-x-2 p-2 rounded-md bg-muted/40">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback style={{ backgroundColor: userColor.current }}>
                      {getInitials(currentUser.username || currentUser.displayName || 'A')}
                    </AvatarFallback>
                    {currentUser.avatarUrl && <AvatarImage src={currentUser.avatarUrl} />}
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{currentUser.username || currentUser.displayName || 'Anonymous'}</p>
                    <p className="text-xs text-muted-foreground">You</p>
                  </div>
                </div>

                {/* Other collaborators */}
                {collaborators.map((collaborator) => (
                  <div key={collaborator.userId} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/40">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback style={{ backgroundColor: collaborator.color }}>
                              {getInitials(collaborator.username)}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{collaborator.username}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{collaborator.username}</p>
                      {collaborator.position && (
                        <p className="text-xs text-muted-foreground">
                          Line {collaborator.position.lineNumber}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {collaborators.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No other collaborators right now
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        msg.isSystem ? 'justify-center' : msg.userId === currentUser.id ? 'justify-end' : 'justify-start'
                      } mb-2`}
                    >
                      {msg.isSystem ? (
                        <div className="text-xs text-center py-1 px-2 bg-muted rounded-md text-muted-foreground">
                          {msg.content}
                        </div>
                      ) : msg.userId === currentUser.id ? (
                        <div className="max-w-[70%]">
                          <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg rounded-br-none">
                            <p className="text-sm">{msg.content}</p>
                          </div>
                          <div className="text-xs text-right mt-1 text-muted-foreground">
                            {formatTime(msg.timestamp)}
                          </div>
                        </div>
                      ) : (
                        <div className="flex max-w-[70%]">
                          <Avatar className="h-8 w-8 mr-2 mt-1">
                            <AvatarFallback style={{ backgroundColor: collaborators.find(c => c.userId === msg.userId)?.color || 'gray' }}>
                              {getInitials(msg.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="bg-muted px-3 py-2 rounded-lg rounded-bl-none">
                              <p className="text-xs font-medium mb-1">{msg.username}</p>
                              <p className="text-sm">{msg.content}</p>
                            </div>
                            <div className="text-xs mt-1 text-muted-foreground">
                              {formatTime(msg.timestamp)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-2 border-t">
              <div className="flex items-center">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  ref={inputRef}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  className="ml-2"
                  disabled={!newMessage.trim()}
                  onClick={sendMessage}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Collaboration;