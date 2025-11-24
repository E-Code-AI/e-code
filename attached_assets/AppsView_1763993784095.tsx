import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
  MoreVertical,
  ExternalLink,
  Clock,
  Globe,
  Lock,
  Users,
  Copy,
  Trash2,
  Edit3,
  Play,
  Pause,
  FolderOpen,
  Download,
  Upload,
  Star,
  Grid3x3,
  List,
  ChevronDown,
  Filter,
  SortAsc,
  Eye,
  Settings,
  Share2,
  GitFork,
  ArrowRight,
  Code2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { projectId as supabaseProjectId } from "../utils/supabase/info";

const SERVER_URL = `https://${supabaseProjectId}.supabase.co/functions/v1/server`;

interface App {
  id: string;
  name: string;
  description: string;
  visibility: "private" | "public" | "shared";
  status: "active" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  projectId: string;
  userId: string;
  url?: string;
  framework?: string;
  deploymentStatus?: "deployed" | "deploying" | "failed" | "not-deployed";
  starred?: boolean;
  sharedWith?: string[];
  tags?: string[];
}

interface AppsViewProps {
  onOpenApp: (appId: string) => void;
  onBack: () => void;
  onAppsChange?: () => void; // ✅ Nouveau callback
}

export function AppsView({ onOpenApp, onBack, onAppsChange }: AppsViewProps) {
  const { session, user } = useAuth();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "private" | "public" | "shared">("all");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "created">("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Create/Edit App Dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [appForm, setAppForm] = useState({
    name: "",
    description: "",
    visibility: "private" as App["visibility"],
    framework: "",
    tags: "",
  });
  const [savingApp, setSavingApp] = useState(false);

  // Delete Confirmation
  const [deletingApp, setDeletingApp] = useState<App | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");

  // Load apps from backend
  useEffect(() => {
    loadApps();
  }, [session]);

  const loadApps = async () => {
    if (!session) {
      console.warn("[AppsView] No session available");
      return;
    }

    try {
      setLoading(true);
      console.log("[AppsView] Loading apps from:", `${SERVER_URL}/apps`);
      
      const response = await fetch(`${SERVER_URL}/apps`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log("[AppsView] Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("[AppsView] Loaded apps:", data.apps?.length || 0);
        setApps(data.apps || []);
      } else {
        const error = await response.text();
        console.error("[AppsView] Failed to load apps:", response.status, error);
        toast.error(`Error loading apps: ${response.status}`);
      }
    } catch (error) {
      console.error("[AppsView] Error loading apps:", error);
      toast.error(`Error loading apps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async () => {
    if (!session) {
      console.warn("[AppsView] No session for creating app");
      toast.error("You must be logged in");
      return;
    }
    
    if (!appForm.name.trim()) {
      toast.error("App name is required");
      return;
    }

    try {
      setSavingApp(true);
      const endpoint = editingApp ? `${SERVER_URL}/apps/${editingApp.id}` : `${SERVER_URL}/apps`;
      const method = editingApp ? "PUT" : "POST";

      console.log(`[AppsView] ${method} app to:`, endpoint);

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: appForm.name.trim(),
          description: appForm.description.trim(),
          visibility: appForm.visibility,
          framework: appForm.framework,
          tags: appForm.tags.split(",").map(t => t.trim()).filter(Boolean),
        }),
      });

      console.log("[AppsView] Save response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("[AppsView] App saved:", data);
        toast.success(editingApp ? "App updated successfully" : "App created successfully");
        setShowCreateDialog(false);
        setEditingApp(null);
        resetForm();
        await loadApps();
        if (onAppsChange) onAppsChange();
      } else {
        const error = await response.text();
        console.error("[AppsView] Failed to save app:", response.status, error);
        toast.error(`Error saving app: ${response.status}`);
      }
    } catch (error) {
      console.error("[AppsView] Error saving app:", error);
      toast.error(`Error saving app: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSavingApp(false);
    }
  };

  const handleDeleteApp = async () => {
    if (!session || !deletingApp) return;
    if (confirmDelete !== deletingApp.name) {
      toast.error("App name doesn't match");
      return;
    }

    try {
      const response = await fetch(`${SERVER_URL}/apps/${deletingApp.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        toast.success("App deleted successfully");
        setDeletingApp(null);
        setConfirmDelete("");
        await loadApps();
        if (onAppsChange) onAppsChange(); // ✅ Appel du callback
      } else {
        const error = await response.text();
        console.error("Failed to delete app:", error);
        toast.error("Failed to delete app");
      }
    } catch (error) {
      console.error("Error deleting app:", error);
      toast.error("Error deleting app");
    }
  };

  const handleToggleStar = async (app: App) => {
    if (!session) return;

    try {
      const response = await fetch(`${SERVER_URL}/apps/${app.id}/star`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ starred: !app.starred }),
      });

      if (response.ok) {
        await loadApps();
      }
    } catch (error) {
      console.error("Error toggling star:", error);
    }
  };

  const handleToggleStatus = async (app: App) => {
    if (!session) return;

    const newStatus = app.status === "active" ? "paused" : "active";

    try {
      const response = await fetch(`${SERVER_URL}/apps/${app.id}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`App ${newStatus === "active" ? "resumed" : "paused"}`);
        await loadApps();
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const resetForm = () => {
    setAppForm({
      name: "",
      description: "",
      visibility: "private",
      framework: "",
      tags: "",
    });
  };

  const openEditDialog = (app: App) => {
    setEditingApp(app);
    setAppForm({
      name: app.name,
      description: app.description || "",
      visibility: app.visibility,
      framework: app.framework || "",
      tags: app.tags?.join(", ") || "",
    });
    setShowCreateDialog(true);
  };

  // Filter and sort apps
  const filteredApps = apps
    .filter(app => {
      // Filter by tab
      if (filterTab === "private" && app.visibility !== "private") return false;
      if (filterTab === "public" && app.visibility !== "public") return false;
      if (filterTab === "shared" && app.visibility !== "shared") return false;

      // Filter by search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          app.name.toLowerCase().includes(query) ||
          app.description?.toLowerCase().includes(query) ||
          app.framework?.toLowerCase().includes(query) ||
          app.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.lastOpenedAt || b.updatedAt).getTime() - new Date(a.lastOpenedAt || a.updatedAt).getTime();
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const getStatusBadge = (status: App["status"]) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>;
      case "paused":
        return <Badge variant="secondary"><Pause className="w-3 h-3 mr-1" />Paused</Badge>;
      case "archived":
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Archived</Badge>;
    }
  };

  const getVisibilityIcon = (visibility: App["visibility"]) => {
    switch (visibility) {
      case "private":
        return <Lock className="w-4 h-4 text-muted-foreground" />;
      case "public":
        return <Globe className="w-4 h-4 text-blue-500" />;
      case "shared":
        return <Users className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </Button>
            <div>
              <h1 className="text-2xl">Apps</h1>
              <p className="text-sm text-muted-foreground">
                Manage and deploy your applications
              </p>
            </div>
          </div>
          <Button onClick={() => {
            resetForm();
            setEditingApp(null);
            setShowCreateDialog(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Create App
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as any)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="private">Private</TabsTrigger>
              <TabsTrigger value="public">Public</TabsTrigger>
              <TabsTrigger value="shared">Shared</TabsTrigger>
            </TabsList>
          </Tabs>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SortAsc className="w-4 h-4 mr-2" />
                Sort: {sortBy === "recent" ? "Recent" : sortBy === "name" ? "Name" : "Created"}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy("recent")}>
                <Clock className="w-4 h-4 mr-2" />
                Recently Opened
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name")}>
                <SortAsc className="w-4 h-4 mr-2" />
                Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("created")}>
                <Clock className="w-4 h-4 mr-2" />
                Created Date
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Code2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg mb-2">No apps found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? "Try adjusting your search or filters"
                : "Create your first app to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create App
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredApps.map((app) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="hover:shadow-lg transition-all cursor-pointer group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getVisibilityIcon(app.visibility)}
                          <CardTitle className="text-base">{app.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStar(app);
                            }}
                          >
                            <Star
                              className={`w-4 h-4 ${app.starred ? "fill-yellow-500 text-yellow-500" : ""}`}
                            />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onOpenApp(app.id)}>
                                <FolderOpen className="w-4 h-4 mr-2" />
                                Open
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(app)}>
                                <Edit3 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(app)}>
                                {app.status === "active" ? (
                                  <>
                                    <Pause className="w-4 h-4 mr-2" />
                                    Pause
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Resume
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => window.open(app.url, "_blank")}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open in new tab
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <GitFork className="w-4 h-4 mr-2" />
                                Fork
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeletingApp(app)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {app.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(app.lastOpenedAt || app.updatedAt).toLocaleDateString()}
                        </div>
                        {app.framework && (
                          <Badge variant="outline" className="text-xs">
                            {app.framework}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        {getStatusBadge(app.status)}
                        <Button
                          size="sm"
                          onClick={() => onOpenApp(app.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Open
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                      {app.tags && app.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {app.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {app.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{app.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredApps.map((app) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(app);
                          }}
                        >
                          <Star
                            className={`w-4 h-4 ${app.starred ? "fill-yellow-500 text-yellow-500" : ""}`}
                          />
                        </Button>
                        {getVisibilityIcon(app.visibility)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm truncate">{app.name}</h3>
                            {app.framework && (
                              <Badge variant="outline" className="text-xs">
                                {app.framework}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {app.description || "No description"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(app.status)}
                          <div className="text-xs text-muted-foreground">
                            {new Date(app.lastOpenedAt || app.updatedAt).toLocaleDateString()}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => onOpenApp(app.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Open
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onOpenApp(app.id)}>
                                <FolderOpen className="w-4 h-4 mr-2" />
                                Open
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(app)}>
                                <Edit3 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(app)}>
                                {app.status === "active" ? (
                                  <>
                                    <Pause className="w-4 h-4 mr-2" />
                                    Pause
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Resume
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeletingApp(app)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create/Edit App Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingApp ? "Edit App" : "Create New App"}</DialogTitle>
            <DialogDescription>
              {editingApp
                ? "Update your app settings"
                : "Create a new application to start building"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">App Name *</Label>
              <Input
                id="name"
                placeholder="my-awesome-app"
                value={appForm.name}
                onChange={(e) => setAppForm({ ...appForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does your app do?"
                value={appForm.description}
                onChange={(e) => setAppForm({ ...appForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={appForm.visibility}
                onValueChange={(v) => setAppForm({ ...appForm, visibility: v as App["visibility"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Private - Only you
                    </div>
                  </SelectItem>
                  <SelectItem value="shared">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Shared - Selected users
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Public - Everyone
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="framework">Framework (optional)</Label>
              <Select
                value={appForm.framework}
                onValueChange={(v) => setAppForm({ ...appForm, framework: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select framework" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="react">React</SelectItem>
                  <SelectItem value="vue">Vue</SelectItem>
                  <SelectItem value="angular">Angular</SelectItem>
                  <SelectItem value="svelte">Svelte</SelectItem>
                  <SelectItem value="next">Next.js</SelectItem>
                  <SelectItem value="nuxt">Nuxt.js</SelectItem>
                  <SelectItem value="node">Node.js</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="web, api, production"
                value={appForm.tags}
                onChange={(e) => setAppForm({ ...appForm, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateApp} disabled={savingApp}>
              {savingApp && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingApp ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingApp} onOpenChange={() => setDeletingApp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Delete App
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the app and all its data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm">
              Please type <span className="font-mono font-semibold">{deletingApp?.name}</span> to
              confirm deletion.
            </p>
            <Input
              placeholder="Type app name"
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeletingApp(null);
              setConfirmDelete("");
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteApp}
              disabled={confirmDelete !== deletingApp?.name}
            >
              Delete App
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}