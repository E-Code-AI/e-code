import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from 'framer-motion';

export const motionPatterns = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  },
  slideUp: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: { duration: 0.2, ease: [0.2, 0, 0, 1] },
  },
  scale: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.18 },
  },
} as const;

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

export function MotionDiv(props: HTMLMotionProps<'div'>) {
  const reduced = useReducedMotion();
  return <motion.div {...(reduced ? {} : motionPatterns.slideUp)} {...props} />;
}

export { motion };
