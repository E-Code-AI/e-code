import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search, TrendingUp, AlertTriangle, CheckCircle, ExternalLink,
  Edit, Eye, RefreshCw, Download, Upload, Image, FileText,
  Globe, BarChart3, Target, Zap, Settings, Copy, Sparkles
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { seoConfig, getSEOConfig } from "@/config/seo.config";
import { useToast } from "@/hooks/use-toast";

interface PageSEO {
  path: string;
  title: string;
  description: string;
  score: number;
  status: 'excellent' | 'good' | 'needs-work' | 'critical';
  issues: string[];
  lastUpdated: string;
}

// Calculate SEO score based on meta content
const calculateSEOScore = (config: any): { score: number; issues: string[] } => {
  const issues: string[] = [];
  let score = 100;

  // Title checks
  if (!config.title) {
    issues.push("Missing title");
    score -= 25;
  } else if (config.title.length < 30) {
    issues.push("Title too short (< 30 chars)");
    score -= 10;
  } else if (config.title.length > 60) {
    issues.push("Title too long (> 60 chars)");
    score -= 5;
  }

  // Description checks
  if (!config.description) {
    issues.push("Missing meta description");
    score -= 25;
  } else if (config.description.length < 120) {
    issues.push("Description too short (< 120 chars)");
    score -= 10;
  } else if (config.description.length > 160) {
    issues.push("Description too long (> 160 chars)");
    score -= 5;
  }

  // Keywords check
  if (!config.keywords || config.keywords.length < 3) {
    issues.push("Needs more keywords (< 3)");
    score -= 10;
  }

  // OG Image check
  if (!config.ogImage) {
    issues.push("Missing Open Graph image");
    score -= 15;
  }

  // Canonical check
  if (!config.canonicalUrl) {
    issues.push("Missing canonical URL");
    score -= 5;
  }

  return { score: Math.max(0, score), issues };
};

// Generate page data from config
const generatePageData = (): PageSEO[] => {
  return Object.entries(seoConfig).map(([key, config]) => {
    const { score, issues } = calculateSEOScore(config);
    let status: 'excellent' | 'good' | 'needs-work' | 'critical';

    if (score >= 90) status = 'excellent';
    else if (score >= 70) status = 'good';
    else if (score >= 50) status = 'needs-work';
    else status = 'critical';

    return {
      path: key === 'landing' ? '/' : `/${key.replace(/\//g, '/')}`,
      title: config.title,
      description: config.description,
      score,
      status,
      issues,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
  });
};

export default function SEOManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPage, setSelectedPage] = useState<PageSEO | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const pages = generatePageData();

  const filteredPages = pages.filter(page => {
    const matchesSearch = page.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         page.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || page.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate overall stats
  const stats = {
    total: pages.length,
    excellent: pages.filter(p => p.status === 'excellent').length,
    good: pages.filter(p => p.status === 'good').length,
    needsWork: pages.filter(p => p.status === 'needs-work').length,
    critical: pages.filter(p => p.status === 'critical').length,
    averageScore: Math.round(pages.reduce((acc, p) => acc + p.score, 0) / pages.length)
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'excellent':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Excellent</Badge>;
      case 'good':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Good</Badge>;
      case 'needs-work':
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Needs Work</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Critical</Badge>;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleExportSitemap = () => {
    window.open('/sitemap.xml', '_blank');
    toast({ title: "Sitemap opened", description: "Sitemap XML opened in new tab" });
  };

  const handleRefreshSitemap = () => {
    toast({ title: "Sitemap refreshed", description: "Sitemap will be regenerated on next request" });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">SEO Management</h1>
            <p className="text-muted-foreground">Optimize your pages for search engines</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleRefreshSitemap}>
              <RefreshCw className="h-4 w-4" />
              Refresh Sitemap
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExportSitemap}>
              <Download className="h-4 w-4" />
              Export Sitemap
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Pages</div>
          </Card>
          <Card className="p-4 text-center bg-gradient-to-br from-primary/10 to-primary/5">
            <div className={`text-3xl font-bold ${getScoreColor(stats.averageScore)}`}>
              {stats.averageScore}
            </div>
            <div className="text-sm text-muted-foreground">Avg. Score</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.excellent}</div>
            <div className="text-sm text-muted-foreground">Excellent</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.good}</div>
            <div className="text-sm text-muted-foreground">Good</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.needsWork}</div>
            <div className="text-sm text-muted-foreground">Needs Work</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-sm text-muted-foreground">Critical</div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pages" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="pages" className="gap-2">
              <FileText className="h-4 w-4" />
              Pages
            </TabsTrigger>
            <TabsTrigger value="issues" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Issues
            </TabsTrigger>
            <TabsTrigger value="og-generator" className="gap-2">
              <Image className="h-4 w-4" />
              OG Generator
            </TabsTrigger>
            <TabsTrigger value="sitemap" className="gap-2">
              <Globe className="h-4 w-4" />
              Sitemap
            </TabsTrigger>
          </TabsList>

          {/* Pages Tab */}
          <TabsContent value="pages" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="needs-work">Needs Work</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pages Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Issues</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPages.map((page) => (
                    <TableRow key={page.path}>
                      <TableCell className="font-mono text-sm">{page.path}</TableCell>
                      <TableCell className="max-w-[300px] truncate" title={page.title}>
                        {page.title}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${getScoreColor(page.score)}`}>
                          {page.score}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(page.status)}
                      </TableCell>
                      <TableCell className="text-center">
                        {page.issues.length > 0 ? (
                          <Badge variant="outline" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {page.issues.length}
                          </Badge>
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(page.path, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedPage(page)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Edit SEO - {page.path}</DialogTitle>
                                <DialogDescription>
                                  Optimize meta tags for better search rankings
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label>Meta Title</Label>
                                    <span className="text-xs text-muted-foreground">
                                      {page.title.length}/60 chars
                                    </span>
                                  </div>
                                  <Input defaultValue={page.title} />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label>Meta Description</Label>
                                    <span className="text-xs text-muted-foreground">
                                      {page.description.length}/160 chars
                                    </span>
                                  </div>
                                  <Textarea defaultValue={page.description} rows={3} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Issues</Label>
                                  {page.issues.length > 0 ? (
                                    <ul className="space-y-1">
                                      {page.issues.map((issue, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-yellow-600">
                                          <AlertTriangle className="h-4 w-4" />
                                          {issue}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-sm text-green-600 flex items-center gap-2">
                                      <CheckCircle className="h-4 w-4" />
                                      No issues found
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2 pt-4">
                                  <Button className="flex-1">Save Changes</Button>
                                  <Button variant="outline" className="gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    AI Optimize
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                SEO Issues to Fix
              </h3>
              <div className="space-y-4">
                {pages.filter(p => p.issues.length > 0).map((page) => (
                  <div key={page.path} className="border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium font-mono">{page.path}</span>
                      <span className={`font-bold ${getScoreColor(page.score)}`}>
                        Score: {page.score}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {page.issues.map((issue, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {pages.filter(p => p.issues.length > 0).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="text-lg font-medium">All pages are optimized!</p>
                    <p className="text-sm">No SEO issues found.</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* OG Image Generator Tab */}
          <TabsContent value="og-generator" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Image className="h-5 w-5 text-purple-500" />
                Open Graph Image Generator
              </h3>
              <p className="text-muted-foreground mb-6">
                Generate professional OG images for social media sharing. Format: 1200x630px
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Page Title</Label>
                    <Input placeholder="E-Code - AI Development Platform" />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtitle (optional)</Label>
                    <Input placeholder="Build & Deploy in Minutes" />
                  </div>
                  <div className="space-y-2">
                    <Label>Background Style</Label>
                    <Select defaultValue="gradient">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gradient">Gradient (Default)</SelectItem>
                        <SelectItem value="solid-dark">Solid Dark</SelectItem>
                        <SelectItem value="solid-light">Solid Light</SelectItem>
                        <SelectItem value="pattern">Pattern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Include Logo</Label>
                    <Select defaultValue="top-left">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">Top Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="none">No Logo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate Image
                  </Button>
                </div>

                {/* Preview */}
                <div>
                  <Label className="mb-2 block">Preview</Label>
                  <div className="aspect-[1200/630] bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex flex-col items-center justify-center text-white p-8 relative">
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">
                        E
                      </div>
                      <span className="font-semibold">E-Code</span>
                    </div>
                    <h2 className="text-2xl font-bold text-center mb-2">
                      E-Code - AI Development Platform
                    </h2>
                    <p className="text-lg opacity-80">Build & Deploy in Minutes</p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" className="flex-1 gap-2">
                      <Download className="h-4 w-4" />
                      Download PNG
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <Copy className="h-4 w-4" />
                      Copy URL
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Sitemap Tab */}
          <TabsContent value="sitemap" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    Sitemap Configuration
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your sitemap.xml and robots.txt
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => window.open('/robots.txt', '_blank')}>
                    <ExternalLink className="h-4 w-4" />
                    View robots.txt
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => window.open('/sitemap.xml', '_blank')}>
                    <ExternalLink className="h-4 w-4" />
                    View Sitemap
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{stats.total}</div>
                    <div className="text-sm text-muted-foreground">URLs in Sitemap</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">Yes</div>
                    <div className="text-sm text-muted-foreground">Robots.txt Active</div>
                  </Card>
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">Auto</div>
                    <div className="text-sm text-muted-foreground">Sitemap Updates</div>
                  </Card>
                </div>

                <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                  <h4 className="font-medium mb-2">Sitemap URLs</h4>
                  <ul className="space-y-1 text-sm font-mono">
                    <li>• https://e-code.dev/sitemap.xml (Main)</li>
                    <li>• https://e-code.dev/sitemap-index.xml (Index)</li>
                    <li>• https://e-code.dev/sitemap-blog.xml (Blog)</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Search Engine Submission</h4>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <Button variant="outline" className="gap-2">
                      <Globe className="h-4 w-4" />
                      Submit to Google
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <Globe className="h-4 w-4" />
                      Submit to Bing
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
