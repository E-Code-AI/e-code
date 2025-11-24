import { useState } from "react";
import { Plus, ChevronDown, Layers, FolderOpen, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Feature {
  id: string;
  label: string;
  category: string;
  description?: string;
  icon: string;
  badge?: string;
}

interface AddTabMenuProps {
  onAddTool: (toolId: string) => void;
  availableTools?: { id: string; label: string; icon: string }[];
}

export function AddTabMenu({ onAddTool, availableTools = [] }: AddTabMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Enhanced feature list with categories and descriptions
  const enhancedFeatures: Feature[] = [
    // AI Tools
    { id: "agent", label: "AI Agent", category: "AI Tools", description: "Autonomous coding assistant", icon: "🤖", badge: "PRO" },
    { id: "chat", label: "AI Chat", category: "AI Tools", description: "Ask questions about your code", icon: "💬" },
    
    // Development
    { id: "preview", label: "Preview", category: "Development", description: "Live preview of your app", icon: "👁️" },
    { id: "console", label: "Console", category: "Development", description: "View application logs", icon: "📋" },
    { id: "terminal", label: "Terminal", category: "Development", description: "Shell access", icon: "⌨️" },
    { id: "shell", label: "Shell", category: "Development", description: "Multiple shell sessions", icon: "🐚" },
    { id: "code-search", label: "Code Search", category: "Development", description: "Search across files", icon: "🔍" },
    { id: "playground", label: "Playground", category: "Development", description: "Test code snippets", icon: "🎮" },
    
    // Data & Storage
    { id: "database", label: "Database", category: "Data", description: "Browse and manage data", icon: "💾" },
    { id: "db-browser", label: "DB Browser", category: "Data", description: "Visual database explorer", icon: "🗄️" },
    { id: "app-storage", label: "App Storage", category: "Data", description: "Key-value storage", icon: "📦" },
    { id: "object-storage", label: "Object Storage", category: "Data", description: "File and media storage", icon: "🗂️" },
    
    // Deployment
    { id: "publishing", label: "Publishing", category: "Deployment", description: "Deploy your application", icon: "🚀" },
    { id: "deployment", label: "Deployment", category: "Deployment", description: "Manage deployments", icon: "☁️" },
    
    // Version Control
    { id: "git", label: "Git", category: "Version Control", description: "Source control", icon: "🌿" },
    
    // Security
    { id: "secrets", label: "Secrets", category: "Security", description: "Manage API keys securely", icon: "🔐" },
    { id: "env-vars", label: "Environment Variables", category: "Security", description: "Configure env vars", icon: "🔧" },
    { id: "security-scanner", label: "Security Scanner", category: "Security", description: "Scan for vulnerabilities", icon: "🛡️" },
    { id: "auth", label: "Authentication", category: "Security", description: "User authentication", icon: "🔑" },
    
    // Tools
    { id: "integrations", label: "Integrations", category: "Tools", description: "Connect external services", icon: "🔌" },
    { id: "packages", label: "Packages", category: "Tools", description: "Manage dependencies", icon: "📦" },
    { id: "testing", label: "Testing", category: "Tools", description: "Run tests", icon: "🧪" },
    { id: "debugger", label: "Debugger", category: "Tools", description: "Debug your code", icon: "🐛" },
    { id: "settings", label: "Settings", category: "Tools", description: "IDE preferences", icon: "⚙️" },
    
    // Team
    { id: "collaboration", label: "Collaboration", category: "Team", description: "Real-time collaboration", icon: "👥" },
    
    // Automation
    { id: "workflows", label: "Workflows", category: "Automation", description: "Automated tasks", icon: "⚡" },
    
    // Infrastructure
    { id: "ssh-access", label: "SSH Access", category: "Infrastructure", description: "Remote access", icon: "🔗" },
    { id: "vnc", label: "VNC Desktop", category: "Infrastructure", description: "Graphical desktop", icon: "🖥️" },
    { id: "backup-restore", label: "Backup & Restore", category: "Infrastructure", description: "Project backups", icon: "💿" },
  ];

  const filteredFeatures = enhancedFeatures.filter((feature) =>
    feature.label.toLowerCase().includes(search.toLowerCase()) ||
    feature.category.toLowerCase().includes(search.toLowerCase()) ||
    (feature.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  // Group by category
  const categories = Array.from(new Set(filteredFeatures.map(f => f.category)));
  const groupedFeatures = categories.reduce((acc, category) => {
    acc[category] = filteredFeatures.filter(f => f.category === category);
    return acc;
  }, {} as Record<string, Feature[]>);

  const handleSelectFeature = (featureId: string) => {
    onAddTool(featureId);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          data-testid="button-add-tab"
          className="h-7 px-2 hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 hover:border-blue-200 border border-transparent transition-all duration-200"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          <span className="text-xs">Add Tab</span>
          <ChevronDown className="w-2.5 h-2.5 ml-1 transition-transform duration-200" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-0 shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
        {/* Search Header */}
        <div className="p-3 border-b bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
          <Input
            placeholder="Search features..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
            data-testid="input-search-features"
            autoFocus
          />
        </div>

        {/* Features List */}
        <ScrollArea className="h-[420px]">
          <div className="p-2">
            {search === "" && (
              <>
                {/* Files Section - Always visible at top */}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Files
                </div>
                
                <button
                  onClick={() => handleSelectFeature("files")}
                  className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/40 dark:hover:to-purple-950/40 hover:shadow-sm transition-all duration-150 flex items-center gap-3 group mb-3"
                  data-testid="button-open-files"
                >
                  <FolderOpen className="w-4 h-4 flex-shrink-0 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">Open files</div>
                    <div className="text-xs text-muted-foreground">Browse project files</div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </>
            )}

            {/* Grouped Features */}
            {categories.map((category) => {
              const features = groupedFeatures[category];
              if (features.length === 0) return null;
              
              return (
                <div key={category} className="mb-2">
                  {search === "" && (
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {category}
                    </div>
                  )}
                  {features.map((feature) => (
                    <button
                      key={feature.id}
                      onClick={() => handleSelectFeature(feature.id)}
                      data-testid={`feature-${feature.id}`}
                      className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/40 dark:hover:to-purple-950/40 hover:shadow-sm transition-all duration-200 flex items-center gap-3 group"
                    >
                      <span className="text-lg flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
                        {feature.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium flex items-center gap-2">
                          {feature.label}
                          {feature.badge && (
                            <Badge variant="secondary" className="h-4 text-xs px-1.5">
                              {feature.badge}
                            </Badge>
                          )}
                        </div>
                        {feature.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {feature.description}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  ))}
                </div>
              );
            })}

            {/* No Results */}
            {filteredFeatures.length === 0 && search !== "" && (
              <div className="p-8 text-center text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No features found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Footer */}
        <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground text-center">
          {filteredFeatures.length} feature{filteredFeatures.length !== 1 ? 's' : ''} available
          {search && ` matching "${search}"`}
        </div>
      </PopoverContent>
    </Popover>
  );
}
