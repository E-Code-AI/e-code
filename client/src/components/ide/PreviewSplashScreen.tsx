/**
 * PreviewSplashScreen - Shows "Preview will be available soon" during autonomous builds
 * 
 * Displays a beautiful animated splash screen in the Preview tab while
 * the autonomous agent is building the app
 */

import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Loader2, 
  Code, 
  Layers, 
  Paintbrush,
  Rocket,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreviewSplashScreenProps {
  phase?: 'planning' | 'scaffolding' | 'building' | 'styling' | 'finalizing' | 'complete';
  currentTask?: string;
  progress?: number;
  appName?: string;
  onComplete?: () => void;
}

const phaseConfig = {
  planning: {
    icon: Sparkles,
    title: 'Planning Your App',
    subtitle: 'Analyzing requirements and designing architecture...',
    color: 'text-purple-500',
    bgColor: 'from-purple-500/10 to-purple-600/5'
  },
  scaffolding: {
    icon: Layers,
    title: 'Setting Up Project',
    subtitle: 'Creating file structure and installing dependencies...',
    color: 'text-blue-500',
    bgColor: 'from-blue-500/10 to-blue-600/5'
  },
  building: {
    icon: Code,
    title: 'Building Components',
    subtitle: 'Writing code and implementing features...',
    color: 'text-green-500',
    bgColor: 'from-green-500/10 to-green-600/5'
  },
  styling: {
    icon: Paintbrush,
    title: 'Applying Styles',
    subtitle: 'Making everything look beautiful...',
    color: 'text-pink-500',
    bgColor: 'from-pink-500/10 to-pink-600/5'
  },
  finalizing: {
    icon: Rocket,
    title: 'Finalizing',
    subtitle: 'Running final checks and optimizations...',
    color: 'text-orange-500',
    bgColor: 'from-orange-500/10 to-orange-600/5'
  },
  complete: {
    icon: CheckCircle2,
    title: 'Ready!',
    subtitle: 'Your app is ready to preview',
    color: 'text-emerald-500',
    bgColor: 'from-emerald-500/10 to-emerald-600/5'
  }
};

export function PreviewSplashScreen({ 
  phase = 'planning',
  currentTask,
  progress = 0,
  appName
}: PreviewSplashScreenProps) {
  const config = phaseConfig[phase];
  const Icon = config.icon;
  const isComplete = phase === 'complete';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center",
        "bg-gradient-to-br",
        config.bgColor,
        "dark:from-zinc-900 dark:to-zinc-950"
      )}
      data-testid="preview-splash-screen"
    >
      <div className="flex flex-col items-center max-w-md px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className={cn(
            "w-20 h-20 rounded-2xl flex items-center justify-center mb-6",
            "bg-white dark:bg-zinc-800 shadow-xl",
            "ring-1 ring-black/5 dark:ring-white/10"
          )}
        >
          {isComplete ? (
            <Icon className={cn("h-10 w-10", config.color)} />
          ) : (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className={cn("h-10 w-10", config.color)} />
            </motion.div>
          )}
        </motion.div>

        <motion.h2 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-semibold text-foreground mb-2"
        >
          {config.title}
        </motion.h2>

        <motion.p 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground mb-6"
        >
          {config.subtitle}
        </motion.p>

        {currentTask && !isComplete && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="w-full mb-4"
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/50 dark:bg-zinc-800/50 border border-border/50">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate">
                {currentTask}
              </span>
            </div>
          </motion.div>
        )}

        {!isComplete && progress > 0 && (
          <motion.div 
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full"
          >
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={cn(
                  "h-full rounded-full",
                  "bg-gradient-to-r from-primary to-primary/80"
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {progress}% complete
            </p>
          </motion.div>
        )}

        {appName && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-xs text-muted-foreground/60"
          >
            Building: {appName}
          </motion.p>
        )}

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-6 flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Sparkles className="h-3 w-3" />
          <span>Preview will be available soon</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default PreviewSplashScreen;
