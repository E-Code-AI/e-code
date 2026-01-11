import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
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
  Loader2,
  Hash,
  FileCode,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Palette,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Save,
  X,
  Layers,
  Wand2
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ElementSelectorData {
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

interface LiveElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  text?: string;
  src?: string;
  href?: string;
  path: string;
  rect: { x: number; y: number; width: number; height: number };
  styles: {
    color?: string;
    backgroundColor?: string;
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    textAlign?: string;
    padding?: string;
    margin?: string;
    borderRadius?: string;
    opacity?: string;
  };
  canEdit: boolean;
}

interface ElementSelectorProps {
  sessionId: string;
  projectId: string;
  previewUrl?: string;
  onCodeChange?: (filePath: string, changes: { styles?: Record<string, string>; text?: string }) => void;
  className?: string;
}

const PRESET_COLORS = [
  '#000000', '#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db',
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ffffff', 'transparent',
];

export function ElementSelector({ sessionId, projectId, previewUrl, onCodeChange, className }: ElementSelectorProps) {
  const defaultUrl = typeof window !== 'undefined' ? window.location.origin : 'https://e-code.ai';
  const [pageUrl, setPageUrl] = useState(previewUrl || defaultUrl);
  const [elementDescription, setElementDescription] = useState('');
  const [preferredType, setPreferredType] = useState<'css' | 'xpath'>('css');
  const [openSelectors, setOpenSelectors] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('live');
  
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<LiveElementInfo | null>(null);
  const [hoveredElement, setHoveredElement] = useState<LiveElementInfo | null>(null);
  const [editedStyles, setEditedStyles] = useState<Partial<LiveElementInfo['styles']>>({});
  const [editedText, setEditedText] = useState('');
  const [showOutlines, setShowOutlines] = useState(true);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['/api/admin/agent/selector/history', sessionId],
  });

  const selectors: ElementSelectorData[] = historyData?.history || [];

  const { data: previewStatus, refetch: refetchPreview } = useQuery<{
    previewUrl: string | null;
    status: string;
  }>({
    queryKey: ['/api/preview/url', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/preview/url?projectId=${projectId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to get preview status');
      return response.json();
    },
    enabled: !!projectId && activeTab === 'live',
  });

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

  const syncCodeMutation = useMutation({
    mutationFn: async (params: { elementPath: string; styles: Record<string, string>; text?: string }) => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/visual-edit`, {
        sessionId,
        elementPath: params.elementPath,
        styles: params.styles,
        text: params.text,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Changes Synced',
        description: 'Visual edits have been applied to your source code',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync changes to source code',
        variant: 'destructive',
      });
    },
  });

  const injectEditorScript = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    try {
      const script = `
        (function() {
          if (window.__elementSelectorInjected) return;
          window.__elementSelectorInjected = true;

          let highlightOverlay = document.createElement('div');
          highlightOverlay.id = '__element-selector-overlay';
          highlightOverlay.style.cssText = 'position:fixed;pointer-events:none;z-index:99999;border:2px solid #8b5cf6;background:rgba(139,92,246,0.1);transition:all 0.15s ease;opacity:0;';
          document.body.appendChild(highlightOverlay);

          let selectedOverlay = document.createElement('div');
          selectedOverlay.id = '__element-selector-selected';
          selectedOverlay.style.cssText = 'position:fixed;pointer-events:none;z-index:99998;border:2px solid #22c55e;background:rgba(34,197,94,0.1);';
          document.body.appendChild(selectedOverlay);

          function getElementPath(el) {
            const path = [];
            while (el && el.tagName) {
              let selector = el.tagName.toLowerCase();
              if (el.id) selector += '#' + el.id;
              else if (el.className && typeof el.className === 'string') selector += '.' + el.className.split(' ')[0];
              path.unshift(selector);
              el = el.parentElement;
            }
            return path.join(' > ');
          }

          function generateSelector(el) {
            if (el.id) return '#' + el.id;
            if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
            
            const path = [];
            let current = el;
            while (current && current.tagName && current.tagName !== 'HTML') {
              let selector = current.tagName.toLowerCase();
              if (current.id) {
                path.unshift('#' + current.id);
                break;
              } else if (current.className && typeof current.className === 'string') {
                const classes = current.className.trim().split(/\\s+/).slice(0, 2).join('.');
                if (classes) selector += '.' + classes;
              }
              path.unshift(selector);
              current = current.parentElement;
            }
            return path.join(' > ');
          }

          function getElementInfo(el) {
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            return {
              tagName: el.tagName,
              id: el.id || undefined,
              className: el.className || undefined,
              text: el.innerText?.substring(0, 200),
              src: el.src,
              href: el.href,
              path: getElementPath(el),
              selector: generateSelector(el),
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              styles: {
                color: styles.color,
                backgroundColor: styles.backgroundColor,
                fontSize: styles.fontSize,
                fontWeight: styles.fontWeight,
                fontStyle: styles.fontStyle,
                textDecoration: styles.textDecoration,
                textAlign: styles.textAlign,
                padding: styles.padding,
                margin: styles.margin,
                borderRadius: styles.borderRadius,
                opacity: styles.opacity
              },
              canEdit: ['P','H1','H2','H3','H4','H5','H6','SPAN','A','BUTTON','DIV','SECTION','ARTICLE','HEADER','FOOTER','LABEL','LI','TD','TH'].includes(el.tagName)
            };
          }

          function updateOverlay(overlay, rect, show) {
            if (show && rect) {
              overlay.style.left = rect.x + 'px';
              overlay.style.top = rect.y + 'px';
              overlay.style.width = rect.width + 'px';
              overlay.style.height = rect.height + 'px';
              overlay.style.opacity = '1';
            } else {
              overlay.style.opacity = '0';
            }
          }

          document.addEventListener('mousemove', function(e) {
            if (!window.__pickerActive) return;
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el && el !== highlightOverlay && el !== selectedOverlay && !el.id?.startsWith('__element-selector')) {
              const info = getElementInfo(el);
              updateOverlay(highlightOverlay, info.rect, true);
              window.parent.postMessage({ type: 'element-hover', data: info }, '*');
            }
          });

          document.addEventListener('click', function(e) {
            if (!window.__pickerActive) return;
            e.preventDefault();
            e.stopPropagation();
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (el && el !== highlightOverlay && el !== selectedOverlay && !el.id?.startsWith('__element-selector')) {
              window.__selectedElement = el;
              const info = getElementInfo(el);
              updateOverlay(selectedOverlay, info.rect, true);
              window.parent.postMessage({ type: 'element-select', data: info }, '*');
            }
          }, true);

          document.addEventListener('mouseleave', function() {
            updateOverlay(highlightOverlay, null, false);
            window.parent.postMessage({ type: 'element-hover', data: null }, '*');
          });

          window.addEventListener('message', function(e) {
            if (e.data.type === 'set-picker-mode') {
              window.__pickerActive = e.data.active;
              if (!e.data.active) {
                updateOverlay(highlightOverlay, null, false);
                updateOverlay(selectedOverlay, null, false);
              }
            } else if (e.data.type === 'apply-styles' && window.__selectedElement) {
              Object.assign(window.__selectedElement.style, e.data.styles);
              if (e.data.text !== undefined) {
                window.__selectedElement.innerText = e.data.text;
              }
              const info = getElementInfo(window.__selectedElement);
              updateOverlay(selectedOverlay, info.rect, true);
              window.parent.postMessage({ type: 'element-updated', data: info }, '*');
            } else if (e.data.type === 'show-outlines') {
              document.querySelectorAll('*').forEach(el => {
                if (!el.id?.startsWith('__element-selector')) {
                  if (e.data.show) {
                    el.style.outline = '1px dashed rgba(139,92,246,0.3)';
                  } else {
                    el.style.outline = '';
                  }
                }
              });
            }
          });

          console.log('[ElementSelector] Script injected successfully');
        })();
      `;
      
      const doc = iframe.contentDocument;
      if (doc) {
        const scriptEl = doc.createElement('script');
        scriptEl.textContent = script;
        doc.body.appendChild(scriptEl);
      }
    } catch (error) {
      console.warn('[ElementSelector] Could not inject script (cross-origin):', error);
    }
  }, []);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'element-hover') {
        setHoveredElement(e.data.data);
      } else if (e.data.type === 'element-select') {
        setSelectedElement(e.data.data);
        setEditedText(e.data.data?.text || '');
        setEditedStyles({});
      } else if (e.data.type === 'element-updated') {
        setSelectedElement(e.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.contentWindow?.postMessage({ type: 'set-picker-mode', active: isPickerActive }, '*');
  }, [isPickerActive]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.contentWindow?.postMessage({ type: 'show-outlines', show: showOutlines && isPickerActive }, '*');
  }, [showOutlines, isPickerActive]);

  const handleIframeLoad = useCallback(() => {
    setTimeout(injectEditorScript, 500);
  }, [injectEditorScript]);

  const handleStyleChange = useCallback((key: keyof LiveElementInfo['styles'], value: string) => {
    setEditedStyles(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyChanges = useCallback(() => {
    if (!selectedElement) return;

    const changes = { ...editedStyles };
    const textChanged = editedText !== selectedElement.text;

    iframeRef.current?.contentWindow?.postMessage({
      type: 'apply-styles',
      styles: changes,
      text: textChanged ? editedText : undefined
    }, '*');

    toast({ title: 'Changes applied', description: 'Style changes applied to preview' });

    if (onCodeChange) {
      onCodeChange(selectedElement.path, { 
        styles: changes as Record<string, string>, 
        text: textChanged ? editedText : undefined 
      });
    }
  }, [selectedElement, editedStyles, editedText, onCodeChange, toast]);

  const syncToCode = useCallback(() => {
    if (!selectedElement) return;
    
    syncCodeMutation.mutate({
      elementPath: selectedElement.path,
      styles: editedStyles as Record<string, string>,
      text: editedText !== selectedElement.text ? editedText : undefined,
    });
  }, [selectedElement, editedStyles, editedText, syncCodeMutation]);

  const handleRefresh = useCallback(() => {
    const iframe = iframeRef.current;
    const url = previewStatus?.previewUrl || previewUrl;
    if (iframe && url) {
      const urlObj = new URL(url, window.location.origin);
      urlObj.searchParams.set('_t', Date.now().toString());
      iframe.src = urlObj.toString();
    }
    refetchPreview();
  }, [previewStatus?.previewUrl, previewUrl, refetchPreview]);

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

  const currentStyles = {
    color: editedStyles.color || selectedElement?.styles.color || '#000000',
    backgroundColor: editedStyles.backgroundColor || selectedElement?.styles.backgroundColor || 'transparent',
    textAlign: editedStyles.textAlign || selectedElement?.styles.textAlign || 'left',
    fontWeight: editedStyles.fontWeight || selectedElement?.styles.fontWeight || 'normal',
    fontStyle: editedStyles.fontStyle || selectedElement?.styles.fontStyle || 'normal',
    fontSize: editedStyles.fontSize || selectedElement?.styles.fontSize || '16px',
    borderRadius: editedStyles.borderRadius || selectedElement?.styles.borderRadius || '0px',
    opacity: editedStyles.opacity || selectedElement?.styles.opacity || '1',
  };

  const livePreviewUrl = previewStatus?.previewUrl || previewUrl;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live" data-testid="tab-live-picker">
            <MousePointer2 className="h-3.5 w-3.5 mr-1.5" />
            Live Picker
          </TabsTrigger>
          <TabsTrigger value="picker" data-testid="tab-element-picker">
            <Wand2 className="h-3.5 w-3.5 mr-1.5" />
            AI Picker
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-selector-history">
            History ({selectors.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="flex-1 flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Button
                variant={isPickerActive ? "default" : "outline"}
                size="sm"
                onClick={() => setIsPickerActive(!isPickerActive)}
                className={cn("h-7 gap-1", isPickerActive && "bg-purple-600 hover:bg-purple-700")}
                data-testid="toggle-picker-mode"
              >
                <MousePointer2 className="h-3.5 w-3.5" />
                <span className="text-xs">{isPickerActive ? 'Picking' : 'Pick'}</span>
              </Button>
              
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Switch 
                  checked={showOutlines} 
                  onCheckedChange={setShowOutlines} 
                  className="scale-75"
                  disabled={!isPickerActive}
                />
                <span>Outlines</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleRefresh} className="h-7 w-7 p-0">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              {livePreviewUrl && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => window.open(livePreviewUrl, '_blank')} 
                  className="h-7 w-7 p-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 flex min-h-0">
            <div className="flex-1 bg-muted/30 rounded-lg overflow-hidden relative">
              {livePreviewUrl ? (
                <iframe
                  ref={iframeRef}
                  src={livePreviewUrl}
                  className="w-full h-full border-0"
                  title="Live Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                  onLoad={handleIframeLoad}
                  data-testid="live-preview-iframe"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-center p-4">
                  <div>
                    <Eye className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Preview not available. Start the preview to use live element picking.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {isPickerActive && (
              <div className="w-64 border-l bg-card flex flex-col ml-2 rounded-lg">
                <div className="p-2 border-b">
                  <h3 className="text-xs font-semibold">Element Editor</h3>
                </div>

                <ScrollArea className="flex-1">
                  {selectedElement ? (
                    <div className="p-2 space-y-3">
                      <div className="p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Code className="h-3 w-3 text-purple-500" />
                          <span className="text-xs font-medium">{selectedElement.tagName}</span>
                          {selectedElement.id && (
                            <Badge variant="outline" className="text-[9px] h-3.5">#{selectedElement.id}</Badge>
                          )}
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate">{selectedElement.path}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-6 mt-1 text-xs"
                          onClick={() => copyToClipboard((selectedElement as any).selector || selectedElement.path)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Selector
                        </Button>
                      </div>

                      {selectedElement.canEdit && selectedElement.text && (
                        <div className="space-y-1">
                          <Label className="text-[10px] flex items-center gap-1">
                            <Type className="w-2.5 h-2.5" /> Text
                          </Label>
                          <Input
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="h-7 text-xs"
                            data-testid="live-text-input"
                          />
                        </div>
                      )}

                      <Separator />

                      <div className="space-y-2">
                        <Label className="text-[10px] flex items-center gap-1">
                          <Palette className="w-2.5 h-2.5" /> Colors
                        </Label>
                        
                        <div className="grid grid-cols-2 gap-1.5">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 justify-start gap-1 text-[10px]">
                                <div className="w-3 h-3 rounded border" style={{ backgroundColor: currentStyles.color }} />
                                Text
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-2" align="start">
                              <div className="grid grid-cols-6 gap-0.5 mb-2">
                                {PRESET_COLORS.map(color => (
                                  <button
                                    key={color}
                                    className={cn("w-4 h-4 rounded border", currentStyles.color === color && "ring-1 ring-primary")}
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleStyleChange('color', color)}
                                  />
                                ))}
                              </div>
                              <Input
                                type="color"
                                value={currentStyles.color}
                                onChange={(e) => handleStyleChange('color', e.target.value)}
                                className="w-full h-6"
                              />
                            </PopoverContent>
                          </Popover>

                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 justify-start gap-1 text-[10px]">
                                <div className="w-3 h-3 rounded border" style={{ backgroundColor: currentStyles.backgroundColor }} />
                                BG
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-40 p-2" align="start">
                              <div className="grid grid-cols-6 gap-0.5 mb-2">
                                {PRESET_COLORS.map(color => (
                                  <button
                                    key={color}
                                    className={cn("w-4 h-4 rounded border", currentStyles.backgroundColor === color && "ring-1 ring-primary")}
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleStyleChange('backgroundColor', color)}
                                  />
                                ))}
                              </div>
                              <Input
                                type="color"
                                value={currentStyles.backgroundColor === 'transparent' ? '#ffffff' : currentStyles.backgroundColor}
                                onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                                className="w-full h-6"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px]">Typography</Label>
                        <div className="flex gap-0.5">
                          {[
                            { value: 'left', icon: AlignLeft },
                            { value: 'center', icon: AlignCenter },
                            { value: 'right', icon: AlignRight },
                          ].map(({ value, icon: Icon }) => (
                            <Button
                              key={value}
                              variant={currentStyles.textAlign === value ? "default" : "outline"}
                              size="sm"
                              className="h-6 flex-1 p-0"
                              onClick={() => handleStyleChange('textAlign', value)}
                            >
                              <Icon className="w-3 h-3" />
                            </Button>
                          ))}
                          <Button
                            variant={currentStyles.fontWeight === 'bold' || currentStyles.fontWeight === '700' ? "default" : "outline"}
                            size="sm"
                            className="h-6 flex-1 p-0"
                            onClick={() => handleStyleChange('fontWeight', currentStyles.fontWeight === 'bold' || currentStyles.fontWeight === '700' ? 'normal' : 'bold')}
                          >
                            <Bold className="w-3 h-3" />
                          </Button>
                          <Button
                            variant={currentStyles.fontStyle === 'italic' ? "default" : "outline"}
                            size="sm"
                            className="h-6 flex-1 p-0"
                            onClick={() => handleStyleChange('fontStyle', currentStyles.fontStyle === 'italic' ? 'normal' : 'italic')}
                          >
                            <Italic className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px]">Font Size</Label>
                        <div className="flex items-center gap-1.5">
                          <Slider
                            value={[parseInt(currentStyles.fontSize) || 16]}
                            onValueChange={([v]) => handleStyleChange('fontSize', `${v}px`)}
                            min={8}
                            max={72}
                            step={1}
                            className="flex-1"
                          />
                          <span className="text-[10px] w-8 text-right">{currentStyles.fontSize}</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex gap-1.5">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 h-7 text-xs"
                          onClick={() => {
                            setSelectedElement(null);
                            setEditedStyles({});
                          }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 h-7 text-xs"
                          onClick={applyChanges}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      </div>

                      <Button 
                        size="sm" 
                        className="w-full h-7 text-xs bg-green-600 hover:bg-green-700"
                        onClick={syncToCode}
                        disabled={syncCodeMutation.isPending}
                      >
                        {syncCodeMutation.isPending ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3 mr-1" />
                        )}
                        Sync to Code
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      <MousePointer2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Click an element in the preview to edit it</p>
                    </div>
                  )}
                </ScrollArea>

                {hoveredElement && !selectedElement && (
                  <div className="p-1.5 border-t bg-muted/30">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground truncate">
                        {hoveredElement.tagName} - {hoveredElement.path}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

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
                  placeholder="https://your-app.repl.co"
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
                    <Wand2 className="mr-2 h-4 w-4" />
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
                      The AI element selector analyzes the page and generates robust selectors using 
                      data-testid attributes, IDs, and semantic CSS/XPath patterns.
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
                  Use the Live Picker or AI Picker to generate selectors
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
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                              Element Path
                            </Label>
                            <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
                              {selector.elementPath}
                            </pre>
                          </div>

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
