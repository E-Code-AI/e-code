import { useState, useEffect, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Zap,
  TestTube2,
  Video,
  ChevronDown,
  Settings2,
  Clock,
  PlayCircle,
  Brain,
  Sparkles,
  Globe,
  Loader2,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentTools, type AgentToolsSettings } from '@/hooks/useAgentTools';

interface AgentToolsPanelProps {
  projectId?: number;
  onViewVideoReplays?: () => void;
  className?: string;
  settings?: AgentToolsSettings;
  onSettingsChange?: (settings: AgentToolsSettings) => void;
  videoReplayCount?: number;
  compact?: boolean;
}

const STORAGE_KEY = 'agent-tools-panel-collapsed';

export function AgentToolsPanel({
  projectId,
  onViewVideoReplays,
  className,
  settings: externalSettings,
  onSettingsChange,
  videoReplayCount: externalVideoReplayCount,
  compact = false,
}: AgentToolsPanelProps) {
  // Initialize from localStorage, default to open unless compact mode
  const [isOpen, setIsOpen] = useState(() => {
    if (compact) return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return stored === 'open';
      }
    } catch (e) {
      // localStorage not available
    }
    return true; // default open
  });
  
  const [localSettings, setLocalSettings] = useState<AgentToolsSettings>({
    maxAutonomy: false,
    appTesting: true,
    extendedThinking: false,
    highPowerModels: false,
    webSearch: true,
  });
  
  // Persist collapsed state to localStorage
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    try {
      localStorage.setItem(STORAGE_KEY, open ? 'open' : 'collapsed');
    } catch (e) {
      // localStorage not available
    }
  }, []);

  const hookData = useAgentTools(projectId);
  
  const {
    settings: hookSettings,
    updateSettings: hookUpdateSettings,
    isUpdating,
    isLoadingPreferences,
    videoReplayCount: hookVideoReplayCount,
    effectiveModel,
    effectiveModelInfo,
    toolsStatus,
    isLoadingToolsStatus,
    testSessionCount,
  } = hookData;
  
  const settings = externalSettings || hookSettings;
  const updateSettings = onSettingsChange || hookUpdateSettings;
  const videoReplayCount = externalVideoReplayCount ?? hookVideoReplayCount;

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleToggle = useCallback((key: keyof AgentToolsSettings) => {
    const newSettings = {
      ...localSettings,
      [key]: !localSettings[key]
    };
    setLocalSettings(newSettings);
    
    // All toggles now go through updateSettings which handles
    // local vs persisted toggles internally
    updateSettings(newSettings);
  }, [localSettings, updateSettings]);

  const activeCount = Object.values(localSettings).filter(Boolean).length;

  if (isLoadingPreferences) {
    return (
      <div className={cn("bg-card border rounded-lg p-4", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="w-10 h-5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card border rounded-lg", className)}>
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-3 min-h-[44px] hover:bg-muted/50"
            data-testid="agent-tools-trigger"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Agent Tools</span>
              {activeCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {activeCount} active
                </Badge>
              )}
              {isUpdating && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              )}
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            <Separator />

            {/* Current Model Indicator */}
            {effectiveModelInfo && (
              <div className="flex items-center justify-between py-1 px-2 bg-muted/30 rounded-md">
                <span className="text-[11px] text-muted-foreground">Active model:</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {effectiveModelInfo.name}
                </Badge>
              </div>
            )}
            
            {/* Max Autonomy Toggle - Replit Agent 3 */}
            <div className="flex items-start justify-between gap-3 py-2 min-h-[44px]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label 
                      htmlFor="max-autonomy" 
                      className="font-medium text-sm cursor-pointer"
                    >
                      Max autonomy
                    </Label>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                      Beta
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Agent will supervise itself, so you don't have to (runs up to 200 minutes)
                  </p>
                  {localSettings.maxAutonomy && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        Extended session enabled
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Switch
                id="max-autonomy"
                checked={localSettings.maxAutonomy}
                onCheckedChange={() => handleToggle('maxAutonomy')}
                data-testid="toggle-max-autonomy"
                className="data-[state=checked]:bg-amber-500"
              />
            </div>

            <Separator />

            {/* App Testing Toggle - Replit Agent 3 (ON by default) */}
            <div className="flex items-start justify-between gap-3 py-2 min-h-[44px]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                  <TestTube2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-0.5">
                  <Label 
                    htmlFor="app-testing" 
                    className="font-medium text-sm cursor-pointer"
                  >
                    App testing
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Agent tests itself using an actual browser, navigating through your app like a real user
                  </p>
                  {localSettings.appTesting && videoReplayCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-[44px] px-3 mt-1 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      onClick={onViewVideoReplays}
                      data-testid="view-video-replays"
                    >
                      <Video className="w-3 h-3 mr-1" />
                      View {videoReplayCount} recording{videoReplayCount !== 1 ? 's' : ''}
                    </Button>
                  )}
                </div>
              </div>
              <Switch
                id="app-testing"
                checked={localSettings.appTesting}
                onCheckedChange={() => handleToggle('appTesting')}
                data-testid="toggle-app-testing"
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>

            <Separator />

            {/* Extended Thinking Toggle - Replit Advanced Options */}
            <div className="flex items-start justify-between gap-3 py-2 min-h-[44px]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                  <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="space-y-0.5">
                  <Label 
                    htmlFor="extended-thinking" 
                    className="font-medium text-sm cursor-pointer"
                  >
                    Extended thinking
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Deeper reasoning for harder problems
                  </p>
                  {localSettings.extendedThinking && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Brain className="w-3 h-3 text-purple-500 animate-pulse" />
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                        Deep reasoning active
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Switch
                id="extended-thinking"
                checked={localSettings.extendedThinking}
                onCheckedChange={() => handleToggle('extendedThinking')}
                data-testid="toggle-extended-thinking"
                disabled={isUpdating}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>

            <Separator />

            {/* High Power Models Toggle - Replit Advanced Options */}
            <div className="flex items-start justify-between gap-3 py-2 min-h-[44px]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="space-y-0.5">
                  <Label 
                    htmlFor="high-power-models" 
                    className="font-medium text-sm cursor-pointer"
                  >
                    High power models
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Uses more sophisticated AI for performance optimizations, integrations, unfamiliar tech
                  </p>
                  {localSettings.highPowerModels && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Sparkles className="w-3 h-3 text-orange-500" />
                      <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                        Premium models enabled
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Switch
                id="high-power-models"
                checked={localSettings.highPowerModels}
                onCheckedChange={() => handleToggle('highPowerModels')}
                data-testid="toggle-high-power-models"
                disabled={isUpdating}
                className="data-[state=checked]:bg-orange-500"
              />
            </div>

            <Separator />

            {/* Web Search Toggle - Replit Advanced Options */}
            <div className="flex items-start justify-between gap-3 py-2 min-h-[44px]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-0.5">
                  <Label 
                    htmlFor="web-search" 
                    className="font-medium text-sm cursor-pointer"
                  >
                    Web search
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Agent searches the web for up-to-date docs and APIs
                  </p>
                  {localSettings.webSearch && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Globe className="w-3 h-3 text-blue-500" />
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        Live search enabled
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Switch
                id="web-search"
                checked={localSettings.webSearch}
                onCheckedChange={() => handleToggle('webSearch')}
                data-testid="toggle-web-search"
                disabled={isUpdating}
                className="data-[state=checked]:bg-blue-500"
              />
            </div>

            {/* Video Replays Quick Access */}
            {videoReplayCount > 0 && (
              <>
                <Separator />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full min-h-[44px] text-xs"
                  onClick={onViewVideoReplays}
                  data-testid="open-video-replays"
                >
                  <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                  View all test recordings ({videoReplayCount})
                </Button>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Re-export types for convenience
export type { AgentToolsSettings };
