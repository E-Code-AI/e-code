import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  Search,
  Download,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  homepage?: string;
  dependencies?: string[];
  devDependencies?: string[];
  size?: string;
  weekly?: number;
  isInstalled?: boolean;
  hasUpdate?: boolean;
}

interface MobilePackagesPanelProps {
  projectId: string;
  className?: string;
}

export function MobilePackagesPanel({ projectId, className }: MobilePackagesPanelProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'installed' | 'search'>('installed');

  // Fetch installed packages
  const { data, isLoading, error, refetch } = useQuery<{ packages: PackageInfo[] }>({
    queryKey: ['/api/packages/installed', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/packages/installed?projectId=${projectId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch packages');
      return response.json();
    },
    enabled: !!projectId
  });

  const installedPackages: PackageInfo[] = (data?.packages || []).map(pkg => ({
    ...pkg,
    isInstalled: true
  }));

  const searchResults: PackageInfo[] = [
    {
      name: 'axios',
      version: '1.6.5',
      description: 'Promise based HTTP client',
      size: '456 KB',
      weekly: 8901234
    },
    {
      name: 'lodash',
      version: '4.17.21',
      description: 'Lodash modular utilities',
      size: '1.4 MB',
      weekly: 12345678
    },
    {
      name: 'date-fns',
      version: '3.2.0',
      description: 'Modern JavaScript date utility library',
      size: '678 KB',
      weekly: 3456789
    }
  ];

  const togglePackageExpansion = (packageName: string) => {
    const newExpanded = new Set(expandedPackages);
    if (newExpanded.has(packageName)) {
      newExpanded.delete(packageName);
    } else {
      newExpanded.add(packageName);
    }
    setExpandedPackages(newExpanded);
  };

  // Install package mutation
  const installMutation = useMutation({
    mutationFn: async (pkg: { name: string; version?: string }) => {
      return apiRequest('POST', `/api/packages/${projectId}/install`, {
        name: pkg.name,
        version: pkg.version
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages/installed', projectId] });
      toast({ 
        title: 'Package installed successfully',
        description: data.message || `Installed ${data.package || 'package'}`
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to install package', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Uninstall package mutation
  const uninstallMutation = useMutation({
    mutationFn: async (packageName: string) => {
      return apiRequest('POST', `/api/packages/${projectId}/uninstall`, {
        name: packageName
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages/installed', projectId] });
      toast({ 
        title: 'Package uninstalled successfully',
        description: data.message || `Uninstalled package`
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to uninstall package', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleInstall = (pkg: PackageInfo) => {
    installMutation.mutate({ name: pkg.name, version: pkg.version });
  };

  const handleUninstall = (packageName: string) => {
    if (confirm(`Are you sure you want to uninstall ${packageName}?`)) {
      uninstallMutation.mutate(packageName);
    }
  };

  const formatWeeklyDownloads = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toString();
  };

  const renderPackageCard = (pkg: PackageInfo) => {
    const isInstalling = installMutation.isPending && installMutation.variables?.name === pkg.name;
    const isUninstalling = uninstallMutation.isPending && uninstallMutation.variables === pkg.name;
    const isExpanded = expandedPackages.has(pkg.name);

    return (
      <div 
        key={pkg.name}
        className="border border-border rounded-lg p-3 bg-card"
        data-testid={`package-${pkg.name}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="font-medium text-sm truncate">{pkg.name}</span>
              {pkg.hasUpdate && (
                <Badge variant="secondary" className="text-xs">Update</Badge>
              )}
            </div>
            {pkg.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {pkg.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>v{pkg.version}</span>
              {pkg.size && <span>{pkg.size}</span>}
              {pkg.weekly && <span>{formatWeeklyDownloads(pkg.weekly)}/week</span>}
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            {pkg.isInstalled ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => togglePackageExpansion(pkg.name)}
                  data-testid={`button-expand-${pkg.name}`}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleUninstall(pkg.name)}
                  disabled={isUninstalling}
                  data-testid={`button-uninstall-${pkg.name}`}
                >
                  {isUninstalling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleInstall(pkg)}
                disabled={isInstalling}
                className="h-7 text-xs px-2"
                data-testid={`button-install-${pkg.name}`}
              >
                {isInstalling ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            {pkg.dependencies && Object.keys(pkg.dependencies).length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Dependencies:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(pkg.dependencies).map((dep) => (
                    <Badge key={dep} variant="outline" className="text-xs">
                      {dep}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {pkg.devDependencies && Object.keys(pkg.devDependencies).length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Dev Dependencies:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(pkg.devDependencies).map((dep) => (
                    <Badge key={dep} variant="outline" className="text-xs">
                      {dep}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Packages</h3>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-packages"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value) {
                setActiveTab('search');
              } else {
                setActiveTab('installed');
              }
            }}
            className="pl-9"
            data-testid="input-search-packages"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card">
        {(['installed', 'search'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-3 text-sm font-medium capitalize transition-colors",
              activeTab === tab
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            )}
            data-testid={`tab-${tab}`}
          >
            {tab}
            {tab === 'installed' && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {installedPackages.length}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Package List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {activeTab === 'installed' && isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-border rounded-lg p-3 bg-card">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-10 w-full mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </>
          )}

          {activeTab === 'installed' && error && (
            <div className="text-center py-12 text-destructive">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Failed to load packages</p>
              <p className="text-xs mt-1">{(error as Error).message}</p>
            </div>
          )}

          {activeTab === 'installed' && !isLoading && !error && installedPackages.map(renderPackageCard)}
          {activeTab === 'search' && searchResults.map(renderPackageCard)}
          
          {activeTab === 'installed' && !isLoading && !error && installedPackages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No packages installed</p>
            </div>
          )}

          {activeTab === 'search' && searchResults.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No packages found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
