/**
 * Enhanced Mobile IDE View with Design System Integration
 * This wrapper adds IDEProvider, Command Palette, and global features
 */

import React from 'react';
import { MobileIDEView as BaseMobileIDEView } from './MobileIDEView';
import type { MobileTab } from './MobileIDEView';
import { IDEProvider } from '@/components/providers/IDEProvider';

interface EnhancedMobileIDEViewProps {
  projectId: string | number;
  className?: string;
}

/**
 * Enhanced Mobile IDE View with Design System Integration
 *
 * Wraps the base MobileIDEView with IDEProvider to add:
 * - ✅ Toast notifications (useToast hook)
 * - ✅ Command Palette (Cmd+K or Ctrl+K)
 * - ✅ Keyboard Shortcuts (Press '?')
 * - ✅ Settings Panel (Cmd+, or Ctrl+,)
 * - ✅ Theme management (light/dark/auto)
 * - ✅ Global IDE event system
 *
 * @example
 * ```tsx
 * <EnhancedMobileIDEView projectId="123" />
 * ```
 */
export function EnhancedMobileIDEView(props: EnhancedMobileIDEViewProps) {
  return (
    <IDEProvider projectId={String(props.projectId)}>
      <BaseMobileIDEView {...props} />
    </IDEProvider>
  );
}

// Re-export types
export type { MobileTab };

// Export enhanced version as default
export default EnhancedMobileIDEView;
