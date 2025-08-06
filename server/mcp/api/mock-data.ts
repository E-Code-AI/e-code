// Mock data for MCP endpoints during development
export const mockGitHubRepos = [
  {
    id: '1',
    name: 'e-code-platform',
    description: 'AI-powered development platform',
    url: 'https://github.com/admin/e-code-platform',
    private: false,
    stars: 42,
    forks: 8,
    language: 'TypeScript',
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'mcp-integration',
    description: 'Model Context Protocol integration',
    url: 'https://github.com/admin/mcp-integration',
    private: true,
    stars: 15,
    forks: 3,
    language: 'JavaScript',
    updatedAt: new Date().toISOString()
  }
];

export const mockDatabaseTables = [
  {
    name: 'users',
    schema: 'public',
    rowCount: 1245,
    size: '2.3 MB'
  },
  {
    name: 'projects',
    schema: 'public',
    rowCount: 3567,
    size: '8.7 MB'
  },
  {
    name: 'files',
    schema: 'public',
    rowCount: 15234,
    size: '45.2 MB'
  }
];

export const mockTableSchema = [
  {
    column: 'id',
    type: 'integer',
    nullable: false,
    default: 'nextval',
    isPrimary: true
  },
  {
    column: 'name',
    type: 'varchar(255)',
    nullable: false,
    default: null,
    isPrimary: false
  },
  {
    column: 'created_at',
    type: 'timestamp',
    nullable: false,
    default: 'now()',
    isPrimary: false
  }
];

export const mockMemoryNodes = [
  {
    id: '1',
    type: 'concept' as const,
    content: 'MCP Integration allows seamless communication between AI models and external tools',
    metadata: { source: 'documentation', confidence: 0.95 },
    connections: 5,
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString()
  },
  {
    id: '2',
    type: 'fact' as const,
    content: 'The platform supports 6 different MCP servers including GitHub, PostgreSQL, and Memory',
    metadata: { verified: true, source: 'system' },
    connections: 3,
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString()
  }
];

export const mockConversations = [
  {
    id: '1',
    title: 'MCP Setup Discussion',
    messages: 12,
    lastMessage: 'Successfully integrated GitHub MCP server',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Database Query Optimization',
    messages: 8,
    lastMessage: 'Query performance improved by 40%',
    createdAt: new Date().toISOString()
  }
];