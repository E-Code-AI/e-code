import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
Activity,
Cpu,
GitBranch,
MemoryStick,
Settings,
Users,
Volume2,
VolumeX,
Wifi,
WifiOff
} from 'lucide-react';
import { useEffect,useMemo,useState } from 'react';

interface StatusBarItem {
  id: string;
  icon: React.ReactNode;
  text: string;
  status?: 'idle' | 'running' | 'error' | 'success';
  onClick?: () => void;
  tooltip?: string;
}

interface ReplitStatusBarProps {
  projectName?: string;
  gitBranch?: string;
  isConnected?: boolean;
  isRunning?: boolean;
  collaborators?: number;
  language?: string;
  lineCount?: number;
  columnCount?: number;
  encoding?: string;
  className?: string;
}

export function ReplitStatusBar({
  projectName,
  gitBranch = 'main',
  isConnected = true,
  isRunning = false,
  collaborators = 0,
  language = 'JavaScript',
  lineCount = 1,
  columnCount = 1,
  encoding = 'UTF-8',
  className
}: ReplitStatusBarProps) {
  const [metrics, setMetrics] = useState<{
    capacity?: { utilizationPercent?: number; current?: number; maximum?: number };
    health?: { status?: string; message?: string };
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadMetrics = async () => {
      try {
        const response = await fetch('/api/terminal/metrics?limit=1', { credentials: 'include' });
        if (!response.ok) throw new Error(`metrics ${response.status}`);
        const payload = await response.json();
        if (!cancelled) setMetrics(payload.metrics ?? null);
      } catch {
        if (!cancelled) setMetrics(null);
      }
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 10_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const terminalUtilization = metrics?.capacity?.utilizationPercent;
  const terminalSessions = useMemo(() => {
    const current = metrics?.capacity?.current;
    const maximum = metrics?.capacity?.maximum;
    return typeof current === 'number' && typeof maximum === 'number'
      ? `${current}/${maximum}`
      : 'Unavailable';
  }, [metrics]);

  const leftItems: StatusBarItem[] = [
    {
      id: 'connection',
      icon: isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />,
      text: isConnected ? 'Connected' : 'Offline',
      status: isConnected ? 'success' : 'error',
      tooltip: isConnected ? 'Connected to E-Code servers' : 'Connection lost'
    },
    {
      id: 'git',
      icon: <GitBranch className="h-3 w-3" />,
      text: gitBranch,
      status: 'idle',
      tooltip: `Current branch: ${gitBranch}`
    },
    ...(isRunning ? [{
      id: 'running',
      icon: <Activity className="h-3 w-3 animate-pulse" />,
      text: 'Running',
      status: 'running' as const,
      tooltip: 'Project is currently running'
    }] : []),
    ...(collaborators > 0 ? [{
      id: 'collaborators',
      icon: <Users className="h-3 w-3" />,
      text: `${collaborators}`,
      status: 'idle' as const,
      tooltip: `${collaborators} collaborator${collaborators !== 1 ? 's' : ''} online`
    }] : [])
  ];

  const rightItems: StatusBarItem[] = [
    {
      id: 'position',
      icon: <></>,
      text: `Ln ${lineCount}, Col ${columnCount}`,
      tooltip: 'Current cursor position'
    },
    {
      id: 'language',
      icon: <></>,
      text: language,
      tooltip: `Language: ${language}`
    },
    {
      id: 'encoding',
      icon: <></>,
      text: encoding,
      tooltip: `File encoding: ${encoding}`
    },
    {
      id: 'cpu',
      icon: <Cpu className="h-3 w-3" />,
      text: typeof terminalUtilization === 'number' ? `${terminalUtilization.toFixed(0)}%` : 'N/A',
      status: typeof terminalUtilization === 'number'
        ? terminalUtilization > 85 ? 'error' : terminalUtilization > 70 ? 'running' : 'success'
        : 'idle',
      tooltip: metrics?.health?.message || 'Terminal capacity metrics unavailable'
    },
    {
      id: 'memory',
      icon: <MemoryStick className="h-3 w-3" />,
      text: terminalSessions,
      status: metrics?.health?.status === 'warning' ? 'running' : metrics ? 'success' : 'idle',
      tooltip: metrics
        ? `Terminal sessions: ${terminalSessions}`
        : 'Terminal session metrics unavailable'
    },
    {
      id: 'sound',
      icon: soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />,
      text: '',
      onClick: () => setSoundEnabled(!soundEnabled),
      tooltip: soundEnabled ? 'Sound enabled' : 'Sound disabled'
    }
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'running':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-[var(--ecode-text-secondary)]';
    }
  };

  const StatusItem = ({ item }: { item: StatusBarItem }) => (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-6 px-2 text-[11px] rounded-none hover:bg-[var(--ecode-sidebar-hover)] transition-colors",
        getStatusColor(item.status)
      )}
      onClick={item.onClick}
      title={item.tooltip}
    >
      <div className="flex items-center gap-1">
        {item.icon}
        {item.text && <span>{item.text}</span>}
      </div>
    </Button>
  );

  return (
    <div className={cn(
      "h-6 bg-[var(--ecode-surface)] border-t border-[var(--ecode-border)] flex items-center justify-between px-1 text-[11px]",
      className
    )}>
      {/* Left side items */}
      <div className="flex items-center">
        {leftItems.map((item) => (
          <StatusItem key={item.id} item={item} />
        ))}
      </div>

      {/* Center - Project info */}
      {projectName && (
        <div className="flex items-center px-2">
          <span className="text-[var(--ecode-text)] font-medium truncate max-w-[200px]">
            {projectName}
          </span>
        </div>
      )}

      {/* Right side items */}
      <div className="flex items-center">
        {rightItems.map((item) => (
          <StatusItem key={item.id} item={item} />
        ))}
        
        {/* Settings button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-none hover:bg-[var(--ecode-sidebar-hover)] text-[var(--ecode-text-secondary)]"
          title="Settings"
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}