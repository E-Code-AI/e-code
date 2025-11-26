import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Brain,
  Sparkles,
  Globe,
  MousePointer2,
  Coins,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatToolbarProps {
  extendedThinking: boolean;
  highPowerModels: boolean;
  webSearch: boolean;
  onToggleExtendedThinking: () => void;
  onToggleHighPowerModels: () => void;
  onToggleWebSearch: () => void;
  onToggleElementSelector?: () => void;
  elementSelectorActive?: boolean;
  isUpdating?: boolean;
  credits?: number;
  onOpenUsage?: () => void;
  className?: string;
}

export function ChatToolbar({
  extendedThinking,
  highPowerModels,
  webSearch,
  onToggleExtendedThinking,
  onToggleHighPowerModels,
  onToggleWebSearch,
  onToggleElementSelector,
  elementSelectorActive = false,
  isUpdating = false,
  credits,
  onOpenUsage,
  className,
}: ChatToolbarProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted/50 border",
        className
      )}
      data-testid="chat-toolbar"
    >
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={extendedThinking ? "default" : "ghost"}
              size="sm"
              onClick={onToggleExtendedThinking}
              disabled={isUpdating}
              className={cn(
                "h-8 w-8 p-0",
                extendedThinking && "bg-purple-600 hover:bg-purple-700 text-white"
              )}
              data-testid="toolbar-extended-thinking"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="font-medium">Extended Thinking</p>
            <p className="text-xs text-muted-foreground">
              Deeper reasoning for harder problems
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={highPowerModels ? "default" : "ghost"}
              size="sm"
              onClick={onToggleHighPowerModels}
              disabled={isUpdating}
              className={cn(
                "h-8 w-8 p-0",
                highPowerModels && "bg-orange-500 hover:bg-orange-600 text-white"
              )}
              data-testid="toolbar-high-power"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="font-medium">High Power Mode</p>
            <p className="text-xs text-muted-foreground">
              Use sophisticated AI for complex tasks
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={webSearch ? "default" : "ghost"}
              size="sm"
              onClick={onToggleWebSearch}
              disabled={isUpdating}
              className={cn(
                "h-8 w-8 p-0",
                webSearch && "bg-blue-500 hover:bg-blue-600 text-white"
              )}
              data-testid="toolbar-web-search"
            >
              <Globe className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="font-medium">Web Search</p>
            <p className="text-xs text-muted-foreground">
              Search for up-to-date docs and APIs
            </p>
          </TooltipContent>
        </Tooltip>

        {onToggleElementSelector && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={elementSelectorActive ? "default" : "ghost"}
                size="sm"
                onClick={onToggleElementSelector}
                className={cn(
                  "h-8 w-8 p-0",
                  elementSelectorActive && "bg-violet-600 hover:bg-violet-700 text-white"
                )}
                data-testid="toolbar-element-selector"
              >
                <MousePointer2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="font-medium">Element Selector</p>
              <p className="text-xs text-muted-foreground">
                Click any element to edit it visually
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="h-4 w-px bg-border mx-1" />

        {credits !== undefined && onOpenUsage && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenUsage}
                className="h-8 gap-1.5 px-2 text-xs"
                data-testid="toolbar-usage"
              >
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-medium">{credits.toLocaleString()}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-medium">Credits remaining</p>
              <p className="text-xs text-muted-foreground">Click to view usage</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
}

export function ChatToolbarMobile({
  extendedThinking,
  highPowerModels,
  webSearch,
  onToggleExtendedThinking,
  onToggleHighPowerModels,
  onToggleWebSearch,
  isUpdating = false,
  className,
}: Omit<ChatToolbarProps, 'onToggleElementSelector' | 'elementSelectorActive' | 'credits' | 'onOpenUsage'>) {
  return (
    <div 
      className={cn(
        "flex items-center justify-center gap-2 py-2",
        className
      )}
      data-testid="chat-toolbar-mobile"
    >
      <Button
        variant={extendedThinking ? "default" : "outline"}
        size="sm"
        onClick={onToggleExtendedThinking}
        disabled={isUpdating}
        className={cn(
          "h-10 min-h-[44px] gap-1.5 px-3",
          extendedThinking && "bg-purple-600 hover:bg-purple-700"
        )}
        data-testid="toolbar-mobile-thinking"
      >
        <Brain className="h-4 w-4" />
        <span className="text-xs">Think</span>
      </Button>

      <Button
        variant={highPowerModels ? "default" : "outline"}
        size="sm"
        onClick={onToggleHighPowerModels}
        disabled={isUpdating}
        className={cn(
          "h-10 min-h-[44px] gap-1.5 px-3",
          highPowerModels && "bg-orange-500 hover:bg-orange-600"
        )}
        data-testid="toolbar-mobile-power"
      >
        <Sparkles className="h-4 w-4" />
        <span className="text-xs">Power</span>
      </Button>

      <Button
        variant={webSearch ? "default" : "outline"}
        size="sm"
        onClick={onToggleWebSearch}
        disabled={isUpdating}
        className={cn(
          "h-10 min-h-[44px] gap-1.5 px-3",
          webSearch && "bg-blue-500 hover:bg-blue-600"
        )}
        data-testid="toolbar-mobile-search"
      >
        <Globe className="h-4 w-4" />
        <span className="text-xs">Search</span>
      </Button>
    </div>
  );
}

export default ChatToolbar;
