import { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  X, Terminal, MessageSquare, Rocket, Settings, 
  Play, Pause, RefreshCw, Bug, Database, GitBranch,
  Package, Globe, Shield, Zap, Activity, HelpCircle,
  Bot, Sparkles, Code2, BarChart3, User, Users,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface MobileToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

// Console output mock data
const consoleOutput = [
  { type: 'info', time: '7:38:18 AM', message: 'Server started on port 5000' },
  { type: 'success', time: '7:38:19 AM', message: 'Database connected successfully' },
  { type: 'warning', time: '7:38:20 AM', message: 'Warning: Using development environment' },
  { type: 'error', time: '7:38:21 AM', message: 'Error: Failed to load module' },
  { type: 'info', time: '7:38:22 AM', message: 'Webpack compiled successfully' },
  { type: 'log', time: '7:38:23 AM', message: 'GET /api/user 200 - 45ms' },
  { type: 'log', time: '7:38:24 AM', message: 'POST /api/projects 201 - 123ms' },
];

// AI Chat messages mock
const chatMessages = [
  { role: 'user', message: "How can I optimize this React component?" },
  { role: 'assistant', message: "Here are several ways to optimize your React component:\n1. Use React.memo for expensive renders\n2. Implement useMemo and useCallback hooks\n3. Lazy load components that aren't immediately needed" },
  { role: 'user', message: "Can you show me an example with useMemo?" },
  { role: 'assistant', message: "```jsx\nconst ExpensiveComponent = ({ data }) => {\n  const processedData = useMemo(() => {\n    return data.map(item => {\n      // Expensive operation\n      return processItem(item);\n    });\n  }, [data]);\n  \n  return <div>{processedData}</div>;\n}\n```" },
];

// Deployment stats mock
const deploymentStats = {
  status: 'active',
  url: 'https://my-app.e-code.dev',
  lastDeployed: '2 hours ago',
  builds: 42,
  uptime: '99.9%',
  visitors: '1.2k',
  bandwidth: '3.4 GB',
};

export function MobileToolsPanel({
  isOpen,
  onClose,
  activeTab = 'console',
  onTabChange
}: MobileToolsPanelProps) {
  const [consoleInput, setConsoleInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  
  // Handle swipe to close
  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onClose();
    }
  };
  
  const handleRun = () => {
    setIsRunning(!isRunning);
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };
  
  const handleSendMessage = () => {
    if (chatInput.trim()) {
      // Send message logic
      setChatInput('');
    }
  };
  
  const getConsoleIcon = (type: string) => {
    switch(type) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '▶️';
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40 md:hidden"
            onClick={onClose}
          />
          
          {/* Tools Panel */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-background z-50 md:hidden shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 500 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
              <h2 className="text-lg font-semibold">Tools</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Quick Actions Bar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-background/95">
              <Button
                size="sm"
                variant={isRunning ? "destructive" : "default"}
                className="flex-1"
                onClick={handleRun}
              >
                {isRunning ? (
                  <>
                    <Pause className="h-3 w-3 mr-1" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 mr-1" />
                    Run
                  </>
                )}
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <RefreshCw className="h-3 w-3 mr-1" />
                Restart
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <Bug className="h-3 w-3 mr-1" />
                Debug
              </Button>
            </div>
            
            {/* Tabs */}
            <Tabs 
              defaultValue={activeTab} 
              className="flex-1 flex flex-col"
              onValueChange={onTabChange}
            >
              <TabsList className="grid w-full grid-cols-4 px-4 h-auto py-1">
                <TabsTrigger value="console" className="text-xs px-2 py-1.5">
                  <Terminal className="h-3 w-3 mr-1" />
                  Console
                </TabsTrigger>
                <TabsTrigger value="ai" className="text-xs px-2 py-1.5">
                  <Bot className="h-3 w-3 mr-1" />
                  AI
                </TabsTrigger>
                <TabsTrigger value="deploy" className="text-xs px-2 py-1.5">
                  <Rocket className="h-3 w-3 mr-1" />
                  Deploy
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs px-2 py-1.5">
                  <Settings className="h-3 w-3 mr-1" />
                  Settings
                </TabsTrigger>
              </TabsList>
              
              {/* Console Tab */}
              <TabsContent value="console" className="flex-1 flex flex-col m-0">
                <ScrollArea className="flex-1 px-4 py-2">
                  <div className="space-y-1 font-mono text-xs">
                    {consoleOutput.map((log, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          'flex items-start gap-2 py-1',
                          log.type === 'error' && 'text-red-500',
                          log.type === 'warning' && 'text-yellow-500',
                          log.type === 'success' && 'text-green-500',
                          log.type === 'info' && 'text-blue-500'
                        )}
                      >
                        <span>{getConsoleIcon(log.type)}</span>
                        <span className="text-muted-foreground">{log.time}</span>
                        <span className="flex-1 break-all">{log.message}</span>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Console Input */}
                <div className="border-t p-3">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Type command..."
                      value={consoleInput}
                      onChange={(e) => setConsoleInput(e.target.value)}
                      className="flex-1 h-8 text-xs font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setConsoleInput('');
                        }
                      }}
                    />
                    <Button size="sm" className="h-8">
                      Send
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              {/* AI Chat Tab */}
              <TabsContent value="ai" className="flex-1 flex flex-col m-0">
                <ScrollArea className="flex-1 px-4 py-2">
                  <div className="space-y-3">
                    {chatMessages.map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          'flex gap-2',
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F26207] to-[#F99D25] flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <div
                          className={cn(
                            'max-w-[80%] rounded-lg p-3 text-sm',
                            msg.role === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          )}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Chat Input */}
                <div className="border-t p-3">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Ask AI anything..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button 
                      size="sm" 
                      className="h-8"
                      onClick={handleSendMessage}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              {/* Deploy Tab */}
              <TabsContent value="deploy" className="flex-1 m-0 p-4 space-y-4">
                {/* Deployment Status */}
                <div className="bg-card rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Deployment Status</h3>
                    <Badge 
                      variant="default"
                      className="bg-green-500 text-white"
                    >
                      {deploymentStats.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">URL</span>
                      <a href={deploymentStats.url} className="text-primary hover:underline flex items-center gap-1">
                        {deploymentStats.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last Deploy</span>
                      <span>{deploymentStats.lastDeployed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Builds</span>
                      <span>{deploymentStats.builds}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Uptime</span>
                      <span className="text-green-500">{deploymentStats.uptime}</span>
                    </div>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Visitors</span>
                    </div>
                    <p className="text-lg font-semibold">{deploymentStats.visitors}</p>
                  </div>
                  <div className="bg-card rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Bandwidth</span>
                    </div>
                    <p className="text-lg font-semibold">{deploymentStats.bandwidth}</p>
                  </div>
                </div>
                
                {/* Deploy Actions */}
                <div className="space-y-2">
                  <Button className="w-full" size="sm">
                    <Rocket className="h-4 w-4 mr-2" />
                    Deploy Now
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <GitBranch className="h-4 w-4 mr-2" />
                    View Build Logs
                  </Button>
                  <Button variant="outline" className="w-full" size="sm">
                    <Shield className="h-4 w-4 mr-2" />
                    Environment Variables
                  </Button>
                </div>
              </TabsContent>
              
              {/* Settings Tab */}
              <TabsContent value="settings" className="flex-1 m-0 p-4 space-y-4">
                <div className="space-y-3">
                  {/* Editor Settings */}
                  <div className="bg-card rounded-lg border p-4">
                    <h3 className="font-semibold text-sm mb-3">Editor Settings</h3>
                    <div className="space-y-2 text-sm">
                      <label className="flex items-center justify-between">
                        <span>Font Size</span>
                        <select className="bg-background border rounded px-2 py-1">
                          <option>12px</option>
                          <option selected>14px</option>
                          <option>16px</option>
                          <option>18px</option>
                        </select>
                      </label>
                      <label className="flex items-center justify-between">
                        <span>Theme</span>
                        <select className="bg-background border rounded px-2 py-1">
                          <option>Dark</option>
                          <option>Light</option>
                          <option>Auto</option>
                        </select>
                      </label>
                      <label className="flex items-center justify-between">
                        <span>Word Wrap</span>
                        <input type="checkbox" className="rounded" />
                      </label>
                      <label className="flex items-center justify-between">
                        <span>Minimap</span>
                        <input type="checkbox" className="rounded" />
                      </label>
                    </div>
                  </div>
                  
                  {/* Runtime Settings */}
                  <div className="bg-card rounded-lg border p-4">
                    <h3 className="font-semibold text-sm mb-3">Runtime Settings</h3>
                    <div className="space-y-2 text-sm">
                      <label className="flex items-center justify-between">
                        <span>Node Version</span>
                        <select className="bg-background border rounded px-2 py-1">
                          <option>18.x</option>
                          <option selected>20.x</option>
                          <option>21.x</option>
                        </select>
                      </label>
                      <label className="flex items-center justify-between">
                        <span>Auto-save</span>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </label>
                      <label className="flex items-center justify-between">
                        <span>Format on Save</span>
                        <input type="checkbox" className="rounded" defaultChecked />
                      </label>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <Package className="h-4 w-4 mr-2" />
                      Manage Packages
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <Database className="h-4 w-4 mr-2" />
                      Database Settings
                    </Button>
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Help & Support
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}