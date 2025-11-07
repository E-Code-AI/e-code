export { SplitsLayout } from './SplitsLayout';
export { SplitsPane } from './SplitsPane';
export { SplitsResizeHandle } from './SplitsResizeHandle';
export { FloatingPane } from './FloatingPane';
export { DragOverlayContent } from './DragOverlayContent';
export { SplitsEditorLayout } from './SplitsEditorLayout';

export { useSplitsDnd } from '@/hooks/use-splits-dnd';
export { default as useSplitsStore } from '@/stores/splits-store';

export type {
  LayoutNode,
  Split,
  PaneGroup,
  TabInfo,
  FloatingPane as FloatingPaneType,
  DragItem,
  DropTarget,
  DropZone,
  PaneType,
  DragState,
  ResizeState,
  LayoutState,
  LayoutOperations,
} from '@/types/splits';

export {
  isSplit,
  isPaneGroup,
  DEFAULT_LAYOUT,
} from '@/types/splits';