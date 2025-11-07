import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  GitBranch,
  AlertCircle,
  AlertTriangle,
  Info,
  Settings,
  Bell,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface ReplitStatusBarProps {
  // File/Editor info
  language?: string;
  lineNumber?: number;
  columnNumber?: number;
  encoding?: string;
  
  // Git info
  gitBranch?: string;
  hasGitChanges?: boolean;
  
  // Problems
  errorCount?: number;
  warningCount?: number;
  infoCount?: number;
  
  // Connection status
  isConnected?: boolean;
  
  // Callbacks
  onProblemsClick?: () => void;
  onGitClick?: () => void;
  onSettingsClick?: () => void;
  onNotificationsClick?: () => void;
  
  className?: string;
}

export function ReplitStatusBar({
  language = 'plaintext',
  lineNumber = 1,
  columnNumber = 1,
  encoding = 'UTF-8',
  gitBranch,
  hasGitChanges = false,
  errorCount = 0,
  warningCount = 0,
  infoCount = 0,
  isConnected = true,
  onProblemsClick,
  onGitClick,
  onSettingsClick,
  onNotificationsClick,
  className,
}: ReplitStatusBarProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={cn(
        "h-7 bg-[var(--ecode-surface)] border-t border-[var(--ecode-border)] flex items-center justify-between px-3 flex-shrink-0 text-xs font-[family-name:var(--ecode-font-sans)]",
        className
      )}
      data-testid="status-bar"
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Git Branch */}
        {gitBranch && (
          <button
            onClick={onGitClick}
            className="flex items-center gap-1.5 hover:bg-[var(--ecode-sidebar-hover)] px-1.5 py-0.5 rounded transition-colors"
            data-testid="status-bar-git"
          >
            <GitBranch className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)]" />
            <span className="text-[var(--ecode-text)]">{gitBranch}</span>
            {hasGitChanges && (
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            )}
          </button>
        )}

        {/* Problems Counter */}
        {(errorCount > 0 || warningCount > 0 || infoCount > 0) && (
          <button
            onClick={onProblemsClick}
            className="flex items-center gap-2 hover:bg-[var(--ecode-sidebar-hover)] px-1.5 py-0.5 rounded transition-colors"
            data-testid="status-bar-problems"
          >
            {errorCount > 0 && (
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-[var(--ecode-text)]">{errorCount}</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                <span className="text-[var(--ecode-text)]">{warningCount}</span>
              </div>
            )}
            {infoCount > 0 && (
              <div className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-[var(--ecode-text)]">{infoCount}</span>
              </div>
            )}
          </button>
        )}

        {/* Connection Status */}
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-default">
              {isConnected ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-[var(--ecode-text-secondary)]">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-red-500">Disconnected</span>
                </>
              )}
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="top" className="w-60">
            <div className="text-xs space-y-1">
              <p className="font-semibold">Connection Status</p>
              <p className="text-[var(--ecode-text-secondary)]">
                {isConnected
                  ? 'Real-time collaboration and auto-save are active'
                  : 'Connection lost. Changes may not be saved.'}
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* File Position */}
        <div className="flex items-center gap-3 text-[var(--ecode-text-secondary)]">
          <span>Ln {lineNumber}, Col {columnNumber}</span>
          <span className="uppercase">{language}</span>
          <span>{encoding}</span>
        </div>

        {/* Performance Indicator */}
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="flex items-center gap-1 cursor-default">
              <Zap className="h-3.5 w-3.5 text-yellow-500" />
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="top" className="w-48">
            <div className="text-xs space-y-1">
              <p className="font-semibold">Performance</p>
              <p className="text-[var(--ecode-text-secondary)]">
                Editor is running smoothly
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>

        {/* Notifications */}
        <button
          onClick={onNotificationsClick}
          className="hover:bg-[var(--ecode-sidebar-hover)] p-1 rounded transition-colors"
          data-testid="status-bar-notifications"
        >
          <Bell className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)]" />
        </button>

        {/* Settings */}
        <button
          onClick={onSettingsClick}
          className="hover:bg-[var(--ecode-sidebar-hover)] p-1 rounded transition-colors"
          data-testid="status-bar-settings"
        >
          <Settings className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)]" />
        </button>

        {/* Time */}
        <span className="text-[var(--ecode-text-secondary)] tabular-nums">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
