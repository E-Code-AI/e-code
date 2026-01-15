import { useState, useCallback, memo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  Infinity, 
  TestTube2, 
  Globe, 
  Image, 
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentToolsSettings } from '@/hooks/useAgentTools';

type AutonomyLevel = 'low' | 'medium' | 'high' | 'max';
type AgentMode = 'fast' | 'autonomous';
type SheetView = 'main' | 'other';

interface AgentToolsBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AgentToolsSettings;
  onSettingsChange: (settings: AgentToolsSettings) => void;
  className?: string;
}

const AUTONOMY_LEVELS: { level: AutonomyLevel; label: string }[] = [
  { level: 'low', label: 'Low' },
  { level: 'medium', label: 'Medium' },
  { level: 'high', label: 'High' },
  { level: 'max', label: 'Max' },
];

const AUTONOMY_FEATURES = [
  'Generates and executes on task lists',
  'Reviews latest code changes and fixes issues found',
  'Expands review scope to entire app',
  'Plans and completes new work independently',
];

export const AgentToolsBottomSheet = memo(function AgentToolsBottomSheet({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  className,
}: AgentToolsBottomSheetProps) {
  const [view, setView] = useState<SheetView>('main');
  const [agentMode, setAgentMode] = useState<AgentMode>(settings.maxAutonomy ? 'autonomous' : 'fast');
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>(
    settings.maxAutonomy ? 'max' : 'medium'
  );

  const handleAgentModeChange = useCallback((mode: AgentMode) => {
    setAgentMode(mode);
    if (mode === 'fast') {
      onSettingsChange({ ...settings, maxAutonomy: false });
    } else if (mode === 'autonomous' && autonomyLevel === 'max') {
      onSettingsChange({ ...settings, maxAutonomy: true });
    }
  }, [settings, onSettingsChange, autonomyLevel]);

  const handleAutonomyLevelChange = useCallback((level: AutonomyLevel) => {
    setAutonomyLevel(level);
    if (agentMode === 'autonomous') {
      onSettingsChange({ ...settings, maxAutonomy: level === 'max' });
    }
  }, [settings, onSettingsChange, agentMode]);

  const handleAppTestingToggle = useCallback((checked: boolean) => {
    onSettingsChange({ ...settings, appTesting: checked });
  }, [settings, onSettingsChange]);

  const handleWebSearchToggle = useCallback((checked: boolean) => {
    onSettingsChange({ ...settings, webSearch: checked });
  }, [settings, onSettingsChange]);

  const handleMediaGenerationToggle = useCallback((checked: boolean) => {
    onSettingsChange({ ...settings, highPowerModels: checked });
  }, [settings, onSettingsChange]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => setView('main'), 300);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className={cn(
          "rounded-t-2xl max-h-[85vh] overflow-hidden",
          className
        )}
      >
        {view === 'main' ? (
          <div className="space-y-4 pb-6">
            <SheetHeader className="text-left pb-2">
              <SheetTitle className="text-base font-semibold text-foreground">
                Agent Tools
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-3">
              <div
                onClick={() => handleAgentModeChange('fast')}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                  agentMode === 'fast' 
                    ? "border-primary/30 bg-primary/5" 
                    : "border-border hover:bg-muted/50"
                )}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAgentModeChange('fast'); }}
                data-testid="agent-mode-fast"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    agentMode === 'fast' ? "border-primary" : "border-muted-foreground/40"
                  )}>
                    {agentMode === 'fast' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-[13px] text-foreground">Fast</div>
                    <div className="text-[11px] text-muted-foreground">Make lightweight changes, quickly</div>
                  </div>
                </div>
                <Zap className="w-5 h-5 text-muted-foreground" />
              </div>

              <div
                className={cn(
                  "rounded-xl border transition-all",
                  agentMode === 'autonomous' 
                    ? "border-primary/30 bg-primary/5" 
                    : "border-border"
                )}
              >
                <div
                  onClick={() => handleAgentModeChange('autonomous')}
                  className="flex items-center justify-between p-4 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAgentModeChange('autonomous'); }}
                  data-testid="agent-mode-autonomous"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      agentMode === 'autonomous' ? "border-primary" : "border-muted-foreground/40"
                    )}>
                      {agentMode === 'autonomous' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-[13px] text-foreground">Autonomous</div>
                      <div className="text-[11px] text-muted-foreground">Control Agent's level of autonomy</div>
                    </div>
                  </div>
                  <Infinity className="w-5 h-5 text-muted-foreground" />
                </div>

                {agentMode === 'autonomous' && (
                  <div className="px-4 pb-4 space-y-4">
                    <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
                      {AUTONOMY_LEVELS.map(({ level, label }) => (
                        <button
                          key={level}
                          onClick={() => handleAutonomyLevelChange(level)}
                          className={cn(
                            "flex-1 py-2 px-3 text-[11px] font-medium rounded-md transition-all",
                            autonomyLevel === level
                              ? "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-l-2 border-amber-500"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                          data-testid={`autonomy-level-${level}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      Long-running, hands-off building experience
                    </div>

                    <div className="space-y-2">
                      {AUTONOMY_FEATURES.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-[11px] text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <TestTube2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-[13px] text-foreground">App testing</span>
                      </div>
                      <Switch
                        checked={settings.appTesting}
                        onCheckedChange={handleAppTestingToggle}
                        className="data-[state=checked]:bg-primary"
                        data-testid="toggle-app-testing"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[13px] text-muted-foreground">Other</span>
              <button
                onClick={() => setView('other')}
                className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-media-generation"
              >
                <span>Media generation</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-6">
            <SheetHeader className="text-left pb-2">
              <SheetTitle className="text-base font-semibold text-foreground">
                Agent Tools
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-[13px] text-foreground">Web search</div>
                    <div className="text-[11px] text-muted-foreground">Searches across the internet</div>
                  </div>
                </div>
                <Switch
                  checked={settings.webSearch}
                  onCheckedChange={handleWebSearchToggle}
                  className="data-[state=checked]:bg-primary"
                  data-testid="toggle-web-search"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Image className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-[13px] text-foreground">Media generation</div>
                    <div className="text-[11px] text-muted-foreground">Generates images and video with AI</div>
                  </div>
                </div>
                <Switch
                  checked={settings.highPowerModels}
                  onCheckedChange={handleMediaGenerationToggle}
                  className="data-[state=checked]:bg-primary"
                  data-testid="toggle-media-generation"
                />
              </div>

              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[13px] text-foreground">Looking for High Power Model?</span>
                      <button 
                        onClick={() => {}} 
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Agent now automatically leverages high power models wherever relevant, no longer requiring a manual toggle
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setView('main')}
              className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors pt-2"
              data-testid="button-back"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
});

export default AgentToolsBottomSheet;
