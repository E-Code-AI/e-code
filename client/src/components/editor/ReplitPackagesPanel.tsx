import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  AlertCircle,
  Loader2
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
      <div className="h-full flex flex-col items-center justify-center p-4" data-testid="packages-panel-no-project">
        <Package className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Select a project to manage packages</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background" data-testid="packages-panel">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Packages</h3>
            {packagesData?.language && (
              <Badge variant="outline" className="text-xs">
                {packagesData.language}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-packages"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search npm packages..."
            className="pl-9 text-sm"
            data-testid="input-package-search"
          />
        </div>
      </div>

      <Tabs defaultValue="installed" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 px-4 pt-2">
          <TabsTrigger value="installed" className="text-xs" data-testid="tab-installed">
            Installed
            <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
              {installedPackages.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="search" className="text-xs" data-testid="tab-search">
            Search
            {isSearching && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full rounded" />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-10 w-10 text-destructive mb-2" />
                  <p className="text-sm text-muted-foreground">Failed to load packages</p>
                  <Button variant="link" size="sm" onClick={() => refetch()}>
                    Try again
                  </Button>
                </div>
              ) : installedPackages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No packages installed</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Search for packages to add dependencies
                  </p>
                </div>
              ) : (
                installedPackages.map((pkg) => (
                  <div
                    key={pkg.name}
                    className="mb-2 border border-border rounded"
                    data-testid={`package-item-${pkg.name}`}
                  >
                    <div
                      className="p-3 cursor-pointer hover:bg-muted"
                      onClick={() => togglePackageExpansion(pkg.name)}
                    >
                      <div className="flex items-start gap-2">
                        <button className="mt-1">
                          {expandedPackages.has(pkg.name) ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground">
                              {pkg.name}
                            </span>
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {pkg.version}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-xs px-1.5 py-0",
                                pkg.type === 'development' && "bg-yellow-500/10 text-yellow-600"
                              )}
                            >
                              {pkg.type === 'development' ? 'dev' : 'prod'}
                            </Badge>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            uninstallMutation.mutate(pkg.name);
                          }}
                          disabled={uninstallMutation.isPending}
                          data-testid={`button-uninstall-${pkg.name}`}
                        >
                          {uninstallMutation.isPending && uninstallMutation.variables === pkg.name ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {expandedPackages.has(pkg.name) && (
                      <div className="px-3 pb-3 border-t border-border">
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Version:</span>
                            <span className="font-mono">{pkg.version}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Type:</span>
                            <span>{pkg.type}</span>
                          </div>
                          <a
                            href={`https://www.npmjs.com/package/${pkg.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
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

        <TabsContent value="search" className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-2">
              {searchQuery.length < 2 ? (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <Search className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Type at least 2 characters to search</p>
                </div>
              ) : isSearching ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full rounded" />
                  ))}
                </div>
              ) : filteredSearch.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No packages found</p>
                </div>
              ) : (
                filteredSearch.map((pkg) => (
                  <div
                    key={pkg.name}
                    className="mb-2 p-3 border border-border rounded hover:bg-muted"
                    data-testid={`search-result-${pkg.name}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground">
                            {pkg.name}
                          </span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            v{pkg.version}
                          </Badge>
                        </div>
                        {pkg.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {pkg.description}
                          </p>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs shrink-0"
                        onClick={() => installMutation.mutate({ packageName: pkg.name })}
                        disabled={installMutation.isPending}
                        data-testid={`button-install-${pkg.name}`}
                      >
                        {installMutation.isPending && installMutation.variables?.packageName === pkg.name ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Installing
                          </>
                        ) : (
                          <>
                            <Download className="h-3 w-3 mr-1" />
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
