/**
 * AppNotReadyPlaceholder - Displays when app/schema is not yet ready
 * 
 * Shown in tabs (Preview, Deploy, Files) when the AI Agent is still
 * building or the schema is being warmed in the background.
 * 
 * Features:
 * - Context-aware messages per tab
 * - Progress indicator for schema warming
 * - Smooth animations
 * 
 * @author E-Code Platform
 * @version 1.0.0
 * @since December 2025
 */

import { memo, useCallback } from 'react';
import { 
  Monitor, 
  Rocket, 
  FolderOpen, 
  Loader2, 
  Sparkles,
  Database,
  Clock,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSchemaWarmingStore, getAppNotReadyMessage } from '@/stores/schemaWarmingStore';
import { useAutonomousBuildStore } from '@/stores/autonomousBuildStore';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AppNotReadyPlaceholderProps {
  tabName: 'preview' | 'deploy' | 'files' | string;
  className?: string;
  compact?: boolean;
  projectId?: string;
}

const tabIcons: Record<string, React.ElementType> = {
  preview: Monitor,
  deploy: Rocket,
  files: FolderOpen,
};

export const AppNotReadyPlaceholder = memo(function AppNotReadyPlaceholder({
  tabName,
  className,
  compact = false,
  projectId,
}: AppNotReadyPlaceholderProps) {
  const { progress, isWarming, isReady } = useSchemaWarmingStore();
  const Icon = tabIcons[tabName.toLowerCase()] || Sparkles;

  const { toast } = useToast();
  const buildPhase = useAutonomousBuildStore((s) => s.phase);
  const isBuildComplete = buildPhase === 'complete';
  const isPreviewTab = tabName.toLowerCase() === 'preview';
  const showRunButton = isPreviewTab && isBuildComplete && !isWarming && projectId;

  const handleRunPreview = useCallback(async () => {
    if (!projectId) return;
    try {
      await apiRequest('POST', `/api/preview/projects/${projectId}/preview/start`, {});
      useSchemaWarmingStore.getState().markReady();
    } catch (err) {
      console.error('[AppNotReady] Failed to start preview:', err);
      toast({
        title: 'Preview failed to start',
        description: 'There was an issue starting the preview. Unlocking the panel so you can retry.',
        variant: 'destructive',
      });
      useSchemaWarmingStore.getState().markReady();
    }
  }, [projectId, toast]);

  // If ready, don't show placeholder
  if (isReady) {
    return null;
  }

  const message = getAppNotReadyMessage(tabName, progress.status);
  const showProgress = isWarming && progress.progress > 0;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20",
        className
      )}>
        {isWarming ? (
          <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin flex-shrink-0" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
        )}
        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium leading-tight">
          {progress.message}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex-1 flex flex-col items-center justify-center p-6",
      "animate-fade-in",
      className
    )}>
      {/* Icon Container */}
      <div className={cn(
        "relative mb-4",
        isWarming && "animate-pulse"
      )}>
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center",
          "bg-gradient-to-br from-gray-100 to-gray-50",
          "dark:from-gray-800 dark:to-gray-900",
          "shadow-sm border border-gray-200/50 dark:border-gray-700/50"
        )}>
          <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
        
        {/* Warming indicator badge */}
        {isWarming && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
            <Database className="h-3 w-3 text-white animate-pulse" />
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5 text-center">
        {isWarming ? 'Preparing Your App' : showRunButton ? 'Ready to Preview' : 'App Not Ready Yet'}
      </h3>

      {/* Message - reduced font for mobile */}
      <p className="text-[11px] sm:text-[11px] text-gray-500 dark:text-gray-400 text-center max-w-[240px] leading-relaxed">
        {showRunButton
          ? 'Your workspace is ready. Click Run to see a preview.'
          : message.split('\n\n')[0]}
      </p>

      {/* Run Preview button when workspace is ready but preview hasn't started */}
      {showRunButton && (
        <Button
          size="sm"
          onClick={handleRunPreview}
          className="mt-4 gap-2"
        >
          <Play className="h-3.5 w-3.5" />
          Run Preview
        </Button>
      )}

      {/* Progress bar when warming */}
      {showProgress && (
        <div className="w-full max-w-[200px] mt-4 space-y-1.5">
          <Progress 
            value={progress.progress} 
            className="h-1.5"
          />
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              {progress.message}
            </span>
            <span>{progress.progress}%</span>
          </div>
        </div>
      )}

      {/* Schema preview if available */}
      {progress.schemaPreview && (
        <div className={cn(
          "mt-3 px-3 py-1.5 rounded-full",
          "bg-green-500/10 border border-green-500/20",
          "text-[10px] text-green-600 dark:text-green-400 font-medium"
        )}>
          {progress.schemaPreview}
        </div>
      )}
    </div>
  );
});

/**
 * Inline compact version for tab bars
 */
export const AppNotReadyBadge = memo(function AppNotReadyBadge({
  className,
}: { className?: string }) {
  const { isWarming, isReady, progress } = useSchemaWarmingStore();

  if (isReady || (!isWarming && progress.status === 'idle')) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-1 px-1.5 py-0.5 rounded",
      "bg-amber-500/20 text-amber-600 dark:text-amber-400",
      "text-[9px] font-semibold uppercase tracking-wide",
      className
    )}>
      <Loader2 className="h-2 w-2 animate-spin" />
      <span>Warming</span>
    </div>
  );
});
