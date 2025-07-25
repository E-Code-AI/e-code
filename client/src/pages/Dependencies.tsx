import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ArrowDown,
  Clock,
  Shield,
  Star,
  GitBranch,
  Users,
  Calendar,
  FileText,
  Link2,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { ECodeLoading } from "@/components/ECodeLoading";

interface Dependency {
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
  vulnerabilities?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface DependencyStats {
  total: number;
  outdated: number;
  vulnerabilities: number;
  lastUpdated: string;
}

export default function Dependencies() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("installed");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDependency, setSelectedDependency] = useState<Dependency | null>(null);
  const [updateProgress, setUpdateProgress] = useState(0);

  // Fetch installed dependencies
  const { data: dependencies = [], isLoading: depsLoading } = useQuery<Dependency[]>({
    queryKey: ['/api/dependencies'],
    queryFn: async () => {
      // Mock data for demonstration
      return [
        {
          name: 'react',
          version: '^18.2.0',
          description: 'A JavaScript library for building user interfaces',
          installedVersion: '18.2.0',
          latestVersion: '18.3.1',
          hasUpdate: true,
          license: 'MIT',
          size: '316 kB',
          dependencies: 3,
          lastUpdated: '2 weeks ago',
          repository: 'https://github.com/facebook/react',
          homepage: 'https://react.dev'
        },
        {
          name: 'express',
          version: '^4.17.1',
          description: 'Fast, unopinionated, minimalist web framework',
          installedVersion: '4.17.1',
          latestVersion: '4.18.3',
          hasUpdate: true,
          license: 'MIT',
          size: '211 kB',
          dependencies: 30,
          lastUpdated: '1 month ago',
          vulnerabilities: {
            critical: 0,
            high: 1,
            medium: 2,
            low: 0
          }
        },
        {
          name: 'typescript',
          version: '^5.3.3',
          description: 'TypeScript is a language for application scale JavaScript development',
          installedVersion: '5.3.3',
          latestVersion: '5.3.3',
          hasUpdate: false,
          license: 'Apache-2.0',
          size: '68.1 MB',
          dependencies: 0,
          lastUpdated: '3 days ago'
        },
        {
          name: 'vite',
          version: '^5.0.8',
          description: 'Native-ESM powered web dev build tool',
          installedVersion: '5.0.8',
          latestVersion: '5.1.3',
          hasUpdate: true,
          license: 'MIT',
          size: '2.7 MB',
          dependencies: 9,
          lastUpdated: '1 week ago'
        },
        {
          name: '@tanstack/react-query',
          version: '^5.17.15',
          description: 'Powerful asynchronous state management',
          installedVersion: '5.17.15',
          latestVersion: '5.17.15',
          hasUpdate: false,
          license: 'MIT',
          size: '2.2 MB',
          dependencies: 1,
          lastUpdated: '5 days ago'
        }
      ];
    }
  });

  // Fetch dependency stats
  const { data: stats, isLoading: statsLoading } = useQuery<DependencyStats>({
    queryKey: ['/api/dependencies/stats'],
    queryFn: async () => {
      // Mock data for demonstration
      return {
        total: 156,
        outdated: 23,
        vulnerabilities: 3,
        lastUpdated: '2 hours ago'
      };
    }
  });

  // Search packages
  const { data: searchResults = [], isLoading: searchLoading, refetch: searchPackages } = useQuery({
    queryKey: ['/api/packages/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      
      // Mock search results
      return [
        {
          name: 'lodash',
          version: '4.17.21',
          description: 'Lodash modular utilities',
          downloads: '45,234,567',
          stars: '58.5k',
          license: 'MIT'
        },
        {
          name: 'axios',
          version: '1.6.7',
          description: 'Promise based HTTP client for the browser and node.js',
          downloads: '38,456,789',
          stars: '103k',
          license: 'MIT'
        }
      ];
    },
    enabled: false
  });

  // Update dependency mutation
  const updateDependencyMutation = useMutation({
    mutationFn: async (dep: { name: string; version: string }) => {
      setUpdateProgress(0);
      const interval = setInterval(() => {
        setUpdateProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 20;
        });
      }, 300);
      
      const res = await apiRequest('PUT', `/api/dependencies/${dep.name}`, { version: dep.version });
      if (!res.ok) throw new Error('Failed to update dependency');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dependencies'] });
      toast({
        title: "Dependency updated",
        description: "The package has been updated successfully",
      });
      setUpdateProgress(0);
    }
  });

  // Update all dependencies mutation
  const updateAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PUT', '/api/dependencies/update-all');
      if (!res.ok) throw new Error('Failed to update dependencies');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dependencies'] });
      toast({
        title: "All dependencies updated",
        description: "All outdated packages have been updated",
      });
    }
  });

  // Install package mutation
  const installPackageMutation = useMutation({
    mutationFn: async (packageName: string) => {
      const res = await apiRequest('POST', '/api/dependencies', { name: packageName });
      if (!res.ok) throw new Error('Failed to install package');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dependencies'] });
      toast({
        title: "Package installed",
        description: "The package has been added to your project",
      });
    }
  });

  // Remove dependency mutation
  const removeDependencyMutation = useMutation({
    mutationFn: async (packageName: string) => {
      const res = await apiRequest('DELETE', `/api/dependencies/${packageName}`);
      if (!res.ok) throw new Error('Failed to remove dependency');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dependencies'] });
      toast({
        title: "Dependency removed",
        description: "The package has been removed from your project",
      });
    }
  });

  const filteredDependencies = dependencies.filter(dep =>
    dep.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const outdatedDependencies = dependencies.filter(dep => dep.hasUpdate);
  const vulnerableDependencies = dependencies.filter(dep => dep.vulnerabilities);

  if (depsLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ECodeLoading size="lg" text="Loading dependencies..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dependencies</h1>
          <p className="text-muted-foreground">
            Manage your project dependencies and keep them up to date
          </p>
        </div>
        <div className="space-x-2">
          <Button 
            variant="outline"
            onClick={() => updateAllMutation.mutate()}
            disabled={updateAllMutation.isPending || outdatedDependencies.length === 0}
          >
            <ArrowUp className="mr-2 h-4 w-4" />
            Update All ({outdatedDependencies.length})
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Install Package
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Production & Dev
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-yellow-500" />
              Outdated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats?.outdated || 0}</div>
            <p className="text-xs text-muted-foreground">
              Updates available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-500" />
              Vulnerabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats?.vulnerabilities || 0}</div>
            <p className="text-xs text-muted-foreground">
              Security issues found
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{stats?.lastUpdated}</div>
            <Button variant="ghost" size="sm" className="h-6 px-2 mt-1">
              <RefreshCw className="h-3 w-3 mr-1" />
              Check Now
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search dependencies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="installed">
            Installed ({dependencies.length})
          </TabsTrigger>
          <TabsTrigger value="outdated" className="flex items-center gap-2">
            Outdated
            {outdatedDependencies.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {outdatedDependencies.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="vulnerabilities" className="flex items-center gap-2">
            Vulnerabilities
            {vulnerableDependencies.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {vulnerableDependencies.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Installed Tab */}
        <TabsContent value="installed" className="space-y-4">
          {updateProgress > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Updating dependencies...</AlertTitle>
              <AlertDescription className="mt-2">
                <Progress value={updateProgress} className="h-2" />
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            {filteredDependencies.map((dep) => (
              <Card key={dep.name} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        {dep.name}
                        {dep.vulnerabilities && (
                          <Badge variant="destructive" className="ml-2">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Vulnerabilities
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {dep.description}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDependencyMutation.mutate(dep.name)}
                      disabled={removeDependencyMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Installed</p>
                      <p className="font-medium">{dep.installedVersion}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Latest</p>
                      <p className="font-medium">
                        {dep.latestVersion}
                        {dep.hasUpdate && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Update
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">License</p>
                      <p className="font-medium">{dep.license || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Size</p>
                      <p className="font-medium">{dep.size || 'Unknown'}</p>
                    </div>
                  </div>

                  {dep.vulnerabilities && (
                    <Alert variant="destructive">
                      <Shield className="h-4 w-4" />
                      <AlertTitle>Security Vulnerabilities</AlertTitle>
                      <AlertDescription className="mt-2">
                        <div className="flex gap-4 text-sm">
                          <span>Critical: {dep.vulnerabilities.critical}</span>
                          <span>High: {dep.vulnerabilities.high}</span>
                          <span>Medium: {dep.vulnerabilities.medium}</span>
                          <span>Low: {dep.vulnerabilities.low}</span>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2 text-sm">
                      {dep.repository && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={dep.repository} target="_blank" rel="noopener noreferrer">
                            <GitBranch className="h-3 w-3 mr-1" />
                            Repository
                          </a>
                        </Button>
                      )}
                      {dep.homepage && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={dep.homepage} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Homepage
                          </a>
                        </Button>
                      )}
                    </div>
                    {dep.hasUpdate && (
                      <Button
                        size="sm"
                        onClick={() => updateDependencyMutation.mutate({
                          name: dep.name,
                          version: dep.latestVersion
                        })}
                        disabled={updateDependencyMutation.isPending}
                      >
                        <ArrowUp className="h-3 w-3 mr-1" />
                        Update
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Outdated Tab */}
        <TabsContent value="outdated" className="space-y-4">
          {outdatedDependencies.length > 0 ? (
            <div className="grid gap-4">
              {outdatedDependencies.map((dep) => (
                <Card key={dep.name}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {dep.name}
                    </CardTitle>
                    <CardDescription>{dep.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Current: <span className="font-medium text-foreground">{dep.installedVersion}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Latest: <span className="font-medium text-green-600">{dep.latestVersion}</span>
                        </p>
                      </div>
                      <Button
                        onClick={() => updateDependencyMutation.mutate({
                          name: dep.name,
                          version: dep.latestVersion
                        })}
                        disabled={updateDependencyMutation.isPending}
                      >
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Update
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All dependencies are up to date!</h3>
                <p className="text-muted-foreground">
                  Great job keeping your project dependencies current.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Vulnerabilities Tab */}
        <TabsContent value="vulnerabilities" className="space-y-4">
          {vulnerableDependencies.length > 0 ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Security vulnerabilities detected</AlertTitle>
                <AlertDescription>
                  Update these packages to fix known security issues
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-4">
                {vulnerableDependencies.map((dep) => (
                  <Card key={dep.name} className="border-destructive">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-4 w-4 text-destructive" />
                        {dep.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-red-500">
                            {dep.vulnerabilities?.critical || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Critical</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-orange-500">
                            {dep.vulnerabilities?.high || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">High</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-yellow-500">
                            {dep.vulnerabilities?.medium || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Medium</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-500">
                            {dep.vulnerabilities?.low || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">Low</p>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <Button
                          className="w-full"
                          variant="destructive"
                          onClick={() => updateDependencyMutation.mutate({
                            name: dep.name,
                            version: dep.latestVersion
                          })}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Update to {dep.latestVersion} to fix
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <ShieldCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No vulnerabilities found</h3>
                <p className="text-muted-foreground">
                  All your dependencies are secure.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}