import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  LayoutNode,
  Split,
  PaneGroup,
  FloatingPane,
  TabInfo,
  DragState,
  ResizeState,
  DropTarget,
  DragItem,
  isSplit,
  isPaneGroup,
  DEFAULT_LAYOUT,
  DropZone,
} from '@/types/splits';

interface SplitsStore {
  // State
  root: LayoutNode | null;
  floatingPanes: Map<string, FloatingPane>;
  activePane: string | null;
  maximizedPane: string | null;
  dragState: DragState;
  resizeState: ResizeState;
  layoutHistory: LayoutNode[];
  historyIndex: number;
  nextFloatingZIndex: number;

  // Actions
  initializeLayout: (layout?: LayoutNode) => void;
  splitPane: (paneId: string, direction: 'horizontal' | 'vertical', newPane?: PaneGroup) => void;
  mergePane: (sourcePaneId: string, targetPaneId: string) => void;
  moveTab: (tabId: string, sourcePaneId: string, targetPaneId: string, targetIndex?: number) => void;
  closeTab: (tabId: string, paneId: string) => void;
  addTab: (paneId: string, tab: TabInfo, makeActive?: boolean) => void;
  floatPane: (paneId: string) => void;
  unfloatPane: (floatingPaneId: string, dropTarget?: DropTarget) => void;
  maximizePane: (paneId: string) => void;
  restorePane: () => void;
  resizeSplit: (splitId: string, sizes: number[]) => void;
  setActivePane: (paneId: string) => void;
  updateFloatingPosition: (paneId: string, position: { x: number; y: number; width?: number; height?: number }) => void;
  bringFloatingToFront: (paneId: string) => void;
  
  // Drag & Drop
  startDrag: (item: DragItem, position: { x: number; y: number }, offset?: { x: number; y: number }) => void;
  updateDrag: (position: { x: number; y: number }, dropTarget?: DropTarget | null) => void;
  endDrag: () => void;
  
  // Resize
  startResize: (splitId: string, direction: 'horizontal' | 'vertical', startPosition: number) => void;
  updateResize: (currentPosition: number) => void;
  endResize: () => void;
  
  // History
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  
  // Persistence
  saveLayout: () => void;
  loadLayout: (layout?: string) => void;
  resetLayout: () => void;
  
  // Utilities
  findNode: (nodeId: string, node?: LayoutNode) => LayoutNode | null;
  findParentSplit: (nodeId: string, node?: LayoutNode) => Split | null;
  generatePaneId: () => string;
  generateTabId: () => string;
  calculateDropZone: (paneId: string, position: { x: number; y: number }) => DropZone | null;
}

// Utility functions
const findNodeRecursive = (nodeId: string, node: LayoutNode | null): LayoutNode | null => {
  if (!node) return null;
  if (node.id === nodeId) return node;
  
  if (isSplit(node)) {
    for (const child of node.children) {
      const found = findNodeRecursive(nodeId, child);
      if (found) return found;
    }
  }
  
  return null;
};

const findParentSplitRecursive = (nodeId: string, node: LayoutNode | null, parent: Split | null = null): Split | null => {
  if (!node) return null;
  if (node.id === nodeId) return parent;
  
  if (isSplit(node)) {
    for (const child of node.children) {
      const found = findParentSplitRecursive(nodeId, child, node);
      if (found) return found;
    }
  }
  
  return null;
};

const removeNodeFromTree = (nodeId: string, node: LayoutNode | null): LayoutNode | null => {
  if (!node) return null;
  
  if (isSplit(node)) {
    const newChildren = node.children.filter(child => child.id !== nodeId);
    
    if (newChildren.length !== node.children.length) {
      // Node was removed
      if (newChildren.length === 1) {
        // If only one child left, promote it
        return newChildren[0];
      }
      return {
        ...node,
        children: newChildren,
      };
    }
    
    // Recursively check children
    return {
      ...node,
      children: node.children.map(child => removeNodeFromTree(nodeId, child)).filter(Boolean) as LayoutNode[],
    };
  }
  
  return node;
};

const useSplitsStore = create<SplitsStore>()(
  immer((set, get) => ({
    // Initial state
    root: null,
    floatingPanes: new Map(),
    activePane: null,
    maximizedPane: null,
    dragState: {
      isDragging: false,
      draggedItem: null,
      dropTarget: null,
      dragPosition: null,
      dragOffset: null,
      isValidDrop: false,
    },
    resizeState: {
      isResizing: false,
      resizingId: null,
      direction: null,
      startPosition: 0,
      currentPosition: 0,
      startSizes: [],
    },
    layoutHistory: [],
    historyIndex: -1,
    nextFloatingZIndex: 1000,

    // Initialize layout
    initializeLayout: (layout) => {
      set((state) => {
        state.root = layout || DEFAULT_LAYOUT;
        state.floatingPanes = new Map();
        state.activePane = null;
        state.maximizedPane = null;
        state.layoutHistory = [state.root];
        state.historyIndex = 0;
      });
    },

    // Split a pane
    splitPane: (paneId, direction, newPane) => {
      set((state) => {
        const targetPane = findNodeRecursive(paneId, state.root);
        if (!targetPane || !isPaneGroup(targetPane)) return;

        const parent = findParentSplitRecursive(paneId, state.root);
        const newPaneGroup = newPane || {
          id: get().generatePaneId(),
          tabs: [],
          activeTabIndex: 0,
          percent: 50,
        };

        if (parent) {
          // Replace the pane with a new split
          const targetIndex = parent.children.findIndex(child => child.id === paneId);
          if (targetIndex !== -1) {
            const newSplit: Split = {
              id: get().generatePaneId(),
              direction,
              children: [
                { ...targetPane, percent: 50 },
                newPaneGroup,
              ],
            };
            parent.children[targetIndex] = newSplit;
          }
        } else if (state.root?.id === paneId) {
          // Root is the pane, wrap it in a split
          state.root = {
            id: 'root',
            direction,
            children: [
              { ...targetPane, percent: 50 },
              newPaneGroup,
            ],
          };
        }
        
        get().saveToHistory();
      });
    },

    // Move a tab between panes
    moveTab: (tabId, sourcePaneId, targetPaneId, targetIndex) => {
      set((state) => {
        const sourcePane = findNodeRecursive(sourcePaneId, state.root) as PaneGroup;
        const targetPane = findNodeRecursive(targetPaneId, state.root) as PaneGroup;
        
        if (!sourcePane || !targetPane || !isPaneGroup(sourcePane) || !isPaneGroup(targetPane)) return;
        
        const tabIndex = sourcePane.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        const tab = sourcePane.tabs[tabIndex];
        
        // Remove from source
        sourcePane.tabs.splice(tabIndex, 1);
        if (sourcePane.activeTabIndex >= sourcePane.tabs.length) {
          sourcePane.activeTabIndex = Math.max(0, sourcePane.tabs.length - 1);
        }
        
        // Add to target
        const insertIndex = targetIndex ?? targetPane.tabs.length;
        targetPane.tabs.splice(insertIndex, 0, tab);
        targetPane.activeTabIndex = insertIndex;
        
        // Remove empty panes
        if (sourcePane.tabs.length === 0 && sourcePaneId !== targetPaneId) {
          state.root = removeNodeFromTree(sourcePaneId, state.root);
        }
      });
    },

    // Close a tab
    closeTab: (tabId, paneId) => {
      set((state) => {
        const pane = findNodeRecursive(paneId, state.root) as PaneGroup;
        if (!pane || !isPaneGroup(pane)) return;
        
        const tabIndex = pane.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;
        
        pane.tabs.splice(tabIndex, 1);
        
        if (pane.activeTabIndex >= pane.tabs.length) {
          pane.activeTabIndex = Math.max(0, pane.tabs.length - 1);
        }
        
        // Remove pane if no tabs left
        if (pane.tabs.length === 0) {
          state.root = removeNodeFromTree(paneId, state.root);
        }
      });
    },

    // Add a tab to a pane
    addTab: (paneId, tab, makeActive = true) => {
      set((state) => {
        const pane = findNodeRecursive(paneId, state.root) as PaneGroup;
        if (!pane || !isPaneGroup(pane)) return;
        
        // Check if tab already exists
        const existingIndex = pane.tabs.findIndex(t => t.id === tab.id);
        if (existingIndex !== -1) {
          if (makeActive) {
            pane.activeTabIndex = existingIndex;
          }
          return;
        }
        
        pane.tabs.push(tab);
        if (makeActive) {
          pane.activeTabIndex = pane.tabs.length - 1;
        }
      });
    },

    // Float a pane
    floatPane: (paneId) => {
      set((state) => {
        const pane = findNodeRecursive(paneId, state.root) as PaneGroup;
        if (!pane || !isPaneGroup(pane)) return;
        
        // Remove from layout
        state.root = removeNodeFromTree(paneId, state.root);
        
        // Add to floating panes
        const floatingPane: FloatingPane = {
          id: paneId,
          paneGroup: pane,
          position: {
            x: window.innerWidth / 2 - 400,
            y: window.innerHeight / 2 - 300,
            width: 800,
            height: 600,
          },
          zIndex: state.nextFloatingZIndex++,
        };
        
        state.floatingPanes.set(paneId, floatingPane);
      });
    },

    // Unfloat a pane
    unfloatPane: (floatingPaneId, dropTarget) => {
      set((state) => {
        const floatingPane = state.floatingPanes.get(floatingPaneId);
        if (!floatingPane) return;
        
        state.floatingPanes.delete(floatingPaneId);
        
        if (dropTarget) {
          // Add back to layout at drop target
          const targetNode = findNodeRecursive(dropTarget.targetId, state.root);
          if (targetNode && dropTarget.zone !== 'center') {
            // Split the target
            const direction = dropTarget.zone === 'top' || dropTarget.zone === 'bottom' ? 'vertical' : 'horizontal';
            get().splitPane(dropTarget.targetId, direction, floatingPane.paneGroup);
          } else if (targetNode && isPaneGroup(targetNode) && dropTarget.zone === 'center') {
            // Merge tabs
            floatingPane.paneGroup.tabs.forEach(tab => {
              get().addTab(dropTarget.targetId, tab, true);
            });
          }
        } else {
          // Add back as a new pane
          if (!state.root) {
            state.root = floatingPane.paneGroup;
          } else {
            // Add to right side by default
            get().splitPane('root', 'horizontal', floatingPane.paneGroup);
          }
        }
      });
    },

    // Maximize/restore pane
    maximizePane: (paneId) => {
      set((state) => {
        state.maximizedPane = paneId;
      });
    },
    
    restorePane: () => {
      set((state) => {
        state.maximizedPane = null;
      });
    },

    // Resize split
    resizeSplit: (splitId, sizes) => {
      set((state) => {
        const split = findNodeRecursive(splitId, state.root) as Split;
        if (!split || !isSplit(split)) return;
        
        split.children.forEach((child, index) => {
          if (index < sizes.length) {
            child.percent = sizes[index];
          }
        });
      });
    },

    // Set active pane
    setActivePane: (paneId) => {
      set((state) => {
        state.activePane = paneId;
      });
    },

    // Update floating pane position
    updateFloatingPosition: (paneId, position) => {
      set((state) => {
        const floatingPane = state.floatingPanes.get(paneId);
        if (floatingPane) {
          floatingPane.position = {
            ...floatingPane.position,
            ...position,
          };
        }
      });
    },

    // Bring floating pane to front
    bringFloatingToFront: (paneId) => {
      set((state) => {
        const floatingPane = state.floatingPanes.get(paneId);
        if (floatingPane) {
          floatingPane.zIndex = state.nextFloatingZIndex++;
        }
      });
    },

    // Drag & Drop
    startDrag: (item, position, offset) => {
      set((state) => {
        state.dragState = {
          isDragging: true,
          draggedItem: item,
          dropTarget: null,
          dragPosition: position,
          dragOffset: offset || { x: 0, y: 0 },
          isValidDrop: false,
        };
      });
    },

    updateDrag: (position, dropTarget) => {
      set((state) => {
        state.dragState.dragPosition = position;
        state.dragState.dropTarget = dropTarget || null;
        state.dragState.isValidDrop = dropTarget !== null;
      });
    },

    endDrag: () => {
      const { dragState } = get();
      
      if (dragState.isValidDrop && dragState.dropTarget && dragState.draggedItem) {
        const { dropTarget, draggedItem } = dragState;
        
        if (draggedItem.type === 'tab' && draggedItem.paneId) {
          // Moving a tab
          if (dropTarget.zone === 'header' || dropTarget.zone === 'center') {
            // Merge tabs
            get().moveTab(
              draggedItem.id,
              draggedItem.paneId,
              dropTarget.targetId
            );
          } else {
            // Split and move
            const direction = dropTarget.zone === 'top' || dropTarget.zone === 'bottom' ? 'vertical' : 'horizontal';
            const newPaneId = get().generatePaneId();
            const newPane: PaneGroup = {
              id: newPaneId,
              tabs: [],
              activeTabIndex: 0,
              percent: 50,
            };
            
            get().splitPane(dropTarget.targetId, direction, newPane);
            get().moveTab(draggedItem.id, draggedItem.paneId, newPaneId);
          }
        } else if (draggedItem.type === 'file') {
          // Opening a file from file tree
          const tab: TabInfo = {
            id: get().generateTabId(),
            title: draggedItem.fileName || 'New File',
            type: 'editor',
            content: null,
            filePath: draggedItem.filePath,
          };
          
          if (dropTarget.zone === 'header' || dropTarget.zone === 'center') {
            get().addTab(dropTarget.targetId, tab, true);
          } else {
            const direction = dropTarget.zone === 'top' || dropTarget.zone === 'bottom' ? 'vertical' : 'horizontal';
            const newPaneId = get().generatePaneId();
            const newPane: PaneGroup = {
              id: newPaneId,
              tabs: [tab],
              activeTabIndex: 0,
              percent: 50,
            };
            
            get().splitPane(dropTarget.targetId, direction, newPane);
          }
        }
      }
      
      set((state) => {
        state.dragState = {
          isDragging: false,
          draggedItem: null,
          dropTarget: null,
          dragPosition: null,
          dragOffset: null,
          isValidDrop: false,
        };
      });
    },

    // Resize
    startResize: (splitId, direction, startPosition) => {
      const split = get().findNode(splitId, get().root) as Split;
      if (!split || !isSplit(split)) return;
      
      set((state) => {
        state.resizeState = {
          isResizing: true,
          resizingId: splitId,
          direction,
          startPosition,
          currentPosition: startPosition,
          startSizes: split.children.map(child => child.percent || 0),
        };
      });
    },

    updateResize: (currentPosition) => {
      set((state) => {
        state.resizeState.currentPosition = currentPosition;
        
        if (state.resizeState.resizingId) {
          const split = findNodeRecursive(state.resizeState.resizingId, state.root) as Split;
          if (!split || !isSplit(split)) return;
          
          const delta = currentPosition - state.resizeState.startPosition;
          const totalSize = state.resizeState.direction === 'horizontal' ? window.innerWidth : window.innerHeight;
          const deltaPercent = (delta / totalSize) * 100;
          
          // Update sizes
          split.children.forEach((child, index) => {
            const startSize = state.resizeState.startSizes[index];
            if (index === 0) {
              child.percent = Math.max(10, Math.min(90, startSize + deltaPercent));
            } else {
              child.percent = Math.max(10, Math.min(90, startSize - deltaPercent));
            }
          });
        }
      });
    },

    endResize: () => {
      set((state) => {
        state.resizeState = {
          isResizing: false,
          resizingId: null,
          direction: null,
          startPosition: 0,
          currentPosition: 0,
          startSizes: [],
        };
      });
      get().saveToHistory();
    },

    // History
    undo: () => {
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex--;
          state.root = state.layoutHistory[state.historyIndex];
        }
      });
    },

    redo: () => {
      set((state) => {
        if (state.historyIndex < state.layoutHistory.length - 1) {
          state.historyIndex++;
          state.root = state.layoutHistory[state.historyIndex];
        }
      });
    },

    saveToHistory: () => {
      set((state) => {
        const currentLayout = JSON.parse(JSON.stringify(state.root));
        state.layoutHistory = state.layoutHistory.slice(0, state.historyIndex + 1);
        state.layoutHistory.push(currentLayout);
        state.historyIndex++;
        
        // Limit history size
        if (state.layoutHistory.length > 50) {
          state.layoutHistory.shift();
          state.historyIndex--;
        }
      });
    },

    // Persistence
    saveLayout: () => {
      const state = get();
      const layoutData = {
        root: state.root,
        floatingPanes: Array.from(state.floatingPanes.entries()),
        activePane: state.activePane,
        maximizedPane: state.maximizedPane,
      };
      localStorage.setItem('splits-layout', JSON.stringify(layoutData));
    },

    loadLayout: (layoutStr) => {
      try {
        const layoutData = layoutStr 
          ? JSON.parse(layoutStr)
          : JSON.parse(localStorage.getItem('splits-layout') || '{}');
        
        set((state) => {
          state.root = layoutData.root || DEFAULT_LAYOUT;
          state.floatingPanes = new Map(layoutData.floatingPanes || []);
          state.activePane = layoutData.activePane || null;
          state.maximizedPane = layoutData.maximizedPane || null;
          state.layoutHistory = [state.root];
          state.historyIndex = 0;
        });
      } catch (error) {
        console.error('Failed to load layout:', error);
        get().resetLayout();
      }
    },

    resetLayout: () => {
      get().initializeLayout(DEFAULT_LAYOUT);
    },

    // Utilities
    findNode: (nodeId, node) => {
      return findNodeRecursive(nodeId, node || get().root);
    },

    findParentSplit: (nodeId, node) => {
      return findParentSplitRecursive(nodeId, node || get().root);
    },

    generatePaneId: () => {
      return `pane-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    generateTabId: () => {
      return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    calculateDropZone: (paneId, position) => {
      // This would calculate which drop zone based on position relative to pane
      // For now, return a simple zone based on quadrants
      const element = document.getElementById(paneId);
      if (!element) return null;
      
      const rect = element.getBoundingClientRect();
      const x = position.x - rect.left;
      const y = position.y - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      // Check if in header area (top 40px)
      if (y < 40) return 'header';
      
      // Check distance from center
      const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const minRadius = 50; // 50px minimum drag radius
      
      if (distFromCenter < minRadius) return 'center';
      
      // Calculate angle to determine zone
      const angle = Math.atan2(y - centerY, x - centerX);
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      
      // Use conical sections for ergonomic zones
      if (normalizedAngle < Math.PI / 4 || normalizedAngle > 7 * Math.PI / 4) {
        return 'right';
      } else if (normalizedAngle < 3 * Math.PI / 4) {
        return 'bottom';
      } else if (normalizedAngle < 5 * Math.PI / 4) {
        return 'left';
      } else {
        return 'top';
      }
    },
  }))
);

export default useSplitsStore;