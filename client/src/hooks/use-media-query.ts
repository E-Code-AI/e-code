import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// Standardized breakpoints following Tailwind/modern practices
export const BREAKPOINTS = {
  sm: 640,   // Small devices (phones)
  md: 768,   // Medium devices (tablets)
  lg: 1024,  // Large devices (desktops)
  xl: 1280,  // Extra large devices
  '2xl': 1536 // 2K displays
} as const;

// Predefined responsive hooks
export const useIsMobile = () => useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
export const useIsTablet = () => useMediaQuery(`(min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`);
export const useIsDesktop = () => useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);

// Additional responsive utilities
export const useIsSmallMobile = () => useMediaQuery(`(max-width: ${BREAKPOINTS.sm - 1}px)`);
export const useIsLargeDesktop = () => useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);
export const useIsPortrait = () => useMediaQuery('(orientation: portrait)');
export const useIsLandscape = () => useMediaQuery('(orientation: landscape)');

// Touch device detection
export const useIsTouchDevice = () => useMediaQuery('(hover: none) and (pointer: coarse)');

// Reduced motion preference
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');