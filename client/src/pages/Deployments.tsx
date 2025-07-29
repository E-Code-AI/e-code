import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Globe, RefreshCw, Shield, AlertTriangle, Sparkles, ChevronDown,
  Terminal, Laptop, Database, Activity, Package, MoreVertical,
  ExternalLink, Lock, Clock, Server, History, Eye, EyeOff,
  X, Edit2, Search, Play, Pause, Calendar, Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Deployments() {
  const { toast } = useToast();
  const [showBottomMenu, setShowBottomMenu] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [dateAfter, setDateAfter] = useState('');
  const [dateBefore, setDateBefore] = useState('');
  const [logLevel, setLogLevel] = useState('all');
  const [isLive, setIsLive] = useState(false);
  const [wrapText, setWrapText] = useState(true);
  const [showColors, setShowColors] = useState(true);
  const [expandLogs, setExpandLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleDebugWithAgent = () => {
    toast({
      title: "Starting AI Agent",
      description: "The AI Agent will help debug your deployment issues.",
    });
  };

  const handleRedeploy = () => {
    toast({
      title: "Redeploying",
      description: "Your application is being redeployed...",
    });
  };

  const handleSecurityScan = () => {
    toast({
      title: "Security Scan Started",
      description: "Running security analysis on your deployment...",
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const logEntries = [
    { time: '07-27 15:57:48', level: 'info', message: 'reloading process' },
    { time: '07-27 15:57:48', level: 'info', message: 'NODE_ENV: development' },
    { time: '07-27 15:57:50', level: 'info', message: 'Generated icon-144.png' },
    { time: '07-27 15:57:50', level: 'info', message: 'Generated icon-192.png' },
    { time: '07-27 15:57:50', level: 'info', message: 'Generated icon-256.png' },
    { time: '07-27 15:57:50', level: 'info', message: 'Generated icon-512.png' },
    { time: '07-27 15:57:50', level: 'info', message: 'All favicon files generated successfully' },
    { time: '07-27 15:57:50', level: 'info', message: '12:57:50 PM [express] Favicons generated' },
    { time: '07-27 15:57:50', level: 'info', message: 'Using custom JWT authentication for production' },
    { time: '07-27 15:57:50', level: 'info', message: 'Next automatic backup scheduled for: 2025-06-22' },
    { time: '07-27 15:57:50', level: 'info', message: '12:57:50 PM [express] serving on port 5000' },
    { time: '07-27 15:57:50', level: 'info', message: 'Backup service initialized' },
    { time: '07-27 15:57:50', level: 'info', message: 'Database connection established' },
  ];

  const filteredLogs = logEntries.filter(log => {
    if (errorsOnly && log.level !== 'error') return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl space-y-6 py-6 pb-20">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">

            {/* Main Deployment Card */}
            <Card>
              <CardContent className="pt-6">
                {/* Deployment Header */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <h2 className="text-lg sm:text-xl font-semibold">my-awesome-app</h2>
                      <Badge variant="default" className="bg-green-500">
                        Production
                      </Badge>
                      <Badge variant="outline">
                        <Eye className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <a href="#" className="hover:text-primary flex items-center gap-1">
                          my-awesome-app.e-code.app
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="flex items-center gap-1">
                        <Server className="h-3 w-3" />
                        <span>Autoscale</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Deployed 2 hours ago</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowBottomMenu(!showBottomMenu)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                {/* Deployment Actions */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <Button size="default" onClick={handleRedeploy} className="w-full sm:w-auto">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Redeploy
                  </Button>
                  <Button size="default" variant="outline" className="w-full sm:w-auto">
                    <Edit2 className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Edit commands and secrets</span>
                    <span className="sm:hidden">Edit config</span>
                  </Button>
                  <Button size="default" variant="outline" onClick={handleSecurityScan} className="w-full sm:w-auto">
                    <Shield className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Run security scan</span>
                    <span className="sm:hidden">Scan</span>
                  </Button>
                </div>

            {/* Build Status Alert */}
            <Card className="border-red-500 bg-red-50 dark:bg-red-950/20 mb-6">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 dark:text-red-100">Build failed</h3>
                    <pre className="mt-2 text-sm bg-red-100 dark:bg-red-900/20 p-3 rounded-md overflow-x-auto">
                      <code className="text-red-800 dark:text-red-200">
{`error: Module not found: Error: Can't resolve './components/NonExistentComponent'
  --> src/App.tsx:5:8
   |
 5 | import NonExistentComponent from './components/NonExistentComponent';
   |        ^^^^^^^^^^^^^^^^^^^^
   |
   = This component does not exist in the specified path`}
                      </code>
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agent Suggestions */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Agent suggestion</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      It looks like there's an import error in your application. The AI Agent can help fix this issue automatically.
                    </p>
                    <Button variant="default" size="sm" onClick={handleDebugWithAgent}>
                      Debug with Agent
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expandable Sections */}
            <div className="space-y-3">
              {/* Deployment History */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <button 
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => toggleSection('history')}
                  >
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      <span className="text-sm font-medium">Deployment History</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedSection === 'history' ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {expandedSection === 'history' && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between p-2 hover:bg-muted rounded">
                        <div>
                          <p className="text-sm font-medium">v1.2.3</p>
                          <p className="text-xs text-muted-foreground">2 hours ago - Build failed</p>
                        </div>
                        <Badge variant="destructive">Failed</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 hover:bg-muted rounded">
                        <div>
                          <p className="text-sm font-medium">v1.2.2</p>
                          <p className="text-xs text-muted-foreground">Yesterday - Deployed successfully</p>
                        </div>
                        <Badge variant="default">Success</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 hover:bg-muted rounded">
                        <div>
                          <p className="text-sm font-medium">v1.2.1</p>
                          <p className="text-xs text-muted-foreground">3 days ago - Deployed successfully</p>
                        </div>
                        <Badge variant="default">Success</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Failed Builds */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <button 
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => toggleSection('failed')}
                  >
                    <span className="text-sm font-medium">View all failed builds</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedSection === 'failed' ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {expandedSection === 'failed' && (
                    <div className="mt-4 space-y-2">
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded">
                        <p className="text-sm font-medium">Build #123 - 2 hours ago</p>
                        <p className="text-xs text-muted-foreground mt-1">Module not found error</p>
                      </div>
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded">
                        <p className="text-sm font-medium">Build #120 - 5 hours ago</p>
                        <p className="text-xs text-muted-foreground mt-1">TypeScript compilation error</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4 mt-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search"
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                {/* Time Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="default" className="gap-1 sm:gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="hidden sm:inline">Time</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium">Date range</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="date-after">After</Label>
                        <Input
                          id="date-after"
                          placeholder="jj / mm / aaaa — : —"
                          value={dateAfter}
                          onChange={(e) => setDateAfter(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="date-before">Before</Label>
                        <Input
                          id="date-before"
                          placeholder="jj / mm / aaaa — : —"
                          value={dateBefore}
                          onChange={(e) => setDateBefore(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => {
                        setDateAfter('');
                        setDateBefore('');
                      }}
                    >
                      Clear all filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

                {/* Log Level Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="default" className="gap-1 sm:gap-2">
                      <span className="hidden sm:inline">Log</span>
                      <span className="sm:hidden">Log</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                <PopoverContent align="end" className="w-48">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="errors-only"
                        checked={errorsOnly}
                        onCheckedChange={(checked) => setErrorsOnly(checked as boolean)}
                      />
                      <Label htmlFor="errors-only">Errors only</Label>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              </div>
            </div>

            {/* Logs Display */}
            <Card className="font-mono text-xs sm:text-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[300px] sm:max-h-[500px] overflow-y-auto">
                  <div className="min-w-full">
                    {filteredLogs.map((log, index) => (
                      <div 
                        key={index} 
                        className={`px-2 sm:px-4 py-1 hover:bg-muted/50 border-b border-border/50 ${
                          log.level === 'error' ? 'text-red-500' : ''
                        } ${wrapText ? 'whitespace-pre-wrap' : 'whitespace-nowrap'}`}
                      >
                        <span className="text-muted-foreground mr-2 sm:mr-4">{log.time}</span>
                        <span className={showColors ? (log.level === 'error' ? 'text-red-500' : '') : ''}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Log Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandLogs(!expandLogs)}
                  className="h-8"
                >
                  <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 transition-transform ${expandLogs ? 'rotate-180' : ''}`} />
                  <span className="text-xs sm:text-sm">Expand</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWrapText(!wrapText)}
                  className={`h-8 ${wrapText ? '' : 'text-muted-foreground'}`}
                >
                  <span className="text-xs sm:text-sm">Wrap</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowColors(!showColors)}
                  className={`h-8 ${showColors ? '' : 'text-muted-foreground'}`}
                >
                  <span className="text-xs sm:text-sm">Colors</span>
                </Button>
              </div>
              
              <Button
                variant={isLive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsLive(!isLive)}
                className="h-8 w-full sm:w-auto"
              >
                {isLive ? <Pause className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> : <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />}
                <span className="text-xs sm:text-sm">Live</span>
              </Button>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">Analytics coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">Resources management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bottom action icons */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-2 sm:p-4 md:hidden">
          <div className="flex items-center justify-around">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Laptop className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Terminal className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Database className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Activity className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Package className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bottom Menu Popup */}
        {showBottomMenu && (
          <div className="fixed inset-0 z-50" onClick={() => setShowBottomMenu(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <div className="absolute bottom-0 left-0 right-0 bg-background border-t animate-slide-up">
              <div className="p-4 space-y-2 safe-bottom">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-base"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRedeploy();
                    setShowBottomMenu(false);
                  }}
                >
                  <RefreshCw className="mr-3 h-5 w-5" />
                  Redeploy
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-base"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBottomMenu(false);
                    toast({ title: "Tab closed" });
                  }}
                >
                  <X className="mr-3 h-5 w-5" />
                  Close Tab
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}