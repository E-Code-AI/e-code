import { useState, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";
import {
  ChevronDown,
  Sun,
  Moon,
  Edit,
  Trash2,
  Plus,
  AlertTriangle,
  Download,
  Upload,
  RotateCcw,
  Search,
  X,
  Check,
  Zap,
  Filter,
  Save,
  Key,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Separator } from "./ui/separator";
import { isMac, cmdKey } from "../utils/keyboardShortcuts";

// ShortcutRow Component
function ShortcutRow({
  shortcut,
  onEdit,
  onDelete,
}: {
  shortcut: KeyboardShortcut;
  onEdit: (shortcut: KeyboardShortcut) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-3 rounded-md hover:bg-accent/50 transition-colors group">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <Label className="cursor-default text-sm">{shortcut.label}</Label>
          {shortcut.hasConflict && (
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
          )}
          {!shortcut.customizable && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              System
            </Badge>
          )}
        </div>
        {shortcut.description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {shortcut.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {shortcut.keys ? (
          <>
            <div className="flex gap-1">
              {shortcut.keys.map((key, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="h-7 px-2 font-mono text-xs bg-background"
                >
                  {key}
                </Badge>
              ))}
            </div>
            {shortcut.customizable && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onEdit(shortcut)}
                  title="Edit shortcut"
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    onDelete(shortcut.id);
                  }}
                  title="Remove shortcut"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={() => onEdit(shortcut)}
            disabled={!shortcut.customizable}
          >
            <Plus className="w-3 h-3" />
            Add shortcut
          </Button>
        )}
      </div>
    </div>
  );
}

// Shortcut categories type
type ShortcutCategory = "general" | "editor" | "navigation" | "git" | "terminal" | "debugging" | "tools";

interface KeyboardShortcut {
  id: string;
  label: string;
  description: string;
  keys: string[] | null;
  category: ShortcutCategory;
  action: string;
  customizable: boolean;
  hasConflict?: boolean;
}

interface ShortcutProfile {
  id: string;
  name: string;
  description: string;
}

export function UserSettingsTab() {
  const [agentPosition, setAgentPosition] = useState<"left" | "right">("left");
  const [agentAudioNotification, setAgentAudioNotification] = useState(false);
  const [agentPushNotification, setAgentPushNotification] = useState(true);
  const [assistantPushNotification, setAssistantPushNotification] = useState(true);
  const [automaticPreview, setAutomaticPreview] = useState(true);
  const { theme, setTheme } = useTheme();
  const [shortcutsSearch, setShortcutsSearch] = useState("");

  const [agentAssistantOpen, setAgentAssistantOpen] = useState(true);
  const [appPreviewOpen, setAppPreviewOpen] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(true);
  const [codeEditingOpen, setCodeEditingOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Keyboard shortcuts state
  const [selectedProfile, setSelectedProfile] = useState<string>("e-code");
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | "all">("all");
  const [editingShortcut, setEditingShortcut] = useState<KeyboardShortcut | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [recordingKeys, setRecordingKeys] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category state
  const [generalOpen, setGeneralOpen] = useState(true);
  const [editorOpen, setEditorOpen] = useState(true);
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [gitOpen, setGitOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [debuggingOpen, setDebuggingOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  // Shortcut profiles
  const shortcutProfiles: ShortcutProfile[] = [
    { id: "e-code", name: "E-Code (Default)", description: "Default E-Code keyboard shortcuts" },
    { id: "vscode", name: "VS Code", description: "Visual Studio Code compatible shortcuts" },
    { id: "sublime", name: "Sublime Text", description: "Sublime Text compatible shortcuts" },
    { id: "intellij", name: "IntelliJ IDEA", description: "IntelliJ IDEA compatible shortcuts" },
    { id: "custom", name: "Custom", description: "Your personalized shortcuts" },
  ];

  // Comprehensive keyboard shortcuts
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([
    // General
    {
      id: "command-palette",
      label: "Open Command Palette",
      description: "Access all commands quickly",
      keys: [cmdKey, "K"],
      category: "general",
      action: "command-palette",
      customizable: true,
    },
    {
      id: "quick-file-search",
      label: "Quick File Search",
      description: "Search and open files instantly",
      keys: [cmdKey, "P"],
      category: "general",
      action: "quick-search",
      customizable: true,
    },
    {
      id: "show-shortcuts",
      label: "Show Keyboard Shortcuts",
      description: "View all available shortcuts",
      keys: [cmdKey, "/"],
      category: "general",
      action: "show-shortcuts",
      customizable: true,
    },
    {
      id: "save-all",
      label: "Save All Files",
      description: "Save all open files",
      keys: [cmdKey, "S"],
      category: "general",
      action: "save-all",
      customizable: true,
    },
    {
      id: "new-file",
      label: "New File",
      description: "Create a new file",
      keys: [cmdKey, "N"],
      category: "general",
      action: "new-file",
      customizable: true,
    },
    {
      id: "settings",
      label: "Open Settings",
      description: "Open user settings",
      keys: [cmdKey, ","],
      category: "general",
      action: "settings",
      customizable: true,
    },

    // Editor
    {
      id: "find",
      label: "Find in File",
      description: "Search in current file",
      keys: [cmdKey, "F"],
      category: "editor",
      action: "find",
      customizable: true,
    },
    {
      id: "find-replace",
      label: "Find and Replace",
      description: "Find and replace in file",
      keys: [cmdKey, "H"],
      category: "editor",
      action: "find-replace",
      customizable: true,
    },
    {
      id: "find-all",
      label: "Find in All Files",
      description: "Search across all project files",
      keys: [cmdKey, "Shift", "F"],
      category: "editor",
      action: "find-all",
      customizable: true,
    },
    {
      id: "duplicate-line",
      label: "Duplicate Line",
      description: "Duplicate current line or selection",
      keys: [cmdKey, "D"],
      category: "editor",
      action: "duplicate-line",
      customizable: true,
    },
    {
      id: "comment-toggle",
      label: "Toggle Comment",
      description: "Comment/uncomment selection",
      keys: [cmdKey, "/"],
      category: "editor",
      action: "toggle-comment",
      customizable: true,
    },
    {
      id: "format-document",
      label: "Format Document",
      description: "Auto-format the current file",
      keys: [cmdKey, "Shift", "P"],
      category: "editor",
      action: "format",
      customizable: true,
    },

    // Navigation
    {
      id: "toggle-file-explorer",
      label: "Toggle File Explorer",
      description: "Show/hide file explorer",
      keys: [cmdKey, "B"],
      category: "navigation",
      action: "toggle-file-explorer",
      customizable: true,
    },
    {
      id: "close-tab",
      label: "Close Current Tab",
      description: "Close the active tab",
      keys: [cmdKey, "W"],
      category: "navigation",
      action: "close-tab",
      customizable: true,
    },
    {
      id: "next-tab",
      label: "Next Tab",
      description: "Switch to next tab",
      keys: [cmdKey, "Tab"],
      category: "navigation",
      action: "next-tab",
      customizable: true,
    },
    {
      id: "previous-tab",
      label: "Previous Tab",
      description: "Switch to previous tab",
      keys: [cmdKey, "Shift", "Tab"],
      category: "navigation",
      action: "previous-tab",
      customizable: true,
    },
    {
      id: "reopen-tab",
      label: "Reopen Closed Tab",
      description: "Restore last closed tab",
      keys: [cmdKey, "Shift", "T"],
      category: "navigation",
      action: "reopen-tab",
      customizable: true,
    },
    {
      id: "go-to-line",
      label: "Go to Line",
      description: "Jump to specific line",
      keys: [cmdKey, "G"],
      category: "navigation",
      action: "go-to-line",
      customizable: true,
    },

    // Git
    {
      id: "git-commit",
      label: "Git Commit",
      description: "Open commit dialog",
      keys: [cmdKey, "Shift", "C"],
      category: "git",
      action: "git-commit",
      customizable: true,
    },
    {
      id: "git-push",
      label: "Git Push",
      description: "Push changes to remote",
      keys: [cmdKey, "Shift", "P"],
      category: "git",
      action: "git-push",
      customizable: true,
    },
    {
      id: "git-pull",
      label: "Git Pull",
      description: "Pull changes from remote",
      keys: [cmdKey, "Shift", "U"],
      category: "git",
      action: "git-pull",
      customizable: true,
    },
    {
      id: "git-status",
      label: "Git Status",
      description: "View git status",
      keys: [cmdKey, "Shift", "G"],
      category: "git",
      action: "git-status",
      customizable: true,
    },

    // Terminal
    {
      id: "toggle-terminal",
      label: "Toggle Terminal",
      description: "Show/hide integrated terminal",
      keys: ["Ctrl", "`"],
      category: "terminal",
      action: "toggle-terminal",
      customizable: true,
    },
    {
      id: "new-terminal",
      label: "New Terminal",
      description: "Open new terminal instance",
      keys: [cmdKey, "Shift", "`"],
      category: "terminal",
      action: "new-terminal",
      customizable: true,
    },
    {
      id: "clear-terminal",
      label: "Clear Terminal",
      description: "Clear terminal output",
      keys: [cmdKey, "K"],
      category: "terminal",
      action: "clear-terminal",
      customizable: true,
    },

    // Debugging
    {
      id: "run-project",
      label: "Run Project",
      description: "Start/run the project",
      keys: [cmdKey, "Enter"],
      category: "debugging",
      action: "run",
      customizable: true,
    },
    {
      id: "stop-project",
      label: "Stop Project",
      description: "Stop running project",
      keys: [cmdKey, "Shift", "Enter"],
      category: "debugging",
      action: "stop",
      customizable: true,
    },
    {
      id: "refresh-preview",
      label: "Refresh Preview",
      description: "Reload preview pane",
      keys: [cmdKey, "R"],
      category: "debugging",
      action: "refresh",
      customizable: true,
    },
    {
      id: "toggle-console",
      label: "Toggle Console",
      description: "Show/hide console output",
      keys: [cmdKey, "J"],
      category: "debugging",
      action: "toggle-console",
      customizable: true,
    },

    // Tools
    {
      id: "toggle-ai-agent",
      label: "Toggle AI Agent",
      description: "Open/close AI Agent panel",
      keys: [cmdKey, "I"],
      category: "tools",
      action: "toggle-agent",
      customizable: true,
    },
    {
      id: "toggle-ai-assistant",
      label: "Toggle AI Assistant",
      description: "Open/close AI Assistant",
      keys: [cmdKey, "Shift", "I"],
      category: "tools",
      action: "toggle-assistant",
      customizable: true,
    },
    {
      id: "open-tools-panel",
      label: "Open Tools Panel",
      description: "Access all development tools",
      keys: [cmdKey, "Shift", "T"],
      category: "tools",
      action: "tools-panel",
      customizable: true,
    },
  ]);

  // Filter shortcuts
  const filteredShortcuts = shortcuts.filter((shortcut) => {
    const matchesSearch = 
      shortcut.label.toLowerCase().includes(shortcutsSearch.toLowerCase()) ||
      shortcut.description.toLowerCase().includes(shortcutsSearch.toLowerCase()) ||
      (shortcut.keys && shortcut.keys.join(" ").toLowerCase().includes(shortcutsSearch.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || shortcut.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group shortcuts by category
  const shortcutsByCategory = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<ShortcutCategory, KeyboardShortcut[]>);

  // Detect conflicts
  const detectConflicts = () => {
    const keyMap = new Map<string, string[]>();
    shortcuts.forEach((shortcut) => {
      if (shortcut.keys) {
        const keyString = shortcut.keys.join("+");
        if (!keyMap.has(keyString)) {
          keyMap.set(keyString, []);
        }
        keyMap.get(keyString)!.push(shortcut.id);
      }
    });

    const updatedShortcuts = shortcuts.map((shortcut) => {
      if (shortcut.keys) {
        const keyString = shortcut.keys.join("+");
        const conflicts = keyMap.get(keyString) || [];
        return { ...shortcut, hasConflict: conflicts.length > 1 };
      }
      return shortcut;
    });

    setShortcuts(updatedShortcuts);
  };

  // Handle shortcut editing
  const handleEditShortcut = (shortcut: KeyboardShortcut) => {
    setEditingShortcut(shortcut);
    setRecordedKeys(shortcut.keys || []);
    setIsEditDialogOpen(true);
  };

  const handleDeleteShortcut = (shortcutId: string) => {
    setShortcuts(shortcuts.map(s => 
      s.id === shortcutId ? { ...s, keys: null } : s
    ));
    toast.success("Shortcut removed");
    detectConflicts();
  };

  const handleSaveShortcut = () => {
    if (editingShortcut && recordedKeys.length > 0) {
      setShortcuts(shortcuts.map(s =>
        s.id === editingShortcut.id ? { ...s, keys: recordedKeys } : s
      ));
      toast.success("Shortcut updated successfully");
      setIsEditDialogOpen(false);
      setEditingShortcut(null);
      setRecordingKeys(false);
      detectConflicts();
    }
  };

  // Record keyboard input
  const handleKeyCapture = (e: React.KeyboardEvent) => {
    if (!recordingKeys) return;
    
    e.preventDefault();
    const keys: string[] = [];
    
    if (e.metaKey) keys.push(cmdKey);
    if (e.ctrlKey && !e.metaKey) keys.push("Ctrl");
    if (e.shiftKey) keys.push("Shift");
    if (e.altKey) keys.push("Alt");
    
    const key = e.key;
    if (key !== "Meta" && key !== "Control" && key !== "Shift" && key !== "Alt") {
      keys.push(key.length === 1 ? key.toUpperCase() : key);
    }
    
    if (keys.length > 0) {
      setRecordedKeys(keys);
    }
  };

  // Reset to default shortcuts
  const handleResetShortcuts = () => {
    // This would reset to default values - simplified for now
    toast.success("Shortcuts reset to default");
    setIsResetDialogOpen(false);
  };

  // Export shortcuts
  const handleExportShortcuts = () => {
    const data = JSON.stringify(shortcuts, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `e-code-shortcuts-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Shortcuts exported successfully");
  };

  // Import shortcuts
  const handleImportShortcuts = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setShortcuts(imported);
        toast.success("Shortcuts imported successfully");
        detectConflicts();
      } catch (error) {
        toast.error("Failed to import shortcuts");
      }
    };
    reader.readAsText(file);
  };

  // Category labels
  const categoryLabels: Record<ShortcutCategory, string> = {
    general: "General",
    editor: "Code Editor",
    navigation: "Navigation",
    git: "Git & Version Control",
    terminal: "Terminal",
    debugging: "Running & Debugging",
    tools: "Tools & AI",
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 pb-4">
        <h2>User Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          The following settings apply to your account and will be used across all your Apps.
        </p>
      </div>

      <Tabs defaultValue="workspace" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6">
          <TabsList className="grid grid-cols-2 w-fit">
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
            <TabsTrigger value="shortcuts">Keyboard shortcuts</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="workspace" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="px-6 py-4 space-y-4">
              {/* Agent & Assistant */}
              <Collapsible open={agentAssistantOpen} onOpenChange={setAgentAssistantOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:text-foreground transition-colors">
                  <h3>Agent & Assistant</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${
                      agentAssistantOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-6 pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label>Agent Position</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Choose whether the Agent appears in the left or right sidebar.
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant={agentPosition === "left" ? "default" : "outline"}
                        size="sm"
                        className="w-10 h-8"
                        onClick={() => setAgentPosition("left")}
                      >
                        <div className="w-3 h-3 bg-current rounded-sm" />
                      </Button>
                      <Button
                        variant={agentPosition === "right" ? "default" : "outline"}
                        size="sm"
                        className="w-10 h-8"
                        onClick={() => setAgentPosition("right")}
                      >
                        <div className="w-3 h-3 bg-current rounded-sm" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label>Agent Audio Notification</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Play a sound when the Agent needs your response.
                      </p>
                    </div>
                    <Switch
                      checked={agentAudioNotification}
                      onCheckedChange={setAgentAudioNotification}
                      className="ml-4"
                    />
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label>Agent Push Notification</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Send a push notification when the Agent needs your response.
                      </p>
                    </div>
                    <Switch
                      checked={agentPushNotification}
                      onCheckedChange={setAgentPushNotification}
                      className="ml-4"
                    />
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label>Assistant Push Notification</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Send a push notification when the Assistant needs your response.
                      </p>
                    </div>
                    <Switch
                      checked={assistantPushNotification}
                      onCheckedChange={setAssistantPushNotification}
                      className="ml-4"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* App Preview */}
              <Collapsible open={appPreviewOpen} onOpenChange={setAppPreviewOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:text-foreground transition-colors">
                  <h3>App Preview</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${
                      appPreviewOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-6 pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label>Automatic Preview</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Open a web preview automatically when a port is open
                      </p>
                    </div>
                    <Switch
                      checked={automaticPreview}
                      onCheckedChange={setAutomaticPreview}
                      className="ml-4"
                    />
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label>Forward Opened Ports Automatically</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Automatically configure detected newly opened ports.
                      </p>
                    </div>
                    <Select defaultValue="except-localhost">
                      <SelectTrigger className="w-64 ml-4">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">all ports</SelectItem>
                        <SelectItem value="except-localhost">all ports except localhost</SelectItem>
                        <SelectItem value="none">none</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Appearance */}
              <Collapsible open={appearanceOpen} onOpenChange={setAppearanceOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:text-foreground transition-colors">
                  <h3>Appearance</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${
                      appearanceOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-6 pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label>Font Size</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Change the font size of the editor.
                      </p>
                    </div>
                    <Select defaultValue="normal">
                      <SelectTrigger className="w-48 ml-4">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">small</SelectItem>
                        <SelectItem value="normal">normal</SelectItem>
                        <SelectItem value="large">large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label>Theme</Label>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setTheme("light"); toast.success("Theme: Light"); }}
                        className="gap-2"
                      >
                        <Sun className="w-4 h-4" />
                        Light
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setTheme("dark"); toast.success("Theme: Dark"); }}
                        className="gap-2"
                      >
                        <Moon className="w-4 h-4" />
                        Dark
                      </Button>
                      <Button
                        variant={theme === "system" ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setTheme("system"); toast.success("Theme: System (auto)"); }}
                        className="gap-2"
                      >
                        Auto
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Code Editing */}
              <Collapsible open={codeEditingOpen} onOpenChange={setCodeEditingOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:text-foreground transition-colors">
                  <h3>Code Editing</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${
                      codeEditingOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-6 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Code editing settings will be available here.
                  </p>
                </CollapsibleContent>
              </Collapsible>

              {/* Advanced Developer Settings */}
              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:text-foreground transition-colors">
                  <h3>Advanced Developer Settings</h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${
                      advancedOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-6 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Advanced developer settings will be available here.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="shortcuts" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <div className="px-6 py-4 space-y-6">
              {/* Header Section */}
              <div className="space-y-4">
                {/* Profile Selector */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 max-w-md">
                    <Label className="mb-2 block">Keyboard Shortcut Profile</Label>
                    <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {shortcutProfiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            <div className="flex items-center gap-2">
                              <Key className="w-4 h-4" />
                              <div>
                                <div>{profile.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {profile.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Import
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleImportShortcuts}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportShortcuts}
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsResetDialogOpen(true)}
                      className="gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </Button>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search shortcuts by name, action, or key combination..."
                      value={shortcutsSearch}
                      onChange={(e) => setShortcutsSearch(e.target.value)}
                      className="pl-9 pr-10"
                    />
                    {shortcutsSearch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShortcutsSearch("")}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as ShortcutCategory | "all")}>
                    <SelectTrigger className="w-48">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <Separator className="my-1" />
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Info Banner */}
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Keyboard shortcuts</span> help you work faster. 
                        Click on any shortcut to customize it, or choose a preset profile above.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Platform: <span className="font-mono">{isMac ? "macOS" : "Windows/Linux"}</span> • 
                        Total Shortcuts: <span className="font-medium">{shortcuts.filter(s => s.keys).length}</span> • 
                        Conflicts: <span className={shortcuts.some(s => s.hasConflict) ? "text-yellow-600 font-medium" : ""}>{shortcuts.filter(s => s.hasConflict).length}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shortcuts List by Category */}
              <div className="space-y-3">
                {selectedCategory === "all" ? (
                  // Show all categories
                  <>
                    {/* General */}
                    {shortcutsByCategory.general && shortcutsByCategory.general.length > 0 && (
                      <Collapsible open={generalOpen} onOpenChange={setGeneralOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-md hover:bg-accent transition-colors">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm">{categoryLabels.general}</h3>
                            <Badge variant="secondary" className="h-5 px-2 text-xs">
                              {shortcutsByCategory.general.length}
                            </Badge>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              generalOpen ? "rotate-180" : ""
                            }`}
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 pt-2">
                          {shortcutsByCategory.general.map((shortcut) => (
                            <ShortcutRow
                              key={shortcut.id}
                              shortcut={shortcut}
                              onEdit={handleEditShortcut}
                              onDelete={handleDeleteShortcut}
                            />
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Editor */}
                    {shortcutsByCategory.editor && shortcutsByCategory.editor.length > 0 && (
                      <Collapsible open={editorOpen} onOpenChange={setEditorOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-md hover:bg-accent transition-colors">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm">{categoryLabels.editor}</h3>
                            <Badge variant="secondary" className="h-5 px-2 text-xs">
                              {shortcutsByCategory.editor.length}
                            </Badge>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              editorOpen ? "rotate-180" : ""
                            }`}
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 pt-2">
                          {shortcutsByCategory.editor.map((shortcut) => (
                            <ShortcutRow
                              key={shortcut.id}
                              shortcut={shortcut}
                              onEdit={handleEditShortcut}
                              onDelete={handleDeleteShortcut}
                            />
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Navigation */}
                    {shortcutsByCategory.navigation && shortcutsByCategory.navigation.length > 0 && (
                      <Collapsible open={navigationOpen} onOpenChange={setNavigationOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-md hover:bg-accent transition-colors">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm">{categoryLabels.navigation}</h3>
                            <Badge variant="secondary" className="h-5 px-2 text-xs">
                              {shortcutsByCategory.navigation.length}
                            </Badge>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              navigationOpen ? "rotate-180" : ""
                            }`}
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 pt-2">
                          {shortcutsByCategory.navigation.map((shortcut) => (
                            <ShortcutRow
                              key={shortcut.id}
                              shortcut={shortcut}
                              onEdit={handleEditShortcut}
                              onDelete={handleDeleteShortcut}
                            />
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Git */}
                    {shortcutsByCategory.git && shortcutsByCategory.git.length > 0 && (
                      <Collapsible open={gitOpen} onOpenChange={setGitOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-md hover:bg-accent transition-colors">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm">{categoryLabels.git}</h3>
                            <Badge variant="secondary" className="h-5 px-2 text-xs">
                              {shortcutsByCategory.git.length}
                            </Badge>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              gitOpen ? "rotate-180" : ""
                            }`}
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 pt-2">
                          {shortcutsByCategory.git.map((shortcut) => (
                            <ShortcutRow
                              key={shortcut.id}
                              shortcut={shortcut}
                              onEdit={handleEditShortcut}
                              onDelete={handleDeleteShortcut}
                            />
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Terminal */}
                    {shortcutsByCategory.terminal && shortcutsByCategory.terminal.length > 0 && (
                      <Collapsible open={terminalOpen} onOpenChange={setTerminalOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-md hover:bg-accent transition-colors">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm">{categoryLabels.terminal}</h3>
                            <Badge variant="secondary" className="h-5 px-2 text-xs">
                              {shortcutsByCategory.terminal.length}
                            </Badge>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              terminalOpen ? "rotate-180" : ""
                            }`}
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 pt-2">
                          {shortcutsByCategory.terminal.map((shortcut) => (
                            <ShortcutRow
                              key={shortcut.id}
                              shortcut={shortcut}
                              onEdit={handleEditShortcut}
                              onDelete={handleDeleteShortcut}
                            />
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Debugging */}
                    {shortcutsByCategory.debugging && shortcutsByCategory.debugging.length > 0 && (
                      <Collapsible open={debuggingOpen} onOpenChange={setDebuggingOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-md hover:bg-accent transition-colors">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm">{categoryLabels.debugging}</h3>
                            <Badge variant="secondary" className="h-5 px-2 text-xs">
                              {shortcutsByCategory.debugging.length}
                            </Badge>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              debuggingOpen ? "rotate-180" : ""
                            }`}
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 pt-2">
                          {shortcutsByCategory.debugging.map((shortcut) => (
                            <ShortcutRow
                              key={shortcut.id}
                              shortcut={shortcut}
                              onEdit={handleEditShortcut}
                              onDelete={handleDeleteShortcut}
                            />
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Tools */}
                    {shortcutsByCategory.tools && shortcutsByCategory.tools.length > 0 && (
                      <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-md hover:bg-accent transition-colors">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm">{categoryLabels.tools}</h3>
                            <Badge variant="secondary" className="h-5 px-2 text-xs">
                              {shortcutsByCategory.tools.length}
                            </Badge>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              toolsOpen ? "rotate-180" : ""
                            }`}
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-1 pt-2">
                          {shortcutsByCategory.tools.map((shortcut) => (
                            <ShortcutRow
                              key={shortcut.id}
                              shortcut={shortcut}
                              onEdit={handleEditShortcut}
                              onDelete={handleDeleteShortcut}
                            />
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </>
                ) : (
                  // Show filtered category
                  <div className="space-y-1">
                    {filteredShortcuts.map((shortcut) => (
                      <ShortcutRow
                        key={shortcut.id}
                        shortcut={shortcut}
                        onEdit={handleEditShortcut}
                        onDelete={handleDeleteShortcut}
                      />
                    ))}
                  </div>
                )}

                {/* No results */}
                {filteredShortcuts.length === 0 && (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-sm mb-1">No shortcuts found</h3>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Edit Shortcut Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Keyboard Shortcut</DialogTitle>
                <DialogDescription>
                  {editingShortcut?.label}
                  {editingShortcut?.description && (
                    <span className="block text-xs mt-1">{editingShortcut.description}</span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Current Shortcut</Label>
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                    {recordedKeys.length > 0 ? (
                      recordedKeys.map((key, idx) => (
                        <Badge key={idx} variant="outline" className="h-8 px-3 font-mono">
                          {key}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No shortcut set</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Record New Shortcut</Label>
                  <div
                    className={`relative border-2 rounded-md transition-colors ${
                      recordingKeys
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background"
                    }`}
                  >
                    <Input
                      placeholder={recordingKeys ? "Press your key combination..." : "Click to start recording"}
                      onFocus={() => setRecordingKeys(true)}
                      onBlur={() => setRecordingKeys(false)}
                      onKeyDown={handleKeyCapture}
                      readOnly
                      className="border-0 focus-visible:ring-0"
                    />
                    {recordingKeys && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          Recording
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click the input and press your desired key combination
                  </p>
                </div>

                {editingShortcut?.hasConflict && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium text-yellow-900 dark:text-yellow-200">Conflict Detected</p>
                      <p className="text-yellow-800 dark:text-yellow-300 mt-1">
                        This key combination is already used by another shortcut
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setRecordingKeys(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveShortcut}
                  disabled={recordedKeys.length === 0}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Shortcut
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reset Confirmation Dialog */}
          <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Keyboard Shortcuts?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all keyboard shortcuts to their default values. 
                  Any customizations you've made will be lost. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetShortcuts}>
                  Reset to Default
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
