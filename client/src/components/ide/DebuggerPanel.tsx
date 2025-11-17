import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Play, Pause, SkipForward, CornerDownRight, Square,
  Circle, Eye, Trash2, Bug, Terminal, Code
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface Breakpoint {
  id: string;
  file: string;
  line: number;
  enabled: boolean;
  condition?: string;
}

interface Variable {
  name: string;
  value: string;
  type: string;
}

interface StackFrame {
  file: string;
  function: string;
  line: number;
}

interface DebuggerPanelProps {
  projectId: number;
  onFileSelect?: (filePath: string, line?: number) => void;
}

export function DebuggerPanel({ projectId, onFileSelect }: DebuggerPanelProps) {
  const [isDebugging, setIsDebugging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [watchExpression, setWatchExpression] = useState('');
  const { toast } = useToast();

  // Mock data - replace with real debugger integration
  const breakpoints: Breakpoint[] = [
    { id: '1', file: 'src/App.tsx', line: 45, enabled: true },
    { id: '2', file: 'src/utils/api.ts', line: 23, enabled: true, condition: 'user === null' },
    { id: '3', file: 'src/components/Header.tsx', line: 12, enabled: false }
  ];

  const variables: Variable[] = [
    { name: 'user', value: '{ id: 123, name: "John" }', type: 'Object' },
    { name: 'isLoading', value: 'false', type: 'boolean' },
    { name: 'count', value: '42', type: 'number' },
    { name: 'items', value: '[1, 2, 3, 4, 5]', type: 'Array' }
  ];

  const callStack: StackFrame[] = [
    { file: 'src/App.tsx', function: 'handleClick', line: 45 },
    { file: 'src/utils/api.ts', function: 'fetchData', line: 23 },
    { file: 'src/services/auth.ts', function: 'authenticate', line: 67 }
  ];

  const handleStart = () => {
    setIsDebugging(true);
    toast({ title: "Debugger started" });
  };

  const handleStop = () => {
    setIsDebugging(false);
    setIsPaused(false);
    toast({ title: "Debugger stopped" });
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    toast({ title: isPaused ? "Resumed" : "Paused" });
  };

  const handleStepOver = () => {
    toast({ title: "Step over" });
  };

  const handleStepInto = () => {
    toast({ title: "Step into" });
  };

  const handleStepOut = () => {
    toast({ title: "Step out" });
  };

  const toggleBreakpoint = (id: string) => {
    toast({ title: "Breakpoint toggled" });
  };

  const deleteBreakpoint = (id: string) => {
    toast({ title: "Breakpoint deleted" });
  };

  const addWatch = () => {
    if (!watchExpression.trim()) return;
    toast({ title: `Watching: ${watchExpression}` });
    setWatchExpression('');
  };

  return (
    <div className="flex flex-col h-full bg-background" data-testid="debugger-panel">
      {/* Debug Controls */}
      <div className="p-4 border-b space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Bug className="h-4 w-4" />
          Debugger
        </h3>

        <div className="flex gap-2">
          {!isDebugging ? (
            <Button
              onClick={handleStart}
              className="flex-1"
              data-testid="button-start-debug"
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          ) : (
            <>
              <Button
                variant={isPaused ? "default" : "secondary"}
                onClick={handlePause}
                data-testid="button-pause-debug"
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button
                variant="secondary"
                onClick={handleStepOver}
                disabled={!isPaused}
                data-testid="button-step-over"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                onClick={handleStepInto}
                disabled={!isPaused}
                data-testid="button-step-into"
              >
                <CornerDownRight className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                onClick={handleStop}
                data-testid="button-stop-debug"
              >
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Debug Info */}
      <Tabs defaultValue="breakpoints" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none p-0 h-auto">
          <TabsTrigger value="breakpoints" className="rounded-none" data-testid="tab-breakpoints">
            Breakpoints
          </TabsTrigger>
          <TabsTrigger value="variables" className="rounded-none" data-testid="tab-variables">
            Variables
          </TabsTrigger>
          <TabsTrigger value="call-stack" className="rounded-none" data-testid="tab-call-stack">
            Call Stack
          </TabsTrigger>
          <TabsTrigger value="watch" className="rounded-none" data-testid="tab-watch">
            Watch
          </TabsTrigger>
        </TabsList>

        <TabsContent value="breakpoints" className="flex-1 overflow-auto m-0 p-4 space-y-2">
          <h4 className="text-sm font-semibold mb-2">Active Breakpoints</h4>
          {breakpoints.map((bp) => (
            <Card
              key={bp.id}
              className="p-3 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => onFileSelect?.(bp.file, bp.line)}
              data-testid={`breakpoint-${bp.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBreakpoint(bp.id);
                    }}
                    className={`${bp.enabled ? 'text-red-500' : 'text-gray-400'}`}
                  >
                    <Circle className={`h-4 w-4 ${bp.enabled ? 'fill-current' : ''}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm truncate">{bp.file}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Line {bp.line}</span>
                      {bp.condition && (
                        <Badge variant="outline" className="text-xs">
                          Condition: {bp.condition}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBreakpoint(bp.id);
                  }}
                  data-testid={`button-delete-bp-${bp.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="variables" className="flex-1 overflow-auto m-0 p-4 space-y-2">
          <h4 className="text-sm font-semibold mb-2">Local Variables</h4>
          {!isPaused ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              <Pause className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>Pause execution to view variables</p>
            </div>
          ) : (
            variables.map((variable, idx) => (
              <Card key={idx} className="p-3" data-testid={`variable-${variable.name}`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-sm">{variable.name}</span>
                    <Badge variant="secondary" className="text-xs">{variable.type}</Badge>
                  </div>
                  <code className="text-xs text-muted-foreground break-all">{variable.value}</code>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="call-stack" className="flex-1 overflow-auto m-0 p-4 space-y-2">
          <h4 className="text-sm font-semibold mb-2">Call Stack</h4>
          {!isPaused ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              <Pause className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>Pause execution to view call stack</p>
            </div>
          ) : (
            callStack.map((frame, idx) => (
              <Card
                key={idx}
                className="p-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onFileSelect?.(frame.file, frame.line)}
                data-testid={`stack-frame-${idx}`}
              >
                <div className="space-y-1">
                  <div className="font-mono text-sm">{frame.function}</div>
                  <div className="text-xs text-muted-foreground">
                    {frame.file}:{frame.line}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="watch" className="flex-1 overflow-auto m-0 p-4 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Expression to watch..."
              value={watchExpression}
              onChange={(e) => setWatchExpression(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addWatch()}
              data-testid="input-watch-expression"
            />
            <Button
              onClick={addWatch}
              disabled={!watchExpression.trim()}
              data-testid="button-add-watch"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-center text-sm text-muted-foreground py-8">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p>Add expressions to watch</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
