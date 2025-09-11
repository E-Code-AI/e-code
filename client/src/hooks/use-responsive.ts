import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface ResponsiveContextType {
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  isTouch: boolean;
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function ResponsiveBreakpointProvider({ children }: { children: ReactNode }) {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    // Detect touch capability
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      // Delay to get accurate dimensions after orientation change
      setTimeout(handleResize, 100);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const getBreakpoint = (width: number): Breakpoint => {
    if (width >= breakpoints['2xl']) return '2xl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    return 'xs';
  };

  const breakpoint = getBreakpoint(dimensions.width);
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
  const isTablet = breakpoint === 'md';
  const isDesktop = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl';
  const orientation = dimensions.width > dimensions.height ? 'landscape' : 'portrait';

  const value: ResponsiveContextType = {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    width: dimensions.width,
    height: dimensions.height,
    orientation,
    isTouch,
  };

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsive() {
  const context = useContext(ResponsiveContext);
  if (context === undefined) {
    throw new Error('useResponsive must be used within a ResponsiveBreakpointProvider');
  }
  return context;
}

// Utility hooks for common use cases
export function useIsMobile() {
  const { isMobile } = useResponsive();
  return isMobile;
}

export function useIsTablet() {
  const { isTablet } = useResponsive();
  return isTablet;
}

export function useIsDesktop() {
  const { isDesktop } = useResponsive();
  return isDesktop;
}

export function useBreakpoint() {
  const { breakpoint } = useResponsive();
  return breakpoint;
}

export function useOrientation() {
  const { orientation } = useResponsive();
  return orientation;
}

export function useIsTouch() {
  const { isTouch } = useResponsive();
  return isTouch;
}

// Utility function to check if current breakpoint matches
export function useBreakpointUp(targetBreakpoint: Breakpoint) {
  const { width } = useResponsive();
  return width >= breakpoints[targetBreakpoint];
}

export function useBreakpointDown(targetBreakpoint: Breakpoint) {
  const { width } = useResponsive();
  return width < breakpoints[targetBreakpoint];
}

// Media query hook
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}