/**
 * OptimizedMotionProvider - Fortune 500-Grade Animation Provider
 * 
 * CRITICAL FIX: No Suspense blocking - renders children immediately
 * LazyMotion loads in background without blocking initial render.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';

interface MotionContextType {
  isReady: boolean;
  isReducedMotion: boolean;
}

const MotionContext = createContext<MotionContextType>({
  isReady: true,
  isReducedMotion: false
});

export function useMotionReady() {
  return useContext(MotionContext);
}

interface OptimizedMotionProviderProps {
  children: ReactNode;
}

export function OptimizedMotionProvider({ children }: OptimizedMotionProviderProps) {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof globalThis.matchMedia !== 'function') {
      return;
    }
    
    const mediaQuery = globalThis.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, []);

  if (isReducedMotion) {
    return (
      <MotionContext.Provider value={{ isReady: true, isReducedMotion: true }}>
        {children}
      </MotionContext.Provider>
    );
  }

  return (
    <MotionContext.Provider value={{ isReady: true, isReducedMotion: false }}>
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionContext.Provider>
  );
}
