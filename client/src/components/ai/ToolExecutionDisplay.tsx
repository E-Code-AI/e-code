/**
 * Tool Execution Display Component
 * Shows real-time tool execution results with collapsible groups, filters, and enhanced UX
 * Enhanced Nov 2025 - Phase 1 UX improvements
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card,CardContent,CardHeader } from '@/components/ui/card';
import { Collapsible,CollapsibleContent,CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
AlertTriangle,
CheckCircle2,
ChevronDown,ChevronRight,
Clock,
Command,
Database,
Eye,
FileEdit,
FilePlus,
FileText,
Filter,
FolderOpen,
Globe,
Loader2,
Package,
Search,
Terminal,
Trash2,
XCircle
} from 'lucide-react';
import { useMemo,useState } from 'react';

export interface ToolExecutionProps {
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
  timestamp?: Date;
}

type FilterType = 'all' | 'files' | 'commands' | 'errors' | 'search';

const toolIcons: Record<string, React.ElementType> = {
  create_file: FilePlus,
  edit_file: FileEdit,
  read_file: Eye,
  delete_file: Trash2,
  list_directory: FolderOpen,
  run_command: Terminal,
  install_package: Package,
  web_search: Globe,
  search_code: Search,
  get_project_structure: Database,
  get_diagnostics: AlertTriangle,
};

const toolLabels: Record<string, string> = {
  create_file: 'Create file',
  edit_file: 'Edit file',
  read_file: 'Read file',
  delete_file: 'Delete file',
  list_directory: 'List directory',
  run_command: 'Run command',
  install_package: 'Install package',
  web_search: 'Search web',
  search_code: 'Search code',
  get_project_structure: 'Inspect project',
  get_diagnostics: 'Run diagnostics',
};

const toolCategories: Record<string, FilterType> = {
  create_file: 'files',
  edit_file: 'files',
  read_file: 'files',
  delete_file: 'files',
  list_directory: 'files',
  run_command: 'commands',
  install_package: 'commands',
  web_search: 'search',
  search_code: 'search',
  get_project_structure: 'files',
  get_diagnostics: 'commands',
};

function CompactToolExecution({ 
  tool, 
  parameters, 
  result, 
  success, 
  status, 
  metadata,
  error,
  timestamp: _timestamp
}: ToolExecutionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = toolIcons[tool] || Terminal;
  const label = toolLabels[tool] || tool;
  const verb = status === 'running'
    ? 'Running'
    : status === 'pending'
      ? 'Queued'
      : status === 'error' || (status === 'complete' && !success)
        ? 'Failed'
        : 'Completed';

  const getStatusIcon = () => {
    if (status === 'complete' && success) {
      return <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500" />;
    }
    if (status === 'error' || (status === 'complete' && !success)) {
      return <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-500" />;
    }
    if (status === 'running') {
      return <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500 animate-spin" />;
    }
    if (status === 'pending') {
      return <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-400" />;
    }
    return null;
  };

  const getStatusBg = () => {
    if (status === 'complete' && success) return 'bg-emerald-950 border-emerald-500 hover:bg-surface-hover-solid';
    if (status === 'error' || (status === 'complete' && !success)) return 'bg-red-950 border-red-500 hover:bg-surface-hover-solid';
    if (status === 'running') return 'bg-blue-950 border-blue-500 hover:bg-surface-hover-solid';
    return 'bg-surface-solid border-border hover:bg-surface-hover-solid';
  };

  const getTarget = () => {
    if (tool === 'create_file' || tool === 'edit_file' || tool === 'read_file' || tool === 'delete_file') {
      return parameters.path;
    }
    if (tool === 'run_command') {
      return parameters.command?.slice(0, 50) + (parameters.command?.length > 50 ? '...' : '');
    }
    if (tool === 'install_package') {
      return parameters.package_name;
    }
    if (tool === 'web_search' || tool === 'search_code') {
      return parameters.query || parameters.pattern;
    }
    if (tool === 'list_directory') {
      return parameters.path || '.';
    }
    return null;
  };

  const target = getTarget();
  const hasDetails = result || error || metadata?.commandOutput || (metadata?.filesChanged && metadata.filesChanged.length > 0);

  const diagnosticsRows = useMemo(() => {
    const diagnostics =
      result?.diagnostics ||
      result?.result?.diagnostics ||
      result?.issues ||
      result?.result?.issues ||
      [];

    if (!Array.isArray(diagnostics)) return [];

    return diagnostics.map((diagnostic: any, index: number) => ({
      id: diagnostic.id || `${tool}-${index}`,
      severity: diagnostic.severity || diagnostic.level || 'info',
      file: diagnostic.filePath || diagnostic.file || diagnostic.path || 'Unknown file',
      line: diagnostic.startLine || diagnostic.line || diagnostic.row || 0,
      message: diagnostic.message || diagnostic.description || diagnostic.summary || 'Diagnostic',
      source: diagnostic.source || diagnostic.rule || '',
    }));
  }, [result, tool]);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <div 
          className={cn(
            "flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border cursor-pointer transition-all",
            getStatusBg()
          )}
          data-testid={`tool-execution-${tool}`}
        >
          <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0 flex items-center gap-1 sm:gap-2">
            <span className="text-[10px] sm:text-[11px] font-medium truncate">{verb}: {label}</span>
            {target && (
              <code className="text-[9px] sm:text-[10px] bg-background px-1 sm:px-1.5 py-0.5 rounded truncate max-w-[100px] sm:max-w-[200px] hidden xs:inline">
                {target}
              </code>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {metadata?.executionTime && (
              <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 sm:h-5 hidden sm:flex">
                {metadata.executionTime}ms
              </Badge>
            )}
            {getStatusIcon()}
            {hasDetails && (
              isExpanded ? 
                <ChevronDown className="h-3 w-3 text-muted-foreground" /> : 
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      {hasDetails && (
        <CollapsibleContent>
          <div className="mt-1.5 ml-4 sm:ml-6 pl-2 sm:pl-3 border-l-2 border-muted space-y-1.5 sm:space-y-2 text-[10px] sm:text-[11px]">
            {/* Target on mobile (hidden above) */}
            {target && (
              <div className="xs:hidden">
                <span className="text-muted-foreground">Target: </span>
                <code className="bg-muted px-1 rounded break-all">{target}</code>
              </div>
            )}

            {/* Execution time on mobile */}
            {metadata?.executionTime && (
              <div className="sm:hidden text-muted-foreground">
                Duration: {metadata.executionTime}ms
              </div>
            )}

            {/* File changes */}
            {metadata?.filesChanged && metadata.filesChanged.length > 0 && (
              <div>
                <span className="text-muted-foreground">Files changed:</span>
                <ul className="mt-1 space-y-0.5">
                  {metadata.filesChanged.map((file, i) => (
                    <li key={i}>
                      <code className="bg-muted px-1 rounded text-[10px] break-all">{file}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Command output */}
            {result?.stdout && (
              <div>
                <span className="text-muted-foreground">Output:</span>
                <pre className="bg-muted p-1.5 sm:p-2 rounded mt-1 overflow-x-auto max-h-24 sm:max-h-32 overflow-y-auto text-[9px] sm:text-[10px]">
                  {result.stdout}
                </pre>
              </div>
            )}

            {/* Success message */}
            {result?.description && (
              <p className="text-emerald-600 dark:text-emerald-400">
                ✓ {result.description}
              </p>
            )}

            {/* Diagnostics summary */}
            {diagnosticsRows.length > 0 && (
              <div>
                <span className="text-muted-foreground">Diagnostics:</span>
                <div className="mt-1 overflow-hidden rounded border border-border/60 bg-background">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-muted/70 text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1 font-medium">Severity</th>
                        <th className="px-2 py-1 font-medium">File</th>
                        <th className="px-2 py-1 font-medium">Line</th>
                        <th className="px-2 py-1 font-medium">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnosticsRows.slice(0, 6).map((row) => (
                        <tr key={row.id} className="border-t border-border/50 align-top">
                          <td className="px-2 py-1 capitalize">{row.severity}</td>
                          <td className="px-2 py-1 break-all">{row.file}</td>
                          <td className="px-2 py-1">{row.line || '-'}</td>
                          <td className="px-2 py-1">
                            <div>{row.message}</div>
                            {row.source && <div className="text-muted-foreground">{row.source}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {diagnosticsRows.length > 6 && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {diagnosticsRows.length - 6} more diagnostic{diagnosticsRows.length - 6 === 1 ? '' : 's'}
                  </div>
                )}
              </div>
            )}

            {/* File size / lines changed */}
            {(result?.size || result?.linesChanged) && (
              <p className="text-muted-foreground">
                {result.size ? `Size: ${result.size} bytes` : `Lines changed: ${result.linesChanged}`}
              </p>
            )}

            {/* Error display */}
            {(status === 'error' || error) && (
              <div className="text-red-600 dark:text-red-400">
                <p>✗ {error || 'Execution failed'}</p>
                {result?.stderr && (
                  <pre className="bg-red-950 p-1.5 sm:p-2 rounded mt-1 overflow-x-auto max-h-24 overflow-y-auto text-[9px] sm:text-[10px]">
                    {result.stderr}
                  </pre>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

interface ToolExecutionListProps {
  toolExecutions: ToolExecutionProps[];
  showFilters?: boolean;
  compact?: boolean;
  maxVisible?: number;
}

export function ToolExecutionList({ 
  toolExecutions, 
  showFilters = true, 
  compact = true,
  maxVisible = 50
}: ToolExecutionListProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAll, setShowAll] = useState(false);

  const stats = useMemo(() => {
    const counts = { files: 0, commands: 0, search: 0, errors: 0, success: 0, running: 0 };
    (toolExecutions || []).forEach(exec => {
      const category = toolCategories[exec.tool] || 'commands';
      if (category === 'files') counts.files++;
      else if (category === 'commands') counts.commands++;
      else if (category === 'search') counts.search++;
      
      if (exec.status === 'error' || (exec.status === 'complete' && !exec.success)) {
        counts.errors++;
      } else if (exec.status === 'complete' && exec.success) {
        counts.success++;
      } else if (exec.status === 'running') {
        counts.running++;
      }
    });
    return counts;
  }, [toolExecutions]);

  const filteredExecutions = useMemo(() => {
    const safeExecutions = toolExecutions || [];
    if (filter === 'all') return safeExecutions;
    if (filter === 'errors') {
      return safeExecutions.filter(exec => 
        exec.status === 'error' || (exec.status === 'complete' && !exec.success)
      );
    }
    return safeExecutions.filter(exec => toolCategories[exec.tool] === filter);
  }, [toolExecutions, filter]);

  const visibleExecutions = showAll ? filteredExecutions : filteredExecutions.slice(0, maxVisible);
  const hasMore = (filteredExecutions || []).length > maxVisible && !showAll;

  if (!toolExecutions || toolExecutions.length === 0) {
    return null;
  }

  const filterButtons: { id: FilterType; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'all', label: 'All', icon: Filter, count: toolExecutions.length },
    { id: 'files', label: 'Files', icon: FileText, count: stats.files },
    { id: 'commands', label: 'Commands', icon: Command, count: stats.commands },
    { id: 'errors', label: 'Errors', icon: XCircle, count: stats.errors },
  ];

  return (
    <div className="space-y-1.5 sm:space-y-2" data-testid="tool-execution-list">
      {/* Compact inline stats (only show when there are multiple items or errors) */}
      {(toolExecutions.length > 1 || stats.errors > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {stats.success > 0 && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-emerald-950 text-emerald-400 border-emerald-500">
              {stats.success} done
            </Badge>
          )}
          {stats.running > 0 && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-blue-950 text-blue-400 border-blue-500 animate-pulse">
              {stats.running} running
            </Badge>
          )}
          {stats.errors > 0 && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-red-950 text-red-400 border-red-500">
              {stats.errors} failed
            </Badge>
          )}
          {stats.files > 0 && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
              {stats.files} files
            </Badge>
          )}
          {stats.commands > 0 && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
              {stats.commands} commands
            </Badge>
          )}
          {stats.search > 0 && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
              {stats.search} searches
            </Badge>
          )}
        </div>
      )}

      {/* Filters - only when showFilters is true and many items */}
      {showFilters && toolExecutions.length > 5 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">
            Agent Actions ({toolExecutions.length})
          </span>
        </div>
      )}

      {/* Filter buttons - only when showFilters is true */}
      {showFilters && toolExecutions.length > 5 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1">
          {filterButtons.map(({ id, label, icon: Icon, count }) => (
            <Button
              key={id}
              variant={filter === id ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                "h-6 px-2 text-[10px] shrink-0",
                filter === id && "bg-surface-tertiary-solid"
              )}
              onClick={() => setFilter(id)}
              disabled={count === 0 && id !== 'all'}
              data-testid={`filter-${id}`}
            >
              <Icon className="h-3 w-3 mr-1" />
              {label}
              {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
            </Button>
          ))}
        </div>
      )}

      {/* Execution list */}
      <div className="space-y-1 sm:space-y-1.5">
        {visibleExecutions.map((execution) => (
          compact ? (
            <CompactToolExecution key={execution.id} {...execution} />
          ) : (
            <ToolExecutionDisplay key={execution.id} {...execution} />
          )
        ))}
      </div>

      {/* Show more button */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-[11px] text-muted-foreground"
          onClick={() => setShowAll(true)}
          data-testid="button-show-more"
        >
          Show {filteredExecutions.length - maxVisible} more actions
        </Button>
      )}
    </div>
  );
}

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
    if (status === 'complete' && success) return 'border-green-500 bg-green-950';
    if (status === 'error' || !success) return 'border-red-500 bg-red-950';
    if (status === 'running') return 'border-blue-500 bg-blue-950';
    return 'border-border';
  };

  const diagnosticsRows = useMemo(() => {
    const diagnostics =
      result?.diagnostics ||
      result?.result?.diagnostics ||
      result?.issues ||
      result?.result?.issues ||
      [];

    if (!Array.isArray(diagnostics)) return [];

    return diagnostics.map((diagnostic: any, index: number) => ({
      id: diagnostic.id || `${tool}-${index}`,
      severity: diagnostic.severity || diagnostic.level || 'info',
      file: diagnostic.filePath || diagnostic.file || diagnostic.path || 'Unknown file',
      line: diagnostic.startLine || diagnostic.line || diagnostic.row || 0,
      column: diagnostic.startColumn || diagnostic.column || 0,
      message: diagnostic.message || diagnostic.description || diagnostic.summary || 'Diagnostic',
      source: diagnostic.source || diagnostic.rule || '',
    }));
  }, [result, tool]);

  return (
    <Card className={cn('border-l-2', getStatusColor())}>
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-[13px] font-medium">{label}</span>
          {getStatusIcon()}
          {metadata?.executionTime && (
            <Badge variant="outline" className="ml-auto text-[11px]">
              {metadata.executionTime}ms
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-2">
          {(tool === 'create_file' || tool === 'edit_file') && (
            <div className="text-[11px]">
              <span className="text-muted-foreground">Path: </span>
              <code className="bg-muted px-1 rounded">{parameters.path}</code>
              {parameters.description && (
                <p className="text-muted-foreground mt-1">{parameters.description}</p>
              )}
            </div>
          )}

          {(tool === 'run_command' || tool === 'install_package') && (
            <div className="text-[11px]">
              <span className="text-muted-foreground">Command: </span>
              <code className="bg-muted px-1 rounded text-[11px] block mt-1 p-2 rounded overflow-x-auto">
                {parameters.command || `npm install ${parameters.package_name}${parameters.dev ? ' --save-dev' : ''}`}
              </code>
              {parameters.description && (
                <p className="text-muted-foreground mt-1">{parameters.description}</p>
              )}
            </div>
          )}

          {(tool === 'web_search' || tool === 'search_code') && (
            <div className="text-[11px]">
              <span className="text-muted-foreground">Query: </span>
              <code className="bg-muted px-1 rounded">{parameters.query || parameters.pattern}</code>
            </div>
          )}

          {status === 'complete' && result && (
            <div className="mt-2 pt-2 border-t text-[11px]">
              {diagnosticsRows.length > 0 && (
                <div className="space-y-2">
                  <span className="text-muted-foreground">Diagnostics</span>
                  <div className="overflow-hidden rounded border border-border/60 bg-background/80">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-muted/70 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Severity</th>
                          <th className="px-3 py-2 font-medium">File</th>
                          <th className="px-3 py-2 font-medium">Line</th>
                          <th className="px-3 py-2 font-medium">Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnosticsRows.map((row) => (
                          <tr key={row.id} className="border-t border-border/50 align-top">
                            <td className="px-3 py-2 capitalize">{row.severity}</td>
                            <td className="px-3 py-2 break-all">{row.file}</td>
                            <td className="px-3 py-2">
                              {row.line || '-'}{row.column ? `:${row.column}` : ''}
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-foreground">{row.message}</div>
                              {row.source && <div className="text-muted-foreground">{row.source}</div>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {metadata?.filesChanged && metadata.filesChanged.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Files changed:</span>
                  <ul className="mt-1 space-y-1">
                    {metadata.filesChanged.map((file, i) => (
                      <li key={i} className="ml-2">
                        <code className="bg-muted px-1 rounded text-[11px]">{file}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.stdout && (
                <div className="mt-2">
                  <span className="text-muted-foreground">Output:</span>
                  <pre className="bg-muted p-2 rounded text-[11px] mt-1 overflow-x-auto max-h-32 overflow-y-auto">
                    {result.stdout}
                  </pre>
                </div>
              )}

              {result.description && (
                <p className="text-green-600 dark:text-green-400 mt-1">
                  ✓ {result.description}
                </p>
              )}

              {(result.size || result.linesChanged) && (
                <p className="text-muted-foreground mt-1">
                  {result.size ? `Size: ${result.size} bytes` : `Lines changed: ${result.linesChanged}`}
                </p>
              )}

              {result.message && (
                <p className="text-muted-foreground mt-1">{result.message}</p>
              )}
            </div>
          )}

          {(status === 'error' || error) && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-red-600 dark:text-red-400 text-[11px]">
                ✗ {error || 'Tool execution failed'}
              </p>
              {result?.stderr && (
                <pre className="bg-red-950 p-2 rounded text-[11px] mt-1 overflow-x-auto max-h-32 overflow-y-auto">
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
