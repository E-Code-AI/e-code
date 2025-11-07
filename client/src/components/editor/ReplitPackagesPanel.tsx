import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  Search,
  Download,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface PackageInfo {
  name: string;
  version: string;
  description: string;
  size: string;
  weekly: number;
  isInstalled?: boolean;
  hasUpdate?: boolean;
  dependencies?: string[];
}

export function ReplitPackagesPanel({ projectId }: { projectId?: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [installingPackages, setInstallingPackages] = useState<Set<string>>(new Set());

  const installedPackages: PackageInfo[] = [
    {
      name: 'react',
      version: '18.2.0',
      description: 'A JavaScript library for building user interfaces',
      size: '2.3 MB',
      weekly: 15234567,
      isInstalled: true,
      hasUpdate: true,
      dependencies: ['react-dom', 'scheduler']
    },
    {
      name: '@tanstack/react-query',
      version: '5.12.2',
      description: 'Powerful asynchronous state management',
      size: '845 KB',
      weekly: 234567,
      isInstalled: true,
      dependencies: []
    },
    {
      name: 'tailwindcss',
      version: '3.4.1',
      description: 'A utility-first CSS framework',
      size: '3.1 MB',
      weekly: 4567890,
      isInstalled: true,
      dependencies: ['postcss', 'autoprefixer']
    }
  ];

  const searchResults: PackageInfo[] = [
    {
      name: 'axios',
      version: '1.6.5',
      description: 'Promise based HTTP client for the browser and node.js',
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

  const installPackage = (packageName: string) => {
    setInstallingPackages(new Set([...installingPackages, packageName]));
    setTimeout(() => {
      setInstallingPackages(prev => {
        const newSet = new Set(prev);
        newSet.delete(packageName);
        return newSet;
      });
    }, 2000);
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

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Packages</h3>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search npm packages..."
            className="pl-9 text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="installed" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 px-4 pt-2">
          <TabsTrigger value="installed" className="text-xs">
            Installed
            <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
              {installedPackages.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="search" className="text-xs">
            Search
          </TabsTrigger>
          <TabsTrigger value="dependencies" className="text-xs">
            Dependencies
          </TabsTrigger>
        </TabsList>

        {/* Installed Packages */}
        <TabsContent value="installed" className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-2">
              {installedPackages.map((pkg) => (
                <div key={pkg.name} className="mb-2 border border-gray-200 rounded">
                  <div
                    className="p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => togglePackageExpansion(pkg.name)}
                  >
                    <div className="flex items-start gap-2">
                      <button className="mt-1">
                        {expandedPackages.has(pkg.name) ? (
                          <ChevronDown className="h-3 w-3 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-gray-400" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">
                            {pkg.name}
                          </span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            v{pkg.version}
                          </Badge>
                          {pkg.hasUpdate && (
                            <Badge className="text-xs px-1.5 py-0 bg-green-50 text-green-700">
                              Update available
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{pkg.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>{pkg.size}</span>
                          <span>•</span>
                          <span>{formatWeeklyDownloads(pkg.weekly)} weekly</span>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        {pkg.hasUpdate && (
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ArrowUp className="h-3 w-3 text-green-600" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Trash2 className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {expandedPackages.has(pkg.name) && pkg.dependencies && (
                    <div className="px-3 pb-3 border-t border-gray-100">
                      <div className="mt-2">
                        <span className="text-xs text-gray-600">Dependencies:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pkg.dependencies.map((dep) => (
                            <Badge key={dep} variant="outline" className="text-xs px-2 py-0">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Search Results */}
        <TabsContent value="search" className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-2">
              {searchQuery ? (
                searchResults.map((pkg) => (
                  <div key={pkg.name} className="mb-2 p-3 border border-gray-200 rounded hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">
                            {pkg.name}
                          </span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            v{pkg.version}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{pkg.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>{pkg.size}</span>
                          <span>•</span>
                          <span>{formatWeeklyDownloads(pkg.weekly)} weekly</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => installPackage(pkg.name)}
                        disabled={installingPackages.has(pkg.name)}
                      >
                        {installingPackages.has(pkg.name) ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
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
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <Package className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">Search for packages to install</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Dependencies Tree */}
        <TabsContent value="dependencies" className="flex-1">
          <ScrollArea className="h-full">
            <div className="p-3">
              <div className="space-y-2">
                {installedPackages.map((pkg) => (
                  <div key={pkg.name} className="border-l-2 border-gray-200 pl-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-3 w-3 text-gray-400" />
                      <span className="text-sm font-medium">{pkg.name}</span>
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {pkg.version}
                      </Badge>
                    </div>
                    {pkg.dependencies && pkg.dependencies.length > 0 && (
                      <div className="ml-5 mt-2 space-y-1">
                        {pkg.dependencies.map((dep) => (
                          <div key={dep} className="flex items-center gap-2 text-xs text-gray-600">
                            <ChevronRight className="h-3 w-3 text-gray-400" />
                            {dep}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}