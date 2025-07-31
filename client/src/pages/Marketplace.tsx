import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { 
  Store, 
  Search, 
  Star, 
  Download, 
  Filter,
  Package,
  Zap,
  Paintbrush,
  Code,
  Shield,
  Globe,
  Smartphone,
  Database,
  BarChart3,
  FileText,
  MessageSquare,
  Heart,
  ExternalLink,
  Settings,
  TrendingUp,
  Crown,
  CheckCircle2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState('extensions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch real marketplace data
  const { data: extensions = [], isLoading } = useQuery({
    queryKey: ['/api/marketplace/extensions'],
    queryFn: async () => {
      const response = await fetch('/api/marketplace/extensions');
      if (!response.ok) throw new Error('Failed to fetch extensions');
      return response.json();
    }
  });

  const templates = [
    {
      id: 1,
      name: 'React TypeScript Starter',
      description: 'Complete React app with TypeScript, Tailwind CSS, and routing',
      author: 'E-Code Templates',
      downloads: 45672,
      rating: 4.8,
      category: 'Frontend',
      framework: 'React',
      tags: ['React', 'TypeScript', 'Tailwind CSS'],
      featured: true
    },
    {
      id: 2,
      name: 'Node.js REST API',
      description: 'Express.js API with authentication and database integration',
      author: 'Backend Masters',
      downloads: 32847,
      rating: 4.7,
      category: 'Backend',
      framework: 'Node.js',
      tags: ['Node.js', 'Express', 'REST API'],
      featured: false
    },
    {
      id: 3,
      name: 'Python Flask Blog',
      description: 'Full-featured blog application with admin panel',
      author: 'Python Community',
      downloads: 28439,
      rating: 4.6,
      category: 'Full Stack',
      framework: 'Flask',
      tags: ['Python', 'Flask', 'Blog'],
      featured: true
    }
  ];

  const categories = [
    { id: 'all', name: 'All Categories', icon: Store, count: 245 },
    { id: 'ai', name: 'AI & ML', icon: Zap, count: 32 },
    { id: 'themes', name: 'Themes', icon: Paintbrush, count: 56 },
    { id: 'languages', name: 'Languages', icon: Code, count: 28 },
    { id: 'formatters', name: 'Formatters', icon: FileText, count: 18 },
    { id: 'security', name: 'Security', icon: Shield, count: 15 },
    { id: 'tools', name: 'Tools', icon: Package, count: 67 },
    { id: 'snippets', name: 'Snippets', icon: MessageSquare, count: 29 }
  ];

  const publishers = [
    {
      id: 1,
      name: 'Microsoft',
      extensions: 45,
      downloads: 15847293,
      verified: true,
      avatar: 'MS'
    },
    {
      id: 2,
      name: 'Google',
      extensions: 28,
      downloads: 8394751,
      verified: true,
      avatar: 'GO'
    },
    {
      id: 3,
      name: 'GitHub',
      extensions: 22,
      downloads: 6743821,
      verified: true,
      avatar: 'GH'
    }
  ];

  const filteredExtensions = (extensions || fallbackExtensions).filter((ext: any) => {
    const matchesSearch = ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ext.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ext.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || ext.category.toLowerCase().includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  const ExtensionCard = ({ extension }: { extension: any }) => (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold">
            {extension.name.charAt(0)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                  {extension.name}
                </h3>
                <p className="text-sm text-muted-foreground">by {extension.author}</p>
              </div>
              
              <div className="flex items-center gap-2">
                {extension.featured && (
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500">
                    <Crown className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                )}
                {extension.installed && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Installed
                  </Badge>
                )}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {extension.description}
            </p>
            
            <div className="flex flex-wrap gap-1 mb-3">
              {extension.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{extension.rating}</span>
                  <span>({extension.reviews.toLocaleString()})</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  <span>{extension.downloads.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">{extension.price}</span>
                <Button size="sm" variant={extension.installed ? "outline" : "default"}>
                  {extension.installed ? 'Uninstall' : 'Install'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TemplateCard = ({ template }: { template: any }) => (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-lg">
            {template.framework.charAt(0)}
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                  {template.name}
                </h3>
                <p className="text-sm text-muted-foreground">by {template.author}</p>
              </div>
              
              {template.featured && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500">
                  <Crown className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-3">
              {template.description}
            </p>
            
            <div className="flex flex-wrap gap-1 mb-3">
              {template.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{template.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  <span>{template.downloads.toLocaleString()}</span>
                </div>
                <Badge variant="outline">{template.category}</Badge>
              </div>
              
              <Button size="sm">
                Use Template
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Marketplace</h1>
            <p className="text-muted-foreground">Discover extensions, themes, and templates for E-Code</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Package className="h-4 w-4 mr-2" />
              My Extensions
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Publish
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search extensions, themes, and templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Category
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {categories.map((category) => (
                <DropdownMenuItem 
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <category.icon className="h-4 w-4 mr-2" />
                  {category.name} ({category.count})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="extensions">
              Extensions ({extensions.length})
            </TabsTrigger>
            <TabsTrigger value="themes">
              Themes
            </TabsTrigger>
            <TabsTrigger value="templates">
              Templates ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="publishers">
              Publishers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="extensions" className="space-y-6">
            {/* Featured Extensions */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Featured Extensions</h2>
              <div className="grid gap-4">
                {filteredExtensions.filter((ext: any) => ext.featured).map((extension: any) => (
                  <ExtensionCard key={extension.id} extension={extension} />
                ))}
              </div>
            </div>

            {/* All Extensions */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">All Extensions</h2>
              <div className="grid gap-4">
                {filteredExtensions.filter((ext: any) => !ext.featured).map((extension: any) => (
                  <ExtensionCard key={extension.id} extension={extension} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="themes" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: 'Dark+ Professional', preview: 'dark', downloads: 245678 },
                { name: 'GitHub Light', preview: 'light', downloads: 189432 },
                { name: 'Monokai Pro', preview: 'dark', downloads: 156789 },
                { name: 'Material Ocean', preview: 'dark', downloads: 134567 },
                { name: 'Nord', preview: 'dark', downloads: 98765 },
                { name: 'Solarized Light', preview: 'light', downloads: 87654 }
              ].map((theme, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className={`h-32 rounded-lg mb-3 ${theme.preview === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} flex items-center justify-center`}>
                      <Code className={`h-8 w-8 ${theme.preview === 'dark' ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <h3 className="font-semibold mb-1">{theme.name}</h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{theme.downloads.toLocaleString()} downloads</span>
                      <Button size="sm">Apply</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="space-y-4">
              {templates.map((template) => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="publishers" className="space-y-6">
            <div className="grid gap-4">
              {publishers.map((publisher) => (
                <Card key={publisher.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback>{publisher.avatar}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold">{publisher.name}</h3>
                          {publisher.verified && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span>{publisher.extensions} extensions</span>
                          <span>{publisher.downloads.toLocaleString()} total downloads</span>
                        </div>
                      </div>
                      
                      <Button variant="outline">
                        View Extensions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}