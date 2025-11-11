import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DraggableTab } from "./DraggableTab";
import { AddTabMenu } from "./AddTabMenu";

interface Tab {
  id: string;
  label: string;
  icon?: any;
  closable?: boolean;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onAddTab?: (toolId: string) => void;
  onTabsReorder?: (tabs: Tab[]) => void;
}

export function TabBar({ tabs, activeTab, onTabChange, onTabClose, onAddTab, onTabsReorder }: TabBarProps) {
  const moveTab = (dragIndex: number, hoverIndex: number) => {
    const newTabs = [...tabs];
    const draggedTab = newTabs[dragIndex];
    
    // Remove the dragged tab from its original position
    newTabs.splice(dragIndex, 1);
    
    // Insert it at the new position
    newTabs.splice(hoverIndex, 0, draggedTab);
    
    // Update the tabs order
    if (onTabsReorder) {
      onTabsReorder(newTabs);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-10 bg-background border-b flex items-center">
        {tabs.length === 1 && (
          <div className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-md ml-2 mr-2 flex-shrink-0 animate-fade-in">
            <span>💡 Tip: Click "+ Add Tab" to explore 21 features</span>
          </div>
        )}
        <div className="flex items-center gap-1 px-2 overflow-x-auto flex-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {tabs.map((tab, index) => (
            <DraggableTab
              key={tab.id}
              tab={tab}
              index={index}
              isActive={activeTab === tab.id}
              onTabChange={onTabChange}
              onTabClose={onTabClose}
              onMoveTab={moveTab}
            />
          ))}
          {onAddTab && (
            <div className="flex-shrink-0">
              <AddTabMenu onAddTab={onAddTab} />
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}
