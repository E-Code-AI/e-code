import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Terminal, FileText, Database, Globe, GitBranch, 
  Play, Loader2, CheckCircle, AlertCircle, Code,
  FolderOpen, FileCode, Command, Cpu, Hash, Shield,
  Package, Cloud, Brain, Activity, Server, Zap
} from 'lucide-react';

// Use Web Crypto API for generating UUIDs
const crypto = window.crypto;

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

interface ExecutionResult {
  content?: Array<{ type: string; text: string }>;
  error?: string;
}

export default function MCPInterface() {
  const { toast } = useToast();
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [resources, setResources] = useState<MCPResource[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [toolArgs, setToolArgs] = useState<string>('{}');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverHealth, setServerHealth] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('tools');

  // MCP Server endpoints - Using integrated MCP server on Express
  const MCP_SERVER_URL = '/mcp';  // Direct MCP HTTP transport
  const EXPRESS_MCP_URL = '/api/mcp';

  // Load tools - Using MCP HTTP transport
  const loadTools = async () => {
    setIsLoading(true);
    try {
      // Connect to MCP server first
      const connectResponse = await fetch(`${MCP_SERVER_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: crypto.randomUUID() }),
      });
      const connection = await connectResponse.json();
      
      // List tools using MCP protocol
      const response = await fetch(`${MCP_SERVER_URL}/message`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-Id': connection.sessionId,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 1,
        }),
      });
      const result = await response.json();
      setTools(result.result?.tools || []);
      toast({
        title: 'Tools Loaded',
        description: `Successfully loaded ${result.result?.tools?.length || 0} MCP tools`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load MCP tools',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load resources - Using MCP HTTP transport
  const loadResources = async () => {
    setIsLoading(true);
    try {
      // Connect to MCP server first
      const connectResponse = await fetch(`${MCP_SERVER_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: crypto.randomUUID() }),
      });
      const connection = await connectResponse.json();
      
      // List resources using MCP protocol
      const response = await fetch(`${MCP_SERVER_URL}/message`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-Id': connection.sessionId,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'resources/list',
          params: {},
          id: 1,
        }),
      });
      const result = await response.json();
      setResources(result.result?.resources || []);
      toast({
        title: 'Resources Loaded',
        description: `Successfully loaded ${result.result?.resources?.length || 0} MCP resources`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load MCP resources',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check server health - Using integrated MCP server
  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${MCP_SERVER_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'health-check' }),
      });
      const data = await response.json();
      setServerHealth({
        status: data.status || 'connected',
        capabilities: data.capabilities,
      });
      toast({
        title: 'Server Status',
        description: `MCP Server is ${data.status || 'connected'} with capabilities: ${Object.keys(data.capabilities || {}).join(', ')}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check server health',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Execute tool
  const executeTool = async () => {
    if (!selectedTool) {
      toast({
        title: 'Error',
        description: 'Please select a tool first',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setExecutionResult(null);
    
    try {
      const args = JSON.parse(toolArgs);
      const response = await fetch(`${MCP_SERVER_URL}/tools/${selectedTool}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });
      
      const result = await response.json();
      setExecutionResult(result);
      
      toast({
        title: 'Tool Executed',
        description: `Successfully executed ${selectedTool}`,
      });
    } catch (error: any) {
      setExecutionResult({ error: error.message });
      toast({
        title: 'Execution Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Quick examples for different tools
  const getQuickExample = (toolName: string) => {
    const examples: Record<string, string> = {
      fs_list: '{"path": "."}',
      fs_read: '{"path": "package.json"}',
      fs_write: '{"path": "test.txt", "content": "Hello MCP!"}',
      exec_command: '{"command": "echo Hello from MCP"}',
      db_query: '{"query": "SELECT * FROM users LIMIT 5", "operation": "select"}',
      api_request: '{"url": "https://api.github.com", "method": "GET"}',
      system_info: '{"type": "all"}',
      git_status: '{"repo": "."}',
      ai_complete: '{"prompt": "Write a hello world function in JavaScript"}',
    };
    return examples[toolName] || '{}';
  };

  const getToolIcon = (toolName: string) => {
    if (toolName.startsWith('fs_')) return <FileText className="h-4 w-4" />;
    if (toolName.startsWith('exec_')) return <Terminal className="h-4 w-4" />;
    if (toolName.startsWith('db_')) return <Database className="h-4 w-4" />;
    if (toolName.startsWith('api_')) return <Globe className="h-4 w-4" />;
    if (toolName.startsWith('git_')) return <GitBranch className="h-4 w-4" />;
    if (toolName.startsWith('ai_')) return <Brain className="h-4 w-4" />;
    if (toolName.startsWith('docker_')) return <Package className="h-4 w-4" />;
    if (toolName.startsWith('kube_')) return <Cloud className="h-4 w-4" />;
    if (toolName.startsWith('crypto_')) return <Shield className="h-4 w-4" />;
    if (toolName.startsWith('system_')) return <Cpu className="h-4 w-4" />;
    return <Code className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Server className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">MCP Server Interface</h1>
          <Badge variant="secondary" className="ml-auto">
            Port 3200
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Complete Model Context Protocol server with 100% functionality
        </p>
      </div>

      {/* Server Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Server Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button onClick={checkHealth} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Check Health
            </Button>
            {serverHealth && (
              <div className="flex gap-4">
                <Badge variant={serverHealth.status === 'healthy' ? 'default' : 'destructive'}>
                  {serverHealth.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Server: {serverHealth.server} | Port: {serverHealth.port}
                </span>
              </div>
            )}
          </div>
          {serverHealth?.capabilities && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(serverHealth.capabilities).map(([key, value]) => (
                <Badge key={key} variant="outline">
                  {key}: {value ? '✓' : '✗'}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="execute">Execute</TabsTrigger>
        </TabsList>

        {/* Tools Tab */}
        <TabsContent value="tools">
          <Card>
            <CardHeader>
              <CardTitle>Available Tools</CardTitle>
              <CardDescription>
                15+ tools for filesystem, execution, database, API, and AI operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={loadTools} disabled={isLoading} className="mb-4">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Load Tools
              </Button>
              
              <ScrollArea className="h-[400px]">
                <div className="grid gap-3">
                  {tools.map((tool) => (
                    <div
                      key={tool.name}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedTool(tool.name);
                        setToolArgs(getQuickExample(tool.name));
                        setActiveTab('execute');
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getToolIcon(tool.name)}
                        <span className="font-semibold">{tool.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>Available Resources</CardTitle>
              <CardDescription>
                Access to filesystem, database, environment, processes, and git
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={loadResources} disabled={isLoading} className="mb-4">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Load Resources
              </Button>
              
              <div className="grid gap-3">
                {resources.map((resource) => (
                  <div key={resource.uri} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <FolderOpen className="h-4 w-4" />
                      <span className="font-semibold">{resource.name}</span>
                      <Badge variant="outline" className="ml-auto">
                        {resource.uri}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{resource.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      MIME: {resource.mimeType}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Execute Tab */}
        <TabsContent value="execute">
          <Card>
            <CardHeader>
              <CardTitle>Execute Tool</CardTitle>
              <CardDescription>
                Select a tool and provide arguments to execute
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Tool</label>
                <Select value={selectedTool} onValueChange={(value) => {
                  setSelectedTool(value);
                  setToolArgs(getQuickExample(value));
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a tool to execute" />
                  </SelectTrigger>
                  <SelectContent>
                    {tools.map((tool) => (
                      <SelectItem key={tool.name} value={tool.name}>
                        <div className="flex items-center gap-2">
                          {getToolIcon(tool.name)}
                          {tool.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Arguments (JSON)</label>
                <Textarea
                  value={toolArgs}
                  onChange={(e) => setToolArgs(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="font-mono h-32"
                />
              </div>

              <Button onClick={executeTool} disabled={isLoading || !selectedTool}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Execute
              </Button>

              {/* Execution Result */}
              {executionResult && (
                <Alert className={executionResult.error ? 'border-destructive' : 'border-green-500'}>
                  <AlertDescription>
                    <div className="space-y-2">
                      {executionResult.error ? (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="font-semibold">Error:</span>
                          <span>{executionResult.error}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="font-semibold">Success</span>
                          </div>
                          {executionResult.content?.map((item, idx) => (
                            <pre key={idx} className="bg-muted p-2 rounded text-xs overflow-x-auto">
                              {item.text}
                            </pre>
                          ))}
                        </>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Test Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTool('fs_list');
                setToolArgs('{"path": "."}');
                setActiveTab('execute');
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              List Files
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTool('exec_command');
                setToolArgs('{"command": "echo Test"}');
                setActiveTab('execute');
              }}
            >
              <Terminal className="h-4 w-4 mr-2" />
              Run Command
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTool('system_info');
                setToolArgs('{"type": "all"}');
                setActiveTab('execute');
              }}
            >
              <Cpu className="h-4 w-4 mr-2" />
              System Info
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTool('git_status');
                setToolArgs('{"repo": "."}');
                setActiveTab('execute');
              }}
            >
              <GitBranch className="h-4 w-4 mr-2" />
              Git Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}