/**
 * useResponsive Hook
 * React hook for responsive breakpoint detection with Replit parity
 */

import { useState, useEffect } from 'react';
import {
  DeviceType,
  DeviceCapabilities,
  getDeviceType,
  getDeviceCapabilities,
  BREAKPOINTS,
  MEDIA_QUERIES,
} from '@/../../shared/responsive-config';

export interface ResponsiveState {
  deviceType: DeviceType;
  capabilities: DeviceCapabilities;
  isMobile: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  hasTouch: boolean;
  hasKeyboard: boolean;
  width: number;
  height: number;
}

export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    const deviceType = getDeviceType();
    const capabilities = getDeviceCapabilities();
    
    return {
      deviceType,
      capabilities,
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isLaptop: deviceType === 'laptop',
      isDesktop: deviceType === 'desktop',
      isPortrait: capabilities.orientation === 'portrait',
      isLandscape: capabilities.orientation === 'landscape',
      hasTouch: capabilities.hasTouch,
      hasKeyboard: capabilities.hasKeyboard,
      width: typeof window !== 'undefined' ? window.innerWidth : 1280,
      height: typeof window !== 'undefined' ? window.innerHeight : 720,
    };
  });

  useEffect(() => {
    const updateState = () => {
      const deviceType = getDeviceType();
      const capabilities = getDeviceCapabilities();
      
      setState({
        deviceType,
        capabilities,
        isMobile: deviceType === 'mobile',
        isTablet: deviceType === 'tablet',
        isLaptop: deviceType === 'laptop',
        isDesktop: deviceType === 'desktop',
        isPortrait: capabilities.orientation === 'portrait',
        isLandscape: capabilities.orientation === 'landscape',
        hasTouch: capabilities.hasTouch,
        hasKeyboard: capabilities.hasKeyboard,
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Listen for resize and orientation changes
    window.addEventListener('resize', updateState);
    window.addEventListener('orientationchange', updateState);

    // Update on mount
    updateState();

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
    };
  }, []);

  return state;
}

// Media query hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia(query);
    const handleChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    
    // Legacy browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [query]);

  return matches;
}

// Convenience hooks for common breakpoints
export function useIsMobile(): boolean {
  return useMediaQuery(MEDIA_QUERIES.mobile);
}

export function useIsTablet(): boolean {
  return useMediaQuery(MEDIA_QUERIES.tablet);
}

export function useIsDesktop(): boolean {
  return useMediaQuery(MEDIA_QUERIES.desktop);
}

export function useIsTouch(): boolean {
  return useMediaQuery(MEDIA_QUERIES.touch);
}

export function useIsPointer(): boolean {
  return useMediaQuery(MEDIA_QUERIES.pointer);
}
