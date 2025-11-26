import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  Gauge,
  Clock,
  PlayCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentToolsSettings {
  maxAutonomy: boolean;
  appTesting: boolean;
  fastMode: boolean;
}

interface AgentToolsPanelProps {
  settings: AgentToolsSettings;
  onSettingsChange: (settings: AgentToolsSettings) => void;
  onViewVideoReplays?: () => void;
  videoReplayCount?: number;
  className?: string;
}

export function AgentToolsPanel({
  settings,
  onSettingsChange,
  onViewVideoReplays,
  videoReplayCount = 0,
  className
}: AgentToolsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleToggle = (key: keyof AgentToolsSettings) => {
    onSettingsChange({
      ...settings,
      [key]: !settings[key]
    });
  };

  return (
    <div className={cn("bg-card border rounded-lg", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
            data-testid="agent-tools-trigger"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Agent Tools</span>
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
            
            {/* Max Autonomy Toggle - Replit Style */}
            <div className="flex items-start justify-between gap-3 py-2">
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
                    Agent works for much longer with minimal supervision (up to 200 minutes)
                  </p>
                  {settings.maxAutonomy && (
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
                checked={settings.maxAutonomy}
                onCheckedChange={() => handleToggle('maxAutonomy')}
                data-testid="toggle-max-autonomy"
                className="data-[state=checked]:bg-amber-500"
              />
            </div>

            <Separator />

            {/* App Testing Toggle - Replit Style */}
            <div className="flex items-start justify-between gap-3 py-2">
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
                  {settings.appTesting && videoReplayCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
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
                checked={settings.appTesting}
                onCheckedChange={() => handleToggle('appTesting')}
                data-testid="toggle-app-testing"
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>

            <Separator />

            {/* Fast Mode Toggle - New Nov 2025 */}
            <div className="flex items-start justify-between gap-3 py-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                  <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label 
                      htmlFor="fast-mode" 
                      className="font-medium text-sm cursor-pointer"
                    >
                      Fast mode
                    </Label>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      5x faster
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    Instant, precise control for targeted changes
                  </p>
                </div>
              </div>
              <Switch
                id="fast-mode"
                checked={settings.fastMode}
                onCheckedChange={() => handleToggle('fastMode')}
                data-testid="toggle-fast-mode"
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
                  className="w-full h-9 text-xs"
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

export type { AgentToolsSettings };
