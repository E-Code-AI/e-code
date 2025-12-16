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
import { CSSFade } from './CSSAnimations';

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
