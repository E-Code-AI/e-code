import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

// Lazy load Tablet IDE View
const TabletIDEView = lazy(() => 
  import('./TabletIDEView').then(module => ({
    default: module.TabletIDEView
  }))
);

interface LazyTabletIDEViewProps {
  projectId: string; // UUID string from route params
  className?: string;
}

// Tablet-optimized loading skeleton
const TabletIDESkeleton = () => (
  <motion.div 
    className="flex h-full w-full bg-[#1e1e1e]"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    data-testid="tablet-ide-skeleton"
  >
    {/* Drawer Skeleton */}
    <div className="w-80 bg-[#252526] border-r border-[#3e3e42] hidden md:block">
      {/* Drawer Header */}
      <div className="h-14 bg-[#2d2d2d] border-b border-[#3e3e42] px-4 flex items-center justify-between">
        <Skeleton className="h-8 w-32 rounded bg-[#3e3e42]" />
        <Skeleton className="h-8 w-8 rounded bg-[#3e3e42]" />
      </div>

      {/* File Tree Skeleton */}
      <div className="p-4 space-y-3">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 bg-[#3e3e42]" />
          <Skeleton className="h-4 w-32 bg-[#3e3e42]" />
        </div>
        <div className="flex items-center space-x-2 pl-4">
          <Skeleton className="h-4 w-4 bg-[#3e3e42]" />
          <Skeleton className="h-4 w-40 bg-[#3e3e42]" />
        </div>
        <div className="flex items-center space-x-2 pl-4">
          <Skeleton className="h-4 w-4 bg-[#3e3e42]" />
          <Skeleton className="h-4 w-36 bg-[#3e3e42]" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 bg-[#3e3e42]" />
          <Skeleton className="h-4 w-28 bg-[#3e3e42]" />
        </div>
      </div>
    </div>

    {/* Main Content Skeleton */}
    <div className="flex-1 flex flex-col">
      {/* Toolbar Skeleton */}
      <div className="h-14 bg-[#2d2d2d] border-b border-[#3e3e42] px-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-8 w-8 rounded bg-[#3e3e42]" />
          <Skeleton className="h-6 w-48 rounded bg-[#3e3e42]" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-20 rounded bg-[#3e3e42]" />
          <Skeleton className="h-8 w-24 rounded bg-[#3e3e42]" />
        </div>
      </div>

      {/* Editor Panels Skeleton */}
      <div className="flex-1 flex">
        {/* Editor Panel Skeleton */}
        <div className="flex-1 bg-[#1e1e1e] p-4 space-y-2">
          <div className="flex space-x-3">
            <Skeleton className="h-4 w-8 bg-[#3e3e42]" />
            <Skeleton className="h-4 w-64 bg-[#3e3e42]" />
          </div>
          <div className="flex space-x-3">
            <Skeleton className="h-4 w-8 bg-[#3e3e42]" />
            <Skeleton className="h-4 w-80 bg-[#3e3e42]" />
          </div>
          <div className="flex space-x-3">
            <Skeleton className="h-4 w-8 bg-[#3e3e42]" />
            <Skeleton className="h-4 w-56 bg-[#3e3e42]" />
          </div>
          <div className="flex space-x-3">
            <Skeleton className="h-4 w-8 bg-[#3e3e42]" />
            <Skeleton className="h-4 w-72 bg-[#3e3e42]" />
          </div>
        </div>

        {/* Resize Handle Skeleton */}
        <div className="w-2 bg-[#2d2d2d]" />

        {/* Right Panel Skeleton */}
        <div className="w-[40%] bg-[#1e1e1e] hidden lg:block">
          <div className="h-12 bg-[#2d2d2d] border-b border-[#3e3e42] px-4 flex items-center space-x-2">
            <Skeleton className="h-8 w-24 rounded bg-[#3e3e42]" />
            <Skeleton className="h-8 w-24 rounded bg-[#3e3e42]" />
          </div>
          <div className="p-4">
            <Skeleton className="h-64 w-full rounded bg-[#3e3e42]" />
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

export function LazyTabletIDEView(props: LazyTabletIDEViewProps) {
  return (
    <Suspense fallback={<TabletIDESkeleton />}>
      <TabletIDEView {...props} />
    </Suspense>
  );
}
