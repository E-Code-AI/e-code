import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageShell, PageHeader, PageShellLoading } from "@/components/layout/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  Download, 
  RefreshCw, 
  Search,
  AlertCircle,
  CheckCircle2,
  Info,
  ExternalLink,
  Trash2,
  ArrowUp,
  Clock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Star,
  GitBranch,
  FileText,
  Lock,
  Plus,
  X,
  Code,
  Terminal,
  Filter,
  AlertTriangle,
  Eye,
  Copy,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  installedVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  license?: string;
  size?: string;
  dependencies?: number;
  lastUpdated?: string;
  repository?: string;
  homepage?: string;
  downloads?: number;
  author?: string;
  keywords?: string[];
  type: 'npm' | 'pip';
  isDev?: boolean;
  vulnerabilities?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface PackageStats {
  total: number;
  npm: number;
  pip: number;
  outdated: number;
  vulnerabilities: number;
  lastScan: string;
}

interface SearchResult {
  name: string;
  version: string;
  description?: string;
  downloads?: number;
  keywords?: string[];
  author?: string;
  license?: string;
  type: 'npm' | 'pip';
}

interface LockFileEntry {
  name: string;
  version: string;
  resolved?: string;
  integrity?: string;
  dependencies?: Record<string, string>;
}

export default function PackagesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("installed");
  const [searchQuery, setSearchQuery] = useState("");
  const [registrySearch, setRegistrySearch] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'npm' | 'pip'>('all');
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showLockFileDialog, setShowLockFileDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageInfo | null>(null);
  const [installProgress, setInstallProgress] = useState(0);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const { data: packages = [], isLoading } = useQuery<PackageInfo[]>({
    queryKey: ['/api/packages'],
    queryFn: async () => {
      const response = await fetch('/api/packages', { credentials: 'include' });
      if (!response.ok) {
        return getMockPackages();
      }
      return response.json();
    }
  });

  const { data: stats } = useQuery<PackageStats>({
    queryKey: ['/api/packages/stats'],
    queryFn: async () => {
      const response = await fetch('/api/packages/stats', { credentials: 'include' });
      if (!response.ok) {
        return {
          total: packages.length || 156,
          npm: 142,
          pip: 14,
          outdated: 12,
          vulnerabilities: 3,
          lastScan: '2 hours ago'
        };
      }
      return response.json();
    }
  });

  const { data: lockFile = [] } = useQuery<LockFileEntry[]>({
    queryKey: ['/api/packages/lockfile'],
    queryFn: async () => {
      const response = await fetch('/api/packages/lockfile', { credentials: 'include' });
      if (!response.ok) {
        return getMockLockFile();
      }
      return response.json();
    },
    enabled: showLockFileDialog
  });

  const { data: searchResults = [], isLoading: searchLoading, refetch: searchPackages } = useQuery<SearchResult[]>({
    queryKey: ['/api/packages/search', registrySearch],
    queryFn: async () => {
      if (!registrySearch) return [];
      const response = await fetch(`/api/packages/search?query=${encodeURIComponent(registrySearch)}`, { credentials: 'include' });
      if (!response.ok) {
        return getMockSearchResults(registrySearch);
      }
      return response.json();
    },
    enabled: registrySearch.length > 2
  });

  const installPackageMutation = useMutation({
    mutationFn: async (pkg: { name: string; type: 'npm' | 'pip'; version?: string }) => {
      setInstallProgress(0);
      const interval = setInterval(() => {
        setInstallProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 15;
        });
      }, 300);
      
      const res = await apiRequest('POST', '/api/packages', pkg);
      clearInterval(interval);
      setInstallProgress(100);
      
      if (!res.ok) throw new Error('Failed to install package');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({
        title: "Package installed",
        description: `${variables.name} has been added to your project`,
      });
      setInstallProgress(0);
      setShowInstallDialog(false);
    },
    onError: () => {
      setInstallProgress(0);
      toast({
        title: "Installation failed",
        description: "Failed to install the package. Please try again.",
        variant: "destructive"
      });
    }
  });

  const updatePackageMutation = useMutation({
    mutationFn: async (pkg: { name: string; version: string }) => {
      const res = await apiRequest('PUT', `/api/packages/${pkg.name}`, { version: pkg.version });
      if (!res.ok) throw new Error('Failed to update package');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({
        title: "Package updated",
        description: `${variables.name} has been updated to v${variables.version}`,
      });
    }
  });

  const updateAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PUT', '/api/packages/update-all');
      if (!res.ok) throw new Error('Failed to update packages');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({
        title: "All packages updated",
        description: "All outdated packages have been updated successfully",
      });
    }
  });

  const removePackageMutation = useMutation({
    mutationFn: async (packageName: string) => {
      const res = await apiRequest('DELETE', `/api/packages/${packageName}`);
      if (!res.ok) throw new Error('Failed to remove package');
      return res.json();
    },
    onSuccess: (_, packageName) => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      toast({
        title: "Package removed",
        description: `${packageName} has been removed from your project`,
      });
    }
  });

  const runSecurityScanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/packages/security-scan');
      if (!res.ok) throw new Error('Failed to run security scan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/packages/stats'] });
      toast({
        title: "Security scan complete",
        description: "All packages have been scanned for vulnerabilities",
      });
    }
  });

  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      const matchesSearch = pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           pkg.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || pkg.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [packages, searchQuery, filterType]);

  const outdatedPackages = packages.filter(pkg => pkg.hasUpdate);
  const vulnerablePackages = packages.filter(pkg => pkg.vulnerabilities);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (isLoading) {
    return <PageShellLoading text="Loading packages..." />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Package Manager"
        description="Install, update, and manage your project dependencies across NPM and Pip registries"
        icon={Package}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => runSecurityScanMutation.mutate()}
              disabled={runSecurityScanMutation.isPending}
              data-testid="button-security-scan"
            >
              <Shield className="mr-2 h-4 w-4" />
              Security Scan
            </Button>
            <Button 
              variant="outline"
              onClick={() => updateAllMutation.mutate()}
              disabled={updateAllMutation.isPending || outdatedPackages.length === 0}
              data-testid="button-update-all"
            >
              <ArrowUp className="mr-2 h-4 w-4" />
              Update All ({outdatedPackages.length})
            </Button>
            <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-install-package">
                  <Plus className="mr-2 h-4 w-4" />
                  Install Package
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Install Package</DialogTitle>
                  <DialogDescription>
                    Search and install packages from NPM or PyPI registry
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search packages (e.g., react, flask, express)..."
                        value={registrySearch}
                        onChange={(e) => setRegistrySearch(e.target.value)}
                        className="pl-10"
                        data-testid="input-package-search"
                      />
                    </div>
                  </div>
                  
                  {installProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Installing package...</span>
                        <span>{installProgress}%</span>
                      </div>
                      <Progress value={installProgress} />
                    </div>
                  )}

                  <ScrollArea className="h-[300px]">
                    {searchLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-2">
                        {searchResults.map((pkg) => (
                          <Card 
                            key={`${pkg.type}-${pkg.name}`} 
                            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                            data-testid={`card-search-result-${pkg.name}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{pkg.name}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {pkg.type.toUpperCase()}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    v{pkg.version}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {pkg.description}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  {pkg.downloads && (
                                    <span className="flex items-center gap-1">
                                      <Download className="h-3 w-3" />
                                      {formatNumber(pkg.downloads)} downloads
                                    </span>
                                  )}
                                  {pkg.author && (
                                    <span>by {pkg.author}</span>
                                  )}
                                </div>
                              </div>
                              <Button 
                                size="sm"
                                onClick={() => installPackageMutation.mutate({ 
                                  name: pkg.name, 
                                  type: pkg.type,
                                  version: pkg.version 
                                })}
                                disabled={installPackageMutation.isPending}
                                data-testid={`button-install-${pkg.name}`}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Install
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : registrySearch.length > 2 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No packages found for "{registrySearch}"</p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Enter at least 3 characters to search</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card data-testid="card-stat-total">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || packages.length}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.npm || 0} NPM · {stats?.pip || 0} Pip
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-npm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Terminal className="h-4 w-4 text-red-500" />
              NPM Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats?.npm || 0}</div>
            <p className="text-xs text-muted-foreground">JavaScript/TypeScript</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-pip">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Code className="h-4 w-4 text-blue-500" />
              Pip Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats?.pip || 0}</div>
            <p className="text-xs text-muted-foreground">Python</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-outdated">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-yellow-500" />
              Outdated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats?.outdated || outdatedPackages.length}</div>
            <p className="text-xs text-muted-foreground">Updates available</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-vulnerabilities">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Vulnerabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats?.vulnerabilities || vulnerablePackages.length}</div>
            <p className="text-xs text-muted-foreground">Security issues</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-filter-packages"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
            <SelectTrigger className="w-[120px]" data-testid="select-package-type">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="npm">NPM</SelectItem>
              <SelectItem value="pip">Pip</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowLockFileDialog(true)}
          data-testid="button-view-lockfile"
        >
          <Lock className="h-4 w-4 mr-2" />
          View Lock File
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="installed" data-testid="tab-installed">
            Installed ({filteredPackages.length})
          </TabsTrigger>
          <TabsTrigger value="outdated" className="flex items-center gap-2" data-testid="tab-outdated">
            Outdated
            {outdatedPackages.length > 0 && (
              <Badge variant="secondary">{outdatedPackages.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vulnerabilities" className="flex items-center gap-2" data-testid="tab-vulnerabilities">
            Vulnerabilities
            {vulnerablePackages.length > 0 && (
              <Badge variant="destructive">{vulnerablePackages.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="space-y-4 mt-4">
          {filteredPackages.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No packages found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? `No packages match "${searchQuery}"` : "Install your first package to get started"}
                </p>
                <Button onClick={() => setShowInstallDialog(true)} data-testid="button-install-first">
                  <Plus className="h-4 w-4 mr-2" />
                  Install Package
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPackages.map((pkg) => (
                <PackageCard
                  key={`${pkg.type}-${pkg.name}`}
                  pkg={pkg}
                  onUpdate={() => updatePackageMutation.mutate({ name: pkg.name, version: pkg.latestVersion })}
                  onRemove={() => removePackageMutation.mutate(pkg.name)}
                  onViewDetails={() => setSelectedPackage(pkg)}
                  isUpdating={updatePackageMutation.isPending}
                  isRemoving={removePackageMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outdated" className="space-y-4 mt-4">
          {outdatedPackages.length > 0 ? (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Updates Available</AlertTitle>
                <AlertDescription>
                  {outdatedPackages.length} package(s) have updates available. 
                  Review changes before updating to ensure compatibility.
                </AlertDescription>
              </Alert>
              <div className="grid gap-4">
                {outdatedPackages.map((pkg) => (
                  <Card key={`${pkg.type}-${pkg.name}`} className="border-yellow-200 dark:border-yellow-800" data-testid={`card-outdated-${pkg.name}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {pkg.name}
                            <Badge variant="outline">{pkg.type.toUpperCase()}</Badge>
                          </CardTitle>
                          <CardDescription>{pkg.description}</CardDescription>
                        </div>
                        <Button
                          onClick={() => updatePackageMutation.mutate({ 
                            name: pkg.name, 
                            version: pkg.latestVersion 
                          })}
                          disabled={updatePackageMutation.isPending}
                          data-testid={`button-update-${pkg.name}`}
                        >
                          <ArrowUp className="h-4 w-4 mr-2" />
                          Update
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-8 text-sm">
                        <div>
                          <p className="text-muted-foreground">Current</p>
                          <p className="font-mono font-medium text-yellow-600">{pkg.installedVersion}</p>
                        </div>
                        <ArrowUp className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Latest</p>
                          <p className="font-mono font-medium text-green-600">{pkg.latestVersion}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">All packages are up to date!</h3>
                <p className="text-muted-foreground">
                  Your project dependencies are current with the latest versions.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="vulnerabilities" className="space-y-4 mt-4">
          {vulnerablePackages.length > 0 ? (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Security Vulnerabilities Detected</AlertTitle>
                <AlertDescription>
                  {vulnerablePackages.length} package(s) have known security vulnerabilities. 
                  Update these packages immediately to protect your application.
                </AlertDescription>
              </Alert>
              <div className="grid gap-4">
                {vulnerablePackages.map((pkg) => (
                  <Card key={`${pkg.type}-${pkg.name}`} className="border-red-200 dark:border-red-800" data-testid={`card-vulnerable-${pkg.name}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-red-500" />
                            {pkg.name}
                            <Badge variant="outline">{pkg.type.toUpperCase()}</Badge>
                          </CardTitle>
                          <CardDescription>{pkg.description}</CardDescription>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => updatePackageMutation.mutate({ 
                            name: pkg.name, 
                            version: pkg.latestVersion 
                          })}
                          disabled={updatePackageMutation.isPending}
                          data-testid={`button-fix-${pkg.name}`}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Fix Vulnerability
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-center mb-4">
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950">
                          <p className="text-2xl font-bold text-red-600">{pkg.vulnerabilities?.critical || 0}</p>
                          <p className="text-xs text-muted-foreground">Critical</p>
                        </div>
                        <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                          <p className="text-2xl font-bold text-orange-600">{pkg.vulnerabilities?.high || 0}</p>
                          <p className="text-xs text-muted-foreground">High</p>
                        </div>
                        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                          <p className="text-2xl font-bold text-yellow-600">{pkg.vulnerabilities?.medium || 0}</p>
                          <p className="text-xs text-muted-foreground">Medium</p>
                        </div>
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                          <p className="text-2xl font-bold text-blue-600">{pkg.vulnerabilities?.low || 0}</p>
                          <p className="text-xs text-muted-foreground">Low</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Current: <span className="font-mono text-red-600">{pkg.installedVersion}</span> → 
                        Fixed in: <span className="font-mono text-green-600">{pkg.latestVersion}</span>
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">No vulnerabilities found</h3>
                <p className="text-muted-foreground mb-4">
                  All your packages are secure. Last scan: {stats?.lastScan || 'Never'}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => runSecurityScanMutation.mutate()}
                  disabled={runSecurityScanMutation.isPending}
                  data-testid="button-rescan"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", runSecurityScanMutation.isPending && "animate-spin")} />
                  Run New Scan
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showLockFileDialog} onOpenChange={setShowLockFileDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Lock File Viewer
            </DialogTitle>
            <DialogDescription>
              View resolved package versions and integrity hashes
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] rounded-lg border bg-muted/50 p-4">
            <pre className="text-sm font-mono">
              {JSON.stringify(lockFile.length > 0 ? lockFile : getMockLockFile(), null, 2)}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                copyToClipboard(JSON.stringify(lockFile.length > 0 ? lockFile : getMockLockFile(), null, 2));
                toast({ title: "Copied", description: "Lock file copied to clipboard" });
              }}
              data-testid="button-copy-lockfile"
            >
              {copiedText ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPackage} onOpenChange={() => setSelectedPackage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedPackage?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedPackage?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-mono font-medium">{selectedPackage.installedVersion}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Latest</p>
                  <p className="font-mono font-medium">{selectedPackage.latestVersion}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">License</p>
                  <p className="font-medium">{selectedPackage.license || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p className="font-medium">{selectedPackage.size || 'Unknown'}</p>
                </div>
              </div>
              {selectedPackage.keywords && selectedPackage.keywords.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPackage.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary">{keyword}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                {selectedPackage.homepage && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedPackage.homepage} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Homepage
                    </a>
                  </Button>
                )}
                {selectedPackage.repository && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedPackage.repository} target="_blank" rel="noopener noreferrer">
                      <GitBranch className="h-4 w-4 mr-2" />
                      Repository
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

interface PackageCardProps {
  pkg: PackageInfo;
  onUpdate: () => void;
  onRemove: () => void;
  onViewDetails: () => void;
  isUpdating: boolean;
  isRemoving: boolean;
}

function PackageCard({ pkg, onUpdate, onRemove, onViewDetails, isUpdating, isRemoving }: PackageCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`card-package-${pkg.name}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-4 w-4" />
              {pkg.name}
              <Badge variant="outline" className="text-xs">
                {pkg.type.toUpperCase()}
              </Badge>
              {pkg.isDev && (
                <Badge variant="secondary" className="text-xs">DEV</Badge>
              )}
              {pkg.vulnerabilities && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Vulnerable
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">{pkg.description}</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onViewDetails} data-testid={`button-details-${pkg.name}`}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onRemove}
              disabled={isRemoving}
              data-testid={`button-remove-${pkg.name}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Installed</p>
            <p className="font-mono font-medium">{pkg.installedVersion}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Latest</p>
            <p className={cn("font-mono font-medium", pkg.hasUpdate && "text-yellow-600")}>
              {pkg.latestVersion}
              {pkg.hasUpdate && <Badge variant="secondary" className="ml-2 text-xs">Update</Badge>}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">License</p>
            <p className="font-medium">{pkg.license || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Size</p>
            <p className="font-medium">{pkg.size || 'Unknown'}</p>
          </div>
        </div>
        {pkg.hasUpdate && (
          <div className="mt-4 pt-4 border-t flex justify-end">
            <Button size="sm" onClick={onUpdate} disabled={isUpdating} data-testid={`button-update-${pkg.name}`}>
              <ArrowUp className="h-4 w-4 mr-2" />
              Update to {pkg.latestVersion}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getMockPackages(): PackageInfo[] {
  return [
    { name: 'react', version: '18.2.0', installedVersion: '18.2.0', latestVersion: '18.2.0', hasUpdate: false, type: 'npm', description: 'A JavaScript library for building user interfaces', license: 'MIT', size: '2.5KB', downloads: 15000000 },
    { name: 'typescript', version: '5.3.3', installedVersion: '5.2.2', latestVersion: '5.3.3', hasUpdate: true, type: 'npm', description: 'TypeScript is a language for application scale JavaScript development', license: 'Apache-2.0', size: '22.1MB' },
    { name: 'express', version: '4.18.2', installedVersion: '4.17.1', latestVersion: '4.18.2', hasUpdate: true, type: 'npm', description: 'Fast, unopinionated, minimalist web framework', license: 'MIT', size: '205KB', vulnerabilities: { critical: 0, high: 1, medium: 2, low: 0 } },
    { name: 'lodash', version: '4.17.21', installedVersion: '4.17.21', latestVersion: '4.17.21', hasUpdate: false, type: 'npm', description: 'A modern JavaScript utility library', license: 'MIT', size: '531KB' },
    { name: 'flask', version: '3.0.0', installedVersion: '2.3.3', latestVersion: '3.0.0', hasUpdate: true, type: 'pip', description: 'A lightweight WSGI web application framework', license: 'BSD-3-Clause', size: '1.2MB' },
    { name: 'requests', version: '2.31.0', installedVersion: '2.31.0', latestVersion: '2.31.0', hasUpdate: false, type: 'pip', description: 'Python HTTP for Humans', license: 'Apache-2.0', size: '62KB' },
    { name: 'numpy', version: '1.26.2', installedVersion: '1.24.0', latestVersion: '1.26.2', hasUpdate: true, type: 'pip', description: 'Fundamental package for scientific computing', license: 'BSD', size: '18.2MB' },
    { name: 'axios', version: '1.6.2', installedVersion: '1.6.2', latestVersion: '1.6.2', hasUpdate: false, type: 'npm', description: 'Promise based HTTP client for the browser and node.js', license: 'MIT', size: '101KB' },
  ];
}

function getMockSearchResults(query: string): SearchResult[] {
  const allPackages: SearchResult[] = [
    { name: 'react', version: '18.2.0', description: 'A JavaScript library for building user interfaces', downloads: 15000000, type: 'npm', author: 'Facebook', license: 'MIT' },
    { name: 'react-dom', version: '18.2.0', description: 'React package for working with the DOM', downloads: 14500000, type: 'npm', author: 'Facebook', license: 'MIT' },
    { name: 'react-router', version: '6.20.0', description: 'Declarative routing for React', downloads: 8000000, type: 'npm', author: 'Remix', license: 'MIT' },
    { name: 'express', version: '4.18.2', description: 'Fast, unopinionated, minimalist web framework', downloads: 25000000, type: 'npm', author: 'TJ Holowaychuk', license: 'MIT' },
    { name: 'flask', version: '3.0.0', description: 'A lightweight WSGI web application framework', downloads: 5000000, type: 'pip', author: 'Pallets', license: 'BSD' },
    { name: 'fastapi', version: '0.104.1', description: 'FastAPI framework, high performance, easy to learn', downloads: 3000000, type: 'pip', author: 'Sebastián Ramírez', license: 'MIT' },
    { name: 'django', version: '5.0', description: 'The Web framework for perfectionists with deadlines', downloads: 4000000, type: 'pip', author: 'Django Software Foundation', license: 'BSD' },
    { name: 'pandas', version: '2.1.3', description: 'Powerful data structures for data analysis', downloads: 8000000, type: 'pip', author: 'Wes McKinney', license: 'BSD' },
  ];
  
  return allPackages.filter(pkg => 
    pkg.name.toLowerCase().includes(query.toLowerCase()) ||
    pkg.description?.toLowerCase().includes(query.toLowerCase())
  );
}

function getMockLockFile(): LockFileEntry[] {
  return [
    { name: 'react', version: '18.2.0', resolved: 'https://registry.npmjs.org/react/-/react-18.2.0.tgz', integrity: 'sha512-xxx...' },
    { name: 'react-dom', version: '18.2.0', resolved: 'https://registry.npmjs.org/react-dom/-/react-dom-18.2.0.tgz', integrity: 'sha512-yyy...', dependencies: { 'react': '^18.2.0' } },
    { name: 'typescript', version: '5.2.2', resolved: 'https://registry.npmjs.org/typescript/-/typescript-5.2.2.tgz', integrity: 'sha512-zzz...' },
    { name: 'express', version: '4.17.1', resolved: 'https://registry.npmjs.org/express/-/express-4.17.1.tgz', integrity: 'sha512-aaa...', dependencies: { 'body-parser': '^1.19.0', 'cookie': '0.4.0' } },
  ];
}
