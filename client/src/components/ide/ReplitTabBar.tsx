import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FileCode,
  FileJson,
  FileText,
  FileImage,
  Copy,
  SplitSquareVertical,
  Pin,
  PinOff,
} from 'lucide-react';

export interface Tab {
  id: string;
  label: string;
  icon?: typeof FileText;
  closable?: boolean;
  pinned?: boolean;
  modified?: boolean;
  path?: string;
}

interface ReplitTabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddTab?: () => void;
  onTabReorder?: (fromIndex: number, toIndex: number) => void;
  onTabPin?: (tabId: string) => void;
  onTabDuplicate?: (tabId: string) => void;
  onSplitRight?: (tabId: string) => void;
  className?: string;
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
    case 'go':
    case 'rs':
      return FileCode;
    case 'json':
    case 'xml':
    case 'yaml':
    case 'yml':
      return FileJson;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return FileImage;
    default:
      return FileText;
  }
};

export function ReplitTabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onAddTab,
  onTabReorder,
  onTabPin,
  onTabDuplicate,
  onSplitRight,
  className,
}: ReplitTabBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (ref) {
        ref.removeEventListener('scroll', checkScroll);
      }
      window.removeEventListener('resize', checkScroll);
    };
  }, [tabs]);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
  };

  const handleDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    if (draggedTabId && draggedTabId !== tabId) {
      setDragOverTabId(tabId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTabId(null);
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (draggedTabId && draggedTabId !== targetTabId && onTabReorder) {
      const fromIndex = tabs.findIndex(t => t.id === draggedTabId);
      const toIndex = tabs.findIndex(t => t.id === targetTabId);
      if (fromIndex !== -1 && toIndex !== -1) {
        onTabReorder(fromIndex, toIndex);
      }
    }
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const pinnedTabs = tabs.filter(t => t.pinned);
  const unpinnedTabs = tabs.filter(t => !t.pinned);

  const renderTab = (tab: Tab) => {
    const isActive = activeTabId === tab.id;
    const isDragging = draggedTabId === tab.id;
    const isDragOver = dragOverTabId === tab.id;
    const Icon = tab.icon || getFileIcon(tab.label);

    return (
      <ContextMenu key={tab.id}>
        <ContextMenuTrigger asChild>
          <div
            draggable={!tab.pinned}
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={(e) => handleDragOver(e, tab.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, tab.id)}
            onDragEnd={handleDragEnd}
            onClick={() => onTabClick(tab.id)}
            data-testid={`tab-${tab.id}`}
            className={cn(
              'group relative flex items-center gap-1.5 h-[34px] px-3 cursor-pointer select-none',
              'text-[13px] font-medium transition-all duration-150',
              'border-r border-[var(--ecode-border)]',
              tab.pinned && 'min-w-[40px] max-w-[40px] justify-center px-0',
              !tab.pinned && 'min-w-[100px] max-w-[180px]',
              isActive && [
                'bg-[var(--ecode-editor-bg)] text-[var(--ecode-text)]',
                'border-t-2 border-t-[var(--ecode-accent)] -mt-[2px]',
              ],
              !isActive && [
                'bg-[var(--ecode-sidebar-bg)] text-[var(--ecode-text-muted)]',
                'hover:bg-[var(--ecode-sidebar-hover)] hover:text-[var(--ecode-text)]',
              ],
              isDragging && 'opacity-50',
              isDragOver && 'bg-[#2B3245] border-l-2 border-l-[var(--ecode-accent)]'
            )}
          >
            <Icon className={cn(
              'h-4 w-4 flex-shrink-0',
              isActive ? 'text-[var(--ecode-accent)]' : 'text-[var(--ecode-text-muted)]'
            )} />
            
            {!tab.pinned && (
              <>
                <span className="truncate flex-1">{tab.label}</span>
                
                {tab.modified && (
                  <span className="w-2 h-2 rounded-full bg-[var(--ecode-accent)] flex-shrink-0" />
                )}
                
                {tab.closable !== false && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabClose(tab.id);
                    }}
                    className={cn(
                      'flex-shrink-0 p-0.5 rounded-sm transition-all',
                      'opacity-0 group-hover:opacity-100',
                      'hover:bg-[#3D4455]'
                    )}
                    data-testid={`tab-close-${tab.id}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => onTabClose(tab.id)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </ContextMenuItem>
          <ContextMenuItem 
            onClick={() => {
              tabs.filter(t => t.id !== tab.id).forEach(t => onTabClose(t.id));
            }}
          >
            Close Others
          </ContextMenuItem>
          <ContextMenuItem 
            onClick={() => {
              const idx = tabs.findIndex(t => t.id === tab.id);
              tabs.slice(idx + 1).forEach(t => onTabClose(t.id));
            }}
          >
            Close to the Right
          </ContextMenuItem>
          <ContextMenuSeparator />
          {onTabPin && (
            <ContextMenuItem onClick={() => onTabPin(tab.id)}>
              {tab.pinned ? (
                <>
                  <PinOff className="h-4 w-4 mr-2" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4 mr-2" />
                  Pin
                </>
              )}
            </ContextMenuItem>
          )}
          {onTabDuplicate && (
            <ContextMenuItem onClick={() => onTabDuplicate(tab.id)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </ContextMenuItem>
          )}
          {onSplitRight && (
            <ContextMenuItem onClick={() => onSplitRight(tab.id)}>
              <SplitSquareVertical className="h-4 w-4 mr-2" />
              Split Right
            </ContextMenuItem>
          )}
          {tab.path && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem 
                onClick={() => navigator.clipboard.writeText(tab.path!)}
              >
                Copy Path
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <div
      className={cn(
        'flex items-center h-[36px] bg-[var(--ecode-sidebar-bg)]',
        'border-b border-[var(--ecode-border)]',
        className
      )}
      data-testid="tab-bar"
    >
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollLeft}
          className="h-full w-6 p-0 rounded-none hover:bg-[var(--ecode-sidebar-hover)] flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      
      <div
        ref={scrollRef}
        className="flex items-center flex-1 overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {pinnedTabs.map(renderTab)}
        {pinnedTabs.length > 0 && unpinnedTabs.length > 0 && (
          <div className="w-px h-[20px] bg-[var(--ecode-border)] mx-1" />
        )}
        {unpinnedTabs.map(renderTab)}
      </div>
      
      {canScrollRight && (
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollRight}
          className="h-full w-6 p-0 rounded-none hover:bg-[var(--ecode-sidebar-hover)] flex-shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
      
      {onAddTab && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddTab}
          className="h-full w-8 p-0 rounded-none hover:bg-[var(--ecode-sidebar-hover)] flex-shrink-0 border-l border-[var(--ecode-border)]"
          data-testid="tab-add"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
