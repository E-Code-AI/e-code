/**
 * Hooks Index
 * Central export point for all React hooks
 */

// Responsive & Device Detection
export {
  useResponsive,
  useMediaQuery,
  useIsMobile,
  useIsTablet as useIsTabletBreakpoint,
  useIsDesktop,
  useIsTouch,
  useIsPointer,
  type ResponsiveState,
} from './useResponsive';

// Tablet-Specific Hooks
export {
  useTablet,
  useIsTablet,
  useIsIPad,
  useIsIPadPro,
  useTabletLayout,
  useTabletOrientation,
  type UseTabletReturn,
} from './use-tablet';

// Mobile Persistence
export {
  useTabPersistence,
  useFileBrowserPersistence,
  useEditorScrollPersistence,
  useTerminalHistoryPersistence,
  useMobileIDEPersistence,
} from './use-mobile-persistence';

// Other Hooks
export { useToast } from './use-toast';

// AI Code Actions Hook (Monaco Editor Integration)
export { useAICodeActions } from './use-ai-code-actions';
