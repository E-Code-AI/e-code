import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

// Lazy load Mobile Code Editor and Monaco
const MobileCodeEditor = lazy(() => 
  import('monaco-editor').then(() => 
    import('./MobileCodeEditor').then(module => ({
      default: module.MobileCodeEditor
    }))
  )
);

interface LazyMobileCodeEditorProps {
  fileId?: number;
  projectId: string | number; // Support both UUID strings and numeric IDs
  initialContent?: string;
  initialLanguage?: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
  className?: string;
}

// Mobile-optimized loading skeleton
const MobileEditorSkeleton = () => (
  <motion.div 
    className="flex flex-col h-full w-full bg-[#1e1e1e]"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    data-testid="mobile-editor-skeleton"
  >
    {/* Mobile Toolbar Skeleton */}
    <div className="h-12 bg-[#2d2d2d] border-b border-[#3e3e42] px-3 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-7 w-7 rounded bg-[#3e3e42]" />
        <Skeleton className="h-7 w-7 rounded bg-[#3e3e42]" />
      </div>
      <Skeleton className="h-6 w-16 rounded bg-[#3e3e42]" />
    </div>

    {/* Code Lines Skeleton */}
    <div className="flex-1 p-4 space-y-2 overflow-hidden">
      <div className="flex space-x-3">
        <Skeleton className="h-4 w-8 bg-[#3e3e42]" />
        <Skeleton className="h-4 w-48 bg-[#3e3e42]" />
      </div>
      <div className="flex space-x-3">
        <Skeleton className="h-4 w-8 bg-[#3e3e42]" />
        <Skeleton className="h-4 w-64 bg-[#3e3e42]" />
      </div>
      <div className="flex space-x-3">
        <Skeleton className="h-4 w-8 bg-[#3e3e42]" />
        <Skeleton className="h-4 w-40 bg-[#3e3e42]" />
      </div>
      <div className="flex space-x-3">
        <Skeleton className="h-4 w-8 bg-[#3e3e42]" />
        <Skeleton className="h-4 w-56 bg-[#3e3e42]" />
      </div>
      <div className="flex space-x-3">
        <Skeleton className="h-4 w-8 bg-[#3e3e42]" />
        <Skeleton className="h-4 w-72 bg-[#3e3e42]" />
      </div>
      <div className="flex space-x-3">
        <Skeleton className="h-4 w-8 bg-[#3e3e42]" />
        <Skeleton className="h-4 w-44 bg-[#3e3e42]" />
      </div>
    </div>

    {/* Mobile Keyboard Toolbar Skeleton */}
    <div className="h-12 bg-[#2d2d2d] border-t border-[#3e3e42] px-3 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-8 w-12 rounded bg-[#3e3e42]" />
        <Skeleton className="h-8 w-12 rounded bg-[#3e3e42]" />
        <Skeleton className="h-8 w-12 rounded bg-[#3e3e42]" />
      </div>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-8 w-8 rounded bg-[#3e3e42]" />
        <Skeleton className="h-8 w-8 rounded bg-[#3e3e42]" />
      </div>
    </div>
  </motion.div>
);

export function LazyMobileCodeEditor(props: LazyMobileCodeEditorProps) {
  return (
    <Suspense fallback={<MobileEditorSkeleton />}>
      <MobileCodeEditor {...props} />
    </Suspense>
  );
}
