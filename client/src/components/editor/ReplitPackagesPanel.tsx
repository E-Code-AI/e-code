import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Search,
  Download,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Loader2,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface InstalledPackage {
  name: string;
  version: string;
  type: 'production' | 'development';
}

interface PackagesResponse {
  success: boolean;
  packages: InstalledPackage[];
  language?: 'javascript' | 'python';
  message?: string;
}

interface NpmSearchResult {
  name: string;
  version: string;
  description: string;
  date: string;
  links: { npm: string };
}

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("bg-[#242b3d] rounded-lg overflow-hidden relative", className)}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3d4452]/30 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
}

export function ReplitPackagesPanel({ projectId }: { projectId?: string | number }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: packagesData, isLoading, error, refetch } = useQuery<PackagesResponse>({
    queryKey: ['/api/packages/installed', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      const response = await fetch(`/api/packages/installed?projectId=${projectId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch packages');
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 30000,
  });

  const { data: searchResults, isLoading: isSearching } = useQuery<NpmSearchResult[]>({
    queryKey: ['npm-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const response = await fetch(
        `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(searchQuery)}&size=10`
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.objects?.map((obj: any) => ({
        name: obj.package.name,
        version: obj.package.version,
        description: obj.package.description || '',
        date: obj.package.date,
        links: obj.package.links
      })) || [];
    },
    enabled: searchQuery.length >= 2,
    staleTime: 60000,
  });

  const installMutation = useMutation({
    mutationFn: async ({ packageName, version }: { packageName: string; version?: string }) => {
      if (!projectId) throw new Error('Project ID required');
      const response = await apiRequest('POST', `/api/packages/${projectId}/install`, {
        package: packageName,
        version
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Package installed',
        description: `Successfully installed ${variables.packageName}`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/packages/installed', projectId] });
    },
    onError: (error: any, variables) => {
      toast({
        title: 'Installation failed',
        description: error.message || `Failed to install ${variables.packageName}`,
        variant: 'destructive'
      });
    }
  });

  const uninstallMutation = useMutation({
    mutationFn: async (packageName: string) => {
      if (!projectId) throw new Error('Project ID required');
      const response = await apiRequest('POST', `/api/packages/${projectId}/uninstall`, {
        package: packageName
      });
      return response.json();
    },
    onSuccess: (data, packageName) => {
      toast({
        title: 'Package removed',
        description: `Successfully removed ${packageName}`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/packages/installed', projectId] });
    },
    onError: (error: any, packageName) => {
      toast({
        title: 'Removal failed',
        description: error.message || `Failed to remove ${packageName}`,
        variant: 'destructive'
      });
    }
  });

  const togglePackageExpansion = useCallback((packageName: string) => {
    setExpandedPackages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(packageName)) {
        newSet.delete(packageName);
      } else {
        newSet.add(packageName);
      }
      return newSet;
    });
  }, []);

  const installedPackages = packagesData?.packages || [];
  const installedPackageNames = new Set(installedPackages.map(p => p.name));
  const filteredSearch = searchResults?.filter(pkg => !installedPackageNames.has(pkg.name)) || [];

  if (!projectId) {
    return (
      <div 
        className="h-full flex flex-col items-center justify-center p-3 bg-[#0e1525]" 
        data-testid="packages-panel-no-project"
      >
        <Package className="w-12 h-12 text-[#5c6670] opacity-40 mb-3" />
        <p className="text-[15px] leading-[20px] text-[#9da2a6]">Select a project to manage packages</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0e1525]" data-testid="packages-panel">
      <div className="p-3 border-b border-[#3d4452] min-h-[48px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-[18px] h-[18px] text-[#9da2a6]" />
            <h3 className="text-[17px] font-medium leading-tight text-[#ffffff]">Packages</h3>
            {packagesData?.language && (
              <Badge 
                variant="outline" 
                className="text-[11px] uppercase tracking-wider border-[#3d4452] text-[#9da2a6] bg-transparent"
              >
                {packagesData.language}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-[#242b3d]"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-packages"
          >
            <RefreshCw className={cn("w-[18px] h-[18px] text-[#9da2a6]", isLoading && "animate-spin")} />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#5c6670]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search npm packages..."
            className="pl-10 h-8 rounded-lg text-[15px] leading-[20px] bg-[#1c2333] border-[#3d4452] text-[#ffffff] placeholder:text-[#5c6670] focus:border-[#0079f2] focus:ring-[#0079f2]"
            data-testid="input-package-search"
          />
        </div>
      </div>

      <Tabs defaultValue="installed" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 p-1 mx-3 mt-2 bg-[#1c2333] rounded-lg" style={{ width: 'calc(100% - 24px)' }}>
          <TabsTrigger 
            value="installed" 
            className="text-[13px] rounded-lg data-[state=active]:bg-[#242b3d] data-[state=active]:text-[#ffffff] text-[#9da2a6]" 
            data-testid="tab-installed"
          >
            Installed
            <Badge 
              variant="secondary" 
              className="ml-1.5 px-1.5 py-0 text-[11px] bg-[#3d4452] text-[#d4d8dd]"
            >
              {installedPackages.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="search" 
            className="text-[13px] rounded-lg data-[state=active]:bg-[#242b3d] data-[state=active]:text-[#ffffff] text-[#9da2a6]" 
            data-testid="tab-search"
          >
            Search
            {isSearching && <Loader2 className="ml-1.5 w-[18px] h-[18px] animate-spin text-[#0079f2]" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <ShimmerSkeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 opacity-40 mb-3" />
                  <p className="text-[15px] leading-[20px] text-[#9da2a6]">Failed to load packages</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => refetch()}
                    className="text-[13px] text-[#0079f2] hover:text-[#0079f2]/80"
                  >
                    Try again
                  </Button>
                </div>
              ) : installedPackages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="w-12 h-12 text-[#5c6670] opacity-40 mb-4" />
                  <h4 className="text-[17px] font-medium leading-tight text-[#ffffff] mb-2">
                    No packages installed
                  </h4>
                  <p className="text-[13px] text-[#5c6670] mb-4 max-w-[200px]">
                    Search for packages to add dependencies to your project
                  </p>
                  <Button
                    className="h-8 rounded-lg bg-[#0079f2] hover:bg-[#0079f2]/90 text-[#ffffff] text-[13px]"
                    onClick={() => {
                      const searchTab = document.querySelector('[data-testid="tab-search"]') as HTMLElement;
                      searchTab?.click();
                    }}
                    data-testid="button-install-first"
                  >
                    <Plus className="w-[18px] h-[18px] mr-1.5" />
                    Install Package
                  </Button>
                </div>
              ) : (
                installedPackages.map((pkg) => (
                  <div
                    key={pkg.name}
                    className="mb-2 border border-[#3d4452] rounded-lg bg-[#1c2333] overflow-hidden"
                    data-testid={`package-item-${pkg.name}`}
                  >
                    <div
                      className="p-3 cursor-pointer hover:bg-[#242b3d] transition-colors"
                      onClick={() => togglePackageExpansion(pkg.name)}
                    >
                      <div className="flex items-start gap-2">
                        <button className="mt-0.5">
                          {expandedPackages.has(pkg.name) ? (
                            <ChevronDown className="w-[18px] h-[18px] text-[#5c6670]" />
                          ) : (
                            <ChevronRight className="w-[18px] h-[18px] text-[#5c6670]" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[15px] leading-[20px] font-medium text-[#ffffff]">
                              {pkg.name}
                            </span>
                            <Badge 
                              variant="outline" 
                              className="text-[11px] px-1.5 py-0 border-[#3d4452] text-[#9da2a6] bg-transparent"
                            >
                              {pkg.version}
                            </Badge>
                            <Badge
                              className={cn(
                                "text-[11px] uppercase tracking-wider px-1.5 py-0",
                                pkg.type === 'development' 
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                                  : "bg-[#0079f2]/10 text-[#0079f2] border-[#0079f2]/20"
                              )}
                            >
                              {pkg.type === 'development' ? 'dev' : 'prod'}
                            </Badge>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-[#3d4452]"
                          onClick={(e) => {
                            e.stopPropagation();
                            uninstallMutation.mutate(pkg.name);
                          }}
                          disabled={uninstallMutation.isPending}
                          data-testid={`button-uninstall-${pkg.name}`}
                        >
                          {uninstallMutation.isPending && uninstallMutation.variables === pkg.name ? (
                            <Loader2 className="w-[18px] h-[18px] animate-spin text-[#9da2a6]" />
                          ) : (
                            <Trash2 className="w-[18px] h-[18px] text-red-500" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {expandedPackages.has(pkg.name) && (
                      <div className="px-3 pb-3 border-t border-[#3d4452]">
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] uppercase tracking-wider text-[#5c6670]">Version:</span>
                            <span className="text-[13px] font-mono text-[#d4d8dd]">{pkg.version}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] uppercase tracking-wider text-[#5c6670]">Type:</span>
                            <span className="text-[13px] text-[#d4d8dd]">{pkg.type}</span>
                          </div>
                          <a
                            href={`https://www.npmjs.com/package/${pkg.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] text-[#0079f2] hover:underline inline-flex items-center gap-1"
                          >
                            View on npm →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="search" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3">
              {searchQuery.length < 2 ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <Search className="w-12 h-12 text-[#5c6670] opacity-40 mb-4" />
                  <p className="text-[15px] leading-[20px] text-[#9da2a6]">Type at least 2 characters to search</p>
                </div>
              ) : isSearching ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <ShimmerSkeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : filteredSearch.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="w-12 h-12 text-[#5c6670] opacity-40 mb-4" />
                  <h4 className="text-[17px] font-medium leading-tight text-[#ffffff] mb-2">
                    No packages found
                  </h4>
                  <p className="text-[13px] text-[#5c6670]">
                    Try a different search term
                  </p>
                </div>
              ) : (
                filteredSearch.map((pkg) => (
                  <div
                    key={pkg.name}
                    className="mb-2 p-3 border border-[#3d4452] rounded-lg bg-[#1c2333] hover:bg-[#242b3d] transition-colors"
                    data-testid={`search-result-${pkg.name}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] leading-[20px] font-medium text-[#ffffff]">
                            {pkg.name}
                          </span>
                          <Badge 
                            variant="outline" 
                            className="text-[11px] px-1.5 py-0 border-[#3d4452] text-[#9da2a6] bg-transparent"
                          >
                            v{pkg.version}
                          </Badge>
                        </div>
                        {pkg.description && (
                          <p className="text-[13px] text-[#5c6670] mt-1.5 line-clamp-2">
                            {pkg.description}
                          </p>
                        )}
                      </div>

                      <Button
                        className="h-8 rounded-lg bg-[#0079f2] hover:bg-[#0079f2]/90 text-[#ffffff] text-[13px] shrink-0"
                        onClick={() => installMutation.mutate({ packageName: pkg.name })}
                        disabled={installMutation.isPending}
                        data-testid={`button-install-${pkg.name}`}
                      >
                        {installMutation.isPending && installMutation.variables?.packageName === pkg.name ? (
                          <>
                            <Loader2 className="w-[18px] h-[18px] mr-1.5 animate-spin" />
                            Installing
                          </>
                        ) : (
                          <>
                            <Download className="w-[18px] h-[18px] mr-1.5" />
                            Install
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
