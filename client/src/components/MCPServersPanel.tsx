import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { PostgreSQLMCPPanel } from '@/components/mcp/PostgreSQLMCPPanel';
import { GitHubMCPPanel } from '@/components/mcp/GitHubMCPPanel';
import { MemoryMCPPanel } from '@/components/mcp/MemoryMCPPanel';
import {
  Github,
  Database,
  Brain,
  Server,
  FileText,
  Code,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';

type ServerStatus = 'active' | 'inactive' | 'error' | 'disabled';

interface ServerTool {
  name: string;
  description: string;
}

interface MCPServerDescriptor {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  tools: ServerTool[];
  endpoints: string[];
  status: ServerStatus;
}

interface ServersResponse {
  servers: Array<{
    id: string;
    name: string;
    status: ServerStatus;
    endpoints: string[];
  }>;
}

const staticServers: Omit<MCPServerDescriptor, 'status'>[] = [
  {
    id: 'github',
    name: 'GitHub MCP',
    description: 'Manage GitHub repositories, issues, and pull requests',
    icon: <Github className="w-5 h-5" />,
    category: 'Version Control',
    tools: [
      { name: 'github_list_repos', description: 'List repositories' },
      { name: 'github_create_repo', description: 'Create repository' },
      { name: 'github_create_issue', description: 'Create issue' },
      { name: 'github_search_issues', description: 'Search issues' },
      { name: 'github_list_prs', description: 'List pull requests' },
      { name: 'github_create_pr', description: 'Create pull request' },
    ],
    endpoints: [
      '/api/mcp/github/repositories',
      '/api/mcp/github/issues',
      '/api/mcp/github/pull-requests',
    ],
  },
  {
    id: 'postgres',
    name: 'PostgreSQL MCP',
    description: 'Execute database queries and manage PostgreSQL databases',
    icon: <Database className="w-5 h-5" />,
    category: 'Database',
    tools: [
      { name: 'postgres_list_tables', description: 'List database tables' },
      { name: 'postgres_get_schema', description: 'Inspect table schema' },
      { name: 'postgres_query', description: 'Execute SQL queries' },
      { name: 'postgres_backup', description: 'Create a database backup' },
    ],
    endpoints: [
      '/api/mcp/postgres/tables',
      '/api/mcp/postgres/schema/:table',
      '/api/mcp/postgres/query',
      '/api/mcp/postgres/backup',
    ],
  },
  {
    id: 'memory',
    name: 'Memory MCP',
    description: 'Store and retrieve conversation memory and knowledge graphs',
    icon: <Brain className="w-5 h-5" />,
    category: 'AI & Memory',
    tools: [
      { name: 'memory_search', description: 'Semantic search over memory' },
      { name: 'memory_create_node', description: 'Add memory node' },
      { name: 'memory_create_edge', description: 'Link memory nodes' },
      { name: 'memory_save_conversation', description: 'Persist a conversation' },
      { name: 'memory_get_history', description: 'Fetch conversation history' },
    ],
    endpoints: [
      '/api/mcp/memory/search',
      '/api/mcp/memory/conversations',
      '/api/mcp/memory/nodes',
      '/api/mcp/memory/edges',
    ],
  },
  {
    id: 'core',
    name: 'Core MCP Server',
    description: 'Filesystem, shell, and runtime tools exposed via the core MCP server',
    icon: <Server className="w-5 h-5" />,
    category: 'Core',
    tools: [
      { name: 'fs_read', description: 'Read files' },
      { name: 'fs_write', description: 'Write files' },
      { name: 'exec_command', description: 'Execute shell commands' },
      { name: 'ai_complete', description: 'Invoke AI completion' },
    ],
    endpoints: ['/mcp/connect', '/mcp/message', '/mcp/disconnect'],
  },
  {
    id: 'filesystem',
    name: 'Filesystem MCP',
    description: 'File and directory operations with watch capabilities',
    icon: <FileText className="w-5 h-5" />,
    category: 'Core',
    tools: [
      { name: 'fs_list', description: 'List directories' },
      { name: 'fs_search', description: 'Find files' },
      { name: 'fs_watch', description: 'Watch for changes' },
    ],
    endpoints: ['/api/mcp/tools'],
  },
  {
    id: 'execution',
    name: 'Execution MCP',
    description: 'Command execution and process management',
    icon: <Code className="w-5 h-5" />,
    category: 'Core',
    tools: [
      { name: 'exec_spawn', description: 'Spawn processes' },
      { name: 'process_kill', description: 'Kill processes' },
    ],
    endpoints: ['/api/mcp/tools'],
  },
];

type SelectedDetail =
  | { kind: 'panel'; id: 'github' | 'postgres' | 'memory' }
  | { kind: 'info'; server: MCPServerDescriptor }
  | null;

export function MCPServersPanel({ projectId }: { projectId?: number } = {}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<SelectedDetail>(null);

  const { data: remote, isLoading } = useQuery<ServersResponse>({
    queryKey: ['/api/mcp/servers'],
    queryFn: () => apiRequest<ServersResponse>('GET', '/api/mcp/servers'),
    staleTime: 30_000,
  });

  const remoteStatusById = new Map<string, ServerStatus>();
  for (const s of remote?.servers ?? []) {
    remoteStatusById.set(s.id, s.status);
  }

  const servers: MCPServerDescriptor[] = staticServers.map((server) => {
    const status = remoteStatusById.get(server.id);
    return {
      ...server,
      status: status ?? (server.category === 'Core' ? 'active' : 'inactive'),
    };
  });

  const groupedServers = servers.reduce<Record<string, MCPServerDescriptor[]>>((acc, server) => {
    (acc[server.category] ||= []).push(server);
    return acc;
  }, {});

  const openServer = (server: MCPServerDescriptor) => {
    if (server.id === 'github' || server.id === 'postgres' || server.id === 'memory') {
      setSelected({ kind: 'panel', id: server.id });
    } else {
      setSelected({ kind: 'info', server });
    }
  };

  const testConnection = async (server: MCPServerDescriptor, e: React.MouseEvent) => {
    e.stopPropagation();
    toast({ title: 'Testing MCP Server', description: `Testing ${server.name}...` });
    try {
      if (server.id === 'postgres') {
        await apiRequest('GET', '/api/mcp/postgres/tables');
      } else if (server.id === 'github') {
        await apiRequest('GET', '/api/mcp/github/repositories');
      } else if (server.id === 'memory') {
        await apiRequest('POST', '/api/mcp/memory/search', { query: 'health-check', limit: 1 });
      } else {
        await apiRequest('GET', '/api/mcp/servers');
      }
      toast({ title: 'Success', description: `${server.name} is reachable` });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || `Failed to reach ${server.name}`,
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: ServerStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const activeCount = servers.filter((s) => s.status === 'active').length;

  if (isLoading && servers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (selected?.kind === 'panel') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            ← Back to MCP Servers
          </Button>
        </div>
        {selected.id === 'github' && <GitHubMCPPanel projectId={projectId} />}
        {selected.id === 'postgres' && <PostgreSQLMCPPanel projectId={projectId} />}
        {selected.id === 'memory' && <MemoryMCPPanel projectId={projectId} />}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="mcp-servers-panel">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">MCP Servers</h2>
          <p className="text-muted-foreground mt-1">
            Model Context Protocol servers providing AI capabilities
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <span className="mr-2">●</span>
          {activeCount} Active
        </Badge>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="core">Core</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="ai">AI & Memory</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid gap-4">
            {Object.entries(groupedServers).map(([category, categoryServers]) => (
              <div key={category} className="space-y-4">
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {category}
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryServers.map((server) => (
                    <Card
                      key={server.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => openServer(server)}
                      data-testid={`mcp-server-card-${server.id}`}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">{server.icon}</div>
                            <div>
                              <CardTitle className="text-[15px]">{server.name}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusIcon(server.status)}
                                <span className="text-[11px] text-muted-foreground">
                                  {server.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-3">{server.description}</CardDescription>
                        <div className="flex flex-wrap gap-1">
                          {server.tools.slice(0, 3).map((tool) => (
                            <Badge key={tool.name} variant="secondary" className="text-[11px]">
                              {tool.name.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                          {server.tools.length > 3 && (
                            <Badge variant="outline" className="text-[11px]">
                              +{server.tools.length - 3} more
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-4"
                          onClick={(e) => testConnection(server, e)}
                        >
                          Test Connection
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="core" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {servers
              .filter((s) => s.category === 'Core')
              .map((server) => (
                <Card
                  key={server.id}
                  className="cursor-pointer"
                  onClick={() => openServer(server)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {server.icon}
                      <CardTitle>{server.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{server.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {servers
              .filter((s) => s.category === 'Version Control' || s.category === 'Database')
              .map((server) => (
                <Card
                  key={server.id}
                  className="cursor-pointer"
                  onClick={() => openServer(server)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {server.icon}
                      <CardTitle>{server.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{server.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {servers
              .filter((s) => s.category === 'AI & Memory')
              .map((server) => (
                <Card
                  key={server.id}
                  className="cursor-pointer"
                  onClick={() => openServer(server)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      {server.icon}
                      <CardTitle>{server.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{server.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {selected?.kind === 'info' && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Server Details: {selected.server.name}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-[13px] font-semibold mb-2">Available Tools</h4>
                <div className="flex flex-wrap gap-2">
                  {selected.server.tools.map((tool) => (
                    <Badge key={tool.name} variant="outline">
                      {tool.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-[13px] font-semibold mb-2">Endpoints</h4>
                <ul className="text-[12px] font-mono text-muted-foreground space-y-1">
                  {selected.server.endpoints.map((endpoint) => (
                    <li key={endpoint}>{endpoint}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
