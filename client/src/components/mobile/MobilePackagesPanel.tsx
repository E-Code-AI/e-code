import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Package,
  Search,
  Download,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Loader2,
  Plus
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

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("bg-[#3d4452] rounded-lg", className)}
      animate={{
        background: [
          "linear-gradient(90deg, #3d4452 0%, #242b3d 50%, #3d4452 100%)",
          "linear-gradient(90deg, #242b3d 0%, #3d4452 50%, #242b3d 100%)",
          "linear-gradient(90deg, #3d4452 0%, #242b3d 50%, #3d4452 100%)"
        ]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div 
          key={i} 
          className="border border-[#3d4452] rounded-lg p-4 bg-[#1c2333]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <ShimmerSkeleton className="w-[18px] h-[18px] rounded" />
                <ShimmerSkeleton className="h-5 w-32" />
              </div>
              <ShimmerSkeleton className="h-4 w-full mb-2" />
              <ShimmerSkeleton className="h-4 w-3/4 mb-3" />
              <div className="flex items-center gap-3">
                <ShimmerSkeleton className="h-3 w-12" />
                <ShimmerSkeleton className="h-3 w-16" />
              </div>
            </div>
            <ShimmerSkeleton className="w-11 h-11 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MobilePackagesPanel({ projectId, className }: MobilePackagesPanelProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'installed' | 'search'>('installed');

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
      <motion.div 
        key={pkg.name}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-[#3d4452] rounded-lg p-4 bg-[#1c2333]"
        data-testid={`package-${pkg.name}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-[18px] h-[18px] text-[#0079f2] flex-shrink-0" />
              <span className="text-[17px] font-medium leading-tight text-[#ffffff] truncate">
                {pkg.name}
              </span>
              {pkg.hasUpdate && (
                <Badge 
                  variant="secondary" 
                  className="text-[11px] uppercase tracking-wider bg-[#242b3d] text-[#0079f2]"
                >
                  Update
                </Badge>
              )}
            </div>
            {pkg.description && (
              <p className="text-[15px] leading-[20px] text-[#9da2a6] line-clamp-2 mb-2">
                {pkg.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-[13px] text-[#5c6670]">
              <span>v{pkg.version}</span>
              {pkg.size && <span>{pkg.size}</span>}
              {pkg.weekly && <span>{formatWeeklyDownloads(pkg.weekly)}/week</span>}
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            {pkg.isInstalled ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-11 h-11 rounded-lg bg-[#242b3d] hover:bg-[#3d4452]"
                  onClick={() => togglePackageExpansion(pkg.name)}
                  data-testid={`button-expand-${pkg.name}`}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-[18px] h-[18px] text-[#9da2a6]" />
                  ) : (
                    <ChevronRight className="w-[18px] h-[18px] text-[#9da2a6]" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-11 h-11 rounded-lg bg-[#242b3d] hover:bg-[#fee2e2]"
                  onClick={() => handleUninstall(pkg.name)}
                  disabled={isUninstalling}
                  data-testid={`button-uninstall-${pkg.name}`}
                >
                  {isUninstalling ? (
                    <Loader2 className="w-[18px] h-[18px] text-red-500 animate-spin" />
                  ) : (
                    <Trash2 className="w-[18px] h-[18px] text-red-500" />
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="icon"
                onClick={() => handleInstall(pkg)}
                disabled={isInstalling}
                className="w-11 h-11 rounded-lg bg-[#0079f2] hover:bg-[#0066cc]"
                data-testid={`button-install-${pkg.name}`}
              >
                {isInstalling ? (
                  <Loader2 className="w-[18px] h-[18px] text-[#ffffff] animate-spin" />
                ) : (
                  <Download className="w-[18px] h-[18px] text-[#ffffff]" />
                )}
              </Button>
            )}
          </div>
        </div>

        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-[#3d4452] space-y-4"
          >
            {pkg.dependencies && Object.keys(pkg.dependencies).length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider font-medium text-[#5c6670] mb-2">
                  Dependencies
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(pkg.dependencies).map((dep) => (
                    <Badge 
                      key={dep} 
                      variant="outline" 
                      className="text-[13px] bg-[#242b3d] border-[#3d4452] text-[#9da2a6]"
                    >
                      {dep}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {pkg.devDependencies && Object.keys(pkg.devDependencies).length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider font-medium text-[#5c6670] mb-2">
                  Dev Dependencies
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(pkg.devDependencies).map((dep) => (
                    <Badge 
                      key={dep} 
                      variant="outline" 
                      className="text-[13px] bg-[#242b3d] border-[#3d4452] text-[#9da2a6]"
                    >
                      {dep}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    );
  };

  const EmptyState = ({ title, description, showInstallButton = false }: { 
    title: string; 
    description: string;
    showInstallButton?: boolean;
  }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Package className="w-12 h-12 text-[#5c6670] opacity-40 mb-4" />
      <h4 className="text-[17px] font-medium leading-tight text-[#ffffff] mb-2 text-center">
        {title}
      </h4>
      <p className="text-[15px] leading-[20px] text-[#5c6670] text-center mb-6 max-w-[280px]">
        {description}
      </p>
      {showInstallButton && (
        <Button
          className="h-11 px-6 rounded-lg bg-[#0079f2] hover:bg-[#0066cc] text-[15px] font-medium text-[#ffffff]"
          onClick={() => setActiveTab('search')}
          data-testid="button-browse-packages"
        >
          <Plus className="w-[18px] h-[18px] mr-2" />
          Install Package
        </Button>
      )}
    </div>
  );

  return (
    <div className={cn("h-full flex flex-col bg-[#0e1525]", className)}>
      <div className="p-4 border-b border-[#3d4452] bg-[#1c2333] min-h-[56px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-[18px] h-[18px] text-[#0079f2]" />
            <h3 className="text-[17px] font-medium leading-tight text-[#ffffff]">
              Packages
            </h3>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-11 h-11 rounded-lg bg-[#242b3d] hover:bg-[#3d4452]"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-packages"
          >
            <RefreshCw className={cn(
              "w-[18px] h-[18px] text-[#9da2a6]", 
              isLoading && "animate-spin"
            )} />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#5c6670]" />
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
            className="h-11 pl-10 rounded-lg bg-[#242b3d] border-[#3d4452] text-[15px] text-[#ffffff] placeholder:text-[#5c6670]"
            data-testid="input-search-packages"
          />
        </div>
      </div>

      <div className="flex border-b border-[#3d4452] bg-[#1c2333]">
        {(['installed', 'search'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 h-11 text-[15px] font-medium capitalize transition-colors flex items-center justify-center gap-2",
              activeTab === tab
                ? "text-[#0079f2] border-b-2 border-[#0079f2]"
                : "text-[#5c6670]"
            )}
            data-testid={`tab-${tab}`}
          >
            {tab}
            {tab === 'installed' && (
              <Badge 
                variant="secondary" 
                className="text-[11px] bg-[#242b3d] text-[#9da2a6]"
              >
                {installedPackages.length}
              </Badge>
            )}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3 pb-24">
          {activeTab === 'installed' && isLoading && <LoadingSkeleton />}

          {activeTab === 'installed' && error && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Package className="w-12 h-12 text-red-500 opacity-40 mb-4" />
              <h4 className="text-[17px] font-medium leading-tight text-[#ffffff] mb-2">
                Failed to load packages
              </h4>
              <p className="text-[13px] text-[#5c6670] text-center">
                {(error as Error).message}
              </p>
              <Button
                className="h-11 px-6 rounded-lg bg-[#0079f2] hover:bg-[#0066cc] text-[15px] font-medium text-[#ffffff] mt-6"
                onClick={() => refetch()}
                data-testid="button-retry-load"
              >
                <RefreshCw className="w-[18px] h-[18px] mr-2" />
                Retry
              </Button>
            </div>
          )}

          {activeTab === 'installed' && !isLoading && !error && installedPackages.map(renderPackageCard)}
          {activeTab === 'search' && searchResults.map(renderPackageCard)}
          
          {activeTab === 'installed' && !isLoading && !error && installedPackages.length === 0 && (
            <EmptyState 
              title="No packages installed"
              description="Add packages to extend your project with libraries and dependencies."
              showInstallButton
            />
          )}

          {activeTab === 'search' && searchResults.length === 0 && (
            <EmptyState 
              title="No packages found"
              description="Try searching for a different package name."
            />
          )}
        </div>
      </ScrollArea>

      <div 
        className="fixed bottom-0 left-0 right-0 p-4 bg-[#1c2333] border-t border-[#3d4452]"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <Button
          className="w-full h-11 rounded-lg bg-[#0079f2] hover:bg-[#0066cc] text-[15px] font-medium text-[#ffffff]"
          onClick={() => {
            setActiveTab('search');
            setSearchQuery('');
          }}
          data-testid="button-add-package"
        >
          <Plus className="w-[18px] h-[18px] mr-2" />
          Add Package
        </Button>
      </div>
    </div>
  );
}
