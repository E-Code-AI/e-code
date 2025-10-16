// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Code2, 
  GitBranch,
  Clock,
  TrendingUp,
  Package,
  Users,
  Activity,
  BarChart3,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectStatsProps {
  projectId: number;
  className?: string;
}

interface LanguageStats {
  language: string;
  percentage: number;
  lines: number;
  color: string;
}

interface ProjectMetrics {
  totalFiles: number;
  totalLines: number;
  totalSize: string;
  languages: LanguageStats[];
  commits: number;
  branches: number;
  contributors: number;
  lastUpdated: string;
  dependencies: number;
  devDependencies: number;
  buildTime: number;
  testCoverage: number;
}

const LANGUAGE_COLORS: Record<string, string> = {
  'TypeScript': '#3178c6',
  'JavaScript': '#f7df1e',
  'React': '#61dafb',
  'CSS': '#1572b6',
  'HTML': '#e34c26',
  'Python': '#3776ab',
  'Go': '#00add8',
  'Rust': '#dea584',
  'Other': '#6b7280'
};

export function ProjectStats({ projectId, className }: ProjectStatsProps) {
  const [metrics, setMetrics] = useState<ProjectMetrics>({
    totalFiles: 48,
    totalLines: 12453,
    totalSize: '2.4 MB',
    languages: [
      { language: 'TypeScript', percentage: 45, lines: 5604, color: LANGUAGE_COLORS.TypeScript },
      { language: 'React', percentage: 30, lines: 3736, color: LANGUAGE_COLORS.React },
      { language: 'CSS', percentage: 15, lines: 1868, color: LANGUAGE_COLORS.CSS },
      { language: 'JavaScript', percentage: 8, lines: 996, color: LANGUAGE_COLORS.JavaScript },
      { language: 'Other', percentage: 2, lines: 249, color: LANGUAGE_COLORS.Other }
    ],
    commits: 147,
    branches: 3,
    contributors: 4,
    lastUpdated: '2 hours ago',
    dependencies: 32,
    devDependencies: 15,
    buildTime: 45,
    testCoverage: 78
  });

  useEffect(() => {
    // Simulate fetching project stats
    const fetchStats = async () => {
      // In real implementation, fetch from API
      // const response = await apiRequest('GET', `/api/projects/${projectId}/stats`);
      // setMetrics(await response.json());
    };

    fetchStats();
  }, [projectId]);

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Project Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="languages">Languages</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Files</span>
                  <span className="font-mono font-medium">{metrics.totalFiles}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Lines of Code</span>
                  <span className="font-mono font-medium">{metrics.totalLines.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Project Size</span>
                  <span className="font-mono font-medium">{metrics.totalSize}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dependencies</span>
                  <span className="font-mono font-medium">{metrics.dependencies + metrics.devDependencies}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Build Time</span>
                  <span className="font-mono font-medium">{metrics.buildTime}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Test Coverage</span>
                  <span className="font-mono font-medium">{metrics.testCoverage}%</span>
                </div>
              </div>
            </div>

            {/* Test Coverage Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Test Coverage</span>
                <span className={cn(
                  "font-medium",
                  metrics.testCoverage >= 80 ? "text-green-500" : 
                  metrics.testCoverage >= 60 ? "text-yellow-500" : 
                  "text-red-500"
                )}>
                  {metrics.testCoverage}%
                </span>
              </div>
              <Progress value={metrics.testCoverage} className="h-2" />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Branches</p>
                  <p className="font-medium">{metrics.branches}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Contributors</p>
                  <p className="font-medium">{metrics.contributors}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="font-medium text-xs">{metrics.lastUpdated}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="languages" className="space-y-4 mt-4">
            {/* Language Distribution */}
            <div className="space-y-3">
              {metrics.languages.map((lang) => (
                <div key={lang.language} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: lang.color }}
                      />
                      <span className="font-medium">{lang.language}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{lang.lines.toLocaleString()} lines</span>
                      <span className="font-mono">{lang.percentage}%</span>
                    </div>
                  </div>
                  <Progress 
                    value={lang.percentage} 
                    className="h-2"
                    style={{
                      '--progress-color': lang.color
                    } as any}
                  />
                </div>
              ))}
            </div>

            {/* Language Summary */}
            <div className="pt-4 border-t">
              <div className="flex flex-wrap gap-2">
                {metrics.languages.map((lang) => (
                  <Badge 
                    key={lang.language} 
                    variant="secondary"
                    className="text-xs"
                  >
                    <div 
                      className="w-2 h-2 rounded-full mr-1" 
                      style={{ backgroundColor: lang.color }}
                    />
                    {lang.language} {lang.percentage}%
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-4">
            {/* Activity Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Commits</p>
                    <p className="text-sm text-muted-foreground">Total commits to main branch</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">{metrics.commits}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Dependencies</p>
                    <p className="text-sm text-muted-foreground">{metrics.dependencies} prod, {metrics.devDependencies} dev</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">{metrics.dependencies + metrics.devDependencies}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Performance</p>
                    <p className="text-sm text-muted-foreground">Average build time</p>
                  </div>
                </div>
                <Badge variant={metrics.buildTime < 60 ? "default" : "destructive"}>
                  {metrics.buildTime}s
                </Badge>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>3 commits pushed today</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>2 pull requests merged</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span>5 issues closed</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}