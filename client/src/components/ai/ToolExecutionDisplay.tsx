/**
 * Tool Execution Display Component
 * Shows real-time tool execution results (file changes, command outputs, etc.)
 */

import { CheckCircle2, XCircle, Loader2, FileEdit, Terminal, Search, Database, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ToolExecutionProps {
  id: string;
  tool: string;
  parameters: any;
  result?: any;
  success?: boolean;
  status: 'pending' | 'running' | 'complete' | 'error';
  metadata?: {
    executionTime?: number;
    filesChanged?: string[];
    commandOutput?: string;
  };
  error?: string;
}

const toolIcons: Record<string, React.ElementType> = {
  create_file: FileEdit,
  edit_file: FileEdit,
  read_file: FileEdit,
  delete_file: FileEdit,
  list_directory: Database,
  run_command: Terminal,
  install_package: Terminal,
  web_search: Globe,
  search_code: Search,
  get_project_structure: Database,
  get_diagnostics: Database,
};

const toolLabels: Record<string, string> = {
  create_file: 'Created File',
  edit_file: 'Edited File',
  read_file: 'Read File',
  delete_file: 'Deleted File',
  list_directory: 'Listed Directory',
  run_command: 'Executed Command',
  install_package: 'Installed Package',
  web_search: 'Web Search',
  search_code: 'Code Search',
  get_project_structure: 'Analyzed Project',
  get_diagnostics: 'Ran Diagnostics',
};

export function ToolExecutionDisplay({ 
  tool, 
  parameters, 
  result, 
  success, 
  status, 
  metadata,
  error 
}: ToolExecutionProps) {
  const Icon = toolIcons[tool] || Terminal;
  const label = toolLabels[tool] || tool;

  const getStatusIcon = () => {
    if (status === 'complete' && success) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (status === 'error' || !success) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (status === 'running') {
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    }
    return null;
  };

  const getStatusColor = () => {
    if (status === 'complete' && success) return 'border-green-500/20 bg-green-500/5';
    if (status === 'error' || !success) return 'border-red-500/20 bg-red-500/5';
    if (status === 'running') return 'border-blue-500/20 bg-blue-500/5';
    return 'border-border';
  };

  return (
    <Card className={cn('border-l-2', getStatusColor())}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
          {getStatusIcon()}
          {metadata?.executionTime && (
            <Badge variant="outline" className="ml-auto text-xs">
              {metadata.executionTime}ms
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {/* Parameters */}
        <div className="space-y-2">
          {/* File operations */}
          {(tool === 'create_file' || tool === 'edit_file') && (
            <div className="text-xs">
              <span className="text-muted-foreground">Path: </span>
              <code className="bg-muted px-1 rounded">{parameters.path}</code>
              {parameters.description && (
                <p className="text-muted-foreground mt-1">{parameters.description}</p>
              )}
            </div>
          )}

          {/* Command execution */}
          {(tool === 'run_command' || tool === 'install_package') && (
            <div className="text-xs">
              <span className="text-muted-foreground">Command: </span>
              <code className="bg-muted px-1 rounded text-xs block mt-1 p-2 rounded overflow-x-auto">
                {parameters.command || `npm install ${parameters.package_name}${parameters.dev ? ' --save-dev' : ''}`}
              </code>
              {parameters.description && (
                <p className="text-muted-foreground mt-1">{parameters.description}</p>
              )}
            </div>
          )}

          {/* Search operations */}
          {(tool === 'web_search' || tool === 'search_code') && (
            <div className="text-xs">
              <span className="text-muted-foreground">Query: </span>
              <code className="bg-muted px-1 rounded">{parameters.query || parameters.pattern}</code>
            </div>
          )}

          {/* Results */}
          {status === 'complete' && result && (
            <div className="mt-2 pt-2 border-t text-xs">
              {/* File changes */}
              {metadata?.filesChanged && metadata.filesChanged.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Files changed:</span>
                  <ul className="mt-1 space-y-1">
                    {metadata.filesChanged.map((file, i) => (
                      <li key={i} className="ml-2">
                        <code className="bg-muted px-1 rounded text-xs">{file}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Command output */}
              {result.stdout && (
                <div className="mt-2">
                  <span className="text-muted-foreground">Output:</span>
                  <pre className="bg-muted p-2 rounded text-xs mt-1 overflow-x-auto max-h-32 overflow-y-auto">
                    {result.stdout}
                  </pre>
                </div>
              )}

              {/* Generic success message */}
              {result.description && (
                <p className="text-green-600 dark:text-green-400 mt-1">
                  ✓ {result.description}
                </p>
              )}

              {/* File size for create/edit */}
              {(result.size || result.linesChanged) && (
                <p className="text-muted-foreground mt-1">
                  {result.size ? `Size: ${result.size} bytes` : `Lines changed: ${result.linesChanged}`}
                </p>
              )}

              {/* Package installation success */}
              {result.message && (
                <p className="text-muted-foreground mt-1">{result.message}</p>
              )}
            </div>
          )}

          {/* Error display */}
          {(status === 'error' || error) && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-red-600 dark:text-red-400 text-xs">
                ✗ {error || 'Tool execution failed'}
              </p>
              {result?.stderr && (
                <pre className="bg-red-500/10 p-2 rounded text-xs mt-1 overflow-x-auto max-h-32 overflow-y-auto">
                  {result.stderr}
                </pre>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ToolExecutionList({ toolExecutions }: { toolExecutions: ToolExecutionProps[] }) {
  if (!toolExecutions || toolExecutions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mt-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Agent Actions ({toolExecutions.length})
      </div>
      {toolExecutions.map((execution) => (
        <ToolExecutionDisplay key={execution.id} {...execution} />
      ))}
    </div>
  );
}
