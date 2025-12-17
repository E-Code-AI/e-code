/**
 * Haptic Feedback Service
 * Fortune 500-grade tactile feedback for mobile interactions
 * 
 * Usage:
 *   import { haptics } from './services/haptics';
 *   haptics.impact();        // Medium impact (default)
 *   haptics.light();         // Light tap
 *   haptics.success();       // Success notification
 *   haptics.warning();       // Warning notification
 *   haptics.error();         // Error notification
 *   haptics.selection();     // Selection change
 */

import { Platform } from 'react-native';

// Type definitions for expo-haptics (lazy loaded)
type ImpactFeedbackStyle = 'light' | 'medium' | 'heavy';
type NotificationFeedbackType = 'success' | 'warning' | 'error';

interface HapticsModule {
  impactAsync: (style: ImpactFeedbackStyle) => Promise<void>;
  notificationAsync: (type: NotificationFeedbackType) => Promise<void>;
  selectionAsync: () => Promise<void>;
}

// Lazy-load expo-haptics to handle cases where it's not installed
let Haptics: HapticsModule | null = null;
let hapticLoadAttempted = false;

async function loadHaptics(): Promise<HapticsModule | null> {
  if (hapticLoadAttempted) return Haptics;
  hapticLoadAttempted = true;
  
  try {
    // Dynamic import to avoid crash if not installed
    const module = await import('expo-haptics');
    Haptics = {
      impactAsync: (style: ImpactFeedbackStyle) => {
        const styleMap = {
          light: module.ImpactFeedbackStyle.Light,
          medium: module.ImpactFeedbackStyle.Medium,
          heavy: module.ImpactFeedbackStyle.Heavy,
        };
        return module.impactAsync(styleMap[style]);
      },
      notificationAsync: (type: NotificationFeedbackType) => {
        const typeMap = {
          success: module.NotificationFeedbackType.Success,
          warning: module.NotificationFeedbackType.Warning,
          error: module.NotificationFeedbackType.Error,
        };
        return module.notificationAsync(typeMap[type]);
      },
      selectionAsync: module.selectionAsync,
    };
    console.log('[Haptics] Service initialized');
    return Haptics;
  } catch (error) {
    console.warn('[Haptics] expo-haptics not available, haptic feedback disabled');
    return null;
  }
}

// Pre-load haptics on module import
loadHaptics();

/**
 * Safe haptic feedback wrapper
 * Falls back silently if haptics unavailable
 */
async function safeHaptic(action: (h: HapticsModule) => Promise<void>): Promise<void> {
  // Haptics only work on physical iOS devices (not simulator, not Android emulator)
  if (Platform.OS !== 'ios') {
    // Android has limited haptic support, skip for now
    return;
  }
  
  try {
    const h = await loadHaptics();
    if (h) {
      await action(h);
    }
  } catch (error) {
    // Silently fail - haptics are nice-to-have, not critical
  }
}

/**
 * Haptic Feedback API
 */
export const haptics = {
  /**
   * Light impact - subtle tap
   * Use for: toggles, checkboxes, minor selections
   */
  light: () => safeHaptic(h => h.impactAsync('light')),
  
  /**
   * Medium impact - standard tap (default)
   * Use for: button presses, tab switches, card selections
   */
  impact: () => safeHaptic(h => h.impactAsync('medium')),
  medium: () => safeHaptic(h => h.impactAsync('medium')),
  
  /**
   * Heavy impact - strong tap
   * Use for: important actions, confirmations, drag drop
   */
  heavy: () => safeHaptic(h => h.impactAsync('heavy')),
  
  /**
   * Success notification
   * Use for: save complete, upload success, action confirmed
   */
  success: () => safeHaptic(h => h.notificationAsync('success')),
  
  /**
   * Warning notification
   * Use for: validation warnings, unsaved changes, approaching limits
   */
  warning: () => safeHaptic(h => h.notificationAsync('warning')),
  
  /**
   * Error notification
   * Use for: failed actions, validation errors, connection lost
   */
  error: () => safeHaptic(h => h.notificationAsync('error')),
  
  /**
   * Selection change
   * Use for: picker changes, slider movements, list reordering
   */
  selection: () => safeHaptic(h => h.selectionAsync()),
};

export default haptics;
