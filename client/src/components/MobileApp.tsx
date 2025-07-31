import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Smartphone, 
  Tablet, 
  Download, 
  Apple,
  Play,
  QrCode,
  Bell,
  Wifi,
  WifiOff,
  Battery,
  Cpu,
  HardDrive,
  RefreshCw,
  Check
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MobileDevice {
  id: string;
  name: string;
  type: 'ios' | 'android';
  model: string;
  osVersion: string;
  appVersion: string;
  lastSync: Date;
  isOnline: boolean;
  batteryLevel: number;
  storageUsed: number;
  storageTotal: number;
  pushToken?: string;
}

interface MobileSession {
  id: string;
  deviceId: string;
  projectId: number;
  projectName: string;
  startedAt: Date;
  lastActiveAt: Date;
  status: 'active' | 'background' | 'terminated';
  codeChanges: number;
  timeSpent: number; // minutes
}

interface OfflineSync {
  id: string;
  deviceId: string;
  type: 'project' | 'file' | 'settings';
  action: 'create' | 'update' | 'delete';
  data: any;
  createdAt: Date;
  syncedAt?: Date;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

interface MobileNotification {
  id: string;
  title: string;
  body: string;
  type: 'build' | 'collaboration' | 'comment' | 'deploy';
  projectId?: number;
  sentAt: Date;
  readAt?: Date;
}

interface MobileAppProps {
  userId?: number;
}

export function MobileApp({ userId }: MobileAppProps) {
  const queryClient = useQueryClient();
  const [selectedDevice, setSelectedDevice] = useState<MobileDevice | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  // Fetch devices
  const { data: devices = [] } = useQuery<MobileDevice[]>({
    queryKey: userId ? [`/api/mobile/devices?userId=${userId}`] : ['/api/mobile/devices']
  });

  // Fetch sessions
  const { data: sessions = [] } = useQuery<MobileSession[]>({
    queryKey: userId ? [`/api/mobile/sessions?userId=${userId}`] : ['/api/mobile/sessions']
  });

  // Fetch offline syncs
  const { data: offlineSyncs = [] } = useQuery<OfflineSync[]>({
    queryKey: ['/api/mobile/offline-syncs']
  });

  // Fetch notifications
  const { data: notifications = [] } = useQuery<MobileNotification[]>({
    queryKey: userId ? [`/api/mobile/notifications?userId=${userId}`] : ['/api/mobile/notifications']
  });

  // Send push notification
  const sendNotificationMutation = useMutation({
    mutationFn: (data: { deviceId: string; title: string; body: string }) =>
      apiRequest('/api/mobile/notifications', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({
        title: "Notification sent",
        description: "Push notification delivered to device"
      });
    }
  });

  // Force sync
  const forceSyncMutation = useMutation({
    mutationFn: (deviceId: string) =>
      apiRequest(`/api/mobile/devices/${deviceId}/sync`, {
        method: 'POST'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/devices'] });
      toast({
        title: "Sync started",
        description: "Device synchronization in progress"
      });
    }
  });

  // Remove device
  const removeDeviceMutation = useMutation({
    mutationFn: (deviceId: string) =>
      apiRequest(`/api/mobile/devices/${deviceId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/devices'] });
      setSelectedDevice(null);
      toast({
        title: "Device removed",
        description: "Mobile device has been unlinked"
      });
    }
  });

  const getDeviceIcon = (type: MobileDevice['type']) => {
    return type === 'ios' ? <Apple className="h-5 w-5" /> : <Play className="h-5 w-5" />;
  };

  const formatLastSync = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mobile App</h2>
          <p className="text-muted-foreground">
            Manage your mobile devices and sync settings
          </p>
        </div>
        <Button onClick={() => setShowQRCode(true)}>
          <QrCode className="h-4 w-4 mr-2" />
          Link New Device
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Connected Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
            <p className="text-xs text-muted-foreground">
              {devices.filter(d => d.isOnline).length} online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter(s => s.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all devices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Syncs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offlineSyncs.filter(s => s.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Waiting to sync
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter(n => !n.readAt).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Unread messages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Device List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map(device => (
          <Card 
            key={device.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg",
              selectedDevice?.id === device.id && "ring-2 ring-primary"
            )}
            onClick={() => setSelectedDevice(device)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {device.type === 'ios' ? (
                    <Smartphone className="h-5 w-5" />
                  ) : (
                    <Tablet className="h-5 w-5" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                    <CardDescription>{device.model}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {device.isOnline ? (
                    <Wifi className="h-4 w-4 text-green-600" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-gray-400" />
                  )}
                  {getDeviceIcon(device.type)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Sync</span>
                  <span>{formatLastSync(device.lastSync)}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Battery className="h-3 w-3" />
                      Battery
                    </span>
                    <span>{device.batteryLevel}%</span>
                  </div>
                  <Progress value={device.batteryLevel} className="h-1.5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      Storage
                    </span>
                    <span>{device.storageUsed.toFixed(1)} / {device.storageTotal} GB</span>
                  </div>
                  <Progress 
                    value={(device.storageUsed / device.storageTotal) * 100} 
                    className="h-1.5"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">App Version</span>
                  <Badge variant="secondary">{device.appVersion}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Device Details */}
      {selectedDevice && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Device Details</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedDevice(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="info">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="sync">Sync</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Device Name</Label>
                    <Input value={selectedDevice.name} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input value={selectedDevice.model} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>OS Version</Label>
                    <Input value={`${selectedDevice.type === 'ios' ? 'iOS' : 'Android'} ${selectedDevice.osVersion}`} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>App Version</Label>
                    <Input value={selectedDevice.appVersion} readOnly />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Quick Actions</h4>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => forceSyncMutation.mutate(selectedDevice.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Force Sync
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        sendNotificationMutation.mutate({
                          deviceId: selectedDevice.id,
                          title: 'Test Notification',
                          body: 'This is a test push notification'
                        });
                      }}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Test Push
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600"
                      onClick={() => removeDeviceMutation.mutate(selectedDevice.id)}
                    >
                      Remove Device
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sessions" className="space-y-4">
                <div className="space-y-3">
                  {sessions
                    .filter(s => s.deviceId === selectedDevice.id)
                    .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime())
                    .map(session => (
                      <Card key={session.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{session.projectName}</p>
                              <p className="text-sm text-muted-foreground">
                                Started {new Date(session.startedAt).toLocaleString()}
                              </p>
                            </div>
                            <Badge variant={
                              session.status === 'active' ? 'default' : 
                              session.status === 'background' ? 'secondary' : 
                              'outline'
                            }>
                              {session.status}
                            </Badge>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Time Spent</p>
                              <p className="font-medium">{session.timeSpent}m</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Changes</p>
                              <p className="font-medium">{session.codeChanges}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Last Active</p>
                              <p className="font-medium">
                                {formatLastSync(new Date(session.lastActiveAt))}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="sync" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Offline Changes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {offlineSyncs
                        .filter(sync => sync.deviceId === selectedDevice.id)
                        .map(sync => (
                          <div key={sync.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-3">
                              <Badge variant={
                                sync.status === 'completed' ? 'default' :
                                sync.status === 'syncing' ? 'secondary' :
                                sync.status === 'failed' ? 'destructive' :
                                'outline'
                              }>
                                {sync.status}
                              </Badge>
                              <div>
                                <p className="text-sm font-medium">
                                  {sync.type} {sync.action}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(sync.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {sync.status === 'completed' && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-sync">Auto Sync</Label>
                    <Switch id="auto-sync" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="offline-mode">Offline Mode</Label>
                    <Switch id="offline-mode" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-notifications">Push Notifications</Label>
                    <Switch id="push-notifications" defaultChecked={!!selectedDevice.pushToken} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="background-sync">Background Sync</Label>
                    <Switch id="background-sync" defaultChecked />
                  </div>

                  <div className="space-y-2">
                    <Label>Sync Frequency</Label>
                    <Select defaultValue="15">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">Every 5 minutes</SelectItem>
                        <SelectItem value="15">Every 15 minutes</SelectItem>
                        <SelectItem value="30">Every 30 minutes</SelectItem>
                        <SelectItem value="60">Every hour</SelectItem>
                        <SelectItem value="manual">Manual only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* QR Code Dialog */}
      {showQRCode && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <CardContent className="bg-background p-6 rounded-lg max-w-md">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Link New Device</h3>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowQRCode(false)}
                >
                  ×
                </Button>
              </div>
              
              <div className="bg-white p-8 rounded-lg">
                <div className="w-48 h-48 mx-auto bg-gray-200 flex items-center justify-center">
                  <QrCode className="h-32 w-32 text-gray-600" />
                </div>
              </div>
              
              <div className="space-y-2 text-center">
                <p className="text-sm text-muted-foreground">
                  Scan this QR code with the E-Code mobile app
                </p>
                <p className="text-xs text-muted-foreground">
                  Or use code: <code className="bg-muted px-2 py-1 rounded">ABCD-1234-EFGH</code>
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm">
                  <Apple className="h-4 w-4 mr-2" />
                  Download for iOS
                </Button>
                <Button variant="outline" size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  Download for Android
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}