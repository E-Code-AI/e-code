import { useState, useEffect } from 'react';

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

// Canonical breakpoints per replit.md architecture
// Mobile: ≤640px, Tablet: 641-1024px, Laptop: 1025-1440px, Desktop: >1440px
export const useIsMobile = () => useMediaQuery('(max-width: 640px)');
export const useIsTablet = () => useMediaQuery('(min-width: 641px) and (max-width: 1024px)');
export const useIsLaptop = () => useMediaQuery('(min-width: 1025px) and (max-width: 1440px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1441px)');

// Combined helper for tablet detection (includes both iPad Pro sizes)
export const useIsTabletOrLaptop = () => useMediaQuery('(min-width: 641px) and (max-width: 1440px)');

// Device type discriminator for routing decisions
export type DeviceType = 'mobile' | 'tablet' | 'laptop' | 'desktop';

export function useDeviceType(): DeviceType {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isLaptop = useIsLaptop();
  
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  if (isLaptop) return 'laptop';
  return 'desktop';
}