import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Search,
  Download,
  Star,
  TrendingUp,
  Code,
  Palette,
  Terminal,
  Zap,
  Shield,
  Globe,
  Settings,
  Check,
  X,
  ExternalLink,
  User,
  Calendar,
  GitBranch,
  Tag,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Extension {
  id: string;
  name: string;
  description: string;
  author: string;
  category: 'themes' | 'languages' | 'tools' | 'formatters' | 'linters' | 'snippets';
  icon: string;
  downloads: number;
  rating: number;
  version: string;
  lastUpdated: Date;
  installed: boolean;
  verified: boolean;
  tags: string[];
  screenshots?: string[];
}

interface ExtensionsMarketplaceProps {
  projectId?: number;
  className?: string;
}

export function ExtensionsMarketplace({ projectId, className }: ExtensionsMarketplaceProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [extensions, setExtensions] = useState<Extension[]>([
    {
      id: '1',
      name: 'Monokai Pro',
      description: 'A professional theme with vibrant colors and excellent readability',
      author: 'MonokaiThemes',
      category: 'themes',
      icon: '🎨',
      downloads: 125000,
      rating: 4.8,
      version: '2.1.0',
      lastUpdated: new Date(Date.now() - 86400000 * 3),
      installed: false,
      verified: true,
      tags: ['dark', 'colorful', 'popular'],
    },
    {
      id: '2',
      name: 'Python Language Support',
      description: 'Rich Python language support with IntelliSense, linting, debugging, and more',
      author: 'E-Code Team',
      category: 'languages',
      icon: '🐍',
      downloads: 890000,
      rating: 4.9,
      version: '3.0.5',
      lastUpdated: new Date(Date.now() - 86400000),
      installed: true,
      verified: true,
      tags: ['python', 'language', 'official'],
    },
    {
      id: '3',
      name: 'GitLens',
      description: 'Supercharge Git within E-Code — Visualize code authorship at a glance',
      author: 'GitKraken',
      category: 'tools',
      icon: '🔍',
      downloads: 450000,
      rating: 4.7,
      version: '12.2.1',
      lastUpdated: new Date(Date.now() - 86400000 * 7),
      installed: false,
      verified: true,
      tags: ['git', 'productivity', 'visualization'],
    },
    {
      id: '4',
      name: 'Prettier',
      description: 'Code formatter using prettier - an opinionated code formatter',
      author: 'Prettier',
      category: 'formatters',
      icon: '✨',
      downloads: 1200000,
      rating: 4.6,
      version: '9.5.0',
      lastUpdated: new Date(Date.now() - 86400000 * 2),
      installed: true,
      verified: true,
      tags: ['formatter', 'javascript', 'typescript'],
    },
    {
      id: '5',
      name: 'ESLint',
      description: 'Integrates ESLint JavaScript linter into E-Code',
      author: 'Microsoft',
      category: 'linters',
      icon: '⚡',
      downloads: 980000,
      rating: 4.5,
      version: '2.4.0',
      lastUpdated: new Date(Date.now() - 86400000 * 5),
      installed: false,
      verified: true,
      tags: ['linter', 'javascript', 'quality'],
    },
    {
      id: '6',
      name: 'React Snippets',
      description: 'ES7+ React/Redux/React-Native snippets',
      author: 'dsznajder',
      category: 'snippets',
      icon: '⚛️',
      downloads: 560000,
      rating: 4.8,
      version: '4.4.3',
      lastUpdated: new Date(Date.now() - 86400000 * 10),
      installed: false,
      verified: false,
      tags: ['react', 'snippets', 'productivity'],
    },
  ]);

  const categories = [
    { id: 'all', label: 'All', icon: Package },
    { id: 'themes', label: 'Themes', icon: Palette },
    { id: 'languages', label: 'Languages', icon: Code },
    { id: 'tools', label: 'Tools', icon: Terminal },
    { id: 'formatters', label: 'Formatters', icon: Zap },
    { id: 'linters', label: 'Linters', icon: Shield },
    { id: 'snippets', label: 'Snippets', icon: Globe },
  ];

  const filteredExtensions = extensions.filter((ext) => {
    const matchesSearch = ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || ext.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInstall = (extension: Extension) => {
    setExtensions(extensions.map(ext => {
      if (ext.id === extension.id) {
        const isInstalling = !ext.installed;
        toast({
          title: isInstalling ? "Installing extension" : "Uninstalling extension",
          description: `${isInstalling ? 'Installing' : 'Uninstalling'} ${extension.name}...`,
        });
        return { ...ext, installed: !ext.installed };
      }
      return ext;
    }));
  };

  const formatDownloads = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const formatDate = (date: Date) => {
    const diff = Date.now() - date.getTime();
    if (diff < 86400000) return 'Today';
    if (diff < 86400000 * 2) return 'Yesterday';
    if (diff < 86400000 * 7) return `${Math.floor(diff / 86400000)} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Extensions Marketplace
          </CardTitle>
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search extensions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  size="sm"
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex-shrink-0"
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {category.label}
                </Button>
              );
            })}
          </div>

          <Separator />

          {/* Extensions List */}
          <ScrollArea className="h-[calc(100vh-20rem)]">
            <div className="space-y-3">
              {filteredExtensions.map((extension) => (
                <div
                  key={extension.id}
                  className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3 flex-1">
                      <div className="text-2xl">{extension.icon}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">{extension.name}</h4>
                          {extension.verified && (
                            <Shield className="h-3.5 w-3.5 text-blue-500" />
                          )}
                          {extension.installed && (
                            <Badge variant="secondary" className="text-xs">
                              Installed
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {extension.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {extension.author}
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {formatDownloads(extension.downloads)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {extension.rating}
                          </div>
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            v{extension.version}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(extension.lastUpdated)}
                          </div>
                        </div>
                        {extension.tags.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {extension.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={extension.installed ? 'outline' : 'default'}
                        onClick={() => handleInstall(extension)}
                      >
                        {extension.installed ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Installed
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            Install
                          </>
                        )}
                      </Button>
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Featured Extensions */}
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trending This Week
            </h3>
            <div className="grid gap-2">
              {extensions.slice(0, 3).map((extension) => (
                <div
                  key={extension.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{extension.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{extension.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDownloads(extension.downloads)} downloads
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    Install
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}