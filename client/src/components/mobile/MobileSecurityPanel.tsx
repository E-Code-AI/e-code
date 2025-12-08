import { useState } from 'react';
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

export function MobileSecurityPanel({ projectId, className }: MobileSecurityPanelProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'hidden'>('active');
  const [showSettings, setShowSettings] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<SecurityScanSettings>({
    queryKey: ['/api/workspace/projects', projectId, 'security-settings'],
  });

  const { data: scans, isLoading: scansLoading } = useQuery<SecurityScan[]>({
    queryKey: ['/api/workspace/projects', projectId, 'security-scans'],
  });

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

  const vulnerabilities = activeTab === 'active' ? activeVulnerabilities : hiddenVulnerabilities;
  const isLoading = activeTab === 'active' ? activeLoading : hiddenLoading;
  const totalCount = (activeVulnerabilities?.length || 0) + (hiddenVulnerabilities?.length || 0);

  return (
    <div className={cn('flex flex-col h-full bg-white dark:bg-[#1c2333]', className)} data-testid="mobile-security-panel">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Hero Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#0e1525] dark:text-white">
                Security and Privacy Scanner
              </h1>
              <Badge 
                className="bg-[#0079f2] text-white text-xs font-medium px-2 py-0.5 rounded"
                data-testid="beta-badge"
              >
                Beta
              </Badge>
            </div>
            
            <p className="text-sm text-[#5c6670] dark:text-[#9da2a6] leading-relaxed">
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

          {/* Action Buttons - Replit style */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => !isScanning && startScanMutation.mutate(undefined)}
              disabled={isScanning || startScanMutation.isPending}
              className={cn(
                "flex-1 h-10 font-medium rounded-lg",
                isScanning || startScanMutation.isPending
                  ? "border-[#0079f2] text-[#0079f2] bg-[#0079f2]/5"
                  : "border-[#d4d8dd] dark:border-[#3d4452] text-[#0e1525] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2b3245]"
              )}
              data-testid="scan-button"
            >
              {isScanning || startScanMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning for vulnerabilities
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Scan for vulnerabilities
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-10 px-3 border-[#d4d8dd] dark:border-[#3d4452] text-[#0e1525] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2b3245] rounded-lg"
              data-testid="scan-settings-button"
            >
              <Settings className="w-4 h-4 mr-2" />
              Scan settings
            </Button>
          </div>

          {/* Scan Settings Panel - Replit style overlay */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-white dark:bg-[#1c2333] rounded-lg p-4 space-y-4 border border-[#d4d8dd] dark:border-[#3d4452] shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-[#0e1525] dark:text-white">Scan Settings</h3>
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#2b3245] rounded-full"
                      data-testid="close-settings-button"
                    >
                      <X className="w-4 h-4 text-[#5c6670] dark:text-[#9da2a6]" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#0e1525] dark:text-white">
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
                      <span className="text-sm text-[#0e1525] dark:text-white">
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

          {/* Tabs - Replit style */}
          <div className="border-b border-[#d4d8dd] dark:border-[#3d4452]">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('active')}
                className={cn(
                  'pb-3 text-sm font-medium border-b-2 transition-colors',
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
                  'pb-3 text-sm font-medium border-b-2 transition-colors',
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
              <p className="text-base font-semibold text-[#0e1525] dark:text-white">
                {totalCount} potential vulnerabilities found.
              </p>
              {latestScan && (
                <p className="text-sm text-[#5c6670] dark:text-[#9da2a6]">
                  {formatLastScanTime(latestScan)}
                </p>
              )}
            </div>
          )}

          {/* Issues List - Replit Accordion Cards */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#5c6670]" />
              </div>
            ) : vulnerabilities && vulnerabilities.length > 0 ? (
              vulnerabilities.map((vuln) => (
                <div 
                  key={vuln.id}
                  className="bg-white dark:bg-[#242b3d] rounded-lg border border-[#d4d8dd] dark:border-[#3d4452] overflow-hidden"
                  data-testid={`vulnerability-${vuln.id}`}
                >
                  {/* Card Header - Clickable */}
                  <button
                    onClick={() => toggleCardExpanded(vuln.id)}
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-[#f9fafb] dark:hover:bg-[#2b3245]"
                    data-testid={`expand-vulnerability-${vuln.id}`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge className="bg-[#fee2e2] text-[#dc2626] border-0 text-xs font-medium flex items-center gap-1 shrink-0">
                        <ShieldAlert className="w-3 h-3" />
                        Security
                      </Badge>
                      <span className="text-sm text-[#0e1525] dark:text-white truncate">
                        {vuln.title}
                      </span>
                    </div>
                    {expandedCards.has(vuln.id) ? (
                      <ChevronUp className="w-5 h-5 text-[#5c6670] shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#5c6670] shrink-0" />
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
                        <div className="px-3 pb-3 space-y-3 border-t border-[#d4d8dd] dark:border-[#3d4452]">
                          <p className="text-sm text-[#5c6670] dark:text-[#9da2a6] pt-3">
                            {vuln.description}
                          </p>

                          {/* Package Dependencies (if applicable) */}
                          {vuln.packageName && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-[#5c6670] dark:text-[#9da2a6]">
                                <Package className="w-4 h-4" />
                                <span className="font-mono">{vuln.packageName}@{vuln.vulnerableVersion}</span>
                              </div>
                            </div>
                          )}

                          {/* File Path */}
                          {vuln.filePath && (
                            <p className="text-xs text-[#5c6670] dark:text-[#9da2a6] font-mono bg-[#f5f5f5] dark:bg-[#1c2333] px-2 py-1 rounded">
                              {vuln.filePath}{vuln.lineNumber ? `:${vuln.lineNumber}` : ''}
                            </p>
                          )}

                          {/* Action Buttons - Replit style */}
                          <div className="flex gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleHideMutation.mutate({ id: vuln.id, isHidden: !vuln.isHidden });
                              }}
                              className="h-9 px-4 border-[#d4d8dd] dark:border-[#3d4452] text-[#5c6670] dark:text-[#9da2a6] hover:bg-[#f5f5f5] dark:hover:bg-[#2b3245] rounded-lg"
                              data-testid={`toggle-hide-${vuln.id}`}
                            >
                              {vuln.isHidden ? 'Unhide' : 'Hide'}
                            </Button>
                            <Button
                              size="sm"
                              className="h-9 px-4 bg-[#0079f2] hover:bg-[#0066cc] text-white rounded-lg"
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
            ) : (
              <p className="text-sm text-[#5c6670] dark:text-[#9da2a6] py-4">
                {activeTab === 'active' 
                  ? 'No active issues found.'
                  : 'No hidden issues found.'}
              </p>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Partner Attribution Footer - Replit style */}
      <div className="border-t border-[#d4d8dd] dark:border-[#3d4452] p-4 space-y-3 bg-[#f9fafb] dark:bg-[#1c2333]">
        <p className="text-xs text-[#5c6670] dark:text-[#9da2a6]">
          Vulnerability scans are enabled by the following Replit partners:
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#0e1525] dark:text-white" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span className="text-xs text-[#5c6670] dark:text-[#9da2a6]">
              Security scans are powered by Semgrep Community Edition.
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#0e1525] dark:text-white" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="text-xs text-[#5c6670] dark:text-[#9da2a6]">
              Privacy scans are powered by HoundDog.ai.
            </span>
          </div>
        </div>
        
        <p className="text-xs text-[#5c6670] dark:text-[#9da2a6] leading-relaxed">
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
  );
}
