import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useReducedMotion, SPRING_CONFIG, getReducedMotionTransition, DURATION_CONFIG } from '@/hooks/use-reduced-motion';

interface MobileSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function MobileSlidePanel({ 
  isOpen, 
  onClose, 
  title, 
  children,
  className 
}: MobileSlidePanelProps) {
  const prefersReducedMotion = useReducedMotion();

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const panelVariants = prefersReducedMotion 
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { x: '100%', opacity: 0.8 },
        visible: { x: 0, opacity: 1 },
      };

  const headerVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, y: -10 },
        visible: { opacity: 1, y: 0 },
      };

  const contentVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0 },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-background z-50"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: prefersReducedMotion ? 0.01 : DURATION_CONFIG.normal }}
            onClick={onClose}
            data-testid="mobile-slide-panel-backdrop"
          />
          
          <motion.div
            className={cn(
              'fixed inset-y-0 right-0 w-full max-w-md bg-background dark:bg-[var(--ecode-background)] z-50 flex flex-col shadow-2xl',
              className
            )}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={getReducedMotionTransition(prefersReducedMotion, SPRING_CONFIG.default)}
            data-testid="mobile-slide-panel"
          >
            <motion.div 
              className="flex items-center justify-between px-4 py-3 border-b border-border"
              variants={headerVariants}
              initial="hidden"
              animate="visible"
              transition={{ 
                ...getReducedMotionTransition(prefersReducedMotion, SPRING_CONFIG.default),
                delay: prefersReducedMotion ? 0 : 0.1 
              }}
            >
              <h2 className="font-semibold text-foreground text-lg" data-testid="mobile-slide-panel-title">
                {title}
              </h2>
              <Button
                size="sm"
                variant="ghost"
                className="h-10 w-10 p-0 hover:bg-muted touch-manipulation"
                onClick={onClose}
                data-testid="mobile-slide-panel-close"
              >
                <X className="h-5 w-5" />
              </Button>
            </motion.div>
            
            <motion.div 
              className="flex-1 overflow-hidden"
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              transition={{ 
                ...getReducedMotionTransition(prefersReducedMotion, SPRING_CONFIG.gentle),
                delay: prefersReducedMotion ? 0 : 0.15 
              }}
            >
              {children}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
