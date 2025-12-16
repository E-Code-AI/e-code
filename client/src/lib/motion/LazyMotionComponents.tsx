/**
 * LazyMotionComponents - Code-split motion components with CSS fallback
 * 
 * These components lazy-load framer-motion only when needed,
 * preventing the 40KB bundle from blocking initial page load.
 * 
 * When AnimationMonitor detects frame drops, components automatically
 * fall back to CSS transitions for better performance.
 */

import { lazy, Suspense, ReactNode, forwardRef } from 'react';
import type { HTMLMotionProps, AnimatePresenceProps } from 'framer-motion';
import { useAnimationPerformance } from './AnimationMonitor';
import { CSSFade, CSSInViewFade, CSSInViewSlide, CSSInViewScale } from './CSSAnimations';

function detectInViewAnimationType(whileInView: Record<string, unknown> | undefined): 'fade' | 'slide' | 'scale' | null {
  if (!whileInView) return null;
  if ('scale' in whileInView) return 'scale';
  if ('y' in whileInView) return 'slide';
  if ('x' in whileInView) return 'slide';
  if ('opacity' in whileInView) return 'fade';
  return null;
}

function getSlideDirection(initial: Record<string, unknown> | undefined): 'up' | 'down' | 'left' | 'right' {
  if (!initial) return 'up';
  const y = initial.y as number | undefined;
  const x = initial.x as number | undefined;
  if (typeof y === 'number') return y > 0 ? 'up' : 'down';
  if (typeof x === 'number') return x > 0 ? 'left' : 'right';
  return 'up';
}

type MotionDivProps = HTMLMotionProps<'div'>;
type MotionButtonProps = HTMLMotionProps<'button'>;
type MotionSpanProps = HTMLMotionProps<'span'>;
type MotionUlProps = HTMLMotionProps<'ul'>;
type MotionLiProps = HTMLMotionProps<'li'>;

const LazyMotionDivInner = lazy(() =>
  import('framer-motion').then(mod => ({
    default: forwardRef<HTMLDivElement, MotionDivProps>((props, ref) => (
      <mod.m.div ref={ref} {...props} />
    ))
  }))
);

export const LazyMotionDiv = forwardRef<HTMLDivElement, MotionDivProps>(({ className, children, ...props }, ref) => {
  let shouldUseCSS = false;
  try {
    const perf = useAnimationPerformance();
    shouldUseCSS = perf.shouldUseCSS;
  } catch {
    // Context not available, use default behavior
  }
  
  if (shouldUseCSS) {
    const whileInView = props.whileInView as Record<string, unknown> | undefined;
    const initial = props.initial as Record<string, unknown> | undefined;
    const viewport = props.viewport as { once?: boolean } | undefined;
    const animationType = detectInViewAnimationType(whileInView);
    
    if (whileInView && animationType) {
      const once = viewport?.once ?? true;
      
      switch (animationType) {
        case 'scale':
          return (
            <CSSInViewScale className={className} once={once} ref={ref}>
              {children as ReactNode}
            </CSSInViewScale>
          );
        case 'slide':
          return (
            <CSSInViewSlide 
              className={className} 
              direction={getSlideDirection(initial)} 
              once={once}
              ref={ref}
            >
              {children as ReactNode}
            </CSSInViewSlide>
          );
        case 'fade':
        default:
          return (
            <CSSInViewFade className={className} once={once} ref={ref}>
              {children as ReactNode}
            </CSSInViewFade>
          );
      }
    }
    
    return (
      <CSSFade show={true} className={className}>
        {children as ReactNode}
      </CSSFade>
    );
  }
  
  return (
    <Suspense fallback={<div className={className}>{children as ReactNode}</div>}>
      <LazyMotionDivInner className={className} {...props} ref={ref}>
        {children}
      </LazyMotionDivInner>
    </Suspense>
  );
});
LazyMotionDiv.displayName = 'LazyMotionDiv';

const LazyMotionButtonInner = lazy(() =>
  import('framer-motion').then(mod => ({
    default: forwardRef<HTMLButtonElement, MotionButtonProps>((props, ref) => (
      <mod.m.button ref={ref} {...props} />
    ))
  }))
);

export const LazyMotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(({ className, children, ...props }, ref) => {
  let shouldUseCSS = false;
  try {
    const perf = useAnimationPerformance();
    shouldUseCSS = perf.shouldUseCSS;
  } catch {
    // Context not available
  }
  
  if (shouldUseCSS) {
    return (
      <button className={className} ref={ref}>
        {children as ReactNode}
      </button>
    );
  }
  
  return (
    <Suspense fallback={<button className={className}>{children as ReactNode}</button>}>
      <LazyMotionButtonInner className={className} {...props} ref={ref}>
        {children}
      </LazyMotionButtonInner>
    </Suspense>
  );
});
LazyMotionButton.displayName = 'LazyMotionButton';

const LazyMotionSpanInner = lazy(() =>
  import('framer-motion').then(mod => ({
    default: forwardRef<HTMLSpanElement, MotionSpanProps>((props, ref) => (
      <mod.m.span ref={ref} {...props} />
    ))
  }))
);

export const LazyMotionSpan = forwardRef<HTMLSpanElement, MotionSpanProps>(({ className, children, ...props }, ref) => {
  let shouldUseCSS = false;
  try {
    const perf = useAnimationPerformance();
    shouldUseCSS = perf.shouldUseCSS;
  } catch {
    // Context not available
  }
  
  if (shouldUseCSS) {
    return (
      <span className={className}>
        {children as ReactNode}
      </span>
    );
  }
  
  return (
    <Suspense fallback={<span className={className}>{children as ReactNode}</span>}>
      <LazyMotionSpanInner className={className} {...props} ref={ref}>
        {children}
      </LazyMotionSpanInner>
    </Suspense>
  );
});
LazyMotionSpan.displayName = 'LazyMotionSpan';

const LazyMotionUlInner = lazy(() =>
  import('framer-motion').then(mod => ({
    default: forwardRef<HTMLUListElement, MotionUlProps>((props, ref) => (
      <mod.m.ul ref={ref} {...props} />
    ))
  }))
);

export const LazyMotionUl = forwardRef<HTMLUListElement, MotionUlProps>(({ className, children, ...props }, ref) => {
  let shouldUseCSS = false;
  try {
    const perf = useAnimationPerformance();
    shouldUseCSS = perf.shouldUseCSS;
  } catch {
    // Context not available
  }
  
  if (shouldUseCSS) {
    return (
      <ul className={className}>
        {children as ReactNode}
      </ul>
    );
  }
  
  return (
    <Suspense fallback={<ul className={className}>{children as ReactNode}</ul>}>
      <LazyMotionUlInner className={className} {...props} ref={ref}>
        {children}
      </LazyMotionUlInner>
    </Suspense>
  );
});
LazyMotionUl.displayName = 'LazyMotionUl';

const LazyMotionLiInner = lazy(() =>
  import('framer-motion').then(mod => ({
    default: forwardRef<HTMLLIElement, MotionLiProps>((props, ref) => (
      <mod.m.li ref={ref} {...props} />
    ))
  }))
);

export const LazyMotionLi = forwardRef<HTMLLIElement, MotionLiProps>(({ className, children, ...props }, ref) => {
  let shouldUseCSS = false;
  try {
    const perf = useAnimationPerformance();
    shouldUseCSS = perf.shouldUseCSS;
  } catch {
    // Context not available
  }
  
  if (shouldUseCSS) {
    return (
      <li className={className}>
        {children as ReactNode}
      </li>
    );
  }
  
  return (
    <Suspense fallback={<li className={className}>{children as ReactNode}</li>}>
      <LazyMotionLiInner className={className} {...props} ref={ref}>
        {children}
      </LazyMotionLiInner>
    </Suspense>
  );
});
LazyMotionLi.displayName = 'LazyMotionLi';

const LazyAnimatePresenceComponent = lazy(() =>
  import('framer-motion').then(mod => ({
    default: mod.AnimatePresence
  }))
);

export function LazyAnimatePresence({ children, ...props }: AnimatePresenceProps & { children: ReactNode }) {
  let shouldUseCSS = false;
  try {
    const perf = useAnimationPerformance();
    shouldUseCSS = perf.shouldUseCSS;
  } catch {
    // Context not available
  }
  
  if (shouldUseCSS) {
    return <>{children}</>;
  }
  
  return (
    <Suspense fallback={<>{children}</>}>
      <LazyAnimatePresenceComponent {...props}>
        {children}
      </LazyAnimatePresenceComponent>
    </Suspense>
  );
}

const LazyM = lazy(() =>
  import('framer-motion').then(mod => ({
    default: mod.m
  }))
);

export { LazyM as m };
