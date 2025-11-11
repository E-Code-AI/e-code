import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { 
  PlayCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileCode, 
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Settings,
  Filter,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

// Backend types matching schema
interface TestRun {
  id: string;
  projectId: string;
  runId: string;
  runner: string;
  status: 'running' | 'passed' | 'failed' | 'cancelled';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration?: number;
  startedAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

interface TestCase {
  id: string;
  testRunId: string;
  suiteName: string;
  testName: string;
  filePath: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration?: number;
  error?: string;
  errorStack?: string;
  retries?: number;
  startedAt?: string;
  completedAt?: string;
}

interface TestSuite {
  id: string;
  name: string;
  file: string;
  tests: TestCase[];
}

interface ReplitTestingPanelProps {
  projectId?: string;
  className?: string;
}

export function ReplitTestingPanel({ projectId = 'default-project', className }: ReplitTestingPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed' | 'pending'>('all');
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch test runs from API
  const { data: testRuns = [], isLoading, refetch } = useQuery<TestRun[]>({
    queryKey: ['/api/workspace/projects', projectId, 'test-runs'],
    enabled: !!projectId,
    refetchInterval: 5000, // Poll every 5 seconds as fallback
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!projectId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/test-runs/ws?projectId=${projectId}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[TestRuns] WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'initial') {
          // Initial test runs received
          console.log('[TestRuns] Received initial test runs:', message.testRuns);
        } else if (message.type === 'update' || message.type === 'complete') {
          // Test run updated - refetch to get latest data
          refetch();
        } else if (message.type === 'test_case') {
          // New test case result
          setTestCases(prev => {
            const filtered = prev.filter(tc => tc.id !== message.testCase.id);
            return [...filtered, message.testCase];
          });
        }
      } catch (error) {
        console.error('[TestRuns] Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[TestRuns] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[TestRuns] WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [projectId, refetch]);

  // Group test cases by suite name
  const testSuites: TestSuite[] = [];
  const suiteMap = new Map<string, TestSuite>();

  testCases.forEach(testCase => {
    if (!suiteMap.has(testCase.suiteName)) {
      suiteMap.set(testCase.suiteName, {
        id: testCase.suiteName,
        name: testCase.suiteName,
        file: testCase.filePath,
        tests: [],
      });
    }
    suiteMap.get(testCase.suiteName)!.tests.push(testCase);
  });

  suiteMap.forEach(suite => testSuites.push(suite));

  // Filter tests based on search and filter
  const filteredSuites = testSuites
    .map(suite => ({
      ...suite,
      tests: suite.tests.filter(test => {
        const matchesSearch = test.testName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' || test.status === filter;
        return matchesSearch && matchesFilter;
      }),
    }))
    .filter(suite => suite.tests.length > 0);

  const toggleSuite = (suiteId: string) => {
    setExpandedSuites(prev => {
      const next = new Set(prev);
      if (next.has(suiteId)) {
        next.delete(suiteId);
      } else {
        next.add(suiteId);
      }
      return next;
    });
  };

  const getTestIcon = (status: TestCase['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-status-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-status-critical" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-status-warning" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-[var(--ecode-text-secondary)]" />;
    }
  };

  // Calculate stats from latest test run
  const latestRun = testRuns[0];
  const totalTests = latestRun?.totalTests || 0;
  const passedTests = latestRun?.passedTests || 0;
  const failedTests = latestRun?.failedTests || 0;
  const skippedTests = latestRun?.skippedTests || 0;

  return (
    <div className={cn("flex flex-col h-full bg-[var(--ecode-surface)]", className)}>
      {/* Header */}
      <div className="p-3 border-b border-[var(--ecode-border)] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--ecode-text)] font-[family-name:var(--ecode-font-sans)]">
            Testing
          </h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              className="h-7 px-2"
              data-testid="button-run-tests"
            >
              <PlayCircle className="h-3.5 w-3.5 mr-1" />
              Run All
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 px-2">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Configure Test Runner</DropdownMenuItem>
                <DropdownMenuItem>Watch Mode</DropdownMenuItem>
                <DropdownMenuItem>Coverage Report</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats */}
        {latestRun && (
          <div className="flex items-center gap-3 text-xs">
            <Badge variant="outline" className="bg-[var(--ecode-background)]">
              Total: {totalTests}
            </Badge>
            {passedTests > 0 && (
              <Badge variant="outline" className="bg-status-success/10 text-status-success border-status-success/30">
                Passed: {passedTests}
              </Badge>
            )}
            {failedTests > 0 && (
              <Badge variant="outline" className="bg-status-critical/10 text-status-critical border-status-critical/30">
                Failed: {failedTests}
              </Badge>
            )}
            {skippedTests > 0 && (
              <Badge variant="outline" className="bg-status-warning/100/10 text-status-warning border-status-warning/30">
                Skipped: {skippedTests}
              </Badge>
            )}
            {latestRun.duration && (
              <Badge variant="outline" className="bg-[var(--ecode-background)]">
                {latestRun.duration}ms
              </Badge>
            )}
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs"
            data-testid="input-search-tests"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 px-2">
                <Filter className="h-3.5 w-3.5 mr-1" />
                {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter('all')}>All Tests</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('passed')}>Passed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('failed')}>Failed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('pending')}>Pending</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Test Suites List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 text-[var(--ecode-text-secondary)] animate-spin" />
            </div>
          ) : filteredSuites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileCode className="h-8 w-8 text-[var(--ecode-text-secondary)] mb-2" />
              <p className="text-sm text-[var(--ecode-text-muted)] font-[family-name:var(--ecode-font-sans)]">
                {searchQuery ? 'No tests match your search' : 'No tests found'}
              </p>
              <p className="text-xs text-[var(--ecode-text-secondary)] mt-1">
                {testRuns.length === 0 ? 'Run tests to see results here' : 'Create test files to get started'}
              </p>
            </div>
          ) : (
            filteredSuites.map(suite => (
              <div key={suite.id} className="rounded-md overflow-hidden">
                {/* Suite Header */}
                <button
                  onClick={() => toggleSuite(suite.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--ecode-sidebar-hover)] rounded-md transition-colors text-left"
                  data-testid={`suite-${suite.id}`}
                >
                  {expandedSuites.has(suite.id) ? (
                    <ChevronDown className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)] flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)] flex-shrink-0" />
                  )}
                  <FileCode className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--ecode-text)] truncate font-[family-name:var(--ecode-font-sans)]">
                      {suite.name}
                    </p>
                    <p className="text-xs text-[var(--ecode-text-secondary)] truncate font-[family-name:var(--ecode-font-mono)]">
                      {suite.file}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {suite.tests.length}
                  </Badge>
                </button>

                {/* Test Cases */}
                {expandedSuites.has(suite.id) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {suite.tests.map(test => (
                      <div
                        key={test.id}
                        className="flex items-start gap-2 px-2 py-1.5 hover:bg-[var(--ecode-sidebar-hover)] rounded-md transition-colors cursor-pointer"
                        data-testid={`test-${test.id}`}
                      >
                        {getTestIcon(test.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[var(--ecode-text)] font-[family-name:var(--ecode-font-sans)]">
                            {test.testName}
                          </p>
                          {test.error && (
                            <p className="text-xs text-status-critical mt-0.5 font-[family-name:var(--ecode-font-mono)] whitespace-pre-wrap">
                              {test.error}
                            </p>
                          )}
                          {test.duration && (
                            <p className="text-xs text-[var(--ecode-text-secondary)] mt-0.5">
                              {test.duration}ms
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Test Runs History */}
      {testRuns.length > 0 && (
        <div className="border-t border-[var(--ecode-border)] p-2">
          <p className="text-xs text-[var(--ecode-text-secondary)] font-[family-name:var(--ecode-font-sans)] mb-2">
            Recent Runs
          </p>
          <div className="space-y-1">
            {testRuns.slice(0, 3).map(run => (
              <div
                key={run.id}
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--ecode-sidebar-hover)] cursor-pointer"
                data-testid={`run-${run.id}`}
              >
                {run.status === 'passed' && <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />}
                {run.status === 'failed' && <XCircle className="h-3.5 w-3.5 text-status-critical" />}
                {run.status === 'running' && <RefreshCw className="h-3.5 w-3.5 text-status-info animate-spin" />}
                {run.status === 'cancelled' && <AlertCircle className="h-3.5 w-3.5 text-status-warning" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--ecode-text)] font-[family-name:var(--ecode-font-mono)]">
                    {run.runner} • {run.runId.slice(0, 8)}
                  </p>
                  <p className="text-xs text-[var(--ecode-text-secondary)]">
                    {run.passedTests}/{run.totalTests} passed
                    {run.duration && ` • ${run.duration}ms`}
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    run.status === 'passed' && "bg-status-success/10 text-status-success border-status-success/30",
                    run.status === 'failed' && "bg-status-critical/10 text-status-critical border-status-critical/30",
                    run.status === 'running' && "bg-status-info/10 text-status-info border-status-info/30"
                  )}
                >
                  {run.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
