import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  Settings,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SecurityScan, Vulnerability, SecurityScanSettings } from '@shared/schema';

interface MobileSecurityPanelProps {
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

function VulnerabilitySkeleton() {
  return (
    <div className="bg-white dark:bg-[#242b3d] rounded-lg border border-[#d4d8dd] dark:border-[#3d4452] p-4" data-testid="vulnerability-skeleton">
      <div className="flex items-center gap-2">
        <div className="relative overflow-hidden w-20 h-5 bg-[#e8eaed] dark:bg-[#3d4452] rounded">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-[#f0f1f3] to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <div className="relative overflow-hidden flex-1 h-4 bg-[#e8eaed] dark:bg-[#3d4452] rounded">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-[#f0f1f3] to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>
    </div>
  );
}

export function MobileSecurityPanel({ projectId, className }: MobileSecurityPanelProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'hidden'>('active');
  const [showSettings, setShowSettings] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [realtimeScans, setRealtimeScans] = useState<SecurityScan[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<SecurityScanSettings>({
    queryKey: ['/api/workspace/projects', projectId, 'security-settings'],
  });

  const { data: initialScans, isLoading: scansLoading } = useQuery<SecurityScan[]>({
    queryKey: ['/api/workspace/projects', projectId, 'security-scans'],
    refetchInterval: 10000,
  });

  const scans = realtimeScans.length > 0 ? realtimeScans : (initialScans || []);

  const { data: activeVulnerabilities, isLoading: activeLoading } = useQuery<Vulnerability[]>({
    queryKey: ['/api/workspace/projects', projectId, 'vulnerabilities', 'by-hidden', 'active'],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/projects/${projectId}/vulnerabilities/by-hidden?hidden=false`);
      if (!res.ok) throw new Error('Failed to fetch vulnerabilities');
      return res.json();
    },
  });

  const { data: hiddenVulnerabilities, isLoading: hiddenLoading } = useQuery<Vulnerability[]>({
    queryKey: ['/api/workspace/projects', projectId, 'vulnerabilities', 'by-hidden', 'hidden'],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/projects/${projectId}/vulnerabilities/by-hidden?hidden=true`);
      if (!res.ok) throw new Error('Failed to fetch vulnerabilities');
      return res.json();
    },
  });

  const latestScan = scans?.[0];
  const isScanning = latestScan?.status === 'running' || latestScan?.status === 'queued';

  const startScanMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/workspace/projects/${projectId}/security-scans`, {
        scanType: 'full',
        status: 'queued',
        scanner: 'semgrep',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspace/projects', projectId, 'security-scans'] });
      toast({
        title: 'Security scan started',
        description: 'Scanning for vulnerabilities...',
      });
    },
    onError: () => {
      toast({
        title: 'Scan failed',
        description: 'Failed to start security scan',
        variant: 'destructive',
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<SecurityScanSettings>) => {
      return apiRequest('PATCH', `/api/workspace/projects/${projectId}/security-settings`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspace/projects', projectId, 'security-settings'] });
      toast({ description: 'Settings updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update settings', variant: 'destructive' });
    },
  });

  const toggleHideMutation = useMutation({
    mutationFn: async ({ id, isHidden }: { id: string; isHidden: boolean }) => {
      return apiRequest('PATCH', `/api/workspace/vulnerabilities/${id}/hide`, { isHidden });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspace/projects', projectId, 'vulnerabilities', 'by-hidden', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace/projects', projectId, 'vulnerabilities', 'by-hidden', 'hidden'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update vulnerability', variant: 'destructive' });
    },
  });

  const toggleCardExpanded = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatLastScanTime = (scan?: SecurityScan) => {
    if (!scan?.startedAt) return null;
    const date = new Date(scan.startedAt);
    return `Last ran on ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}, ${date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`;
  };

  useEffect(() => {
    if (!projectId) return;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/security-scans/ws?projectId=${projectId}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            switch (message.type) {
              case 'initial':
                if (message.scans) setRealtimeScans(message.scans);
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
                queryClient.invalidateQueries({ queryKey: ['/api/workspace/projects', projectId, 'vulnerabilities', 'by-hidden', 'active'] });
                queryClient.invalidateQueries({ queryKey: ['/api/workspace/projects', projectId, 'vulnerabilities', 'by-hidden', 'hidden'] });
                break;
              case 'error':
                console.error('[MobileSecurityPanel] WebSocket error:', message.message);
                break;
            }
          } catch (error) {
            console.error('[MobileSecurityPanel] Error parsing WebSocket message:', error);
          }
        };

        ws.onerror = (error) => console.error('[MobileSecurityPanel] WebSocket error:', error);
        ws.onclose = () => {
          wsRef.current = null;
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        console.error('[MobileSecurityPanel] Error creating WebSocket:', error);
      }
    };

    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [projectId, queryClient]);

  const vulnerabilities = activeTab === 'active' ? activeVulnerabilities : hiddenVulnerabilities;
  const isLoading = activeTab === 'active' ? activeLoading : hiddenLoading;
  const totalCount = (activeVulnerabilities?.length || 0) + (hiddenVulnerabilities?.length || 0);
  const hasNoVulnerabilities = !isLoading && (!vulnerabilities || vulnerabilities.length === 0);

  return (
    <div className={cn('flex flex-col h-full bg-white dark:bg-[#1c2333]', className)} data-testid="mobile-security-panel">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {/* Hero Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-medium leading-tight text-[#0e1525] dark:text-white">
                Security and Privacy Scanner
              </h1>
              <Badge 
                className="uppercase text-[10px] tracking-wide rounded bg-[#0079f2] text-white font-medium px-2 py-0.5"
                data-testid="beta-badge"
              >
                Beta
              </Badge>
            </div>
            
            <p className="text-[15px] leading-[20px] text-[#5c6670] dark:text-[#9da2a6]">
              Run a scan to check for potential security risks and privacy leaks in your application. 
              Scans are typically complete within minutes.{' '}
              <a 
                href="https://docs.replit.com/programming-ide/security-scanner" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#0079f2] hover:underline"
                data-testid="learn-more-link"
              >
                Learn more
              </a>
            </p>
          </div>

          {/* Action Buttons - Mobile touch targets */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => !isScanning && startScanMutation.mutate(undefined)}
              disabled={isScanning || startScanMutation.isPending}
              className={cn(
                "flex-1 h-11 font-medium rounded-lg text-[15px] leading-[20px]",
                isScanning || startScanMutation.isPending
                  ? "border-[#0079f2] text-[#0079f2] bg-[#e5f0fd]"
                  : "border-[#d4d8dd] dark:border-[#3d4452] text-[#0e1525] dark:text-white hover:bg-[#e8eaed] dark:hover:bg-[#3d4452]"
              )}
              data-testid="scan-button"
            >
              {isScanning || startScanMutation.isPending ? (
                <>
                  <Loader2 className="w-[18px] h-[18px] mr-2 animate-spin" />
                  Scanning for vulnerabilities
                </>
              ) : (
                <>
                  <ShieldCheck className="w-[18px] h-[18px] mr-2" />
                  Scan for vulnerabilities
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
              className="w-11 h-11 p-0 border-[#d4d8dd] dark:border-[#3d4452] text-[#0e1525] dark:text-white hover:bg-[#e8eaed] dark:hover:bg-[#3d4452] rounded-lg"
              data-testid="scan-settings-button"
            >
              <Settings className="w-[18px] h-[18px]" />
            </Button>
          </div>

          {/* Scan Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-white dark:bg-[#1c2333] rounded-lg p-4 space-y-3 border border-[#d4d8dd] dark:border-[#3d4452] shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[17px] font-medium leading-tight text-[#0e1525] dark:text-white">Scan Settings</h3>
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="w-11 h-11 flex items-center justify-center hover:bg-[#e8eaed] dark:hover:bg-[#3d4452] rounded-lg"
                      data-testid="close-settings-button"
                    >
                      <X className="w-[18px] h-[18px] text-[#5c6670] dark:text-[#9da2a6]" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] leading-[20px] text-[#0e1525] dark:text-white">
                        Enable privacy vulnerability detection
                      </span>
                      <Switch
                        checked={settings?.privacyDetectionEnabled ?? true}
                        onCheckedChange={(checked) => 
                          updateSettingsMutation.mutate({ privacyDetectionEnabled: checked })
                        }
                        data-testid="privacy-toggle"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] leading-[20px] text-[#0e1525] dark:text-white">
                        Enable security vulnerability detection
                      </span>
                      <Switch
                        checked={settings?.securityDetectionEnabled ?? true}
                        onCheckedChange={(checked) => 
                          updateSettingsMutation.mutate({ securityDetectionEnabled: checked })
                        }
                        data-testid="security-toggle"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs */}
          <div className="border-b border-[#d4d8dd] dark:border-[#3d4452]">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('active')}
                className={cn(
                  'pb-3 text-[15px] leading-[20px] font-medium border-b-2 transition-colors min-h-[44px] flex items-center',
                  activeTab === 'active'
                    ? 'border-[#0e1525] dark:border-white text-[#0e1525] dark:text-white'
                    : 'border-transparent text-[#5c6670] dark:text-[#9da2a6] hover:text-[#0e1525] dark:hover:text-white'
                )}
                data-testid="active-issues-tab"
              >
                Active Issues
              </button>
              <button
                onClick={() => setActiveTab('hidden')}
                className={cn(
                  'pb-3 text-[15px] leading-[20px] font-medium border-b-2 transition-colors min-h-[44px] flex items-center',
                  activeTab === 'hidden'
                    ? 'border-[#0e1525] dark:border-white text-[#0e1525] dark:text-white'
                    : 'border-transparent text-[#5c6670] dark:text-[#9da2a6] hover:text-[#0e1525] dark:hover:text-white'
                )}
                data-testid="hidden-issues-tab"
              >
                Hidden Issues
              </button>
            </div>
          </div>

          {/* Vulnerability Count & Last Scan Time */}
          {activeTab === 'active' && (
            <div className="space-y-1">
              <p className="text-[17px] font-medium leading-tight text-[#0e1525] dark:text-white">
                {totalCount} potential vulnerabilities found.
              </p>
              {latestScan && (
                <p className="text-[13px] text-[#5c6670] dark:text-[#9da2a6]">
                  {formatLastScanTime(latestScan)}
                </p>
              )}
            </div>
          )}

          {/* Issues List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-3" data-testid="vulnerabilities-loading">
                <VulnerabilitySkeleton />
                <VulnerabilitySkeleton />
                <VulnerabilitySkeleton />
              </div>
            ) : hasNoVulnerabilities ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center" data-testid="empty-state">
                <div className="w-12 h-12 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-12 h-12 text-[#9da2a6]" />
                </div>
                <h3 className="text-[17px] font-medium leading-tight text-[#0e1525] dark:text-white mb-2">
                  {activeTab === 'active' ? 'No active issues' : 'No hidden issues'}
                </h3>
                <p className="text-[15px] leading-[20px] text-[#5c6670] dark:text-[#9da2a6] mb-4">
                  {activeTab === 'active' 
                    ? 'Your project is looking secure! Run a scan to check for vulnerabilities.'
                    : 'You haven\'t hidden any issues yet.'}
                </p>
                {activeTab === 'active' && (
                  <Button
                    onClick={() => !isScanning && startScanMutation.mutate(undefined)}
                    disabled={isScanning || startScanMutation.isPending}
                    className="h-11 px-6 bg-[#0079f2] hover:bg-[#0066cc] text-white rounded-lg text-[15px] leading-[20px] font-medium"
                    data-testid="empty-state-scan-button"
                  >
                    {isScanning || startScanMutation.isPending ? (
                      <>
                        <Loader2 className="w-[18px] h-[18px] mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-[18px] h-[18px] mr-2" />
                        Run Security Scan
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              vulnerabilities?.map((vuln) => (
                <div 
                  key={vuln.id}
                  className="bg-white dark:bg-[#242b3d] rounded-lg border border-[#d4d8dd] dark:border-[#3d4452] overflow-hidden"
                  data-testid={`vulnerability-${vuln.id}`}
                >
                  {/* Card Header - Clickable */}
                  <button
                    onClick={() => toggleCardExpanded(vuln.id)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-[#e8eaed] dark:hover:bg-[#3d4452] min-h-[44px]"
                    data-testid={`expand-vulnerability-${vuln.id}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge className="uppercase text-[10px] tracking-wide rounded bg-[#fee2e2] text-[#dc2626] border-0 font-medium flex items-center gap-1 shrink-0">
                        <ShieldAlert className="w-3 h-3" />
                        Security
                      </Badge>
                      <span className="text-[15px] leading-[20px] text-[#0e1525] dark:text-white truncate">
                        {vuln.title}
                      </span>
                    </div>
                    {expandedCards.has(vuln.id) ? (
                      <ChevronUp className="w-[18px] h-[18px] text-[#5c6670] shrink-0" />
                    ) : (
                      <ChevronDown className="w-[18px] h-[18px] text-[#5c6670] shrink-0" />
                    )}
                  </button>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {expandedCards.has(vuln.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-[#d4d8dd] dark:border-[#3d4452]">
                          <p className="text-[15px] leading-[20px] text-[#5c6670] dark:text-[#9da2a6] pt-3">
                            {vuln.description}
                          </p>

                          {/* Package Dependencies (if applicable) */}
                          {vuln.packageName && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-[15px] leading-[20px] text-[#5c6670] dark:text-[#9da2a6]">
                                <Package className="w-[18px] h-[18px]" />
                                <span className="font-mono">{vuln.packageName}@{vuln.vulnerableVersion}</span>
                              </div>
                            </div>
                          )}

                          {/* File Path */}
                          {vuln.filePath && (
                            <p className="text-[13px] text-[#5c6670] dark:text-[#9da2a6] font-mono bg-[#f0f1f3] dark:bg-[#1c2333] px-2 py-1 rounded">
                              {vuln.filePath}{vuln.lineNumber ? `:${vuln.lineNumber}` : ''}
                            </p>
                          )}

                          {/* Action Buttons - Mobile touch targets */}
                          <div className="flex gap-2 pt-1">
                            <Button
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleHideMutation.mutate({ id: vuln.id, isHidden: !vuln.isHidden });
                              }}
                              className="h-10 px-4 border-[#d4d8dd] dark:border-[#3d4452] text-[#5c6670] dark:text-[#9da2a6] hover:bg-[#e8eaed] dark:hover:bg-[#3d4452] rounded-lg text-[15px] leading-[20px]"
                              data-testid={`toggle-hide-${vuln.id}`}
                            >
                              {vuln.isHidden ? 'Unhide' : 'Hide'}
                            </Button>
                            <Button
                              className="h-11 px-4 bg-[#0079f2] hover:bg-[#0066cc] text-white rounded-lg text-[15px] leading-[20px]"
                              data-testid={`fix-with-agent-${vuln.id}`}
                            >
                              Fix with Agent
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>

          {/* Partner Attribution - Scrolls with content */}
          <div className="border-t border-[#d4d8dd] dark:border-[#3d4452] pt-4 mt-4 space-y-3">
            <p className="text-[13px] text-[#5c6670] dark:text-[#9da2a6]">
              Vulnerability scans are enabled by the following Replit partners:
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-[#0e1525] dark:text-white" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <span className="text-[13px] text-[#5c6670] dark:text-[#9da2a6]">
                  Security scans are powered by Semgrep Community Edition.
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-[#0e1525] dark:text-white" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="text-[13px] text-[#5c6670] dark:text-[#9da2a6]">
                  Privacy scans are powered by HoundDog.ai.
                </span>
              </div>
            </div>
            
            <p className="text-[13px] text-[#5c6670] dark:text-[#9da2a6] leading-relaxed">
              Security scanning powered by{' '}
              <a 
                href="https://semgrep.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#0079f2] hover:underline"
              >
                Semgrep
              </a>
              {' '}and privacy scanning powered by{' '}
              <a 
                href="https://hounddog.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#0079f2] hover:underline"
              >
                HoundDog.ai
              </a>
              , both running locally on Replit infrastructure. No code or data is transmitted to any third party, including{' '}
              <a 
                href="https://semgrep.dev" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#0079f2] hover:underline"
              >
                Semgrep
              </a>
              {' '}or{' '}
              <a 
                href="https://hounddog.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#0079f2] hover:underline"
              >
                HoundDog.ai
              </a>
              .
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
