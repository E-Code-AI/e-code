/**
 * ToolsPanel - Lateral panel for discovering and accessing IDE tools
 * 
 * Provides a searchable, categorized view of all available tools
 * with descriptions, icons, and quick access
 */

import { useState } from 'react';
import { Search, X, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { TOOL_REGISTRY, getAllCategories, type ToolMetadata } from '@/lib/tool-registry';
import { cn } from '@/lib/utils';

interface ToolsPanelProps {
  availableTools: { id: string; label: string; icon: string }[];
  onSelectTool: (toolId: string) => void;
  activeTabs: string[];
  onClose?: () => void;
}

export function ToolsPanel({ 
  availableTools, 
  onSelectTool, 
  activeTabs,
  onClose 
}: ToolsPanelProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Development', 'Tools']) // Default expanded
  );

  // Get only tools that are actually available in the IDE
  const availableToolIds = new Set(availableTools.map(t => t.id));
  const allTools = Object.values(TOOL_REGISTRY)
    .filter(tool => availableToolIds.has(tool.id));

  // Filter tools based on search
  const filteredTools = search
    ? allTools.filter(tool =>
        tool.label.toLowerCase().includes(search.toLowerCase()) ||
        tool.description.toLowerCase().includes(search.toLowerCase()) ||
        tool.keywords?.some(k => k.toLowerCase().includes(search.toLowerCase()))
      )
    : allTools;

  // Group by category
  const categories = getAllCategories();
  const groupedTools = categories.reduce((acc, category) => {
    const tools = filteredTools.filter(t => t.category === category);
    if (tools.length > 0) {
      acc[category] = tools;
    }
    return acc;
  }, {} as Record<string, ToolMetadata[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleToolClick = (toolId: string) => {
    onSelectTool(toolId);
  };

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50/30 to-purple-50/30 dark:from-blue-950/20 dark:to-purple-950/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold">Tools</h2>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
              data-testid="button-close-tools-panel"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 pr-8 text-sm"
            data-testid="input-search-tools"
          />
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearch('')}
              className="absolute right-1 top-1 h-6 w-6 p-0 hover:bg-transparent"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Tools List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(groupedTools).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Sparkles className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No tools found</p>
              <p className="text-xs mt-1">Try a different search</p>
            </div>
          ) : (
            Object.entries(groupedTools).map(([category, tools]) => (
              <Collapsible
                key={category}
                open={expandedCategories.has(category)}
                onOpenChange={() => toggleCategory(category)}
                className="mb-2"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-accent transition-colors">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {category}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="h-4 text-xs px-1.5">
                      {tools.length}
                    </Badge>
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-1 space-y-0.5">
                  {tools.map((tool) => {
                    const IconComponent = tool.icon;
                    const isActive = activeTabs.includes(tool.id);
                    
                    return (
                      <button
                        key={tool.id}
                        onClick={() => handleToolClick(tool.id)}
                        data-testid={`tool-${tool.id}`}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-md transition-all duration-150 flex items-start gap-3 group",
                          isActive
                            ? "bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 shadow-sm"
                            : "hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/30 dark:hover:to-purple-950/30"
                        )}
                      >
                        <IconComponent
                          className={cn(
                            "w-4 h-4 flex-shrink-0 mt-0.5 transition-all duration-200",
                            isActive
                              ? "text-blue-600 dark:text-blue-400 scale-110"
                              : "text-blue-600/70 dark:text-blue-400/70 group-hover:scale-110"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={cn(
                              "text-sm font-medium truncate",
                              isActive && "font-semibold"
                            )}>
                              {tool.label}
                            </span>
                            {tool.badge && (
                              <Badge 
                                variant={tool.badge === 'PRO' ? 'default' : 'secondary'}
                                className="h-4 text-xs px-1.5 flex-shrink-0"
                              >
                                {tool.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {tool.description}
                          </p>
                        </div>
                        {isActive && (
                          <div className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 flex-shrink-0 mt-2" />
                        )}
                      </button>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''} available
          </span>
          {activeTabs.length > 0 && (
            <span>{activeTabs.length} active</span>
          )}
        </div>
      </div>
    </div>
  );
}
