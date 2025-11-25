import { useState } from "react";
import { Plus, ChevronDown, Layers, FileText, ChevronRight, FolderOpen } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { FileExplorer, FileNode } from "./FileExplorer";

interface AddTabMenuProps {
  onAddTab: (toolId: string) => void;
  onOpenFile?: (file: FileNode) => void;
  files?: FileNode[];
}

export function AddTabMenu({ onAddTab, onOpenFile, files = [] }: AddTabMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showFileDialog, setShowFileDialog] = useState(false);

  const allFeatures = [
    { id: "ui-tars", label: "UI-TARS", category: "AI Tools", badge: "NEW" },
    { id: "database", label: "Database", category: "Data" },
    { id: "publishing", label: "Publishing", category: "Deployment" },
    { id: "integrations", label: "Integrations", category: "Tools" },
    { id: "git", label: "Git", category: "Version Control" },
    { id: "secrets", label: "Secrets", category: "Security" },
    { id: "console", label: "Console", category: "Development" },
    { id: "shell", label: "Shell", category: "Development" },
    { id: "code-search", label: "Code Search", category: "Development" },
    { id: "security-scanner", label: "Security Scanner", category: "Security" },
    { id: "auth", label: "Authentication", category: "Security" },
    { id: "app-storage", label: "App Storage", category: "Data" },
    { id: "key-value-store", label: "Key-Value Store", category: "Data" },
    { id: "playground", label: "Playground", category: "Development" },
    { id: "developer", label: "Developer Tools", category: "Tools" },
    { id: "ssh-access", label: "SSH Access", category: "Infrastructure" },
    { id: "collaboration", label: "Collaboration", category: "Team" },
    { id: "object-storage", label: "Object Storage", category: "Data" },
    { id: "workflows", label: "Workflows", category: "Automation" },
    { id: "backup-restore", label: "Backup & Restore", category: "Infrastructure" },
    { id: "vnc", label: "VNC Desktop", category: "Infrastructure" },
    { id: "user-settings", label: "User Settings", category: "Settings" },
  ];

  const filteredFeatures = allFeatures.filter((feature) =>
    feature.label.toLowerCase().includes(search.toLowerCase()) ||
    feature.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectFeature = (featureId: string) => {
    onAddTab(featureId);
    setOpen(false);
    setSearch("");
  };

  const handleOpenFilesDialog = () => {
    setOpen(false);
    setShowFileDialog(true);
  };

  const handleFileSelect = (file: FileNode) => {
    if (file.type === "file" && onOpenFile) {
      onOpenFile(file);
      setShowFileDialog(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:border-blue-200 border border-transparent transition-all duration-200"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span className="text-xs">Add Tab</span>
            <ChevronDown className="w-2.5 h-2.5 ml-1 transition-transform duration-200" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0 shadow-xl animate-fade-in">
          <div className="p-3 border-b">
            <Input
              placeholder="Search features..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>

          <ScrollArea className="h-96">
            <div className="p-2">
              {/* Files Section - Always visible at top */}
              {search === "" && (
                <>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                    Files
                  </div>
                  
                  <button
                    onClick={handleOpenFilesDialog}
                    className="w-full text-left px-3 py-2.5 rounded-md hover:bg-accent transition-all duration-150 flex items-center gap-3 group mb-2"
                  >
                    <FolderOpen className="w-4 h-4 flex-shrink-0 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">Open files</div>
                      <div className="text-xs text-muted-foreground">Browse and open project files</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <button
                    onClick={() => handleSelectFeature("files")}
                    className="w-full text-left px-3 py-2.5 rounded-md hover:bg-accent transition-all duration-150 flex items-center gap-3 group mb-3"
                  >
                    <Plus className="w-4 h-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">New file</div>
                      <div className="text-xs text-muted-foreground">Create a new file</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </>
              )}

              {filteredFeatures.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => handleSelectFeature(feature.id)}
                  className="w-full text-left p-2 rounded-md hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:shadow-sm transition-all duration-200 flex items-center gap-2 group"
                >
                  <Layers className="w-4 h-4 text-primary flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{feature.label}</div>
                    <div className="text-xs text-muted-foreground">{feature.category}</div>
                  </div>
                  {feature.badge && <Badge className="ml-2">{feature.badge}</Badge>}
                </button>
              ))}

              {filteredFeatures.length === 0 && search !== "" && (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No features found</p>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground text-center">
            {filteredFeatures.length} feature{filteredFeatures.length !== 1 ? 's' : ''} available
          </div>
        </PopoverContent>
      </Popover>

      {/* File Explorer Dialog */}
      <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Open File</DialogTitle>
          </DialogHeader>
          <div className="h-[500px]">
            <FileExplorer
              files={files}
              selectedFile={null}
              onFileSelect={handleFileSelect}
              onCreateFile={() => {}}
              onCreateFolder={() => {}}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}