/**
 * useAnimationControls - Native replacement for framer-motion's useAnimation
 * 
 * Fortune 500-grade imperative animation control that:
 * - Uses Web Animations API (WAAPI) for GPU-accelerated animations
 * - Supports keyframe-based animations
 * - Respects prefers-reduced-motion
 * - Zero framer-motion dependency
 */

import { useRef, useCallback, useEffect } from 'react';

type AnimationTarget = Record<string, string | number>;

interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: string;
  fill?: FillMode;
}

interface AnimationControls {
  start: (target: AnimationTarget | string, config?: AnimationConfig) => Promise<void>;
  stop: () => void;
  set: (target: AnimationTarget) => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function targetToKeyframes(target: AnimationTarget): Keyframe[] {
  const keyframe: Keyframe = {};
  
  for (const [key, value] of Object.entries(target)) {
    switch (key) {
      case 'x':
        keyframe.transform = `translateX(${typeof value === 'number' ? `${value}px` : value})`;
        break;
      case 'y':
        keyframe.transform = `translateY(${typeof value === 'number' ? `${value}px` : value})`;
        break;
      case 'scale':
        keyframe.transform = `scale(${value})`;
        break;
      case 'rotate':
        keyframe.transform = `rotate(${typeof value === 'number' ? `${value}deg` : value})`;
        break;
      case 'opacity':
        keyframe.opacity = String(value);
        break;
      default:
        (keyframe as Record<string, string>)[key] = String(value);
    }
  }
  
  return [keyframe];
}

function applyStyles(element: HTMLElement, target: AnimationTarget) {
  for (const [key, value] of Object.entries(target)) {
    switch (key) {
      case 'x':
        element.style.transform = `translateX(${typeof value === 'number' ? `${value}px` : value})`;
        break;
      case 'y':
        element.style.transform = `translateY(${typeof value === 'number' ? `${value}px` : value})`;
        break;
      case 'scale':
        element.style.transform = `scale(${value})`;
        break;
      case 'rotate':
        element.style.transform = `rotate(${typeof value === 'number' ? `${value}deg` : value})`;
        break;
      case 'opacity':
        element.style.opacity = String(value);
        break;
      default:
        (element.style as unknown as Record<string, string>)[key] = String(value);
    }
  }
}

export function useAnimationControls(): AnimationControls & { ref: React.RefObject<HTMLElement> } {
  const elementRef = useRef<HTMLElement>(null);
  const animationsRef = useRef<Animation[]>([]);
  const variantsRef = useRef<Record<string, AnimationTarget>>({});

  const stop = useCallback(() => {
    animationsRef.current.forEach(animation => {
      animation.cancel();
    });
    animationsRef.current = [];
  }, []);

  const set = useCallback((target: AnimationTarget) => {
    const element = elementRef.current;
    if (!element) return;
    applyStyles(element, target);
  }, []);

  const start = useCallback(async (
    target: AnimationTarget | string,
    config: AnimationConfig = {}
  ): Promise<void> => {
    const element = elementRef.current;
    if (!element) return;

    const resolvedTarget = typeof target === 'string' 
      ? variantsRef.current[target] || {}
      : target;

    if (prefersReducedMotion()) {
      applyStyles(element, resolvedTarget);
      return;
    }

    const {
      duration = 300,
      delay = 0,
      easing = 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill = 'forwards'
    } = config;

    stop();

    const keyframes = targetToKeyframes(resolvedTarget);
    
    try {
      const animation = element.animate(keyframes, {
        duration,
        delay,
        easing,
        fill
      });

      animationsRef.current.push(animation);

      await animation.finished;
    } catch {
      applyStyles(element, resolvedTarget);
    }
  }, [stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    ref: elementRef as React.RefObject<HTMLElement>,
    start,
    stop,
    set
  };
}

export function createAnimationControls(
  variants?: Record<string, AnimationTarget>
): AnimationControls & { 
  mount: (element: HTMLElement) => void;
  unmount: () => void;
} {
  let element: HTMLElement | null = null;
  let animations: Animation[] = [];
  const storedVariants = variants || {};

  const stop = () => {
    animations.forEach(a => a.cancel());
    animations = [];
  };

  const set = (target: AnimationTarget) => {
    if (!element) return;
    applyStyles(element, target);
  };

  const start = async (
    target: AnimationTarget | string,
    config: AnimationConfig = {}
  ): Promise<void> => {
    if (!element) return;

    const resolvedTarget = typeof target === 'string'
      ? storedVariants[target] || {}
      : target;

    if (prefersReducedMotion()) {
      applyStyles(element, resolvedTarget);
      return;
    }

    const { duration = 300, delay = 0, easing = 'cubic-bezier(0.4, 0, 0.2, 1)', fill = 'forwards' } = config;

    stop();

    try {
      const animation = element.animate(targetToKeyframes(resolvedTarget), {
        duration,
        delay,
        easing,
        fill
      });
      animations.push(animation);
      await animation.finished;
    } catch {
      applyStyles(element, resolvedTarget);
    }
  };

  return {
    start,
    stop,
    set,
    mount: (el: HTMLElement) => { element = el; },
    unmount: () => { stop(); element = null; }
  };
}
