/**
 * Tablet Components Index
 * Central export point for tablet-optimized UI components
 * 
 * tablet-9: Default export is lazy-loaded for code splitting
 */

// Lazy-loaded version (default for code splitting)
export { LazyTabletIDEView } from './LazyTabletIDEView';

// Direct import (for types and edge cases)
export { TabletIDEView } from './TabletIDEView';
export { TabletDrawerContent } from './TabletDrawerContent';
export type { TabletPanel } from './TabletIDEView';

// Re-export lazy version as default
export { LazyTabletIDEView as default } from './LazyTabletIDEView';
