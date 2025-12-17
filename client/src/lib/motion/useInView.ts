/**
 * useInView - Intersection Observer hook for scroll-triggered animations
 * 
 * Fortune 500-grade implementation that:
 * - Uses native Intersection Observer (no JS animation overhead)
 * - Respects prefers-reduced-motion accessibility preference
 * - Supports "once" option to trigger only once
 * - Properly cleans up on unmount
 */

import { useRef, useState, useEffect } from 'react';

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

interface UseInViewResult {
  ref: React.RefObject<HTMLDivElement>;
  isInView: boolean;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useInView({
  threshold = 0.1,
  rootMargin = '0px',
  once = true
}: UseInViewOptions = {}): UseInViewResult {
  const ref = useRef<HTMLDivElement>(null);
  // Start with true to prevent content from being invisible on initial render
  // This ensures content is always visible, then animations trigger as expected
  const [isInView, setIsInView] = useState(true);
  const hasTriggered = useRef(false);
  const observerSetup = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setIsInView(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    if (once && hasTriggered.current) return;

    // Check if IntersectionObserver is supported
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: keep content visible
      setIsInView(true);
      return;
    }

    // Reset to false briefly to allow animation, but only after mount
    // This prevents flash of invisible content
    if (!observerSetup.current) {
      observerSetup.current = true;
      // Small delay to ensure smooth animation
      requestAnimationFrame(() => {
        setIsInView(false);
        // Immediately check if element is already in viewport
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (isVisible) {
          // Element is already in viewport, trigger animation
          setTimeout(() => {
            setIsInView(true);
            hasTriggered.current = true;
          }, 50);
        }
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          hasTriggered.current = true;
          if (once) {
            observer.unobserve(element);
          }
        } else if (!once) {
          setIsInView(false);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, once]);

  return { ref, isInView };
}
