import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Smartphone, 
  Code2, 
  PlayCircle, 
  FolderOpen, 
  Download, 
  Upload,
  Cpu,
  MemoryStick,
  Wifi,
  Battery,
  Shield,
  RefreshCw,
  Terminal,
  FileCode,
  Activity,
  Settings,
  QrCode,
  Check,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MobileDevice {
  id: string;
  platform: 'ios' | 'android';
  appVersion: string;
  osVersion: string;
  deviceModel: string;
  lastActive: string;
  isActive: boolean;
  pushToken?: string;
}

interface MobileProject {
  id: number;
  name: string;
  slug: string;
  language: string;
  lastOpened?: string;
  isPublic: boolean;
  canRun: boolean;
  fileCount: number;
  description?: string;
}

interface MobileFile {
  id: number;
  name: string;
  isFolder: boolean;
  size: number;
  language: string;
  lastModified: string;
  content?: string;
  canEdit: boolean;
}

interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
  memoryUsed?: number;
  exitCode?: number;
}

export default function MobilePage() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<MobileProject | null>(null);
  const [selectedFile, setSelectedFile] = useState<MobileFile | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showFileEditor, setShowFileEditor] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  // Fetch mobile devices
  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['/api/mobile/devices'],
    queryFn: () => apiRequest('GET', '/api/mobile/devices').then(res => res.json())
  });

  // Fetch mobile projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/mobile/projects'],
    queryFn: () => apiRequest('GET', '/api/mobile/projects').then(res => res.json())
  });

  // Fetch project details
  const { data: projectDetails, isLoading: detailsLoading } = useQuery({
    queryKey: selectedProject ? [`/api/mobile/projects/${selectedProject.id}`] : null,
    queryFn: () => selectedProject 
      ? apiRequest('GET', `/api/mobile/projects/${selectedProject.id}`).then(res => res.json())
      : null,
    enabled: !!selectedProject
  });

  // Run project mutation
  const runProjectMutation = useMutation({
    mutationFn: async ({ projectId, input }: { projectId: number; input?: string }) => {
      const response = await apiRequest('POST', `/api/mobile/projects/${projectId}/run`, { input });
      if (!response.ok) throw new Error('Failed to run project');
      return response.json();
    },
    onSuccess: (data: ExecutionResult) => {
      if (data.success) {
        toast({
          title: "Execution Complete",
          description: `Finished in ${data.executionTime}ms`,
        });
      } else {
        toast({
          title: "Execution Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive"
        });
      }
    }
  });

  // Update file mutation
  const updateFileMutation = useMutation({
    mutationFn: async ({ projectId, fileName, content }: { projectId: number; fileName: string; content: string }) => {
      const response = await apiRequest('PUT', `/api/mobile/projects/${projectId}/files/${fileName}`, { content });
      if (!response.ok) throw new Error('Failed to update file');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "File Updated",
        description: "Changes saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/mobile/projects/${selectedProject?.id}`] });
      setShowFileEditor(false);
    }
  });

  // Sync project mutation
  const syncProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest('POST', `/api/mobile/projects/${projectId}/sync`);
      if (!response.ok) throw new Error('Failed to sync project');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sync Complete",
        description: "Project synchronized successfully",
      });
    }
  });

  const handleRunProject = () => {
    if (!selectedProject) return;
    setIsRunning(true);
    runProjectMutation.mutate(
      { projectId: selectedProject.id },
      {
        onSettled: () => setIsRunning(false)
      }
    );
  };

  const handleEditFile = (file: MobileFile) => {
    if (!file.canEdit) {
      toast({
        title: "Cannot Edit",
        description: "This file type cannot be edited on mobile",
        variant: "destructive"
      });
      return;
    }
    setSelectedFile(file);
    setEditedContent(file.content || '');
    setShowFileEditor(true);
  };

  const handleSaveFile = () => {
    if (!selectedProject || !selectedFile) return;
    updateFileMutation.mutate({
      projectId: selectedProject.id,
      fileName: selectedFile.name,
      content: editedContent
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Smartphone className="h-8 w-8" />
            Mobile Development
          </h1>
          <p className="text-muted-foreground mt-1">
            Build, test, and deploy mobile apps from anywhere
          </p>
        </div>
        <Button onClick={() => setShowQRCode(true)} variant="outline">
          <QrCode className="mr-2 h-4 w-4" />
          Get Mobile App
        </Button>
      </div>

      {/* Connected Devices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Connected Devices
          </CardTitle>
          <CardDescription>
            Your mobile devices connected to E-Code
          </CardDescription>
        </CardHeader>
        <CardContent>
          {devicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : devicesData?.devices?.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {devicesData.devices.map((device: MobileDevice) => (
                <Card key={device.id} className={device.isActive ? 'border-green-500' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Smartphone className={`h-4 w-4 ${device.platform === 'ios' ? 'text-gray-600' : 'text-green-600'}`} />
                          <span className="font-medium">{device.deviceModel}</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant={device.platform === 'ios' ? 'default' : 'secondary'}>
                              {device.platform.toUpperCase()}
                            </Badge>
                            <span className="text-muted-foreground">{device.osVersion}</span>
                          </div>
                          <div className="text-muted-foreground">
                            App v{device.appVersion}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={device.isActive ? 'default' : 'outline'}>
                          {device.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Battery className={`h-4 w-4 ${device.isActive ? 'text-green-500' : 'text-gray-400'}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No devices connected</p>
              <p className="text-sm mt-2">Install the E-Code mobile app to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Projects */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Projects List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Mobile Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {projectsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectsData?.projects?.map((project: MobileProject) => (
                    <Card 
                      key={project.id}
                      className={`cursor-pointer transition-colors ${
                        selectedProject?.id === project.id ? 'border-primary' : ''
                      }`}
                      onClick={() => setSelectedProject(project)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium">{project.name}</h4>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="outline">{project.language}</Badge>
                              {project.canRun && (
                                <Badge variant="secondary">
                                  <PlayCircle className="h-3 w-3 mr-1" />
                                  Mobile Ready
                                </Badge>
                              )}
                            </div>
                          </div>
                          <FileCode className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {project.description && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {project.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Project Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedProject ? selectedProject.name : 'Select a Project'}
            </CardTitle>
            {selectedProject && (
              <CardDescription>
                {selectedProject.description || 'Mobile-optimized project'}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {selectedProject && projectDetails ? (
              <Tabs defaultValue="files" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="run">Run</TabsTrigger>
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="files" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Project Files</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncProjectMutation.mutate(selectedProject.id)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Sync
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px] rounded-md border p-4">
                    <div className="space-y-2">
                      {projectDetails.files?.map((file: MobileFile) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
                          onClick={() => !file.isFolder && handleEditFile(file)}
                        >
                          <div className="flex items-center gap-2">
                            {file.isFolder ? (
                              <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FileCode className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{(file.size / 1024).toFixed(1)} KB</span>
                            {file.canEdit && <Settings className="h-3 w-3" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="run" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Mobile Execution</h3>
                      <Badge variant={selectedProject.canRun ? 'default' : 'secondary'}>
                        {selectedProject.canRun ? 'Supported' : 'Not Supported'}
                      </Badge>
                    </div>
                    
                    {selectedProject.canRun ? (
                      <>
                        <div className="space-y-2">
                          <Label>Input (optional)</Label>
                          <Textarea 
                            placeholder="Enter input for your program..."
                            className="min-h-[100px]"
                          />
                        </div>

                        <Button 
                          onClick={handleRunProject}
                          disabled={isRunning}
                          className="w-full"
                        >
                          {isRunning ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Running...
                            </>
                          ) : (
                            <>
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Run on Mobile
                            </>
                          )}
                        </Button>

                        {runProjectMutation.data && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm">Execution Result</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {runProjectMutation.data.output && (
                                  <div>
                                    <Label>Output</Label>
                                    <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                                      {runProjectMutation.data.output}
                                    </pre>
                                  </div>
                                )}
                                {runProjectMutation.data.error && (
                                  <div>
                                    <Label className="text-destructive">Error</Label>
                                    <pre className="bg-destructive/10 p-2 rounded text-xs overflow-x-auto text-destructive">
                                      {runProjectMutation.data.error}
                                    </pre>
                                  </div>
                                )}
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <span>Time: {runProjectMutation.data.executionTime}ms</span>
                                  <span>Memory: {(runProjectMutation.data.memoryUsed! / 1024 / 1024).toFixed(2)}MB</span>
                                  <span>Exit Code: {runProjectMutation.data.exitCode}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>This language is not supported on mobile devices</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="stats" className="space-y-4">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Files</p>
                              <p className="text-2xl font-bold">{projectDetails.stats?.totalFiles || 0}</p>
                            </div>
                            <FileCode className="h-8 w-8 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Lines</p>
                              <p className="text-2xl font-bold">{projectDetails.stats?.totalLines || 0}</p>
                            </div>
                            <Code2 className="h-8 w-8 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Languages Used</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {projectDetails.stats?.languages?.map((lang: string) => (
                            <Badge key={lang} variant="secondary">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Mobile Performance</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>CPU Usage</span>
                            <span>12%</span>
                          </div>
                          <Progress value={12} className="h-2" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>Memory Usage</span>
                            <span>64 MB</span>
                          </div>
                          <Progress value={25} className="h-2" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>Battery Impact</span>
                            <span>Low</span>
                          </div>
                          <Progress value={15} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Mobile Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Push Notifications</Label>
                        <Select defaultValue="all">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Notifications</SelectItem>
                            <SelectItem value="errors">Errors Only</SelectItem>
                            <SelectItem value="none">Disabled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Sync Mode</Label>
                        <Select defaultValue="auto">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Automatic</SelectItem>
                            <SelectItem value="wifi">Wi-Fi Only</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Offline Mode</Label>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Enable offline editing and execution
                          </span>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export to Mobile
                        </Button>
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          Import from Mobile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Smartphone className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Select a project to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile App Download Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download E-Code Mobile</DialogTitle>
            <DialogDescription>
              Scan the QR code with your mobile device to download the app
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
              <QrCode className="h-32 w-32 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Available on</p>
              <div className="flex gap-4">
                <Button variant="outline" size="sm">
                  <Smartphone className="h-4 w-4 mr-2" />
                  App Store
                </Button>
                <Button variant="outline" size="sm">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Google Play
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Editor Dialog */}
      <Dialog open={showFileEditor} onOpenChange={setShowFileEditor}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit {selectedFile?.name}</DialogTitle>
            <DialogDescription>
              Make changes to your file directly from mobile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
              placeholder="Enter your code here..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFileEditor(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFile}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}