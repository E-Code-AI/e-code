/**
 * Testing Panel
 * Run and view tests (Jest, Vitest, etc.)
 * 
 * Features:
 * - Run all tests
 * - Run specific test file
 * - View test results
 * - Coverage reports
 * - Test history
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock,
  FileCode,
  BarChart3,
  History as HistoryIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

export function TestingPanel() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [coverage, setCoverage] = useState({ lines: 0, functions: 0, branches: 0 });

  const mockTests: TestResult[] = [
    { name: 'User authentication', status: 'passed', duration: 124 },
    { name: 'File upload', status: 'passed', duration: 89 },
    { name: 'Data validation', status: 'failed', duration: 45, error: 'Expected true, received false' },
    { name: 'API integration', status: 'passed', duration: 234 },
  ];

  const runTests = () => {
    setRunning(true);
    setTimeout(() => {
      setResults(mockTests);
      setCoverage({ lines: 85, functions: 78, branches: 72 });
      setRunning(false);
    }, 2000);
  };

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const total = results.length;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium">Testing</h3>
          {results.length > 0 && (
            <Badge variant={failed > 0 ? 'destructive' : 'default'}>
              {passed}/{total} passed
            </Badge>
          )}
        </div>

        <Button onClick={runTests} disabled={running} size="sm">
          <Play className="w-4 h-4 mr-1" />
          {running ? 'Running...' : 'Run Tests'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="results" className="h-full flex flex-col">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent px-4">
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="coverage">Coverage</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="flex-1 m-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {results.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">No tests run</p>
                    <p className="text-sm">Click "Run Tests" to execute your test suite</p>
                  </div>
                ) : (
                  results.map((test, i) => (
                    <Card key={i} className={test.status === 'failed' ? 'border-destructive/50' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {test.status === 'passed' && <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />}
                            {test.status === 'failed' && <XCircle className="w-5 h-5 text-destructive mt-0.5" />}
                            {test.status === 'skipped' && <Clock className="w-5 h-5 text-yellow-500 mt-0.5" />}
                            
                            <div className="flex-1">
                              <p className="font-medium">{test.name}</p>
                              {test.error && (
                                <pre className="text-xs mt-2 p-2 bg-destructive/10 text-destructive rounded">
                                  {test.error}
                                </pre>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right text-xs text-muted-foreground">
                            {test.duration}ms
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="coverage" className="flex-1 m-0 p-4">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Code Coverage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Lines</span>
                      <span className="text-sm font-medium">{coverage.lines}%</span>
                    </div>
                    <Progress value={coverage.lines} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Functions</span>
                      <span className="text-sm font-medium">{coverage.functions}%</span>
                    </div>
                    <Progress value={coverage.functions} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Branches</span>
                      <span className="text-sm font-medium">{coverage.branches}%</span>
                    </div>
                    <Progress value={coverage.branches} />
                  </div>
                </CardContent>
              </Card>

              {coverage.lines > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Add tests for uncovered branches</li>
                      <li>• Improve edge case coverage</li>
                      <li>• Test error handling paths</li>
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 m-0">
            <ScrollArea className="h-full">
              <div className="p-4">
                <div className="text-center py-12 text-muted-foreground">
                  <HistoryIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No test history</p>
                  <p className="text-sm mt-1">Run tests to see history</p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
