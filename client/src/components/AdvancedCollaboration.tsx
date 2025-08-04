import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Video, 
  Mic, 
  MicOff, 
  VideoOff,
  ScreenShare,
  MessageSquare,
  Settings,
  UserPlus,
  Crown,
  Eye,
  Edit,
  Clock,
  Activity,
  Headphones,
  Volume2,
  VolumeX,
  Phone,
  PhoneOff,
  Monitor,
  MousePointer,
  FileText,
  Zap
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Collaborator {
  userId: number;
  username: string;
  color: string;
  status: 'active' | 'idle' | 'away';
  activeFile?: string;
  cursor: {
    line: number;
    column: number;
  };
  lastActivity: string;
}

interface VoiceParticipant {
  userId: number;
  username: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
}

interface ScreenShare {
  userId: number;
  username: string;
  streamId: string;
  quality: 'low' | 'medium' | 'high';
}

interface CollaborationStats {
  activeUsers: number;
  totalSessions: number;
  voiceParticipants: number;
  screenShares: number;
  lastActivity: string;
}

export function AdvancedCollaboration() {
  const [selectedProject, setSelectedProject] = useState<number | null>(1);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    username: string;
    message: string;
    timestamp: string;
  }>>([]);

  // Mock real-time collaboration data
  const collaborators: Collaborator[] = [
    {
      userId: 1,
      username: 'alice_dev',
      color: '#FF6B6B',
      status: 'active',
      activeFile: 'src/App.tsx',
      cursor: { line: 42, column: 15 },
      lastActivity: new Date(Date.now() - 30000).toISOString()
    },
    {
      userId: 2,
      username: 'bob_designer',
      color: '#4ECDC4',
      status: 'active',
      activeFile: 'styles/main.css',
      cursor: { line: 128, column: 8 },
      lastActivity: new Date(Date.now() - 120000).toISOString()
    },
    {
      userId: 3,
      username: 'carol_pm',
      color: '#45B7D1',
      status: 'idle',
      activeFile: 'README.md',
      cursor: { line: 15, column: 0 },
      lastActivity: new Date(Date.now() - 300000).toISOString()
    }
  ];

  const voiceParticipants: VoiceParticipant[] = [
    {
      userId: 1,
      username: 'alice_dev',
      isMuted: false,
      isDeafened: false,
      isSpeaking: true
    },
    {
      userId: 2,
      username: 'bob_designer',
      isMuted: true,
      isDeafened: false,
      isSpeaking: false
    }
  ];

  const screenShares: ScreenShare[] = [
    {
      userId: 1,
      username: 'alice_dev',
      streamId: 'stream-123',
      quality: 'high'
    }
  ];

  const collaborationStats: CollaborationStats = {
    activeUsers: collaborators.filter(c => c.status === 'active').length,
    totalSessions: collaborators.length,
    voiceParticipants: voiceParticipants.length,
    screenShares: screenShares.length,
    lastActivity: new Date().toISOString()
  };

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Add random chat message
      if (Math.random() < 0.1) {
        const messages = [
          'Working on the login component',
          'Fixed the CSS bug in the header',
          'Ready for code review',
          'Let\'s discuss the API changes',
          'Great work on the UI updates!'
        ];
        const usernames = ['alice_dev', 'bob_designer', 'carol_pm'];
        
        setChatMessages(prev => [...prev, {
          id: `msg-${Date.now()}`,
          username: usernames[Math.floor(Math.random() * usernames.length)],
          message: messages[Math.floor(Math.random() * messages.length)],
          timestamp: new Date().toISOString()
        }].slice(-10)); // Keep only last 10 messages
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleJoinVoice = () => {
    setVoiceConnected(!voiceConnected);
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleToggleDeafen = () => {
    setIsDeafened(!isDeafened);
  };

  const handleToggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'away': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'idle': return 'Idle';
      case 'away': return 'Away';
      default: return 'Unknown';
    }
  };

  const formatLastActivity = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Advanced Collaboration</h1>
            <p className="text-muted-foreground">
              Real-time collaboration with up to 50 concurrent users, voice chat, and screen sharing
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-green-600 border-green-600">
            <Activity className="h-3 w-3 mr-1" />
            {collaborationStats.activeUsers} Active
          </Badge>
          <Button variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Users
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Collaborators</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collaborationStats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              of {collaborationStats.totalSessions} total sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voice Participants</CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collaborationStats.voiceParticipants}</div>
            <p className="text-xs text-muted-foreground">
              In voice channel
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Screen Shares</CardTitle>
            <ScreenShare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collaborationStats.screenShares}</div>
            <p className="text-xs text-muted-foreground">
              Active streams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Quality</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.5%</div>
            <p className="text-xs text-muted-foreground">
              Real-time sync accuracy
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Collaboration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Collaborators */}
          <Card>
            <CardHeader>
              <CardTitle>Active Collaborators</CardTitle>
              <CardDescription>
                Real-time presence and cursor tracking for all project contributors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.userId}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${collaborator.username}`} />
                          <AvatarFallback>{collaborator.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${getStatusColor(collaborator.status)}`}
                        />
                      </div>
                      <div>
                        <div className="font-medium flex items-center space-x-2">
                          <span>{collaborator.username}</span>
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: collaborator.color }}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {collaborator.activeFile ? `Editing ${collaborator.activeFile}` : 'Browsing project'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={`text-xs ${
                        collaborator.status === 'active' ? 'border-green-500 text-green-600' :
                        collaborator.status === 'idle' ? 'border-yellow-500 text-yellow-600' :
                        'border-gray-500 text-gray-600'
                      }`}>
                        {getStatusText(collaborator.status)}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatLastActivity(collaborator.lastActivity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Voice & Video */}
          <Card>
            <CardHeader>
              <CardTitle>Voice & Video Communication</CardTitle>
              <CardDescription>
                Crystal-clear voice chat and video conferencing for seamless collaboration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Voice Controls */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    voiceConnected ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {voiceConnected ? (
                      <Phone className="h-6 w-6 text-green-600" />
                    ) : (
                      <PhoneOff className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">
                      {voiceConnected ? 'Connected to Voice' : 'Join Voice Channel'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {voiceConnected ? `${voiceParticipants.length} participants` : 'Click to join voice chat'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {voiceConnected && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToggleMute}
                        className={isMuted ? 'text-red-600 border-red-600' : ''}
                      >
                        {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToggleDeafen}
                        className={isDeafened ? 'text-red-600 border-red-600' : ''}
                      >
                        {isDeafened ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                    </>
                  )}
                  <Button onClick={handleJoinVoice}>
                    {voiceConnected ? 'Disconnect' : 'Join Voice'}
                  </Button>
                </div>
              </div>

              {/* Voice Participants */}
              {voiceConnected && (
                <div className="space-y-2">
                  <Label>Voice Participants</Label>
                  <div className="space-y-2">
                    {voiceParticipants.map((participant) => (
                      <div
                        key={participant.userId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.username}`} />
                            <AvatarFallback>{participant.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{participant.username}</span>
                          {participant.isSpeaking && (
                            <div className="flex items-center space-x-1">
                              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                              <span className="text-xs text-green-600">Speaking</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {participant.isMuted && <MicOff className="h-4 w-4 text-red-500" />}
                          {participant.isDeafened && <VolumeX className="h-4 w-4 text-red-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Screen Share Controls */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    isScreenSharing ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Monitor className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {isScreenSharing ? 'Sharing Screen' : 'Screen Share'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isScreenSharing ? 'Your screen is visible to collaborators' : 'Share your screen with the team'}
                    </div>
                  </div>
                </div>
                <Button onClick={handleToggleScreenShare} variant={isScreenSharing ? 'destructive' : 'default'}>
                  <ScreenShare className="h-4 w-4 mr-2" />
                  {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                </Button>
              </div>

              {/* Active Screen Shares */}
              {screenShares.length > 0 && (
                <div className="space-y-2">
                  <Label>Active Screen Shares</Label>
                  <div className="space-y-2">
                    {screenShares.map((share) => (
                      <div
                        key={share.streamId}
                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Monitor className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="text-sm font-medium">{share.username}'s screen</div>
                            <div className="text-xs text-muted-foreground">
                              Quality: {share.quality} • Stream ID: {share.streamId}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Live Chat */}
          <Card>
            <CardHeader>
              <CardTitle>Live Chat</CardTitle>
              <CardDescription>
                Real-time messaging with collaborators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Chat Messages */}
              <div className="h-64 overflow-y-auto space-y-2 p-2 bg-gray-50 rounded-lg">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No messages yet</p>
                    <p>Start a conversation!</p>
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div key={message.id} className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium">{message.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm bg-white p-2 rounded border">
                        {message.message}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input */}
              <div className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      setChatMessages(prev => [...prev, {
                        id: `msg-${Date.now()}`,
                        username: 'You',
                        message: e.currentTarget.value,
                        timestamp: new Date().toISOString()
                      }]);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button size="sm">Send</Button>
              </div>
            </CardContent>
          </Card>

          {/* Collaboration Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Collaboration Settings</CardTitle>
              <CardDescription>
                Configure permissions and collaboration rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Max Concurrent Users</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Progress value={collaborationStats.activeUsers / 50 * 100} className="flex-1" />
                  <span className="text-sm text-muted-foreground">
                    {collaborationStats.activeUsers}/50
                  </span>
                </div>
              </div>

              <div>
                <Label>Voice Quality</Label>
                <Select defaultValue="high">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (32kbps)</SelectItem>
                    <SelectItem value="medium">Medium (64kbps)</SelectItem>
                    <SelectItem value="high">High (128kbps)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Screen Share Quality</Label>
                <Select defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (720p)</SelectItem>
                    <SelectItem value="medium">Medium (1080p)</SelectItem>
                    <SelectItem value="high">High (1440p)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 space-y-2">
                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Advanced Settings
                </Button>
                <Button variant="outline" className="w-full">
                  <Crown className="h-4 w-4 mr-2" />
                  Manage Permissions
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}