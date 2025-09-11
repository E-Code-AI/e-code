import { useState, useEffect } from 'react';

/**
 * Generic media query hook - still useful for custom queries.
 * For standard responsive breakpoints, consider using `useBreakpoint()` from './use-breakpoint'
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [matches, query]);

  return matches;
}

// Predefined breakpoints
/**
 * @deprecated Use `useBreakpoint().isMobile` for more comprehensive responsive logic.
 */
export const useIsMobile = () => useMediaQuery('(max-width: 640px)');

/**
 * @deprecated Use `useBreakpoint().isTablet` for more comprehensive responsive logic.  
 */
export const useIsTablet = () => useMediaQuery('(max-width: 768px)');

/**
 * @deprecated Use `useBreakpoint().isDesktop` for more comprehensive responsive logic.
 */
export const useIsDesktop = () => useMediaQuery('(min-width: 769px)');