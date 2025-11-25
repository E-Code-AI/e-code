import { Suspense, lazy, ComponentType } from "react";
import { useLocation } from "wouter";
import { ECodeLoading } from "@/components/ECodeLoading";

const MotionWrapper = lazy(() =>
  import("framer-motion").then((mod) => ({
    default: ({ children, location }: { children: React.ReactNode; location: string }) => (
      <mod.AnimatePresence mode="wait">
        <mod.motion.div
          key={location}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {children}
        </mod.motion.div>
      </mod.AnimatePresence>
    ),
  }))
);

interface LazyAnimatedRoutesProps {
  children: React.ReactNode;
}

export function LazyAnimatedRoutes({ children }: LazyAnimatedRoutesProps) {
  const [location] = useLocation();
  
  return (
    <Suspense fallback={<div className="min-h-screen">{children}</div>}>
      <MotionWrapper location={location}>{children}</MotionWrapper>
    </Suspense>
  );
}
