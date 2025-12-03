import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="mobile-slide-panel-backdrop"
          />
          
          <motion.div
            className={cn(
              'fixed inset-y-0 right-0 w-full max-w-md bg-[#1e1e1e] z-50 flex flex-col shadow-2xl',
              className
            )}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            data-testid="mobile-slide-panel"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#3e3e42]">
              <h2 className="font-semibold text-white text-lg" data-testid="mobile-slide-panel-title">
                {title}
              </h2>
              <Button
                size="sm"
                variant="ghost"
                className="h-10 w-10 p-0 hover:bg-[#3e3e42] touch-manipulation"
                onClick={onClose}
                data-testid="mobile-slide-panel-close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
