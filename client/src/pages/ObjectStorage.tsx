import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronRight,
  Cloud,
  Download,
  File,
  FileText,
  Folder,
  FolderPlus,
  HardDrive,
  Image,
  Music,
  Search,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { PageHeader, PageShell, PageShellLoading } from "@/components/layout/PageShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProjectOption {
  id: number | string;
  name?: string | null;
}

interface StorageNode {
  name: string;
  path: string;
  type: "file" | "folder";
  size?: number;
  contentType?: string;
  lastModified?: string;
  children?: StorageNode[];
}

interface StoragePayload {
  files: StorageNode[];
  stats: {
    totalSize: number;
    totalSizeFormatted: string;
    fileCount: number;
    maxStorage: number;
    maxStorageFormatted: string;
    usagePercent: number;
  };
}

function prunePlaceholderNodes(nodes: StorageNode[]): StorageNode[] {
  return nodes
    .filter((node) => node.name !== ".placeholder")
    .map((node) => ({
      ...node,
      children: node.children ? prunePlaceholderNodes(node.children) : undefined,
    }));
}

function getNodesAtPath(nodes: StorageNode[], currentPath: string): StorageNode[] {
  if (!currentPath) {
    return nodes;
  }

  const parts = currentPath.split("/").filter(Boolean);
  let currentNodes = nodes;

  for (const part of parts) {
    const nextFolder = currentNodes.find((node) => node.type === "folder" && node.name === part);
    if (!nextFolder?.children) {
      return [];
    }
    currentNodes = nextFolder.children;
  }

  return currentNodes;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function getFileIcon(node: StorageNode) {
  const type = node.contentType || "";
  if (type.startsWith("image/")) return <Image className="h-4 w-4" />;
  if (type.startsWith("audio/")) return <Music className="h-4 w-4" />;
  if (type.startsWith("video/")) return <Video className="h-4 w-4" />;
  if (type.includes("text") || type.includes("json")) return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

function encodeStoragePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export default function ObjectStorage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [currentPath, setCurrentPath] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<ProjectOption[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      return apiRequest<ProjectOption[]>("GET", "/api/projects");
    },
  });

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(String(projects[0].id));
    }
  }, [projects, selectedProjectId]);

  const storageQuery = useQuery<StoragePayload>({
    queryKey: ["/api/projects", selectedProjectId, "storage"],
    queryFn: async () => {
      return apiRequest("GET", `/api/projects/${selectedProjectId}/storage`);
    },
    enabled: !!selectedProjectId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress(10);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", currentPath);
      const timer = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? prev : prev + 15));
      }, 200);
      try {
        return await apiRequest("POST", `/api/projects/${selectedProjectId}/storage/upload`, formData);
      } finally {
        clearInterval(timer);
        setUploadProgress(100);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "storage"] });
      setUploadDialogOpen(false);
      setUploadProgress(0);
      toast({ title: "Upload complete", description: "File stored in project object storage." });
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/projects/${selectedProjectId}/storage/folder`, {
        name: newFolderName,
        parentPath: currentPath || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "storage"] });
      setCreateFolderDialogOpen(false);
      setNewFolderName("");
      toast({ title: "Folder created", description: "Folder added to project storage." });
    },
    onError: (error: Error) => {
      toast({ title: "Create folder failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (path: string) => {
      return apiRequest("DELETE", `/api/projects/${selectedProjectId}/storage/${encodeStoragePath(path)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "storage"] });
      toast({ title: "Deleted", description: "Storage item removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const downloadFile = (path: string) => {
    window.open(`/api/projects/${selectedProjectId}/storage/${encodeStoragePath(path)}/download`, "_blank", "noopener,noreferrer");
  };

  const tree = useMemo(() => prunePlaceholderNodes(storageQuery.data?.files || []), [storageQuery.data?.files]);
  const visibleNodes = useMemo(() => {
    const nodes = getNodesAtPath(tree, currentPath);
    if (!searchQuery.trim()) {
      return nodes;
    }
    const q = searchQuery.toLowerCase();
    return nodes.filter((node) => node.name.toLowerCase().includes(q));
  }, [currentPath, searchQuery, tree]);

  const folders = visibleNodes.filter((node) => node.type === "folder");
  const files = visibleNodes.filter((node) => node.type === "file");
  const pathParts = currentPath.split("/").filter(Boolean);

  if (projectsLoading || storageQuery.isLoading) {
    return <PageShellLoading text="Loading object storage..." />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Object Storage"
        description="Browse the real storage tree for the selected project and manage files through the backend."
        icon={HardDrive}
        actions={(
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <div className="w-full sm:w-[280px]">
              <Select
                value={selectedProjectId}
                onValueChange={(value) => {
                  setSelectedProjectId(value);
                  setCurrentPath("");
                }}
              >
                <SelectTrigger data-testid="select-storage-project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={String(project.id)} value={String(project.id)}>
                      {project.name || `Project ${project.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!selectedProjectId} data-testid="button-new-folder">
                  <FolderPlus className="mr-2 h-4 w-4" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Folder</DialogTitle>
                  <DialogDescription>Create a folder at the current storage path.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <Label htmlFor="folder-name">Folder Name</Label>
                  <Input id="folder-name" value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} data-testid="input-folder-name" />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateFolderDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => createFolderMutation.mutate(undefined)} disabled={!newFolderName.trim() || createFolderMutation.isPending}>
                    {createFolderMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!selectedProjectId} data-testid="button-upload-files">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload File</DialogTitle>
                  <DialogDescription>Upload into the current path in the selected project storage.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <Input
                    type="file"
                    data-testid="input-file-upload"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        uploadMutation.mutate(file);
                      }
                    }}
                  />
                  {uploadProgress > 0 ? <Progress value={uploadProgress} /> : null}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      />

      {!projects.length ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No projects available</AlertTitle>
          <AlertDescription>Create or open a project to access object storage.</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Storage Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{storageQuery.data?.stats.totalSizeFormatted || "0 B"}</div>
                <Progress className="mt-3" value={storageQuery.data?.stats.usagePercent || 0} />
                <p className="mt-2 text-xs text-muted-foreground">
                  Capacity {storageQuery.data?.stats.maxStorageFormatted || "0 B"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{storageQuery.data?.stats.fileCount || 0}</div>
                <p className="mt-2 text-xs text-muted-foreground">Real object storage entries in this project.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Current Path</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="truncate text-sm font-medium">{currentPath || "/"}</div>
                <p className="mt-2 text-xs text-muted-foreground">Uploads and new folders are created here.</p>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <Cloud className="h-4 w-4" />
            <AlertTitle>Real storage backend</AlertTitle>
            <AlertDescription>
              This page is scoped to project storage. It reflects the actual backend tree and only exposes the operations the storage router really supports.
            </AlertDescription>
          </Alert>

          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search in current path..." className="pl-9" />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <button className="font-medium hover:text-foreground" onClick={() => setCurrentPath("")}>/</button>
            {pathParts.map((part, index) => {
              const partialPath = pathParts.slice(0, index + 1).join("/");
              return (
                <div key={partialPath} className="flex items-center gap-2">
                  <ChevronRight className="h-3 w-3" />
                  <button className="font-medium hover:text-foreground" onClick={() => setCurrentPath(partialPath)}>
                    {part}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4">
            {folders.map((folder) => (
              <Card key={folder.path} className="cursor-pointer hover:border-primary/40" onClick={() => setCurrentPath(folder.path)} data-testid={`storage-folder-${folder.path}`}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Folder className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{folder.name}</p>
                      <p className="text-xs text-muted-foreground">Folder</p>
                    </div>
                  </div>
                  <Badge variant="secondary">open</Badge>
                </CardContent>
              </Card>
            ))}

            {files.map((file) => (
              <Card key={file.path} data-testid={`storage-file-${file.path}`}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file)}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size || 0)}{file.lastModified ? ` • ${new Date(file.lastModified).toLocaleString()}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => downloadFile(file.path)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(file.path)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!folders.length && !files.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Cloud className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">No items in this path</p>
                  <p className="mt-1 text-sm text-muted-foreground">Upload a file or create a folder to populate the project storage tree.</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </>
      )}
    </PageShell>
  );
}
