import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, AlertTriangle, Info, CheckCircle, XCircle, Search, Filter, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SecurityScan, Vulnerability } from '@shared/schema';

interface ReplitSecurityPanelProps {
  projectId: string;
  className?: string;
}

interface WebSocketMessage {
  type: 'initial' | 'scan_update' | 'vulnerability_update' | 'error';
  scans?: SecurityScan[];
  vulnerabilities?: Vulnerability[];
  scan?: SecurityScan;
  vulnerability?: Vulnerability;
  message?: string;
}

export function ReplitSecurityPanel({ projectId, className }: ReplitSecurityPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedScan, setSelectedScan] = useState<SecurityScan | null>(null);
  const [realtimeScans, setRealtimeScans] = useState<SecurityScan[]>([]);
  const [realtimeVulnerabilities, setRealtimeVulnerabilities] = useState<Vulnerability[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial scans from REST API
  const { data: initialScans, refetch: refetchScans } = useQuery<SecurityScan[]>({
    queryKey: ['/api/workspace/projects', projectId, 'security-scans'],
    enabled: !!projectId,
    refetchInterval: 10000, // Fallback polling every 10s
  });

  // Fetch initial vulnerabilities from REST API
  const { data: initialVulnerabilities, refetch: refetchVulnerabilities } = useQuery<Vulnerability[]>({
    queryKey: ['/api/workspace/projects', projectId, 'vulnerabilities'],
    enabled: !!projectId,
    refetchInterval: 10000, // Fallback polling every 10s
  });

  // Use realtime data if available, fallback to initial data
  const scans = realtimeScans.length > 0 ? realtimeScans : (initialScans || []);
  const vulnerabilities = realtimeVulnerabilities.length > 0 ? realtimeVulnerabilities : (initialVulnerabilities || []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!projectId) return;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/security-scans/ws?projectId=${projectId}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[SecurityPanel] WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('[SecurityPanel] WebSocket message received:', message);

            switch (message.type) {
              case 'initial':
                if (message.scans) {
                  setRealtimeScans(message.scans);
                }
                if (message.vulnerabilities) {
                  setRealtimeVulnerabilities(message.vulnerabilities);
                }
                break;

              case 'scan_update':
                if (message.scan) {
                  setRealtimeScans(prev => {
                    const index = prev.findIndex(s => s.id === message.scan!.id);
                    if (index >= 0) {
                      const updated = [...prev];
                      updated[index] = message.scan!;
                      return updated;
                    }
                    return [message.scan!, ...prev];
                  });
                }
                break;

              case 'vulnerability_update':
                if (message.vulnerability) {
                  setRealtimeVulnerabilities(prev => {
                    const index = prev.findIndex(v => v.id === message.vulnerability!.id);
                    if (index >= 0) {
                      const updated = [...prev];
                      updated[index] = message.vulnerability!;
                      return updated;
                    }
                    return [message.vulnerability!, ...prev];
                  });
                }
                break;

              case 'error':
                console.error('[SecurityPanel] WebSocket error:', message.message);
                break;
            }
          } catch (error) {
            console.error('[SecurityPanel] Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[SecurityPanel] WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('[SecurityPanel] WebSocket disconnected');
          wsRef.current = null;

          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[SecurityPanel] Attempting to reconnect WebSocket...');
            connectWebSocket();
          }, 3000);
        };
      } catch (error) {
        console.error('[SecurityPanel] Error creating WebSocket:', error);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [projectId]);

  // Filter vulnerabilities based on search and severity
  const filteredVulnerabilities = vulnerabilities.filter(vuln => {
    const matchesSearch = searchQuery === '' || 
      vuln.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vuln.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vuln.filePath?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = selectedSeverity === 'all' || vuln.severity === selectedSeverity;

    return matchesSearch && matchesSeverity;
  });

  // Get severity counts
  const severityCounts = {
    all: vulnerabilities.length,
    critical: vulnerabilities.filter(v => v.severity === 'critical').length,
    high: vulnerabilities.filter(v => v.severity === 'high').length,
    medium: vulnerabilities.filter(v => v.severity === 'medium').length,
    low: vulnerabilities.filter(v => v.severity === 'low').length,
  };

  // Get severity icon and color
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-blue-500 bg-blue-500/10';
      case 'completed':
        return 'text-green-500 bg-green-500/10';
      case 'failed':
        return 'text-red-500 bg-red-500/10';
      case 'queued':
        return 'text-yellow-500 bg-yellow-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-[#1E1E1E] text-[#CCCCCC]', className)} data-testid="security-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2D2D2D]">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#E07B39]" />
          <span className="text-sm font-medium">Security Scanner</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#858585]">
          <span className={cn('px-2 py-1 rounded', getSeverityColor('critical'))}>
            {severityCounts.critical} Critical
          </span>
          <span className={cn('px-2 py-1 rounded', getSeverityColor('high'))}>
            {severityCounts.high} High
          </span>
          <span className={cn('px-2 py-1 rounded', getSeverityColor('medium'))}>
            {severityCounts.medium} Medium
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#2D2D2D]">
        <div className="flex items-center flex-1 gap-2 px-3 py-1.5 bg-[#3C3C3C] rounded">
          <Search className="w-4 h-4 text-[#858585]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vulnerabilities..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#858585]"
            data-testid="input-search-vulnerabilities"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-[#858585]" />
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-2 py-1 text-sm bg-[#3C3C3C] rounded outline-none"
            data-testid="select-severity-filter"
          >
            <option value="all">All ({severityCounts.all})</option>
            <option value="critical">Critical ({severityCounts.critical})</option>
            <option value="high">High ({severityCounts.high})</option>
            <option value="medium">Medium ({severityCounts.medium})</option>
            <option value="low">Low ({severityCounts.low})</option>
          </select>
        </div>
      </div>

      {/* Scans List (Top Section) */}
      <div className="flex-shrink-0 border-b border-[#2D2D2D]">
        <div className="px-4 py-2 text-xs font-medium text-[#858585] bg-[#252526]">
          Recent Scans
        </div>
        <div className="max-h-32 overflow-y-auto">
          {scans.slice(0, 5).map((scan) => (
            <div
              key={scan.id}
              onClick={() => setSelectedScan(scan)}
              className={cn(
                'px-4 py-2 border-b border-[#2D2D2D] cursor-pointer hover:bg-[#2A2D2E] transition-colors',
                selectedScan?.id === scan.id && 'bg-[#2A2D2E]'
              )}
              data-testid={`scan-item-${scan.id}`}
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-[#858585]" />
                  <span className="text-xs text-[#CCCCCC]">{scan.scanType}</span>
                  <span className={cn('px-2 py-0.5 rounded text-xs', getStatusColor(scan.status))}>
                    {scan.status}
                  </span>
                </div>
                <span className="text-xs text-[#858585]">
                  {new Date(scan.startedAt).toLocaleTimeString()}
                </span>
              </div>
              {scan.totalVulnerabilities !== null && scan.totalVulnerabilities > 0 && (
                <div className="flex items-center gap-2 mt-1 text-xs text-[#858585]">
                  <span className="text-red-500">{scan.criticalCount} critical</span>
                  <span className="text-orange-500">{scan.highCount} high</span>
                  <span className="text-yellow-500">{scan.mediumCount} medium</span>
                  <span className="text-blue-500">{scan.lowCount} low</span>
                </div>
              )}
            </div>
          ))}
          {scans.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[#858585]">
              No security scans available
            </div>
          )}
        </div>
      </div>

      {/* Vulnerabilities List (Main Content) */}
      <div className="flex-1 overflow-y-auto">
        {filteredVulnerabilities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <CheckCircle className="w-12 h-12 text-green-500/50" />
            <p className="text-sm text-[#858585]">
              {searchQuery || selectedSeverity !== 'all'
                ? 'No vulnerabilities match your filters'
                : 'No vulnerabilities found'}
            </p>
          </div>
        ) : (
          filteredVulnerabilities.map((vuln) => (
            <div
              key={vuln.id}
              className="px-4 py-3 border-b border-[#2D2D2D] hover:bg-[#2A2D2E] cursor-pointer transition-colors"
              data-testid={`vulnerability-item-${vuln.id}`}
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(vuln.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-[#CCCCCC] truncate">
                      {vuln.title}
                    </h4>
                    <span className={cn('px-2 py-0.5 rounded text-xs whitespace-nowrap', getSeverityColor(vuln.severity))}>
                      {vuln.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#858585] line-clamp-2">
                    {vuln.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[#858585]">
                    {vuln.filePath && (
                      <span className="truncate max-w-md" title={vuln.filePath}>
                        {vuln.filePath}
                        {vuln.lineNumber && `:${vuln.lineNumber}`}
                      </span>
                    )}
                    {vuln.packageName && (
                      <span className="font-mono">{vuln.packageName}</span>
                    )}
                    {vuln.cve && (
                      <span className="text-[#E07B39]">{vuln.cve}</span>
                    )}
                  </div>
                  {vuln.recommendation && (
                    <div className="mt-2 p-2 bg-[#252526] rounded text-xs text-[#CCCCCC]">
                      <span className="text-[#858585]">Fix: </span>
                      {vuln.recommendation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-[#2D2D2D] bg-[#252526] text-xs text-[#858585]">
        <span>
          {filteredVulnerabilities.length} of {vulnerabilities.length} vulnerabilities
        </span>
        <span className={wsRef.current?.readyState === WebSocket.OPEN ? 'text-green-500' : 'text-yellow-500'}>
          {wsRef.current?.readyState === WebSocket.OPEN ? '● Live' : '○ Connecting...'}
        </span>
      </div>
    </div>
  );
}
