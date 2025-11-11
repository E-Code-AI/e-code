import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, AlertCircle, RefreshCw, Sparkles, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { File } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonText } from '@/components/ui/skeleton-loader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useMediaQuery } from '@/hooks/use-media-query';
import { AICodeCompletion, useAICompletion } from './AICodeCompletion';
import { useAIPreferences } from '@/hooks/use-ai-preferences';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MultiEditorManager } from './MultiEditorManager';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface EditorTab {
  fileId: number;
  fileName: string;
  content: string;
  language: string;
  isDirty: boolean;
  version: number;  // Add version tracking to prevent concurrent edit conflicts
  lastSavedContent?: string;  // Track last saved content for rollback
}

interface ReplitCodeEditorProps {
  files: File[];
  activeFile?: File;
  onFileUpdate: (fileId: number, content: string) => void;
  className?: string;
}

function getLanguageFromFileName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    r: 'r',
    m: 'matlab',
    lua: 'lua',
    sh: 'shell',
    bash: 'shell',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    mdx: 'markdown',
    sql: 'sql',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    gitignore: 'gitignore',
  };
  
  return languageMap[extension || ''] || 'plaintext';
}

// Sortable Tab Component
interface SortableTabProps {
  tab: EditorTab;
  isActive: boolean;
  onClick: () => void;
  onClose: () => void;
}

function SortableTab({ tab, isActive, onClick, onClose }: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `tab-${tab.fileId}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group flex items-center h-full px-3 border-r border-[var(--ecode-border)] cursor-pointer hover:bg-[var(--ecode-sidebar-hover)] select-none",
        isActive && "bg-[var(--ecode-background)] border-b-0",
        isDragging && "cursor-grabbing"
      )}
      onClick={onClick}
      data-testid={`editor-tab-${tab.fileId}`}
    >
      <span className="text-sm whitespace-nowrap font-[family-name:var(--ecode-font-sans)]">
        {tab.isDirty && <span className="text-[var(--ecode-accent)] mr-1">•</span>}
        {tab.fileName}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-4 w-4 ml-2 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        data-testid={`close-tab-${tab.fileId}`}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function ReplitCodeEditor({ 
  files, 
  activeFile, 
  onFileUpdate,
  className 
}: ReplitCodeEditorProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const editorRef = useRef<any>(null);
  const retryTimeoutRef = useRef<any>(null);
  
  // Refs for managing autosave and preventing race conditions
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const pendingSaveRef = useRef<{ fileId: number; content: string; version: number } | null>(null);
  const fileVersionsRef = useRef<Map<number, number>>(new Map());
  
  // AI Code Completion hooks
  const {
    preferences: aiPreferences,
    toggleEnabled: toggleAIEnabled,
    setModel: setAIModel,
    toggleAutoTrigger,
    setConfidenceThreshold,
    getAvailableModels,
  } = useAIPreferences();
  
  const aiCompletion = useAICompletion(editorRef.current);
  const [aiProcessing, setAIProcessing] = useState(false);

  // Open file in new tab or activate existing tab
  useEffect(() => {
    if (activeFile && !activeFile.isFolder) {
      const existingTab = tabs.find(tab => tab.fileId === activeFile.id);
      
      if (existingTab) {
        setActiveTabId(activeFile.id);
      } else {
        const newTab: EditorTab = {
          fileId: activeFile.id,
          fileName: activeFile.name,
          content: activeFile.content || '',
          language: getLanguageFromFileName(activeFile.name),
          isDirty: false,
          version: 0,
          lastSavedContent: activeFile.content || '',
        };
        setTabs([...tabs, newTab]);
        setActiveTabId(activeFile.id);
        // Initialize version tracking
        fileVersionsRef.current.set(activeFile.id, 0);
      }
    }
  }, [activeFile]);

  // Update editor content when active tab changes
  useEffect(() => {
    const activeTab = tabs.find(tab => tab.fileId === activeTabId);
    if (activeTab) {
      setEditorContent(activeTab.content);
    } else {
      setEditorContent('');
    }
  }, [activeTabId, tabs]);

  // Properly debounced handleEditorChange with race condition prevention
  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined || activeTabId === null) return;
    
    // Clear any existing save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    // Get current version for this file
    const currentVersion = fileVersionsRef.current.get(activeTabId) || 0;
    
    // Update tab content with optimistic update (single state mutation)
    setTabs(prevTabs => prevTabs.map(tab => 
      tab.fileId === activeTabId 
        ? { ...tab, content: value, isDirty: true, version: currentVersion }
        : tab
    ));
    
    // Set up new debounced save
    saveTimeoutRef.current = setTimeout(async () => {
      // Check if another save is already in progress
      if (isSavingRef.current && pendingSaveRef.current?.fileId === activeTabId) {
        // Queue this save for after the current one completes
        pendingSaveRef.current = { fileId: activeTabId, content: value, version: currentVersion };
        return;
      }
      
      // Mark as saving
      isSavingRef.current = true;
      
      try {
        // Perform the save
        await onFileUpdate(activeTabId, value);
        
        // Update version after successful save
        const newVersion = currentVersion + 1;
        fileVersionsRef.current.set(activeTabId, newVersion);
        
        // Mark as clean and update version only after successful save
        setTabs(prevTabs => prevTabs.map(tab => {
          if (tab.fileId === activeTabId) {
            // Only mark as clean if the content matches what we just saved
            // This prevents marking as clean if user made more changes during save
            if (tab.content === value) {
              return { 
                ...tab, 
                isDirty: false, 
                version: newVersion,
                lastSavedContent: value 
              };
            }
          }
          return tab;
        }));
        
      } catch (error) {
        console.error('Failed to save file:', error);
        
        // On error, rollback to last saved content if user hasn't made more changes
        setTabs(prevTabs => prevTabs.map(tab => {
          if (tab.fileId === activeTabId && tab.content === value) {
            // Only rollback if content hasn't changed further
            return {
              ...tab,
              content: tab.lastSavedContent || tab.content,
              isDirty: false,
              version: currentVersion
            };
          }
          return tab;
        }));
      } finally {
        // Mark save as complete
        isSavingRef.current = false;
        
        // Check if there's a pending save
        if (pendingSaveRef.current && pendingSaveRef.current.fileId === activeTabId) {
          const pending = pendingSaveRef.current;
          pendingSaveRef.current = null;
          // Recursively handle the pending save
          handleEditorChange(pending.content);
        }
      }
    }, 1000); // 1 second debounce
  };

  const closeTab = (fileId: number) => {
    // Cancel any pending save for this file
    if (activeTabId === fileId && saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    // Clean up version tracking for this file
    fileVersionsRef.current.delete(fileId);
    
    const newTabs = tabs.filter(tab => tab.fileId !== fileId);
    setTabs(newTabs);
    
    if (activeTabId === fileId) {
      setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].fileId : null);
    }
  };

  const handleEditorMount = (editor: any, monaco: any) => {
    console.log('Monaco initialization: success');
    editorRef.current = editor;
    setIsLoading(false);
    setHasError(false);
    setErrorMessage('');
    
    // Clear any retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Set up AI completion status callback
    aiCompletion.setEnabled(aiPreferences.enabled);
    aiCompletion.setModel(aiPreferences.model);
    aiCompletion.setAutoTrigger(aiPreferences.autoTrigger);
    aiCompletion.setConfidenceThreshold(aiPreferences.confidenceThreshold);
  };

  const handleEditorError = (error: any) => {
    console.error('Monaco initialization: error', error);
    setHasError(true);
    setIsLoading(false);
    setErrorMessage(error?.message || 'Failed to load the code editor. Please refresh the page.');
    
    // Auto-retry after 3 seconds
    retryTimeoutRef.current = setTimeout(() => {
      setIsLoading(true);
      setHasError(false);
    }, 3000);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
  };

  // Clean up when active tab changes
  useEffect(() => {
    // Cancel any pending save when switching tabs
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [activeTabId]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Clean up retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      // Clean up save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      // Reset save state
      isSavingRef.current = false;
      pendingSaveRef.current = null;
    };
  }, []);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle tab reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTabs((items) => {
        const oldIndex = items.findIndex(tab => `tab-${tab.fileId}` === active.id);
        const newIndex = items.findIndex(tab => `tab-${tab.fileId}` === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const activeTab = tabs.find(tab => tab.fileId === activeTabId);

  if (tabs.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-[var(--ecode-background)]", className)}>
        <div className="text-center">
          <p className="text-lg text-[var(--ecode-text-muted)]">No files open</p>
          <p className="text-sm text-[var(--ecode-text-muted)] mt-2">
            Select a file from the sidebar to start editing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-[var(--ecode-background)]", className)}>
      {/* Draggable Tabs */}
      <div className="h-9 flex items-center bg-[var(--ecode-surface)] border-b border-[var(--ecode-border)] overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tabs.map(tab => `tab-${tab.fileId}`)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex items-center">
              {tabs.map((tab) => (
                <SortableTab
                  key={tab.fileId}
                  tab={tab}
                  isActive={activeTabId === tab.fileId}
                  onClick={() => setActiveTabId(tab.fileId)}
                  onClose={() => closeTab(tab.fileId)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        
        {/* Tab menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-full w-9 rounded-none">
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setTabs(tabs.filter(tab => tab.fileId === activeTabId));
            }}>
              Close Other Tabs
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setTabs([]);
              setActiveTabId(null);
            }}>
              Close All Tabs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* AI Completion Controls */}
        <div className="ml-auto flex items-center px-2 gap-2">
          {/* AI Status Badge */}
          {aiProcessing && (
            <Badge variant="outline" className="text-xs bg-primary/10 border-primary">
              <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
              AI Processing...
            </Badge>
          )}
          
          {/* AI Toggle Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={aiPreferences.enabled ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-7 w-7",
                    aiPreferences.enabled && "bg-primary hover:bg-primary/90"
                  )}
                  onClick={toggleAIEnabled}
                >
                  <Sparkles className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-semibold">AI Code Completion {aiPreferences.enabled ? 'Enabled' : 'Disabled'}</p>
                  <p className="text-xs">Press Ctrl+Alt+Space to trigger manually</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* AI Settings Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>AI Code Completion Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Model Selection */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">AI Model</DropdownMenuLabel>
              {getAvailableModels().map((model) => (
                <DropdownMenuCheckboxItem
                  key={model.value}
                  checked={aiPreferences.model === model.value}
                  onCheckedChange={() => setAIModel(model.value)}
                >
                  <div>
                    <div className="font-medium">{model.label}</div>
                    <div className="text-xs text-muted-foreground">{model.description}</div>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              
              {/* Auto-trigger Toggle */}
              <DropdownMenuItem 
                className="flex items-center justify-between"
                onSelect={(e) => e.preventDefault()}
              >
                <Label htmlFor="auto-trigger" className="cursor-pointer">Auto-trigger</Label>
                <Switch
                  id="auto-trigger"
                  checked={aiPreferences.autoTrigger}
                  onCheckedChange={toggleAutoTrigger}
                />
              </DropdownMenuItem>
              
              {/* Confidence Threshold */}
              <DropdownMenuItem 
                className="flex flex-col gap-1"
                onSelect={(e) => e.preventDefault()}
              >
                <div className="flex items-center justify-between w-full">
                  <Label className="text-xs">Confidence Threshold</Label>
                  <span className="text-xs text-muted-foreground">{Math.round(aiPreferences.confidenceThreshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={aiPreferences.confidenceThreshold * 100}
                  onChange={(e) => setConfidenceThreshold(parseInt(e.target.value) / 100)}
                  className="w-full h-1 bg-muted rounded-lg cursor-pointer"
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--ecode-background)] z-10">
            <div className="text-center space-y-4">
              <Skeleton className="h-4 w-48 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
              <p className="text-sm text-[var(--ecode-text-muted)]">Loading editor...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--ecode-background)] z-10 p-8">
            <Alert className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Editor Failed to Load</AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <p>{errorMessage}</p>
                <Button onClick={handleRetry} size="sm" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Loading
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* AI Code Completion Component */}
        <AICodeCompletion
          editor={editorRef.current}
          enabled={aiPreferences.enabled}
          model={aiPreferences.model}
          autoTrigger={aiPreferences.autoTrigger}
          confidenceThreshold={aiPreferences.confidenceThreshold}
          onStatusChange={(status) => setAIProcessing(status === 'loading')}
        />
        
        {/* Multi-Editor Manager - One Monaco instance per tab */}
        <MultiEditorManager
          tabs={tabs.map(tab => ({
            fileId: tab.fileId,
            fileName: tab.fileName,
            content: tab.content,
            language: tab.language,
          }))}
          activeTabId={activeTabId}
          onContentChange={(fileId, content) => {
            // Update local state
            setTabs(prevTabs => prevTabs.map(tab =>
              tab.fileId === fileId ? { ...tab, content, isDirty: true } : tab
            ));
            
            // Debounced save (reuse existing logic)
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
            }
            
            const currentVersion = fileVersionsRef.current.get(fileId) || 0;
            
            saveTimeoutRef.current = setTimeout(async () => {
              if (isSavingRef.current && pendingSaveRef.current?.fileId === fileId) {
                pendingSaveRef.current = { fileId, content, version: currentVersion };
                return;
              }
              
              isSavingRef.current = true;
              
              try {
                await onFileUpdate(fileId, content);
                const newVersion = currentVersion + 1;
                fileVersionsRef.current.set(fileId, newVersion);
                
                setTabs(prevTabs => prevTabs.map(tab => {
                  if (tab.fileId === fileId && tab.content === content) {
                    return {
                      ...tab,
                      isDirty: false,
                      version: newVersion,
                      lastSavedContent: content,
                    };
                  }
                  return tab;
                }));
              } catch (error) {
                console.error('Failed to save file:', error);
              } finally {
                isSavingRef.current = false;
                
                if (pendingSaveRef.current && pendingSaveRef.current.fileId === fileId) {
                  const pending = pendingSaveRef.current;
                  pendingSaveRef.current = null;
                  // Trigger save for pending content
                  setTimeout(() => {
                    setTabs(prevTabs => prevTabs.map(tab =>
                      tab.fileId === pending.fileId
                        ? { ...tab, content: pending.content, isDirty: true }
                        : tab
                    ));
                  }, 0);
                }
              }
            }, 1000);
          }}
        />
      </div>
    </div>
  );
}