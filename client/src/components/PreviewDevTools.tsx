import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Terminal,
  Network,
  Code,
  Bug,
  ChevronRight,
  ChevronDown,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
  Download,
  Trash2,
  Filter,
  Search,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  Clock,
  Copy,
  ExternalLink,
} from 'lucide-react';
import Editor from '@monaco-editor/react';

interface ConsoleMessage {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: Date;
  source?: string;
  stackTrace?: string;
  count?: number;
}

interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  type: string;
  size: string;
  time: number;
  timestamp: Date;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: any;
  responseBody?: any;
}

interface ElementInfo {
  tagName: string;
  id?: string;
  classes: string[];
  attributes: Record<string, string>;
  computedStyles: Record<string, string>;
  parentElement?: string;
  children: number;
  innerHTML?: string;
}

interface PreviewDevToolsProps {
  previewUrl: string;
  isOpen: boolean;
  onClose: () => void;
  position?: 'bottom' | 'right';
}

export function PreviewDevTools({ previewUrl, isOpen, onClose, position = 'bottom' }: PreviewDevToolsProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedTab, setSelectedTab] = useState('console');
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
  const [consoleFilter, setConsoleFilter] = useState('all');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRecording, setIsRecording] = useState(true);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Mock data for demonstration
  useEffect(() => {
    if (isOpen) {
      // Simulate console messages
      const messages: ConsoleMessage[] = [
        {
          id: '1',
          type: 'log',
          message: 'Application initialized',
          timestamp: new Date(),
          source: 'app.js:12',
        },
        {
          id: '2',
          type: 'info',
          message: 'Connected to WebSocket server',
          timestamp: new Date(),
          source: 'websocket.js:45',
        },
        {
          id: '3',
          type: 'warn',
          message: 'Deprecated API usage detected',
          timestamp: new Date(),
          source: 'api.js:78',
        },
        {
          id: '4',
          type: 'error',
          message: 'Failed to load resource: 404 Not Found',
          timestamp: new Date(),
          source: 'network',
          stackTrace: 'at fetchData (api.js:92)\nat main (app.js:156)',
        },
      ];
      setConsoleMessages(messages);

      // Simulate network requests
      const requests: NetworkRequest[] = [
        {
          id: '1',
          method: 'GET',
          url: '/api/user',
          status: 200,
          statusText: 'OK',
          type: 'json',
          size: '1.2 KB',
          time: 123,
          timestamp: new Date(),
        },
        {
          id: '2',
          method: 'GET',
          url: '/styles.css',
          status: 200,
          statusText: 'OK',
          type: 'css',
          size: '45.3 KB',
          time: 89,
          timestamp: new Date(),
        },
        {
          id: '3',
          method: 'POST',
          url: '/api/data',
          status: 201,
          statusText: 'Created',
          type: 'json',
          size: '567 B',
          time: 234,
          timestamp: new Date(),
        },
        {
          id: '4',
          method: 'GET',
          url: '/images/logo.png',
          status: 404,
          statusText: 'Not Found',
          type: 'image',
          size: '0 B',
          time: 45,
          timestamp: new Date(),
        },
      ];
      setNetworkRequests(requests);
    }
  }, [isOpen]);

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleMessages]);

  const clearConsole = () => setConsoleMessages([]);
  const clearNetwork = () => setNetworkRequests([]);

  const getConsoleIcon = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warn':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'debug':
        return <Bug className="w-4 h-4 text-gray-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-blue-600';
    if (status >= 400 && status < 500) return 'text-yellow-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  const filteredConsoleMessages = consoleMessages.filter(msg => {
    if (consoleFilter !== 'all' && msg.type !== consoleFilter) return false;
    if (searchTerm && !msg.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredNetworkRequests = networkRequests.filter(req => {
    if (networkFilter !== 'all' && req.type !== networkFilter) return false;
    if (searchTerm && !req.url.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const ConsoleTab = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearConsole}>
            <Trash2 className="w-4 h-4" />
          </Button>
          <Select value={consoleFilter} onValueChange={setConsoleFilter}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="log">Logs</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
              <SelectItem value="warn">Warnings</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 w-48"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{filteredConsoleMessages.length} messages</Badge>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1 font-mono text-sm">
          {filteredConsoleMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 p-2 hover:bg-muted/50 rounded ${
                msg.type === 'error' ? 'bg-red-50 dark:bg-red-950/20' : ''
              }`}
            >
              {getConsoleIcon(msg.type)}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span className={msg.type === 'error' ? 'text-red-600' : ''}>{msg.message}</span>
                    {msg.count && msg.count > 1 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {msg.count}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {msg.source && <span>{msg.source}</span>}
                    <span>{msg.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
                {msg.stackTrace && (
                  <pre className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                    {msg.stackTrace}
                  </pre>
                )}
              </div>
            </div>
          ))}
          <div ref={consoleEndRef} />
        </div>
      </ScrollArea>
    </div>
  );

  const NetworkTab = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearNetwork}>
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsRecording(!isRecording)}
            className={isRecording ? 'text-red-600' : ''}
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-gray-400'}`} />
            {isRecording ? 'Recording' : 'Paused'}
          </Button>
          <Select value={networkFilter} onValueChange={setNetworkFilter}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="css">CSS</SelectItem>
              <SelectItem value="js">JS</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="font">Fonts</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 w-48"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{filteredNetworkRequests.length} requests</Badge>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background border-b">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Size</th>
              <th className="text-left p-2">Time</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {filteredNetworkRequests.map((req) => (
              <tr key={req.id} className="hover:bg-muted/50 border-b">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {req.method}
                    </Badge>
                    <span className="truncate max-w-xs" title={req.url}>
                      {req.url}
                    </span>
                  </div>
                </td>
                <td className={`p-2 ${getStatusColor(req.status)}`}>
                  {req.status} {req.statusText}
                </td>
                <td className="p-2">{req.type}</td>
                <td className="p-2">{req.size}</td>
                <td className="p-2">{req.time}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );

  const ElementsTab = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <div className="text-sm text-muted-foreground">
            Click an element in the preview to inspect
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex">
        <div className="w-1/2 border-r">
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="font-mono text-sm">
                <div className="space-y-1">
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted p-1 rounded">
                      <ChevronDown className="w-4 h-4" />
                      <span className="text-blue-600">&lt;html&gt;</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-4">
                      <Collapsible defaultOpen>
                        <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted p-1 rounded">
                          <ChevronDown className="w-4 h-4" />
                          <span className="text-blue-600">&lt;head&gt;</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="ml-4">
                          <div className="hover:bg-muted p-1 rounded">
                            <span className="text-blue-600">&lt;title&gt;</span>
                            <span>My App</span>
                            <span className="text-blue-600">&lt;/title&gt;</span>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                      
                      <Collapsible defaultOpen>
                        <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted p-1 rounded">
                          <ChevronDown className="w-4 h-4" />
                          <span className="text-blue-600">&lt;body&gt;</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="ml-4">
                          <div className="hover:bg-muted p-1 rounded bg-blue-100 dark:bg-blue-950">
                            <span className="text-blue-600">&lt;div</span>
                            <span className="text-green-600"> id="root"</span>
                            <span className="text-blue-600">&gt;</span>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
        
        <div className="w-1/2">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {selectedElement ? (
                <>
                  <div>
                    <h4 className="font-medium mb-2">Element</h4>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tag:</span> {selectedElement.tagName}
                      </div>
                      {selectedElement.id && (
                        <div>
                          <span className="text-muted-foreground">ID:</span> #{selectedElement.id}
                        </div>
                      )}
                      {selectedElement.classes.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Classes:</span> .{selectedElement.classes.join(' .')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Computed Styles</h4>
                    <div className="space-y-1 text-sm font-mono">
                      {Object.entries(selectedElement.computedStyles).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key}:</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  Select an element to view details
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  const devToolsClass = position === 'bottom' 
    ? `fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg transition-all ${
        isMaximized ? 'h-full' : 'h-96'
      }`
    : `fixed top-0 right-0 bottom-0 bg-background border-l shadow-lg transition-all ${
        isMaximized ? 'w-full' : 'w-1/2'
      }`;

  return (
    <div className={devToolsClass}>
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span className="font-medium">Developer Tools</span>
          <Badge variant="outline" className="text-xs">
            Preview: {previewUrl}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col h-[calc(100%-3rem)]">
        <TabsList className="w-full justify-start rounded-none border-b">
          <TabsTrigger value="console" className="gap-2">
            <Terminal className="w-4 h-4" />
            Console
            {consoleMessages.filter(m => m.type === 'error').length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {consoleMessages.filter(m => m.type === 'error').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="network" className="gap-2">
            <Network className="w-4 h-4" />
            Network
          </TabsTrigger>
          <TabsTrigger value="elements" className="gap-2">
            <Code className="w-4 h-4" />
            Elements
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="console" className="flex-1 m-0">
          <ConsoleTab />
        </TabsContent>
        
        <TabsContent value="network" className="flex-1 m-0">
          <NetworkTab />
        </TabsContent>
        
        <TabsContent value="elements" className="flex-1 m-0">
          <ElementsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}