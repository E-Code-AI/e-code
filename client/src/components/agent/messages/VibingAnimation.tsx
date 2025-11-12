/**
 * Vibing Animation - Replit-style 3-dot animation
 * Each dot has different timing for organic feel
 */

import { cn } from '@/lib/utils';

interface VibingAnimationProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function VibingAnimation({ className, size = 'md' }: VibingAnimationProps) {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  };

  return (
    <div className={cn("flex items-center gap-1", className)} data-testid="vibing-animation">
      <div 
        className={cn(
          sizeClasses[size],
          "bg-violet-500 rounded-full animate-bounce",
          "opacity-70"
        )}
        style={{ animationDelay: '-0.32s', animationDuration: '1.4s' }}
      />
      <div 
        className={cn(
          sizeClasses[size],
          "bg-violet-500 rounded-full animate-bounce",
          "opacity-80"
        )}
        style={{ animationDelay: '-0.16s', animationDuration: '1.4s' }}
      />
      <div 
        className={cn(
          sizeClasses[size],
          "bg-violet-500 rounded-full animate-bounce",
          "opacity-90"
        )}
        style={{ animationDuration: '1.4s' }}
      />
    </div>
  );
}
