import { useState } from "react";
import { Plus, ChevronDown, FolderOpen, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TOOL_REGISTRY, type ToolMetadata } from "@/lib/tool-registry";

interface AddTabMenuProps {
  onAddTool: (toolId: string) => void;
  availableTools?: { id: string; label: string; icon: string }[];
}

export function AddTabMenu({ onAddTool, availableTools = [] }: AddTabMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Get only tools that are actually available in the IDE
  const availableToolIds = new Set(availableTools.map(t => t.id));
  const enhancedFeatures: ToolMetadata[] = Object.values(TOOL_REGISTRY)
    .filter(tool => availableToolIds.has(tool.id));

  const filteredFeatures = enhancedFeatures.filter((feature) =>
    feature.label.toLowerCase().includes(search.toLowerCase()) ||
    feature.category.toLowerCase().includes(search.toLowerCase()) ||
    feature.description.toLowerCase().includes(search.toLowerCase()) ||
    feature.keywords?.some(k => k.toLowerCase().includes(search.toLowerCase()))
  );

  // Group by category
  const categories = Array.from(new Set(filteredFeatures.map(f => f.category)));
  const groupedFeatures = categories.reduce((acc, category) => {
    acc[category] = filteredFeatures.filter(f => f.category === category);
    return acc;
  }, {} as Record<string, ToolMetadata[]>);

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
                  {features.map((feature) => {
                    const IconComponent = feature.icon;
                    return (
                      <button
                        key={feature.id}
                        onClick={() => handleSelectFeature(feature.id)}
                        data-testid={`feature-${feature.id}`}
                        className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/40 dark:hover:to-purple-950/40 hover:shadow-sm transition-all duration-200 flex items-center gap-3 group"
                      >
                        <IconComponent className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400 transition-transform duration-200 group-hover:scale-110" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium flex items-center gap-2">
                            {feature.label}
                            {feature.badge && (
                              <Badge variant="secondary" className="h-4 text-xs px-1.5">
                                {feature.badge}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {feature.description}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </button>
                    );
                  })}
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
