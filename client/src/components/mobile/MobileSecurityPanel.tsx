import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Settings,
  Loader2,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
  Eye,
  EyeOff,
  ChevronRight,
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch security settings
  const { data: settings } = useQuery<SecurityScanSettings>({
    queryKey: ['/api/workspace/projects', projectId, 'security-settings'],
  });

  // Fetch latest scan
  const { data: scans, isLoading: scansLoading } = useQuery<SecurityScan[]>({
    queryKey: ['/api/workspace/projects', projectId, 'security-scans'],
  });

  // Fetch active vulnerabilities
  const { data: activeVulnerabilities, isLoading: activeLoading } = useQuery<Vulnerability[]>({
    queryKey: ['/api/workspace/projects', projectId, 'vulnerabilities', 'by-hidden', 'active'],
    queryFn: async () => {
      const res = await fetch(`/api/workspace/projects/${projectId}/vulnerabilities/by-hidden?hidden=false`);
      if (!res.ok) throw new Error('Failed to fetch vulnerabilities');
      return res.json();
    },
  });

  // Fetch hidden vulnerabilities
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

  // Start scan mutation
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

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<SecurityScanSettings>) => {
      return apiRequest('PATCH', `/api/workspace/projects/${projectId}/security-settings`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspace/projects', projectId, 'security-settings'] });
    },
  });

  // Hide/unhide vulnerability mutation
  const toggleHideMutation = useMutation({
    mutationFn: async ({ id, isHidden }: { id: string; isHidden: boolean }) => {
      return apiRequest('PATCH', `/api/workspace/vulnerabilities/${id}/hide`, { isHidden });
    },
    onSuccess: () => {
      // Invalidate both active and hidden vulnerability lists
      queryClient.invalidateQueries({ queryKey: ['/api/workspace/projects', projectId, 'vulnerabilities', 'by-hidden', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace/projects', projectId, 'vulnerabilities', 'by-hidden', 'hidden'] });
    },
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityBadgeStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const vulnerabilities = activeTab === 'active' ? activeVulnerabilities : hiddenVulnerabilities;
  const isLoading = activeTab === 'active' ? activeLoading : hiddenLoading;

  return (
    <div className={cn('flex flex-col h-full bg-background', className)} data-testid="mobile-security-panel">
      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Hero Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">
                Security and Privacy Scanner
              </h1>
              <Badge 
                variant="secondary" 
                className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs"
                data-testid="beta-badge"
              >
                Beta
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              Run a scan to check for potential security risks and privacy leaks in your application. 
              Scans are typically complete within minutes.{' '}
              <a 
                href="https://docs.replit.com/programming-ide/security-scanner" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                data-testid="learn-more-link"
              >
                Learn more
              </a>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => !isScanning && startScanMutation.mutate()}
              disabled={isScanning || startScanMutation.isPending}
              className="flex-1 h-10 border-2 border-border hover:bg-accent/50"
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
              className="h-10 px-3 border-2 border-border hover:bg-accent/50"
              data-testid="scan-settings-button"
            >
              <Settings className="w-4 h-4 mr-2" />
              Scan settings
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
                <div className="bg-muted/30 rounded-lg p-4 space-y-4 border border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-foreground">Scan Settings</h3>
                    <button 
                      onClick={() => setShowSettings(false)}
                      className="p-1 hover:bg-accent rounded-full"
                      data-testid="close-settings-button"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">
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
                      <span className="text-sm text-foreground">
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
          <div className="border-b border-border">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab('active')}
                className={cn(
                  'pb-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'active'
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
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
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
                data-testid="hidden-issues-tab"
              >
                Hidden Issues
              </button>
            </div>
          </div>

          {/* Issues List */}
          <div className="min-h-[150px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : vulnerabilities && vulnerabilities.length > 0 ? (
              <div className="space-y-3">
                {vulnerabilities.map((vuln) => (
                  <div 
                    key={vuln.id}
                    className="bg-muted/30 rounded-lg p-3 border border-border"
                    data-testid={`vulnerability-${vuln.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getSeverityIcon(vuln.severity)}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground truncate">
                              {vuln.title}
                            </span>
                            <Badge className={cn('text-xs', getSeverityBadgeStyle(vuln.severity))}>
                              {vuln.severity}
                            </Badge>
                            {vuln.toolAttribution && (
                              <Badge variant="outline" className="text-xs">
                                {vuln.toolAttribution}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {vuln.description}
                          </p>
                          {vuln.filePath && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {vuln.filePath}{vuln.lineNumber ? `:${vuln.lineNumber}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleHideMutation.mutate({ 
                          id: vuln.id, 
                          isHidden: !vuln.isHidden 
                        })}
                        className="p-2 hover:bg-accent rounded-lg shrink-0"
                        data-testid={`toggle-hide-${vuln.id}`}
                      >
                        {vuln.isHidden ? (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                {activeTab === 'active' 
                  ? 'No active issues found.'
                  : 'No hidden issues found.'}
              </p>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Partner Attribution Footer */}
      <div className="border-t border-border p-4 space-y-3 bg-muted/20">
        <p className="text-xs text-muted-foreground">
          Vulnerability scans are enabled by the following Replit partners:
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-foreground" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-xs text-muted-foreground">
              Security scans are powered by Semgrep Community Edition.
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 flex items-center justify-center text-xs font-bold text-foreground">
              🐕
            </div>
            <span className="text-xs text-muted-foreground">
              Privacy scans are powered by HoundDog.ai.
            </span>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground leading-relaxed">
          Security scanning powered by{' '}
          <a 
            href="https://semgrep.dev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Semgrep
          </a>
          {' '}and privacy scanning powered by{' '}
          <a 
            href="https://hounddog.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            HoundDog.ai
          </a>
          , both running locally on E-Code infrastructure. No code or data is transmitted to any third party, including{' '}
          <a 
            href="https://semgrep.dev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Semgrep
          </a>
          {' '}or{' '}
          <a 
            href="https://hounddog.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            HoundDog.ai
          </a>
          .
        </p>
      </div>
    </div>
  );
}
