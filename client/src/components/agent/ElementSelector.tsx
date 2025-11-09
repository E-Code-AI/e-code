import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  MousePointer2,
  Code,
  Copy,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  Hash,
  FileCode,
  AlertCircle
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ElementSelector {
  id: string;
  sessionId: string;
  url: string;
  selector: string;
  type: 'css' | 'xpath';
  elementPath: string;
  metadata?: {
    tagName?: string;
    textContent?: string;
    attributes?: Record<string, string>;
  };
  createdAt: Date;
}

interface ElementSelectorProps {
  sessionId: string;
  projectId: string;
  className?: string;
}

export function ElementSelector({ sessionId, projectId, className }: ElementSelectorProps) {
  const [pageUrl, setPageUrl] = useState('http://localhost:5000');
  const [elementDescription, setElementDescription] = useState('');
  const [preferredType, setPreferredType] = useState<'css' | 'xpath'>('css');
  const [openSelectors, setOpenSelectors] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Fetch selector history
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['/api/admin/agent/selector/history', sessionId],
  });

  const selectors: ElementSelector[] = historyData?.history || [];

  // Generate selector mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/admin/agent/selector/generate`, {
        sessionId,
        projectId,
        pageUrl,
        elementDescription
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Selector Generated',
        description: data.selector ? `CSS: ${data.selector.cssSelector}` : 'Selector generated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/agent/selector/history', sessionId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate selectors',
        variant: 'destructive',
      });
    },
  });

  const toggleSelector = (selectorId: string) => {
    setOpenSelectors(prev => {
      const next = new Set(prev);
      if (next.has(selectorId)) {
        next.delete(selectorId);
      } else {
        next.add(selectorId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (openSelectors.size === selectors.length) {
      setOpenSelectors(new Set());
    } else {
      setOpenSelectors(new Set(selectors.map(s => s.id)));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Selector copied to clipboard',
    });
  };

  const getSelectorIcon = (type: 'css' | 'xpath') => {
    return type === 'css' ? (
      <Hash className="h-4 w-4 text-blue-500" />
    ) : (
      <FileCode className="h-4 w-4 text-purple-500" />
    );
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Tabs defaultValue="picker" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="picker" data-testid="tab-element-picker">
            Element Picker
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-selector-history">
            History ({selectors.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="picker" className="flex-1 flex flex-col gap-4 mt-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url-input">Page URL</Label>
                <Input
                  id="url-input"
                  type="url"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  placeholder="http://localhost:5000"
                  data-testid="input-page-url"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the URL of the page to inspect for element selectors
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="element-description">Element Description</Label>
                <Input
                  id="element-description"
                  type="text"
                  value={elementDescription}
                  onChange={(e) => setElementDescription(e.target.value)}
                  placeholder="e.g., Login button, User profile dropdown, Search input"
                  data-testid="input-element-description"
                />
                <p className="text-xs text-muted-foreground">
                  Describe the element you want to select
                </p>
              </div>

              <div className="space-y-2">
                <Label>Selector Type</Label>
                <div className="flex gap-2">
                  <Button
                    variant={preferredType === 'css' ? 'default' : 'outline'}
                    onClick={() => setPreferredType('css')}
                    className="flex-1"
                    data-testid="button-type-css"
                  >
                    <Hash className="h-4 w-4 mr-2" />
                    CSS Selector
                  </Button>
                  <Button
                    variant={preferredType === 'xpath' ? 'default' : 'outline'}
                    onClick={() => setPreferredType('xpath')}
                    className="flex-1"
                    data-testid="button-type-xpath"
                  >
                    <FileCode className="h-4 w-4 mr-2" />
                    XPath
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => generateMutation.mutate(undefined)}
                disabled={generateMutation.isPending || !pageUrl.trim() || !elementDescription.trim()}
                className="w-full"
                data-testid="button-generate-selectors"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing Page...
                  </>
                ) : (
                  <>
                    <MousePointer2 className="mr-2 h-4 w-4" />
                    Generate Selectors
                  </>
                )}
              </Button>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium mb-1">How it works</p>
                    <p className="text-blue-700 dark:text-blue-300">
                      The element selector opens the page in a headless browser, analyzes all
                      interactive elements, and generates robust selectors using data-testid
                      attributes, IDs, and semantic CSS/XPath patterns.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="flex-1 flex flex-col mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Selector History</h3>
            {selectors.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAll}
                data-testid="button-toggle-all-selectors"
              >
                {openSelectors.size === selectors.length ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Expand All
                  </>
                )}
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            {isLoadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-20 w-full" />
                  </Card>
                ))}
              </div>
            ) : selectors.length === 0 ? (
              <Card className="p-8 text-center">
                <MousePointer2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No selectors generated yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use the Element Picker to analyze a page and generate selectors
                </p>
              </Card>
            ) : (
              <div className="space-y-3" data-testid="container-selector-list">
                {selectors.map((selector) => (
                  <Collapsible
                    key={selector.id}
                    open={openSelectors.has(selector.id)}
                    onOpenChange={() => toggleSelector(selector.id)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <button 
                          className="w-full p-4 text-left hover:bg-accent/50 transition-colors rounded-lg"
                          data-testid={`button-toggle-selector-${selector.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              {getSelectorIcon(selector.type)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                                    {selector.selector}
                                  </code>
                                  <Badge
                                    variant={selector.type === 'css' ? 'default' : 'secondary'}
                                    data-testid={`badge-type-${selector.id}`}
                                  >
                                    {selector.type.toUpperCase()}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Code className="h-3 w-3" />
                                  <span className="truncate">{selector.url}</span>
                                  <span>•</span>
                                  <span>
                                    {new Date(selector.createdAt).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(selector.selector);
                                }}
                                data-testid={`button-copy-${selector.id}`}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 transition-transform",
                                  openSelectors.has(selector.id) && "rotate-180"
                                )}
                              />
                            </div>
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t p-4 space-y-4">
                          {/* Element Path */}
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                              Element Path
                            </Label>
                            <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
                              {selector.elementPath}
                            </pre>
                          </div>

                          {/* Metadata */}
                          {selector.metadata && (
                            <div className="space-y-2">
                              {selector.metadata.tagName && (
                                <div className="flex items-start gap-2 text-sm">
                                  <span className="text-muted-foreground min-w-[100px]">
                                    Tag Name:
                                  </span>
                                  <code className="bg-muted px-2 py-0.5 rounded text-xs">
                                    {selector.metadata.tagName}
                                  </code>
                                </div>
                              )}
                              {selector.metadata.textContent && (
                                <div className="flex items-start gap-2 text-sm">
                                  <span className="text-muted-foreground min-w-[100px]">
                                    Text Content:
                                  </span>
                                  <span className="flex-1 truncate">
                                    {selector.metadata.textContent}
                                  </span>
                                </div>
                              )}
                              {selector.metadata.attributes && Object.keys(selector.metadata.attributes).length > 0 && (
                                <div>
                                  <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                                    Attributes
                                  </Label>
                                  <div className="bg-muted p-3 rounded-md space-y-1">
                                    {Object.entries(selector.metadata.attributes).map(([key, value]) => (
                                      <div key={key} className="flex items-start gap-2 text-xs font-mono">
                                        <span className="text-blue-600 dark:text-blue-400">
                                          {key}:
                                        </span>
                                        <span className="text-green-600 dark:text-green-400">
                                          "{value}"
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Copy Button */}
                          <Button
                            variant="outline"
                            onClick={() => copyToClipboard(selector.selector)}
                            className="w-full"
                            data-testid={`button-copy-full-${selector.id}`}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Selector
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
