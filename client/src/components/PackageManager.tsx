import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  Plus, 
  Trash2, 
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle,
  Info,
  ExternalLink,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PackageManagerProps {
  projectId: number;
  language: 'javascript' | 'python' | 'go' | 'rust';
  className?: string;
}

interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  isDevDependency?: boolean;
  latest?: string;
  outdated?: boolean;
}

export function PackageManager({ projectId, language = 'javascript', className }: PackageManagerProps) {
  const [packages, setPackages] = useState<PackageInfo[]>([
    { name: 'react', version: '18.2.0', description: 'A JavaScript library for building user interfaces', latest: '18.2.0' },
    { name: 'typescript', version: '4.9.5', description: 'TypeScript is a language for application scale JavaScript development', isDevDependency: true, latest: '5.0.2', outdated: true },
    { name: 'vite', version: '4.4.0', description: 'Next Generation Frontend Tooling', isDevDependency: true, latest: '4.4.0' },
    { name: 'tailwindcss', version: '3.3.0', description: 'A utility-first CSS framework', isDevDependency: true, latest: '3.3.2', outdated: true }
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PackageInfo[]>([]);
  const [installingPackages, setInstallingPackages] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const getPackageManager = () => {
    switch (language) {
      case 'python': return 'pip';
      case 'go': return 'go';
      case 'rust': return 'cargo';
      default: return 'npm';
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Simulate package search
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSearchResults([
        { name: 'lodash', version: '4.17.21', description: 'Lodash modular utilities' },
        { name: 'axios', version: '1.4.0', description: 'Promise based HTTP client for the browser and node.js' },
        { name: 'express', version: '4.18.2', description: 'Fast, unopinionated, minimalist web framework' }
      ]);
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: 'Failed to search packages',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleInstall = async (packageName: string, version?: string) => {
    setInstallingPackages(prev => new Set([...prev, packageName]));
    
    try {
      // Simulate package installation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newPackage: PackageInfo = {
        name: packageName,
        version: version || 'latest',
        description: 'Newly installed package'
      };
      
      setPackages(prev => [...prev, newPackage]);
      toast({
        title: 'Package Installed',
        description: `Successfully installed ${packageName}`,
      });
    } catch (error) {
      toast({
        title: 'Installation Failed',
        description: `Failed to install ${packageName}`,
        variant: 'destructive',
      });
    } finally {
      setInstallingPackages(prev => {
        const newSet = new Set(prev);
        newSet.delete(packageName);
        return newSet;
      });
    }
  };

  const handleUninstall = async (packageName: string) => {
    try {
      setPackages(prev => prev.filter(p => p.name !== packageName));
      toast({
        title: 'Package Uninstalled',
        description: `Successfully uninstalled ${packageName}`,
      });
    } catch (error) {
      toast({
        title: 'Uninstall Failed',
        description: `Failed to uninstall ${packageName}`,
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (packageName: string) => {
    setInstallingPackages(prev => new Set([...prev, packageName]));
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setPackages(prev => prev.map(p => 
        p.name === packageName 
          ? { ...p, version: p.latest || p.version, outdated: false }
          : p
      ));
      
      toast({
        title: 'Package Updated',
        description: `Successfully updated ${packageName}`,
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: `Failed to update ${packageName}`,
        variant: 'destructive',
      });
    } finally {
      setInstallingPackages(prev => {
        const newSet = new Set(prev);
        newSet.delete(packageName);
        return newSet;
      });
    }
  };

  const outdatedCount = packages.filter(p => p.outdated).length;

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Package Manager
          </CardTitle>
          <Badge variant="outline">
            {getPackageManager()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <Tabs defaultValue="installed" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="installed" className="relative">
              Installed
              {outdatedCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1">
                  {outdatedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>

          <TabsContent value="installed" className="flex-1 flex flex-col mt-4">
            {outdatedCount > 0 && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {outdatedCount} package{outdatedCount > 1 ? 's' : ''} can be updated
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {packages.map(pkg => (
                  <div
                    key={pkg.name}
                    className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{pkg.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            v{pkg.version}
                          </Badge>
                          {pkg.isDevDependency && (
                            <Badge variant="outline" className="text-xs">
                              Dev
                            </Badge>
                          )}
                          {pkg.outdated && (
                            <Badge variant="destructive" className="text-xs">
                              Outdated
                            </Badge>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {pkg.description}
                          </p>
                        )}
                        {pkg.outdated && pkg.latest && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Latest: v{pkg.latest}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {pkg.outdated && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => handleUpdate(pkg.name)}
                            disabled={installingPackages.has(pkg.name)}
                          >
                            {installingPackages.has(pkg.name) ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Download className="h-3 w-3 mr-1" />
                                Update
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => handleUninstall(pkg.name)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="pt-3 border-t mt-3 text-xs text-muted-foreground">
              {packages.length} packages installed
              {packages.filter(p => p.isDevDependency).length > 0 && 
                ` (${packages.filter(p => p.isDevDependency).length} dev)`
              }
            </div>
          </TabsContent>

          <TabsContent value="search" className="flex-1 flex flex-col mt-4">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder={`Search ${getPackageManager()} packages...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No packages found' : 'Search for packages to install'}
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map(pkg => (
                    <div
                      key={pkg.name}
                      className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{pkg.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              v{pkg.version}
                            </Badge>
                          </div>
                          {pkg.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {pkg.description}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7"
                          onClick={() => handleInstall(pkg.name, pkg.version)}
                          disabled={installingPackages.has(pkg.name) || 
                                    packages.some(p => p.name === pkg.name)}
                        >
                          {installingPackages.has(pkg.name) ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : packages.some(p => p.name === pkg.name) ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Installed
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              Install
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}