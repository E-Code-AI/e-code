/**
 * TabBar - Simple tab bar component for IDE tools
 * Uses a lightweight implementation compatible with our DraggableTab component
 */

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
}

export function TabBar({ tabs, activeTab, onTabChange, onTabClose }: TabBarProps) {
  return (
    <div className="h-10 bg-background border-b flex items-center">
      {tabs.length === 1 && (
        <div className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-100 dark:border-blue-900 rounded-md ml-2 mr-2 flex-shrink-0">
          <span>💡 Tip: Multiple tabs help you work efficiently</span>
        </div>
      )}
      <div className="flex items-center gap-0 overflow-x-auto flex-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              group flex items-center gap-2 px-4 py-2 border-r border-border
              transition-colors text-sm font-medium min-w-[120px] max-w-[200px]
              ${
                activeTab === tab.id
                  ? 'bg-background text-foreground'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              }
            `}
            data-testid={`tab-${tab.id}`}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span className="truncate flex-1">{tab.label}</span>
            {tab.closable !== false && onTabClose && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-accent rounded transition-opacity flex-shrink-0"
                data-testid={`button-close-tab-${tab.id}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
