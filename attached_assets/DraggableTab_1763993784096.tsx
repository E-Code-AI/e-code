import { useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { X, Pin, Copy, Maximize2, Split, MoreHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner@2.0.3";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Tab {
  id: string;
  label: string;
  icon?: any;
  closable?: boolean;
}

interface DraggableTabProps {
  tab: Tab;
  index: number;
  isActive: boolean;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onMoveTab: (dragIndex: number, hoverIndex: number) => void;
}

const ItemType = "TAB";

export function DraggableTab({
  tab,
  index,
  isActive,
  onTabChange,
  onTabClose,
  onMoveTab,
}: DraggableTabProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isPinned, setIsPinned] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemType,
    hover: (item: { index: number }) => {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Move the tab
      onMoveTab(dragIndex, hoverIndex);

      // Update the index for the dragged item
      item.index = hoverIndex;
    },
  });

  // Connect drag and drop refs
  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`flex items-center gap-1.5 px-2 h-7 rounded-md cursor-pointer group transition-all duration-200 relative ${
        isActive
          ? "bg-accent text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground hover:shadow-sm"
      } ${isDragging ? "opacity-50 scale-95" : "opacity-100"} ${isPinned ? "border border-blue-500/30" : ""}`}
      onClick={() => onTabChange(tab.id)}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {isPinned && <Pin className="w-2.5 h-2.5 text-blue-500 absolute -top-1 -left-1" />}
      {tab.icon && <tab.icon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110" />}
      <span className="text-xs">{tab.label}</span>
      
      {/* Context menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-3.5 w-3.5 p-0 ml-0.5 opacity-0 group-hover:opacity-100 hover:bg-accent transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <MoreHorizontal className="w-2.5 h-2.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            setIsPinned(!isPinned);
            toast.success(isPinned ? "Tab unpinned" : "Tab pinned");
          }}>
            <Pin className="w-4 h-4 mr-2" />
            {isPinned ? "Unpin tab" : "Pin tab"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(tab.label);
            toast.success("Tab name copied");
          }}>
            <Copy className="w-4 h-4 mr-2" />
            Copy tab name
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            toast.info("Maximize", { description: "Tab maximized in split view" });
          }}>
            <Maximize2 className="w-4 h-4 mr-2" />
            Maximize
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            toast.info("Split view", { description: "Opening in split view" });
          }}>
            <Split className="w-4 h-4 mr-2" />
            Split right
          </DropdownMenuItem>
          {tab.closable && onTabClose && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Close tab
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {tab.closable && onTabClose && (
        <Button
          variant="ghost"
          size="sm"
          className="h-3.5 w-3.5 p-0 ml-0.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation();
            onTabClose(tab.id);
          }}
        >
          <X className="w-2.5 h-2.5" />
        </Button>
      )}
    </div>
  );
}
