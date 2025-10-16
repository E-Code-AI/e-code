import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Cloud, 
  Upload, 
  Download, 
  Folder, 
  File,
  Image,
  Video,
  FileText,
  Archive,
  Share,
  Lock,
  Unlock,
  Settings,
  Trash2,
  Copy,
  ExternalLink,
  HardDrive,
  Globe,
  Shield,
  Zap
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ObjectUploader } from '@/components/ObjectUploader';

interface StorageFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  mimeType?: string;
  url: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  owner: string;
  accessCount: number;
  path: string;
}

interface StorageBucket {
  id: string;
  name: string;
  region: string;
  size: number;
  fileCount: number;
  isPublic: boolean;
  createdAt: string;
}

interface StorageStats {
  totalStorage: number;
  usedStorage: number;
  totalFiles: number;
  publicFiles: number;
  privateFiles: number;
  totalBandwidth: number;
}

export function ObjectStorage() {
  const [selectedBucket, setSelectedBucket] = useState<string>('repl-default-bucket');
  const [currentPath, setCurrentPath] = useState('/');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Mock data for cross-app object storage
  const buckets: StorageBucket[] = [
    {
      id: 'repl-default-bucket',
      name: 'Default Bucket',
      region: 'us-east-1',
      size: 1024 * 1024 * 256, // 256MB
      fileCount: 42,
      isPublic: false,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'public-assets-bucket',
      name: 'Public Assets',
      region: 'us-west-2',
      size: 1024 * 1024 * 512, // 512MB
      fileCount: 128,
      isPublic: true,
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'backup-bucket',
      name: 'Project Backups',
      region: 'eu-west-1',
      size: 1024 * 1024 * 1024 * 2, // 2GB
      fileCount: 256,
      isPublic: false,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const files: StorageFile[] = [
    {
      id: 'file-1',
      name: 'profile-images',
      type: 'folder',
      size: 0,
      url: '',
      isPublic: true,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      owner: 'system',
      accessCount: 234,
      path: '/profile-images'
    },
    {
      id: 'file-2',
      name: 'app-logo.png',
      type: 'file',
      size: 1024 * 45, // 45KB
      mimeType: 'image/png',
      url: 'https://storage.googleapis.com/bucket/app-logo.png',
      isPublic: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      owner: 'alice_dev',
      accessCount: 1456,
      path: '/app-logo.png'
    },
    {
      id: 'file-3',
      name: 'user-data-backup.json',
      type: 'file',
      size: 1024 * 1024 * 2.5, // 2.5MB
      mimeType: 'application/json',
      url: 'https://storage.googleapis.com/bucket/user-data-backup.json',
      isPublic: false,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      owner: 'system',
      accessCount: 12,
      path: '/user-data-backup.json'
    },
    {
      id: 'file-4',
      name: 'demo-video.mp4',
      type: 'file',
      size: 1024 * 1024 * 15, // 15MB
      mimeType: 'video/mp4',
      url: 'https://storage.googleapis.com/bucket/demo-video.mp4',
      isPublic: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      owner: 'bob_designer',
      accessCount: 567,
      path: '/demo-video.mp4'
    }
  ];

  const storageStats: StorageStats = {
    totalStorage: 1024 * 1024 * 1024 * 10, // 10GB
    usedStorage: 1024 * 1024 * 1024 * 2.8, // 2.8GB
    totalFiles: files.length,
    publicFiles: files.filter(f => f.isPublic).length,
    privateFiles: files.filter(f => !f.isPublic).length,
    totalBandwidth: 1024 * 1024 * 1024 * 5.2 // 5.2GB this month
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: StorageFile) => {
    if (file.type === 'folder') return <Folder className="h-5 w-5" />;
    
    if (file.mimeType?.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    if (file.mimeType?.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />;
    if (file.mimeType?.includes('json') || file.mimeType?.includes('text')) return <FileText className="h-5 w-5 text-green-500" />;
    if (file.mimeType?.includes('zip') || file.mimeType?.includes('archive')) return <Archive className="h-5 w-5 text-orange-500" />;
    
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const handleGetUploadParameters = async () => {
    // This would normally call your backend to get a presigned URL
    return {
      method: 'PUT' as const,
      url: 'https://storage.googleapis.com/bucket/uploads/file-123'
    };
  };

  const handleUploadComplete = (result: any) => {
    // Handle upload completion
    console.log('Upload completed:', result);
    queryClient.invalidateQueries({ queryKey: ['/api/storage/files'] });
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const handleBulkAction = (action: 'delete' | 'makePublic' | 'makePrivate') => {
    // Handle bulk actions on selected files
    console.log(`Bulk action: ${action} on`, Array.from(selectedFiles));
    setSelectedFiles(new Set());
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Cloud className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Cross-App Object Storage</h1>
            <p className="text-muted-foreground">
              Scalable cloud storage with global CDN, fine-grained access control, and cross-project sharing
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <ObjectUploader
            maxNumberOfFiles={5}
            maxFileSize={100 * 1024 * 1024} // 100MB
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleUploadComplete}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </ObjectUploader>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(storageStats.usedStorage)}</div>
            <p className="text-xs text-muted-foreground">
              of {formatFileSize(storageStats.totalStorage)} total
            </p>
            <Progress 
              value={(storageStats.usedStorage / storageStats.totalStorage) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <File className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storageStats.totalFiles}</div>
            <p className="text-xs text-muted-foreground">
              {storageStats.publicFiles} public, {storageStats.privateFiles} private
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bandwidth</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(storageStats.totalBandwidth)}</div>
            <p className="text-xs text-muted-foreground">
              This month via global CDN
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.9%</div>
            <p className="text-xs text-muted-foreground">
              Uptime with edge caching
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="files" className="space-y-4">
        <TabsList>
          <TabsTrigger value="files">File Browser</TabsTrigger>
          <TabsTrigger value="buckets">Buckets</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* File Browser Tab */}
        <TabsContent value="files" className="space-y-4">
          {/* File Browser Controls */}
          <Card>
            <CardHeader>
              <CardTitle>File Browser</CardTitle>
              <CardDescription>
                Browse, manage, and share files across all your projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Navigation and Controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Select value={selectedBucket} onValueChange={setSelectedBucket}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {buckets.map((bucket) => (
                        <SelectItem key={bucket.id} value={bucket.id}>
                          {bucket.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-sm text-muted-foreground">
                    {currentPath}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedFiles.size > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedFiles.size} selected
                      </span>
                      <Button variant="outline" size="sm" onClick={() => handleBulkAction('makePublic')}>
                        <Unlock className="h-4 w-4 mr-1" />
                        Make Public
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleBulkAction('makePrivate')}>
                        <Lock className="h-4 w-4 mr-1" />
                        Make Private
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleBulkAction('delete')}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                  <Select value={viewMode} onValueChange={(value: 'grid' | 'list') => setViewMode(value)}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="list">List</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* File Grid/List */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:border-gray-300 ${
                        selectedFiles.has(file.id) ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => toggleFileSelection(file.id)}
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg">
                          {getFileIcon(file)}
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium truncate w-full">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {file.type === 'file' ? formatFileSize(file.size) : '—'}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {file.isPublic ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <Globe className="h-3 w-3 mr-1" />
                              Public
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-600 border-gray-600">
                              <Lock className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors hover:border-gray-300 ${
                        selectedFiles.has(file.id) ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => toggleFileSelection(file.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {getFileIcon(file)}
                        <div>
                          <div className="font-medium">{file.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {file.owner} • {new Date(file.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm text-muted-foreground">
                          {file.type === 'file' ? formatFileSize(file.size) : '—'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {file.accessCount} views
                        </div>
                        <Badge variant={file.isPublic ? 'default' : 'secondary'}>
                          {file.isPublic ? 'Public' : 'Private'}
                        </Badge>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Share className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Buckets Tab */}
        <TabsContent value="buckets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Storage Buckets</CardTitle>
              <CardDescription>
                Manage storage buckets across different regions and projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {buckets.map((bucket) => (
                  <Card key={bucket.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{bucket.name}</span>
                        <Badge variant={bucket.isPublic ? 'default' : 'secondary'}>
                          {bucket.isPublic ? 'Public' : 'Private'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Region: {bucket.region}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Storage Used:</span>
                          <span>{formatFileSize(bucket.size)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Files:</span>
                          <span>{bucket.fileCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Created:</span>
                          <span>{new Date(bucket.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex space-x-2 mt-4">
                          <Button variant="outline" size="sm" className="flex-1">
                            Browse
                          </Button>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Control Tab */}
        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Control & Permissions</CardTitle>
              <CardDescription>
                Manage file permissions, sharing settings, and access policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Public/Private Files */}
                <div>
                  <h3 className="text-lg font-medium mb-3">File Visibility</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center">
                          <Globe className="h-5 w-5 mr-2 text-green-500" />
                          Public Files
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{storageStats.publicFiles}</div>
                        <p className="text-sm text-muted-foreground">
                          Accessible via public URLs
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center">
                          <Lock className="h-5 w-5 mr-2 text-red-500" />
                          Private Files
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{storageStats.privateFiles}</div>
                        <p className="text-sm text-muted-foreground">
                          Require authentication
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Access Policies */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Access Policies</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Shield className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="font-medium">Cross-Project Access</div>
                          <div className="text-sm text-muted-foreground">
                            Allow files to be shared between projects
                          </div>
                        </div>
                      </div>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Globe className="h-5 w-5 text-green-500" />
                        <div>
                          <div className="font-medium">Public CDN Access</div>
                          <div className="text-sm text-muted-foreground">
                            Serve public files via global CDN
                          </div>
                        </div>
                      </div>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Lock className="h-5 w-5 text-red-500" />
                        <div>
                          <div className="font-medium">Signed URL Access</div>
                          <div className="text-sm text-muted-foreground">
                            Generate temporary access URLs for private files
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">Available</Badge>
                    </div>
                  </div>
                </div>

                {/* Sharing Settings */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Sharing Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Default File Visibility</Label>
                      <Select defaultValue="private">
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Link Expiration (Private Files)</Label>
                      <Select defaultValue="24h">
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1h">1 Hour</SelectItem>
                          <SelectItem value="24h">24 Hours</SelectItem>
                          <SelectItem value="7d">7 Days</SelectItem>
                          <SelectItem value="30d">30 Days</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Analytics</CardTitle>
                <CardDescription>
                  Storage and bandwidth usage over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Storage Usage</span>
                      <span>{Math.round((storageStats.usedStorage / storageStats.totalStorage) * 100)}%</span>
                    </div>
                    <Progress value={(storageStats.usedStorage / storageStats.totalStorage) * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Bandwidth (This Month)</span>
                      <span>{formatFileSize(storageStats.totalBandwidth)}</span>
                    </div>
                    <Progress value={52} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>CDN Cache Hit Rate</span>
                      <span>94.2%</span>
                    </div>
                    <Progress value={94} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Popular Files */}
            <Card>
              <CardHeader>
                <CardTitle>Most Accessed Files</CardTitle>
                <CardDescription>
                  Files with the highest access counts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {files
                    .filter(f => f.type === 'file')
                    .sort((a, b) => b.accessCount - a.accessCount)
                    .slice(0, 5)
                    .map((file) => (
                      <div key={file.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(file)}
                          <div>
                            <div className="text-sm font-medium">{file.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-medium">
                          {file.accessCount} views
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Global CDN Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Global CDN Performance</CardTitle>
              <CardDescription>
                File delivery performance across global edge locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">12ms</div>
                  <div className="text-sm text-muted-foreground">Avg Response Time</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">150+</div>
                  <div className="text-sm text-muted-foreground">Edge Locations</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">99.9%</div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">94%</div>
                  <div className="text-sm text-muted-foreground">Cache Hit Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}